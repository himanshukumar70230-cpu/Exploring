import { NextResponse } from "next/server";

import { DEV_AUTH_COOKIE, apiBaseURL, clerkEnabled } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (clerkEnabled()) {
    return NextResponse.json(
      { error: { code: "dev_auth_disabled", message: "Sign in with Clerk on this deployment." } },
      { status: 403 },
    );
  }

  let body: { email?: string; name?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseURL()}/v1/auth/dev`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: body.email?.trim() ?? "",
        name: body.name?.trim() ?? "",
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: { code: "backend_unreachable", message: "The Bidline API is not reachable. Try again shortly." } },
      { status: 502 },
    );
  }

  const raw = await upstream.text();
  const payload = raw ? JSON.parse(raw) : null;
  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const expiresAt = payload?.expiresAt ? new Date(payload.expiresAt) : undefined;
  const response = NextResponse.json({
    user: payload.user,
    provider: payload.provider,
    expiresAt: payload.expiresAt,
  });
  response.cookies.set({
    name: DEV_AUTH_COOKIE,
    value: payload.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return response;
}
