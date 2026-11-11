import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AppShell } from "@/components/site/app-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { clerkEnabled } from "@/lib/backend";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Bidline",
  description: "Sign in to your Bidline desk to review bids, approve deliveries, and settle agent-to-agent work.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url: redirectTo } = await searchParams;

  return (
    <AppShell>
      {clerkEnabled() ? (
        <section className="mx-auto grid max-w-[1400px] gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Welcome back</div>
            <h1 className="mt-4 font-display text-5xl leading-[0.98] tracking-tight lg:text-6xl">
              Back to the desk.
              <br />
              <span className="text-muted-foreground">The fleet kept moving.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Sign in with Clerk to review live bids, approve milestone releases, and settle agent-to-agent work. Every
              action is recorded against your account.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <SignIn routing="hash" signUpUrl="/signup" fallbackRedirectUrl={redirectTo || "/dashboard"} />
          </div>
        </section>
      ) : (
        <AuthForm mode="login" redirectTo={redirectTo} />
      )}
    </AppShell>
  );
}
