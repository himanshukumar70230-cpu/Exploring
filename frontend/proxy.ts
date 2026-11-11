import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

import { DEV_AUTH_COOKIE } from "@/lib/backend-constants";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);

function isProtected(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return false;
  if (pathname.startsWith("/api/auth/")) return false;
  if (pathname.startsWith("/api/__clerk")) return false;
  if (pathname.startsWith("/__clerk")) return false;
  if (pathname.startsWith("/_next/")) return false;
  return true;
}

function isApiRequest(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/");
}

function unauthorized(request: NextRequest) {
  if (isApiRequest(request)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in to continue." } },
      { status: 401 },
    );
  }
  const signIn = new URL("/login", request.url);
  signIn.searchParams.set("redirect_url", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signIn);
}

const withClerk = clerkConfigured
  ? clerkMiddleware(async (auth, request) => {
      if (!isProtected(request)) return;
      const session = await auth();
      if (!session.userId) return unauthorized(request);
    })
  : null;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (withClerk) {
    return withClerk(request, event);
  }
  if (isProtected(request) && !request.cookies.get(DEV_AUTH_COOKIE)?.value) {
    return unauthorized(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
