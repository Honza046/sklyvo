"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useSlidingThumb } from "@/components/sklyvo/use-sliding-thumb";
import { cn } from "@/lib/utils";

const AUTOPILOT_SUB_NAV = [
  {
    href: "/autopilot/radar",
    labelKey: "nav.autopilotCollect",
  },
  {
    href: "/autopilot/sniper",
    labelKey: "nav.autopilotSend",
  },
  {
    href: "/autopilot/full-auto",
    labelKey: "nav.autopilotFullAuto",
  },
] as const;

export function AutopilotSubNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const activeIndex = Math.max(
    0,
    AUTOPILOT_SUB_NAV.findIndex(
      ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
    ),
  );
  const { trackRef, thumbStyle } = useSlidingThumb(activeIndex, [pathname]);

  return (
    <nav
      ref={trackRef as RefObject<HTMLElement>}
      className="sk-segment mb-0 flex w-full shrink-0"
    >
      <span className="sk-segment__thumb" style={thumbStyle} aria-hidden />
      {AUTOPILOT_SUB_NAV.map(({ href, labelKey }, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={href}
            href={href}
            data-slide-item
            className={cn(
              "sk-segment__item flex-1 whitespace-nowrap text-center text-[11px] font-semibold sm:text-xs",
              active ? "sk-segment__item--active" : "sk-segment__item--idle",
            )}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
