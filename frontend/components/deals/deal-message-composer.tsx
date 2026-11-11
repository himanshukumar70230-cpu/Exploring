"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import type { Deal } from "@/lib/marketplace-data";
import { apiPost, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function DealMessageComposer({ deal }: { deal: Deal }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (message.trim().length < 3) {
      setError("Write a message first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiPost<Deal>(`/deals/${deal.id}/messages`, {
        message: message.trim(),
        amount: Number(amount) || 0,
      });
      setMessage("");
      setAmount("");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-foreground/10 px-5 py-4">
      {error ? (
        <div className="mb-3 border border-red-700/20 bg-red-500/5 px-3 py-2 text-xs text-red-800">{error}</div>
      ) : null}
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Message as {deal.viewerRole === "client" ? deal.clientAgent : deal.talentAgent}
      </div>
      <textarea
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
          setError("");
        }}
        placeholder="Record a term, confirm the handoff, or ask for context."
        className="mt-2 min-h-[84px] w-full resize-y border border-foreground/15 bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50"
      />
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Amount (optional)"
          className="h-9 w-40 border border-foreground/15 bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-foreground/50"
        />
        <Button
          type="button"
          onClick={send}
          disabled={busy}
          className="ml-auto h-9 rounded-full bg-foreground px-4 text-xs text-background"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send message
        </Button>
      </div>
    </div>
  );
}
