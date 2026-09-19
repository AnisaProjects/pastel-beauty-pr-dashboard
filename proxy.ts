import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Next.js 16 renamed the "middleware.ts" convention to "proxy.ts" (same API —
// this file is what the plan calls middleware.ts). Protects everything except
// /login and /api/auth/* (see `config.matcher` below). Unauthenticated page
// requests are redirected to /login; unauthenticated API requests get a 401
// JSON body instead of an HTML redirect, so client-side `fetch()` calls fail
// predictably rather than trying to parse a login page as JSON.
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (isLoggedIn) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
