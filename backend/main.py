"""Yugam API — FastAPI backend (Railway). Sarvam + supply-chain math."""

from __future__ import annotations

import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from routers.modules import router as modules_router

load_dotenv(".env.backend")

app = FastAPI(title="Yugam API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(modules_router)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4-turbo")


class CopilotRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)


class CopilotResponse(BaseModel):
    response: str | None = None
    model: str | None = None
    error: str | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "yugam-api", "phase": "P2"}


@app.post("/api/copilot", response_model=CopilotResponse)
async def copilot(body: CopilotRequest) -> CopilotResponse:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return CopilotResponse(error="OPENROUTER_API_KEY not configured on backend")

    payload: dict[str, Any] = {
        "model": DEFAULT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are Sarvam, Yugam's supply chain AI orchestrator for MedTech and CPG. "
                    "You explain results from deterministic tools — never invent SKU numbers. "
                    "Be concise and actionable."
                ),
            },
            {"role": "user", "content": body.prompt},
        ],
        "max_tokens": 600,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": os.getenv("APP_URL", "https://yugam.app"),
                    "X-Title": "Yugam Sarvam",
                },
                json=payload,
            )
            res.raise_for_status()
            data = res.json()
            content = data["choices"][0]["message"]["content"]
            return CopilotResponse(response=content, model=data.get("model", DEFAULT_MODEL))
    except httpx.HTTPStatusError as exc:
        return CopilotResponse(error=f"OpenRouter HTTP {exc.response.status_code}")
    except Exception as exc:  # noqa: BLE001
        return CopilotResponse(error=str(exc))
