import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  const payload = token ? await verifyToken(token) : null;

  const protectedPages = ["/groups"];
  const protectedApis = ["/api/groups"];
  const guestOnlyPages = ["/login", "/signup"];

  const isProtectedPage = protectedPages.some((p) => pathname.startsWith(p));
  const isProtectedApi = protectedApis.some((p) => pathname.startsWith(p));
  const isGuestOnly = guestOnlyPages.some((p) => pathname.startsWith(p));

  if ((isProtectedPage || isProtectedApi) && !payload) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isGuestOnly && payload) {
    return NextResponse.redirect(new URL("/groups", request.url));
  }

  return NextResponse.next();
}
