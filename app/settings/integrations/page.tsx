import { getFakturoidConnectionState } from "@/app/actions/fakturoid";
import { getGoogleSheetsConnectionState } from "@/app/actions/google-sheets";
import { getMicrosoftConnectionState } from "@/app/actions/microsoft";
import { SettingsIntegrationsView } from "@/app/settings/settings-integrations-view";

export const dynamic = "force-dynamic";

export default async function SettingsIntegrationsPage() {
  const [sheets, microsoft, fakturoid] = await Promise.all([
    getGoogleSheetsConnectionState(),
    getMicrosoftConnectionState(),
    getFakturoidConnectionState(),
  ]);

  return (
    <SettingsIntegrationsView
      initialSheets={sheets}
      initialMicrosoft={microsoft}
      initialFakturoid={fakturoid}
    />
  );
}
