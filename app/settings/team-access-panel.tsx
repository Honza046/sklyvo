"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  getTeamAccessState,
  inviteTeamMember,
  removeTeamMember,
  type TeamMemberDto,
} from "@/app/actions/team";
import { TeamMemberAvatar } from "@/components/settings/team-member-avatar";

function roleLabel(
  role: TeamMemberDto["role"],
  t: (path: string) => string,
) {
  switch (role) {
    case "OWNER":
      return t("settings.teamPanel.owner");
    case "ADMIN":
      return t("settings.teamPanel.admin");
    case "MEMBER":
      return t("settings.teamPanel.member");
    default:
      return role;
  }
}

function TeamStatusBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "sk-team-badge",
        active ? "sk-team-badge--active" : "sk-team-badge--invite",
      )}
    >
      {label}
    </span>
  );
}

export function TeamAccessPanel() {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [isAgency, setIsAgency] = useState(false);
  const [planDisplayName, setPlanDisplayName] = useState("AGENCY");
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [seatPriceLabel, setSeatPriceLabel] = useState("—");
  const [maxMembers, setMaxMembers] = useState(5);
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
      setPlanDisplayName(state.planDisplayName);
      setWorkspaceName(state.workspaceName);
      setSeatPriceLabel(state.seatPriceLabel);
      setMaxMembers(state.maxMembers);
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

  const seatsUsed = teamMembers.length;
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

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
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const displayName = result.name || result.email;
      if ("temporaryPassword" in result && result.temporaryPassword) {
        setTempPasswordInfo({
          email: result.email,
          password: result.temporaryPassword,
        });
        toast.success(
          t("settings.teamPanel.addedWithPassword", { name: displayName }),
        );
      } else {
        toast.success(t("settings.teamPanel.added", { name: displayName }));
      }
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteOpen(false);
      refresh();
    });
  };

  const handleRemove = (member: TeamMemberDto) => {
    if (!confirm(t("settings.teamPanel.removeConfirm", { email: member.email }))) return;
    startTransition(async () => {
      const result = await removeTeamMember(member.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("settings.teamPanel.removed"));
      refresh();
    });
  };

  if (!loaded) {
    return (
      <div className="sk-team-page">
        <p className="sk-team-page__loading">{t("settings.teamPanel.loading")}</p>
      </div>
    );
  }

  if (!isAgency) {
    return (
      <div className="sk-team-page">
        <div className="sk-team-page__locked">
          <div className="sk-team-page__locked-icon" aria-hidden>
            <Lock strokeWidth={2} />
          </div>
          <h3 className="sk-team-page__locked-title">
            {t("settings.teamPanel.agencyOnlyTitle")}
          </h3>
          <p className="sk-team-page__locked-desc">
            {t("settings.teamPanel.agencyOnlyDesc", { plan: planDisplayName })}
          </p>
          <Button className="sk-btn sk-btn--white sk-team-page__locked-cta" asChild>
            <Link href="/pricing">{t("settings.teamPanel.viewPlans")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sk-team-page">
      <header className="sk-team-page__header">
        <div className="sk-page-head sk-page-head--tool">
          <h1 className="sk-page-head__title">{t("settings.pages.team.title")}</h1>
          <p className="sk-page-head__sub">{t("settings.hubSubtitle")}</p>
        </div>

        <div className="sk-team-page__toolbar">
          <Link
            href="/settings"
            className="sk-team-page__back"
            aria-label={t("settings.backToHub")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t("settings.back")}
          </Link>

          <button
            type="button"
            className="sk-btn sk-btn--white"
            onClick={() => toast.message(t("settings.teamPanel.nothingToSave"))}
          >
            {t("common.save")}
          </button>
        </div>
      </header>

      <div className="sk-team-page__body">
        {capacityWarning ? (
          <div role="alert" className="sk-team-alert sk-team-alert--warn">
            {t("settings.teamPanel.capacityFull", { max: maxMembers })}
          </div>
        ) : null}

        {tempPasswordInfo ? (
          <div role="status" className="sk-team-alert sk-team-alert--info">
            <p className="font-semibold">
              {t("settings.teamPanel.tempPasswordFor", {
                email: tempPasswordInfo.email,
              })}
            </p>
            <p className="mt-1 font-mono text-base tracking-wide">
              {tempPasswordInfo.password}
            </p>
            <p className="mt-1 text-xs opacity-80">
              {t("settings.teamPanel.tempPasswordHint")}
            </p>
          </div>
        ) : null}

        <div className="sk-team-bar">
          <div className="sk-team-bar__info">
            <div className="sk-team-bar__name">{workspaceName}</div>
            <div className="sk-team-bar__note">{t("settings.teamPanel.teamNote")}</div>
          </div>
          <span className="sk-team-bar__spacer" aria-hidden />
          <div className="sk-team-bar__stat">
            <span className="sk-team-bar__label">{t("settings.teamPanel.planLabel")}</span>
            <span className="sk-team-bar__plan">
              {planDisplayName}
              <Sparkles className="h-3 w-3" aria-hidden />
            </span>
          </div>
          <div className="sk-team-bar__stat">
            <span className="sk-team-bar__label">{t("settings.teamPanel.perSeatLabel")}</span>
            <span className="sk-team-bar__price">{seatPriceLabel}</span>
          </div>
          <div className="sk-team-bar__seats">
            <span className="sk-team-bar__seats-count">
              {seatsUsed} / {maxMembers}
            </span>
            <span className="sk-team-bar__seats-label">
              {t("settings.teamPanel.seatsOccupied")}
            </span>
          </div>
          {canManage ? (
            <button
              type="button"
              className="sk-btn sk-btn--white sk-team-bar__invite"
              disabled={isPending}
              onClick={handlePozvatClick}
            >
              {t("settings.teamPanel.invite")}
            </button>
          ) : null}
        </div>

        <div className="sk-team-table">
          <div className="sk-team-table__head">
            <span className="sk-team-table__th">{t("settings.teamPanel.colName")}</span>
            <span className="sk-team-table__th">{t("settings.teamPanel.colEmail")}</span>
            <span className="sk-team-table__th">{t("settings.teamPanel.colRole")}</span>
            <span className="sk-team-table__th">{t("settings.teamPanel.colPrice")}</span>
            <span className="sk-team-table__th sk-team-table__th--end">
              {t("settings.teamPanel.colStatus")}
            </span>
          </div>
          <div className="sk-team-table__body">
            {teamMembers.map((member) => {
              const active = member.status === "AKTIVNÍ";
              const canRemove =
                canManage &&
                currentUserRole === "OWNER" &&
                member.id !== currentUserId &&
                member.role !== "OWNER";

              return (
                <div key={member.id} className="sk-team-table__row">
                  <div className="sk-team-table__name">
                    <TeamMemberAvatar
                      name={member.name}
                      avatarUrl={member.avatarUrl}
                    />
                    <span className="sk-team-table__name-text">{member.name}</span>
                    {canRemove ? (
                      <button
                        type="button"
                        className="sk-team-table__remove"
                        aria-label={t("settings.teamPanel.removeAria", {
                          email: member.email,
                        })}
                        title={t("settings.teamPanel.removeTitle")}
                        disabled={isPending}
                        onClick={() => handleRemove(member)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <span className="sk-team-table__email">{member.email}</span>
                  <span className="sk-team-table__role">{roleLabel(member.role, t)}</span>
                  <span className="sk-team-table__price">
                    {active ? seatPriceLabel : "—"}
                  </span>
                  <TeamStatusBadge
                    active={active}
                    label={
                      active
                        ? t("settings.teamPanel.active")
                        : t("settings.teamPanel.invited")
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {inviteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setInviteOpen(false)}
          role="presentation"
        >
          <div
            className="sk-settings-dialog relative w-full max-w-md p-8"
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
            <h3 className="sk-type-h3 mb-1">{t("settings.teamPanel.inviteTitle")}</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              {t("settings.teamPanel.inviteDialogHint")}
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t("settings.teamPanel.colEmail")}</Label>
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
                <Label htmlFor="invite-role">{t("settings.teamPanel.colRole")}</Label>
                <select
                  id="invite-role"
                  className={cn(
                    "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm",
                  )}
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "ADMIN" | "MEMBER")
                  }
                >
                  <option value="MEMBER">{t("settings.teamPanel.member")}</option>
                  <option value="ADMIN">{t("settings.teamPanel.admin")}</option>
                </select>
              </div>
              <Button
                type="button"
                className="h-11 w-full rounded-xl bg-[color:var(--sk-brand)] font-semibold text-white hover:bg-[color:var(--sk-brand)]/90"
                disabled={isPending || !inviteEmail.trim()}
                onClick={handleSendInvite}
              >
                {t("settings.teamPanel.addToTeam")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
