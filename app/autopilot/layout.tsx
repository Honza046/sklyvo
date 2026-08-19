import { getEmailConnectionState } from "@/app/actions/email-connection";
import { getWorkspaceAccessState } from "@/app/actions/auth";
import { AutopilotAccessGate } from "@/components/autopilot/autopilot-access-gate";
import { isPremiumToolsLocked } from "@/lib/plan-gate";
import { requireSessionUserId } from "@/lib/require-session";

export default async function AutopilotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionUserId();
  const [emailConnection, accessState] = await Promise.all([
    getEmailConnectionState(),
    getWorkspaceAccessState(),
  ]);
  const locked = isPremiumToolsLocked({
    planTier: accessState.workspace?.planTier,
    subscriptionStatus: accessState.workspace?.subscriptionStatus,
    isTrial: accessState.isTrial,
    trialRemainingDays: accessState.trialRemainingDays,
  });

  return (
    <div className="sk-autopilot flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="sk-autopilot__frame flex h-full min-h-0 w-full flex-col">
        <AutopilotAccessGate locked={locked} connectionState={emailConnection}>
          <div className="sk-autopilot__body flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </AutopilotAccessGate>
      </div>
    </div>
  );
}
