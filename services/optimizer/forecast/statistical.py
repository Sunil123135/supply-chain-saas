"""Statistical forecasting: ETS, Prophet, Croston."""

from __future__ import annotations

from typing import Any

import numpy as np

from forecast.metrics import mape, wape


def forecast_ets(values: list[float], horizon: int = 4) -> dict[str, Any]:
    y = np.array(values, dtype=float)
    if len(y) < 8:
        level = float(np.mean(y)) if len(y) else 0.0
        fc = [level] * horizon
        return {"forecast": fc, "model": "ets", "note": "short history — mean fallback"}
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        model = ExponentialSmoothing(
            y,
            trend="add",
            seasonal="add",
            seasonal_periods=min(52, max(4, len(y) // 3)),
            initialization_method="estimated",
        )
        fit = model.fit(optimized=True, use_brute=True)
        fc = fit.forecast(horizon).tolist()
        return {"forecast": fc, "model": "ets"}
    except Exception as exc:  # noqa: BLE001
        alpha = 0.3
        level = y[0]
        for v in y[1:]:
            level = alpha * v + (1 - alpha) * level
        return {"forecast": [float(level)] * horizon, "model": "ets", "fallback": str(exc)}


def forecast_croston(values: list[float], horizon: int = 4, alpha: float = 0.1) -> dict[str, Any]:
    y = np.array(values, dtype=float)
    if len(y) < 4:
        return {"forecast": [0.0] * horizon, "model": "croston", "note": "insufficient data"}

    demand_sizes: list[float] = []
    intervals: list[float] = []
    last_idx = -1
    for i, v in enumerate(y):
        if v > 0:
            demand_sizes.append(v)
            if last_idx >= 0:
                intervals.append(i - last_idx)
            last_idx = i

    if not demand_sizes:
        return {"forecast": [0.0] * horizon, "model": "croston"}

    z = demand_sizes[0]
    p = intervals[0] if intervals else 1.0
    for i in range(1, len(demand_sizes)):
        z = alpha * demand_sizes[i] + (1 - alpha) * z
        if i < len(intervals):
            p = alpha * intervals[i] + (1 - alpha) * p
    rate = z / p if p > 0 else 0.0
    fc = [float(rate)] * horizon
    return {"forecast": fc, "model": "croston", "rate": rate}


def forecast_prophet(weeks: list[str], values: list[float], horizon: int = 4) -> dict[str, Any]:
    try:
        import pandas as pd
        from prophet import Prophet
    except ImportError:
        return forecast_ets(values, horizon) | {"requested_model": "prophet", "note": "prophet not installed"}

    if len(values) < 12:
        return forecast_ets(values, horizon) | {"requested_model": "prophet", "note": "short history"}

    df = pd.DataFrame({"ds": pd.to_datetime(weeks), "y": values})
    m = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    m.fit(df)
    future = m.make_future_dataframe(periods=horizon, freq="W")
    pred = m.predict(future)
    fc = pred["yhat"].tail(horizon).clip(lower=0).tolist()
    return {"forecast": fc, "model": "prophet"}


def backtest_statistical(
    weeks: list[str],
    values: list[float],
    model: str,
    holdout: int = 8,
    horizon: int = 4,
) -> dict[str, Any]:
    if len(values) <= holdout + 4:
        holdout = max(1, len(values) // 5)
    train_w, train_v = weeks[:-holdout], values[:-holdout]
    test_v = np.array(values[-holdout:], dtype=float)

    if model == "croston":
        res = forecast_croston(train_v, horizon=holdout)
    elif model == "prophet":
        res = forecast_prophet(train_w, train_v, horizon=holdout)
    else:
        res = forecast_ets(train_v, horizon=holdout)

    fc = np.array(res["forecast"][:holdout], dtype=float)
    return {
        "model": res.get("model", model),
        "wape": wape(test_v, fc),
        "mape": mape(test_v, fc),
        "forecast": fc.tolist(),
        "actual": test_v.tolist(),
    }
