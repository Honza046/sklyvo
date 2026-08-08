import { Rocket } from "lucide-react";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { AutopilotEmailGate } from "@/components/autopilot/autopilot-email-gate";
import { AutopilotSubNav } from "@/components/autopilot/autopilot-sub-nav";
import { PlanFeatureGateClient } from "@/components/plan-feature-gate-client";
import { requireSessionUserId } from "@/lib/require-session";

export default async function AutopilotLayout({ children }: { children: React.ReactNode }) {
  await requireSessionUserId();
  const emailConnection = await getEmailConnectionState();

  return (
    <div className="sk-autopilot flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="sk-autopilot__frame mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col">
        <header
          data-tour="onboarding-autopilot-page"
          className="sk-autopilot__head mb-2 shrink-0 space-y-0.5 text-center sm:mb-3 sm:space-y-1"
        >
          <div className="mb-1 flex items-center justify-center sm:mb-2">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 sm:rounded-2xl sm:p-3">
              <Rocket className="h-5 w-5 sm:h-8 sm:w-8" />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Autopilot
          </h1>
          <p className="mx-auto max-w-2xl px-2 text-[11px] text-muted-foreground sm:text-sm">
            Centrum pro automatizované verze nástrojů Radar a Sniper. Manuální práci dělejte v
            příslušných sekcích menu, zde spouštějte hromadné a plně automatické procesy.
          </p>
        </header>
        <div className="sk-autopilot__nav shrink-0">
          <AutopilotSubNav />
        </div>
        <PlanFeatureGateClient tool="autopilot">
          <AutopilotEmailGate connectionState={emailConnection}>
            <div className="sk-autopilot__body flex min-h-0 flex-1 flex-col">{children}</div>
          </AutopilotEmailGate>
        </PlanFeatureGateClient>
      </div>
    </div>
  );
}
