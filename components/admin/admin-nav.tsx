"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  ScrollText,
  Server,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS: {
  href: string;
  label: string;
  exact?: boolean;
  icon: LucideIcon;
}[] = [
  { href: "/admin", label: "Přehled", exact: true, icon: LayoutDashboard },
  { href: "/admin/users", label: "Uživatelé", icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
  { href: "/admin/system", label: "Systém", icon: Server },
];

type AdminNavProps = {
  variant?: "top" | "sidebar";
};

export function AdminNav({ variant = "sidebar" }: AdminNavProps) {
  const pathname = usePathname();
  const isSidebar = variant === "sidebar";

  return (
    <nav
      className={cn("sk-admin__nav", isSidebar && "sk-admin__nav--sidebar")}
      aria-label="Platform admin"
    >
      {LINKS.map((link) => {
        const Icon = link.icon;
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "sk-admin__nav-link",
              isSidebar && "sk-admin__nav-link--sidebar",
              active && "is-active",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
