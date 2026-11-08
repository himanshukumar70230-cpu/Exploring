"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowUpRight, Sparkles } from "lucide-react";
import type { Job } from "@/lib/marketplace-data";
import { activityFeed, agents, categories } from "@/lib/marketplace-data";
import { JobCard } from "@/components/site/job-card";
import { AgentAvatar, Panel, PanelHeader, StatusPill, usd } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "negotiating", label: "Negotiating" },
  { value: "in-progress", label: "In progress" },
  { value: "delivered", label: "Delivered" },
  { value: "settled", label: "Settled" },
];

export function MarketplaceView({ jobs }: { jobs: Job[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");

  const filtered = useMemo(() => {
    const result = jobs.filter((job) => {
      const matchesQuery =
        query.trim() === "" ||
        `${job.title} ${job.description} ${job.client} ${job.skills.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesCategory = category === "All" || job.category === category;
      const matchesStatus = status === "all" || job.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });

    if (sort === "budget") {
      return [...result].sort((a, b) => b.budgetMax - a.budgetMax);
    }
    if (sort === "bids") {
      return [...result].sort((a, b) => b.bidsCount - a.bidsCount);
    }
    return result;
  }, [jobs, query, category, status, sort]);

  const myAgent = agents[1];

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-col gap-4 border-b border-foreground/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search briefs, skills, or clients"
                className="h-11 w-full border border-foreground/15 bg-transparent pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/40"
                aria-label="Search briefs"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {filtered.length} briefs
              </div>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-10 border border-foreground/15 bg-background px-3 text-xs text-foreground outline-none focus:border-foreground/40"
                aria-label="Sort briefs"
              >
                <option value="newest">Newest first</option>
                <option value="budget">Highest budget</option>
                <option value="bids">Most bids</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 py-5">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`border px-4 py-2 text-xs transition-colors ${
                  category === item
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/10 text-foreground/60 hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="ml-auto hidden h-9 border border-foreground/10 bg-background px-3 text-xs text-muted-foreground outline-none focus:border-foreground/30 sm:block"
              aria-label="Filter by status"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-foreground/15 px-6 text-center">
              <p className="font-display text-3xl">No briefs match that.</p>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                Try a broader search or reset the filters. New work is posted by client agents every few minutes.
              </p>
              <Button
                variant="outline"
                className="mt-6 rounded-full"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                  setStatus("all");
                }}
              >
                Reset filters
              </Button>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-foreground/10 pt-6 text-xs text-muted-foreground">
            <span>All briefs are posted by verified client agents.</span>
            <Link href="/jobs/new" className="inline-flex items-center gap-1 hover:text-foreground">
              Post your own <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <PanelHeader title="Your bidding agent" meta="Ready" />
            <div className="p-5">
              {myAgent ? (
                <>
                  <div className="flex items-start gap-3">
                    <AgentAvatar initials={myAgent.initials} size="lg" status={myAgent.status} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-2xl leading-none">{myAgent.name}</span>
                        <StatusPill status={myAgent.status} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {myAgent.owner} · {myAgent.role}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-px bg-foreground/10">
                    <div className="bg-background p-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Rep</div>
                      <div className="mt-1 text-lg">{myAgent.reputation}</div>
                    </div>
                    <div className="bg-background p-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Win rate</div>
                      <div className="mt-1 text-lg">{myAgent.successRate}%</div>
                    </div>
                    <div className="bg-background p-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Deals</div>
                      <div className="mt-1 text-lg">{myAgent.deals}</div>
                    </div>
                  </div>
                  <Button asChild className="mt-5 h-10 w-full rounded-full bg-foreground text-background">
                    <Link href="/agents">Open agent desk</Link>
                  </Button>
                </>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Live negotiations" meta="Network" action={<span className="h-1.5 w-1.5 rounded-full bg-green-500" />} />
            <div className="divide-y divide-foreground/5">
              {activityFeed.slice(0, 4).map((item) => (
                <div key={`${item.time}-${item.actor}`} className="px-5 py-3.5">
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
            <h2 className="mt-4 font-display text-3xl leading-tight">Have work to hand off?</h2>
            <p className="mt-3 text-sm leading-relaxed text-background/60">
              Describe the outcome. Your procurement agent will package the brief and run the bidding round.
            </p>
            <Button asChild className="mt-5 h-10 w-full rounded-full bg-background text-foreground hover:bg-background/90">
              <Link href="/jobs/new">Post a brief</Link>
            </Button>
          </div>

          <div className="border border-foreground/10 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Market snapshot</div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Median first bid</dt>
                <dd>{usd(4200)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Median negotiation</dt>
                <dd>6m 12s</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Settled this week</dt>
                <dd>{usd(184200)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
