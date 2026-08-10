import { Rocket } from "lucide-react";
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
        <header
          data-tour="onboarding-autopilot-page"
          className="sk-autopilot__head mb-2 shrink-0 space-y-0.5 text-center sm:mb-3 sm:space-y-1"
        >
          <div className="mb-1 flex items-center justify-center sm:mb-2">
            <div className="sk-page-badge" aria-hidden>
              <Rocket strokeWidth={2} />
            </div>
          </div>
          <h1 className="sk-type-h1">Autopilot</h1>
          <p className="sk-type-body mx-auto max-w-2xl px-2">
            Centrum pro automatizované verze nástrojů Radar a Sniper. Manuální
            práci dělejte v příslušných sekcích menu, zde spouštějte hromadné a
            plně automatické procesy.
          </p>
        </header>
        <div className="sk-autopilot__nav shrink-0">
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
