"""Neural forecasting via NeuralForecast (PatchTST, N-BEATS, TFT)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from forecast.metrics import mape, wape


def _to_nf_df(weeks: list[str], values: list[float], sku_id: str) -> pd.DataFrame:
    ds = pd.to_datetime(weeks)
    return pd.DataFrame(
        {
            "unique_id": sku_id,
            "ds": ds,
            "y": np.array(values, dtype=float),
        }
    )


def forecast_neural(
    weeks: list[str],
    values: list[float],
    sku_id: str = "sku",
    model_name: str = "patchtst",
    horizon: int = 4,
    input_size: int = 52,
) -> dict[str, Any]:
    if len(values) < input_size + 4:
        from forecast.statistical import forecast_ets

        return forecast_ets(values, horizon) | {"requested_model": model_name, "note": "short history"}

    try:
        from neuralforecast import NeuralForecast
        from neuralforecast.models import NBEATS, PatchTST, TFT
    except ImportError:
        from forecast.statistical import forecast_ets

        return forecast_ets(values, horizon) | {"requested_model": model_name, "note": "neuralforecast not installed"}

    df = _to_nf_df(weeks, values, sku_id)
    h = min(horizon, max(1, len(values) // 10))
    isz = min(input_size, len(values) - h)

    name = model_name.lower()
    if name == "nbeats":
        model = NBEATS(input_size=isz, h=h, max_steps=80)
    elif name == "tft":
        model = TFT(input_size=isz, h=h, max_steps=80)
    else:
        model = PatchTST(input_size=isz, h=h, max_steps=80, patch_len=min(16, isz // 2))

    nf = NeuralForecast(models=[model], freq="W")
    nf.fit(df=df)
    pred = nf.predict()
    col = [c for c in pred.columns if c not in ("ds", "unique_id")][0]
    fc = pred[col].clip(lower=0).tolist()
    if len(fc) < horizon:
        fc = fc + [fc[-1]] * (horizon - len(fc))
    return {"forecast": fc[:horizon], "model": name}


def backtest_neural(
    weeks: list[str],
    values: list[float],
    sku_id: str,
    model_name: str,
    holdout: int = 8,
) -> dict[str, Any]:
    if len(values) <= holdout + 20:
        holdout = max(2, len(values) // 6)
    train_w, train_v = weeks[:-holdout], values[:-holdout]
    test_v = np.array(values[-holdout:], dtype=float)
    res = forecast_neural(train_w, train_v, sku_id, model_name, horizon=holdout)
    fc = np.array(res["forecast"][:holdout], dtype=float)
    return {
        "model": res.get("model", model_name),
        "wape": wape(test_v, fc),
        "mape": mape(test_v, fc),
        "forecast": fc.tolist(),
        "actual": test_v.tolist(),
    }
