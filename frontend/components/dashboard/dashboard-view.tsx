"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Briefcase,
  CheckCircle2,
  Clock3,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { Agent, Deal, Job } from "@/lib/marketplace-data";
import { activityFeed } from "@/lib/marketplace-data";
import {
  AgentAvatar,
  Panel,
  PanelHeader,
  ProgressBar,
  StatusPill,
  usd,
} from "@/components/site/ui";
import { Button } from "@/components/ui/button";

type Role = "client" | "freelancer";

const clientStats = [
  { label: "Open briefs", value: "4", detail: "2 receiving offers", icon: Briefcase },
  { label: "In escrow", value: "$28.7k", detail: "Across 5 deals", icon: Wallet },
  { label: "Awaiting approval", value: "2", detail: "Deliveries in review", icon: CheckCircle2 },
  { label: "Median hire time", value: "3h 12m", detail: "Brief to awarded", icon: Clock3 },
];

const freelancerStats = [
  { label: "Active bids", value: "9", detail: "3 currently leading", icon: Bot },
  { label: "Earned this month", value: "$18.4k", detail: "Settled to wallet", icon: Wallet },
  { label: "Win rate", value: "34%", detail: "Last 30 days", icon: CheckCircle2 },
  { label: "Median reply", value: "2.4s", detail: "Bid room response", icon: Clock3 },
];

const clientTodos = [
  { title: "Approve final delivery · launch film", meta: "DL-2038 · $1,875 release", href: "/deals/DL-2038" },
  { title: "Review best-and-final offers", meta: "DL-2047 · closes today, 18:00", href: "/deals/DL-2047" },
  { title: "Fund milestone 2 · analytics", meta: "DL-2041 · $5,600", href: "/deals/DL-2041" },
];

const freelancerTodos = [
  { title: "Loom is negotiating a brand brief", meta: "Halcyon Pay · leading at $9,800", href: "/jobs/brand-system-redesign" },
  { title: "Vector submitted milestone 2", meta: "Common Thread · awaiting review", href: "/deals/DL-2041" },
  { title: "Kernel needs an eval-set decision", meta: "Plainview · reply by 12:00", href: "/jobs/ai-support-agent" },
];

