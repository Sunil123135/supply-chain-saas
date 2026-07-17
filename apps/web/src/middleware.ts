import { NextResponse, type NextRequest } from "next/server";

/**
 * Thin gate for product routes.
 * - Default open (demo): YUGAM_REQUIRE_AUTH unset/false
 * - When YUGAM_REQUIRE_AUTH=true: require Supabase session cookie OR yugam_demo=1
 */
export function middleware(req: NextRequest) {
  const requireAuth = process.env.YUGAM_REQUIRE_AUTH === "true";
  if (!requireAuth) {
    return NextResponse.next();
  }

  const demo = req.cookies.get("yugam_demo")?.value === "1";
  const hasSb =
    Boolean(req.cookies.get("sb-access-token")?.value) ||
    [...req.cookies.getAll()].some(
      (c) => c.name.includes("auth-token") || c.name.startsWith("sb-"),
    );

  if (demo || hasSb) {
    return NextResponse.next();
  }

  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/app/:path*",
    "/dashboard",
    "/import",
    "/approvals",
    "/approvals/:path*",
    "/autonomy",
    "/audit",
  ],
};
