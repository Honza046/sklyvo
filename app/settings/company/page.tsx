import { SettingsCompanyView } from "@/app/settings/settings-company-view";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace-settings";

export const dynamic = "force-dynamic";

export default async function SettingsCompanyPage() {
  const data = await loadWorkspaceSettings();
  return <SettingsCompanyView {...data} />;
}
