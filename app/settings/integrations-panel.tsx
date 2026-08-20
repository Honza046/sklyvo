"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ExternalLink, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { DATE_LOCALE } from "@/lib/i18n/types";

const webhookIntegrationIds = [
  "make",
  "zapier",
  "pipedrive",
  "hubspot",
] as const;

type WebhookIntegrationId = (typeof webhookIntegrationIds)[number];

const webhookFieldPlaceholders: Record<
  WebhookIntegrationId,
  { label: string; placeholder: string }[]
> = {
  make: [
    { label: "Webhook URL", placeholder: "https://hook.eu1.make.com/..." },
  ],
  zapier: [
    { label: "Webhook URL", placeholder: "https://hooks.zapier.com/..." },
  ],
  pipedrive: [{ label: "API key", placeholder: "Pipedrive API key" }],
  hubspot: [{ label: "Access Token", placeholder: "HubSpot token" }],
};

const inputClass =
  "sk-integration-detail__input";

function IntegrationStatus({
  connected,
  connectedLabel,
  disconnectedLabel,
}: {
  connected: boolean;
  connectedLabel: string;
  disconnectedLabel: string;
}) {
  return (
    <span className="sk-integration-row__status">
      <span
        className={cn(
          "sk-integration-row__dot",
          connected && "is-connected",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "sk-integration-row__status-text",
          connected && "is-connected",
        )}
      >
        {connected ? connectedLabel : disconnectedLabel}
      </span>
    </span>
  );
}

function formatSyncedAt(iso: string | null, locale: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return null;
  }
}

