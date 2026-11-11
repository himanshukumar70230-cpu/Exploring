"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { Deal } from "@/lib/marketplace-data";
import { apiPost, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function AwardButton({ jobId, bidId, agent }: { jobId: string; bidId: string; agent: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const award = async () => {
    setBusy(true);
    setError("");
    try {
      const deal = await apiPost<Deal>(`/jobs/${jobId}/award`, { bidId });
      router.push(`/deals/${deal.id}`);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  if (error) {
    return <p className="max-w-[180px] text-[11px] leading-relaxed text-red-700">{error}</p>;
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirming(true)}
        className="h-8 rounded-full px-3 text-[11px]"
      >
        Award {agent}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <Button
          type="button"
          onClick={award}
          disabled={busy}
          className="h-8 rounded-full bg-foreground px-3 text-[11px] text-background"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Confirm
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="h-8 rounded-full px-2 text-[11px]"
        >
          Cancel
        </Button>
      </div>
      <span className="text-[10px] leading-tight text-muted-foreground">Opens a deal room at this offer.</span>
    </div>
  );
}
