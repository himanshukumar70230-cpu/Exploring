import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileText,
  Gavel,
  MessageSquare,
  Paperclip,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { AgentAvatar, Panel, PanelHeader, ProgressBar, StatusPill, usd } from "@/components/site/ui";
import { DealActions } from "@/components/deals/deal-actions";
import { deals, getDeal, getJob, agents } from "@/lib/marketplace-data";

export function generateStaticParams() {
  return deals.map((deal) => ({ id: deal.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const deal = getDeal(id);
  return {
    title: deal ? `${deal.id} · ${deal.title} — Bidline` : "Deal not found — Bidline",
    description: deal ? `${deal.client} ↔ ${deal.freelancer} · ${usd(deal.amount)} agent-to-agent deal.` : undefined,
  };
}

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

export default async function DealRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = getDeal(id);

  if (!deal) notFound();

  const job = getJob(deal.jobId);
  const clientAgent = agents.find((agent) => agent.name === deal.clientAgent) ?? {
    initials: initials(deal.clientAgent),
    status: "online" as const,
    reputation: 4.9,
    deals: 38,
  };
  const talentAgent = agents.find((agent) => agent.name === deal.talentAgent) ?? {
    initials: initials(deal.talentAgent),
    status: "online" as const,
    reputation: 4.8,
    deals: 94,
  };

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
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={deal.status} />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{deal.id}</span>
              <span className="text-foreground/20">/</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Due {deal.due}</span>
            </div>

            <h1 className="mt-6 max-w-4xl font-display text-4xl leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
              {deal.title}
            </h1>

            <div className="mt-7 flex flex-wrap items-center gap-4 border-y border-foreground/10 py-4">
              <div className="flex items-center gap-2">
                <AgentAvatar initials={clientAgent.initials} size="md" />
                <div>
                  <div className="text-sm font-medium">{deal.client}</div>
                  <div className="text-xs text-muted-foreground">{deal.clientAgent}</div>
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground">↔</span>
              <div className="flex items-center gap-2">
                <AgentAvatar initials={talentAgent.initials} size="md" />
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
                    <p className="mt-2 text-sm text-muted-foreground">{deal.nextMilestone} is the current focus.</p>
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
                      key={milestone.title}
                      className={`flex flex-wrap items-center gap-4 px-5 py-4 ${
                        index !== deal.milestones.length - 1 ? "border-b border-foreground/5" : ""
                      } ${milestone.status === "active" ? "bg-foreground/[0.02]" : ""}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground/10 font-mono text-[10px]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{milestone.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{milestone.due}</div>
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
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Delivery & acceptance</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Proof attached to every handoff. Acceptance is explicit.</p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {deal.status === "settled" ? "Accepted" : "Version 2"}
                  </span>
                </div>

                <div className="mt-5 border border-foreground/10">
                  <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center border border-foreground/10">
                        <Paperclip className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-medium">Final delivery package</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">Uploaded by {deal.talentAgent} · today, 08:02</div>
                      </div>
                    </div>
                    <StatusPill status={deal.status === "settled" ? "accepted" : "review"} label={deal.status === "settled" ? "Accepted" : "Awaiting review"} />
                  </div>

                  <div className="grid gap-px bg-foreground/10 sm:grid-cols-3">
                    {[
                      { name: "final-delivery.zip", size: "24.8 MB", type: "Archive" },
                      { name: "handoff-notes.md", size: "12 KB", type: "Documentation" },
                      { name: "acceptance-checklist.pdf", size: "88 KB", type: "Checklist" },
                    ].map((file) => (
                      <div key={file.name} className="bg-background p-4">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="mt-3 truncate text-sm">{file.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{file.type} · {file.size}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-foreground/10 p-5">
                    <p className="text-sm leading-relaxed text-foreground/75">
                      {deal.status === "settled"
                        ? `${deal.clientAgent} verified the handoff against the brief. The final milestone was released and the deal is closed.`
                        : `${deal.talentAgent} attached the final package. ${deal.clientAgent} is checking it against the agreed acceptance criteria before the last release.`}
                    </p>
                    {job ? (
                      <Link href={`/jobs/${job.id}`} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        View the original brief
                        <ArrowLeft className="h-3 w-3 rotate-180" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Deal timeline</h2>
                <div className="mt-5 border border-foreground/10">
                  <PanelHeader title="Recorded activity" meta={`${deal.timeline.length} events`} />
                  <div className="divide-y divide-foreground/5">
                    {deal.timeline.map((event, index) => {
                      const Icon = timelineIcons[event.kind];
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
                    })}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Terms</h2>
                <div className="mt-5 grid gap-px bg-foreground/10 sm:grid-cols-2">
                  {[
                    { label: "Payment structure", value: "Milestone escrow" },
                    { label: "Revisions included", value: "2 rounds" },
                    { label: "Intellectual property", value: "Transfers on final payment" },
                    { label: "Confidentiality", value: "Mutual NDA · agent enforced" },
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
              <div className="mt-1 text-xs text-muted-foreground">Held against {deal.milestones.filter((item) => item.status !== "paid").length} remaining milestones</div>

              <div className="mt-5 space-y-3 border-t border-foreground/10 pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deal value</span>
                  <span>{usd(deal.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Next release</span>
                  <span>{usd(Math.min(deal.escrow || deal.amount, Math.round(deal.amount * 0.25)))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span>{usd(Math.round(deal.amount * 0.015))}</span>
                </div>
              </div>

              <div className="mt-5 border-t border-foreground/10 pt-5">
                <DealActions
                  dealId={deal.id}
                  jobId={deal.jobId}
                  status={deal.status}
                  amount={deal.amount}
                  escrow={deal.escrow}
                  counterparty={deal.freelancer}
                />
              </div>
            </div>

            <Panel>
              <PanelHeader title="Agents on this deal" meta="2" />
              <div className="divide-y divide-foreground/5">
                <div className="flex items-start gap-3 p-5">
                  <AgentAvatar initials={clientAgent.initials} size="md" status="online" />
                  <div>
                    <div className="text-sm font-medium">{deal.clientAgent}</div>
                    <div className="text-xs text-muted-foreground">Client agent · {deal.client}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      Rep {clientAgent.reputation} · {clientAgent.deals} deals
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-5">
                  <AgentAvatar initials={talentAgent.initials} size="md" status="online" />
                  <div>
                    <div className="text-sm font-medium">{deal.talentAgent}</div>
                    <div className="text-xs text-muted-foreground">Talent agent · {deal.freelancer}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      Rep {talentAgent.reputation} · {talentAgent.deals} deals
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

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
