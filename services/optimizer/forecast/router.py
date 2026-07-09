"""Auto model picker and unified forecast runner."""

from __future__ import annotations

from typing import Any, Literal

from forecast.data import load_demand_by_sku, series_values
from forecast.foundation import backtest_foundation, forecast_chronos, forecast_moirai
from forecast.metrics import intermittency_stats
from forecast.ml import backtest_lightgbm, forecast_lightgbm_quantile
from forecast.neural import backtest_neural, forecast_neural
from forecast.statistical import (
    backtest_statistical,
    forecast_croston,
    forecast_ets,
    forecast_prophet,
)

ModelName = Literal[
    "auto",
    "ets",
    "prophet",
    "croston",
    "lightgbm_quantile",
    "patchtst",
    "nbeats",
    "tft",
    "chronos",
    "moirai",
    "exponential_smoothing",
]

STAT_MODELS = {"ets", "prophet", "croston", "exponential_smoothing"}
ML_MODELS = {"lightgbm_quantile"}
NEURAL_MODELS = {"patchtst", "nbeats", "tft"}
FOUNDATION_MODELS = {"chronos", "moirai"}

ALL_MODELS = sorted(STAT_MODELS | ML_MODELS | NEURAL_MODELS | FOUNDATION_MODELS | {"auto"})


def pick_model(values: list[float], weeks_count: int) -> str:
    n = len(values)
    stats = intermittency_stats(values)
    if n < 12:
        return "chronos"
    if stats["zero_pct"] > 0.35 or stats["adi"] > 4:
        return "croston"
    if n >= 104 and stats["zero_pct"] < 0.1:
        return "lightgbm_quantile"
    if n >= 80:
        return "patchtst"
    if n >= 52:
        return "prophet"
    return "ets"


def run_forecast(
    weeks: list[str],
    values: list[float],
    sku_id: str,
    model: ModelName = "auto",
    horizon: int = 4,
) -> dict[str, Any]:
    chosen = pick_model(values, len(weeks)) if model == "auto" else model
    if chosen == "exponential_smoothing":
        chosen = "ets"

    if chosen in FOUNDATION_MODELS:
        res = forecast_moirai(weeks, values, horizon) if chosen == "moirai" else forecast_chronos(values, horizon)
    elif chosen in NEURAL_MODELS:
        res = forecast_neural(weeks, values, sku_id, chosen, horizon)
    elif chosen == "lightgbm_quantile":
        res = forecast_lightgbm_quantile(values, horizon)
    elif chosen == "croston":
        res = forecast_croston(values, horizon)
    elif chosen == "prophet":
        res = forecast_prophet(weeks, values, horizon)
    else:
        res = forecast_ets(values, horizon)

    return {
        **res,
        "sku_id": sku_id,
        "model_requested": model,
        "model_selected": res.get("model", chosen),
        "horizon": horizon,
        "history_weeks": len(values),
    }


def run_backtest(
    weeks: list[str],
    values: list[float],
    sku_id: str,
    model: ModelName = "auto",
    holdout: int = 8,
) -> dict[str, Any]:
    chosen = pick_model(values, len(weeks)) if model == "auto" else model
    if chosen == "exponential_smoothing":
        chosen = "ets"

    if chosen in FOUNDATION_MODELS:
        bt = backtest_foundation(values, chosen, holdout)
    elif chosen in NEURAL_MODELS:
        bt = backtest_neural(weeks, values, sku_id, chosen, holdout)
    elif chosen == "lightgbm_quantile":
        bt = backtest_lightgbm(values, holdout)
    elif chosen in STAT_MODELS:
        bt = backtest_statistical(weeks, values, "croston" if chosen == "croston" else chosen, holdout)
    else:
        bt = backtest_statistical(weeks, values, "ets", holdout)

    return {**bt, "sku_id": sku_id, "model_requested": model, "model_selected": bt.get("model", chosen)}


def wape_dashboard(
    industry: str = "medtech",
    sku_limit: int = 15,
    holdout: int = 8,
    models: list[str] | None = None,
) -> dict[str, Any]:
    by_sku = load_demand_by_sku(industry)
    compare_models = models or ["ets", "prophet", "croston", "lightgbm_quantile", "patchtst", "chronos"]

    rows: list[dict[str, Any]] = []
    sku_rank = sorted(by_sku.items(), key=lambda x: -sum(v for _, v in x[1]))[:sku_limit]

    for sku_id, series in sku_rank:
        weeks, values = series_values(series)
        if len(values) < holdout + 8:
            continue
        best_model = None
        best_wape = 999.0
        for m in compare_models:
            try:
                bt = run_backtest(weeks, values, sku_id, m, holdout)  # type: ignore[arg-type]
                w = float(bt.get("wape", 999))
                rows.append(
                    {
                        "sku_id": sku_id,
                        "model": bt.get("model_selected", m),
                        "wape": round(w, 2),
                        "mape": round(float(bt.get("mape", 0)), 2),
                    }
                )
                if w < best_wape:
                    best_wape = w
                    best_model = bt.get("model_selected", m)
            except Exception as exc:  # noqa: BLE001
                rows.append({"sku_id": sku_id, "model": m, "error": str(exc)})

        auto_bt = run_backtest(weeks, values, sku_id, "auto", holdout)
        rows.append(
            {
                "sku_id": sku_id,
                "model": "auto",
                "model_selected": auto_bt.get("model_selected"),
                "wape": round(float(auto_bt.get("wape", 0)), 2),
                "mape": round(float(auto_bt.get("mape", 0)), 2),
                "best_single": best_model,
            }
        )

    summary: dict[str, list[float]] = {}
    for r in rows:
        if "error" in r:
            continue
        m = r["model"]
        summary.setdefault(m, []).append(float(r["wape"]))
    leaderboard = [
        {"model": m, "avg_wape": round(sum(v) / len(v), 2), "sku_count": len(v)}
        for m, v in sorted(summary.items(), key=lambda x: sum(x[1]) / len(x[1]))
    ]

    return {
        "industry": industry,
        "holdout_weeks": holdout,
        "sku_limit": sku_limit,
        "rows": rows,
        "leaderboard": leaderboard,
        "models_available": ALL_MODELS,
    }
