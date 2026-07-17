"""Yugam Optimizer — forecasting, inventory OR, network MIP, routing."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from forecast.data import load_demand_by_sku, series_values
from forecast.router import ALL_MODELS, run_backtest, run_forecast, wape_dashboard
from inventory.meio import meio_optimize
from inventory.replenishment import auto_indent
from inventory.sensing import demand_sense
from network.facility import facility_location_mip, network_from_nodes
from planning.production import production_plan_lp
from routing.pack3d import pack_3d
from routing.vrp import solve_vrp

app = FastAPI(
    title="Yugam Optimizer",
    description="Forecasting, MEIO, network MIP, CVRP, 3D packing, production LP",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ForecastRunRequest(BaseModel):
    industry: Literal["medtech", "cpg"] = "medtech"
    sku_id: str | None = None
    model: str = "auto"
    horizon: int = Field(default=4, ge=1, le=26)


@app.get("/health")
def health() -> dict[str, Any]:
    engines: dict[str, str] = {}
    try:
        import ortools  # noqa: F401

        engines["routing"] = "ortools+clarke-wright"
        engines["facility"] = "ortools-cpsat-available"
    except ImportError:
        engines["routing"] = "clarke-wright"
        engines["facility"] = "greedy"
    try:
        import pulp  # noqa: F401

        engines["mip"] = "pulp-cbc"
        engines["production"] = "pulp-cbc"
    except ImportError:
        engines["mip"] = engines.get("facility", "greedy")
        engines["production"] = "greedy"
    engines["inventory"] = "meio+newsvendor+sensing+indent"
    return {
        "status": "ok",
        "service": "yugam-optimizer",
        "phase": "P4-or-layer",
        "version": "0.4.0",
        "engines": engines,
    }


class VrpRequest(BaseModel):
    industry: str = "medtech"
    capacity: int = Field(default=100, ge=1, le=10000)
    max_vehicles: int = Field(default=8, ge=1, le=40)
    shipments: list[dict[str, Any]] = Field(default_factory=list)


class PackRequest(BaseModel):
    vehicle_type: str = "14ft"
    boxes: list[dict[str, Any]] = Field(default_factory=list)


class MeioRequest(BaseModel):
    skus: list[dict[str, Any]] = Field(default_factory=list)
    demand_history: list[dict[str, Any]] = Field(default_factory=list)
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    service_level: float = Field(default=0.95, ge=0.5, le=0.99)
    holding_rate: float = Field(default=0.25, ge=0.05, le=1.0)


class SenseRequest(BaseModel):
    demand_history: list[dict[str, Any]] = Field(default_factory=list)
    open_orders: list[dict[str, Any]] = Field(default_factory=list)
    horizon_weeks: int = Field(default=4, ge=1, le=12)
    offtake_boost: float = Field(default=0.0, ge=-0.5, le=0.5)


class IndentRequest(BaseModel):
    skus: list[dict[str, Any]] = Field(default_factory=list)
    demand_history: list[dict[str, Any]] = Field(default_factory=list)
    on_hand: list[dict[str, Any]] = Field(default_factory=list)
    service_level: float = Field(default=0.95, ge=0.5, le=0.99)


class NetworkRequest(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    demand_history: list[dict[str, Any]] = Field(default_factory=list)
    facilities: list[dict[str, Any]] = Field(default_factory=list)
    customers: list[dict[str, Any]] = Field(default_factory=list)
    max_open: int | None = Field(default=None, ge=1, le=20)


class ProductionRequest(BaseModel):
    products: list[dict[str, Any]] = Field(default_factory=list)
    weekly_capacity: float = Field(default=10000, ge=1)


@app.post("/api/vrp/solve")
def vrp_solve(body: VrpRequest) -> dict[str, Any]:
    return solve_vrp(body.shipments, capacity=body.capacity, max_vehicles=body.max_vehicles)


@app.post("/api/pack/3d")
def pack_solve(body: PackRequest) -> dict[str, Any]:
    return pack_3d(body.boxes, vehicle_type=body.vehicle_type)


@app.post("/api/inventory/meio")
def meio_solve(body: MeioRequest) -> dict[str, Any]:
    return meio_optimize(
        body.skus,
        body.demand_history,
        body.nodes or None,
        service_level=body.service_level,
        holding_rate=body.holding_rate,
    )


@app.post("/api/inventory/sense")
def sense_solve(body: SenseRequest) -> dict[str, Any]:
    return demand_sense(
        body.demand_history,
        body.open_orders or None,
        horizon_weeks=body.horizon_weeks,
        offtake_boost=body.offtake_boost,
    )


@app.post("/api/inventory/indent")
def indent_solve(body: IndentRequest) -> dict[str, Any]:
    return auto_indent(
        body.skus,
        body.demand_history,
        body.on_hand or None,
        service_level=body.service_level,
    )


@app.post("/api/network/optimize")
def network_solve(body: NetworkRequest) -> dict[str, Any]:
    if body.facilities and body.customers:
        return facility_location_mip(body.facilities, body.customers, max_open=body.max_open)
    return network_from_nodes(body.nodes, body.demand_history, max_open=body.max_open)


@app.post("/api/production/plan")
def production_solve(body: ProductionRequest) -> dict[str, Any]:
    return production_plan_lp(body.products, weekly_capacity=body.weekly_capacity)


@app.get("/api/forecast/models")
def list_models() -> dict[str, Any]:
    return {"models": ALL_MODELS}


@app.post("/api/forecast/run")
def forecast_run(body: ForecastRunRequest) -> dict[str, Any]:
    by_sku = load_demand_by_sku(body.industry)
    if not by_sku:
        return {"error": "no demand data", "industry": body.industry}

    if body.sku_id:
        series = by_sku.get(body.sku_id)
        if not series:
            return {"error": f"sku not found: {body.sku_id}"}
        weeks, values = series_values(series)
        return run_forecast(weeks, values, body.sku_id, body.model, body.horizon)  # type: ignore[arg-type]

    results = []
    for sku_id, series in list(by_sku.items())[:20]:
        weeks, values = series_values(series)
        if len(values) < 12:
            continue
        results.append(run_forecast(weeks, values, sku_id, body.model, body.horizon))  # type: ignore[arg-type]
    return {"industry": body.industry, "model": body.model, "results": results}


@app.get("/api/forecast/backtest")
def forecast_backtest(
    industry: str = "medtech",
    sku_id: str = Query(...),
    model: str = "auto",
    holdout: int = 8,
) -> dict[str, Any]:
    by_sku = load_demand_by_sku(industry)
    series = by_sku.get(sku_id)
    if not series:
        return {"error": f"sku not found: {sku_id}"}
    weeks, values = series_values(series)
    return run_backtest(weeks, values, sku_id, model, holdout)  # type: ignore[arg-type]


@app.get("/api/forecast/dashboard")
def forecast_dashboard(
    industry: str = "medtech",
    sku_limit: int = 12,
    holdout: int = 8,
) -> dict[str, Any]:
    return wape_dashboard(industry, sku_limit, holdout)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Yugam Optimizer API", "docs": "/docs", "version": "0.4.0"}
