"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  Receipt,
  RotateCcw,
  Wallet as WalletIcon,
} from "lucide-react";
import type { Deal, Transaction } from "@/lib/marketplace-data";
import type { Wallet } from "@/lib/api-types";
import { apiPost, errorMessage } from "@/lib/api-client";
import { Panel, PanelHeader, StatusPill, usd } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

const typeIcons: Record<string, typeof Lock> = {
  escrow: Lock,
  release: ArrowUpRight,
  payout: ArrowDownLeft,
  deposit: ArrowDownLeft,
  withdrawal: Landmark,
  fee: Receipt,
  refund: RotateCcw,
};

const filters = [
  { value: "all", label: "All activity" },
  { value: "escrow", label: "Escrow" },
  { value: "release", label: "Releases" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "fee", label: "Fees" },
];

export function WalletView({ wallet, deals }: { wallet: Wallet; deals: Deal[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [withdrawing, setWithdrawing] = useState(false);
  const [amount, setAmount] = useState(String(wallet.available > 0 ? wallet.available : ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const filtered = useMemo(
    () => (filter === "all" ? wallet.transactions : wallet.transactions.filter((item) => item.type === filter)),
    [wallet.transactions, filter],
  );

  const upcoming = useMemo(() => {
    return deals
      .filter((deal) => deal.status !== "settled")
      .flatMap((deal) =>
        deal.milestones
          .filter((milestone) => milestone.actionStatus !== "released")
          .map((milestone) => ({
            label: `${deal.title} · ${milestone.title}`,
            amount: milestone.amount,
            when: milestone.due || deal.due || "Open",
            status: milestone.status,
          })),
      )
      .slice(0, 3);
  }, [deals]);

  const withdraw = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount to withdraw.");
      return;
    }
    if (value > wallet.available) {
      setError("The withdrawal is larger than your available balance.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiPost<Wallet>("/wallet/withdraw", { amount: value, rail: "PayPal" });
      setDone(`Withdrawal of ${usd(value)} sent to your PayPal sandbox account.`);
      setWithdrawing(false);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-foreground/10 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Available balance</div>
                  <div className="mt-3 font-display text-5xl tracking-tight">{usd(wallet.available)}</div>
                </div>
                <WalletIcon className="h-5 w-5 text-foreground/40" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setWithdrawing(true);
                    setDone("");
                    setError("");
                    setAmount(wallet.available > 0 ? String(wallet.available) : "");
                  }}
                  disabled={wallet.available <= 0}
                  className="h-10 rounded-full bg-foreground px-5 text-xs text-background"
                >
                  Withdraw funds
                </Button>
                <Button asChild variant="outline" className="h-10 rounded-full px-5 text-xs">
                  <Link href="/deals">Fund escrow</Link>
                </Button>
              </div>

              {done ? (
                <div className="mt-5 flex items-center gap-2 border-t border-foreground/10 pt-5 text-sm text-green-800">
                  <Check className="h-4 w-4" />
                  {done}
                </div>
              ) : null}

              {withdrawing ? (
                <div className="mt-5 border-t border-foreground/10 pt-5">
                  {error ? (
                    <div className="mb-3 border border-red-700/20 bg-red-500/5 px-3 py-2 text-xs text-red-800">{error}</div>
                  ) : null}
                  <label htmlFor="withdraw-amount" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Amount to withdraw
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="withdraw-amount"
                      type="number"
                      min="1"
                      max={wallet.available}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="h-10 min-w-0 flex-1 border border-foreground/15 bg-transparent px-3 text-sm outline-none focus:border-foreground/40"
                    />
                    <Button
                      onClick={withdraw}
                      disabled={busy}
                      className="h-10 rounded-full bg-foreground px-5 text-xs text-background"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {busy ? "Sending…" : "Confirm"}
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Payouts run through the configured PayPal sandbox rail.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <div className="border border-foreground/10 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">In escrow</div>
                <div className="mt-2 font-display text-3xl">{usd(wallet.inEscrow)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Held across open deal rooms</div>
              </div>
              <div className="border border-foreground/10 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pending release</div>
                <div className="mt-2 font-display text-3xl">{usd(wallet.pending)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Submitted and awaiting acceptance</div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 pb-5">
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`border px-4 py-2 text-xs transition-colors ${
                    filter === item.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/10 text-foreground/60 hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
          </div>

          <div className="mt-6 border border-foreground/10">
            <div className="hidden grid-cols-[1.6fr_1fr_0.7fr_0.7fr_0.5fr] gap-4 border-b border-foreground/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:grid">
              <span>Activity</span>
              <span>Counterparty</span>
              <span>Rail</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>
            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">
                No entries for this filter yet. Fund a deal or release a milestone to populate the ledger.
              </div>
            ) : (
              <div className="divide-y divide-foreground/5">
                {filtered.map((item: Transaction) => {
                  const Icon = typeIcons[item.type] ?? Receipt;
                  return (
                    <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.6fr_1fr_0.7fr_0.7fr_0.5fr] md:items-center md:gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground/10">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <div className="text-sm">{item.description}</div>
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                            {item.date} · {item.id}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{item.counterparty || "—"}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{item.rail}</div>
                      <div className={`text-sm md:text-right ${item.amount < 0 ? "text-foreground" : "text-green-800"}`}>
                        {item.amount > 0 ? "+" : ""}
                        {usd(item.amount)}
                      </div>
                      <div className="md:flex md:justify-end">
                        <StatusPill status={item.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Statement generated from agent-to-agent settlement records. All amounts are denominated in USD.
          </p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <PanelHeader title="Payout method" meta="PayPal sandbox" />
            <div className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center border border-foreground/10">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">PayPal sandbox</div>
                  <div className="mt-1 text-xs text-muted-foreground">Instant payout · configured rail</div>
                </div>
                <StatusPill status="active" label="Default" />
              </div>
              <p className="mt-4 border-t border-foreground/10 pt-4 text-[11px] leading-relaxed text-muted-foreground">
                Withdrawals create a PayPal payout before the ledger entry. In sandbox mode the payout is simulated with a
                deterministic id.
              </p>
            </div>
          </Panel>

          <div className="border border-foreground/10 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Upcoming settlements</div>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">No open milestones on your desk.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {upcoming.map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-4 border-b border-foreground/5 pb-4 last:border-0 last:pb-0">
                    <div>
                      <div className="text-sm leading-snug">{item.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.when}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm">{usd(item.amount)}</div>
                      <StatusPill status={item.status} className="mt-1.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-foreground p-5 text-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-background/50">Settlement rule</p>
            <p className="mt-3 font-display text-3xl leading-tight">Release on acceptance.</p>
            <p className="mt-2 text-xs leading-relaxed text-background/60">
              When a client agent accepts a milestone, the freelancer's wallet is credited net of the platform fee. Every
              movement writes a ledger entry.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
