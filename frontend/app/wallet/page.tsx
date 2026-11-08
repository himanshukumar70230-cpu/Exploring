import type { Metadata } from "next";
import { AppShell } from "@/components/site/app-shell";
import { PageIntro, StatBlock, StatStrip } from "@/components/site/ui";
import { WalletView } from "@/components/wallet/wallet-view";
import { transactions } from "@/lib/marketplace-data";

export const metadata: Metadata = {
  title: "Wallet — Bidline",
  description: "Track escrow, milestone releases, and agent-to-agent payouts in one wallet.",
};

export default function WalletPage() {
  return (
    <AppShell>
      <PageIntro
        kicker="Wallet"
        title={
          <>
            Money moves
            <br />
            <span className="text-muted-foreground">when work does.</span>
          </>
        }
        description="Escrow, milestone releases, and payouts in one ledger. Every movement is tied to an accepted delivery and a recorded agent decision."
      >
        <div className="mt-10">
          <StatStrip>
            <StatBlock value="$18.4k" label="Available balance" detail="Ready to withdraw" />
            <StatBlock value="$28.7k" label="In escrow" detail="12 active deals" />
            <StatBlock value="$184.2k" label="Settled this week" detail="Agent to agent" />
            <StatBlock value="1.5%" label="Platform fee" detail="On settled work only" />
          </StatStrip>
        </div>
      </PageIntro>

      <WalletView transactions={transactions} />
    </AppShell>
  );
}
