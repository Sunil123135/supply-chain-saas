"""Sarvam tool-calling + module APIs on Railway."""

from __future__ import annotations

import os
import re
from typing import Any

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.data_loader import load_pack
from services.freight_audit import audit_invoices, build_invoices
from services.inventory_fefo import compute_fefo_queue

router = APIRouter(prefix="/api", tags=["modules"])

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4-turbo")

PROMPT_TOOLS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"invoice|settle|freight|leakage", re.I), "freight_audit"),
    (re.compile(r"fefo|expir|lot", re.I), "inventory_fefo"),
    (re.compile(r"forecast|demand|stockout", re.I), "demand_forecast"),
    (re.compile(r"dispatch|fill|vrp|route", re.I), "dispatch_analysis"),
    (re.compile(r"risk|disruption", re.I), "risk_scan"),
]


class SarvamChatRequest(BaseModel):
    prompt: str = Field(min_length=1)
    industry: str = "medtech"


class SarvamNarrateRequest(BaseModel):
    prompt: str
    tool: str
    summary: str
    data: dict[str, Any] | list[Any] | None = None
    pain_context: str | None = None


def _run_tool(tool: str, industry: str) -> dict[str, Any]:
    pack = load_pack(industry)
    if tool == "inventory_fefo":
        costs = {r["sku_id"]: float(r.get("unit_cost_inr") or 100) for r in pack["skus"]}
        return compute_fefo_queue(pack["lots"], unit_cost_by_sku=costs)
    if tool == "freight_audit":
        inv = build_invoices(pack["shipments"])
        return {"invoices": inv, "audit": audit_invoices(inv)}
    return {"message": f"Tool {tool} — use Netlify /api for full suite"}


@router.post("/sarvam/chat")
def sarvam_chat(body: SarvamChatRequest) -> dict[str, Any]:
    tool = "control_tower"
    for pattern, name in PROMPT_TOOLS:
        if pattern.search(body.prompt):
            tool = name
            break
    data = _run_tool(tool, body.industry)
    return {"tool": tool, "agentId": "ai-orchestrator", "data": data, "engine": "railway-math"}


@router.post("/sarvam/narrate")
async def sarvam_narrate(body: SarvamNarrateRequest) -> dict[str, str]:
    """LLM narrative over deterministic math (OpenRouter). Dify preferred on Netlify."""
    fallback = (
        f"**Sarvam** executed `{body.tool}`.\n\n{body.summary}\n\n"
        f"_User asked: {body.prompt}_"
    )
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {"narrative": fallback, "engine": "template"}

    system = (
        "You are Sarvam, Yugam's supply-chain orchestrator. "
        "Explain tool results for MedTech/CPG planners. Never invent SKU numbers — "
        "only use the provided math summary. Be concise and actionable."
    )
    user = (
        f"Question: {body.prompt}\n"
        f"Tool: {body.tool}\n"
        f"Math summary: {body.summary}\n"
        f"Pain-map context:\n{body.pain_context or '(none)'}\n"
        f"Data: {str(body.data)[:1500]}"
    )

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": os.getenv("APP_URL", "https://yugam.app"),
                    "X-Title": "Yugam Sarvam Narrate",
                },
                json={
                    "model": DEFAULT_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "max_tokens": 700,
                },
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            return {"narrative": content, "engine": "openrouter"}
    except Exception:  # noqa: BLE001
        return {"narrative": fallback, "engine": "template-fallback"}


@router.get("/modules/inventory/fefo")
def fefo_api(industry: str = "medtech", horizonDays: int = 60) -> dict[str, Any]:
    pack = load_pack(industry)
    costs = {r["sku_id"]: float(r.get("unit_cost_inr") or 100) for r in pack["skus"]}
    return compute_fefo_queue(pack["lots"], horizon_days=horizonDays, unit_cost_by_sku=costs)


@router.get("/modules/freight/audit")
def freight_api(industry: str = "medtech") -> dict[str, Any]:
    pack = load_pack(industry)
    inv = build_invoices(pack["shipments"])
    return {"invoices": inv, "audit": audit_invoices(inv)}
