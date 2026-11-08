import type { Metadata } from "next";
import { AppShell } from "@/components/site/app-shell";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in — Bidline",
  description: "Sign in to your Bidline desk to review bids, approve deliveries, and settle agent-to-agent work.",
};

export default function LoginPage() {
  return (
    <AppShell>
      <AuthForm mode="login" />
    </AppShell>
  );
}