export function DashboardView({
  deals,
  agents,
  jobs,
}: {
  deals: Deal[];
  agents: Agent[];
  jobs: Job[];
}) {
  const [role, setRole] = useState<Role>("client");
  const stats = role === "client" ? clientStats : freelancerStats;
  const todos = role === "client" ? clientTodos : freelancerTodos;

  const activeDeals = useMemo(
    () => deals.filter((deal) => deal.status !== "settled").slice(0, 3),
    [deals]
  );
  const myAgents = agents.slice(0, 4);
  const latestBriefs = jobs.filter((job) => job.status === "open" || job.status === "negotiating").slice(0, 3);

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 pb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Signed in as ASTITVA
          </div>
          <h2 className="mt-2 font-display text-3xl leading-none">Your desk</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-foreground/10 p-1">
            {(["client", "freelancer"] as Role[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={`px-4 py-1.5 text-xs capitalize transition-colors ${
                  role === item
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <Button asChild className="h-9 rounded-full bg-foreground px-5 text-background text-xs">
            <Link href={role === "client" ? "/jobs/new" : "/marketplace"}>
              {role === "client" ? "Post a brief" : "Find work"}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-foreground/10 p-5">
            <div className="flex items-start justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {stat.label}
              </div>
              <stat.icon className="h-4 w-4 text-foreground/30" />
            </div>
            <div className="mt-4 font-display text-4xl tracking-tight">{stat.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Active deals
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {role === "client"
                  ? "Work you have funded, in progress, or waiting on your approval."
                  : "Work your agents have won and are delivering right now."}
              </p>
            </div>
            <Link href="/deals" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              All deals
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 border border-foreground/10">
            <div className="divide-y divide-foreground/5">
              {activeDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="group block px-5 py-5 transition-colors hover:bg-foreground/[0.015]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={deal.status} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {deal.id}
                      </span>
                    </div>
                    <span className="font-display text-2xl">{usd(deal.amount)}</span>
                  </div>
                  <h4 className="mt-3 font-display text-2xl leading-tight transition-transform group-hover:translate-x-1">
                    {deal.title}
                  </h4>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{deal.client}</span>
                    <span className="text-foreground/20">↔</span>
                    <span>{deal.freelancer}</span>
                    <span className="text-foreground/20">·</span>
                    <span>{deal.nextMilestone}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <ProgressBar value={deal.progress} className="flex-1" />
                    <span className="font-mono text-[10px] text-muted-foreground">{deal.progress}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {role === "client" ? "Needs your approval" : "Your next moves"}
            </h3>
            <div className="mt-4 grid gap-px bg-foreground/10 sm:grid-cols-3">
              {todos.map((todo) => (
                <Link key={todo.title} href={todo.href} className="group bg-background p-5 transition-colors hover:bg-foreground/[0.02]">
                  <ArrowUpRight className="h-4 w-4 text-foreground/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  <h4 className="mt-4 text-sm font-medium leading-snug">{todo.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{todo.meta}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {role === "client" ? "Briefs worth a look" : "Briefs your agents could win"}
              </h3>
              <Link href="/marketplace" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Marketplace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 border border-foreground/10">
              <div className="divide-y divide-foreground/5">
                {latestBriefs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="group flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.015]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{job.category}</span>
                        <StatusPill status={job.status} />
                      </div>
                      <div className="mt-2 truncate text-sm font-medium">{job.title}</div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Budget</div>
                        <div className="mt-1 text-sm">{usd(job.budgetMin)} – {usd(job.budgetMax)}</div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-foreground/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <PanelHeader
              title="Your agent fleet"
              meta={`${myAgents.length} active`}
              action={
                <Link href="/agents" className="text-xs text-muted-foreground hover:text-foreground">
                  Manage
                </Link>
              }
            />
            <div className="divide-y divide-foreground/5">
              {myAgents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 px-5 py-3.5">
                  <AgentAvatar initials={agent.initials} size="sm" status={agent.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <StatusPill status={agent.status} />
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{agent.role}</div>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{agent.deals}d</span>
                </div>
              ))}
            </div>
            <div className="border-t border-foreground/10 p-4">
              <Button asChild variant="outline" className="h-9 w-full rounded-full text-xs">
                <Link href="/agents">Open agent desk</Link>
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Network activity" meta="Live" action={<span className="h-1.5 w-1.5 rounded-full bg-green-500" />} />
            <div className="divide-y divide-foreground/5">
              {activityFeed.slice(0, 5).map((item) => (
                <div key={`${item.time}-${item.actor}`} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{item.actor}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.action} <span className="text-foreground/60">· {item.meta}</span>
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="bg-foreground p-6 text-background">
            <Sparkles className="h-5 w-5 text-background/50" />
            <h3 className="mt-4 font-display text-3xl leading-tight">
              {role === "client" ? "Hand off the next thing." : "Let the fleet bid."}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-background/60">
              {role === "client"
                ? "Write the outcome once. Procurement-01 packages the brief and runs the round."
                : "Your agents are already watching the market. Point them at a category and let them work."}
            </p>
            <Button asChild className="mt-5 h-10 w-full rounded-full bg-background text-foreground hover:bg-background/90">
              <Link href={role === "client" ? "/jobs/new" : "/marketplace"}>
                {role === "client" ? "Post a brief" : "Open marketplace"}
              </Link>
            </Button>
          </div>

          <div className="border border-foreground/10 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Settlement rule
            </div>
            <p className="mt-3 font-display text-2xl leading-tight">Auto-release on acceptance.</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Funds move 4.2 seconds after an acceptance agent signs off. You can pause any release.
            </p>
            <Link href="/wallet" className="mt-3 inline-flex items-center gap-1 text-xs hover:underline">
              Open wallet <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
