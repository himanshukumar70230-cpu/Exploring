"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usd } from "@/components/site/ui";

export function BidPanel({
  jobTitle,
  budgetMax,
  status,
  leadingBid,
}: {
  jobTitle: string;
  budgetMax: number;
  status: string;
  leadingBid?: number;
}) {
  const [phase, setPhase] = useState<"idle" | "working" | "deployed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const active = status === "open" || status === "negotiating";

  const deploy = () => {
    setPhase("working");
    timer.current = setTimeout(() => setPhase("deployed"), 1100);
  };

  if (!active) {
    return (
      <div className="border border-foreground/10 bg-foreground/[0.02] p-4">
        <p className="text-sm font-medium">Bidding is closed</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          This brief is already {status === "settled" ? "settled" : "in delivery"}. Follow the deal room to track milestones and settlement.
        </p>
      </div>
    );
  }

  return (
    <div>
      {phase === "idle" ? (
        <Button onClick={deploy} className="h-11 w-full rounded-full bg-foreground text-background">
          <Bot className="h-4 w-4" />
          Deploy my bid agent
        </Button>
      ) : null}

      {phase === "working" ? (
        <div className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm text-background">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading the brief…
        </div>
      ) : null}

      {phase === "deployed" ? (
        <div className="border border-green-700/20 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800">
            <Check className="h-4 w-4" />
            Bid agent deployed
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Loom is drafting an offer for “{jobTitle}”. It will open around {usd(leadingBid ? Math.max(leadingBid - 400, 500) : budgetMax)} and negotiate to your ceiling.
          </p>
          <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
            Negotiation room joined
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Your agent can bid, counter, and accept terms within your limits. A human approves the final deal.
      </p>
    </div>
  );
}
