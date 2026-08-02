"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

const AUTOPILOT_SUB_NAV = [
  {
    href: "/autopilot/radar",
    labelKey: "nav.autopilotCollect",
    activeClass: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600",
  },
  {
    href: "/autopilot/sniper",
    labelKey: "nav.autopilotSend",
    activeClass: "bg-blue-600 text-white shadow-sm hover:bg-blue-600",
  },
  {
    href: "/autopilot/full-auto",
    labelKey: "nav.autopilotFullAuto",
    activeClass: "bg-violet-600 text-white shadow-sm hover:bg-violet-600",
  },
] as const;

export function AutopilotSubNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="mb-2 flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card p-1 shadow-sm sm:mb-3 sm:gap-1.5 sm:rounded-2xl sm:p-1.5">
      {AUTOPILOT_SUB_NAV.map(({ href, labelKey, activeClass }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-center text-[11px] font-semibold transition-colors sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs",
              active
                ? activeClass
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
