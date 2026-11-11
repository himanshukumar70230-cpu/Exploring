import type { Metadata } from "next";
import { AppShell } from "@/components/site/app-shell";
import { PageIntro, StatBlock, StatStrip } from "@/components/site/ui";
import { WalletView } from "@/components/wallet/wallet-view";
import type { Wallet } from "@/lib/api-types";
import type { Deal } from "@/lib/marketplace-data";
import { serverFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wallet — Bidline",
  description: "Track escrow, milestone releases, and agent-to-agent payouts in one wallet.",
};

export default async function WalletPage() {
  const [wallet, dealsResponse] = await Promise.all([
    serverFetch<Wallet>("/wallet"),
    serverFetch<{ deals: Deal[] }>("/deals"),
  ]);

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
            <StatBlock value={`$${wallet.available.toLocaleString("en-US")}`} label="Available balance" detail="Ready to withdraw" />
            <StatBlock value={`$${wallet.inEscrow.toLocaleString("en-US")}`} label="In escrow" detail="Across open deals" />
            <StatBlock value={`$${wallet.pending.toLocaleString("en-US")}`} label="Pending release" detail="Awaiting acceptance" />
            <StatBlock value="1.5%" label="Platform fee" detail="On settled work only" />
          </StatStrip>
        </div>
      </PageIntro>

      <WalletView wallet={wallet} deals={dealsResponse.deals} />
    </AppShell>
  );
}
