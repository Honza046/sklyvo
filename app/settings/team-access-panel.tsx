"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TeamMemberStatus = "AKTIVNÍ" | "ČEKÁ NA PŘIJETÍ";

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: TeamMemberStatus;
};

function roleLabel(role: string) {
  switch (role) {
    case "VLASTNÍK":
      return "Vlastník";
    case "ADMIN":
      return "Admin";
    case "ČLEN":
      return "Člen";
    default:
      return role;
  }
}

function StatusBadge({ status }: { status: TeamMemberStatus }) {
  const isActive = status === "AKTIVNÍ";
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        isActive
          ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-amber-500/12 text-amber-800 dark:bg-amber-500/18 dark:text-amber-400",
      )}
    >
      {isActive ? "Aktivní" : "Čeká na přijetí"}
    </span>
  );
}

export function TeamAccessPanel() {
  // OPRAVA: Přidán typ 'string', aby TypeScript nepanikařil při porovnávání níže
  const currentPlan: string = "STARTER";

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: 1, name: "Jan Sedlář", email: "jansedlar@post.cz", role: "VLASTNÍK", status: "AKTIVNÍ" },
  ]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "ČLEN">("ČLEN");
  const [capacityWarning, setCapacityWarning] = useState(false);

  if (currentPlan !== "AGENCY") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/35 dark:text-blue-400">
          <Lock className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="text-lg font-bold text-foreground">Týmová spolupráce je dostupná od tarifu Agency</h3>
        <p className="mt-2 mb-6 max-w-md text-sm text-gray-500 dark:text-muted-foreground">
          Pozvěte kolegy do svého pracovního prostoru, sdílejte společně balíček kreditů a spravujte kampaně jako
          jeden tým.
        </p>
        <Button
          className="h-11 rounded-xl bg-blue-600 px-8 font-semibold text-white shadow-sm hover:bg-blue-700"
          asChild
        >
          <Link href="/pricing">Zobrazit tarify</Link>
        </Button>
      </div>
    );
  }

  const workspace: { plan: string; maxMembers: number; sharedCredits: number } = {
    plan: "AGENCY",
    maxMembers: 3,
    sharedCredits: 5000,
  };

  const seatsUsed = teamMembers.length;

  const handlePozvatClick = () => {
    setCapacityWarning(false);
    if (teamMembers.length >= workspace.maxMembers) {
      setCapacityWarning(true);
      return;
    }
    setInviteOpen(true);
  };

  const handleSendInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;

    const local = email.split("@")[0] ?? "";
    const displayName = local ? local.charAt(0).toUpperCase() + local.slice(1) : "Kolega";

    setTeamMembers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: displayName,
        email,
        role: inviteRole,
        status: "ČEKÁ NA PŘIJETÍ",
      },
    ]);
    setInviteEmail("");
    setInviteRole("ČLEN");
    setInviteOpen(false);
  };

  return (
    <div className="space-y-5 pb-2 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 dark:bg-muted/10">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Workspace</p>
          <p className="text-sm text-muted-foreground">
            Členové:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {seatsUsed} / {workspace.maxMembers}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Sdílené kredity Workspace:{" "}
            <span className="font-semibold tabular-nums text-foreground">{workspace.sharedCredits}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Tarif (demo UI):{" "}
            <span className="font-medium text-foreground">{workspace.plan}</span>
          </p>
        </div>
        <Button
          type="button"
          className="h-11 shrink-0 rounded-xl bg-blue-600 px-5 font-semibold text-white shadow-sm hover:bg-blue-700"
          onClick={handlePozvatClick}
        >
          <Plus className="mr-2 h-4 w-4" />
          Pozvat člena
        </Button>
      </div>

      {capacityWarning && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/80 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-100"
        >
          Dosáhli jste maximální kapacity týmu pro váš tarif ({workspace.maxMembers} místa). Chcete-li rozšířit
          Workspace, změňte tarif na vyšší plán Agency s většími limity nebo kontaktujte podporu.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 dark:bg-muted/20">
              <th className="px-4 py-3 font-semibold">Jméno</th>
              <th className="px-4 py-3 font-semibold">E-mail</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Stav</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((m) => (
              <tr key={m.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3">{roleLabel(m.role)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setInviteOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-border/60 bg-white p-8 shadow-xl dark:bg-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setInviteOpen(false)}
              aria-label="Zavřít"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-foreground">Pozvat kolegu</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Kolegovi přijde e-mail s odkazem. Po registraci se připojí do tohoto Workspace a bude sdílet vaše kredity.
            </p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="E-mail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "ČLEN")}
                  className="flex h-12 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="ČLEN">Člen</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setInviteOpen(false)}>
                Zrušit
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
                onClick={handleSendInvite}
              >
                Odeslat pozvánku
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}