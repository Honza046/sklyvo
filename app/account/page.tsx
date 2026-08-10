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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  User,
  Mail,
  Shield,
  Bell,
  CreditCard,
  Link as LinkIcon,
  Users,
  Plus,
  Download,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getSessionUser,
  updateUserPassword,
  requestEmailChange,
  verifyEmailChange,
} from "@/app/actions/auth";
import { uploadProfileAvatar } from "@/app/actions/user";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/app/actions/notifications";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPreferences,
} from "@/lib/emails/notification-prefs";
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ProfilePageSkeleton } from "@/components/profile-loading";
import { AccountInvoiceHistory } from "@/components/account-invoice-history";
import { AccountTwoFactorPanel } from "@/components/account-two-factor-panel";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // Přidali jsme stav načítání
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [emailValue, setEmailValue] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isConfirmingCode, setIsConfirmingCode] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFS,
  );
  const [savingNotifKey, setSavingNotifKey] = useState<
    keyof NotificationPreferences | null
  >(null);

  useEffect(() => {
    void (async () => {
      try {
        const session = await getSessionUser();
        if (session.user?.email) {
          setUser({
            name:
              session.user.name && session.user.name !== ""
                ? session.user.name
                : "Uživatel",
            email: session.user.email,
            avatarUrl: session.user.avatarUrl ?? session.user.image ?? null,
          });
          setEmailValue(session.user.email);
        }
        if (session.workspace) {
          setWorkspace(session.workspace);
        }
        const prefs = await getNotificationPreferences();
        if (!("error" in prefs)) {
          setNotifPrefs(prefs);
        }
      } finally {
        setIsLoading(false); // Ať se stane cokoliv, po načtení vypneme loading
      }
    })();

    const params = new URLSearchParams(window.location.search);
    if (params.get("needs_email") === "1") {
      toast.message("Doplňte svůj e-mail", {
        description:
          "Facebook nevrátil e-mailovou adresu. Nastavte ji tady v účtu.",
      });
      window.history.replaceState({}, "", "/account");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc);
      }
    };
  }, [cropImageSrc]);

  const initials = useMemo(
    () =>
      (user?.name ?? "Uživatel")
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(""),
    [user?.name],
  );

  const firstName = (user?.name ?? "Uživatel").split(/\s+/)[0];
  const lastName = (user?.name ?? "").split(/\s+/).slice(1).join(" ");

  const handleToggleNotification = async (
    key: keyof NotificationPreferences,
    checked: boolean,
  ) => {
    const previous = notifPrefs;
    setNotifPrefs((prev) => ({ ...prev, [key]: checked }));
    setSavingNotifKey(key);
    try {
      const result = await updateNotificationPreferences({ [key]: checked });
      if ("error" in result) {
        setNotifPrefs(previous);
        toast.error(result.error);
        return;
      }
      toast.success(checked ? "Upozornění zapnuto" : "Upozornění vypnuto");
    } finally {
      setSavingNotifKey(null);
    }
  };

  const handleChangePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vyberte obrázek (JPG, PNG, WebP…).");
      return;
    }

    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    const localSrc = URL.createObjectURL(file);
    setCropImageSrc(localSrc);
    setCropOpen(true);
  };

  const handleCropConfirm = async (file: File) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    const result = await uploadProfileAvatar(file);
    setIsUploading(false);

    if ("error" in result && result.error) {
      toast.error("Chyba nahrávání", { description: result.error });
      setPreviewUrl(null);
      return;
    }

    if (result.avatarUrl) {
      setUser((prev) =>
        prev ? { ...prev, avatarUrl: result.avatarUrl } : prev,
      );
      window.dispatchEvent(
        new CustomEvent("avatar-updated", { detail: result.avatarUrl }),
      );
      setCropOpen(false);
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc);
        setCropImageSrc(null);
      }
      toast.success("Profilová fotka byla uložena.");
      router.refresh();
    }
  };

  const handleCropOpenChange = (open: boolean) => {
    if (isUploading) return;
    setCropOpen(open);
    if (!open && cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  };

  const handleSaveProfile = async () => {
    const nextEmail = emailValue.trim();
    const emailChanged =
      !!user && nextEmail.toLowerCase() !== user.email.trim().toLowerCase();

    // E-mail se nemění → klasické uložení ostatních údajů.
    if (!emailChanged) {
      toast.success("Uloženo", {
        description: "Vaše osobní údaje byly úspěšně uloženy.",
      });
      return;
    }

    // E-mail se mění → nejdřív vyžádáme ověřovací kód na novou adresu.
    setIsSavingProfile(true);
    try {
      const result = await requestEmailChange(nextEmail);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setVerificationCode("");
      setIsVerifyingEmail(true);
      toast.success("Ověřovací kód byl odeslán", {
        description: `Zadejte 6místný kód, který jsme poslali na ${nextEmail}.`,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    const code = verificationCode.trim();
    if (code.length !== 6) {
      toast.error("Zadejte 6místný kód.");
      return;
    }
    setIsConfirmingCode(true);
    try {
      const result = await verifyEmailChange(code);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setUser((prev) => (prev ? { ...prev, email: result.email } : prev));
      setEmailValue(result.email);
      setIsVerifyingEmail(false);
      setVerificationCode("");
      toast.success("E-mail byl úspěšně změněn.");
      router.refresh();
    } finally {
      setIsConfirmingCode(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Nová hesla se neshodují.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("Nové heslo musí být jiné než to stávající.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Nové heslo musí mít alespoň 8 znaků.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const result = await updateUserPassword({ currentPassword, newPassword });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Heslo bylo úspěšně změněno.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  const handleBillingPortal = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const toastId = toast.loading("Přesměrovávám do zabezpečeného portálu...");
    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Nepodařilo se vytvořit Stripe Portal Session.");
      }
      const { url } = (await response.json()) as { url?: string };
      if (!url) {
        throw new Error("V odpovědi chybí URL zákaznického portálu.");
      }
      window.location.href = url;
    } catch {
      toast.error(
        "Zatím nemáte aktivní platební profil. Přesměrovávám na výběr tarifu...",
        { id: toastId },
      );
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 2000);
    }
  };

  if (isLoading) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-start pb-24 pt-0 md:pb-28">
      {/* HLAVIČKA */}
      <div className="mb-3 w-full max-w-3xl space-y-1 text-center md:mb-6 md:space-y-2">
        <div className="mb-1 flex items-center justify-center gap-2 md:mb-2 md:gap-3">
          <div className="sk-page-badge" aria-hidden>
            <User strokeWidth={2} />
          </div>
        </div>
        <h1 className="sk-type-h1">Můj profil</h1>
        <p className="sk-type-body mx-auto max-w-lg px-2">
          Spravujte své osobní údaje, zabezpečení, fakturaci a integrace.
        </p>
      </div>

      <div className="flex w-full max-w-3xl flex-col gap-3 px-0 sm:gap-6">
        {/* ACCORDION OBAL */}
        <Accordion
          type="single"
          collapsible
          defaultValue="personal"
          className="w-full space-y-2 sm:space-y-4"
        >
          {/* 1. OSOBNÍ ÚDAJE */}
          <AccordionItem
            value="personal"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 [state=open]:border-blue-800 transition-colors"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 ">
                  <User className="h-5 w-5" />
                </div>
                <h2 className="sk-type-h3">Osobní údaje</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
                  <div className="mx-auto flex w-[7.75rem] shrink-0 flex-col gap-2 sm:mx-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleFileChange(e)}
                    />
                    <div className="relative min-h-[7.75rem] w-full flex-1 overflow-hidden rounded-2xl border border-border/50 shadow-md">
                      <Avatar className="absolute inset-0 h-full w-full shrink rounded-2xl">
                        <AvatarImage
                          src={previewUrl || user?.avatarUrl || undefined}
                          alt={user?.name ?? "Uživatel"}
                          className="h-full w-full object-cover"
                        />
                        <AvatarFallback className="h-full w-full rounded-2xl bg-blue-50 text-3xl font-bold text-blue-700">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePhoto}
                      disabled={isUploading}
                      className="sk-press-btn sk-btn sk-btn--secondary h-10 w-full shrink-0 whitespace-nowrap px-2 text-[11px] font-semibold"
                    >
                      {isUploading ? "Nahrávám…" : "Změnit fotku"}
                    </button>
                    <AvatarCropDialog
                      open={cropOpen}
                      imageSrc={cropImageSrc}
                      onOpenChange={handleCropOpenChange}
                      onConfirm={handleCropConfirm}
                      isSaving={isUploading}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Jméno
                        </Label>
                        <Input
                          className="h-10 rounded-xl border-border/50 bg-background text-sm"
                          defaultValue={firstName}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Příjmení
                        </Label>
                        <Input
                          className="h-10 rounded-xl border-border/50 bg-background text-sm"
                          defaultValue={lastName}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> E-mailová adresa
                      </Label>
                      <Input
                        type="email"
                        className="h-10 rounded-xl border-border/50 bg-background text-sm"
                        value={emailValue}
                        onChange={(e) => setEmailValue(e.target.value)}
                        disabled={isSavingProfile}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] leading-snug text-muted-foreground sm:pl-[calc(7.75rem+1.25rem)]">
                  Změna e-mailu se potvrzuje 6místným kódem, který pošleme na
                  novou adresu.
                </p>

                <div className="flex justify-end border-t border-border/50 pt-3">
                  <button
                    type="button"
                    onClick={() => void handleSaveProfile()}
                    disabled={isSavingProfile}
                    className="sk-btn sk-btn--primary sk-btn--sm inline-flex items-center justify-center gap-2"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Odesílám kód…
                      </>
                    ) : (
                      "Uložit změny"
                    )}
                  </button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. ZABEZPEČENÍ */}
          <AccordionItem
            value="security"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 [state=open]:border-blue-800 transition-colors"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 ">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="sk-type-h3">Zabezpečení účtu</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Aktuální heslo
                </Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isUpdatingPassword}
                  className="h-12 max-w-md rounded-xl border-border/50 bg-background"
                  placeholder="Zadejte aktuální heslo"
                />
              </div>
              <div className="grid max-w-md grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Nové heslo
                  </Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isUpdatingPassword}
                    className="h-12 rounded-xl border-border/50 bg-background"
                    placeholder="Min. 8 znaků"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Potvrdit nové heslo
                  </Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isUpdatingPassword}
                    className="h-12 rounded-xl border-border/50 bg-background"
                    placeholder="Znovu nové heslo"
                  />
                </div>
              </div>
              <div className="pt-1">
                <Button
                  type="button"
                  onClick={() => void handlePasswordUpdate()}
                  variant="outline"
                  disabled={isUpdatingPassword}
                  className="sk-press-btn rounded-xl border-border/60 font-semibold"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ukládám…
                    </>
                  ) : (
                    "Aktualizovat heslo"
                  )}
                </Button>
              </div>

              <AccountTwoFactorPanel />
            </AccordionContent>
          </AccordionItem>

          {/* 3. PROPOJENÉ ÚČTY (Integrace e-mailů pro Snipera) */}
          <AccordionItem
            value="integrations"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 [state=open]:border-blue-800 transition-colors"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 ">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <h2 className="sk-type-h3">Propojené e-mailové účty</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Připojte své e-mailové schránky, aby mohl Sniper odesílat zprávy
                přímo z vaší adresy.
              </p>

              {/* Připojený účet */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-background">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-slate-600 " />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Google Workspace</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email ?? "bez e mailu"}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-md">
                  Připojeno
                </span>
              </div>

              <div className="pb-1 pt-1">
                <Button
                  asChild
                  variant="secondary"
                  className="sk-press-btn h-12 w-full rounded-xl font-semibold"
                >
                  <Link
                    href="/settings/connect-email"
                    className="text-[color:var(--sk-ink)]"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Přidat další schránku
                  </Link>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4. FAKTURACE A PŘEDPLATNÉ */}
          <AccordionItem
            value="billing"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 [state=open]:border-blue-800 transition-colors"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 ">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="sk-type-h3">Fakturace a předplatné</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2 space-y-6">
              {/* Aktuální plán */}
              <div className="sk-billing-card flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="sk-billing-card__eyebrow mb-1 text-[10px] font-bold uppercase tracking-widest">
                      {workspace?.subscriptionStatus === "FREE"
                        ? "Zkušební účet"
                        : workspace?.subscriptionStatus === "TRIAL"
                          ? "Trial verze aktivní"
                          : "Aktuální tarif"}
                    </h4>
                    <p className="sk-billing-card__title sk-type-h2">
                      {workspace?.planTier === "NONE" || !workspace?.planTier
                        ? "Free Verze"
                        : workspace.planTier}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      asChild
                      className="sk-billing-card__secondary h-11 rounded-xl font-semibold"
                    >
                      <Link href="/pricing">
                        {workspace?.subscriptionStatus === "FREE" ||
                        workspace?.planTier === "NONE" ||
                        !workspace?.planTier
                          ? "Vybrat tarif"
                          : "Změnit tarif"}
                      </Link>
                    </Button>
                    {workspace?.subscriptionStatus !== "FREE" &&
                      workspace?.planTier &&
                      workspace.planTier !== "NONE" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => void handleBillingPortal(e)}
                          className="sk-billing-card__primary h-11 rounded-xl font-semibold"
                        >
                          Spravovat předplatné
                        </Button>
                      )}
                  </div>
                </div>
                {(() => {
                  const usagePct = Math.round(
                    ((workspace?.creditsUsed || 0) /
                      Math.max(1, workspace?.creditsTotal || 0)) *
                      100,
                  );
                  return (
                    <div className="w-full space-y-1.5">
                      <p className="sk-billing-card__meta sk-type-small">
                        Spotřeba: {usagePct} %
                      </p>
                      <div className="sk-billing-card__meter sk-meter__track w-full">
                        <div
                          className="sk-meter__fill"
                          style={{ width: `${Math.min(100, usagePct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {workspace?.subscriptionStatus !== "FREE" ? (
                <>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Platební metoda</h4>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-background text-sm text-muted-foreground">
                      Platební údaje jsou bezpečně spravovány v zákaznickém
                      portálu (Stripe).
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => void handleBillingPortal(e)}
                        className="text-xs font-semibold hover:bg-muted rounded-lg text-foreground"
                      >
                        Změnit kartu
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Historie faktur</h4>
                    <AccountInvoiceHistory />
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl border border-border/60 bg-background text-sm text-muted-foreground text-center">
                  Pro zobrazení platebních metod a fakturační historie si prosím
                  aktivujte placený tarif.
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 5. NOTIFIKACE */}
          <AccordionItem
            value="notifications"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 [state=open]:border-blue-800 transition-colors"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 ">
                  <Bell className="h-5 w-5" />
                </div>
                <h2 className="sk-type-h3">Upozornění a notifikace</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              <div className="space-y-6">
                {(
                  [
                    {
                      key: "notifyCampaignReply" as const,
                      title: "Nová odpověď z kampaně",
                      desc: "Upozornit okamžitě, když lead odepíše na zprávu ze Sniperu.",
                    },
                    {
                      key: "notifyCrmActivity" as const,
                      title: "Nové aktivity v CRM",
                      desc: "Upozornit mě, když se změní stav dealu nebo přibude úkol.",
                    },
                    {
                      key: "notifyWeeklyRadarReport" as const,
                      title: "Týdenní reporty (Radar)",
                      desc: "Posílat souhrn nově objevených leadů z automatického hledání.",
                    },
                    {
                      key: "notifyLowCredits" as const,
                      title: "Nízký stav kreditů",
                      desc: "Poslat varování, když spotřeba limitu přesáhne 90 %.",
                    },
                    {
                      key: "notifyBillingTrial" as const,
                      title: "Obnova tarifu a konec trialu",
                      desc: "Připomenout blížící se platbu nebo konec zkušebního období.",
                    },
                    {
                      key: "notifyProductTips" as const,
                      title: "Produktové novinky a tipy",
                      desc: "Nové funkce platformy a rady pro lepší konverze.",
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">
                        {item.title}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                    <Switch
                      className="sk-switch--sm shrink-0"
                      checked={notifPrefs[item.key]}
                      disabled={savingNotifKey === item.key}
                      onCheckedChange={(checked) => {
                        void handleToggleNotification(item.key, checked);
                      }}
                    />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <Dialog
        open={isVerifyingEmail}
        onOpenChange={(open) => {
          if (!isConfirmingCode) setIsVerifyingEmail(open);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ověření nové e-mailové adresy</DialogTitle>
            <DialogDescription>
              Zadejte 6místný kód, který jsme poslali na{" "}
              <span className="font-semibold text-foreground">
                {emailValue}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleConfirmEmailChange();
              }}
              placeholder="000000"
              className="h-14 rounded-xl text-center text-2xl font-bold tracking-[0.5em]"
              disabled={isConfirmingCode}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVerifyingEmail(false)}
                disabled={isConfirmingCode}
              >
                Zrušit
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmEmailChange()}
                disabled={isConfirmingCode || verificationCode.length !== 6}
                className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
              >
                {isConfirmingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ověřuji…
                  </>
                ) : (
                  "Potvrdit a změnit e-mail"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
