"use client";

import {
  type ChangeEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  Info,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getWorkspaceAccessState,
  requestEmailChange,
  verifyEmailChange,
} from "@/app/actions/auth";
import { uploadProfileAvatar } from "@/app/actions/user";
import { TrialStrip } from "@/components/account/trial-strip";
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import { LegalDocumentLinks } from "@/components/legal/legal-document-links";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ProfilePageLoadingSpinner } from "@/components/profile-loading";
import { useLanguage } from "@/context/LanguageContext";
import { DATE_LOCALE } from "@/lib/i18n/types";
import { formatCzk } from "@/lib/pricing/plan-catalog";
import { cn } from "@/lib/utils";

function formatPlanDisplayName(planTier: string) {
  const tier = planTier.toUpperCase();
  if (tier === "AGENCY_GROWTH") return "AGENCY PRO";
  if (tier === "AGENCY_STARTER") return "AGENCY STANDARD";
  if (tier === "AGENCY_SCALE") return "AGENCY SCALE";
  return tier.replace(/_/g, " ");
}

export default function AccountPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [trialRemainingDays, setTrialRemainingDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailValue, setEmailValue] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isConfirmingCode, setIsConfirmingCode] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const session = await getWorkspaceAccessState();
        if (session.user?.email) {
          setUser({
            name:
              session.user.name && session.user.name !== ""
                ? session.user.name
                : t("account.userFallback"),
            email: session.user.email,
            avatarUrl: session.user.avatarUrl ?? session.user.image ?? null,
          });
          setEmailValue(session.user.email);
        }
        if (session.workspace) {
          setWorkspace(session.workspace);
        }
        setIsTrial(Boolean(session.isTrial));
        setTrialRemainingDays(session.trialRemainingDays ?? 0);
      } finally {
        setIsLoading(false);
      }
    })();

    const params = new URLSearchParams(window.location.search);
    if (params.get("needs_email") === "1") {
      toast.message(t("account.toast.needsEmailTitle"), {
        description: t("account.toast.needsEmailDesc"),
      });
      window.history.replaceState({}, "", "/account");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    };
  }, [cropImageSrc]);

  const userFallback = t("account.userFallback");
  const initials = useMemo(
    () =>
      (user?.name ?? userFallback)
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(""),
    [user?.name, userFallback],
  );

  const firstName = (user?.name ?? userFallback).split(/\s+/)[0];
  const lastName = (user?.name ?? "").split(/\s+/).slice(1).join(" ");

  const handleChangePhoto = () => fileInputRef.current?.click();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("account.toast.pickImage"));
      return;
    }
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(URL.createObjectURL(file));
    setCropOpen(true);
  };

  const handleCropConfirm = async (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setIsUploading(true);
    const result = await uploadProfileAvatar(file);
    setIsUploading(false);
    if ("error" in result && result.error) {
      toast.error(t("account.toast.uploadError"), { description: result.error });
      setPreviewUrl(null);
      return;
    }
    if (result.avatarUrl) {
      setUser((prev) => (prev ? { ...prev, avatarUrl: result.avatarUrl } : prev));
      window.dispatchEvent(new CustomEvent("avatar-updated", { detail: result.avatarUrl }));
      setCropOpen(false);
      if (cropImageSrc) { URL.revokeObjectURL(cropImageSrc); setCropImageSrc(null); }
      toast.success(t("account.toast.photoSaved"));
      router.refresh();
    }
  };

  const handleCropOpenChange = (open: boolean) => {
    if (isUploading) return;
    setCropOpen(open);
    if (!open && cropImageSrc) { URL.revokeObjectURL(cropImageSrc); setCropImageSrc(null); }
  };

  const handleSaveProfile = async () => {
    const nextEmail = emailValue.trim();
    const emailChanged = !!user && nextEmail.toLowerCase() !== user.email.trim().toLowerCase();
    if (!emailChanged) {
      toast.success(t("account.saved"), { description: t("account.toast.profileSaved") });
      return;
    }
    setIsSavingProfile(true);
    try {
      const result = await requestEmailChange(nextEmail);
      if ("error" in result) { toast.error(result.error); return; }
      setVerificationCode("");
      setIsVerifyingEmail(true);
      toast.success(t("account.toast.codeSentTitle"), {
        description: t("account.toast.codeSentDesc", { email: nextEmail }),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    const code = verificationCode.trim();
    if (code.length !== 6) { toast.error(t("account.toast.enterCode")); return; }
    setIsConfirmingCode(true);
    try {
      const result = await verifyEmailChange(code);
      if ("error" in result) { toast.error(result.error); return; }
      setUser((prev) => (prev ? { ...prev, email: result.email } : prev));
      setEmailValue(result.email);
      setIsVerifyingEmail(false);
      setVerificationCode("");
      toast.success(t("account.toast.emailChanged"));
      router.refresh();
    } finally {
      setIsConfirmingCode(false);
    }
  };

  const handleBillingPortal = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const toastId = toast.loading(t("account.toast.portalRedirect"));
    try {
      const response = await fetch("/api/stripe/create-portal", { method: "POST" });
      if (!response.ok) throw new Error("Portal error");
      const { url } = (await response.json()) as { url?: string };
      if (!url) throw new Error("No URL");
      window.location.href = url;
    } catch {
      toast.error(t("account.toast.noBillingProfile"), { id: toastId });
      setTimeout(() => { window.location.href = "/pricing"; }, 2000);
    }
  };

  if (isLoading) return <ProfilePageLoadingSpinner />;

  const creditsUsed = workspace?.creditsUsed || 0;
  const creditsTotal = workspace?.creditsTotal || 0;
  const usagePct = Math.round(
    (creditsUsed / Math.max(1, creditsTotal)) * 100,
  );
  const planName =
    workspace?.planTier === "NONE" || !workspace?.planTier
      ? t("account.freePlan")
      : formatPlanDisplayName(workspace.planTier);
  const isAgency = workspace?.planTier?.startsWith("AGENCY");
  const avatarSrc = previewUrl || user?.avatarUrl || undefined;
  const showTrialStrip = isTrial && trialRemainingDays > 0;

  const NAV_ROWS: Array<{ label: string; sub: string; href: string }> = [
    { label: t("account.security"), sub: t("account.securitySub"), href: "/account/security" },
    { label: t("account.billing"), sub: t("account.billingSub"), href: "/account/billing" },
    { label: t("account.notifications"), sub: t("account.notificationsSub"), href: "/account/notifications" },
    { label: t("account.connectedEmails"), sub: t("account.connectedEmailsSub"), href: "/account/emails" },
    { label: t("account.exportData"), sub: t("account.exportDataSub"), href: "/account/export" },
    { label: t("account.devices"), sub: t("account.devicesSub"), href: "/account/devices" },
  ];

  return (
    <div className="sk-profile-page">
      <div className="sk-profile-page__head shrink-0">
        <div className="sk-page-head sk-page-head--tool">
          <h1 className="sk-page-head__title">{t("account.profileTitle")}</h1>
          <p className="sk-page-head__sub">{t("account.profileSubtitle")}</p>
        </div>
        {showTrialStrip ? (
          <TrialStrip
            remainingDays={trialRemainingDays}
            creditsUsed={creditsUsed}
            creditsTotal={creditsTotal}
          />
        ) : null}
      </div>

      {/* Profile strip — Matej ws2-profilehead */}
      <div className="sk-profile-head shrink-0">
        <div className="sk-profile-head__avatar-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
          <Avatar className="sk-profile-head__avatar">
            <AvatarImage
              src={avatarSrc}
              alt={user?.name ?? userFallback}
              className="h-full w-full object-cover"
            />
            <AvatarFallback className="sk-profile-head__avatar-fallback">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={handleChangePhoto}
            disabled={isUploading}
            className="sk-profile-head__photo-btn"
            aria-label={t("account.changePhoto")}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <AvatarCropDialog
            open={cropOpen}
            imageSrc={cropImageSrc}
            onOpenChange={handleCropOpenChange}
            onConfirm={handleCropConfirm}
            isSaving={isUploading}
          />
        </div>

        <div className="sk-profile-head__identity">
          <div className="sk-profile-head__name">
            {user?.name ?? userFallback}
          </div>
          <div className="sk-profile-head__email">{user?.email}</div>
        </div>

        <span className="sk-profile-head__spacer" aria-hidden />

        <div className="sk-profile-head__stats">
          <div className="sk-profile-head__stat">
            <span className="sk-profile-head__stat-label">
              {t("account.profilePlanLabel")}
            </span>
            <span className="sk-profile-head__stat-plan">
              {planName}
              <Sparkles className="h-3 w-3 shrink-0" strokeWidth={1.9} aria-hidden />
            </span>
          </div>
          <div className="sk-profile-head__stat">
            <span className="sk-profile-head__stat-label">
              {t("account.profileUsageLabel")}
            </span>
            <span
              className="sk-profile-head__stat-usage"
              data-level={
                usagePct >= 90 ? "high" : usagePct >= 70 ? "mid" : "low"
              }
            >
              {usagePct} %
            </span>
          </div>
          {isAgency ? (
            <div className="sk-profile-head__stat">
              <span className="sk-profile-head__stat-label">
                {t("account.profileSeatsLabel")}
              </span>
              <span className="sk-profile-head__stat-seats">
                {workspace?.memberCount ?? 0} / {workspace?.maxSeats ?? 5}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Matej 2×2 — fills remaining page height */}
      <div className="sk-profile-grid">
        <section className="sk-profile-panel" aria-labelledby="profile-personal-title">
          <h2 id="profile-personal-title" className="sk-profile-panel__title">
            {t("account.personalData")}
          </h2>
          <div className="sk-profile-personal__names">
            <div className="sk-profile-field">
              <label className="sk-field-label" htmlFor="profile-first-name">
                {t("account.firstName")}
              </label>
              <input
                id="profile-first-name"
                type="text"
                className="sk-profile-input"
                defaultValue={firstName}
                autoComplete="given-name"
              />
            </div>
            <div className="sk-profile-field">
              <label className="sk-field-label" htmlFor="profile-last-name">
                {t("account.lastName")}
              </label>
              <input
                id="profile-last-name"
                type="text"
                className="sk-profile-input"
                defaultValue={lastName}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="sk-profile-personal__email-row">
            <div className="sk-profile-field sk-profile-field--grow">
              <label className="sk-field-label" htmlFor="profile-email">
                {t("account.emailAddress")}
              </label>
              <input
                id="profile-email"
                type="email"
                className="sk-profile-input"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                disabled={isSavingProfile}
                autoComplete="email"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={isSavingProfile}
              className="sk-btn sk-btn--white sk-profile-personal__save"
            >
              {isSavingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("account.saveChanges")
              )}
            </button>
          </div>
          <p className="sk-profile-personal__hint">{t("account.emailChangeHint")}</p>
        </section>

        <section
          className="sk-profile-panel sk-profile-panel--agency"
          aria-labelledby="profile-agency-title"
        >
          <div className="sk-profile-agency__head">
            <h2 id="profile-agency-title" className="sk-profile-panel__title">
              {t("account.agencyTitle")}
            </h2>
            <span className="sk-profile-agency__badge">
              <Lock className="h-[11px] w-[11px]" strokeWidth={2.2} aria-hidden />
              {t("account.agencyLocked")}
            </span>
          </div>
          <div className="sk-profile-personal__names sk-profile-agency__fields">
            <div className="sk-profile-field">
              <span className="sk-field-label">{t("account.agencyNameLabel")}</span>
              <div className="sk-profile-locked">{workspace?.companyName ?? "—"}</div>
            </div>
            <div className="sk-profile-field">
              <span className="sk-field-label">{t("account.agencyOwnerLabel")}</span>
              <div className="sk-profile-locked">{user?.name ?? "—"}</div>
            </div>
          </div>
          <div className="sk-profile-agency__foot">
            <p className="sk-profile-personal__hint">{t("account.agencyNote")}</p>
            <Link
              href="/settings/team"
              className="sk-btn sk-btn--secondary sk-profile-agency__manage"
            >
              {t("account.agencyManage")}
            </Link>
          </div>
        </section>

        <section
          className="sk-profile-panel sk-profile-panel--plan"
          aria-labelledby="profile-plan-title"
        >
          <div className="sk-profile-plan__head">
            <h2 id="profile-plan-title" className="sk-profile-panel__title">
              {t("account.planTitle")}
            </h2>
            <span className="sk-profile-plan__badge">
              {planName.toUpperCase()}
              <Sparkles className="h-3 w-3" strokeWidth={1.9} aria-hidden />
            </span>
          </div>
          <div className="sk-profile-plan__bar">
            <span
              className="sk-profile-plan__bar-fill"
              style={{ width: `${Math.min(100, usagePct)}%` }}
              data-level={
                usagePct >= 90 ? "high" : usagePct >= 70 ? "mid" : "low"
              }
            />
          </div>
          <div className="sk-profile-plan__usage">
            <span className="sk-profile-plan__usage-label">
              {t("account.profileUsageLabel")}
            </span>
            <span
              className="sk-profile-plan__usage-value"
              data-level={
                usagePct >= 90 ? "high" : usagePct >= 70 ? "mid" : "low"
              }
            >
              {usagePct} %
            </span>
          </div>
          <div className="sk-profile-plan__lines">
            {[
              [t("account.planTarif"), planName, "strong"],
              [
                t("account.planPerMember"),
                workspace?.planTier !== "NONE"
                  ? formatCzk(690, DATE_LOCALE[language])
                  : "—",
                "medium",
              ],
              [
                t("account.planSeats"),
                `${workspace?.memberCount ?? 0} / ${workspace?.maxSeats ?? 5}`,
                "medium",
              ],
              [
                t("account.planTotal"),
                workspace?.planTier !== "NONE"
                  ? formatCzk(
                      (workspace?.memberCount ?? 0) * 690,
                      DATE_LOCALE[language],
                    )
                  : "—",
                "strong",
              ],
            ].map(([label, value, weight]) => (
              <div key={label as string} className="sk-profile-plan__line">
                <span className="sk-profile-plan__line-label">{label as string}</span>
                <span
                  className={cn(
                    "sk-profile-plan__line-value",
                    weight === "strong"
                      ? "sk-profile-plan__line-value--strong"
                      : "sk-profile-plan__line-value--medium",
                  )}
                >
                  {value as string}
                </span>
              </div>
            ))}
          </div>
          <div className="sk-profile-plan__note">
            <span className="sk-profile-plan__note-icon">
              <Info className="h-[11px] w-[11px]" strokeWidth={2} aria-hidden />
            </span>
            <span className="sk-profile-plan__note-text">{t("account.planNote")}</span>
          </div>
          <Link href="/pricing" className="sk-btn sk-btn--white sk-profile-plan__cta">
            {t("account.upgradePlan")}
          </Link>
        </section>

        <nav className="sk-profile-rows" aria-label={t("account.profileSubtitle")}>
          {NAV_ROWS.map((row) => (
            <Link key={row.label} href={row.href} className="sk-profile-row">
              <div className="sk-profile-row__main">
                <div className="sk-profile-row__title">{row.label}</div>
                <div className="sk-profile-row__sub">{row.sub}</div>
              </div>
              <ChevronRight className="sk-profile-row__chevron h-[13px] w-[13px]" aria-hidden />
            </Link>
          ))}
        </nav>
      </div>

      <LegalDocumentLinks className="sk-profile-legal" />

      {/* Email verification dialog */}
      <Dialog
        open={isVerifyingEmail}
        onOpenChange={(open) => { if (!isConfirmingCode) setIsVerifyingEmail(open); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("account.verifyEmailTitle")}</DialogTitle>
            <DialogDescription>
              {t("account.verifyEmailDesc", { email: emailValue })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") void handleConfirmEmailChange(); }}
              placeholder="000000"
              className="h-14 rounded-xl text-center text-2xl font-bold tracking-[0.5em]"
              disabled={isConfirmingCode}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsVerifyingEmail(false)} disabled={isConfirmingCode}>
                {t("account.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmEmailChange()}
                disabled={isConfirmingCode || verificationCode.length !== 6}
                className="bg-[color:var(--sk-brand)] font-semibold text-white hover:bg-[color:var(--sk-brand)]/90"
              >
                {isConfirmingCode ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("account.confirming")}</> : t("account.confirmChangeEmail")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
