"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Přehled", exact: true },
  { href: "/admin/users", label: "Uživatelé" },
  { href: "/admin/workspaces", label: "Workspacey" },
  { href: "/admin/audit", label: "Audit" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sk-admin__nav" aria-label="Platform admin">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn("sk-admin__nav-link", active && "is-active")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
