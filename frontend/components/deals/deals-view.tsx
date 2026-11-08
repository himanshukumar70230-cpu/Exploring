"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { Deal } from "@/lib/marketplace-data";
import { AgentAvatar, ProgressBar, StatusPill, usd } from "@/components/site/ui";

const tabs = [
  { value: "all", label: "All deals" },
  { value: "negotiating", label: "Negotiating" },
  { value: "active", label: "Active" },
  { value: "review", label: "In review" },
  { value: "settled", label: "Settled" },
];

export function DealsView({ deals }: { deals: Deal[] }) {
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () => (status === "all" ? deals : deals.filter((deal) => deal.status === status)),
    [deals, status]
  );

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-foreground/10 pb-5">
            {tabs.map((tab) => {
              const count = tab.value === "all" ? deals.length : deals.filter((deal) => deal.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatus(tab.value)}
                  className={`inline-flex items-center gap-2 border px-4 py-2 text-xs transition-colors ${
                    status === tab.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/10 text-foreground/60 hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className={`font-mono text-[10px] ${status === tab.value ? "text-background/60" : "text-muted-foreground"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border border-foreground/10">
            <div className="hidden grid-cols-[2fr_1.1fr_0.8fr_0.6fr] gap-6 border-b border-foreground/10 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:grid">
              <span>Deal</span>
              <span>Progress</span>
              <span>Value</span>
              <span className="text-right">Open</span>
            </div>

            <div className="divide-y divide-foreground/5">
              {filtered.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="group grid gap-5 px-6 py-6 transition-colors hover:bg-foreground/[0.015] lg:grid-cols-[2fr_1.1fr_0.8fr_0.6fr] lg:items-center lg:gap-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={deal.status} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{deal.id}</span>
                    </div>
                    <h2 className="mt-3 max-w-md font-display text-2xl leading-tight transition-transform group-hover:translate-x-1">
                      {deal.title}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <AgentAvatar initials={deal.client.slice(0, 2).toUpperCase()} size="sm" />
                        {deal.client}
                      </span>
                      <span className="text-foreground/20">↔</span>
                      <span className="inline-flex items-center gap-1.5">
                        <AgentAvatar initials={deal.freelancer.slice(0, 2).toUpperCase()} size="sm" />
                        {deal.freelancer}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{deal.nextMilestone}</span>
                      <span className="font-mono text-[10px]">{deal.progress}%</span>
                    </div>
                    <ProgressBar value={deal.progress} className="mt-2" />
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      Due {deal.due}
                    </div>
                  </div>

                  <div>
                    <div className="font-display text-2xl">{usd(deal.amount)}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {deal.escrow > 0 ? `${usd(deal.escrow)} in escrow` : deal.status === "settled" ? "Fully settled" : "Not funded"}
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <span className="inline-flex h-9 w-9 items-center justify-center border border-foreground/10 transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-foreground/15 px-6 text-center">
              <p className="font-display text-3xl">Nothing here yet.</p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">Deals move into this stage as agents agree terms and fund escrow.</p>
            </div>
          ) : null}

          <p className="mt-6 text-xs text-muted-foreground">
            All deals are settled by acceptance agents. Humans can pause, approve, or reverse any release.
          </p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border border-foreground/10 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Escrow overview</div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">In escrow</span>
                <span className="font-medium">{usd(28750)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Released this week</span>
                <span>{usd(184200)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending acceptance</span>
                <span>{usd(1875)}</span>
              </div>
            </div>
            <Link href="/wallet" className="mt-4 inline-flex items-center gap-1 text-xs hover:underline">
              Open wallet <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="border border-foreground/10 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Settlement flow</div>
            <ol className="mt-4 space-y-4">
              {[
                { title: "Milestone funded", text: "Client agent locks funds in escrow." },
                { title: "Work delivered", text: "Talent agent attaches proof and files." },
                { title: "Acceptance", text: "Client agent verifies against the brief." },
                { title: "Agent-to-agent release", text: "Funds settle instantly to the talent wallet." },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-foreground/10 font-mono text-[10px]">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm">{item.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-foreground p-5 text-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-background/50">Median settlement</p>
            <p className="mt-3 font-display text-4xl">4.2s</p>
            <p className="mt-2 text-xs leading-relaxed text-background/60">
              From acceptance-agent approval to funds landing in the freelancer agent&apos;s wallet.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
