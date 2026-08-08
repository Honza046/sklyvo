"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Lock, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getTeamAccessState,
  inviteTeamMember,
  removeTeamMember,
  type TeamMemberDto,
} from "@/app/actions/team";

function roleLabel(role: TeamMemberDto["role"]) {
  switch (role) {
    case "OWNER":
      return "Vlastník";
    case "ADMIN":
      return "Admin";
    case "MEMBER":
      return "Člen";
    default:
      return role;
  }
}

function StatusBadge() {
  return (
    <span className="inline-flex rounded-md bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
      Aktivní
    </span>
  );
}

export function TeamAccessPanel() {
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [isAgency, setIsAgency] = useState(false);
  const [planTier, setPlanTier] = useState("NONE");
  const [maxMembers, setMaxMembers] = useState(5);
  const [sharedCredits, setSharedCredits] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("MEMBER");
  const [teamMembers, setTeamMembers] = useState<TeamMemberDto[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [capacityWarning, setCapacityWarning] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const refresh = () => {
    startTransition(async () => {
      const state = await getTeamAccessState();
      if ("error" in state && state.error) {
        toast.error(state.error);
        setLoaded(true);
        return;
      }
      if (!("success" in state)) return;
      setIsAgency(state.isAgency);
      setPlanTier(state.planTier);
      setMaxMembers(state.maxMembers);
      setSharedCredits(state.sharedCredits);
      setCurrentUserId(state.currentUserId);
      setCurrentUserRole(state.currentUserRole);
      setTeamMembers(state.members);
      setLoaded(true);
    });
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Načítám tým…</p>
    );
  }

  if (!isAgency) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/35 dark:text-blue-400">
          <Lock className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          Týmová spolupráce je dostupná od tarifu Agency
        </h3>
        <p className="mt-2 mb-6 max-w-md text-sm text-gray-500 dark:text-muted-foreground">
          Pozvěte kolegy do svého pracovního prostoru, sdílejte společně CRM, Google Sheets a kredity.
          Aktuální tarif: <span className="font-medium text-foreground">{planTier}</span>
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

  const seatsUsed = teamMembers.length;
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const ownerName = teamMembers.find((m) => m.role === "OWNER")?.name?.trim() || null;

  const handlePozvatClick = () => {
    setCapacityWarning(false);
    setTempPasswordInfo(null);
    if (teamMembers.length >= maxMembers) {
      setCapacityWarning(true);
      return;
    }
    setInviteOpen(true);
  };

  const handleSendInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    startTransition(async () => {
      const result = await inviteTeamMember({ email, role: inviteRole });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if (result.temporaryPassword) {
        setTempPasswordInfo({ email: result.email, password: result.temporaryPassword });
        toast.success(
          `${result.name} přidán. Pošli mu dočasné heslo (zobrazí se níže).`,
        );
      } else {
        toast.success(`${result.name} je teď ve vašem workspace.`);
      }
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteOpen(false);
      refresh();
    });
  };

  const handleRemove = (member: TeamMemberDto) => {
    if (!confirm(`Odebrat ${member.email} z workspace?`)) return;
    startTransition(async () => {
      const result = await removeTeamMember(member.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Člen odebrán.");
      refresh();
    });
  };

  return (
    <div className="space-y-5 pb-2 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 dark:bg-muted/10">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Agency workspace</p>
          <p className="text-sm text-muted-foreground">
            Členové:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {seatsUsed} / {maxMembers}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Sdílené kredity:{" "}
            <span className="font-semibold tabular-nums text-foreground">{sharedCredits}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Všichni vidí stejné CRM, stavy a Google Sheets.
          </p>
          <p className="text-xs text-muted-foreground">
            {ownerName
              ? `Předplatné spravuje ${ownerName}`
              : "Předplatné spravuje vlastník workspace"}
          </p>        </div>
        {canManage && (
          <Button
            type="button"
            className="h-11 shrink-0 rounded-xl bg-blue-600 px-5 font-semibold text-white shadow-sm hover:bg-blue-700"
            disabled={isPending}
            onClick={handlePozvatClick}
          >
            <Plus className="mr-2 h-4 w-4" />
            Pozvat člena
          </Button>
        )}
      </div>

      {capacityWarning && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/80 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-100"
        >
          Dosáhli jste maximální kapacity týmu ({maxMembers} míst).
        </div>
      )}

      {tempPasswordInfo && (
        <div
          role="status"
          className="rounded-xl border border-blue-300/80 bg-blue-500/10 px-4 py-3 text-sm text-blue-950 dark:border-blue-700 dark:bg-blue-950/25 dark:text-blue-100"
        >
          <p className="font-semibold">Dočasné heslo pro {tempPasswordInfo.email}</p>
          <p className="mt-1 font-mono text-base tracking-wide">{tempPasswordInfo.password}</p>
          <p className="mt-1 text-xs opacity-80">
            Pošli ho kolegovi (Slack / e-mail). Po přihlášení ať si heslo změní v účtu.
          </p>
        </div>
      )}

      <div className="sk-data-panel overflow-hidden rounded-xl p-3 shadow-sm sm:p-3.5">
        <div className="mb-1 hidden grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)_7.5rem_5.5rem_2rem] items-center gap-3 px-3.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[color:var(--sk-muted)] sm:grid">
          <span>Jméno</span>
          <span>E-mail</span>
          <span>Role</span>
          <span>Stav</span>
          <span className="sr-only">Akce</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {teamMembers.map((m) => (
            <div
              key={m.id}
              className="sk-data-row !grid grid-cols-1 items-center gap-2 sm:!grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)_7.5rem_5.5rem_2rem] sm:!gap-3 sm:!px-3.5 sm:!py-2.5"
            >
              <p className="truncate text-sm font-medium text-[color:var(--sk-ink)]">{m.name}</p>
              <p className="truncate text-sm text-[color:var(--sk-muted)]">{m.email}</p>
              <p className="text-sm text-[color:var(--sk-ink)]">{roleLabel(m.role)}</p>
              <div className="flex items-center">
                <StatusBadge />
              </div>
              <div className="flex h-8 w-8 items-center justify-center justify-self-end">
                {canManage &&
                  currentUserRole === "OWNER" &&
                  m.id !== currentUserId &&
                  m.role !== "OWNER" && (
                    <button
                      type="button"
                      aria-label={`Odebrat ${m.email}`}
                      title="Odebrat"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--sk-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                      disabled={isPending}
                      onClick={() => handleRemove(m)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setInviteOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setInviteOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-1 text-lg font-bold text-foreground">Pozvat do workspace</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              Kolega uvidí stejné CRM, stavy a Google Sheets jako ty.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="kolega@venegard.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className={cn(
                    "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm",
                  )}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                >
                  <option value="MEMBER">Člen</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <Button
                type="button"
                className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
                disabled={isPending || !inviteEmail.trim()}
                onClick={handleSendInvite}
              >
                Přidat do týmu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
