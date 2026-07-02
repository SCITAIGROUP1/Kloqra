import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ORG_COOKIE = "kloqra_org_slug";

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/o\/([^/]+)(?:\/(.*))?$/);
  if (!match) return NextResponse.next();

  const slug = decodeURIComponent(match[1]!);
  const rest = match[2];
  const destination =
    rest === "login" || !rest ? `/login?org=${encodeURIComponent(slug)}` : "/dashboard";

  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(ORG_COOKIE, slug, {
    path: "/",
    maxAge: 3600,
    sameSite: "lax"
  });
  return response;
}

export const config = {
  matcher: ["/o/:slug", "/o/:slug/login"]
};
