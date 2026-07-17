#!/usr/bin/env python3
"""Register Temporal Schedules for Yugam autonomy workflows (idempotent).

Usage:
  python schedules.py
  python schedules.py --industry cpg
"""

from __future__ import annotations

import argparse
import asyncio
import os

from temporalio.client import (
    Client,
    Schedule,
    ScheduleActionStartWorkflow,
    ScheduleSpec,
    ScheduleState,
    ScheduleUpdate,
)
from temporalio.service import RPCError

from worker import YugamAutonomyWorkflow
from workflows_catalog import DEFAULT_INDUSTRY, SCHEDULES, TIMEZONE


async def ensure_schedules(industry: str) -> list[dict]:
    host = os.environ.get("TEMPORAL_HOST", "localhost:7233")
    namespace = os.environ.get("TEMPORAL_NAMESPACE", "default")
    task_queue = os.environ.get("TEMPORAL_TASK_QUEUE", "yugam-autonomy")
    client = await Client.connect(host, namespace=namespace)

    results: list[dict] = []
    for workflow_id, cron in SCHEDULES.items():
        if not cron:
            results.append({"workflowId": workflow_id, "status": "on_demand_only"})
            continue

        schedule_id = f"yugam-{workflow_id}-{industry}"

        def make_schedule(
            wid: str = workflow_id,
            cron_expr: str = cron,
        ) -> Schedule:
            return Schedule(
                action=ScheduleActionStartWorkflow(
                    YugamAutonomyWorkflow.run,
                    args=[wid, industry],
                    id=f"{wid}-{industry}",
                    task_queue=task_queue,
                ),
                spec=ScheduleSpec(
                    cron_expressions=[cron_expr],
                    time_zone_name=TIMEZONE,
                ),
                state=ScheduleState(
                    note=f"Yugam {wid} ({industry})",
                    paused=False,
                ),
            )

        handle = client.get_schedule_handle(schedule_id)
        try:
            await handle.describe()
            await handle.update(lambda _input: ScheduleUpdate(schedule=make_schedule()))
            results.append({"scheduleId": schedule_id, "cron": cron, "status": "updated"})
        except RPCError:
            await client.create_schedule(schedule_id, make_schedule())
            results.append({"scheduleId": schedule_id, "cron": cron, "status": "created"})

    return results


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--industry", default=os.environ.get("YUGAM_INDUSTRY", DEFAULT_INDUSTRY))
    args = parser.parse_args()
    rows = await ensure_schedules(args.industry)
    for row in rows:
        print(row)


if __name__ == "__main__":
    asyncio.run(main())
