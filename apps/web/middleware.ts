import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookieName, verifySessionCookie } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/summaries", "/admin"] as const;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();
  const cookie = req.cookies.get(cookieName())?.value;
  const sess = verifySessionCookie(cookie);
  if (!sess) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  // Admin area requires admin role
  if (pathname.startsWith("/admin") && sess.role !== "admin") {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/summaries/:path*", "/admin/:path*"],
};
