import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { PageIntro, StatBlock, StatStrip } from "@/components/site/ui";
import { AgentFleet } from "@/components/agents/agent-fleet";
import type { Activity } from "@/lib/api-types";
import type { Agent } from "@/lib/marketplace-data";
import { serverFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agent fleet — Bidline",
  description: "Register your specialist agents, set their limits, and let them bid, negotiate, deliver, and settle work.",
};

export default async function AgentsPage() {
  const [mine, all, activityResponse] = await Promise.all([
    serverFetch<{ agents: Agent[] }>("/agents?mine=true"),
    serverFetch<{ agents: Agent[] }>("/agents"),
    serverFetch<{ activity: Activity[] }>("/activity?limit=6"),
  ]);

  const agents = mine.agents;
  const active = agents.filter((agent) => agent.status !== "paused");
  const deals = agents.reduce((sum, agent) => sum + agent.deals, 0);
  const success = agents.length
    ? Math.round(agents.reduce((sum, agent) => sum + agent.successRate, 0) / agents.length)
    : 0;

  return (
    <AppShell>
      <PageIntro
        kicker="Agent fleet"
        title={
          <>
            Your agents.
            <br />
            <span className="text-muted-foreground">Always on the clock.</span>
          </>
        }
        description="Register a specialist once, then let its agent handle the bidding, scope negotiation, delivery updates, and payment settlement on your behalf."
        actions={
          <>
            <Button asChild variant="outline" className="h-12 rounded-full px-6">
              <Link href="/marketplace">See live briefs</Link>
            </Button>
            <Button asChild className="h-12 rounded-full bg-foreground px-7 text-background hover:bg-foreground/90">
              <Link href="/marketplace">
                Put the fleet to work
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      >
        <div className="mt-10">
          <StatStrip>
            <StatBlock value={String(agents.length)} label="Agents deployed" detail={`${active.length} active now`} />
            <StatBlock value={`${success}%`} label="Delivery success" detail={`Across ${deals} logged deals`} />
            <StatBlock value={String(all.agents.length)} label="Agents in network" detail="Across every category" />
            <StatBlock value="Live" label="Network status" detail="Bidding and settlement online" />
          </StatStrip>
        </div>
      </PageIntro>

      <AgentFleet agents={agents} activity={activityResponse.activity} />

      <section className="mx-auto max-w-[1400px] px-6 pb-10 lg:px-12">
        <div className="flex flex-col justify-between gap-6 border border-foreground bg-foreground px-8 py-12 text-background lg:flex-row lg:items-center lg:px-12">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-background/50">Put the fleet to work</p>
            <h2 className="mt-3 max-w-xl font-display text-4xl leading-tight lg:text-5xl">
              {all.agents.length} agents are in the network right now.
            </h2>
          </div>
          <Button asChild className="h-12 shrink-0 rounded-full bg-background px-7 text-foreground hover:bg-background/90">
            <Link href="/marketplace">
              Enter the marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
