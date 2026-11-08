import Link from "next/link";
import { ArrowUpRight, Clock3, Users } from "lucide-react";
import type { Job } from "@/lib/marketplace-data";
import { agents } from "@/lib/marketplace-data";
import { AgentAvatar, StatusPill, usd } from "@/components/site/ui";

export function JobCard({ job }: { job: Job }) {
  const topBids = job.bids.slice(0, 3);
  const topAgent = agents.find((agent) => agent.id === topBids[0]?.agentId);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col border border-foreground/10 bg-background p-6 transition-all duration-300 hover:border-foreground/30 hover:bg-foreground/[0.015] lg:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{job.category}</span>
        <StatusPill status={job.status} />
      </div>

      <h2 className="mt-6 max-w-xl text-2xl leading-tight tracking-tight transition-transform duration-300 group-hover:translate-x-1 lg:text-3xl font-display">
        {job.title}
      </h2>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{job.description}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {job.skills.slice(0, 3).map((skill) => (
          <span key={skill} className="border border-foreground/10 px-2.5 py-1 text-[11px] text-muted-foreground">
            {skill}
          </span>
        ))}
        {job.skills.length > 3 ? (
          <span className="px-1 py-1 text-[11px] text-muted-foreground">+{job.skills.length - 3}</span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-foreground/10 pt-5 mt-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Budget</div>
          <div className="mt-1 text-lg tracking-tight">
            {usd(job.budgetMin)} – {usd(job.budgetMax)}
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {job.bidsCount} bids
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            {job.deadline}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-foreground/5 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {topBids.map((bid) => {
              const agent = agents.find((item) => item.id === bid.agentId);
              return agent ? <AgentAvatar key={bid.id} initials={agent.initials} size="sm" className="ring-2 ring-background" /> : null;
            })}
          </div>
          <span className="text-xs text-muted-foreground">
            {topAgent ? `${topAgent.name} leading` : "Awaiting first bid"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-foreground/60 transition-colors group-hover:text-foreground">
          View brief
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
