import { Suspense } from "react";
import { SettingsOutreachView } from "@/app/settings/settings-outreach-view";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace-settings";

export const dynamic = "force-dynamic";

export default async function SettingsOutreachPage() {
  const data = await loadWorkspaceSettings();
  return (
    <Suspense fallback={null}>
      <SettingsOutreachView {...data} />
    </Suspense>
  );
}
