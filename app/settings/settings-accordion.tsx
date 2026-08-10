"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Accordion } from "@/components/ui/accordion";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";

type SettingsAccordionProps = {
  children: ReactNode;
};

function shouldOpenEmailIntegration(
  searchParams: URLSearchParams,
  hash: string,
) {
  if (
    hash === EMAIL_SETUP_SETTINGS_HASH ||
    hash === "email-integration-trigger"
  ) {
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
  return Boolean(
    searchParams.get("sheetsConnected") || searchParams.get("sheetsError"),
  );
}

export function SettingsAccordion({ children }: SettingsAccordionProps) {
  const searchParams = useSearchParams();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const hash =
      typeof window !== "undefined"
        ? window.location.hash.replace(/^#/, "")
        : "";
    const openEmail = shouldOpenEmailIntegration(searchParams, hash);
    const openIntegrations = shouldOpenIntegrations(searchParams, hash);
    const selected = openEmail
      ? "email-integration"
      : openIntegrations
        ? "integrations"
        : "";

    if (!selected) return;

    setValue(selected);
    const scrollTarget =
      selected === "email-integration"
        ? EMAIL_SETUP_SETTINGS_HASH
        : "integrations";
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
