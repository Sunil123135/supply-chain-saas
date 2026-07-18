import { NextResponse } from "next/server";

import { isToolName, runTool, type ToolName } from "@/lib/agents/tools";
import {
  getWorkflow,
  runAutonomyWorkflow,
  type AutonomyWorkflowId,
} from "@/lib/autonomy/workflows";
import { notifyHermes, pingHermes } from "@/lib/hermes/client";
import {
  buildHermesManifest,
  resolveWorkflowForHermesRole,
  saasPublicBase,
} from "@/lib/hermes/manifest";
import type { IndustryPack } from "@/lib/import/config";
import { runSarvamChat } from "@/lib/sarvam/chatCore";
import { safeEqual } from "@/lib/auth/rbac";

function hermesAuthorized(req: Request): boolean {
  if (process.env.BOT_OPEN_DEMO === "true") return true;
  const secret =
    process.env.VPS_WEBHOOK_SECRET ||
    process.env.HERMES_SHARED_SECRET ||
    process.env.BOT_SHARED_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header =
    req.headers.get("x-vps-secret") ||
    req.headers.get("x-hermes-secret") ||
    req.headers.get("x-bot-secret") ||
    "";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return safeEqual(header, secret) || safeEqual(bearer, secret);
}

/** GET — Hermes agent card / discovery */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("ping") === "1") {
    const ping = await pingHermes();
    return NextResponse.json({ ...buildHermesManifest(), ping });
  }
  return NextResponse.json(buildHermesManifest());
}

/**
 * POST — Hermes → SaaS
 * { action: "run_workflow" | "run_role" | "run_tool" | "chat" | "notify_ack", ... }
 */
export async function POST(req: Request) {
  if (!hermesAuthorized(req)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Set x-vps-secret / x-hermes-secret to VPS_WEBHOOK_SECRET, or BOT_OPEN_DEMO=true",
      },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    workflowId?: string;
    role?: string;
    hermesRole?: string;
    tool?: string;
    prompt?: string;
    industry?: IndustryPack;
    params?: Record<string, unknown>;
    notify?: boolean;
  };

  const action = body.action ?? (body.workflowId ? "run_workflow" : body.role || body.hermesRole ? "run_role" : body.tool ? "run_tool" : body.prompt ? "chat" : "unknown");
  const industry = body.industry ?? "medtech";
  const notify = body.notify !== false;

  if (action === "run_role" || action === "role") {
    const role = body.role || body.hermesRole || "";
    const workflowId = resolveWorkflowForHermesRole(role);
    if (!workflowId) {
      return NextResponse.json(
        {
          error: `Unknown Hermes role: ${role}`,
          roles: buildHermesManifest().roles.map((r) => r.role),
        },
        { status: 400 },
      );
    }
    const result = await runAutonomyWorkflow({
      workflowId,
      industry,
      source: "hermes",
    });
    const def = getWorkflow(workflowId)!;
    if (notify) {
      await notifyHermes({
        type: result.needsApproval ? "workflow.needs_approval" : "workflow.completed",
        workflowId,
        hermesRole: def.hermesRole,
        industry,
        summary: result.summary,
        executionId: result.executionId,
        needsApproval: result.needsApproval,
      });
    }
    return NextResponse.json({
      ok: true,
      action: "run_role",
      role,
      workflowId,
      hermesRole: def.hermesRole,
      saas: saasPublicBase(),
      ...result,
    });
  }

  if (action === "run_workflow" || action === "workflow") {
    if (!body.workflowId || !getWorkflow(body.workflowId)) {
      return NextResponse.json(
        { error: "workflowId required", workflows: buildHermesManifest().workflows.map((w) => w.workflowId) },
        { status: 400 },
      );
    }
    const workflowId = body.workflowId as AutonomyWorkflowId;
    const result = await runAutonomyWorkflow({
      workflowId,
      industry,
      source: "hermes",
    });
    const def = getWorkflow(workflowId)!;
    if (notify) {
      await notifyHermes({
        type: result.needsApproval ? "workflow.needs_approval" : "workflow.completed",
        workflowId,
        hermesRole: def.hermesRole,
        industry,
        summary: result.summary,
        executionId: result.executionId,
        needsApproval: result.needsApproval,
      });
    }
    return NextResponse.json({
      ok: true,
      action: "run_workflow",
      hermesRole: def.hermesRole,
      saas: saasPublicBase(),
      ...result,
    });
  }

  if (action === "run_tool" || action === "tool") {
    if (!body.tool || !isToolName(body.tool)) {
      return NextResponse.json({ error: "tool required", tools: buildHermesManifest().tools }, { status: 400 });
    }
    const tool = body.tool as ToolName;
    const result = await runTool(tool, { industry, params: body.params, prompt: "hermes" });
    return NextResponse.json({
      ok: true,
      action: "run_tool",
      executed: true,
      ...result,
    });
  }

  if (action === "chat") {
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }
    const chat = await runSarvamChat({
      prompt: body.prompt,
      industry,
      channel: "hermes",
      useLlm: true,
    });
    return NextResponse.json({ ok: true, action: "chat", ...chat });
  }

  return NextResponse.json(
    {
      error: "Unknown action",
      actions: ["run_workflow", "run_role", "run_tool", "chat"],
      example: {
        action: "run_role",
        role: "orchestrator",
        industry: "medtech",
      },
    },
    { status: 400 },
  );
}
