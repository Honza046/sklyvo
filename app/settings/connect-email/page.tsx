"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cloud, Mail, Server, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";
import { cn } from "@/lib/utils";

type EmailProviderId =
  "google" | "outlook" | "seznam" | "zoho" | "icloud" | "custom-smtp";

const CARD_BASE_CLASS =
  "group flex h-full cursor-pointer flex-col rounded-2xl border border-border/60 bg-card p-6 text-left shadow-sm transition-all hover:shadow-md";

const PROVIDERS: {
  id: EmailProviderId;
  name: string;
  description: string;
  icon: ReactNode;
  iconWrapClassName: string;
  hoverBorderClassName: string;
  titleHoverClassName: string;
}[] = [
  {
    id: "google",
    name: "Google Workspace",
    description:
      "Připojte firemní Gmail nebo Google Workspace přes bezpečné OAuth přihlášení.",
    icon: (
      <span className="sk-type-h2 leading-none">
        <span className="text-[#4285F4]">G</span>
      </span>
    ),
    iconWrapClassName: "border-red-100 bg-white text-[#4285F4] ",
    hoverBorderClassName: "hover:border-[#4285F4]/40 [#4285F4]/50",
    titleHoverClassName: "group-hover:text-[#4285F4]",
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description:
      "Integrujte Microsoft 365 nebo Outlook.com pro odesílání kampaní z vaší schránky.",
    icon: <Mail className="h-5 w-5" />,
    iconWrapClassName: "border-blue-100 bg-blue-50 text-blue-600 ",
    hoverBorderClassName: "hover:border-blue-300 ",
    titleHoverClassName: "group-hover:text-blue-600 ",
  },
  {
    id: "seznam",
    name: "Seznam.cz & Email.cz",
    description:
      "Rychlé propojení českých schránek od Seznamu pomocí protokolu IMAP/SMTP.",
    icon: <Mail className="h-5 w-5" />,
    iconWrapClassName: "border-orange-100 bg-orange-50 text-orange-600 ",
    hoverBorderClassName: "hover:border-orange-300 ",
    titleHoverClassName: "group-hover:text-orange-600 ",
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    description:
      "Připojte profesionální firemní schránky Zoho přes bezpečné aplikační heslo.",
    icon: <Server className="h-5 w-5" />,
    iconWrapClassName: "border-teal-100 bg-teal-50 text-teal-600 ",
    hoverBorderClassName: "hover:border-teal-300 ",
    titleHoverClassName: "group-hover:text-teal-600 ",
  },
  {
    id: "icloud",
    name: "iCloud Mail",
    description:
      "Propojení osobních nebo firemních Apple účtů pro menší klientské kampaně.",
    icon: <Cloud className="h-5 w-5" />,
    iconWrapClassName: "border-sky-100 bg-sky-50 text-sky-600 ",
    hoverBorderClassName: "hover:border-sky-300 ",
    titleHoverClassName: "group-hover:text-sky-600 ",
  },
  {
    id: "custom-smtp",
    name: "Vlastní SMTP",
    description: "Ruční nastavení SMTP pro libovolného poskytovatele e-mailu.",
    icon: <Settings className="h-5 w-5" />,
    iconWrapClassName: "border-slate-200 bg-slate-50 text-slate-600 ",
    hoverBorderClassName: "hover:border-slate-300 ",
    titleHoverClassName: "group-hover:text-slate-700 ",
  },
];

const SMTP_PRESETS: Partial<
  Record<
    EmailProviderId,
    { mode: "OUTLOOK_SMTP" | "CUSTOM_SMTP"; host?: string; port?: string }
  >
> = {
  outlook: { mode: "OUTLOOK_SMTP", host: "smtp.office365.com", port: "587" },
  seznam: { mode: "CUSTOM_SMTP", host: "smtp.seznam.cz", port: "465" },
  zoho: { mode: "CUSTOM_SMTP", host: "smtp.zoho.eu", port: "465" },
  icloud: { mode: "CUSTOM_SMTP", host: "smtp.mail.me.com", port: "587" },
  "custom-smtp": { mode: "CUSTOM_SMTP" },
};

export default function ConnectEmailPage() {
  const router = useRouter();

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7935/ingest/cd58245d-3cee-42b5-b476-9501fa947d37", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "dc49be",
      },
      body: JSON.stringify({
        sessionId: "dc49be",
        runId: "post-fix",
        hypothesisId: "C",
        location: "connect-email/page.tsx:mount",
        message: "Connect-email page mounted (wired)",
        data: { wired: true },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  function handleProviderClick(providerKey: EmailProviderId) {
    // #region agent log
    fetch("http://127.0.0.1:7935/ingest/cd58245d-3cee-42b5-b476-9501fa947d37", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "dc49be",
      },
      body: JSON.stringify({
        sessionId: "dc49be",
        runId: "post-fix",
        hypothesisId: "C",
        location: "connect-email/page.tsx:click",
        message: "Connect-email provider clicked",
        data: { providerKey, isStub: false },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (providerKey === "google") {
      window.location.href = "/api/email/google/authorize";
      return;
    }

    const preset = SMTP_PRESETS[providerKey];
    const params = new URLSearchParams();
    if (preset?.mode) params.set("smtpMode", preset.mode);
    if (preset?.host) params.set("smtpHost", preset.host);
    if (preset?.port) params.set("smtpPort", preset.port);
    const qs = params.toString();
    toast.success("Otevíráme nastavení e-mailové integrace…");
    router.push(
      `/settings/outreach${qs ? `?${qs}` : ""}#${EMAIL_SETUP_SETTINGS_HASH}`,
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-start pb-12 pt-0">
      <div className="w-full px-0">
        <Button
          asChild
          variant="ghost"
          className="mb-6 -ml-2 h-9 rounded-xl px-3 text-muted-foreground hover:text-foreground"
        >
          <Link href="/settings/outreach">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět do nastavení
          </Link>
        </Button>

        <div className="mb-8 space-y-2 text-center">
          <div className="mb-2 flex items-center justify-center">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-600 ">
              <Mail className="h-8 w-8" />
            </div>
          </div>
          <h1 className="sk-type-h1">Připojit novou e-mailovou schránku</h1>
          <p className="sk-page-desc sk-type-body">
            Vyberte poskytovatele. Google použije OAuth, ostatní otevřou SMTP
            nastavení v Pracovním prostoru.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleProviderClick(provider.id)}
              className={cn(CARD_BASE_CLASS, provider.hoverBorderClassName)}
            >
              <div
                className={cn(
                  "mb-4 flex size-10 shrink-0 aspect-square items-center justify-center rounded-xl border",
                  provider.iconWrapClassName,
                )}
              >
                {provider.icon}
              </div>
              <h2
                className={cn(
                  "mb-2 text-base font-bold transition-colors",
                  provider.titleHoverClassName,
                )}
              >
                {provider.name}
              </h2>
              <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                {provider.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
