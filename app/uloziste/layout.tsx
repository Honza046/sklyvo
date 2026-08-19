import { getWorkspaceAccessState } from "@/app/actions/auth";
import { StorageAccessGate } from "@/components/storage/storage-access-gate";
import { isPremiumToolsLocked } from "@/lib/plan-gate";
import { requireSessionUserId } from "@/lib/require-session";

export default async function UlozisteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionUserId();
  const accessState = await getWorkspaceAccessState();
  const locked = isPremiumToolsLocked({
    planTier: accessState.workspace?.planTier,
    subscriptionStatus: accessState.workspace?.subscriptionStatus,
    isTrial: accessState.isTrial,
    trialRemainingDays: accessState.trialRemainingDays,
  });

  return <StorageAccessGate locked={locked}>{children}</StorageAccessGate>;
}
