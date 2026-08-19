"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cloud, Mail, Server, Settings } from "lucide-react";
import { toast } from "sonner";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";

type EmailProviderId =
  | "google"
  | "outlook"
  | "seznam"
  | "zoho"
  | "icloud"
  | "custom-smtp";

const PROVIDERS: {
  id: EmailProviderId;
  name: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    id: "google",
    name: "Google Workspace",
    description:
      "Připojte firemní Gmail nebo Google Workspace přes bezpečné OAuth přihlášení.",
    icon: (
      <span style={{ fontSize: 18, fontWeight: 800, color: "#4285F4" }}>G</span>
    ),
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description:
      "Integrujte Microsoft 365 nebo Outlook.com pro odesílání kampaní z vaší schránky.",
    icon: <Mail className="h-5 w-5" />,
  },
  {
    id: "seznam",
    name: "Seznam.cz & Email.cz",
    description:
      "Rychlé propojení českých schránek od Seznamu pomocí protokolu IMAP/SMTP.",
    icon: <Mail className="h-5 w-5" />,
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    description:
      "Připojte profesionální firemní schránky Zoho přes bezpečné aplikační heslo.",
    icon: <Server className="h-5 w-5" />,
  },
  {
    id: "icloud",
    name: "iCloud Mail",
    description:
      "Propojení osobních nebo firemních Apple účtů pro menší klientské kampaně.",
    icon: <Cloud className="h-5 w-5" />,
  },
  {
    id: "custom-smtp",
    name: "Vlastní SMTP",
    description: "Ruční nastavení SMTP pro libovolného poskytovatele e-mailu.",
    icon: <Settings className="h-5 w-5" />,
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

  function handleProviderClick(providerKey: EmailProviderId) {
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
    <div className="sk-connect-email">
      <Link href="/settings/outreach" className="sk-connect-email__back">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Zpět do nastavení
      </Link>

      <div className="sk-connect-email__head">
        <div className="sk-connect-email__icon">
          <Mail className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="sk-page-head__title">Připojit novou e-mailovou schránku</h1>
        <p className="sk-page-head__sub">
          Vyberte poskytovatele. Google použije OAuth, ostatní otevřou SMTP
          nastavení v Pracovním prostoru.
        </p>
      </div>

      <div className="sk-connect-email__grid">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleProviderClick(provider.id)}
            className="sk-connect-email__card"
          >
            <div className="sk-connect-email__card-icon">{provider.icon}</div>
            <h2 className="sk-connect-email__card-title">{provider.name}</h2>
            <p className="sk-connect-email__card-desc">{provider.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
