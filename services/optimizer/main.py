"""Yugam Optimizer — forecasting, inventory, routing (Python math only)."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from forecast.data import load_demand_by_sku, series_values
from forecast.router import ALL_MODELS, run_backtest, run_forecast, wape_dashboard

app = FastAPI(
    title="Yugam Optimizer",
    description="Forecasting (ETS, Prophet, Croston, LightGBM, PatchTST, Chronos), inventory, routing",
    version="0.2.0",
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
def health() -> dict[str, str]:
    return {"status": "ok", "service": "yugam-optimizer", "phase": "P3-forecast"}


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
    return {"message": "Yugam Optimizer API", "docs": "/docs"}
