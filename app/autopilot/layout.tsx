import { getEmailConnectionState } from "@/app/actions/email-connection";
import { AutopilotEmailGate } from "@/components/autopilot/autopilot-email-gate";
import { AutopilotSubNav } from "@/components/autopilot/autopilot-sub-nav";
import { PlanFeatureGateClient } from "@/components/plan-feature-gate-client";
import { requireSessionUserId } from "@/lib/require-session";

export default async function AutopilotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionUserId();
  const emailConnection = await getEmailConnectionState();

  return (
    <div className="sk-autopilot flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="sk-autopilot__frame flex h-full min-h-0 w-full flex-col">
        <div
          data-tour="onboarding-autopilot-page"
          className="sk-autopilot__nav shrink-0"
        >
          <AutopilotSubNav />
        </div>
        <PlanFeatureGateClient tool="autopilot">
          <AutopilotEmailGate connectionState={emailConnection}>
            <div className="sk-autopilot__body flex min-h-0 flex-1 flex-col">
              {children}
            </div>
          </AutopilotEmailGate>
        </PlanFeatureGateClient>
      </div>
    </div>
  );
}
