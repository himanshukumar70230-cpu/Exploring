"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { Agent } from "@/lib/marketplace-data";
import type { AINegotiationResponse } from "@/lib/api-types";
import { apiPost, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

const fieldClass =
  "w-full border border-foreground/15 bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50";

export function NegotiationComposer({
  jobId,
  isOwner,
  clientAgentId,
  agents,
}: {
  jobId: string;
  isOwner: boolean;
  clientAgentId?: string;
  agents: Agent[];
}) {
  const router = useRouter();
  const eligible = useMemo(
    () => agents.filter((agent) => !agent.role.toLowerCase().includes("procurement")),
    [agents],
  );
  const fallbackAgent = useMemo(
    () =>
      agents.find((agent) => agent.id === clientAgentId) ??
      agents.find((agent) => agent.role.toLowerCase().includes("procurement")) ??
      agents[0],
    [agents, clientAgentId],
  );
  const [agentId, setAgentId] = useState(isOwner ? fallbackAgent?.id ?? "" : eligible[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");

  const choices = isOwner ? (fallbackAgent ? [fallbackAgent] : []) : eligible;

  if (choices.length === 0) {
    return (
      <div className="border-t border-foreground/10 px-5 py-4 text-xs text-muted-foreground">
        {isOwner
          ? "Add a procurement agent to negotiate on your behalf."
          : "Register a freelancer agent to join the negotiation."}
      </div>
    );
  }

  const suggest = async () => {
    if (!agentId) return;
    setDrafting(true);
    setError("");
    try {
      const response = await apiPost<AINegotiationResponse>(`/jobs/${jobId}/ai/negotiate`, {
        agentId,
        lastMessage: message.trim(),
        amount: Number(amount) || 0,
      });
      setMessage(response.suggestion.message);
      if (response.suggestion.amount > 0) {
        setAmount(String(response.suggestion.amount));
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setDrafting(false);
    }
  };

  const send = async () => {
    if (message.trim().length < 5) {
      setError("Write a term or counter-offer first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiPost(`/jobs/${jobId}/negotiation`, {
        agentId,
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Replying as
        </span>
        {choices.length > 1 ? (
          <select
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="h-8 border border-foreground/15 bg-transparent px-2 text-xs outline-none focus:border-foreground/50"
          >
            {choices.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs font-medium">{choices[0]?.name}</span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {isOwner ? "client side" : "talent side"}
        </span>
      </div>

      <textarea
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
          setError("");
        }}
        placeholder={isOwner ? "Set the term, ask for a revision, or confirm the scope." : "Counter the offer or clarify how you would deliver."}
        className={`${fieldClass} mt-3 min-h-[84px] resize-y leading-relaxed`}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
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
          variant="outline"
          onClick={suggest}
          disabled={drafting || busy}
          className="h-9 rounded-full px-3 text-xs"
        >
          {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {drafting ? "Thinking…" : "Suggest reply"}
        </Button>
        <Button
          type="button"
          onClick={send}
          disabled={busy || drafting}
          className="ml-auto h-9 rounded-full bg-foreground px-4 text-xs text-background"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send
        </Button>
      </div>
    </div>
  );
}
