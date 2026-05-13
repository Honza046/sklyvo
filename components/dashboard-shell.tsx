"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Crosshair, Radio, Users, Settings, LogOut, Moon, Sun, User, LifeBuoy, LayoutDashboard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
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

const mainNav = [
  { href: "/", label: "Přehled", icon: LayoutDashboard }, // Přidáno na první místo
  { href: "/sniper", label: "Sniper", icon: Crosshair },
  { href: "/radar", label: "Radar", icon: Radio },
  { href: "/crm", label: "CRM", icon: Users },
] as const;

export function DashboardShell({
  children,
  activeHref,
  user,
}: {
  children: React.ReactNode;
  activeHref: string;
  user?: {
    name: string | null;
    email: string | null;
    avatarUrl?: string | null;
    image?: string | null;
  };
}) {
  // Načtení aktuálního tématu
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [sessionUser, setSessionUser] = useState(user ?? null);
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

    setSessionUser({
      name: session.user.name,
      email: session.user.email,
      avatarUrl: session.user.avatarUrl ?? null,
      image: session.user.image ?? null,
    });
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
    router.refresh();
  }, [router]);

  // Při každé navigaci / návratu na tab znovu načteme workspace z DB (žádný zastaralý stav po ruční úpravě v Supabase)
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
  }, [loadWorkspaceSession, pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadWorkspaceSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [loadWorkspaceSession]);

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

    window.addEventListener("avatar-updated", handleAvatarUpdate as EventListener);
    return () => {
      window.removeEventListener("avatar-updated", handleAvatarUpdate as EventListener);
    };
  }, []);

  // FUNKCE PRO ODHLÁŠENÍ
  const handleLogout = async () => {
    await clearSession();
    router.push("/login");
  };

  const hasSessionData = !isSessionLoading && !!sessionUser && !!subscriptionState;

  const trialDays = subscriptionState?.trialRemainingDays ?? 0;
  const isTrialActive = subscriptionState?.isTrial && trialDays > 0;

  const planTier = subscriptionState?.planTier;
  const subscriptionStatus = subscriptionState?.subscriptionStatus ?? "FREE";
  const isFreePlanTier =
    !planTier || planTier === "NONE" || planTier === "FREE";
  const hasPaidPlanTier = Boolean(
    planTier && planTier !== "NONE" && planTier !== "FREE",
  );

  const dbCreditsTotal = subscriptionState?.creditsTotal ?? 10;
  const dbCreditsUsed = subscriptionState?.creditsUsed ?? 0;

  const hasFullCreditAllowance =
    subscriptionStatus === "ACTIVE" ||
    hasPaidPlanTier ||
    (Boolean(subscriptionState?.isTrial) && trialDays > 0);

  const displayCreditsTotal = hasFullCreditAllowance ? dbCreditsTotal : 10;

  const isTrialExpired =
    Boolean(subscriptionState?.isTrial) &&
    trialDays <= 0 &&
    subscriptionStatus !== "ACTIVE" &&
    !hasPaidPlanTier;

  const creditsRemaining = Math.max(0, displayCreditsTotal - dbCreditsUsed);

  const creditsPercentage =
    displayCreditsTotal > 0
      ? Math.min(100, (dbCreditsUsed / displayCreditsTotal) * 100)
      : 0;

  const displayPlan = (() => {
    if (hasPaidPlanTier || subscriptionStatus === "ACTIVE") {
      return planTier ?? "Free verze";
    }
    if (!planTier || planTier === "NONE" || planTier === "FREE" || isTrialExpired) {
      if (isTrialExpired) return "Free verze";
      if (isTrialActive && isFreePlanTier) return "Free verze (Trial)";
      return "Free verze";
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
      return `Zkušební doba končí: ${new Date(trialEnd).toLocaleDateString("cs-CZ")}`;
    }
    const periodEnd = subscriptionState.subscriptionPeriodEndISO
      ? Date.parse(subscriptionState.subscriptionPeriodEndISO)
      : NaN;
    if (!Number.isNaN(periodEnd)) {
      return `Předplatné končí: ${new Date(periodEnd).toLocaleDateString("cs-CZ")}`;
    }
    return null;
  })();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      
      {/* BOČNÍ PANEL */}
      <aside className="hidden w-64 flex-shrink-0 h-full overflow-y-auto border-r bg-background md:flex md:flex-col">
        
        {/* LOGO */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-6">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]" />
          <span className="text-sm font-bold tracking-[0.2em] text-foreground">
            VENEGARD
          </span>
        </div>
        
        {/* HLAVNÍ NAVIGACE */}
        <nav className="flex flex-col gap-1.5 px-4 mt-4">
          <span className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Nástroje
          </span>
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon 
                  className={cn(
                    "size-5 shrink-0 transition-colors",
                    active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/70"
                  )} 
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" /> {/* Flex spacer */}

        {/* SPODNÍ ČÁST S NASTAVENÍM A PROFILEM */}
        <div className="px-4 pb-6 flex flex-col gap-2 shrink-0">
          
          {/* Centrum nápovědy */}
          <Link
            href="/help"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
              activeHref === "/help" 
                ? "bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <LifeBuoy className={cn(
              "size-4 shrink-0 transition-colors",
              activeHref === "/help" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/70"
            )} />
            Centrum nápovědy
          </Link>
          
          {/* Nastavení Agentury */}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200 mb-2",
              activeHref === "/settings" 
                ? "bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className={cn(
              "size-4 shrink-0 transition-colors",
              activeHref === "/settings" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/70"
            )} />
            Pracovní prostor
          </Link>

          <div className="mb-2 flex flex-col gap-2">
            {hasSessionData && isTrialActive && isFreePlanTier && (
              <div className="rounded-xl border border-amber-300/50 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                Trial končí za {trialDays}{" "}
                {trialDays === 1 ? "den" : trialDays > 1 && trialDays < 5 ? "dny" : "dní"}
              </div>
            )}

            {hasSessionData && isTrialExpired && (
              <div className="rounded-xl border border-red-300/50 bg-red-50/70 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                Zkušební doba vypršela
              </div>
            )}

            <Link
              href="/settings/billing"
              className={cn(
                "block cursor-pointer rounded-xl border border-border/40 bg-muted/50 p-3 transition-all",
                "hover:bg-muted/80 hover:shadow-sm",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              )}
            >
              {hasSessionData ? (
                <>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Kredity
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-foreground">
                      {creditsRemaining.toLocaleString("cs-CZ")} / {displayCreditsTotal.toLocaleString("cs-CZ")}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${creditsPercentage}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tarif: {displayPlan}
                  </p>
                  {subscriptionDateLabel && (
                    <p className="mt-1 text-[9px] leading-snug text-muted-foreground/90">
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
          </div>

          {/* Interní Profil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-muted text-left border border-transparent hover:border-border/50 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                {hasSessionData ? (
                  <>
                    <Avatar className="h-9 w-9 rounded-xl border border-border/50">
                      <AvatarImage src={avatarSrc} alt={displayName ?? ""} />
                      <AvatarFallback className="rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {displayName}
                      </span>
                      <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                        {displayEmail}
                      </span>
                    </div>
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
              className="w-60 rounded-xl p-2 shadow-xl border-border/60 bg-card" 
              align="start" 
              side="top" 
              sideOffset={12}
            >
              <DropdownMenuLabel className="font-normal px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                Můj profil
              </DropdownMenuLabel>
              
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium hover:bg-muted transition-colors">
                <Link href="/account">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Nastavení účtu</span>
                </Link>
              </DropdownMenuItem>
              
              {/* TLAČÍTKO PRO PŘEPÍNÁNÍ TÉMATU */}
              <DropdownMenuItem 
                className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium hover:bg-muted transition-colors"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <span>{theme === "dark" ? "Světlý režim" : "Tmavý režim"}</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-1 opacity-50 border-border/60" />
              
              <DropdownMenuItem 
                onClick={() => void handleLogout()}
                className="cursor-pointer rounded-lg px-2 py-2 text-xs font-bold text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/50 dark:text-red-500 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Odhlásit se</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </aside>

      {/* HLAVNÍ OBSAHOVÁ ČÁST */}
      <div className="flex-1 h-full overflow-y-auto relative min-w-0">
        <main className="min-h-full p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}