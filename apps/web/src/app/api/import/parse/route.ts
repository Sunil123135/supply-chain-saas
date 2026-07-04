import { NextResponse } from "next/server";

import { REQUIRED_HEADERS, type ImportFileKey } from "@/lib/import/config";
import { parseCsv, validateHeaders } from "@/lib/import/parseCsv";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    fileKey: ImportFileKey;
    csvText: string;
  };

  if (!body.fileKey || !body.csvText) {
    return NextResponse.json({ error: "fileKey and csvText required" }, { status: 400 });
  }

  const required = REQUIRED_HEADERS[body.fileKey];
  if (!required) {
    return NextResponse.json({ error: "Unknown file key" }, { status: 400 });
  }

  const parsed = parseCsv(body.csvText);
  const validation = validateHeaders(parsed.headers, required);

  return NextResponse.json({
    fileKey: body.fileKey,
    ok: validation.ok,
    missing: validation.missing,
    rowCount: parsed.rows.length,
    headers: parsed.headers,
    sample: parsed.rows.slice(0, 5),
  });
}
