import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { User } from "@/lib/api-types";
import { DEV_AUTH_COOKIE } from "@/lib/backend-constants";

export { DEV_AUTH_COOKIE };

export function apiBaseURL() {
  const raw = (process.env.BIDLINE_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
  // Render's fromService values arrive as a bare host, so default to https
  // unless the configured value already includes a scheme.
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function clerkPublishableKey() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
}

/** Clerk is only considered configured when both halves of the key pair exist. */
export function clerkEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export class BackendError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "BackendError";
    this.status = status;
    this.code = code;
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (clerkEnabled()) {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    if (!session.userId) return null;
    return session.getToken();
  }
  const store = await cookies();
  return store.get(DEV_AUTH_COOKIE)?.value ?? null;
}

type BackendOptions = Omit<RequestInit, "cache"> & { cache?: RequestCache };

export async function backendFetch<T>(path: string, options: BackendOptions = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new BackendError(401, "unauthorized", "Sign in to continue.");
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseURL()}/v1${normalized}`, {
      ...options,
      headers,
      cache: options.cache ?? "no-store",
    });
  } catch {
    throw new BackendError(502, "backend_unreachable", "The Bidline API is not reachable. Try again shortly.");
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = payload as { error?: { code?: string; message?: string } } | null;
    throw new BackendError(
      response.status,
      body?.error?.code ?? "request_failed",
      body?.error?.message ?? "The request could not be completed.",
    );
  }

  return payload as T;
}

/** Fetch inside a page; an expired or missing session goes back through sign-in. */
export async function serverFetch<T>(path: string, options: BackendOptions = {}): Promise<T> {
  try {
    return await backendFetch<T>(path, options);
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      redirect("/login");
    }
    throw error;
  }
}

export const getViewer = cache(async (): Promise<User | null> => {
  try {
    const session = await backendFetch<{ user: User }>("/auth/me");
    return session.user;
  } catch {
    return null;
  }
});
