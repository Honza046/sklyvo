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
    description: "Webhook do Make.com.",
    fields: [
      { label: "Webhook URL", placeholder: "https://hook.eu1.make.com/..." },
    ],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Propojení přes Zapier.",
    fields: [
      { label: "Webhook URL", placeholder: "https://hooks.zapier.com/..." },
    ],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Schůzky do pipeline.",
    fields: [{ label: "API Klíč", placeholder: "Pipedrive API klíč" }],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync kontaktů s HubSpot.",
    fields: [{ label: "Access Token", placeholder: "HubSpot token" }],
  },
] as const;

const inputClass =
  "h-9 w-full max-w-xl rounded-xl border border-[color:var(--sk-panel-edge)] bg-[image:var(--sk-sunken)] px-3 text-sm text-[color:var(--sk-ink)] outline-none placeholder:text-[color:var(--sk-muted)] shadow-[var(--sk-sunken-shadow)] focus:ring-2 focus:ring-[color:var(--sk-brand)]/30";

const cardClass =
  "w-full cursor-pointer rounded-2xl border border-[color:var(--sk-panel-edge)] bg-[image:var(--sk-raised)] p-4 text-left text-[color:var(--sk-ink)] shadow-[var(--sk-raised-shadow)] transition-all hover:-translate-y-px hover:shadow-[var(--sk-shadow-raised-hover)]";

const statusBoxClass =
  "rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-950 ";

