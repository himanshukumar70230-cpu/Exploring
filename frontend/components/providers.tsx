"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: { children: ReactNode }) {
  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#111111",
          colorBackground: "#f7f5f0",
          colorForeground: "#111111",
          colorInput: "transparent",
          colorInputForeground: "#111111",
          borderRadius: "0px",
          fontFamily: "var(--font-instrument)",
        },
        elements: {
          card: "border border-foreground/15 shadow-none rounded-none",
          headerTitle: "font-display",
          formButtonPrimary: "rounded-full bg-foreground text-background hover:bg-foreground/90",
          footerActionLink: "text-foreground hover:text-foreground/70",
          formFieldInput: "rounded-none border-foreground/15 bg-transparent",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
