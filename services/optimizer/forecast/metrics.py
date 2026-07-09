"""Forecasting metrics."""

from __future__ import annotations

import numpy as np


def mape(actual: np.ndarray, forecast: np.ndarray) -> float:
    mask = actual != 0
    if not mask.any():
        return 0.0
    return float(np.mean(np.abs((actual[mask] - forecast[mask]) / actual[mask])) * 100)


def wape(actual: np.ndarray, forecast: np.ndarray) -> float:
    denom = float(np.sum(np.abs(actual)))
    if denom == 0:
        return 0.0
    return float(np.sum(np.abs(actual - forecast)) / denom * 100)


def intermittency_stats(values: list[float]) -> dict[str, float]:
    arr = np.array(values, dtype=float)
    n = len(arr)
    if n == 0:
        return {"zero_pct": 1.0, "adi": 999.0, "cv2": 0.0}
    zeros = int(np.sum(arr == 0))
    zero_pct = zeros / n
    nonzero_idx = np.where(arr > 0)[0]
    if len(nonzero_idx) < 2:
        adi = float(n)
    else:
        intervals = np.diff(nonzero_idx)
        adi = float(np.mean(intervals)) if len(intervals) else float(n)
    nz = arr[arr > 0]
    cv2 = float((np.std(nz) / np.mean(nz)) ** 2) if len(nz) > 1 and np.mean(nz) > 0 else 0.0
    return {"zero_pct": zero_pct, "adi": adi, "cv2": cv2}
