"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogOut, User, CreditCard, Shield, ChevronRight } from "lucide-react";
import {
  RocketIcon,
  BotGlyphIcon,
  PlaneIcon,
  BoltIcon,
  LockIcon,
  ArrowOutIcon,
} from "@/components/sklyvo/nav-icons";
import { cn } from "@/lib/utils";
import { isPremiumToolsLocked } from "@/components/plan-feature-gate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { clearSession, getWorkspaceAccessState } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { useSlidingThumb } from "@/components/sklyvo/use-sliding-thumb";
import { useLanguage } from "@/context/LanguageContext";
import { DATE_LOCALE } from "@/lib/i18n/types";
import {
  AUTOPILOT_SUB_NAV,
  MAIN_NAV,
  TOOL_NAV_HREFS,
  WORK_NAV_HREFS,
} from "@/components/nav-config";
import { normalizeActiveHref } from "@/lib/nav-active-href";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

const SklyvoOnboardingTour = dynamic(
  () =>
    import("@/components/sklyvo-onboarding-tour").then((m) => ({
      default: m.SklyvoOnboardingTour,
    })),
  { ssr: false },
);

const SESSION_VISIBILITY_REFRESH_MS = 60_000;

function navItemClass(active: boolean, locked = false) {
  return cn("sk-nav-item", active && "is-active", locked && "is-locked");
}

const PREMIUM_NAV_HREFS = new Set(["/uloziste"]);

function navMatches(active: string, href: string) {
  if (href === "/") return active === "/";
  return active === href || active.startsWith(`${href}/`);
}

