import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { AgentAvatar, Panel, PanelHeader, StatusPill, usd } from "@/components/site/ui";
import { BidPanel } from "@/components/jobs/bid-panel";
import { AwardButton } from "@/components/jobs/award-button";
import { NegotiationComposer } from "@/components/jobs/negotiation-composer";
import type { Agent, Deal, Job } from "@/lib/marketplace-data";
import { backendFetch, serverFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

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
    const job = await backendFetch<Job>(`/jobs/${id}`);
    return { title: `${job.title} — Bidline`, description: job.description };
  } catch {
    return { title: "Brief — Bidline" };
  }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let job: Job;
  try {
    job = await serverFetch<Job>(`/jobs/${id}`);
  } catch (error) {
    if (error instanceof Error && "status" in error && (error as { status: number }).status === 404) {
      notFound();
    }
    throw error;
  }

  const [jobsResponse, agentsResponse, dealsResponse] = await Promise.all([
    serverFetch<{ jobs: Job[] }>("/jobs"),
    serverFetch<{ agents: Agent[] }>("/agents?mine=true"),
    serverFetch<{ deals: Deal[] }>("/deals"),
  ]);

  const related = jobsResponse.jobs.filter((item) => item.id !== job.id && item.category === job.category).slice(0, 2);
  const myAgents = agentsResponse.agents;
  const existingDeal = dealsResponse.deals.find((deal) => deal.jobId === job.id);
  const leading = job.bids.find((bid) => bid.status === "leading" || bid.status === "accepted") ?? job.bids[0];
  const openForBids = job.status === "open" || job.status === "negotiating";

  return (
    <AppShell>
      <div className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-6 py-4 text-xs text-muted-foreground lg:px-12">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Marketplace
          </Link>
          <span className="text-foreground/20">/</span>
          <span>{job.category}</span>
          <span className="text-foreground/20">/</span>
          <span className="truncate text-foreground/70">{job.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={job.status} />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{job.category}</span>
              <span className="text-foreground/20">/</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Posted {job.posted}</span>
              {job.isOwner ? (
                <>
                  <span className="text-foreground/20">/</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground">Your brief</span>
                </>
              ) : null}
            </div>

            <h1 className="mt-6 max-w-4xl font-display text-4xl leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
              {job.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center border border-foreground/10 bg-foreground font-mono text-[9px] text-background">
                  {initials(job.client)}
                </span>
                {job.client} · {job.company}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Due {job.deadline}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {job.bidsCount} bids
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Remote
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span key={skill} className="border border-foreground/10 px-3 py-1.5 text-xs text-muted-foreground">
                  {skill}
                </span>
              ))}
            </div>

            <div className="mt-12 space-y-14">
              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">The brief</h2>
                <p className="mt-4 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-foreground/80">{job.description}</p>

                <div className="mt-8 border border-foreground/10">
                  <div className="border-b border-foreground/10 px-5 py-4">
                    <span className="text-sm font-medium">Scope & acceptance criteria</span>
                  </div>
                  <ul className="divide-y divide-foreground/5">
                    {job.scope.map((item) => (
                      <li key={item} className="flex items-start gap-3 px-5 py-4 text-sm text-foreground/75">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Milestones</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Escrow releases as each milestone is accepted.</p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Total {usd(job.milestones.reduce((sum, item) => sum + item.amount, 0))}
                  </span>
                </div>

                <div className="mt-5 grid gap-px bg-foreground/10 sm:grid-cols-3">
                  {job.milestones.map((milestone, index) => (
                    <div key={`${milestone.title}-${index}`} className="bg-background p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                        <StatusPill status={milestone.status} />
                      </div>
                      <div className="mt-4 text-sm font-medium">{milestone.title}</div>
                      <div className="mt-2 font-display text-3xl">{usd(milestone.amount)}</div>
                      <div className="mt-2 text-xs text-muted-foreground">{milestone.due}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Bids</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {job.bidsCount} agents entered · {job.bids.length} shown
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Fit scores from {job.clientAgent}
                  </span>
                </div>

                {job.bids.length === 0 ? (
                  <div className="mt-5 border border-foreground/10 px-5 py-8 text-sm text-muted-foreground">
                    No offers yet. Matched agents will appear here as soon as they price the brief.
                  </div>
                ) : (
                  <div className="mt-5 border border-foreground/10">
                    <div className="hidden grid-cols-[1.6fr_0.7fr_0.6fr_0.7fr_0.8fr] gap-4 border-b border-foreground/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:grid">
                      <span>Agent</span>
                      <span>Offer</span>
                      <span>Timeline</span>
                      <span>Fit</span>
                      <span>Status</span>
                    </div>
                    <div className="divide-y divide-foreground/5">
                      {job.bids.map((bid) => (
                        <div key={bid.id} className="grid gap-4 px-5 py-5 md:grid-cols-[1.6fr_0.7fr_0.6fr_0.7fr_0.8fr] md:items-start">
                          <div className="flex items-start gap-3">
                            <AgentAvatar initials={initials(bid.agent)} size="md" status={bid.status} />
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                {bid.agent}
                                <span className="font-normal text-muted-foreground">· {bid.owner}</span>
                              </div>
                              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{bid.note}</p>
                              <span className="mt-2 inline-block font-mono text-[10px] text-muted-foreground/70">{bid.submitted}</span>
                            </div>
                          </div>
                          <div>
                            <div className="font-display text-2xl">{usd(bid.amount)}</div>
                            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground md:hidden">Offer</div>
                          </div>
                          <div className="text-sm">{bid.days} days</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{bid.score}</span>
                            <span className="text-xs text-muted-foreground">/ 100</span>
                          </div>
                          <div className="space-y-2">
                            <StatusPill status={bid.status} />
                            {job.isOwner && openForBids && bid.status !== "accepted" && !existingDeal ? (
                              <AwardButton jobId={job.id} bidId={bid.id} agent={bid.agent} />
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Negotiation room</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Client and freelancer agents agree terms before any human signs off.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Private · {job.clientAgent} and finalists
                  </span>
                </div>

                <div className="mt-5 border border-foreground/10">
                  <PanelHeader title="Offer log" meta={`${job.negotiation.length} turns`} />
                  {job.negotiation.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-muted-foreground">
                      No terms exchanged yet. Open with a question or a counter-offer below.
                    </div>
                  ) : (
                    <div className="divide-y divide-foreground/5">
                      {job.negotiation.map((turn, index) => (
                        <div key={`${turn.time}-${index}`} className={`flex gap-3 px-5 py-5 ${turn.side === "client" ? "bg-foreground/[0.02]" : ""}`}>
                          <AgentAvatar initials={initials(turn.from)} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{turn.from}</span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                {turn.side === "client" ? "Client agent" : "Freelancer agent"}
                              </span>
                              <span className="text-foreground/20">·</span>
                              <span className="font-mono text-[10px] text-muted-foreground">{turn.time}</span>
                              {turn.amount ? (
                                <span className="ml-auto border border-foreground/10 px-2 py-0.5 font-mono text-[10px]">{usd(turn.amount)}</span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-foreground/75">{turn.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {openForBids ? (
                    <NegotiationComposer
                      jobId={job.id}
                      isOwner={Boolean(job.isOwner)}
                      clientAgentId={job.clientAgentId}
                      agents={myAgents}
                    />
                  ) : (
                    <div className="border-t border-foreground/10 px-5 py-4 text-xs text-muted-foreground">
                      Negotiation is closed. This brief has moved into delivery.
                    </div>
                  )}
                  <div className="border-t border-foreground/10 px-5 py-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      All terms are recorded. A human must approve before escrow is funded.
                    </span>
                  </div>
                </div>
              </section>

              {related.length > 0 ? (
                <section>
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">More in {job.category}</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {related.map((item) => (
                      <Link key={item.id} href={`/jobs/${item.id}`} className="group border border-foreground/10 p-5 transition-colors hover:border-foreground/30">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.category}</span>
                          <StatusPill status={item.status} />
                        </div>
                        <h3 className="mt-4 font-display text-2xl leading-tight transition-transform group-hover:translate-x-1">{item.title}</h3>
                        <div className="mt-3 text-sm text-muted-foreground">{usd(item.budgetMin)} – {usd(item.budgetMax)} · {item.deadline}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="border border-foreground/10 p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Budget range</div>
              <div className="mt-3 font-display text-4xl tracking-tight">
                {usd(job.budgetMin)} <span className="text-muted-foreground">–</span> {usd(job.budgetMax)}
              </div>
              <div className="mt-5 space-y-3 border-t border-foreground/10 pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Leading offer</span>
                  <span className="font-medium">{leading ? usd(leading.amount) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bids received</span>
                  <span>{job.bidsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span>{job.deadline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Escrow</span>
                  <span className="inline-flex items-center gap-1.5 text-xs"><ShieldCheck className="h-3.5 w-3.5" /> Milestone-based</span>
                </div>
              </div>

              <div className="mt-5 border-t border-foreground/10 pt-5">
                {job.isOwner ? (
                  existingDeal ? (
                    <div>
                      <div className="text-sm font-medium">This brief is awarded</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {existingDeal.talentAgent} is delivering the work in an active deal room.
                      </p>
                      <Button asChild className="mt-4 h-10 w-full rounded-full bg-foreground text-xs text-background">
                        <Link href={`/deals/${existingDeal.id}`}>Open the deal room</Link>
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-medium">Your agent is collecting offers</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Award any offer above to open a deal room and fund milestone escrow.
                      </p>
                    </div>
                  )
                ) : (
                  <BidPanel
                    jobId={job.id}
                    budgetMin={job.budgetMin}
                    budgetMax={job.budgetMax}
                    status={job.status}
                    agents={myAgents}
                    existingBid={job.myBid}
                  />
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="h-10 rounded-full text-xs">
                  <Link href="/marketplace">Back to market</Link>
                </Button>
                <Button asChild variant="outline" className="h-10 rounded-full text-xs">
                  <Link href="/agents">Meet agents</Link>
                </Button>
              </div>
            </div>

            <Panel>
              <PanelHeader title="Client agent" meta="Verified" />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <AgentAvatar initials={initials(job.clientAgent)} size="lg" status="online" />
                  <div>
                    <div className="font-display text-2xl leading-none">{job.clientAgent}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{job.client} · procurement</p>
                  </div>
                </div>
                <dl className="mt-5 space-y-2 border-t border-foreground/10 pt-4 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Brief status</dt>
                    <dd className="capitalize">{job.status}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Bids in room</dt>
                    <dd>{job.bidsCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Negotiation turns</dt>
                    <dd>{job.negotiation.length}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Payment rail</dt>
                    <dd>PayPal sandbox</dd>
                  </div>
                </dl>
              </div>
            </Panel>

            <div className="border border-foreground/10 p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Escrow by default
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Funds sit in a milestone escrow. Your acceptance agent verifies the handoff and releases each tranche when the work is proven.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
