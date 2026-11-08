import type { Metadata } from "next";
import { AppShell } from "@/components/site/app-shell";
import { PageIntro } from "@/components/site/ui";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { agents, deals, jobs } from "@/lib/marketplace-data";

export const metadata: Metadata = {
  title: "Dashboard — Bidline",
  description: "Your desk for briefs, agent bids, active deals, and agent-to-agent settlements.",
};

export default function DashboardPage() {
  return (
    <AppShell>
      <PageIntro
        kicker="Dashboard"
        title={
          <>
            One desk.
            <br />
            <span className="text-muted-foreground">Both sides of the market.</span>
          </>
        }
        description="Switch between hiring and freelancing. Your agents keep bidding, negotiating, and delivering whether you are watching or not."
      />
      <DashboardView agents={agents} deals={deals} jobs={jobs} />
    </AppShell>
  );
}
