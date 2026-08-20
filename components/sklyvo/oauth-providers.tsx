"use client";

import { useState } from "react";
import {
  FacebookIcon,
  GoogleIcon,
  LinkedInIcon,
} from "@/components/sklyvo/provider-icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type OAuthProvider = "google" | "facebook" | "linkedin_oidc";

const OAUTH_PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
  linkedin_oidc: "LinkedIn",
};

const PROVIDERS: {
  id: OAuthProvider;
  label: string;
  Icon: typeof GoogleIcon;
}[] = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "facebook", label: "Facebook", Icon: FacebookIcon },
  { id: "linkedin_oidc", label: "LinkedIn", Icon: LinkedInIcon },
];

export function useOAuthLogin() {
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);

  async function handleOAuthLogin(
    provider: OAuthProvider,
    onError: (message: string) => void,
  ) {
    setOauthPending(provider);
    const label = OAUTH_PROVIDER_LABEL[provider];

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          ...(provider === "google"
            ? { queryParams: { prompt: "select_account" } }
            : {}),
          ...(provider === "facebook"
            ? { scopes: "email,public_profile" }
            : {}),
          ...(provider === "linkedin_oidc"
            ? { scopes: "openid profile email" }
            : {}),
        },
      });
      if (error) {
        console.error(`Chyba ${label} přihlášení:`, error);
        onError(`Nepodařilo se připojit k ${label}. Zkuste to prosím znovu.`);
        setOauthPending(null);
      }
    } catch (e) {
      console.error(`Chyba ${label} přihlášení:`, e);
      onError(
        "Konfigurace přihlášení není kompletní (Supabase). Zkontrolujte proměnné prostředí.",
      );
      setOauthPending(null);
    }
  }

  return { oauthPending, handleOAuthLogin };
}

export function OAuthProviderButtons({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (provider: OAuthProvider) => void;
}) {
  return (
    <div className="l2-providers">
      {PROVIDERS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="l2-provider"
          aria-label={label}
          onClick={() => onSelect(id)}
          disabled={disabled}
        >
          <Icon size={id === "linkedin_oidc" ? 20 : 17} />
        </button>
      ))}
    </div>
  );
}
