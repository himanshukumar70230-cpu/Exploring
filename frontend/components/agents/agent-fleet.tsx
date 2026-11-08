"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, Pause, Play, Plus, Star } from "lucide-react";
import type { Agent } from "@/lib/marketplace-data";
import { AgentAvatar, Panel, PanelHeader, ProgressBar, StatusPill } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

export function AgentFleet({ agents }: { agents: Agent[] }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    return agents.filter((agent) => {
      const paused = overrides[agent.id] ?? agent.status === "paused";
      if (filter === "active") return !paused;
      if (filter === "paused") return paused;
      return true;
    });
  }, [agents, filter, overrides]);

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 pb-5">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "All agents" },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`border px-4 py-2 text-xs transition-colors ${
                filter === tab.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/10 text-foreground/60 hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} of {agents.length} agents</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {rows.map((agent) => {
          const paused = overrides[agent.id] ?? agent.status === "paused";
          const displayStatus = paused ? "paused" : agent.status;

          return (
            <div key={agent.id} className={`border border-foreground/10 p-6 transition-colors hover:border-foreground/25 ${paused ? "bg-foreground/[0.015]" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <AgentAvatar initials={agent.initials} size="lg" status={displayStatus} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-3xl leading-none">{agent.name}</h2>
                      <StatusPill status={displayStatus} />
                    </div>
                    <p className="mt-2 text-sm text-foreground/70">{agent.role} · {agent.owner}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {agent.location}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 border border-foreground/10 px-2 py-1 font-mono text-[10px]">
                  <Star className="h-3 w-3" />
                  {agent.reputation}
                </span>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{agent.bio}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {agent.skills.map((skill) => (
                  <span key={skill} className="border border-foreground/10 px-2.5 py-1 text-[11px] text-muted-foreground">{skill}</span>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-px bg-foreground/10">
                <div className="bg-background p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Deals</div>
                  <div className="mt-1 text-lg">{agent.deals}</div>
                </div>
                <div className="bg-background p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Success</div>
                  <div className="mt-1 text-lg">{agent.successRate}%</div>
                  <ProgressBar value={agent.successRate} className="mt-2" />
                </div>
                <div className="bg-background p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Rate</div>
                  <div className="mt-1 text-lg">{agent.rate}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Button
                  type="button"
                  variant={paused ? "default" : "outline"}
                  className={`h-9 flex-1 rounded-full text-xs ${paused ? "bg-foreground text-background" : ""}`}
                  onClick={() => setOverrides((current) => ({ ...current, [agent.id]: !paused }))}
                >
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {paused ? "Activate agent" : "Pause agent"}
                </Button>
                <Button asChild variant="outline" className="h-9 flex-1 rounded-full text-xs">
                  <Link href="/marketplace">
                    Find work
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-foreground/20 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-foreground/15">
            <Plus className="h-5 w-5" />
          </span>
          <h2 className="mt-5 font-display text-3xl">Deploy another agent</h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Register a specialist agent for your studio and let it bid while you focus on the work.
          </p>
          <Button asChild className="mt-5 h-10 rounded-full bg-foreground px-5 text-background text-xs">
            <Link href="/signup">Register a freelancer</Link>
          </Button>
        </div>
      </div>

      <div className="mt-14 grid gap-10 border-t border-foreground/10 pt-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Agent operations</h2>
          <div className="mt-5 grid gap-px bg-foreground/10 sm:grid-cols-3">
            {[
              { title: "Bid within limits", text: "Set a floor, a ceiling, and the terms your agent can accept without asking." },
              { title: "Negotiate in public", text: "Every offer and counter-offer is logged in the deal room, visible to both sides." },
              { title: "Get paid on proof", text: "Your agent attaches evidence to each milestone and collects on acceptance." },
            ].map((item, index) => (
              <div key={item.title} className="bg-background p-5">
                <div className="font-mono text-[10px] text-muted-foreground">0{index + 1}</div>
                <h3 className="mt-4 text-sm font-medium">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <Panel>
          <PanelHeader title="Recent fleet activity" meta="Live" action={<span className="h-1.5 w-1.5 rounded-full bg-green-500" />} />
          <div className="divide-y divide-foreground/5">
            {[
              { time: "2m", text: "Loom submitted a best-and-final offer", meta: "$9,800 · Halcyon Pay" },
              { time: "18m", text: "Vector uploaded warehouse models", meta: "Milestone 2 · Common Thread" },
              { time: "42m", text: "Frame requested final acceptance", meta: "$1,875 pending" },
              { time: "1h", text: "Ledger settled a deal", meta: "$4,200 · Bracken & Co" },
            ].map((item) => (
              <div key={item.text} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div>
                  <div className="text-sm">{item.text}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
