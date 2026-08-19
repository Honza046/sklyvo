"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import {
  disconnectEmailConnection,
  saveSmtpEmailConnection,
} from "@/app/actions/email-connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import type { EmailConnectionState } from "@/lib/email-connection-types";
import { useSettingsSaveRegistry } from "@/app/settings/ai-behavior-settings-form";
import { cn } from "@/lib/utils";

type EmailIntegrationPanelProps = {
  initialState: EmailConnectionState;
  compact?: boolean;
  matej?: boolean;
};

type ConnectionTab = "google" | "smtp";

const inputClass = "sk-settings-field h-9 text-sm";

function smtpModeToggleClass(active: boolean, compact?: boolean) {
  return cn(
    "rounded-lg font-medium transition-all duration-200",
    compact ? "flex-1 px-2 py-1.5 text-[11px]" : "flex-1 rounded-xl px-3 py-2 text-sm",
    active
      ? "bg-[color:var(--sk-brand)] text-white shadow-sm hover:bg-[color:var(--sk-brand)]/90"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200/80",
  );
}

function connectionTabClass(active: boolean) {
  return cn(
    "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all sm:text-xs",
    active
      ? "bg-[color:var(--sk-brand)] text-white shadow-sm"
      : "bg-muted/50 text-muted-foreground hover:text-foreground",
  );
}

