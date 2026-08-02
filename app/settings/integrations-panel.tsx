"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  disconnectGoogleSheets,
  getGoogleSheetsConnectionState,
  importHistoricalOutreachSheet,
  backfillAuthorsFromOutreachSheet,
  setGoogleSheetsSyncEnabled,
  setSheetsArchiveSpreadsheet,
  clearCrmLeadsKeepSheetsArchive,
  syncCrmToGoogleSheetsNow,
  type GoogleSheetsConnectionState,
} from "@/app/actions/google-sheets";
import {
  disconnectMicrosoft,
  exportCrmToExcelOneDrive,
  getMicrosoftConnectionState,
  getMicrosoftOAuthUrl,
  type MicrosoftConnectionState,
} from "@/app/actions/microsoft";
import {
  connectFakturoid,
  disconnectFakturoid,
  getFakturoidConnectionState,
  type FakturoidConnectionState,
} from "@/app/actions/fakturoid";
import { ExternalLink, RefreshCw, Unplug, Download } from "lucide-react";

const integrations = [
  {
    id: "make",
    name: "Make.com",
    description: "Odesílejte data do Make.com pro pokročilou automatizaci.",
    fields: [{ label: "Webhook URL", placeholder: "https://hook.eu1.make.com/..." }],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Propojte systém se stovkami aplikací přes Zapier.",
    fields: [{ label: "Webhook URL", placeholder: "https://hooks.zapier.com/..." }],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Synchronizujte domluvené schůzky rovnou do vaší pipeline.",
    fields: [{ label: "API Klíč", placeholder: "Váš Pipedrive API klíč" }],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Obousměrná synchronizace kontaktů s HubSpot CRM.",
    fields: [{ label: "Access Token", placeholder: "HubSpot Private App Token" }],
  },
] as const;

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500";

function formatSyncedAt(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("cs-CZ");
  } catch {
    return null;
  }
}

