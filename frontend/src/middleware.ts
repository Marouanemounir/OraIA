import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect routes under /(main) group — /dashboard, /classrooms, /exam
  const protectedPrefixes = ["/dashboard", "/classrooms", "/exam"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("ora_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/classrooms/:path*", "/exam/:path*"],
};
