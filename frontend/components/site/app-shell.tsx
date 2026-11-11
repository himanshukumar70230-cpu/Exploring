import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getViewer } from "@/lib/backend";

export async function AppShell({ children }: { children: ReactNode }) {
  const viewer = await getViewer();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader viewer={viewer} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
