import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

import {
  IMPORT_FILES,
  PACK_PATHS,
  REQUIRED_HEADERS,
  type IndustryPack,
} from "@/lib/import/config";
import { parseCsv, validateHeaders } from "@/lib/import/parseCsv";

function dataRoot(): string {
  return path.join(process.cwd(), "..", "..", "data");
}

export async function GET(
  _req: Request,
  { params }: { params: { industry: string } },
) {
  const industry = params.industry as IndustryPack;
  if (!PACK_PATHS[industry]) {
    return NextResponse.json({ error: "Unknown industry pack" }, { status: 400 });
  }

  const packDir = path.join(dataRoot(), PACK_PATHS[industry]);
  const files: Record<string, { headers: string[]; rowCount: number; sample: Record<string, string>[] }> = {};

  for (const spec of IMPORT_FILES) {
    try {
      const raw = await readFile(path.join(packDir, spec.filename), "utf-8");
      const parsed = parseCsv(raw);
      files[spec.key] = {
        headers: parsed.headers,
        rowCount: parsed.rows.length,
        sample: parsed.rows.slice(0, 3),
      };
    } catch {
      files[spec.key] = { headers: [], rowCount: 0, sample: [] };
    }
  }

  return NextResponse.json({
    industry,
    pack: PACK_PATHS[industry],
    files,
  });
}

export async function POST(
  req: Request,
  { params }: { params: { industry: string } },
) {
  const industry = params.industry as IndustryPack;
  if (!PACK_PATHS[industry]) {
    return NextResponse.json({ error: "Unknown industry pack" }, { status: 400 });
  }

  const packDir = path.join(dataRoot(), PACK_PATHS[industry]);
  const loaded: Record<string, { rowCount: number; headers: string[]; rows: Record<string, string>[] }> = {};

  for (const spec of IMPORT_FILES) {
    try {
      const raw = await readFile(path.join(packDir, spec.filename), "utf-8");
      const parsed = parseCsv(raw);
      const validation = validateHeaders(parsed.headers, REQUIRED_HEADERS[spec.key]);
      if (!validation.ok && spec.required) {
        return NextResponse.json(
          { error: `Missing columns in ${spec.filename}`, missing: validation.missing },
          { status: 400 },
        );
      }
      loaded[spec.key] = {
        rowCount: parsed.rows.length,
        headers: parsed.headers,
        rows: parsed.rows,
      };
    } catch (e) {
      if (spec.required) {
        return NextResponse.json({ error: `Missing required file ${spec.filename}` }, { status: 400 });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    industry,
    importedAt: new Date().toISOString(),
    summary: Object.fromEntries(
      Object.entries(loaded).map(([k, v]) => [k, { rowCount: v.rowCount, headers: v.headers }]),
    ),
    data: loaded,
  });
}
