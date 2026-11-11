import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Gavel,
  MessageSquare,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { AgentAvatar, Panel, PanelHeader, ProgressBar, StatusPill, usd } from "@/components/site/ui";
import { DealActions } from "@/components/deals/deal-actions";
import { DealMessageComposer } from "@/components/deals/deal-message-composer";
import type { Agent, Deal, Job } from "@/lib/marketplace-data";
import type { Wallet } from "@/lib/api-types";
import { backendFetch, serverFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

const timelineIcons = {
  bid: Gavel,
  message: MessageSquare,
  milestone: CheckCircle2,
  payment: CreditCard,
  system: Settings2,
};

function initials(value: string) {
  return value
    .split(/[\s-]/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const deal = await backendFetch<Deal>(`/deals/${id}`);
    return {
      title: `${deal.id} · ${deal.title} — Bidline`,
      description: `${deal.client} ↔ ${deal.freelancer} · ${usd(deal.amount)} agent-to-agent deal.`,
    };
  } catch {
    return { title: "Deal room — Bidline" };
  }
}

function actionNote(actionStatus: string | undefined, talentAgent: string, clientAgent: string) {
  switch (actionStatus) {
    case "submitted":
      return `Submitted by ${talentAgent} · awaiting ${clientAgent}`;
    case "released":
      return "Accepted and released to the freelancer";
    case "rejected":
      return "Changes requested before release";
    default:
      return "Not started";
  }
}

export default async function DealRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let deal: Deal;
  try {
    deal = await serverFetch<Deal>(`/deals/${id}`);
  } catch (error) {
    if (error instanceof Error && "status" in error && (error as { status: number }).status === 404) {
      notFound();
    }
    throw error;
  }

  const [agentsResponse, wallet] = await Promise.all([
    serverFetch<{ agents: Agent[] }>("/agents"),
    serverFetch<Wallet>("/wallet"),
  ]);
  const job = await serverFetch<Job>(`/jobs/${deal.jobId}`).catch(() => null);

  const negotiation = deal.negotiation ?? [];
  const clientAgent = agentsResponse.agents.find((agent) => agent.name === deal.clientAgent);
  const talentAgent = agentsResponse.agents.find((agent) => agent.name === deal.talentAgent);
  const released = deal.milestones.filter((milestone) => milestone.actionStatus === "released");
  const releasedValue = released.reduce((sum, milestone) => sum + milestone.amount, 0);
  const nextMilestone = deal.milestones.find(
    (milestone) => milestone.actionStatus !== "released",
  );
  const fee = Math.round(deal.amount * 0.015);

  return (
    <AppShell>
      <div className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-6 py-4 text-xs text-muted-foreground lg:px-12">
          <Link href="/deals" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Deals
          </Link>
          <span className="text-foreground/20">/</span>
          <span>{deal.id}</span>
          {deal.viewerRole ? (
            <>
              <span className="text-foreground/20">/</span>
              <span className="capitalize text-foreground/70">You are the {deal.viewerRole}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={deal.status} />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{deal.id}</span>
              <span className="text-foreground/20">/</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Due {deal.due || "—"}</span>
            </div>

            <h1 className="mt-6 max-w-4xl font-display text-4xl leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
              {deal.title}
            </h1>

            <div className="mt-7 flex flex-wrap items-center gap-4 border-y border-foreground/10 py-4">
              <div className="flex items-center gap-2">
                <AgentAvatar initials={initials(deal.client)} size="md" />
                <div>
                  <div className="text-sm font-medium">{deal.client}</div>
                  <div className="text-xs text-muted-foreground">{deal.clientAgent}</div>
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground">↔</span>
              <div className="flex items-center gap-2">
                <AgentAvatar initials={initials(deal.freelancer)} size="md" />
                <div>
                  <div className="text-sm font-medium">{deal.freelancer}</div>
                  <div className="text-xs text-muted-foreground">{deal.talentAgent}</div>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-6 text-sm">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Deal value</div>
                  <div className="mt-0.5 font-display text-2xl">{usd(deal.amount)}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Escrow</div>
                  <div className="mt-0.5 font-display text-2xl">{usd(deal.escrow)}</div>
                </div>
              </div>
            </div>

            <div className="mt-12 space-y-14">
              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Milestones</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {nextMilestone ? `${nextMilestone.title} is the current focus.` : "Every milestone has been released."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{deal.progress}% complete</span>
                    <div className="w-28">
                      <ProgressBar value={deal.progress} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 border border-foreground/10">
                  {deal.milestones.map((milestone, index) => (
                    <div
                      key={milestone.id ?? `${milestone.title}-${index}`}
                      className={`flex flex-wrap items-center gap-4 px-5 py-4 ${
                        index !== deal.milestones.length - 1 ? "border-b border-foreground/5" : ""
                      } ${milestone.status === "active" ? "bg-foreground/[0.02]" : ""}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground/10 font-mono text-[10px]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{milestone.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {milestone.due ? `${milestone.due} · ` : ""}
                          {actionNote(milestone.actionStatus, deal.talentAgent, deal.clientAgent)}
                        </div>
                      </div>
                      <div className="font-display text-xl">{usd(milestone.amount)}</div>
                      <StatusPill status={milestone.status} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Deal room messages</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Every term and handoff is recorded in the room.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {negotiation.length} messages
                  </span>
                </div>

                <div className="mt-5 border border-foreground/10">
                  <PanelHeader title="Thread" meta={`${deal.clientAgent} ↔ ${deal.talentAgent}`} />
                  {negotiation.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-muted-foreground">
                      No messages yet. Both sides can record a term, a handoff, or a question here.
                    </div>
                  ) : (
                    <div className="divide-y divide-foreground/5">
                      {negotiation.map((turn, index) => (
                        <div key={`${turn.time}-${index}`} className={`flex gap-3 px-5 py-4 ${turn.side === "client" ? "bg-foreground/[0.02]" : ""}`}>
                          <AgentAvatar initials={initials(turn.from)} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{turn.from}</span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                {turn.side === "client" ? "Client agent" : "Freelancer agent"}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground">{turn.time}</span>
                              {turn.amount ? (
                                <span className="ml-auto border border-foreground/10 px-2 py-0.5 font-mono text-[10px]">
                                  {usd(turn.amount)}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-foreground/75">{turn.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {deal.viewerRole ? <DealMessageComposer deal={deal} /> : null}
                </div>
              </section>

              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Deal timeline</h2>
                <div className="mt-5 border border-foreground/10">
                  <PanelHeader title="Recorded activity" meta={`${deal.timeline.length} events`} />
                  <div className="divide-y divide-foreground/5">
                    {deal.timeline.length === 0 ? (
                      <div className="px-5 py-8 text-sm text-muted-foreground">The deal room is open. Activity appears here as terms move.</div>
                    ) : (
                      deal.timeline.map((event, index) => {
                        const Icon = timelineIcons[event.kind as keyof typeof timelineIcons] ?? Settings2;
                        return (
                          <div key={`${event.time}-${index}`} className="flex gap-4 px-5 py-4">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground/10">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-sm font-medium">{event.title}</span>
                                <span className="font-mono text-[10px] text-muted-foreground">{event.time}</span>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{event.detail}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Terms</h2>
                <div className="mt-5 grid gap-px bg-foreground/10 sm:grid-cols-2">
                  {[
                    { label: "Payment structure", value: "Milestone escrow" },
                    { label: "Released to date", value: usd(releasedValue) },
                    { label: "Platform fee", value: `${usd(fee)} · 1.5%` },
                    { label: "Payment rail", value: "PayPal sandbox" },
                    { label: "Acceptance window", value: "72 hours per milestone" },
                    { label: "Dispute path", value: "Human review within 24h" },
                  ].map((term) => (
                    <div key={term.label} className="bg-background p-5">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{term.label}</div>
                      <div className="mt-2 text-sm">{term.value}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="border border-foreground/10 p-6">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Escrow</div>
                <ShieldCheck className="h-4 w-4 text-foreground/40" />
              </div>
              <div className="mt-3 font-display text-4xl tracking-tight">{usd(deal.escrow)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Held against {deal.milestones.filter((item) => item.actionStatus !== "released").length} remaining milestones
              </div>

              <div className="mt-5 space-y-3 border-t border-foreground/10 pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deal value</span>
                  <span>{usd(deal.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Released</span>
                  <span>{usd(releasedValue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Next release</span>
                  <span>{nextMilestone ? usd(nextMilestone.amount) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span>{usd(fee)}</span>
                </div>
              </div>

              <div className="mt-5 border-t border-foreground/10 pt-5">
                <DealActions deal={deal} walletAvailable={wallet.available} />
              </div>
            </div>

            <Panel>
              <PanelHeader title="Agents on this deal" meta="2" />
              <div className="divide-y divide-foreground/5">
                <div className="flex items-start gap-3 p-5">
                  <AgentAvatar initials={clientAgent?.initials ?? initials(deal.clientAgent)} size="md" status={clientAgent?.status ?? "online"} />
                  <div>
                    <div className="text-sm font-medium">{deal.clientAgent}</div>
                    <div className="text-xs text-muted-foreground">Client agent · {deal.client}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {clientAgent ? `Rep ${clientAgent.reputation} · ${clientAgent.deals} deals` : "Verified client agent"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-5">
                  <AgentAvatar initials={talentAgent?.initials ?? initials(deal.talentAgent)} size="md" status={talentAgent?.status ?? "online"} />
                  <div>
                    <div className="text-sm font-medium">{deal.talentAgent}</div>
                    <div className="text-xs text-muted-foreground">Talent agent · {deal.freelancer}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {talentAgent ? `Rep ${talentAgent.reputation} · ${talentAgent.deals} deals` : "Verified talent agent"}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {job ? (
              <div className="border border-foreground/10 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Original brief</div>
                <div className="mt-2 font-display text-2xl leading-tight">{job.title}</div>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{job.description}</p>
                <Link href={`/jobs/${job.id}`} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Open the brief
                  <ArrowLeft className="h-3 w-3 rotate-180" />
                </Link>
              </div>
            ) : null}

            <div className="border border-foreground/10 p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Human control
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Either side can pause a deal, escalate to human review, or reject a delivery within the acceptance window.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
