import { Rocket } from "lucide-react";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { AutopilotEmailGate } from "@/components/autopilot/autopilot-email-gate";
import { AutopilotSubNav } from "@/components/autopilot/autopilot-sub-nav";

export default async function AutopilotLayout({ children }: { children: React.ReactNode }) {
  const emailConnection = await getEmailConnectionState();

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-0 py-1 sm:px-6 sm:py-4">
        <header className="mb-2 shrink-0 space-y-0.5 px-1 text-center sm:mb-4 sm:space-y-1">
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
        <AutopilotSubNav />
        <AutopilotEmailGate connectionState={emailConnection}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </AutopilotEmailGate>
      </div>
    </div>
  );
}
