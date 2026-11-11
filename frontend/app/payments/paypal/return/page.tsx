import type { Metadata } from "next";
import { AppShell } from "@/components/site/app-shell";
import { PayPalReturn } from "@/components/deals/paypal-return";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PayPal return — Bidline",
  description: "Capturing your PayPal sandbox payment and funding milestone escrow.",
};

export default async function PayPalReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string; token?: string; paypal?: string }>;
}) {
  const { deal, token } = await searchParams;

  return (
    <AppShell>
      <PayPalReturn dealId={deal} orderId={token} />
    </AppShell>
  );
}
