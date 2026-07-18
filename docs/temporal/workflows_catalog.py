"""Shared Yugam autonomy workflow catalog for Temporal worker + schedules."""

from __future__ import annotations

# workflow_id → cron (Asia/Kolkata). None = on-demand only.
SCHEDULES: dict[str, str | None] = {
    "fefo_weekly": "0 6 * * 1",
    "freight_monthly": "0 7 1 * *",
    "freight_weekly": "0 7 * * 3",
    "control_tower_daily": "0 8 * * *",
    "dispatch_vrp": "30 5 * * 1-5",
    "load_build_3d": "45 5 * * 1-5",
    "full_morning_brief": "30 6 * * *",
    "medtech_compliance_daily": "15 7 * * *",
    "planning_pva_weekly": "0 16 * * 5",
    "erp_sync_hourly": "15 * * * *",
    "vertical_skills_weekly": "0 9 * * 3",
    "sensing_indent_daily": "0 6 * * *",
    "network_mip_weekly": "0 10 * * 2",
    "plant_ops_daily": "45 4 * * 1-5",
    "execution_daily": "0 9 * * *",
    "rfq_weekly": "0 11 * * 4",
}

DEFAULT_INDUSTRY = "medtech"
TIMEZONE = "Asia/Kolkata"
