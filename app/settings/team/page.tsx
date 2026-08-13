import { redirect } from "next/navigation";
import { SettingsTeamView } from "@/app/settings/settings-team-view";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace-settings";

export const dynamic = "force-dynamic";

export default async function SettingsTeamPage() {
  const data = await loadWorkspaceSettings();
  if (!data.isAgencyPlan) {
    redirect("/settings");
  }
  return <SettingsTeamView />;
}
