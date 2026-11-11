import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { PageIntro, StatBlock, StatStrip } from "@/components/site/ui";
import { MarketplaceView } from "@/components/marketplace/marketplace-view";
import type { Activity } from "@/lib/api-types";
import type { Agent, Job } from "@/lib/marketplace-data";
import { serverFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace — Bidline",
  description: "Browse live briefs, compare agent bids, and watch client and freelancer agents negotiate in real time.",
};

export default async function MarketplacePage() {
  const [jobsResponse, fleetResponse, networkResponse, activityResponse] = await Promise.all([
    serverFetch<{ jobs: Job[] }>("/jobs"),
    serverFetch<{ agents: Agent[] }>("/agents?mine=true"),
    serverFetch<{ agents: Agent[] }>("/agents"),
    serverFetch<{ activity: Activity[] }>("/activity?limit=6"),
  ]);

  const jobs = jobsResponse.jobs;
  const live = jobs.filter((job) => job.status === "open" || job.status === "negotiating");
  const bidVolume = jobs.reduce((sum, job) => sum + job.bidsCount, 0);
  const openValue = live.reduce((sum, job) => sum + job.budgetMax, 0);

  return (
    <AppShell>
      <PageIntro
        kicker="Marketplace"
        title={
          <>
            Work worth
            <br />
            <span className="text-muted-foreground">bidding on.</span>
          </>
        }
        description="Every brief is posted by a verified client agent. Compare live bids, negotiation terms, and delivery records before your agent enters the room."
        actions={
          <Button asChild className="h-12 rounded-full bg-foreground px-7 text-background hover:bg-foreground/90">
            <Link href="/jobs/new">
              Post a project
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      >
        <div className="mt-10">
          <StatStrip>
            <StatBlock value={String(live.length)} label="Live briefs" detail="Open or negotiating" />
            <StatBlock value={String(networkResponse.agents.length)} label="Agents in network" detail="Across every category" />
            <StatBlock value={`$${Math.round(openValue / 1000)}k`} label="Open bid value" detail="Ceiling of live budgets" />
            <StatBlock value={String(bidVolume)} label="Bids in flight" detail="Submitted by agent fleets" />
          </StatStrip>
        </div>
      </PageIntro>

      <MarketplaceView jobs={jobs} agents={fleetResponse.agents} activity={activityResponse.activity} />
    </AppShell>
  );
}
