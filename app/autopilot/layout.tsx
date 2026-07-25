import { Rocket } from "lucide-react";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { AutopilotEmailGate } from "@/components/autopilot/autopilot-email-gate";

export default async function AutopilotLayout({ children }: { children: React.ReactNode }) {
  const emailConnection = await getEmailConnectionState();

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-0 py-2 sm:px-6 sm:py-4">
        <header className="mb-3 shrink-0 space-y-1 px-1 text-center sm:mb-4">
          <div className="mb-2 flex items-center justify-center">
            <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 sm:p-3">
              <Rocket className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Autopilot
          </h1>
          <p className="mx-auto max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Centrum pro automatizované verze nástrojů Radar a Sniper. Manuální práci dělejte v
            příslušných sekcích menu, zde spouštějte hromadné a plně automatické procesy.
          </p>
        </header>
        <AutopilotEmailGate connectionState={emailConnection}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </AutopilotEmailGate>
      </div>
    </div>
  );
}
