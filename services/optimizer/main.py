"""Nexova Flow optimizer service — all supply chain math lives here (never in LLM)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Nexova Optimizer",
    description="Forecasting, inventory, routing, load building — Python only",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "nexova-optimizer", "phase": "P0"}


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Nexova Optimizer API",
        "docs": "/docs",
        "note": "M1-M4 math endpoints ship in P3-P5",
    }
