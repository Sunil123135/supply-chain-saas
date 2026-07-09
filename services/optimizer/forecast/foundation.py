"""Foundation models: Chronos and Moirai zero-shot forecasting."""

from __future__ import annotations

from typing import Any

import numpy as np

from forecast.metrics import mape, wape


def forecast_chronos(values: list[float], horizon: int = 4) -> dict[str, Any]:
    try:
        import torch
        from chronos import ChronosPipeline
    except ImportError:
        from forecast.statistical import forecast_ets

        return forecast_ets(values, horizon) | {"requested_model": "chronos", "note": "chronos not installed"}

    if len(values) < 4:
        return {"forecast": [0.0] * horizon, "model": "chronos", "note": "insufficient data"}

    try:
        pipeline = ChronosPipeline.from_pretrained(
            "amazon/chronos-t5-tiny",
            device_map="cpu",
            torch_dtype=torch.float32,
        )
        context = torch.tensor(values, dtype=torch.float32)
        forecast = pipeline.predict(context, prediction_length=horizon)
        median = forecast[0].median(dim=0).values.numpy().clip(min=0).tolist()
        return {"forecast": median[:horizon], "model": "chronos"}
    except Exception as exc:  # noqa: BLE001
        from forecast.statistical import forecast_ets

        return forecast_ets(values, horizon) | {"requested_model": "chronos", "fallback": str(exc)}


def forecast_moirai(weeks: list[str], values: list[float], horizon: int = 4) -> dict[str, Any]:
    try:
        from uni2ts.model.moirai import MoiraiForecast, MoiraiModule
        import pandas as pd
        import torch
    except ImportError:
        return forecast_chronos(values, horizon) | {"requested_model": "moirai", "note": "uni2ts not installed"}

    if len(values) < 8:
        return forecast_chronos(values, horizon) | {"requested_model": "moirai"}

    try:
        module = MoiraiModule.from_pretrained("Salesforce/moirai-1.0-R-small")
        model = MoiraiForecast(module=module, prediction_length=horizon, context_length=min(512, len(values)))
        df = pd.DataFrame({"ds": pd.to_datetime(weeks), "y": values})
        pred = model.predict(df)
        fc = np.array(pred).reshape(-1)[:horizon].clip(min=0).tolist()
        return {"forecast": fc, "model": "moirai"}
    except Exception as exc:  # noqa: BLE001
        return forecast_chronos(values, horizon) | {"requested_model": "moirai", "fallback": str(exc)}


def backtest_foundation(values: list[float], model: str, holdout: int = 8) -> dict[str, Any]:
    if len(values) <= holdout + 2:
        holdout = max(1, len(values) // 5)
    train, test = values[:-holdout], np.array(values[-holdout:], dtype=float)
    if model == "moirai":
        weeks = [str(i) for i in range(len(train))]
        res = forecast_moirai(weeks, train, horizon=holdout)
    else:
        res = forecast_chronos(train, horizon=holdout)
    fc = np.array(res["forecast"][:holdout], dtype=float)
    return {
        "model": res.get("model", model),
        "wape": wape(test, fc),
        "mape": mape(test, fc),
        "forecast": fc.tolist(),
        "actual": test.tolist(),
    }
