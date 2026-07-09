"""Sarvam tool-calling + module APIs on Railway."""

from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.data_loader import load_pack
from services.freight_audit import audit_invoices, build_invoices
from services.inventory_fefo import compute_fefo_queue

router = APIRouter(prefix="/api", tags=["modules"])

PROMPT_TOOLS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"invoice|settle|freight|leakage", re.I), "freight_audit"),
    (re.compile(r"fefo|expir|lot", re.I), "inventory_fefo"),
    (re.compile(r"forecast|demand|stockout", re.I), "demand_forecast"),
    (re.compile(r"dispatch|fill", re.I), "dispatch_analysis"),
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
def sarvam_narrate(body: SarvamNarrateRequest) -> dict[str, str]:
    return {
        "narrative": (
            f"**Sarvam** executed `{body.tool}`.\n\n{body.summary}\n\n"
            f"_User asked: {body.prompt}_"
        )
    }


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
