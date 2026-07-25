"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Radio,
  Rocket,
  Settings,
  Sun,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
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

export const MAIN_NAV = [
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
};

export function MobileTopBar({
  creditsLabel,
  creditsHref,
  displayName,
  displayEmail,
  avatarSrc,
  initials,
  onLogout,
}: MobileTopBarProps) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isAutopilotActive = pathname.startsWith("/autopilot");
  const isSettingsActive =
    pathname === "/settings" ||
    pathname === "/settings/billing" ||
    pathname.startsWith("/settings/billing/");

  return (
    <header
      data-tour="onboarding-mobile-header"
      className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-2 w-2 shrink-0 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
        <span className="truncate text-xs font-bold tracking-[0.18em] text-foreground">
          VENEGARD
        </span>
      </div>

      {creditsLabel && (
        <Link
          href={creditsHref}
          className="flex max-w-[40%] items-center gap-1 truncate rounded-full border border-border/50 bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-foreground"
        >
          <Zap className="h-3 w-3 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="truncate">{creditsLabel}</span>
        </Link>
      )}

      <Sheet>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 shrink-0 p-0"
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
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="text-sm font-bold tracking-[0.15em]">VENEGARD</SheetTitle>
            <div className="flex items-center gap-3 pt-2">
              <Avatar className="h-10 w-10 rounded-xl border border-border/50">
                <AvatarImage src={avatarSrc} alt={displayName ?? ""} />
                <AvatarFallback className="rounded-xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </div>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {t("nav.autopilot")}
            </p>
            <SheetClose asChild>
              <Link
                href="/autopilot/radar"
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium",
                  isAutopilotActive
                    ? "bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Rocket className="size-5 shrink-0" />
                {t("nav.autopilot")}
              </Link>
            </SheetClose>
            <div className="mb-3 ml-3 flex flex-col gap-0.5 border-l border-border/50 pl-3">
              {AUTOPILOT_SUB_NAV.map(({ href, labelKey }) => {
                const subActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SheetClose asChild key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "rounded-xl px-2 py-2 text-xs font-medium",
                        subActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t(labelKey)}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>

            <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {t("nav.myProfile")}
            </p>
            <SheetClose asChild>
              <Link
                href="/help"
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium",
                  pathname === "/help"
                    ? "bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <LifeBuoy className="size-4 shrink-0" />
                {t("nav.help")}
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/settings"
                data-tour="onboarding-settings"
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium",
                  isSettingsActive
                    ? "bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Settings className="size-4 shrink-0" />
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
              className="mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="size-4 shrink-0" />
              ) : (
                <Moon className="size-4 shrink-0" />
              )}
              {theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
            </button>

            <button
              type="button"
              className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/40"
              onClick={onLogout}
            >
              <LogOut className="size-4 shrink-0" />
              {t("nav.logout")}
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}

type MobileBottomNavProps = {
  activeHref: string;
};

export function MobileBottomNav({ activeHref }: MobileBottomNavProps) {
  const { t } = useLanguage();

  return (
    <nav
      data-tour="onboarding-mobile-tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-14 grid-cols-4">
        {MAIN_NAV.map(({ href, labelKey, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              data-tour={
                href === "/radar"
                  ? "onboarding-radar"
                  : href === "/sniper"
                    ? "onboarding-sniper"
                    : undefined
              }
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-blue-600 dark:text-blue-400")} />
              <span className="truncate px-0.5">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
