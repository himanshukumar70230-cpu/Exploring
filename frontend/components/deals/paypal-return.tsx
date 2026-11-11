"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import type { PayPalCaptureResponse } from "@/lib/api-types";
import { apiPost, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function PayPalReturn({ dealId, orderId }: { dealId?: string; orderId?: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Capturing your PayPal sandbox payment…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!dealId || !orderId) {
      setState("error");
      setMessage("The PayPal return is missing the deal or order reference.");
      return;
    }

    apiPost<PayPalCaptureResponse>(`/deals/${dealId}/paypal/capture`, { orderId })
      .then((response) => {
        setState("done");
        setMessage(
          response.mode === "mock"
            ? "Sandbox payment captured. Escrow is funded and the deal is active."
            : "PayPal captured the payment. Escrow is funded and the deal is active.",
        );
        router.refresh();
      })
      .catch((caught) => {
        setState("error");
        setMessage(errorMessage(caught));
      });
  }, [dealId, orderId, router]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background">
        {state === "working" ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
        {state === "done" ? <CheckCircle2 className="h-6 w-6" /> : null}
        {state === "error" ? <ShieldAlert className="h-6 w-6" /> : null}
      </span>
      <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        PayPal sandbox
      </div>
      <h1 className="mt-3 font-display text-4xl leading-tight lg:text-5xl">
        {state === "working" ? "Finalising escrow." : null}
        {state === "done" ? "Escrow funded." : null}
        {state === "error" ? "Payment not completed." : null}
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">{message}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {dealId ? (
          <Button asChild className="h-11 rounded-full bg-foreground px-6 text-background">
            <Link href={`/deals/${dealId}`}>Back to the deal room</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="h-11 rounded-full px-6">
          <Link href="/deals">All deals</Link>
        </Button>
      </div>
    </section>
  );
}