export function EmailIntegrationPanel({
  initialState,
  compact = false,
  matej = false,
}: EmailIntegrationPanelProps) {
  const { t } = useLanguage();
  const registry = useSettingsSaveRegistry();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [connectionTab, setConnectionTab] = useState<ConnectionTab>("smtp");
  const [smtpProvider, setSmtpProvider] = useState<
    "OUTLOOK_SMTP" | "CUSTOM_SMTP"
  >(() =>
    initialState.provider === "CUSTOM_SMTP" ? "CUSTOM_SMTP" : "OUTLOOK_SMTP",
  );
  const [form, setForm] = useState({
    senderName:
      initialState.senderName ?? initialState.suggestedSenderName ?? "",
    senderEmail:
      initialState.senderEmail ?? initialState.suggestedSenderEmail ?? "",
    smtpHost: initialState.smtpHost ?? "smtp.office365.com",
    smtpPort: initialState.smtpPort?.toString() ?? "587",
    appPassword: "",
  });

  const applySeznamPreset = () => {
    setSmtpProvider("CUSTOM_SMTP");
    setForm((prev) => ({
      ...prev,
      senderEmail:
        prev.senderEmail.trim() || state.suggestedSenderEmail?.trim() || "",
      senderName:
        prev.senderName.trim() || state.suggestedSenderName?.trim() || "",
      smtpHost: "smtp.seznam.cz",
      smtpPort: "465",
    }));
  };

  useEffect(() => {
    setState(initialState);
    setForm((prev) => ({
      ...prev,
      senderName:
        initialState.senderName ??
        initialState.suggestedSenderName ??
        prev.senderName,
      senderEmail:
        initialState.senderEmail ??
        initialState.suggestedSenderEmail ??
        prev.senderEmail,
      smtpHost: initialState.smtpHost ?? prev.smtpHost,
      smtpPort: initialState.smtpPort?.toString() ?? prev.smtpPort,
    }));
    if (initialState.provider === "GOOGLE") {
      setConnectionTab("google");
    }
  }, [initialState]);

  useEffect(() => {
    const connected = searchParams.get("emailConnected");
    const error = searchParams.get("emailError");
    const smtpMode = searchParams.get("smtpMode");
    const smtpHost = searchParams.get("smtpHost");
    const smtpPort = searchParams.get("smtpPort");

    if (smtpMode === "OUTLOOK_SMTP" || smtpMode === "CUSTOM_SMTP") {
      setSmtpProvider(smtpMode);
      setConnectionTab("smtp");
    }
    if (smtpHost || smtpPort) {
      setForm((prev) => ({
        ...prev,
        ...(smtpHost ? { smtpHost } : {}),
        ...(smtpPort ? { smtpPort } : {}),
      }));
      setConnectionTab("smtp");
    }

    if (connected === "google") {
      toast.success(t("settings.emailIntegration.connectedGoogle"));
      router.replace("/settings/outreach", { scroll: false });
    } else if (error) {
      toast.error(decodeURIComponent(error));
      router.replace("/settings/outreach", { scroll: false });
    }
  }, [router, searchParams, t]);

  const handleGoogleConnect = () => {
    window.location.href = "/api/email/google/authorize";
  };

  const handleSaveSmtp = useCallback(async () => {
    const result = await saveSmtpEmailConnection({
      provider: smtpProvider,
      senderName: form.senderName,
      senderEmail: form.senderEmail,
      smtpHost: form.smtpHost,
      smtpPort: Number(form.smtpPort),
      appPassword: form.appPassword,
    });

    if ("error" in result && result.error) {
      toast.error(result.error);
      return false;
    }

    toast.success(t("settings.emailIntegration.connectedSmtp"));
    setForm((prev) => ({ ...prev, appPassword: "" }));
    startTransition(() => router.refresh());
    return true;
  }, [
    form.appPassword,
    form.senderEmail,
    form.senderName,
    form.smtpHost,
    form.smtpPort,
    router,
    smtpProvider,
    t,
  ]);

  const handleSaveSmtpClick = async () => {
    setIsSaving(true);
    await handleSaveSmtp();
    setIsSaving(false);
  };

  useEffect(() => {
    if (!registry || !matej) return;
    return registry.registerSaveHandler("email-smtp", async () => {
      if (connectionTab !== "smtp") return true;
      if (!form.appPassword.trim()) return true;
      return handleSaveSmtp();
    });
  }, [connectionTab, form.appPassword, handleSaveSmtp, matej, registry]);

  const handleDisconnect = useCallback(async () => {
    const result = await disconnectEmailConnection();
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("settings.emailIntegration.disconnected"));
    startTransition(() => router.refresh());
  }, [router, t]);

  const statusCardClass = state.connected
    ? "border-[color-mix(in_oklab,#34d399_30%,transparent)] bg-[color-mix(in_oklab,#34d399_14%,var(--n-field))]"
    : "border-amber-200 bg-amber-50/70";

  const smtpForm = (
    <>
      <div className={cn("flex flex-wrap gap-1.5", compact ? "mb-2 shrink-0" : "mb-4")}>
        <button
          type="button"
          className={smtpModeToggleClass(smtpProvider === "OUTLOOK_SMTP", compact)}
          onClick={() => {
            setSmtpProvider("OUTLOOK_SMTP");
            setForm((prev) => ({
              ...prev,
              smtpHost: "smtp.office365.com",
              smtpPort: "587",
            }));
          }}
        >
          Outlook
        </button>
        <button
          type="button"
          className={smtpModeToggleClass(
            smtpProvider === "CUSTOM_SMTP" && form.smtpHost.includes("seznam"),
            compact,
          )}
          onClick={applySeznamPreset}
        >
          Seznam
        </button>
        <button
          type="button"
          className={smtpModeToggleClass(
            smtpProvider === "CUSTOM_SMTP" && !form.smtpHost.includes("seznam"),
            compact,
          )}
          onClick={() => setSmtpProvider("CUSTOM_SMTP")}
        >
          {t("settings.emailIntegration.customSmtp")}
        </button>
      </div>

      {form.smtpHost.includes("seznam") ? (
        <p
          className={cn(
            "rounded-lg border border-amber-200 bg-amber-50 text-amber-900",
            compact ? "mb-2 px-2 py-1.5 text-[10px] leading-snug" : "mb-3 px-3 py-2 text-xs",
          )}
        >
          Seznam: heslo k e-mailu nebo heslo aplikace. Host{" "}
          <code className="font-mono">smtp.seznam.cz</code>, port{" "}
          <code className="font-mono">465</code>.
        </p>
      ) : null}

      <div
        className={cn(
          compact
            ? "flex min-h-0 flex-1 flex-col justify-between gap-2"
            : "space-y-3",
        )}
      >
        <div className={cn(compact ? "space-y-2" : "space-y-3")}>
          <div className={cn(compact ? "grid grid-cols-2 gap-2" : "space-y-3")}>
            <div className="space-y-1">
              <Label htmlFor="sender-name" className="text-[10px]">
                {t("settings.emailIntegration.senderName")}
              </Label>
              <Input
                id="sender-name"
                value={form.senderName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    senderName: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Jan Novák"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sender-email" className="text-[10px]">
                {t("settings.emailIntegration.senderEmail")}
              </Label>
              <Input
                id="sender-email"
                type="email"
                value={form.senderEmail}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    senderEmail: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="jan@firma.cz"
              />
            </div>
          </div>

          {smtpProvider === "CUSTOM_SMTP" ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="smtp-host" className="text-[10px]">
                  {t("settings.emailIntegration.smtpHost")}
                </Label>
                <Input
                  id="smtp-host"
                  value={form.smtpHost}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      smtpHost: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="smtp-port" className="text-[10px]">
                  {t("settings.emailIntegration.smtpPort")}
                </Label>
                <Input
                  id="smtp-port"
                  value={form.smtpPort}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      smtpPort: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="app-password" className="text-[10px]">
              {t("settings.emailIntegration.appPassword")}
            </Label>
            <Input
              id="app-password"
              type="password"
              value={form.appPassword}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  appPassword: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="••••••••••••••••"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={() => void handleSaveSmtpClick()}
          disabled={isSaving}
          className={cn(
            "w-full rounded-xl bg-[color:var(--sk-brand)] font-semibold text-white hover:bg-[color:var(--sk-brand)]/90",
            compact ? "mt-auto h-9 shrink-0 text-xs" : "",
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            t("settings.emailIntegration.saveSmtp")
          )}
        </Button>
      </div>
    </>
  );

  if (matej) {
    return (
      <div className="sk-outreach-email">
        <div
          className={cn(
            "sk-outreach-status",
            state.connected && "sk-outreach-status--connected",
          )}
        >
          <span className="sk-outreach-status__dot" aria-hidden />
          <div className="sk-outreach-status__copy">
            <p className="sk-outreach-status__text">
              {state.connected
                ? t("settings.emailIntegration.statusConnectedPlain")
                : t("settings.emailIntegration.statusDisconnectedPlain")}
            </p>
            {state.connected && state.senderEmail ? (
              <p className="sk-outreach-status__meta">
                {state.senderName ? `${state.senderName} · ` : ""}
                {state.senderEmail}
              </p>
            ) : null}
            {state.lastError ? (
              <p className="sk-outreach-status__error">{state.lastError}</p>
            ) : null}
          </div>
          {state.connected ? (
            <button
              type="button"
              className="sk-outreach-status__disconnect"
              onClick={() => void handleDisconnect()}
              disabled={isPending}
            >
              {t("settings.emailIntegration.disconnect")}
            </button>
          ) : null}
        </div>

        <div className="sk-outreach-tabs" role="tablist" aria-label={t("settings.companyEmail")}>
          <button
            type="button"
            role="tab"
            aria-selected={connectionTab === "google"}
            className={cn(
              "sk-outreach-tabs__btn",
              connectionTab === "google" && "sk-outreach-tabs__btn--active",
            )}
            onClick={() => setConnectionTab("google")}
          >
            Google / Gmail
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={connectionTab === "smtp"}
            className={cn(
              "sk-outreach-tabs__btn",
              connectionTab === "smtp" && "sk-outreach-tabs__btn--active",
            )}
            onClick={() => setConnectionTab("smtp")}
          >
            Outlook / SMTP
          </button>
        </div>

        {connectionTab === "google" ? (
          <div className="sk-outreach-google">
            <p className="sk-outreach-google__desc">
              {t("settings.emailIntegration.googleDescription")}
            </p>
            <button
              type="button"
              className="sk-btn sk-btn--white sk-outreach-google__btn"
              onClick={handleGoogleConnect}
            >
              {t("settings.emailIntegration.googleButton")}
            </button>
          </div>
        ) : (
          <div className="sk-outreach-smtp">
            <div className="sk-outreach-pills">
              <button
                type="button"
                className={cn(
                  "sk-outreach-pill",
                  smtpProvider === "OUTLOOK_SMTP" && "sk-outreach-pill--active",
                )}
                onClick={() => {
                  setSmtpProvider("OUTLOOK_SMTP");
                  setForm((prev) => ({
                    ...prev,
                    smtpHost: "smtp.office365.com",
                    smtpPort: "587",
                  }));
                }}
              >
                Outlook
              </button>
              <button
                type="button"
                className={cn(
                  "sk-outreach-pill",
                  smtpProvider === "CUSTOM_SMTP" &&
                    form.smtpHost.includes("seznam") &&
                    "sk-outreach-pill--active",
                )}
                onClick={applySeznamPreset}
              >
                Seznam
              </button>
              <button
                type="button"
                className={cn(
                  "sk-outreach-pill",
                  smtpProvider === "CUSTOM_SMTP" &&
                    !form.smtpHost.includes("seznam") &&
                    "sk-outreach-pill--active",
                )}
                onClick={() => setSmtpProvider("CUSTOM_SMTP")}
              >
                {t("settings.emailIntegration.customSmtp")}
              </button>
            </div>

            {form.smtpHost.includes("seznam") ? (
              <p className="sk-outreach-note">
                Seznam: heslo k e-mailu nebo heslo aplikace. Host{" "}
                <code>smtp.seznam.cz</code>, port <code>465</code>.
              </p>
            ) : null}

            <div className="sk-outreach-form-grid sk-outreach-form-grid--two">
              <div className="sk-outreach-field-wrap">
                <Label htmlFor="sender-name" className="sk-outreach-field-label">
                  {t("settings.emailIntegration.senderNameLabel")}
                </Label>
                <input
                  id="sender-name"
                  value={form.senderName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      senderName: event.target.value,
                    }))
                  }
                  className="sk-outreach-input"
                  placeholder="Jan Novák"
                />
              </div>
              <div className="sk-outreach-field-wrap">
                <Label htmlFor="sender-email" className="sk-outreach-field-label">
                  {t("settings.emailIntegration.senderEmailLabel")}
                </Label>
                <input
                  id="sender-email"
                  type="email"
                  value={form.senderEmail}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      senderEmail: event.target.value,
                    }))
                  }
                  className="sk-outreach-input"
                  placeholder="jan@firma.cz"
                />
              </div>
            </div>

            {smtpProvider === "CUSTOM_SMTP" ? (
              <div className="sk-outreach-form-grid sk-outreach-form-grid--smtp">
                <div className="sk-outreach-field-wrap sk-outreach-field-wrap--host">
                  <Label htmlFor="smtp-host" className="sk-outreach-field-label">
                    {t("settings.emailIntegration.smtpHostLabel")}
                  </Label>
                  <input
                    id="smtp-host"
                    value={form.smtpHost}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        smtpHost: event.target.value,
                      }))
                    }
                    className="sk-outreach-input"
                  />
                </div>
                <div className="sk-outreach-field-wrap">
                  <Label htmlFor="smtp-port" className="sk-outreach-field-label">
                    {t("settings.emailIntegration.smtpPortLabel")}
                  </Label>
                  <input
                    id="smtp-port"
                    value={form.smtpPort}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        smtpPort: event.target.value,
                      }))
                    }
                    className="sk-outreach-input"
                  />
                </div>
              </div>
            ) : null}

            <div className="sk-outreach-field-wrap">
              <Label htmlFor="app-password" className="sk-outreach-field-label">
                {t("settings.emailIntegration.appPasswordLabel")}
              </Label>
              <input
                id="app-password"
                type="password"
                value={form.appPassword}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    appPassword: event.target.value,
                  }))
                }
                className="sk-outreach-input"
                placeholder="••••••••••••••••"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div
          className={cn(
            "flex shrink-0 items-start gap-2 rounded-xl border px-2.5 py-2",
            statusCardClass,
          )}
        >
          {state.connected ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:#6ee7b7]" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-snug text-foreground">
              {state.connected
                ? t("settings.emailIntegration.statusConnected")
                : t("settings.emailIntegration.statusDisconnected")}
            </p>
            {state.connected && state.senderEmail ? (
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {state.senderName ? `${state.senderName} · ` : ""}
                {state.senderEmail}
              </p>
            ) : null}
            {state.lastError ? (
              <p className="mt-0.5 text-[10px] leading-snug text-rose-600">
                {state.lastError}
              </p>
            ) : null}
          </div>
          {state.connected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-lg px-2 text-[10px]"
              onClick={() => void handleDisconnect()}
              disabled={isPending}
            >
              <Unplug className="mr-1 h-3 w-3" />
              {t("settings.emailIntegration.disconnect")}
            </Button>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            className={connectionTabClass(connectionTab === "google")}
            onClick={() => setConnectionTab("google")}
          >
            Google / Gmail
          </button>
          <button
            type="button"
            className={connectionTabClass(connectionTab === "smtp")}
            onClick={() => setConnectionTab("smtp")}
          >
            Outlook / SMTP
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {connectionTab === "google" ? (
            <div className="flex h-full min-h-0 flex-col rounded-xl border border-border/60 bg-card/50 p-3">
              <div className="mb-3 flex shrink-0 items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-card text-sm font-bold text-[#4285F4]">
                  G
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold">
                    {t("settings.emailIntegration.googleTitle")}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {t("settings.emailIntegration.googleDescription")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleGoogleConnect}
                className="mt-auto h-9 w-full shrink-0 rounded-xl bg-card text-xs font-semibold text-[#4285F4] shadow-sm ring-1 ring-border hover:bg-muted/40"
              >
                {t("settings.emailIntegration.googleButton")}
              </Button>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col rounded-xl border border-border/60 bg-card/50 p-3">
              <div className="mb-2 flex shrink-0 items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_oklab,var(--sk-brand)_28%,transparent)] bg-[color-mix(in_oklab,var(--sk-brand)_14%,var(--n-field))] text-[color:var(--sk-brand)]">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold">
                    {t("settings.emailIntegration.smtpTitle")}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {t("settings.emailIntegration.smtpDescription")}
                  </p>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">{smtpForm}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("settings.emailIntegration.description")}
      </p>

      <div className={cn("rounded-2xl border p-4", statusCardClass)}>
        <div className="flex items-start gap-3">
          {state.connected ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[color:#6ee7b7]" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              {state.connected
                ? t("settings.emailIntegration.statusConnected")
                : t("settings.emailIntegration.statusDisconnected")}
            </p>
            {state.connected && state.senderEmail && (
              <p className="mt-1 text-sm text-muted-foreground">
                {state.senderName ? `${state.senderName} · ` : ""}
                {state.senderEmail}
                {state.provider ? ` · ${state.provider}` : ""}
              </p>
            )}
            {state.lastError && (
              <p className="mt-1 text-xs text-rose-600">{state.lastError}</p>
            )}
          </div>
          {state.connected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-xl"
              onClick={() => void handleDisconnect()}
              disabled={isPending}
            >
              <Unplug className="mr-2 h-4 w-4" />
              {t("settings.emailIntegration.disconnect")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-card">
              <span className="sk-type-h2 leading-none">
                <span className="text-[#4285F4]">G</span>
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold">
                {t("settings.emailIntegration.googleTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("settings.emailIntegration.googleDescription")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleGoogleConnect}
            className="w-full rounded-xl bg-card font-semibold text-[#4285F4] shadow-sm ring-1 ring-border hover:bg-muted/40"
          >
            {t("settings.emailIntegration.googleButton")}
          </Button>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--sk-brand)_28%,transparent)] bg-[color-mix(in_oklab,var(--sk-brand)_14%,var(--n-field))] text-[color:var(--sk-brand)]">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold">
                {t("settings.emailIntegration.smtpTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("settings.emailIntegration.smtpDescription")}
              </p>
            </div>
          </div>
          {smtpForm}
        </div>
      </div>
    </div>
  );
}
