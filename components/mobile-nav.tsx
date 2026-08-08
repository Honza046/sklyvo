"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogOut,
  Menu,
  Radio,
  Rocket,
  Settings,
  User,
  Users,
  FolderOpen,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useCopilot } from "@/context/CopilotContext";
import { AiMaskIcon } from "@/components/brand-marks";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import { ThemeToggleIconButton } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardLanguageSwitcher } from "@/components/dashboard-language-switcher";

function mobileNavItemClass(active: boolean, locked = false) {
  return cn("sk-nav-item", active && "is-active", locked && "is-locked");
}

export const MAIN_NAV = [
  { href: "/", labelKey: "nav.overview", icon: LayoutDashboard },
  { href: "/sniper", labelKey: "nav.sniper", icon: Crosshair },
  { href: "/radar", labelKey: "nav.radar", icon: Radio },
  { href: "/crm", labelKey: "nav.crm", icon: Users },
  { href: "/uloziste", labelKey: "nav.storage", icon: FolderOpen },
  // Generátor — schováno z navigace (PDF šablona ještě není ready); route /generator zůstává
] as const;

/** Outreach tools — under “Nástroje” (Autopilot is rendered separately). */
export const TOOL_NAV_HREFS = new Set<string>(["/sniper", "/radar"]);

/** CRM + storage — under “Práce”, not tools. */
export const WORK_NAV_HREFS = new Set<string>(["/crm", "/uloziste"]);

/** Spodní mobilní lišta — jen 4 hlavní záložky (víc by se lámalo). */
export const MOBILE_BOTTOM_NAV = [
  { href: "/", labelKey: "nav.overview", icon: LayoutDashboard },
  { href: "/sniper", labelKey: "nav.sniper", icon: Crosshair },
  { href: "/radar", labelKey: "nav.radar", icon: Radio },
  { href: "/crm", labelKey: "nav.crm", icon: Users },
] as const;

export const AUTOPILOT_SUB_NAV = [
  { href: "/autopilot/radar", labelKey: "nav.autopilotCollect" },
  { href: "/autopilot/sniper", labelKey: "nav.autopilotSend" },
  { href: "/autopilot/full-auto", labelKey: "nav.autopilotFullAuto" },
] as const;

type MobileTopBarProps = {
  creditsLabel: string | null;
  creditsHref: string;
  displayName: string | null | undefined;
  displayEmail: string | null | undefined;
  avatarSrc?: string;
  initials: string;
  onLogout: () => void;
  premiumToolsLocked?: boolean;
};

