"""LightGBM quantile forecasting."""

from __future__ import annotations

from typing import Any

import numpy as np

from forecast.metrics import mape, wape


def _build_features(values: list[float]) -> tuple[np.ndarray, np.ndarray]:
    rows: list[list[float]] = []
    targets: list[float] = []
    for i in range(8, len(values)):
        window = values[i - 8 : i]
        row = window + [
            float(np.mean(window)),
            float(np.std(window)),
            float(i % 52),
            float((i // 52) % 12),
        ]
        rows.append(row)
        targets.append(values[i])
    if not rows:
        return np.empty((0, 12)), np.array([])
    return np.array(rows, dtype=float), np.array(targets, dtype=float)


def forecast_lightgbm_quantile(
    values: list[float],
    horizon: int = 4,
    quantiles: list[float] | None = None,
) -> dict[str, Any]:
    quantiles = quantiles or [0.1, 0.5, 0.9]
    try:
        import lightgbm as lgb
    except ImportError:
        from forecast.statistical import forecast_ets

        return forecast_ets(values, horizon) | {"requested_model": "lightgbm_quantile"}

    X, y = _build_features(values)
    if len(y) < 20:
        from forecast.statistical import forecast_ets

        return forecast_ets(values, horizon) | {"note": "insufficient rows for lightgbm"}

    models: dict[float, Any] = {}
    preds: dict[str, list[float]] = {}
    for q in quantiles:
        m = lgb.LGBMRegressor(
            objective="quantile",
            alpha=q,
            n_estimators=120,
            learning_rate=0.08,
            verbose=-1,
        )
        m.fit(X, y)
        models[q] = m

    last_row = np.array(
        [
            values[-8:]
            + [
                float(np.mean(values[-8:])),
                float(np.std(values[-8:])),
                float(len(values) % 52),
                float((len(values) // 52) % 12),
            ]
        ],
        dtype=float,
    )
    for q in quantiles:
        preds[f"p{int(q * 100)}"] = [max(0.0, float(models[q].predict(last_row)[0]))] * horizon

    return {
        "model": "lightgbm_quantile",
        "forecast": preds.get("p50", preds[list(preds.keys())[0]]),
        "quantiles": preds,
    }


def backtest_lightgbm(values: list[float], holdout: int = 8) -> dict[str, Any]:
    if len(values) <= holdout + 12:
        holdout = max(2, len(values) // 5)
    train, test = values[:-holdout], np.array(values[-holdout:], dtype=float)
    res = forecast_lightgbm_quantile(train, horizon=holdout)
    fc = np.array(res.get("forecast", [0.0] * holdout)[:holdout], dtype=float)
    return {
        "model": res.get("model", "lightgbm_quantile"),
        "wape": wape(test, fc),
        "mape": mape(test, fc),
        "forecast": fc.tolist(),
        "actual": test.tolist(),
        "quantiles": res.get("quantiles"),
    }
