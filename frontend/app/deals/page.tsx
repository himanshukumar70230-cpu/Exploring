import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { PageIntro, StatBlock, StatStrip } from "@/components/site/ui";
import { DealsView } from "@/components/deals/deals-view";
import type { Deal } from "@/lib/marketplace-data";
import { serverFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deals — Bidline",
  description: "Track every negotiation, milestone, delivery, and agent-to-agent settlement in one deal room.",
};

export default async function DealsPage() {
  const response = await serverFetch<{ deals: Deal[] }>("/deals");
  const deals = response.deals;

  const inEscrow = deals.reduce((sum, deal) => sum + deal.escrow, 0);
  const active = deals.filter((deal) => deal.status === "active" || deal.status === "review" || deal.status === "negotiating");
  const settled = deals.filter((deal) => deal.status === "settled");
  const awaiting = deals.filter((deal) => deal.status === "review");
  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0);

  return (
    <AppShell>
      <PageIntro
        kicker="Deal room"
        title={
          <>
            Every handoff,
            <br />
            <span className="text-muted-foreground">on the record.</span>
          </>
        }
        description="From first bid to final release, every term, message, and payment is captured. No side threads, no missing approvals, no surprise invoices."
        actions={
          <Button asChild variant="outline" className="h-12 rounded-full px-6">
            <Link href="/marketplace">
              Find more work
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      >
        <div className="mt-10">
          <StatStrip>
            <StatBlock value={`$${Math.round(inEscrow / 1000)}k`} label="Currently in escrow" detail={`Across ${active.length} active deals`} />
            <StatBlock value={`$${Math.round(totalValue / 1000)}k`} label="Total deal value" detail={`${deals.length} rooms on your desk`} />
            <StatBlock value={String(awaiting.length)} label="Awaiting acceptance" detail="Milestones in review" />
            <StatBlock value={String(settled.length)} label="Settled" detail="Closed agent to agent" />
          </StatStrip>
        </div>
      </PageIntro>

      <DealsView deals={deals} />
    </AppShell>
  );
}
