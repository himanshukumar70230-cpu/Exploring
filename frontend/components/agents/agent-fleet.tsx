"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, MapPin, Pause, Play, Plus, Star, X } from "lucide-react";
import type { Agent } from "@/lib/marketplace-data";
import type { Activity } from "@/lib/api-types";
import { apiPatch, apiPost, errorMessage } from "@/lib/api-client";
import { AgentAvatar, Panel, PanelHeader, ProgressBar, StatusPill } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

const inputClass =
  "mt-2 h-10 w-full border border-foreground/15 bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

export function AgentFleet({ agents, activity }: { agents: Agent[]; activity: Activity[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    location: "",
    skills: "",
    hourlyRate: "75",
    bio: "",
  });

  const rows = useMemo(() => {
    return agents.filter((agent) => {
      if (filter === "active") return agent.status !== "paused";
      if (filter === "paused") return agent.status === "paused";
      return true;
    });
  }, [agents, filter]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const toggle = async (agent: Agent) => {
    setBusyId(agent.id);
    setError("");
    try {
      await apiPatch(`/agents/${agent.id}`, { status: agent.status === "paused" ? "online" : "paused" });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId("");
    }
  };

  const create = async () => {
    if (!form.name.trim()) {
      setError("Give the agent a name.");
      return;
    }
    if (!form.role.trim()) {
      setError("Describe the agent's role.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiPost<Agent>("/agents", {
        name: form.name.trim(),
        role: form.role.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        skills: form.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        hourlyRate: Number(form.hourlyRate) || 0,
        status: "online",
      });
      setForm({ name: "", role: "", location: "", skills: "", hourlyRate: "75", bio: "" });
      setCreating(false);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

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
        <span className="text-xs text-muted-foreground">
          {rows.length} of {agents.length} agents
        </span>
      </div>

      {error ? (
        <div className="mt-4 border border-red-700/20 bg-red-500/5 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {rows.map((agent) => {
          const paused = agent.status === "paused";
          return (
            <div
              key={agent.id}
              className={`border border-foreground/10 p-6 transition-colors hover:border-foreground/25 ${paused ? "bg-foreground/[0.015]" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <AgentAvatar initials={agent.initials} size="lg" status={agent.status} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-3xl leading-none">{agent.name}</h2>
                      <StatusPill status={agent.status} />
                    </div>
                    <p className="mt-2 text-sm text-foreground/70">{agent.role} · {agent.owner}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {agent.location || "Remote"}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 border border-foreground/10 px-2 py-1 font-mono text-[10px]">
                  <Star className="h-3 w-3" />
                  {agent.reputation}
                </span>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{agent.bio || "No persona recorded yet."}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {agent.skills.length === 0 ? (
                  <span className="border border-foreground/10 px-2.5 py-1 text-[11px] text-muted-foreground">Generalist</span>
                ) : (
                  agent.skills.map((skill) => (
                    <span key={skill} className="border border-foreground/10 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {skill}
                    </span>
                  ))
                )}
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
                  <div className="mt-1 text-lg">{agent.rate || "—"}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Button
                  type="button"
                  variant={paused ? "default" : "outline"}
                  className={`h-9 flex-1 rounded-full text-xs ${paused ? "bg-foreground text-background" : ""}`}
                  disabled={busyId === agent.id}
                  onClick={() => toggle(agent)}
                >
                  {busyId === agent.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : paused ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                  {busyId === agent.id ? "Saving…" : paused ? "Activate agent" : "Pause agent"}
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

        {creating ? (
          <div className="border border-foreground p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl leading-none">Deploy a new agent</h2>
                <p className="mt-2 text-sm text-muted-foreground">Register a specialist that can bid and negotiate for you.</p>
              </div>
              <button type="button" onClick={() => setCreating(false)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="agent-name" className={labelClass}>Name</label>
                <input id="agent-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Ledger" className={inputClass} />
              </div>
              <div>
                <label htmlFor="agent-role" className={labelClass}>Role</label>
                <input id="agent-role" value={form.role} onChange={(event) => update("role", event.target.value)} placeholder="Finance ops agent" className={inputClass} />
              </div>
              <div>
                <label htmlFor="agent-location" className={labelClass}>Location</label>
                <input id="agent-location" value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Berlin, DE" className={inputClass} />
              </div>
              <div>
                <label htmlFor="agent-rate" className={labelClass}>Hourly rate (USD)</label>
                <input id="agent-rate" type="number" min="0" value={form.hourlyRate} onChange={(event) => update("hourlyRate", event.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="agent-skills" className={labelClass}>Skills (comma separated)</label>
              <input id="agent-skills" value={form.skills} onChange={(event) => update("skills", event.target.value)} placeholder="Reconciliation, Forecasting, SQL" className={inputClass} />
            </div>

            <div className="mt-4">
              <label htmlFor="agent-bio" className={labelClass}>Persona / operating brief</label>
              <textarea
                id="agent-bio"
                value={form.bio}
                onChange={(event) => update("bio", event.target.value)}
                placeholder="How this agent works, what it optimises for, and how it negotiates."
                className="mt-2 min-h-[88px] w-full resize-y border border-foreground/15 bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <Button type="button" onClick={create} disabled={submitting} className="h-10 flex-1 rounded-full bg-foreground text-xs text-background">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {submitting ? "Deploying…" : "Deploy agent"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={submitting} className="h-10 rounded-full px-4 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-foreground/20 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-foreground/15">
              <Plus className="h-5 w-5" />
            </span>
            <h2 className="mt-5 font-display text-3xl">Deploy another agent</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Register a specialist agent for your studio and let it bid while you focus on the work.
            </p>
            <Button
              type="button"
              onClick={() => {
                setCreating(true);
                setError("");
              }}
              className="mt-5 h-10 rounded-full bg-foreground px-5 text-xs text-background"
            >
              Register an agent
            </Button>
          </div>
        )}
      </div>

      <div className="mt-14 grid gap-10 border-t border-foreground/10 pt-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Agent operations</h2>
          <div className="mt-5 grid gap-px bg-foreground/10 sm:grid-cols-3">
            {[
              { title: "Bid within limits", text: "Every offer is checked against the brief's budget before it enters the room." },
              { title: "Negotiate in public", text: "Every offer and counter-offer is logged in the deal room, visible to both sides." },
              { title: "Get paid on proof", text: "Your agent submits milestones and collects when the client accepts." },
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
            {activity.length === 0 ? (
              <div className="px-5 py-6 text-xs text-muted-foreground">No fleet activity yet. Deploy an agent and enter a bid room.</div>
            ) : (
              activity.slice(0, 5).map((item, index) => (
                <div key={`${item.time}-${index}`} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div>
                    <div className="text-sm">
                      <span className="font-medium">{item.actor}</span> {item.action}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.time}</span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </section>
  );
}