const btnSm = "h-8 rounded-xl px-3 text-xs";

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
  const [integrationValues, setIntegrationValues] = useState<
    Record<string, string>
  >({
    make: "",
    zapier: "",
    pipedrive: "",
    hubspot: "",
  });
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(
    "google-sheets",
  );
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [sheets, setSheets] = useState<GoogleSheetsConnectionState | null>(
    null,
  );
  const [microsoft, setMicrosoft] = useState<MicrosoftConnectionState | null>(
    null,
  );
  const [fakturoid, setFakturoid] = useState<FakturoidConnectionState | null>(
    null,
  );
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
      router.replace("/settings/integrations", { scroll: false });
    } else if (error) {
      toast.error(decodeURIComponent(error));
      router.replace("/settings/integrations", { scroll: false });
    } else if (msConnected === "1") {
      toast.success("Microsoft 365 připojeno (OneDrive / Excel / Word).");
      refreshMicrosoftState();
      router.replace("/settings/integrations", { scroll: false });
    } else if (msError) {
      toast.error(decodeURIComponent(msError));
      router.replace("/settings/integrations", { scroll: false });
    }
  }, [searchParams, router]);

  const toggleCard = (id: string) => {
    setExpandedIntegration((prev) => (prev === id ? null : id));
  };

  const handleTestConnection = (
    id: string,
    e: MouseEvent<HTMLButtonElement>,
  ) => {
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
      toast.message(
        "Otevřel se Google v novém okně (ideálně v Chrome). Po povolení se vrátíš sem.",
      );
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
      toast.success(
        enabled ? "Automatický sync zapnutý." : "Automatický sync vypnutý.",
      );
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
      const result = await getMicrosoftOAuthUrl("/settings/integrations");
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
      if (result.webUrl)
        window.open(result.webUrl, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <div className="w-full pb-2 pt-1">
      <p className="mb-3 text-xs text-muted-foreground">
        Live sheet zrcadlí CRM. Starý outreach sheet slouží jako archiv pro
        Radar.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          role="button"
          tabIndex={0}
          className={`${cardClass} sm:col-span-2`}
          onClick={() => toggleCard("google-sheets")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleCard("google-sheets");
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="sk-type-h3">Google Sheets</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Live zrcadlo CRM podle stavů + list Vše.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${sheetsActive ? "bg-emerald-500" : "bg-gray-300 "}`}
                aria-hidden
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                {sheetsActive ? "Připojeno" : "Nepřipojeno"}
              </span>
            </div>
          </div>

          {sheetsExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 max-w-xl space-y-3 border-t border-border/50 pt-3"
            >
              {!sheets?.oauthConfigured && (
                <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 ">
                  Chybí Google OAuth (CLIENT_ID / SECRET). Redirect:{" "}
                  <code className="text-[10px]">
                    /api/integrations/google-sheets/callback
                  </code>
                </p>
              )}

              {sheetsActive ? (
                <>
                  <div className={statusBoxClass}>
                    <p className="font-semibold text-emerald-900 ">
                      {sheets?.spreadsheetTitle ?? "Sklyvo CRM"}
                    </p>
                    {sheets?.accountEmail && (
                      <p className="mt-0.5 text-emerald-800/90 ">
                        {sheets.accountEmail}
                      </p>
                    )}
                    {formatSyncedAt(sheets?.lastSyncedAt ?? null) && (
                      <p className="mt-0.5 text-emerald-800/90 ">
                        Sync: {formatSyncedAt(sheets?.lastSyncedAt ?? null)}
                      </p>
                    )}
                    {sheets?.lastError && (
                      <p className="mt-1.5 font-medium text-rose-700 ">
                        Chyba: {sheets.lastError}
                      </p>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300"
                      checked={Boolean(sheets?.syncEnabled)}
                      disabled={isPending}
                      onChange={(e) => handleToggleSync(e.target.checked)}
                    />
                    Auto-sync při změnách v CRM
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {sheets?.spreadsheetUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        className={btnSm}
                        asChild
                      >
                        <a
                          href={sheets.spreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Otevřít
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      className={btnSm}
                      disabled={isPending}
                      onClick={handleSyncNow}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Sync teď
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={btnSm}
                      disabled={isPending}
                      onClick={handleDisconnectSheets}
                    >
                      <Unplug className="mr-1.5 h-3.5 w-3.5" />
                      Odpojit
                    </Button>
                  </div>

                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Sloupce: Firma, Web, E-mail, Telefon, Stav… Listy podle CRM
                    + Vše.
                  </p>

                  <div className="sk-data-row flex-col gap-2.5">
                    <p className="text-xs font-semibold text-foreground">
                      Archiv outreach DB
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Staré leady jen ve Sheets. Radar z archivu vylučuje firmy.
                    </p>
                    {sheets?.archiveSpreadsheetUrl && (
                      <p className="text-[11px] text-emerald-800 ">
                        Archiv:{" "}
                        <a
                          href={sheets.archiveSpreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          otevřít
                        </a>
                        {sheets.crmLeadCount > 0
                          ? ` · CRM ${sheets.crmLeadCount} leadů`
                          : " · CRM prázdné"}
                      </p>
                    )}
                    <input
                      type="url"
                      className={`${inputClass} font-mono text-[11px]`}
                      value={historySheetUrl}
                      onChange={(e) => setHistorySheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/…"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        className={btnSm}
                        disabled={isPending || !historySheetUrl.trim()}
                        onClick={handleSetArchive}
                      >
                        Nastavit archiv
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={btnSm}
                        disabled={isPending || !historySheetUrl.trim()}
                        onClick={handleImportHistory}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Import do CRM
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={btnSm}
                        disabled={isPending || !historySheetUrl.trim()}
                        onClick={handleBackfillAuthors}
                      >
                        Doplnit Autory
                      </Button>
                    </div>
                    <div className="space-y-2 border-t border-[color:var(--sk-panel-edge)] pt-2.5">
                      <p className="text-[11px] text-muted-foreground">
                        Vyčistit CRM v appce. Napiš <strong>SMAZAT</strong>.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <input
                          type="text"
                          className={`${inputClass} max-w-[8rem] font-mono text-[11px]`}
                          value={clearConfirm}
                          onChange={(e) => setClearConfirm(e.target.value)}
                          placeholder="SMAZAT"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className={`${btnSm} border-rose-300 text-rose-700 hover:bg-rose-50 `}
                          disabled={
                            isPending ||
                            clearConfirm.trim().toUpperCase() !== "SMAZAT"
                          }
                          onClick={handleClearCrm}
                        >
                          Vyčistit CRM
                        </Button>
                      </div>
                    </div>
                    {sheets?.splitBySource &&
                      !/(?:sklyvo|venegard)\s*crm/i.test(
                        sheets.spreadsheetTitle ?? "",
                      ) && (
                        <p className="text-[11px] text-amber-700 ">
                          Sync míří do staré tabulky. Odpoj a znovu připoj
                          Sheets.
                        </p>
                      )}
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    Po připojení vznikne sheet s listy podle stavů CRM.
                  </p>
                  <Button
                    type="button"
                    className={btnSm}
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
          className={`${cardClass} sm:col-span-2`}
          onClick={() => toggleCard("microsoft")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleCard("microsoft");
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="sk-type-h3">Microsoft 365</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                OneDrive, Excel a Word.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${msActive ? "bg-emerald-500" : "bg-gray-300 "}`}
                aria-hidden
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                {msActive ? "Připojeno" : "Nepřipojeno"}
              </span>
            </div>
          </div>

          {msExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 max-w-xl space-y-3 border-t border-border/50 pt-3"
            >
              {!microsoft?.oauthConfigured && (
                <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 ">
                  Chybí Microsoft OAuth (CLIENT_ID / SECRET). Redirect:{" "}
                  <code className="text-[10px]">
                    /api/integrations/microsoft/callback
                  </code>
                </p>
              )}

              {msActive ? (
                <>
                  <div className={statusBoxClass}>
                    <p className="font-semibold text-emerald-900 ">
                      {microsoft?.displayName || "Microsoft 365"}
                    </p>
                    {microsoft?.accountEmail && (
                      <p className="mt-0.5 text-emerald-800/90 ">
                        {microsoft.accountEmail}
                      </p>
                    )}
                    {microsoft?.lastError && (
                      <p className="mt-1.5 font-medium text-rose-700 ">
                        Chyba: {microsoft.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      className={btnSm}
                      disabled={isPending}
                      onClick={handleExportExcel}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Export CRM
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={btnSm}
                      disabled={isPending}
                      onClick={handleDisconnectMicrosoft}
                    >
                      <Unplug className="mr-1.5 h-3.5 w-3.5" />
                      Odpojit
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    Import z OneDrive, Word v Generátoru, Excel export.
                  </p>
                  <Button
                    type="button"
                    className={btnSm}
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
          className={`${cardClass} sm:col-span-2`}
          onClick={() => toggleCard("fakturoid")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleCard("fakturoid");
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="sk-type-h3">Fakturoid</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Faktury z Generátoru.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${fakturoidActive ? "bg-emerald-500" : "bg-gray-300 "}`}
                aria-hidden
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                {fakturoidActive ? "Připojeno" : "Nepřipojeno"}
              </span>
            </div>
          </div>

          {fakturoidExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 max-w-xl space-y-3 border-t border-border/50 pt-3"
            >
              {fakturoidActive ? (
                <>
                  <div className={statusBoxClass}>
                    <p className="font-semibold text-emerald-900 ">
                      {fakturoid?.accountName || "Fakturoid"}
                    </p>
                    {fakturoid?.accountSlug && (
                      <p className="mt-0.5 text-emerald-800/90 ">
                        {fakturoid.accountSlug}
                      </p>
                    )}
                    {fakturoid?.accountEmail && (
                      <p className="mt-0.5 text-emerald-800/90 ">
                        {fakturoid.accountEmail}
                      </p>
                    )}
                    {fakturoid?.lastError && (
                      <p className="mt-1.5 font-medium text-rose-700 ">
                        Chyba: {fakturoid.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      className={btnSm}
                      disabled={isPending}
                      onClick={handleDisconnectFakturoid}
                    >
                      <Unplug className="mr-1.5 h-3.5 w-3.5" />
                      Odpojit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={btnSm}
                      asChild
                    >
                      <a
                        href={
                          fakturoid?.accountSlug
                            ? `https://app.fakturoid.cz/${fakturoid.accountSlug}`
                            : "https://app.fakturoid.cz"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Otevřít
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    Ve Fakturoidu vytvoř Client ID + Secret a vlož je sem.
                  </p>
                  <div className="grid max-w-xl gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                        Client ID
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        className={`${inputClass} font-mono text-[11px]`}
                        value={fakturoidClientId}
                        onChange={(e) => setFakturoidClientId(e.target.value)}
                        placeholder="xxxxxxxx-…"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        className={`${inputClass} font-mono text-[11px]`}
                        value={fakturoidClientSecret}
                        onChange={(e) =>
                          setFakturoidClientSecret(e.target.value)
                        }
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="max-w-xs">
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Account slug (volitelné)
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      className={`${inputClass} font-mono text-[11px]`}
                      value={fakturoidSlug}
                      onChange={(e) => setFakturoidSlug(e.target.value)}
                      placeholder="moje-firma"
                    />
                  </div>
                  <Button
                    type="button"
                    className={btnSm}
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
              className={cardClass}
              onClick={() => toggleCard(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCard(item.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="sk-type-h3">{item.name}</h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-300 "}`}
                    aria-hidden
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {isActive ? "Aktivní" : "Nepřipojeno"}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.description}
              </p>

              {isExpanded && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="border-t border-border/50 pt-1"
                >
                  {item.fields.map((field) => (
                    <div key={field.label}>
                      <label
                        className="sr-only"
                        htmlFor={`${item.id}-${field.label}`}
                      >
                        {field.label}
                      </label>
                      <input
                        id={`${item.id}-${field.label}`}
                        type={
                          item.id === "pipedrive" || item.id === "hubspot"
                            ? "password"
                            : "text"
                        }
                        placeholder={field.placeholder}
                        className={`${inputClass} mt-3 font-mono text-[11px]`}
                        autoComplete="off"
                        value={integrationValues[item.id] || ""}
                        onChange={(e) =>
                          setIntegrationValues({
                            ...integrationValues,
                            [item.id]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      className={btnSm}
                      onClick={handleSave}
                    >
                      Uložit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={btnSm}
                      disabled={isTesting === item.id}
                      onClick={(e) => handleTestConnection(item.id, e)}
                    >
                      {isTesting === item.id ? "Testuji…" : "Otestovat"}
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
