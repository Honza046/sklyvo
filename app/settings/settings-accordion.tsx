"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Accordion } from "@/components/ui/accordion";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";

type SettingsAccordionProps = {
  children: ReactNode;
};

function shouldOpenEmailIntegration(searchParams: URLSearchParams, hash: string) {
  if (hash === EMAIL_SETUP_SETTINGS_HASH || hash === "email-integration-trigger") {
    return true;
  }
  return Boolean(
    searchParams.get("smtpMode") ||
      searchParams.get("smtpHost") ||
      searchParams.get("emailConnected") ||
      searchParams.get("emailError"),
  );
}

function shouldOpenIntegrations(searchParams: URLSearchParams, hash: string) {
  if (hash === "integrations" || hash === "integrations-trigger") {
    return true;
  }
  return Boolean(searchParams.get("sheetsConnected") || searchParams.get("sheetsError"));
}

export function SettingsAccordion({ children }: SettingsAccordionProps) {
  const searchParams = useSearchParams();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const openEmail = shouldOpenEmailIntegration(searchParams, hash);
    const openIntegrations = shouldOpenIntegrations(searchParams, hash);
    const selected = openEmail
      ? "email-integration"
      : openIntegrations
        ? "integrations"
        : "";

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
        hypothesisId: "E",
        location: "settings-accordion.tsx:effect",
        message: "Settings accordion deep-link resolve",
        data: {
          hash,
          openEmail,
          openIntegrations,
          smtpMode: searchParams.get("smtpMode"),
          selected,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!selected) return;

    setValue(selected);
    const scrollTarget =
      selected === "email-integration" ? EMAIL_SETUP_SETTINGS_HASH : "integrations";
    const scroll = () => {
      document.getElementById(scrollTarget)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) scroll();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <Accordion
      type="single"
      collapsible
      value={value}
      onValueChange={setValue}
      className="w-full space-y-4"
    >
      {children}
    </Accordion>
  );
}