export function MobileTopBar({
  creditsLabel,
  creditsHref,
  displayName,
  displayEmail,
  avatarSrc,
  initials,
  onLogout,
  premiumToolsLocked = false,
}: MobileTopBarProps) {
  const { t } = useLanguage();
  const { setOpen: setCopilotOpen } = useCopilot();
  const pathname = usePathname();
  const isAutopilotActive = pathname.startsWith("/autopilot");
  const isSettingsActive =
    pathname === "/settings" ||
    pathname === "/settings/billing" ||
    pathname.startsWith("/settings/billing/");

  return (
    <header
      data-tour="onboarding-mobile-header"
      className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[color:var(--sk-border)] bg-[color-mix(in_oklab,var(--sk-panel)_88%,transparent)] px-3 backdrop-blur md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {creditsLabel ? (
        <Link
          href={creditsHref}
          className="inline-flex max-w-[55%] shrink items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[color:var(--sk-ink)] shadow-[var(--sk-raised-shadow)]"
          style={{ background: "var(--sk-light-bg)" }}
        >
          <Zap className="h-3 w-3 shrink-0 text-[color:var(--sk-brand)]" />
          <span className="truncate">{creditsLabel}</span>
        </Link>
      ) : (
        <span />
      )}

      <div className="flex shrink-0 items-center gap-1">
        <DashboardLanguageSwitcher variant="compact" />

        <ThemeToggleIconButton />

        <Button
          type="button"
          variant="ghost"
          className="sk-fab sk-fab--sm shrink-0 hover:bg-transparent hover:text-white"
          aria-label={t("copilot.open")}
          data-tour="onboarding-copilot-mobile"
          onClick={() => setCopilotOpen(true)}
        >
          <AiMaskIcon size={18} className="text-white" />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full p-0"
              aria-label="Menu"
              data-tour="onboarding-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="border-b border-white/70 px-4 py-4 text-left">
            <SheetTitle className="sr-only">SKLYVO</SheetTitle>
            <Link
              href="/"
              className="sk-lockup outline-none transition-opacity hover:opacity-80"
              aria-label="Přehled"
            >
              <SklyvoMark size={28} />
              <span className="sk-lockup__word">Sklyvo</span>
            </Link>
            <div className="flex items-center gap-3 pt-2">
              <Avatar className="h-10 w-10 rounded-xl border border-white/80 shadow-sm">
                <AvatarImage src={avatarSrc} alt={displayName ?? ""} />
                <AvatarFallback className="rounded-xl bg-[color-mix(in_oklab,var(--sk-brand)_14%,white)] text-sm font-bold text-[color:var(--sk-brand)]">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[color:var(--sk-ink)]">{displayName}</p>
                <p className="truncate text-[10px] uppercase tracking-wider text-[color:var(--sk-muted)]">
                  {displayEmail}
                </p>
              </div>
            </div>
          </SheetHeader>

          <nav className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {MAIN_NAV.filter(({ href }) => href === "/").map(({ href, labelKey, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <SheetClose asChild key={href}>
                    <Link href={href} className={cn(mobileNavItemClass(active), "mb-1")}>
                      <Icon className="sk-nav-icon" />
                      {t(labelKey)}
                    </Link>
                  </SheetClose>
                );
              })}

              <p className="sk-nav-label">{t("nav.tools")}</p>
              <SheetClose asChild>
                <Link
                  href="/autopilot/radar"
                  className={cn(mobileNavItemClass(isAutopilotActive, premiumToolsLocked), "mb-1")}
                >
                  <Rocket className="sk-nav-icon" />
                  {t("nav.autopilot")}
                  {premiumToolsLocked ? <Lock className="sk-nav-lock" aria-hidden /> : null}
                </Link>
              </SheetClose>
              {isAutopilotActive ? (
                <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-white/70 pl-3">
                  {AUTOPILOT_SUB_NAV.map(({ href, labelKey }) => {
                    const subActive = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <SheetClose asChild key={href}>
                        <Link
                          href={href}
                          className={cn("sk-nav-sub", subActive && "is-active")}
                        >
                          <span className="sk-nav-dot" />
                          {t(labelKey)}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              ) : null}
              {MAIN_NAV.filter(({ href }) => TOOL_NAV_HREFS.has(href)).map(
                ({ href, labelKey, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <SheetClose asChild key={href}>
                      <Link href={href} className={cn(mobileNavItemClass(active), "mb-1")}>
                        <Icon className="sk-nav-icon" />
                        {t(labelKey)}
                      </Link>
                    </SheetClose>
                  );
                },
              )}

              <p className="sk-nav-label">{t("nav.work")}</p>
              {MAIN_NAV.filter(({ href }) => WORK_NAV_HREFS.has(href)).map(
                ({ href, labelKey, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  const locked = premiumToolsLocked && href === "/uloziste";
                  return (
                    <SheetClose asChild key={href}>
                      <Link
                        href={href}
                        className={cn(mobileNavItemClass(active, locked), "mb-1")}
                      >
                        <Icon className="sk-nav-icon" />
                        {t(labelKey)}
                        {locked ? <Lock className="sk-nav-lock" aria-hidden /> : null}
                      </Link>
                    </SheetClose>
                  );
                },
              )}
            </div>

            <div className="mt-auto shrink-0 border-t border-white/70 pt-3">
              <p className="sk-nav-label">
                {t("nav.myProfile")}
              </p>
              <SheetClose asChild>
                <Link
                  href="/help"
                  className={cn(
                    mobileNavItemClass(pathname === "/help" || pathname.startsWith("/help/")),
                    "mb-1",
                  )}
                >
                  <LifeBuoy className="sk-nav-icon size-4" />
                  {t("nav.help")}
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/settings"
                  data-tour="onboarding-settings"
                  className={cn(mobileNavItemClass(isSettingsActive), "mb-1")}
                >
                  <Settings className="sk-nav-icon size-4" />
                  {t("nav.workspace")}
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/account"
                  className="mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <User className="size-4 shrink-0" />
                  {t("nav.accountSettings")}
                </Link>
              </SheetClose>

              <button
                type="button"
                className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/40"
                onClick={onLogout}
              >
                <LogOut className="size-4 shrink-0" />
                {t("nav.logout")}
              </button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
      </div>
    </header>
  );
}

type MobileBottomNavProps = {
  activeHref: string;
  onNavigate?: (href: string) => void;
};

export function MobileBottomNav({ activeHref, onNavigate }: MobileBottomNavProps) {
  const { t } = useLanguage();

  return (
    <nav
      data-tour="onboarding-mobile-tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--sk-border)] bg-[color-mix(in_oklab,var(--sk-panel)_92%,transparent)] backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-14 max-w-lg grid-cols-4">
        {MOBILE_BOTTOM_NAV.map(({ href, labelKey, icon: Icon }) => {
          const active =
            href === "/"
              ? activeHref === "/"
              : activeHref === href || activeHref.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.(href)}
              data-tour={
                href === "/"
                  ? "onboarding-overview"
                  : href === "/radar"
                    ? "onboarding-radar"
                    : href === "/sniper"
                      ? "onboarding-sniper"
                      : href === "/crm"
                        ? "onboarding-crm"
                        : undefined
              }
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                active
                  ? "font-semibold text-[color:var(--sk-brand)]"
                  : "text-[color:var(--sk-muted)]",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-[color:var(--sk-brand)]" : "text-[color:var(--sk-icon)]",
                )}
              />
              <span className="max-w-full truncate leading-none">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
