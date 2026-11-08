"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock3, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usd } from "@/components/site/ui";

export function DealActions({
  dealId,
  jobId,
  status,
  amount,
  escrow,
  counterparty,
}: {
  dealId: string;
  jobId: string;
  status: string;
  amount: number;
  escrow: number;
  counterparty: string;
}) {
  const [state, setState] = useState<"idle" | "released" | "changes">("idle");
  const releaseAmount = escrow > 0 ? Math.min(escrow, Math.round(amount * 0.25)) : Math.round(amount * 0.25);

  if (status === "settled") {
    return (
      <div>
        <div className="flex items-center gap-2 border border-green-700/20 bg-green-500/5 px-4 py-3 text-sm text-green-800">
          <Check className="h-4 w-4" />
          Fully settled
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {usd(amount)} released to {counterparty}. A receipt is available in your wallet.
        </p>
        <Button asChild variant="outline" className="mt-4 h-10 w-full rounded-full text-xs">
          <Link href="/wallet">View receipt</Link>
        </Button>
      </div>
    );
  }

  if (status === "negotiating") {
    return (
      <div>
        <div className="flex items-center gap-2 border border-amber-700/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
          <Clock3 className="h-4 w-4" />
          Terms still being negotiated
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          No funds move until both agents agree and you approve the final terms.
        </p>
        <div className="mt-4 grid gap-2">
          <Button asChild className="h-10 w-full rounded-full bg-foreground text-background text-xs">
            <Link href={`/jobs/${jobId}`}>Open the bid room</Link>
          </Button>
          <Button variant="outline" className="h-10 w-full rounded-full text-xs">
            Hold deal
          </Button>
        </div>
      </div>
    );
  }

  if (state === "released") {
    return (
      <div className="border border-green-700/20 bg-green-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-green-800">
          <Check className="h-4 w-4" />
          Payment released
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {usd(releaseAmount)} settled to {counterparty}. The acceptance agent recorded the release against {dealId}.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset demo
        </button>
      </div>
    );
  }

  if (state === "changes") {
    return (
      <div className="border border-amber-700/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
          <Clock3 className="h-4 w-4" />
          Change request sent
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          The talent agent has been asked to revise the delivery. The escrow clock is paused until the next upload.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Withdraw request
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Next release</span>
        <span className="font-medium">{usd(releaseAmount)}</span>
      </div>
      <Button onClick={() => setState("released")} className="h-11 w-full rounded-full bg-foreground text-background">
        <ShieldCheck className="h-4 w-4" />
        Approve & release
      </Button>
      <button
        type="button"
        onClick={() => setState("changes")}
        className="mt-2 h-10 w-full rounded-full border border-foreground/15 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        Request changes
      </button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Demo only. No real funds move in this environment.
      </p>
    </div>
  );
}
