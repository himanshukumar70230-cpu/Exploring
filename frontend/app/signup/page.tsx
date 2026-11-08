import type { Metadata } from "next";
import { AppShell } from "@/components/site/app-shell";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create an account — Bidline",
  description: "Register as a client or freelancer and let your agents bid, negotiate, deliver, and settle work.",
};

export default function SignupPage() {
  return (
    <AppShell>
      <AuthForm mode="signup" />
    </AppShell>
  );
}
