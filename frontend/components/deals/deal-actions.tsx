"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, CreditCard, Loader2, RotateCcw, ShieldCheck, Wallet } from "lucide-react";
import type { Deal } from "@/lib/marketplace-data";
import type { PayPalCaptureResponse, PayPalOrderResponse } from "@/lib/api-types";
import { apiPost, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { usd } from "@/components/site/ui";

const fieldClass =
  "h-10 w-full border border-foreground/15 bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50";

export function DealActions({ deal, walletAvailable }: { deal: Deal; walletAvailable: number }) {
  const router = useRouter();
  const remaining = Math.max(0, deal.amount - deal.escrow);
  const [amount, setAmount] = useState(String(remaining));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const role = deal.viewerRole;
  const submitted = deal.milestones.filter((milestone) => milestone.actionStatus === "submitted");
  const pending = deal.milestones.filter(
    (milestone) => milestone.actionStatus === "pending" || milestone.actionStatus === "rejected",
  );
  const actionable = deal.status !== "settled" && Boolean(role);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError("");
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const fundFromWallet = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount to move into escrow.");
      return;
    }
    void run("wallet", () => apiPost(`/deals/${deal.id}/escrow`, { amount: value }));
  };

  const fundWithPayPal = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount to move into escrow.");
      return;
    }
    void run("paypal", async () => {
      const order = await apiPost<PayPalOrderResponse>(`/deals/${deal.id}/paypal/order`, { amount: value });
      if (order.mock) {
        await apiPost<PayPalCaptureResponse>(`/deals/${deal.id}/paypal/capture`, { orderId: order.orderId });
        return;
      }
      window.location.assign(order.approvalUrl);
    });
  };

  if (deal.status === "settled") {
    return (
      <div className="border border-green-700/20 bg-green-500/5 px-4 py-3 text-sm text-green-800">
        <div className="flex items-center gap-2 font-medium">
          <Check className="h-4 w-4" />
          Fully settled
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-green-800/80">
          {usd(deal.amount)} was released to {deal.freelancer}. Every milestone is closed and the deal room is immutable.
        </p>
      </div>
    );
  }

  if (!actionable) {
    return (
      <div className="border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        You are viewing this deal as an observer. Only the client and freelancer can move money or milestones.
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <div className="mb-4 border border-red-700/20 bg-red-500/5 px-3 py-2.5 text-xs leading-relaxed text-red-800">
          {error}
        </div>
      ) : null}

      {role === "client" && remaining > 0 ? (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Fund escrow</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {usd(deal.escrow)} of {usd(deal.amount)} is held. Fund the remaining {usd(remaining)} from your wallet or a
            PayPal sandbox order.
          </p>
          <div className="mt-3">
            <label htmlFor="escrow-amount" className="sr-only">
              Escrow amount
            </label>
            <input
              id="escrow-amount"
              type="number"
              min="1"
              max={remaining}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Wallet available {usd(walletAvailable)}</span>
            <button
              type="button"
              onClick={() => setAmount(String(remaining))}
              className="underline-offset-2 hover:underline"
            >
              Use full amount
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            <Button
              type="button"
              onClick={fundFromWallet}
              disabled={Boolean(busy)}
              className="h-10 rounded-full bg-foreground text-xs text-background"
            >
              {busy === "wallet" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
              {busy === "wallet" ? "Funding…" : "Fund from wallet"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={fundWithPayPal}
              disabled={Boolean(busy)}
              className="h-10 rounded-full text-xs"
            >
              {busy === "paypal" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
              {busy === "paypal" ? "Opening PayPal…" : "Pay with PayPal"}
            </Button>
          </div>
        </div>
      ) : null}

      {role === "client" && submitted.length > 0 ? (
        <div className={remaining > 0 ? "mt-5 border-t border-foreground/10 pt-5" : ""}>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Awaiting your acceptance</div>
          <div className="mt-3 space-y-3">
            {submitted.map((milestone) => (
              <div key={milestone.id ?? milestone.title} className="border border-foreground/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-medium leading-snug">{milestone.title}</div>
                  <span className="font-display text-lg">{usd(milestone.amount)}</span>
                </div>
                {rejecting === milestone.id ? (
                  <div className="mt-3">
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="What needs to change before release?"
                      className="min-h-[70px] w-full resize-y border border-foreground/15 bg-transparent px-3 py-2 text-xs leading-relaxed outline-none placeholder:text-muted-foreground/60 focus:border-foreground/50"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          milestone.id
                            ? run(`reject-${milestone.id}`, () =>
                                apiPost(`/deals/${deal.id}/milestones/${milestone.id}/reject`, {
                                  reason: reason.trim() || "Changes requested before release.",
                                }),
                              )
                            : undefined
                        }
                        disabled={Boolean(busy)}
                        className="h-8 flex-1 rounded-full text-[11px]"
                      >
                        {busy === `reject-${milestone.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        Request changes
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setRejecting(null);
                          setReason("");
                        }}
                        className="h-8 rounded-full px-3 text-[11px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        milestone.id
                          ? run(`accept-${milestone.id}`, () =>
                              apiPost(`/deals/${deal.id}/milestones/${milestone.id}/accept`),
                            )
                          : undefined
                      }
                      disabled={Boolean(busy)}
                      className="h-8 flex-1 rounded-full bg-foreground text-[11px] text-background"
                    >
                      {busy === `accept-${milestone.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Accept & release
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRejecting(milestone.id ?? milestone.title)}
                      disabled={Boolean(busy)}
                      className="h-8 rounded-full px-3 text-[11px]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Changes
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {role === "freelancer" && pending.length > 0 ? (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Submit work</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Deliverables are proven per milestone. Submitting opens the acceptance window for the client agent.
          </p>
          <div className="mt-3 space-y-2">
            {pending.map((milestone) => (
              <div key={milestone.id ?? milestone.title} className="flex items-center justify-between gap-3 border border-foreground/10 p-3">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{milestone.title}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {usd(milestone.amount)} · {milestone.actionStatus === "rejected" ? "changes requested" : "not started"}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    milestone.id
                      ? run(`submit-${milestone.id}`, () =>
                          apiPost(`/deals/${deal.id}/milestones/${milestone.id}/submit`),
                        )
                      : undefined
                  }
                  disabled={Boolean(busy)}
                  className="h-8 shrink-0 rounded-full bg-foreground px-3 text-[11px] text-background"
                >
                  {busy === `submit-${milestone.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                  Submit
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {role === "freelancer" && submitted.length > 0 ? (
        <div className="mt-4 flex items-start gap-2 border border-amber-700/20 bg-amber-500/5 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {submitted.length === 1 ? "One milestone is" : `${submitted.length} milestones are`} awaiting the client's
          acceptance. You will be paid as each one is released.
        </div>
      ) : null}

      {role === "freelancer" && pending.length === 0 && submitted.length === 0 ? (
        <div className="border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Every funded milestone is released. Nothing left to submit on this deal.
        </div>
      ) : null}

      {role === "client" && remaining === 0 && submitted.length === 0 ? (
        <div className="border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Escrow is fully funded. The next action belongs to {deal.talentAgent}: submit a milestone for your acceptance.
        </div>
      ) : null}
    </div>
  );
}
