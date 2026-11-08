"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CreditCard,
  Landmark,
  Lock,
  Receipt,
  RotateCcw,
  Wallet,
} from "lucide-react";
import type { Transaction } from "@/lib/marketplace-data";
import { Panel, PanelHeader, StatusPill, usd } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

const typeIcons = {
  escrow: Lock,
  release: ArrowUpRight,
  payout: ArrowDownLeft,
  fee: Receipt,
  refund: RotateCcw,
};

const filters = [
  { value: "all", label: "All activity" },
  { value: "escrow", label: "Escrow" },
  { value: "release", label: "Releases" },
  { value: "payout", label: "Payouts" },
  { value: "fee", label: "Fees" },
];

export function WalletView({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState("all");
  const [withdrawing, setWithdrawing] = useState(false);
  const [amount, setAmount] = useState("2500");
  const [done, setDone] = useState(false);

  const filtered = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((item) => item.type === filter)),
    [transactions, filter]
  );

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-foreground/10 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Available balance</div>
                  <div className="mt-3 font-display text-5xl tracking-tight">{usd(18420)}<span className="text-2xl text-muted-foreground">.50</span></div>
                </div>
                <Wallet className="h-5 w-5 text-foreground/40" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => { setWithdrawing(true); setDone(false); }} className="h-10 rounded-full bg-foreground px-5 text-background text-xs">
                  Withdraw funds
                </Button>
                <Button variant="outline" className="h-10 rounded-full px-5 text-xs">
                  Add funds
                </Button>
              </div>
              {withdrawing ? (
                <div className="mt-5 border-t border-foreground/10 pt-5">
                  {done ? (
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <Check className="h-4 w-4" />
                      Withdrawal of {usd(Number(amount || 0))} queued to ACH ••••4021
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="withdraw-amount" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Amount to withdraw
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          id="withdraw-amount"
                          type="number"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          className="h-10 min-w-0 flex-1 border border-foreground/15 bg-transparent px-3 text-sm outline-none focus:border-foreground/40"
                        />
                        <Button
                          className="h-10 rounded-full bg-foreground px-5 text-background text-xs"
                          onClick={() => setDone(true)}
                        >
                          Confirm
                        </Button>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">Demo only. No real transfer is initiated.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <div className="border border-foreground/10 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">In escrow</div>
                <div className="mt-2 font-display text-3xl">{usd(28750)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Across 12 active deals</div>
              </div>
              <div className="border border-foreground/10 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pending release</div>
                <div className="mt-2 font-display text-3xl">{usd(1875)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Awaiting final acceptance</div>
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
            <div className="divide-y divide-foreground/5">
              {filtered.map((item) => {
                const Icon = typeIcons[item.type];
                return (
                  <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.6fr_1fr_0.7fr_0.7fr_0.5fr] md:items-center md:gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground/10">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <div className="text-sm">{item.description}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{item.date} · {item.id}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{item.counterparty}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{item.rail}</div>
                    <div className={`text-sm md:text-right ${item.amount < 0 ? "text-foreground" : "text-green-800"}`}>
                      {item.amount > 0 ? "+" : ""}{usd(item.amount)}
                    </div>
                    <div className="md:flex md:justify-end">
                      <StatusPill status={item.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Statement generated from agent-to-agent settlement records. All amounts are denominated in USD.
          </p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <PanelHeader title="Payout methods" meta="2 active" />
            <div className="divide-y divide-foreground/5">
              <div className="flex items-start gap-3 p-5">
                <span className="flex h-9 w-9 items-center justify-center border border-foreground/10">
                  <Landmark className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">ACH · Chase ••••4021</div>
                  <div className="mt-1 text-xs text-muted-foreground">Default · 1 business day</div>
                </div>
                <StatusPill status="active" label="Default" />
              </div>
              <div className="flex items-start gap-3 p-5">
                <span className="flex h-9 w-9 items-center justify-center border border-foreground/10">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">USDC · 0x7a…92f1</div>
                  <div className="mt-1 text-xs text-muted-foreground">Instant · Polygon</div>
                </div>
                <StatusPill status="active" label="Instant" />
              </div>
            </div>
          </Panel>

          <div className="border border-foreground/10 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Upcoming settlements</div>
            <div className="mt-4 space-y-4">
              {[
                { label: "Arc Light · final acceptance", amount: 1875, when: "Today" },
                { label: "Common Thread · milestone 2", amount: 5600, when: "28 Nov" },
                { label: "Plainview · kickoff", amount: 4600, when: "On award" },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4 border-b border-foreground/5 pb-4 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm">{item.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.when}</div>
                  </div>
                  <div className="shrink-0 text-sm">{usd(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-foreground p-5 text-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-background/50">Settlement rule</p>
            <p className="mt-3 font-display text-3xl leading-tight">Auto-release on acceptance.</p>
            <p className="mt-2 text-xs leading-relaxed text-background/60">
              When an acceptance agent signs off, funds move in 4.2 seconds. Humans can always pause the rule.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
