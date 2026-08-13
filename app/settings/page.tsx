import { SettingsHubView } from "@/app/settings/settings-hub-view";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await loadWorkspaceSettings();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SettingsHubView {...data} />
    </div>
  );
}