export function DashboardShell({
  children,
  activeHref,
  user,
}: {
  children: React.ReactNode;
  activeHref: string;
  user?: {
    id?: string;
    name: string | null;
    email: string | null;
    avatarUrl?: string | null;
    image?: string | null;
  };
}) {
  const { t, dayWord, language } = useLanguage();
  const dateLocale = DATE_LOCALE[language];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tourQuery = searchParams.get("tour") === "1";

  /** Instant active state on click — don't wait for the route to finish loading */
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingHref) return;
    if (normalizeActiveHref(pathname) === pendingHref) setPendingHref(null);
  }, [pathname, pendingHref]);

  // If client navigation never commits, don't leave the sidebar on a stale target.
  useEffect(() => {
    if (!pendingHref) return;
    const timeoutId = window.setTimeout(() => {
      setPendingHref((current) =>
        current && normalizeActiveHref(pathname) !== current ? null : current,
      );
    }, 4_000);
    return () => window.clearTimeout(timeoutId);
  }, [pathname, pendingHref]);

  const markNavPending = useCallback((href: string) => {
    setPendingHref(normalizeActiveHref(href));
  }, []);

  /** Fire on pointerdown so the icon turns blue before navigation starts */
  const navPendingProps = useCallback(
    (href: string) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLAnchorElement>) => {
        if (event.button !== 0) return;
        markNavPending(href);
      },
      onClick: () => markNavPending(href),
    }),
    [markNavPending],
  );

  const navActiveHref = pendingHref ?? activeHref;
  const isAutopilotActive = navActiveHref === "/autopilot";
  /**
   * Subnav open/close must follow the committed route only.
   * If it follows pendingHref, collapsing Autopilot on pointerdown shifts
   * Sniper/Radar under the cursor and the first click never navigates.
   */
  const showAutopilotSubnav =
    activeHref === "/autopilot" || pathname.startsWith("/autopilot");
  const isWorkspaceSettingsActive = navMatches(navActiveHref, "/settings");

  /** Flat order of [data-slide-item]: Overview → Autopilot → Sniper → Radar → CRM → Úložiště */
  const sidebarSlideIndex = useMemo(() => {
    if (navActiveHref === "/") return 0;
    if (isAutopilotActive) return 1;
    const ordered = [
      ...MAIN_NAV.filter(({ href }) => TOOL_NAV_HREFS.has(href)),
      ...MAIN_NAV.filter(({ href }) => WORK_NAV_HREFS.has(href)),
    ];
    const i = ordered.findIndex(({ href }) => navMatches(navActiveHref, href));
    return i >= 0 ? i + 2 : -1;
  }, [navActiveHref, isAutopilotActive]);
  const { trackRef: sidebarNavRef, thumbStyle: sidebarThumbStyle } =
    useSlidingThumb(
      sidebarSlideIndex,
      // Remeasure when Autopilot subnav mounts/unmounts — RO only sees size
      // changes, not Sniper/Radar/CRM shifting up after the branch collapses.
      [navActiveHref, isAutopilotActive, showAutopilotSubnav],
      { axis: "y" },
    );

  /** Footer nav: Help → Workspace */
  const footerSlideIndex = useMemo(() => {
    if (navActiveHref === "/help" || pathname.startsWith("/help/")) return 0;
    if (isWorkspaceSettingsActive) return 1;
    return -1;
  }, [navActiveHref, pathname, isWorkspaceSettingsActive]);
  const { trackRef: footerNavRef, thumbStyle: footerThumbStyle } =
    useSlidingThumb(
      footerSlideIndex,
      [navActiveHref, isWorkspaceSettingsActive],
      { axis: "y" },
    );

  const lockMainScroll =
    pathname.startsWith("/autopilot") ||
    pathname === "/" ||
    pathname === "/sniper" ||
    pathname === "/radar" ||
    pathname === "/crm" ||
    pathname === "/uloziste" ||
    pathname.startsWith("/uloziste/") ||
    pathname === "/generator" ||
    pathname.startsWith("/generator/") ||
    pathname === "/help" ||
    pathname.startsWith("/help/") ||
    pathname === "/pricing" ||
    pathname.startsWith("/pricing/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/");

  const [sessionUser, setSessionUser] = useState(user ?? null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [subscriptionState, setSubscriptionState] = useState<{
    trialRemainingDays: number;
    isTrial: boolean;
    subscriptionStatus: string;
    planTier: string;
    creditsUsed: number;
    creditsTotal: number;
    trialEndsAtISO: string | null;
    subscriptionPeriodEndISO: string | null;
  } | null>(null);
  const [onboardingTourCompleted, setOnboardingTourCompleted] = useState<
    boolean | null
  >(null);
  /** Firma ještě nemá companyName — nejdřív formulář, teprve potom tour. */
  const [companyOnboardingPending, setCompanyOnboardingPending] =
    useState(true);
  const [tourPreview, setTourPreview] = useState(false);
  /** Po zavření křížkem / Hotovo — nespouštět tour znovu v téže session (preview→live). */
  const [tourSuppressed, setTourSuppressed] = useState(false);
  const lastSessionFetchRef = useRef(0);

  const displayName = sessionUser?.name?.trim();
  const displayEmail = sessionUser?.email?.trim();
  const avatarSrc = sessionUser?.avatarUrl || sessionUser?.image || undefined;
  const initials = useMemo(
    () =>
      (displayName ?? "")
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(""),
    [displayName],
  );

  const loadWorkspaceSession = useCallback(async () => {
    const session = await getWorkspaceAccessState();

    if (!session.user || !session.workspace) {
      router.replace("/login");
      return;
    }

    lastSessionFetchRef.current = Date.now();

    setSessionUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      avatarUrl: session.user.avatarUrl ?? null,
      image: session.user.image ?? null,
    });
    setIsPlatformAdmin(Boolean(session.user.isPlatformAdmin));
    const w = session.workspace;
    const toISO = (v: Date | string | null | undefined) => {
      if (v == null) return null;
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    };
    setSubscriptionState({
      trialRemainingDays: session.trialRemainingDays,
      isTrial: session.isTrial,
      subscriptionStatus: session.workspace.subscriptionStatus ?? "FREE",
      planTier: session.workspace.planTier,
      creditsUsed: session.workspace.creditsUsed,
      creditsTotal: session.workspace.creditsTotal,
      trialEndsAtISO: toISO(w.trialEndsAt),
      subscriptionPeriodEndISO: toISO(w.subscriptionPeriodEnd),
    });
    setOnboardingTourCompleted(session.user.onboardingTourCompleted ?? false);
    setCompanyOnboardingPending(!(session.workspace.companyName ?? "").trim());
  }, [router]);

  // Initial session — once on mount (not on every client navigation).
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadWorkspaceSession();
      if (!cancelled) {
        setIsSessionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadWorkspaceSession]);

  /** Prefetch main routes so sidebar clicks feel instant after first paint. */
  useEffect(() => {
    const routes = [
      "/",
      "/sniper",
      "/radar",
      "/crm",
      "/uloziste",
      "/generator",
      "/help",
      "/settings",
      "/account",
      "/autopilot",
      "/autopilot/radar",
      "/autopilot/sniper",
      "/autopilot/full-auto",
    ];
    for (const href of routes) {
      router.prefetch(href);
    }
  }, [router]);

  // Refresh when tab becomes visible again — debounced to avoid focus spam.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const elapsed = Date.now() - lastSessionFetchRef.current;
      if (elapsed < SESSION_VISIBILITY_REFRESH_MS) return;
      void loadWorkspaceSession();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [loadWorkspaceSession]);

  useEffect(() => {
    const refreshSession = () => {
      void loadWorkspaceSession();
    };
    window.addEventListener("sklyvo-company-onboarding-done", refreshSession);
    window.addEventListener("sklyvo-session-refresh", refreshSession);
    return () => {
      window.removeEventListener("sklyvo-company-onboarding-done", refreshSession);
      window.removeEventListener("sklyvo-session-refresh", refreshSession);
    };
  }, [loadWorkspaceSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncTourPreview = () => {
      const fromQuery =
        tourQuery ||
        new URLSearchParams(window.location.search).get("tour") === "1";
      const fromStorage =
        window.sessionStorage.getItem("sklyvo-tour-preview") === "1";
      if (fromQuery) {
        window.sessionStorage.setItem("sklyvo-tour-preview", "1");
      }
      const wantsPreview = fromQuery || fromStorage;
      if (wantsPreview) {
        setTourSuppressed(false);
        // Restart from Podpora marks DB incomplete, but client session
        // may still say completed until a full reload — force live start.
        setOnboardingTourCompleted(false);
      }
      setTourPreview(wantsPreview);
    };
    syncTourPreview();
    window.addEventListener("popstate", syncTourPreview);
    return () => window.removeEventListener("popstate", syncTourPreview);
  }, [pathname, tourQuery]);

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const nextAvatarUrl = customEvent.detail;
      if (!nextAvatarUrl) return;

      setSessionUser((prev) =>
        prev
          ? { ...prev, avatarUrl: nextAvatarUrl, image: nextAvatarUrl }
          : prev,
      );
    };

    window.addEventListener(
      "avatar-updated",
      handleAvatarUpdate as EventListener,
    );
    return () => {
      window.removeEventListener(
        "avatar-updated",
        handleAvatarUpdate as EventListener,
      );
    };
  }, []);

  // FUNKCE PRO ODHLÁŠENÍ
  const handleLogout = async () => {
    await clearSession();
    router.push("/login");
  };

  const handleOnboardingTourCompleted = useCallback(() => {
    setOnboardingTourCompleted(true);
  }, []);

  const tourPreviewRef = useRef(false);
  tourPreviewRef.current = tourPreview;

  const handleTourFinished = useCallback(() => {
    setTourSuppressed(true);
    if (tourPreviewRef.current) {
      setTourPreview(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("sklyvo-tour-preview");
      }
      return;
    }
    handleOnboardingTourCompleted();
  }, [handleOnboardingTourCompleted]);

  const hasSessionData =
    !isSessionLoading && !!sessionUser && !!subscriptionState;

  const trialDays = subscriptionState?.trialRemainingDays ?? 0;
  const isTrialActive = subscriptionState?.isTrial && trialDays > 0;

  const planTier = subscriptionState?.planTier;
  const subscriptionStatus = subscriptionState?.subscriptionStatus ?? "FREE";
  const isFreePlanTier =
    !planTier || planTier === "NONE" || planTier === "FREE";
  const hasPaidPlanTier = Boolean(
    planTier && planTier !== "NONE" && planTier !== "FREE",
  );

  /** Kredity i placené tarify vedou na výběr předplatného. */
  const creditsWidgetHref = "/pricing";

  const dbCreditsTotal = subscriptionState?.creditsTotal ?? 10;
  const dbCreditsUsed = subscriptionState?.creditsUsed ?? 0;

  const hasFullCreditAllowance =
    subscriptionStatus === "ACTIVE" ||
    hasPaidPlanTier ||
    (Boolean(subscriptionState?.isTrial) && trialDays > 0);

  const displayCreditsTotal = hasFullCreditAllowance ? dbCreditsTotal : 10;

  const premiumToolsLocked =
    hasSessionData &&
    isPremiumToolsLocked({
      planTier,
      subscriptionStatus,
      isTrial: Boolean(subscriptionState?.isTrial),
      trialRemainingDays: trialDays,
    });

  const isTrialExpired =
    Boolean(subscriptionState?.isTrial) &&
    trialDays <= 0 &&
    subscriptionStatus !== "ACTIVE" &&
    !hasPaidPlanTier;

  const creditsPercentage =
    displayCreditsTotal > 0
      ? Math.min(100, (dbCreditsUsed / displayCreditsTotal) * 100)
      : 0;
  const usagePercentRounded = Math.round(creditsPercentage);
  const meterTone =
    usagePercentRounded >= 85
      ? "hot"
      : usagePercentRounded >= 60
        ? "warn"
        : "ok";

  const displayPlan = (() => {
    if (hasPaidPlanTier || subscriptionStatus === "ACTIVE") {
      return planTier ?? t("nav.planFree");
    }
    if (
      !planTier ||
      planTier === "NONE" ||
      planTier === "FREE" ||
      isTrialExpired
    ) {
      if (isTrialExpired) return t("nav.planFree");
      if (isTrialActive && isFreePlanTier) return t("nav.planFreeTrial");
      return t("nav.planFree");
    }
    return planTier;
  })();

  const subscriptionDateLabel = (() => {
    if (!hasSessionData || !subscriptionState) return null;
    const now = Date.now();
    const trialEnd = subscriptionState.trialEndsAtISO
      ? Date.parse(subscriptionState.trialEndsAtISO)
      : NaN;
    if (!Number.isNaN(trialEnd) && now < trialEnd) {
      return t("nav.trialEndsOn", {
        date: new Date(trialEnd).toLocaleDateString(dateLocale),
      });
    }
    const periodEnd = subscriptionState.subscriptionPeriodEndISO
      ? Date.parse(subscriptionState.subscriptionPeriodEndISO)
      : NaN;
    if (!Number.isNaN(periodEnd)) {
      const dateStr = new Date(periodEnd).toLocaleDateString(dateLocale);
      if (subscriptionStatus === "ACTIVE") {
        return t("nav.planRenewsOn", { date: dateStr });
      }
      return t("nav.subscriptionEndsOn", { date: dateStr });
    }
    return null;
  })();

  const tourActive =
    hasSessionData &&
    !tourSuppressed &&
    !companyOnboardingPending &&
    (tourPreview || onboardingTourCompleted === false);

  return (
    <div className="sklyvo-app flex h-dvh max-h-dvh w-full overflow-hidden">
      <ImpersonationBanner />
      {/* BOČNÍ PANEL */}
      <aside className="sk-sidebar flex h-full w-[254px] flex-shrink-0 flex-col">
        {/* LOGO */}
        <div className="flex h-14 shrink-0 items-center px-4 pl-5">
          <Link
            href="/"
            className="sk-lockup outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[color:var(--sk-brand)]/30"
            aria-label={t("nav.overview")}
            {...navPendingProps("/")}
          >
            <SklyvoMark size={30} interactive={false} />
            <span className="sk-lockup__word">Sklyvo</span>
          </Link>
        </div>

        {/* NAV — Přehled stays outside overflow so active glow isn't clipped under the logo */}
        <nav
          ref={sidebarNavRef as RefObject<HTMLElement>}
          className="sk-nav-track relative flex min-h-0 flex-1 flex-col overflow-visible"
        >
          <span
            className="sk-nav-thumb"
            style={sidebarThumbStyle}
            aria-hidden
          />

          <div className="relative z-[1] shrink-0 px-3 pb-1 pt-1">
            {MAIN_NAV.filter(({ href }) => href === "/").map(
              ({ href, labelKey, icon: Icon }) => {
                const active = navMatches(navActiveHref, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    data-slide-item
                    data-tour="onboarding-overview"
                    className={navItemClass(active)}
                    aria-current={active ? "page" : undefined}
                    {...navPendingProps(href)}
                  >
                    <Icon className="sk-nav-icon" aria-hidden />
                    {t(labelKey)}
                  </Link>
                );
              },
            )}
          </div>

          <div
            data-nav-scroll
            className="scrollbar-hide relative z-[1] flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-visible px-3 pb-2"
          >
            <span className="sk-nav-label">{t("nav.tools")}</span>
            <div className="sk-nav-tree flex flex-col gap-0.5">
              <Link
                href="/autopilot/radar"
                data-slide-item
                data-accent="amber"
                data-tour="onboarding-autopilot"
                className={navItemClass(isAutopilotActive, premiumToolsLocked)}
                aria-current={isAutopilotActive ? "page" : undefined}
                {...navPendingProps("/autopilot/radar")}
              >
                <RocketIcon className="sk-nav-icon" aria-hidden />
                {t("nav.autopilot")}
                {premiumToolsLocked ? (
                  <span className="sk-nav-plus">
                    <LockIcon aria-hidden />
                    {t("nav.plusBadge")}
                  </span>
                ) : null}
              </Link>

              {showAutopilotSubnav && (
                <div className="sk-nav-tree__branch">
                  {AUTOPILOT_SUB_NAV.map(({ href, labelKey }) => {
                    const subActive =
                      pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <Link
                        key={href}
                        href={href}
                        data-accent="amber"
                        className={cn(
                          "sk-nav-sub",
                          subActive && "is-active",
                          premiumToolsLocked && "opacity-50",
                        )}
                      >
                        <span className="sk-nav-dot" aria-hidden />
                        {t(labelKey)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {MAIN_NAV.filter(({ href }) => TOOL_NAV_HREFS.has(href)).map(
              ({ href, labelKey, icon: Icon }) => {
                const active = navMatches(navActiveHref, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    data-slide-item
                    data-tour={
                      href === "/radar"
                        ? "onboarding-radar"
                        : href === "/sniper"
                          ? "onboarding-sniper"
                          : undefined
                    }
                    className={navItemClass(active)}
                    aria-current={active ? "page" : undefined}
                    {...navPendingProps(href)}
                  >
                    <Icon className="sk-nav-icon" aria-hidden />
                    {t(labelKey)}
                  </Link>
                );
              },
            )}

            <span className="sk-nav-label">{t("nav.work")}</span>
            {MAIN_NAV.filter(({ href }) => WORK_NAV_HREFS.has(href)).map(
              ({ href, labelKey, icon: Icon }) => {
                const active = navMatches(navActiveHref, href);
                const locked =
                  premiumToolsLocked && PREMIUM_NAV_HREFS.has(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    data-slide-item
                    data-tour={href === "/crm" ? "onboarding-crm" : undefined}
                    className={navItemClass(active, locked)}
                    aria-current={active ? "page" : undefined}
                    {...navPendingProps(href)}
                  >
                    <Icon className="sk-nav-icon" aria-hidden />
                    {t(labelKey)}
                    {locked ? (
                      <LockIcon className="sk-nav-lock" aria-hidden />
                    ) : null}
                  </Link>
                );
              },
            )}
          </div>
        </nav>

        {/* SPODNÍ ČÁST S NASTAVENÍM A PROFILEM — vždy pinned dole */}
        <div className="flex shrink-0 flex-col gap-1.5 px-3 pb-5 pt-3">
          <nav
            ref={footerNavRef as RefObject<HTMLElement>}
            className="sk-nav-track sk-nav-track--flush relative flex flex-col gap-1"
          >
            <span
              className="sk-nav-thumb"
              style={footerThumbStyle}
              aria-hidden
            />
            <Link
              href="/help"
              data-slide-item
              data-tour="onboarding-help"
              className={navItemClass(navMatches(navActiveHref, "/help"))}
              aria-current={
                navMatches(navActiveHref, "/help") ? "page" : undefined
              }
              {...navPendingProps("/help")}
            >
              <BotGlyphIcon className="sk-nav-icon size-4" aria-hidden />
              {t("nav.help")}
            </Link>
            <Link
              href="/settings"
              data-slide-item
              data-tour="onboarding-settings"
              className={navItemClass(isWorkspaceSettingsActive)}
              aria-current={isWorkspaceSettingsActive ? "page" : undefined}
              {...navPendingProps("/settings")}
            >
              <PlaneIcon className="sk-nav-icon size-4" aria-hidden />
              {t("nav.workspace")}
            </Link>
          </nav>

          <div className="mb-2 flex flex-col gap-2">
            {hasSessionData && isTrialActive && isFreePlanTier && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                {t("nav.trialEndsIn", {
                  days: trialDays,
                  dayWord: dayWord(trialDays),
                })}
              </div>
            )}

            {hasSessionData && isTrialExpired && (
              <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
                {t("nav.trialExpired")}
              </div>
            )}

            <Link
              href={creditsWidgetHref}
              className="sk-credits sk-credits--brand ring-offset-background focus-visible:outline-none"
            >
              {hasSessionData ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BoltIcon className="sk-credits__zap h-3 w-3" />
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.72)]">
                        {t("nav.credits")}
                      </span>
                    </div>
                    <span
                      className={`sk-credits__pct sk-credits__pct--${meterTone} text-[11.5px] font-bold`}
                    >
                      {t("nav.usagePercent", {
                        pct: String(usagePercentRounded),
                      })}
                    </span>
                  </div>
                  <div className="sk-meter__track">
                    <div
                      className={`sk-meter__fill sk-meter__fill--${meterTone}`}
                      style={{ width: `${creditsPercentage}%` }}
                    />
                  </div>
                  <p className="mt-2.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.82)]">
                    {t("nav.plan")}:{" "}
                    <span className="sk-credits__plan">{displayPlan}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="text-[#ffd36b] opacity-80" aria-hidden><path d="M11 3.5 12.7 8l4.5 1.7-4.5 1.7L11 15.9 9.3 11.4 4.8 9.7l4.5-1.7L11 3.5Z" /><path d="M18 14.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3Z" /></svg>
                  </p>
                  {subscriptionDateLabel && (
                    <p className="mt-1 text-[9px] leading-snug text-[color:var(--sk-muted-soft)]">
                      {subscriptionDateLabel}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-1 w-full rounded-full" />
                  <Skeleton className="mt-2 h-3 w-24 rounded" />
                </>
              )}
            </Link>

            {hasSessionData && usagePercentRounded >= 80 && (
              <Link href="/pricing" className="sk-upsell sk-upsell--inline">
                <span className="sk-upsell__dot" aria-hidden />
                {t("nav.upsellQuestion")} <strong>{t("nav.upsellAction")}</strong>
                <ArrowOutIcon className="sk-upsell__arrow" aria-hidden />
              </Link>
            )}

            <div className="sk-sidebar__profile-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="sk-user outline-none focus:outline-none focus-visible:ring-0">
                    {hasSessionData ? (
                      <>
                        <Avatar className="h-9 w-9 rounded-xl border border-[color:var(--n-hairline)]">
                          <AvatarImage src={avatarSrc} alt={displayName ?? ""} />
                          <AvatarFallback className="rounded-xl bg-[color-mix(in_oklab,var(--sk-brand)_22%,transparent)] text-sm font-bold text-[color:var(--sk-brand)]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                          <span className="truncate text-sm font-semibold text-[color:var(--sk-ink)]">
                            {displayName}
                          </span>
                          <span className="truncate text-[10px] text-[color:var(--sk-muted)]">
                            {displayEmail?.toLowerCase()}
                          </span>
                        </div>
                        <ChevronRight
                          className="sk-user__chevron"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </>
                    ) : (
                      <>
                        <Skeleton className="h-9 w-9 rounded-xl" />
                        <div className="flex flex-1 flex-col gap-1.5">
                          <Skeleton className="h-3 w-24 rounded" />
                          <Skeleton className="h-3 w-32 rounded" />
                        </div>
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-60 rounded-xl border-border/60 bg-card p-2 shadow-xl"
                align="start"
                side="top"
                sideOffset={12}
              >
                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {t("nav.myProfile")}
                </DropdownMenuLabel>

                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <Link href="/account">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t("nav.accountSettings")}</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <Link href="/pricing">
                    <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t("nav.plansAndBilling")}</span>
                  </Link>
                </DropdownMenuItem>

                {isPlatformAdmin ? (
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <Link href="/admin/login">
                      <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Sklyvo Admin</span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuSeparator className="my-1 border-border/60 opacity-50" />

                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="cursor-pointer rounded-lg px-2 py-2 text-xs font-bold text-red-600 transition-colors focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("nav.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </aside>

      {/* HLAVNÍ OBSAHOVÁ ČÁST */}
      <div
        data-dashboard-scroll={!lockMainScroll ? "" : undefined}
        className={cn(
          "sk-main relative flex min-w-0 flex-1 flex-col",
          lockMainScroll
            ? "h-dvh max-h-dvh overflow-hidden"
            : "scrollbar-hide h-full overflow-y-auto",
        )}
      >
        <main
          className={cn(
            lockMainScroll
              ? pathname === "/"
                ? "flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-visible"
                : "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-full flex-1",
          )}
        >
          {children}
        </main>
      </div>
      {tourActive ? (
        <SklyvoOnboardingTour
          active
          preview={tourPreview}
          userId={sessionUser?.id ?? null}
          onCompleted={handleTourFinished}
        />
      ) : null}
    </div>
  );
}
