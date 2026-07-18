import { NextResponse } from "next/server";

import { botAuthorized } from "@/lib/bots/adapter";
import { REQUIRED_HEADERS, type ImportFileKey } from "@/lib/import/config";
import { validateHeaders } from "@/lib/import/parseCsv";
import { parseXlsxBuffer } from "@/lib/import/parseXlsx";
import { runSarvamChat } from "@/lib/sarvam/chatCore";

/**
 * Excel channel — multipart .xlsx/.csv upload → validate headers → optional Sarvam prompt.
 * Form fields: file, fileKey?, prompt?, industry?
 */
export async function POST(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized — set x-bot-secret or BOT_OPEN_DEMO" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart/form-data required", hint: "field: file (.xlsx or .csv)" },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }

  const fileKey = (String(form.get("fileKey") ?? "sku_master") as ImportFileKey);
  const prompt = String(form.get("prompt") ?? "").trim();
  const industry = (String(form.get("industry") ?? "medtech") as "medtech" | "cpg");
  const sheetName = String(form.get("sheet") ?? "") || undefined;

  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  let headers: string[] = [];
  let rows: Record<string, string>[] = [];
  let sheet = "";
  let sheets: string[] = [];
  let csvText = "";

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const parsed = parseXlsxBuffer(buf, sheetName);
    headers = parsed.headers;
    rows = parsed.rows;
    sheet = parsed.sheet;
    sheets = parsed.sheets;
    csvText = parsed.csvText;
  } else {
    csvText = buf.toString("utf8");
    const { parseCsv } = await import("@/lib/import/parseCsv");
    const parsed = parseCsv(csvText);
    headers = parsed.headers;
    rows = parsed.rows;
  }

  const required = REQUIRED_HEADERS[fileKey];
  const validation = required
    ? validateHeaders(headers, required)
    : { ok: true, missing: [] as string[] };

  let sarvam: Awaited<ReturnType<typeof runSarvamChat>> | null = null;
  if (prompt) {
    sarvam = await runSarvamChat({
      prompt: `${prompt}\n\n[Excel upload ${file.name}: ${rows.length} rows, fileKey=${fileKey}]`,
      industry,
      channel: "excel",
      useLlm: true,
    });
  }

  return NextResponse.json({
    ok: validation.ok,
    channel: "excel",
    file: file.name,
    fileKey,
    sheet,
    sheets,
    rowCount: rows.length,
    headers,
    missing: validation.missing,
    sample: rows.slice(0, 5),
    csvPreview: csvText.slice(0, 500),
    sarvam: sarvam
      ? {
          reply: sarvam.content,
          tool: sarvam.tool,
          agentId: sarvam.agentId,
          requiresApproval: sarvam.requiresApproval,
          executionId: sarvam.executionId,
        }
      : null,
  });
}

export async function GET() {
  return NextResponse.json({
    channel: "excel",
    method: "POST multipart",
    fields: ["file", "fileKey?", "prompt?", "industry?", "sheet?"],
    fileKeys: Object.keys(REQUIRED_HEADERS),
  });
}
