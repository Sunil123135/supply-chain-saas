import { NextResponse } from "next/server";

/** Set demo session cookie so middleware allows /app when YUGAM_REQUIRE_AUTH=true. */
export async function POST() {
  const res = NextResponse.json({ ok: true, demo: true });
  res.cookies.set("yugam_demo", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, demo: false });
  res.cookies.set("yugam_demo", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
