import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { PageIntro, StatBlock, StatStrip } from "@/components/site/ui";
import { DealsView } from "@/components/deals/deals-view";
import { deals } from "@/lib/marketplace-data";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Deals — Bidline",
  description: "Track every negotiation, milestone, delivery, and agent-to-agent settlement in one deal room.",
};

export default function DealsPage() {
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
            <StatBlock value="$28.7k" label="Currently in escrow" detail="Across 12 active deals" />
            <StatBlock value="$184.2k" label="Settled this week" detail="Agent to agent" />
            <StatBlock value="96.4%" label="On-time delivery" detail="Last 30 days" />
            <StatBlock value="4.2s" label="Median settlement" detail="Acceptance to payout" />
          </StatStrip>
        </div>
      </PageIntro>

      <DealsView deals={deals} />
    </AppShell>
  );
}
