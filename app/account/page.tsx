"use client";

import { type ChangeEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Save, User, Mail, Shield, Bell, CreditCard, Link as LinkIcon, Users, Plus, Download, Loader2
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ProfilePageSkeleton } from "@/components/profile-loading";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl: string | null } | null>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // Přidali jsme stav načítání
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  useEffect(() => {
    void (async () => {
      try {
        const session = await getSessionUser();
        if (session.user?.email) {
          setUser({
            name: session.user.name && session.user.name !== "" ? session.user.name : "Uživatel",
            email: session.user.email,
            avatarUrl: session.user.avatarUrl ?? session.user.image ?? null,
          });
          setEmailValue(session.user.email);
        }
        if (session.workspace) {
          setWorkspace(session.workspace);
        }
      } finally {
        setIsLoading(false); // Ať se stane cokoliv, po načtení vypneme loading
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  // Přidané funkce pro interaktivitu tlačítek
  const handleChangePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    const result = await uploadProfileAvatar(file);
    setIsUploading(false);

    // A NAHRAĎ TO TÍMTO:
    if ("error" in result && result.error) {
      toast.error("Chyba nahrávání", { description: result.error });
      setPreviewUrl(null);
      return;
    }

    if (result.avatarUrl) {
      setUser((prev) =>
        prev
          ? { ...prev, avatarUrl: result.avatarUrl }
          : prev,
      );
      window.dispatchEvent(
        new CustomEvent("avatar-updated", { detail: result.avatarUrl }),
      );
      router.refresh();
    }
  };

  const handleSaveProfile = async () => {
    const nextEmail = emailValue.trim();
    const emailChanged = !!user && nextEmail.toLowerCase() !== user.email.trim().toLowerCase();

    // E-mail se nemění → klasické uložení ostatních údajů.
    if (!emailChanged) {
      toast.success("Uloženo", { description: "Vaše osobní údaje byly úspěšně uloženy." });
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
      const response = await fetch("/api/stripe/create-portal", { method: "POST" });
      if (!response.ok) {
        throw new Error("Nepodařilo se vytvořit Stripe Portal Session.");
      }
      const { url } = (await response.json()) as { url?: string };
      if (!url) {
        throw new Error("V odpovědi chybí URL zákaznického portálu.");
      }
      window.location.href = url;
    } catch {
      toast.error("Zatím nemáte aktivní platební profil. Přesměrovávám na výběr tarifu...", { id: toastId });
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
        <div className="mb-3 space-y-1 text-center md:mb-6 md:space-y-2">
          <div className="mb-1 flex items-center justify-center gap-2 md:mb-2 md:gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 md:rounded-2xl md:p-3">
              <User className="h-5 w-5 md:h-8 md:w-8" />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Můj profil
          </h1>
          <p className="mx-auto max-w-lg px-2 text-xs text-muted-foreground md:text-sm">
            Spravujte své osobní údaje, zabezpečení, fakturaci a integrace.
          </p>
        </div>

        <div className="flex w-full max-w-3xl flex-col gap-3 px-0 sm:gap-6 sm:px-4">
          
          {/* ACCORDION OBAL */}
          <Accordion type="single" collapsible defaultValue="personal" className="w-full space-y-2 sm:space-y-4">
            
            {/* 1. OSOBNÍ ÚDAJE */}
            <AccordionItem value="personal" className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800 transition-colors">
              <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <User className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-bold sm:text-lg">Osobní údaje</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-2">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleFileChange(e)}
                    />
                    <Avatar className="h-24 w-24 rounded-2xl border border-border/50 shadow-sm">
                    <AvatarImage src={previewUrl || user?.avatarUrl || undefined} alt={user?.name ?? "Uživatel"} />
                      <AvatarFallback className="rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-3xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      onClick={handleChangePhoto}
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      className="rounded-xl text-xs font-semibold"
                    >
                      {isUploading ? "Nahrávám..." : "Změnit fotku"}
                    </Button>
                  </div>

                  <div className="flex-1 w-full space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Jméno</Label>
                        <Input className="h-12 rounded-xl bg-background border-border/50 text-base" defaultValue={firstName} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Příjmení</Label>
                        <Input className="h-12 rounded-xl bg-background border-border/50 text-base" defaultValue={lastName} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" /> E-mailová adresa
                      </Label>
                      <Input
                        type="email"
                        className="h-12 rounded-xl bg-background border-border/50 text-base"
                        value={emailValue}
                        onChange={(e) => setEmailValue(e.target.value)}
                        disabled={isSavingProfile}
                      />
                      <p className="text-xs text-muted-foreground">
                        Změna e-mailu se potvrzuje 6místným kódem, který pošleme na novou adresu.
                      </p>
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => void handleSaveProfile()}
                        disabled={isSavingProfile}
                        className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Odesílám kód…
                          </>
                        ) : (
                          "Uložit změny"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. ZABEZPEČENÍ */}
            <AccordionItem value="security" className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800 transition-colors">
              <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-bold sm:text-lg">Zabezpečení účtu</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-2 space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aktuální heslo</Label>
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
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nové heslo</Label>
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
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Potvrdit nové heslo</Label>
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
                <Button
                  type="button"
                  onClick={() => void handlePasswordUpdate()}
                  variant="outline"
                  disabled={isUpdatingPassword}
                  className="mt-2 rounded-xl border-border/60 font-semibold hover:bg-muted"
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
              </AccordionContent>
            </AccordionItem>

            {/* 3. PROPOJENÉ ÚČTY (Integrace e-mailů pro Snipera) */}
            <AccordionItem value="integrations" className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800 transition-colors">
              <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <LinkIcon className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-bold sm:text-lg">Propojené e-mailové účty</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-2 space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Připojte své e-mailové schránky, aby mohl Sniper odesílat zprávy přímo z vaší adresy.
                </p>
                
                {/* Připojený účet */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-background">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Google Workspace</p>
                      <p className="text-xs text-muted-foreground">{user?.email ?? "bez e mailu"}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-md">
                    Připojeno
                  </span>
                </div>

                <Button asChild variant="outline" className="w-full border-dashed border-2 rounded-xl h-12 text-muted-foreground hover:text-foreground hover:bg-muted">
                  <Link href="/settings/connect-email">
                    <Plus className="mr-2 h-4 w-4" /> Přidat další schránku
                  </Link>
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* 4. FAKTURACE A PŘEDPLATNÉ */}
            <AccordionItem value="billing" className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800 transition-colors">
              <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-bold sm:text-lg">Fakturace a předplatné</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-2 space-y-6">
                
                {/* Aktuální plán */}
                <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                      {workspace?.subscriptionStatus === "FREE" ? "Zkušební účet" : 
                       workspace?.subscriptionStatus === "TRIAL" ? "Trial verze aktivní" : "Aktuální tarif"}
                    </h4>
                    <p className="text-2xl font-bold text-foreground">
                      {workspace?.planTier === "NONE" || !workspace?.planTier ? "Free Verze" : workspace.planTier}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kredity: {Math.max(0, (workspace?.creditsTotal || 0) - (workspace?.creditsUsed || 0))} / {workspace?.creditsTotal || 0}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={(e) => {
                      if (workspace?.subscriptionStatus === "FREE") {
                        e.preventDefault();
                        window.location.href = "/pricing";
                        return;
                      }
                      void handleBillingPortal(e);
                    }}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                  >
                    {workspace?.subscriptionStatus === "FREE" ? "Vybrat tarif" : "Spravovat předplatné"}
                  </Button>
                </div>

                {workspace?.subscriptionStatus !== "FREE" ? (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Platební metoda</h4>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-background text-sm text-muted-foreground">
                        Platební údaje jsou bezpečně spravovány v zákaznickém portálu (Stripe).
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
                      <div className="p-4 rounded-xl border border-border/60 bg-background text-sm text-muted-foreground">
                        Faktury se zobrazí v zákaznickém portálu po provedení první platby.
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl border border-border/60 bg-background text-sm text-muted-foreground text-center">
                    Pro zobrazení platebních metod a fakturační historie si prosím aktivujte placený tarif.
                  </div>
                )}
                
              </AccordionContent>
            </AccordionItem>

            {/* 5. NOTIFIKACE */}
            <AccordionItem value="notifications" className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800 transition-colors">
              <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-bold sm:text-lg">Upozornění a notifikace</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-2">
                <div className="space-y-6">
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Nová odpověď z kampaně</Label>
                      <p className="text-xs text-muted-foreground">Upozornit okamžitě, když lead odepíše na zprávu ze Sniperu.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Nové aktivity v CRM</Label>
                      <p className="text-xs text-muted-foreground">Upozornit mě, když se změní stav dealu nebo přibude úkol.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Týdenní reporty (Radar)</Label>
                      <p className="text-xs text-muted-foreground">Posílat souhrn nově objevených leadů z automatického hledání.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Nízký stav kreditů</Label>
                      <p className="text-xs text-muted-foreground">Poslat varování, když mi zbývá méně než 10 % měsíčních kreditů.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Obnova tarifu a konec trialu</Label>
                      <p className="text-xs text-muted-foreground">Připomenout blížící se platbu nebo konec zkušebního období.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Produktové novinky a tipy</Label>
                      <p className="text-xs text-muted-foreground">Nové funkce platformy a rady pro lepší konverze.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700" />
                  </div>

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
                <span className="font-semibold text-foreground">{emailValue}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
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