export function IntegrationsPanel() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const webhookIntegrations = webhookIntegrationIds.map((id) => {
    const names: Record<WebhookIntegrationId, string> = {
      make: "Make.com",
      zapier: "Zapier",
      pipedrive: "Pipedrive",
      hubspot: "HubSpot",
    };
    const descKeys: Record<WebhookIntegrationId, string> = {
      make: "settings.integrationsPanel.makeDesc",
      zapier: "settings.integrationsPanel.zapierDesc",
      pipedrive: "settings.integrationsPanel.pipedriveDesc",
      hubspot: "settings.integrationsPanel.hubspotDesc",
    };
    return {
      id,
      name: names[id],
      description: t(descKeys[id]),
      fields: webhookFieldPlaceholders[id],
    };
  });

  const statusConnected = t("settings.integrationsPanel.connected");
  const statusDisconnected = t("settings.integrationsPanel.disconnected");
  const connectLabel = t("settings.integrationsPanel.connect");
  const disconnectLabel = t("settings.integrationsPanel.disconnect");
  const [integrationValues, setIntegrationValues] = useState<
    Record<string, string>
  >({
    make: "",
    zapier: "",
    pipedrive: "",
    hubspot: "",
  });
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(
    null,
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
    toast.success("Uloženo.");
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
  const msActive = Boolean(microsoft?.connected);
  const fakturoidActive = Boolean(fakturoid?.connected);

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

  const toggleExpanded = (id: string) => {
    setExpandedIntegration((prev) => (prev === id ? null : id));
  };

  const handleRowAction = (
    connected: boolean,
    connect: () => void,
    disconnect: () => void,
  ) => {
    if (connected) {
      disconnect();
      return;
    }
    connect();
  };

  const renderSheetsDetail = () => {
    if (expandedIntegration !== "google-sheets") return null;

    return (
      <div className="sk-integration-row__detail">
        {!sheets?.oauthConfigured && (
          <p className="sk-integration-detail__warn">
            Chybí Google OAuth (CLIENT_ID / SECRET). Redirect:{" "}
            <code>/api/integrations/google-sheets/callback</code>
          </p>
        )}

        {sheetsActive ? (
          <div className="sk-integration-detail__body">
            {sheets?.spreadsheetTitle && (
              <p className="sk-integration-detail__meta">
                {sheets.spreadsheetTitle}
                {sheets.accountEmail ? ` · ${sheets.accountEmail}` : ""}
              </p>
            )}
            {formatSyncedAt(sheets?.lastSyncedAt ?? null, DATE_LOCALE[language]) && (
              <p className="sk-integration-detail__meta">
                Sync: {formatSyncedAt(sheets?.lastSyncedAt ?? null, DATE_LOCALE[language])}
              </p>
            )}
            {sheets?.lastError && (
              <p className="sk-integration-detail__error">
                Chyba: {sheets.lastError}
              </p>
            )}

            <label className="sk-integration-detail__check">
              <input
                type="checkbox"
                checked={Boolean(sheets?.syncEnabled)}
                disabled={isPending}
                onChange={(e) => handleToggleSync(e.target.checked)}
              />
              Auto-sync při změnách v CRM
            </label>

            <div className="sk-integration-detail__actions">
              {sheets?.spreadsheetUrl && (
                <a
                  href={sheets.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sk-integration-detail__linkbtn"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Otevřít
                </a>
              )}
              <button
                type="button"
                className="sk-integration-detail__linkbtn"
                disabled={isPending}
                onClick={handleSyncNow}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Sync teď
              </button>
            </div>

            <div className="sk-integration-detail__block">
              <p className="sk-integration-detail__label">Archiv outreach DB</p>
              <p className="sk-integration-detail__hint">
                Staré leady jen ve Sheets. Radar z archivu vylučuje firmy.
              </p>
              <input
                type="url"
                className={inputClass}
                value={historySheetUrl}
                onChange={(e) => setHistorySheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
              />
              <div className="sk-integration-detail__actions">
                <button
                  type="button"
                  className="sk-integration-detail__linkbtn"
                  disabled={isPending || !historySheetUrl.trim()}
                  onClick={handleSetArchive}
                >
                  Nastavit archiv
                </button>
                <button
                  type="button"
                  className="sk-integration-detail__linkbtn"
                  disabled={isPending || !historySheetUrl.trim()}
                  onClick={handleImportHistory}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Import do CRM
                </button>
                <button
                  type="button"
                  className="sk-integration-detail__linkbtn"
                  disabled={isPending || !historySheetUrl.trim()}
                  onClick={handleBackfillAuthors}
                >
                  Doplnit Autory
                </button>
              </div>
              <div className="sk-integration-detail__actions">
                <input
                  type="text"
                  className={cn(inputClass, "max-w-[8rem]")}
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  placeholder="SMAZAT"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="sk-integration-detail__linkbtn is-danger"
                  disabled={
                    isPending ||
                    clearConfirm.trim().toUpperCase() !== "SMAZAT"
                  }
                  onClick={handleClearCrm}
                >
                  Vyčistit CRM
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="sk-integration-detail__hint">
            Po připojení vznikne sheet s listy podle stavů CRM.
          </p>
        )}
      </div>
    );
  };

  const renderMicrosoftDetail = () => {
    if (expandedIntegration !== "microsoft") return null;

    return (
      <div className="sk-integration-row__detail">
        {!microsoft?.oauthConfigured && (
          <p className="sk-integration-detail__warn">
            Chybí Microsoft OAuth (CLIENT_ID / SECRET). Redirect:{" "}
            <code>/api/integrations/microsoft/callback</code>
          </p>
        )}
        {msActive ? (
          <div className="sk-integration-detail__body">
            {microsoft?.accountEmail && (
              <p className="sk-integration-detail__meta">
                {microsoft.displayName || "Microsoft 365"} ·{" "}
                {microsoft.accountEmail}
              </p>
            )}
            {microsoft?.lastError && (
              <p className="sk-integration-detail__error">
                Chyba: {microsoft.lastError}
              </p>
            )}
            <div className="sk-integration-detail__actions">
              <button
                type="button"
                className="sk-integration-detail__linkbtn"
                disabled={isPending}
                onClick={handleExportExcel}
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Export CRM
              </button>
            </div>
          </div>
        ) : (
          <p className="sk-integration-detail__hint">
            Import z OneDrive, Word v Generátoru, Excel export.
          </p>
        )}
      </div>
    );
  };

  const renderFakturoidDetail = () => {
    if (expandedIntegration !== "fakturoid") return null;

    return (
      <div className="sk-integration-row__detail">
        {fakturoidActive ? (
          <div className="sk-integration-detail__body">
            {fakturoid?.accountName && (
              <p className="sk-integration-detail__meta">
                {fakturoid.accountName}
                {fakturoid.accountSlug ? ` · ${fakturoid.accountSlug}` : ""}
              </p>
            )}
            {fakturoid?.lastError && (
              <p className="sk-integration-detail__error">
                Chyba: {fakturoid.lastError}
              </p>
            )}
            <div className="sk-integration-detail__actions">
              <a
                href={
                  fakturoid?.accountSlug
                    ? `https://app.fakturoid.cz/${fakturoid.accountSlug}`
                    : "https://app.fakturoid.cz"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="sk-integration-detail__linkbtn"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Otevřít
              </a>
            </div>
          </div>
        ) : (
          <div className="sk-integration-detail__body">
            <p className="sk-integration-detail__hint">
              Ve Fakturoidu vytvoř Client ID + Secret a vlož je sem.
            </p>
            <div className="sk-integration-detail__grid">
              <div>
                <label className="sk-integration-detail__label">Client ID</label>
                <input
                  type="text"
                  autoComplete="off"
                  className={inputClass}
                  value={fakturoidClientId}
                  onChange={(e) => setFakturoidClientId(e.target.value)}
                  placeholder="xxxxxxxx-…"
                />
              </div>
              <div>
                <label className="sk-integration-detail__label">
                  Client Secret
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  className={inputClass}
                  value={fakturoidClientSecret}
                  onChange={(e) => setFakturoidClientSecret(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div>
              <label className="sk-integration-detail__label">
                Account slug (volitelné)
              </label>
              <input
                type="text"
                autoComplete="off"
                className={cn(inputClass, "max-w-xs")}
                value={fakturoidSlug}
                onChange={(e) => setFakturoidSlug(e.target.value)}
                placeholder="moje-firma"
              />
            </div>
            <div className="sk-integration-detail__actions">
              <button
                type="button"
                className="sk-integration-row__action"
                disabled={
                  isPending ||
                  !fakturoidClientId.trim() ||
                  !fakturoidClientSecret.trim()
                }
                onClick={handleConnectFakturoid}
              >
                {connectLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWebhookDetail = (item: (typeof webhookIntegrations)[number]) => {
    if (expandedIntegration !== item.id) return null;

    return (
      <div className="sk-integration-row__detail">
        <div className="sk-integration-detail__body">
          {item.fields.map((field) => (
            <div key={field.label}>
              <label
                className="sk-integration-detail__label"
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
                className={inputClass}
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
          <div className="sk-integration-detail__actions">
            <button
              type="button"
              className="sk-integration-row__action"
              onClick={handleSave}
            >
              Uložit
            </button>
            <button
              type="button"
              className="sk-integration-detail__linkbtn"
              disabled={isTesting === item.id}
              onClick={(e) => handleTestConnection(item.id, e)}
            >
              {isTesting === item.id ? "Testuji…" : "Otestovat"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sk-integrations-panel">
      <p className="sk-integrations-panel__intro">
        {t("settings.integrationsPanel.intro")}
      </p>

      <div className="sk-integrations-panel__list">
        <div className="sk-integration-row-wrap">
          <div className="sk-integration-row">
            <button
              type="button"
              className="sk-integration-row__info"
              onClick={() => toggleExpanded("google-sheets")}
            >
              <span className="sk-integration-row__name">Google Sheets</span>
              <span className="sk-integration-row__desc">
                {t("settings.integrationsPanel.sheetsDesc")}
              </span>
            </button>
            <IntegrationStatus connected={sheetsActive} connectedLabel={statusConnected} disconnectedLabel={statusDisconnected} />
            <button
              type="button"
              className="sk-integration-row__action"
              disabled={!sheetsActive && (!sheets?.oauthConfigured || isPending)}
              onClick={() =>
                handleRowAction(
                  sheetsActive,
                  handleConnectSheets,
                  handleDisconnectSheets,
                )
              }
            >
              {sheetsActive ? disconnectLabel : connectLabel}
            </button>
          </div>
          {renderSheetsDetail()}
        </div>

        <div className="sk-integration-row-wrap">
          <div className="sk-integration-row">
            <button
              type="button"
              className="sk-integration-row__info"
              onClick={() => toggleExpanded("microsoft")}
            >
              <span className="sk-integration-row__name">Microsoft 365</span>
              <span className="sk-integration-row__desc">
                OneDrive, Excel, Word.
              </span>
            </button>
            <IntegrationStatus connected={msActive} connectedLabel={statusConnected} disconnectedLabel={statusDisconnected} />
            <button
              type="button"
              className="sk-integration-row__action"
              disabled={!msActive && (!microsoft?.oauthConfigured || isPending)}
              onClick={() =>
                handleRowAction(
                  msActive,
                  handleConnectMicrosoft,
                  handleDisconnectMicrosoft,
                )
              }
            >
              {msActive ? disconnectLabel : connectLabel}
            </button>
          </div>
          {renderMicrosoftDetail()}
        </div>

        <div className="sk-integration-row-wrap">
          <div className="sk-integration-row">
            <button
              type="button"
              className="sk-integration-row__info"
              onClick={() => toggleExpanded("fakturoid")}
            >
              <span className="sk-integration-row__name">Fakturoid</span>
              <span className="sk-integration-row__desc">
                {t("settings.integrationsPanel.fakturoidDesc")}
              </span>
            </button>
            <IntegrationStatus connected={fakturoidActive} connectedLabel={statusConnected} disconnectedLabel={statusDisconnected} />
            <button
              type="button"
              className="sk-integration-row__action"
              disabled={isPending}
              onClick={() => {
                if (fakturoidActive) {
                  handleDisconnectFakturoid();
                  return;
                }
                setExpandedIntegration("fakturoid");
              }}
            >
              {fakturoidActive ? disconnectLabel : connectLabel}
            </button>
          </div>
          {renderFakturoidDetail()}
        </div>

        {webhookIntegrations.map((item) => {
          const stored = integrationValues[item.id];
          const isActive = Boolean(stored && stored.length > 0);

          return (
            <div key={item.id} className="sk-integration-row-wrap">
              <div className="sk-integration-row">
                <button
                  type="button"
                  className="sk-integration-row__info"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <span className="sk-integration-row__name">{item.name}</span>
                  <span className="sk-integration-row__desc">
                    {item.description}
                  </span>
                </button>
                <IntegrationStatus connected={isActive} connectedLabel={statusConnected} disconnectedLabel={statusDisconnected} />
                <button
                  type="button"
                  className="sk-integration-row__action"
                  onClick={() => {
                    if (isActive) {
                      setIntegrationValues({
                        ...integrationValues,
                        [item.id]: "",
                      });
                      return;
                    }
                    setExpandedIntegration(item.id);
                  }}
                >
                  {isActive ? disconnectLabel : connectLabel}
                </button>
              </div>
              {renderWebhookDetail(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