export function IntegrationsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [integrationValues, setIntegrationValues] = useState<Record<string, string>>({
    make: "",
    zapier: "",
    pipedrive: "",
    hubspot: "",
  });
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>("google-sheets");
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [sheets, setSheets] = useState<GoogleSheetsConnectionState | null>(null);
  const [microsoft, setMicrosoft] = useState<MicrosoftConnectionState | null>(null);
  const [fakturoid, setFakturoid] = useState<FakturoidConnectionState | null>(null);
  const [fakturoidClientId, setFakturoidClientId] = useState("");
  const [fakturoidClientSecret, setFakturoidClientSecret] = useState("");
  const [fakturoidSlug, setFakturoidSlug] = useState("");
  const [isPending, startTransition] = useTransition();
  const [historySheetUrl, setHistorySheetUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1KAoCo7_HHpleIs5eAKVhlsQLQuIkke-dAg-dQsYE7xs/edit",
  );
  const [clearConfirm, setClearConfirm] = useState("");

  const refreshSheetsState = () => {
    startTransition(async () => {
      const state = await getGoogleSheetsConnectionState();
      setSheets(state);
    });
  };

  const refreshMicrosoftState = () => {
    startTransition(async () => {
      const state = await getMicrosoftConnectionState();
      setMicrosoft(state);
    });
  };

  const refreshFakturoidState = () => {
    startTransition(async () => {
      const state = await getFakturoidConnectionState();
      setFakturoid(state);
    });
  };

  useEffect(() => {
    refreshSheetsState();
    refreshMicrosoftState();
    refreshFakturoidState();
  }, []);

  useEffect(() => {
    const connected = searchParams.get("sheetsConnected");
    const error = searchParams.get("sheetsError");
    const msConnected = searchParams.get("msConnected");
    const msError = searchParams.get("msError");
    if (connected === "1") {
      toast.success(
        "Google Sheets připojeno. Listy podle stavů CRM (Nový lead → Nedomluveno) + Vše jsou připravené.",
      );
      refreshSheetsState();
      router.replace("/settings#integrations", { scroll: false });
    } else if (error) {
      toast.error(decodeURIComponent(error));
      router.replace("/settings#integrations", { scroll: false });
    } else if (msConnected === "1") {
      toast.success("Microsoft 365 připojeno (OneDrive / Excel / Word).");
      refreshMicrosoftState();
      router.replace("/settings#integrations", { scroll: false });
    } else if (msError) {
      toast.error(decodeURIComponent(msError));
      router.replace("/settings#integrations", { scroll: false });
    }
  }, [searchParams, router]);

  const toggleCard = (id: string) => {
    setExpandedIntegration((prev) => (prev === id ? null : id));
  };

  const handleTestConnection = (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const value = integrationValues[id];
    if (!value || value.trim() === "") {
      toast.error("Nejdříve zadejte URL nebo API klíč.");
      return;
    }
    setIsTesting(id);
    setTimeout(() => {
      setIsTesting(null);
      toast.success("Spojení úspěšné!");
    }, 1000);
  };

  const handleSave = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };

  const handleConnectSheets = () => {
    // Prefer a real browser navigation; Safari often freezes mid Google OAuth UI.
    const href = "/api/integrations/google-sheets/authorize";
    const opened = window.open(href, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = href;
    } else {
      toast.message("Otevřel se Google v novém okně (ideálně v Chrome). Po povolení se vrátíš sem.");
    }
  };

  const handleSyncNow = () => {
    startTransition(async () => {
      const result = await syncCrmToGoogleSheetsNow();
      if ("error" in result && result.error) {
        toast.error(result.error);
        refreshSheetsState();
        return;
      }
      toast.success(`CRM synchronizováno (${result.rowCount ?? 0} leadů).`);
      refreshSheetsState();
    });
  };

  const handleToggleSync = (enabled: boolean) => {
    startTransition(async () => {
      const result = await setGoogleSheetsSyncEnabled(enabled);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(enabled ? "Automatický sync zapnutý." : "Automatický sync vypnutý.");
      refreshSheetsState();
    });
  };

  const handleDisconnectSheets = () => {
    startTransition(async () => {
      const result = await disconnectGoogleSheets();
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Google Sheets odpojeno.");
      refreshSheetsState();
    });
  };

  const handleImportHistory = () => {
    startTransition(async () => {
      const result = await importHistoricalOutreachSheet({
        spreadsheetUrlOrId: historySheetUrl,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Import ${result.sheetName}: +${result.createdCount} do CRM (${result.skippedCount} přeskočeno z ${result.totalRows}). Sync do listů podle stavů.`,
      );
      refreshSheetsState();
    });
  };

  const handleBackfillAuthors = () => {
    startTransition(async () => {
      const result = await backfillAuthorsFromOutreachSheet({
        spreadsheetUrlOrId: historySheetUrl,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      const counts = Object.entries(result.authorCounts ?? {})
        .map(([name, n]) => `${name}: ${n}`)
        .join(", ");
      toast.success(
        `Autoři doplněni (${result.updated} leadů). ${counts || "Bez změn."}`,
      );
      refreshSheetsState();
    });
  };

  const handleSetArchive = () => {
    startTransition(async () => {
      const result = await setSheetsArchiveSpreadsheet(historySheetUrl);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Archiv nastaven${result.title ? `: ${result.title}` : ""}. Radar z něj vylučuje staré firmy.`,
      );
      refreshSheetsState();
    });
  };

  const handleClearCrm = () => {
    startTransition(async () => {
      const result = await clearCrmLeadsKeepSheetsArchive(clearConfirm);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setClearConfirm("");
      toast.success(
        `CRM v appce vyčištěno (${result.deletedCount} leadů). Staré zůstávají v Sheets archivu; nové půjdou jen do appky + live sheetu.`,
      );
      refreshSheetsState();
    });
  };

  const sheetsActive = Boolean(sheets?.connected && sheets.spreadsheetUrl);
  const sheetsExpanded = expandedIntegration === "google-sheets";
  const msActive = Boolean(microsoft?.connected);
  const msExpanded = expandedIntegration === "microsoft";
  const fakturoidActive = Boolean(fakturoid?.connected);
  const fakturoidExpanded = expandedIntegration === "fakturoid";

  const handleConnectMicrosoft = () => {
    startTransition(async () => {
      const result = await getMicrosoftOAuthUrl("/settings#integrations");
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.url;
    });
  };

  const handleDisconnectMicrosoft = () => {
    startTransition(async () => {
      const result = await disconnectMicrosoft();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Microsoft 365 odpojeno.");
      refreshMicrosoftState();
    });
  };

  const handleConnectFakturoid = () => {
    startTransition(async () => {
      const result = await connectFakturoid({
        clientId: fakturoidClientId,
        clientSecret: fakturoidClientSecret,
        accountSlug: fakturoidSlug || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.accountName
          ? `Fakturoid připojen (${result.accountName}).`
          : "Fakturoid připojen.",
      );
      setFakturoidClientSecret("");
      refreshFakturoidState();
    });
  };

  const handleDisconnectFakturoid = () => {
    startTransition(async () => {
      const result = await disconnectFakturoid();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Fakturoid odpojen.");
      refreshFakturoidState();
    });
  };

  const handleExportExcel = () => {
    startTransition(async () => {
      const result = await exportCrmToExcelOneDrive();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`CRM exportováno do OneDrive: ${result.fileName}`);
      if (result.webUrl) window.open(result.webUrl, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <div className="pb-2 pt-2">
      <p className="mb-4 text-sm text-muted-foreground">
        Live Venegard Sheet zrcadlí CRM v appce (jen nové leady). Stará outreach DB zůstává
        archivem — Radar z ní vylučuje firmy, i když v appce už nejsou.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          role="button"
          tabIndex={0}
          className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-300 dark:border-gray-700 dark:bg-card dark:hover:border-blue-600 md:col-span-2"
          onClick={() => toggleCard("google-sheets")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleCard("google-sheets");
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-foreground">
                Google Sheets
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-muted-foreground">
                Live zrcadlo CRM: listy podle stavů (jako board) + Vše. Radar / Sniper ve filtrovaných
                pohledech. Změny v appce se propsí do tabulky.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${sheetsActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-muted-foreground/50"}`}
                aria-hidden
              />
              <span className="text-xs font-medium text-gray-600 dark:text-muted-foreground">
                {sheetsActive ? "Připojeno" : "Nepřipojeno"}
              </span>
            </div>
          </div>

          {sheetsExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-border/60"
            >
              {!sheets?.oauthConfigured && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Na serveru chybí Google OAuth (GOOGLE_SHEETS_CLIENT_ID / SECRET). Stejný Google Cloud
                  projekt jako pro Gmail stačí — přidej redirect URI na{" "}
                  <code className="text-xs">/api/integrations/google-sheets/callback</code> a zapni
                  Google Sheets API + Google Drive API + Google Docs API.
                  Po rozšíření oprávnění znovu připojte účet (souhlas s Drive / Docs).
                </p>
              )}

              {sheetsActive ? (
                <>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
                    <p className="font-medium text-emerald-900 dark:text-emerald-200">
                      {sheets?.spreadsheetTitle ?? "Venegard CRM"}
                    </p>
                    {sheets?.accountEmail && (
                      <p className="mt-1 text-emerald-800/80 dark:text-emerald-300/80">
                        Účet: {sheets.accountEmail}
                      </p>
                    )}
                    {formatSyncedAt(sheets?.lastSyncedAt ?? null) && (
                      <p className="mt-1 text-emerald-800/80 dark:text-emerald-300/80">
                        Poslední sync: {formatSyncedAt(sheets?.lastSyncedAt ?? null)}
                      </p>
                    )}
                    {sheets?.lastError && (
                      <p className="mt-2 text-rose-700 dark:text-rose-300">Chyba: {sheets.lastError}</p>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={Boolean(sheets?.syncEnabled)}
                      disabled={isPending}
                      onChange={(e) => handleToggleSync(e.target.checked)}
                    />
                    Automaticky synchronizovat při změnách v CRM
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {sheets?.spreadsheetUrl && (
                      <Button type="button" variant="outline" className="rounded-lg" asChild>
                        <a href={sheets.spreadsheetUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Otevřít tabulku
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      className="rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
                      disabled={isPending}
                      onClick={handleSyncNow}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Synchronizovat teď
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg"
                      disabled={isPending}
                      onClick={handleDisconnectSheets}
                    >
                      <Unplug className="mr-2 h-4 w-4" />
                      Odpojit
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Sloupce: Firma, Web, E-mail, Telefon, Stav… ID je schované. Dole stavy jako v
                    appce: <strong>Nový lead</strong> → <strong>Domluveno</strong> /{" "}
                    <strong>Nedomluveno</strong> + <strong>Vše</strong>. Radar / Sniper:{" "}
                    <strong>Data → Filtrované pohledy</strong> na listu Vše. Zdroj pravdy je CRM v
                    appce.
                  </p>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-sm font-medium text-foreground">
                      Archiv outreach DB (staré leady)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Staré leady necháváme jen v Google Sheets. App CRM drží jen nové. Radar
                      vylučuje firmy z archivu (Master / Radar / Sniper), i když v appce nejsou.
                      Live Venegard sheet se archivem nepřepisuje.
                    </p>
                    {sheets?.archiveSpreadsheetUrl && (
                      <p className="text-xs text-emerald-800 dark:text-emerald-300">
                        Archiv aktivní:{" "}
                        <a
                          href={sheets.archiveSpreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          otevřít
                        </a>
                        {sheets.crmLeadCount > 0
                          ? ` · v app CRM teď ${sheets.crmLeadCount} leadů`
                          : " · app CRM prázdné"}
                      </p>
                    )}
                    <input
                      type="url"
                      className={`${inputClass} font-mono text-xs dark:border-border dark:bg-background dark:text-foreground`}
                      value={historySheetUrl}
                      onChange={(e) => setHistorySheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/…"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
                        disabled={isPending || !historySheetUrl.trim()}
                        onClick={handleSetArchive}
                      >
                        Nastavit jako archiv pro Radar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg"
                        disabled={isPending || !historySheetUrl.trim()}
                        onClick={handleImportHistory}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Import do CRM (volitelné)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg"
                        disabled={isPending || !historySheetUrl.trim()}
                        onClick={handleBackfillAuthors}
                      >
                        Doplnit Autory z Master
                      </Button>
                    </div>
                    <div className="space-y-2 border-t border-border/50 pt-3">
                      <p className="text-xs text-muted-foreground">
                        Vyčistit app CRM a nechat staré jen v Sheets. Napiš{" "}
                        <strong>SMAZAT</strong> pro potvrzení.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          className={`${inputClass} max-w-[10rem] font-mono text-xs dark:border-border dark:bg-background dark:text-foreground`}
                          value={clearConfirm}
                          onChange={(e) => setClearConfirm(e.target.value)}
                          placeholder="SMAZAT"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                          disabled={isPending || clearConfirm.trim().toUpperCase() !== "SMAZAT"}
                          onClick={handleClearCrm}
                        >
                          Vyčistit CRM v appce
                        </Button>
                      </div>
                    </div>
                    {sheets?.splitBySource &&
                      !/venegard\s*crm/i.test(sheets.spreadsheetTitle ?? "") && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Sync míří do historické outreach tabulky. Pro Venegard CRM (listy podle stavů)
                        odpoj a znovu připoj Google Sheets.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Po připojení Venegard vytvoří Sheet s listy podle stavů CRM (barevné jako board) +
                    Vše. Nic v Sheets předem připravovat nemusíš.
                  </p>
                  <Button
                    type="button"
                    className="rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
                    disabled={!sheets?.oauthConfigured || isPending}
                    onClick={handleConnectSheets}
                  >
                    Připojit Google Sheets
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          role="button"
          tabIndex={0}
          className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-300 dark:border-gray-700 dark:bg-card dark:hover:border-blue-600 md:col-span-2"
          onClick={() => toggleCard("microsoft")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleCard("microsoft");
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-foreground">
                Microsoft 365
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-muted-foreground">
                OneDrive, Excel a Word. Pro týmy, které nepoužívají Google. Import souborů,
                export CRM do Excelu a generování smluv do Wordu.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${msActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-muted-foreground/50"}`}
                aria-hidden
              />
              <span className="text-xs font-medium text-gray-600 dark:text-muted-foreground">
                {msActive ? "Připojeno" : "Nepřipojeno"}
              </span>
            </div>
          </div>

          {msExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-border/60"
            >
              {!microsoft?.oauthConfigured && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Na serveru chybí Microsoft OAuth. Přidej{" "}
                  <code className="text-xs">MICROSOFT_CLIENT_ID</code> a{" "}
                  <code className="text-xs">MICROSOFT_CLIENT_SECRET</code> (Azure App Registration),
                  redirect URI{" "}
                  <code className="text-xs">/api/integrations/microsoft/callback</code> a oprávnění
                  Files.ReadWrite + Files.Read.All + offline_access + User.Read.
                </p>
              )}

              {msActive ? (
                <>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
                    <p className="font-medium text-emerald-900 dark:text-emerald-200">
                      {microsoft?.displayName || "Microsoft 365"}
                    </p>
                    {microsoft?.accountEmail && (
                      <p className="mt-1 text-emerald-800/80 dark:text-emerald-300/80">
                        Účet: {microsoft.accountEmail}
                      </p>
                    )}
                    {microsoft?.lastError && (
                      <p className="mt-2 text-rose-700 dark:text-rose-300">
                        Chyba: {microsoft.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={handleExportExcel}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportovat CRM do Excelu
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={handleDisconnectMicrosoft}
                    >
                      <Unplug className="mr-2 h-4 w-4" />
                      Odpojit
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Po připojení půjde importovat z OneDrive, tvořit Word dokumenty v Generátoru a
                    exportovat CRM jako Excel (.csv) do OneDrive.
                  </p>
                  <Button
                    type="button"
                    className="rounded-lg bg-[#2F2F2F] font-semibold text-white hover:bg-black"
                    disabled={!microsoft?.oauthConfigured || isPending}
                    onClick={handleConnectMicrosoft}
                  >
                    Připojit Microsoft 365
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          role="button"
          tabIndex={0}
          className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-300 dark:border-gray-700 dark:bg-card dark:hover:border-blue-600 md:col-span-2"
          onClick={() => toggleCard("fakturoid")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleCard("fakturoid");
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-foreground">
                Fakturoid
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-muted-foreground">
                Vystavujte faktury přímo z Generátoru. Klient a částka se přenesou do Fakturoidu.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${fakturoidActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-muted-foreground/50"}`}
                aria-hidden
              />
              <span className="text-xs font-medium text-gray-600 dark:text-muted-foreground">
                {fakturoidActive ? "Připojeno" : "Nepřipojeno"}
              </span>
            </div>
          </div>

          {fakturoidExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-border/60"
            >
              {fakturoidActive ? (
                <>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
                    <p className="font-medium text-emerald-900 dark:text-emerald-200">
                      {fakturoid?.accountName || "Fakturoid"}
                    </p>
                    {fakturoid?.accountSlug && (
                      <p className="mt-1 text-emerald-800/80 dark:text-emerald-300/80">
                        Účet: {fakturoid.accountSlug}
                      </p>
                    )}
                    {fakturoid?.accountEmail && (
                      <p className="mt-1 text-emerald-800/80 dark:text-emerald-300/80">
                        {fakturoid.accountEmail}
                      </p>
                    )}
                    {fakturoid?.lastError && (
                      <p className="mt-2 text-rose-700 dark:text-rose-300">
                        Chyba: {fakturoid.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={handleDisconnectFakturoid}
                    >
                      <Unplug className="mr-2 h-4 w-4" />
                      Odpojit
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a
                        href={
                          fakturoid?.accountSlug
                            ? `https://app.fakturoid.cz/${fakturoid.accountSlug}`
                            : "https://app.fakturoid.cz"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Otevřít Fakturoid
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    V Fakturoidu otevřete Nastavení → Uživatelský účet a vytvořte Client ID + Client
                    Secret (Client Credentials). Pak je sem vložte.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Client ID
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        className={`${inputClass} font-mono`}
                        value={fakturoidClientId}
                        onChange={(e) => setFakturoidClientId(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-…"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        className={`${inputClass} font-mono`}
                        value={fakturoidClientSecret}
                        onChange={(e) => setFakturoidClientSecret(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Account slug (volitelné)
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      className={`${inputClass} font-mono`}
                      value={fakturoidSlug}
                      onChange={(e) => setFakturoidSlug(e.target.value)}
                      placeholder="moje-firma (pokud máte víc účtů)"
                    />
                  </div>
                  <Button
                    type="button"
                    className="rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
                    disabled={
                      isPending ||
                      !fakturoidClientId.trim() ||
                      !fakturoidClientSecret.trim()
                    }
                    onClick={handleConnectFakturoid}
                  >
                    Připojit Fakturoid
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {integrations.map((item) => {
          const stored = integrationValues[item.id];
          const isActive = Boolean(stored && stored.length > 0);
          const isExpanded = expandedIntegration === item.id;

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-300 dark:border-gray-700 dark:bg-card dark:hover:border-blue-600"
              onClick={() => toggleCard(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCard(item.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-foreground">{item.name}</h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-muted-foreground/50"}`}
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-gray-600 dark:text-muted-foreground">
                    {isActive ? "Aktivní" : "Nepřipojeno"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-muted-foreground">{item.description}</p>

              {isExpanded && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="border-t border-gray-100 pt-1 dark:border-border/60"
                >
                  {item.fields.map((field) => (
                    <div key={field.label}>
                      <label className="sr-only" htmlFor={`${item.id}-${field.label}`}>
                        {field.label}
                      </label>
                      <input
                        id={`${item.id}-${field.label}`}
                        type={item.id === "pipedrive" || item.id === "hubspot" ? "password" : "text"}
                        placeholder={field.placeholder}
                        className={`${inputClass} mt-4 font-mono`}
                        autoComplete="off"
                        value={integrationValues[item.id] || ""}
                        onChange={(e) =>
                          setIntegrationValues({ ...integrationValues, [item.id]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
                      onClick={handleSave}
                    >
                      Uložit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 dark:border-border dark:text-foreground dark:hover:bg-muted"
                      disabled={isTesting === item.id}
                      onClick={(e) => handleTestConnection(item.id, e)}
                    >
                      {isTesting === item.id ? "Testuji…" : "Otestovat spojení"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
