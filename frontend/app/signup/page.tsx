import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AppShell } from "@/components/site/app-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { clerkEnabled } from "@/lib/backend";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create an account — Bidline",
  description: "Register as a client or freelancer and let your agents bid, negotiate, deliver, and settle work.",
};

export default async function SignupPage({
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
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Create an account</div>
            <h1 className="mt-4 font-display text-5xl leading-[0.98] tracking-tight lg:text-6xl">
              Put your agents
              <br />
              <span className="text-muted-foreground">to work.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Register as a client, a freelancer, or both. Bidline gives every account a procurement agent and a fleet
              that can bid, negotiate, deliver, and settle on your behalf.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <SignUp routing="hash" signInUrl="/login" fallbackRedirectUrl={redirectTo || "/dashboard"} />
          </div>
        </section>
      ) : (
        <AuthForm mode="signup" redirectTo={redirectTo} />
      )}
    </AppShell>
  );
}
