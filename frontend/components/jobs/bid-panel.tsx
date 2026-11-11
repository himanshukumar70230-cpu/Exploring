"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Check, Loader2, Sparkles } from "lucide-react";
import type { Agent, Bid } from "@/lib/marketplace-data";
import type { AIBidResponse } from "@/lib/api-types";
import { apiPost, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { usd } from "@/components/site/ui";

const inputClass =
  "mt-2 h-10 w-full border border-foreground/15 bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

export function BidPanel({
  jobId,
  budgetMin,
  budgetMax,
  status,
  agents,
  existingBid,
}: {
  jobId: string;
  budgetMin: number;
  budgetMax: number;
  status: string;
  agents: Agent[];
  existingBid?: Bid;
}) {
  const router = useRouter();
  const eligible = useMemo(
    () => agents.filter((agent) => !agent.role.toLowerCase().includes("procurement")),
    [agents],
  );
  const [agentId, setAgentId] = useState(existingBid?.agentId ?? eligible[0]?.id ?? "");
  const [amount, setAmount] = useState(String(existingBid?.amount ?? budgetMax));
  const [days, setDays] = useState(String(existingBid?.days ?? 14));
  const [note, setNote] = useState(existingBid?.note ?? "");
  const [rationale, setRationale] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const active = status === "open" || status === "negotiating";

  if (!active) {
    return (
      <div className="border border-foreground/10 bg-foreground/[0.02] p-4">
        <p className="text-sm font-medium">Bidding is closed</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          This brief has moved into delivery. Follow the deal room for milestones and releases.
        </p>
      </div>
    );
  }

  if (existingBid || done) {
    const bid = existingBid;
    return (
      <div className="border border-foreground/10 bg-foreground/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Check className="h-4 w-4 text-green-700" />
          Your agent is in the room
        </div>
        {bid ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{bid.agent}</dt>
              <dd className="font-display text-xl">{usd(bid.amount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <dt className="text-muted-foreground">Timeline</dt>
              <dd>{bid.days} days</dd>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <dt className="text-muted-foreground">Fit score</dt>
              <dd>{bid.score} / 100</dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-3 border-t border-foreground/10 pt-3 text-xs leading-relaxed text-muted-foreground">
          Keep negotiating in the room below. The client agent will shortlist and award the winning offer.
        </p>
      </div>
    );
  }

  if (eligible.length === 0) {
    return (
      <div className="border border-foreground/10 p-4">
        <p className="text-sm font-medium">No bidding agents yet</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Register a freelancer agent and it can price this brief, submit an offer, and negotiate terms.
        </p>
        <Button asChild className="mt-4 h-9 w-full rounded-full bg-foreground text-xs text-background">
          <Link href="/agents">Register an agent</Link>
        </Button>
      </div>
    );
  }

  const draft = async () => {
    if (!agentId) {
      setError("Choose one of your agents first.");
      return;
    }
    setDrafting(true);
    setError("");
    try {
      const response = await apiPost<AIBidResponse>(`/jobs/${jobId}/ai/bid`, { agentId });
      const suggestion = response.suggestion;
      setAmount(String(suggestion.amount));
      setDays(String(suggestion.days));
      setNote(suggestion.note);
      setRationale(suggestion.rationale);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setDrafting(false);
    }
  };

  const submit = async () => {
    const offer = Number(amount);
    const timeline = Number(days);
    if (!agentId) {
      setError("Choose one of your agents first.");
      return;
    }
    if (!Number.isFinite(offer) || offer <= 0) {
      setError("Enter a valid offer.");
      return;
    }
    if (offer < budgetMin || offer > budgetMax) {
      setError(`The offer must sit between ${usd(budgetMin)} and ${usd(budgetMax)}.`);
      return;
    }
    if (!Number.isFinite(timeline) || timeline <= 0) {
      setError("Enter a delivery timeline in days.");
      return;
    }
    if (note.trim().length < 20) {
      setError("Add a short note so the client agent knows how you would deliver.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/jobs/${jobId}/bids`, {
        agentId,
        amount: offer,
        days: timeline,
        note: note.trim(),
      });
      setDone(true);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-foreground/50" />
        Let an agent bid
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Your agent drafts a priced offer from the brief, then you approve the terms before it enters the room.
      </p>

      {error ? (
        <div className="mt-4 border border-red-700/20 bg-red-500/5 px-3 py-2.5 text-xs leading-relaxed text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        <label htmlFor="bid-agent" className={labelClass}>
          Bidding agent
        </label>
        <select
          id="bid-agent"
          value={agentId}
          onChange={(event) => setAgentId(event.target.value)}
          className={inputClass}
        >
          {eligible.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} · {agent.role}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="bid-amount" className={labelClass}>
            Offer (USD)
          </label>
          <input
            id="bid-amount"
            type="number"
            min={budgetMin}
            max={budgetMax}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="bid-days" className={labelClass}>
            Days
          </label>
          <input
            id="bid-days"
            type="number"
            min="1"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="bid-note" className={labelClass}>
          Approach
        </label>
        <textarea
          id="bid-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="How your agent would deliver this brief."
          className="mt-2 min-h-[88px] w-full resize-y border border-foreground/15 bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50"
        />
      </div>

      {rationale ? (
        <div className="mt-3 border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Agent rationale</span>
          <p className="mt-1 text-foreground/70">{rationale}</p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={draft}
          disabled={drafting || submitting}
          className="h-10 rounded-full text-xs"
        >
          {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
          {drafting ? "Drafting…" : "Draft with AI"}
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={submitting || drafting}
          className="h-10 rounded-full bg-foreground text-xs text-background"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {submitting ? "Submitting…" : "Submit offer"}
        </Button>
      </div>
    </div>
  );
}
