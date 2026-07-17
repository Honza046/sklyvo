import { Rocket } from "lucide-react";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { AutopilotEmailGate } from "@/components/autopilot/autopilot-email-gate";

export default async function AutopilotLayout({ children }: { children: React.ReactNode }) {
  const emailConnection = await getEmailConnectionState();

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-6 py-4">
        <header className="mb-4 shrink-0 space-y-1 text-center">
          <div className="mb-2 flex items-center justify-center">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Rocket className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Autopilot
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
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
