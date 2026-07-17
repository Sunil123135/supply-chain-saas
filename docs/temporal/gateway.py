#!/usr/bin/env python3
"""HTTP gateway so Netlify / SaaS can start Temporal workflows and check health.

POST /workflows/start  { workflowId, industry? }
GET  /health
GET  /schedules
POST /schedules/sync   { industry? }

Auth: header x-vps-secret == VPS_WEBHOOK_SECRET
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

from aiohttp import web
from temporalio.client import Client

from schedules import ensure_schedules
from worker import YugamAutonomyWorkflow
from workflows_catalog import DEFAULT_INDUSTRY, SCHEDULES

HOST = os.environ.get("TEMPORAL_HOST", "localhost:7233")
NAMESPACE = os.environ.get("TEMPORAL_NAMESPACE", "default")
TASK_QUEUE = os.environ.get("TEMPORAL_TASK_QUEUE", "yugam-autonomy")
SECRET = os.environ.get("VPS_WEBHOOK_SECRET", "")
GATEWAY_PORT = int(os.environ.get("TEMPORAL_GATEWAY_PORT", "8090"))

_client: Client | None = None


async def get_client() -> Client:
    global _client
    if _client is None:
        _client = await Client.connect(HOST, namespace=NAMESPACE)
    return _client


def authorized(request: web.Request) -> bool:
    if not SECRET:
        return os.environ.get("BOT_OPEN_DEMO", "").lower() == "true"
    header = request.headers.get("x-vps-secret") or request.headers.get("x-bot-secret")
    return header == SECRET


async def health(_request: web.Request) -> web.Response:
    try:
        client = await get_client()
        # Lightweight touch — list namespace is not available; just confirm connect
        connected = client is not None
        return web.json_response(
            {
                "ok": True,
                "service": "yugam-temporal-gateway",
                "temporalHost": HOST,
                "namespace": NAMESPACE,
                "taskQueue": TASK_QUEUE,
                "connected": connected,
                "workflows": list(SCHEDULES.keys()),
                "ts": datetime.now(timezone.utc).isoformat(),
            }
        )
    except Exception as e:
        return web.json_response(
            {"ok": False, "error": str(e), "temporalHost": HOST},
            status=503,
        )


async def list_schedules(_request: web.Request) -> web.Response:
    return web.json_response(
        {
            "schedules": [
                {"workflowId": wid, "cron": cron, "timezone": "Asia/Kolkata"}
                for wid, cron in SCHEDULES.items()
            ]
        }
    )


async def sync_schedules(request: web.Request) -> web.Response:
    if not authorized(request):
        return web.json_response({"error": "Unauthorized"}, status=401)
    body = await request.json() if request.can_read_body else {}
    industry = str(body.get("industry") or DEFAULT_INDUSTRY)
    rows = await ensure_schedules(industry)
    return web.json_response({"ok": True, "industry": industry, "results": rows})


async def start_workflow(request: web.Request) -> web.Response:
    if not authorized(request):
        return web.json_response({"error": "Unauthorized"}, status=401)
    body = await request.json()
    workflow_id = str(body.get("workflowId") or "")
    industry = str(body.get("industry") or DEFAULT_INDUSTRY)
    if workflow_id not in SCHEDULES:
        return web.json_response(
            {"error": "Unknown workflowId", "workflows": list(SCHEDULES.keys())},
            status=400,
        )

    client = await get_client()
    run_id = f"{workflow_id}-{industry}-{uuid.uuid4().hex[:8]}"
    handle = await client.start_workflow(
        YugamAutonomyWorkflow.run,
        args=[workflow_id, industry],
        id=run_id,
        task_queue=TASK_QUEUE,
    )
    return web.json_response(
        {
            "ok": True,
            "workflowId": workflow_id,
            "industry": industry,
            "temporalWorkflowId": handle.id,
            "runId": handle.result_run_id,
            "mode": "temporal",
        }
    )


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/health", health)
    app.router.add_get("/schedules", list_schedules)
    app.router.add_post("/schedules/sync", sync_schedules)
    app.router.add_post("/workflows/start", start_workflow)
    return app


def main() -> None:
    print(f"Yugam Temporal gateway on 0.0.0.0:{GATEWAY_PORT} → {HOST}")
    web.run_app(create_app(), host="0.0.0.0", port=GATEWAY_PORT)


if __name__ == "__main__":
    main()
