"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkspaceBilling } from "@/app/actions/platform-admin";

export function WorkspaceBillingForm({
  workspaceId,
  planTier,
  subscriptionStatus,
  creditsTotal,
  creditsUsed,
}: {
  workspaceId: string;
  planTier: string;
  subscriptionStatus: string;
  creditsTotal: number;
  creditsUsed: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState(planTier);
  const [status, setStatus] = useState(subscriptionStatus);
  const [total, setTotal] = useState(String(creditsTotal));
  const [used, setUsed] = useState(String(creditsUsed));

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateWorkspaceBilling({
            workspaceId,
            planTier: plan,
            subscriptionStatus: status,
            creditsTotal: Number(total),
            creditsUsed: Number(used),
          });
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          toast.success("Billing uložen");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="planTier">planTier</Label>
        <Input
          id="planTier"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="subscriptionStatus">subscriptionStatus</Label>
        <Input
          id="subscriptionStatus"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="creditsTotal">creditsTotal</Label>
        <Input
          id="creditsTotal"
          type="number"
          min={0}
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="creditsUsed">creditsUsed</Label>
        <Input
          id="creditsUsed"
          type="number"
          min={0}
          value={used}
          onChange={(e) => setUsed(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="sk-btn sk-btn--primary sk-btn--md"
        >
          Uložit billing
        </button>
      </div>
    </form>
  );
}
