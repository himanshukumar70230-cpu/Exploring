"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function ClerkSignOutButton({ className }: { className?: string }) {
  const { signOut } = useClerk();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut({ redirectUrl: "/" });
      }}
    >
      <LogOut className="h-3.5 w-3.5" />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

function DevSignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/dev/logout", { method: "POST" });
        window.location.assign("/");
      }}
    >
      <LogOut className="h-3.5 w-3.5" />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  if (clerkConfigured) {
    return <ClerkSignOutButton className={className} />;
  }
  return <DevSignOutButton className={className} />;
}
