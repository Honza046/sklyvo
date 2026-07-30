"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { generateOfferDocument } from "@/app/actions/storage";
import {
  generateOfferGoogleDoc,
  getGoogleDriveConnectionState,
  getGoogleDriveOAuthUrl,
  linkGoogleDocToStorage,
  listLinkedGoogleDocs,
} from "@/app/actions/google-drive";
import type { GoogleDriveFileRow } from "@/lib/google-drive-docs";
import {
  generateOfferWordDoc,
  getMicrosoftConnectionState,
  getMicrosoftOAuthUrl,
} from "@/app/actions/microsoft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function formatDocDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function GeneratorPage() {
  const router = useRouter();
  const [docType, setDocType] = useState<"offer" | "contract">("offer");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CZK");
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("14 dní");
  const [notes, setNotes] = useState("");
  const [saveTo, setSaveTo] = useState<"PERSONAL" | "SHARED">("PERSONAL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftConnecting, setMicrosoftConnecting] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsQuery, setDocsQuery] = useState("");
  const [googleDocs, setGoogleDocs] = useState<GoogleDriveFileRow[]>([]);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const refreshGoogleDocs = useCallback(async (query?: string) => {
    setDocsLoading(true);
    try {
      const result = await listLinkedGoogleDocs(query);
      if ("error" in result) {
        toast.error(result.error);
        setGoogleDocs([]);
        return;
      }
      setGoogleDocs(result.files);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    void getGoogleDriveConnectionState().then((state) => {
      setGoogleConnected(state.connected);
      setGoogleEmail(state.accountEmail);
      if (state.connected) void refreshGoogleDocs();
    });
    void getMicrosoftConnectionState().then((state) => {
      setMicrosoftConnected(state.connected);
    });
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleConnected") === "1") {
      toast.success("Google Docs propojeno — dokumenty se zobrazí u vás i v Google.");
      setGoogleConnected(true);
      params.delete("googleConnected");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
      void refreshGoogleDocs();
    }
    if (params.get("msConnected") === "1") {
      toast.success("Microsoft 365 připojeno — můžete vytvořit Word dokument.");
      setMicrosoftConnected(true);
      params.delete("msConnected");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    const msError = params.get("msError");
    if (msError) {
      toast.error(decodeURIComponent(msError));
      params.delete("msError");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [refreshGoogleDocs]);

  const formPayload = () => ({
    type: docType,
    clientName,
    clientCompany,
    subject,
    description,
    amount,
    currency,
    validUntil,
    paymentTerms,
    notes,
    saveTo,
  });

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const result = await generateOfferDocument(formPayload());
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        docType === "contract"
          ? "Smlouva vytvořena a uložena do Úložiště."
          : "Nabídka vytvořena a uložena do Úložiště.",
      );
      if (result.downloadUrl) {
        window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
      }
      router.push("/uloziste");
    } finally {
      setIsGenerating(false);
    }
  };

  const connectGoogle = async () => {
    setGoogleConnecting(true);
    try {
      const result = await getGoogleDriveOAuthUrl("/generator");
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.url;
    } finally {
      setGoogleConnecting(false);
    }
  };

  const handleCreateInGoogleDocs = async () => {
    if (!googleConnected) {
      await connectGoogle();
      return;
    }
    if (!subject.trim()) {
      toast.error("Pro vytvoření v Google Docs vyplňte předmět.");
      return;
    }
    if (!clientName.trim() && !clientCompany.trim()) {
      toast.error("Pro vytvoření v Google Docs vyplňte firmu nebo kontakt.");
      return;
    }
    setIsGeneratingDoc(true);
    try {
      const result = await generateOfferGoogleDoc({
        ...formPayload(),
        savePdfCopy: false,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.linkedInStorage
          ? "Dokument je v Google Docs i v Úložišti — upravujte v Google, odkaz zůstane u vás."
          : "Google Doc vytvořen.",
      );
      window.open(result.docUrl, "_blank", "noopener,noreferrer");
      void refreshGoogleDocs();
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const connectMicrosoft = async () => {
    setMicrosoftConnecting(true);
    try {
      const result = await getMicrosoftOAuthUrl("/generator");
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.url;
    } finally {
      setMicrosoftConnecting(false);
    }
  };

  const handleGenerateWordDoc = async () => {
    if (!microsoftConnected) {
      await connectMicrosoft();
      return;
    }
    setIsGeneratingWord(true);
    try {
      const result = await generateOfferWordDoc({
        ...formPayload(),
        savePdfCopy: true,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.pdfSaved
          ? "Word dokument vytvořen v OneDrive a PDF uloženo do Úložiště."
          : "Word dokument vytvořen v OneDrive.",
      );
      if (result.webUrl) {
        window.open(result.webUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const linkDoc = async (file: GoogleDriveFileRow) => {
    setLinkingId(file.id);
    try {
      const result = await linkGoogleDocToStorage({
        fileId: file.id,
        name: file.name,
        webViewLink: file.webViewLink,
        scope: saveTo,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Propojeno do Úložiště: ${result.name}`);
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full items-stretch justify-center overflow-auto p-3 sm:p-5">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm lg:min-h-[640px]">
        <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-2 text-violet-700 dark:border-violet-800/50 dark:bg-violet-900/30 dark:text-violet-300">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground sm:text-lg">
                Nastavení dokumentu
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                PDF lokálně · Google Docs propojené s Úložištěm · Word / OneDrive
              </p>
            </div>
          </div>
          <div className="flex shrink-0 rounded-lg border border-border/60 bg-muted/30 p-0.5 self-start sm:self-auto">
            {(
              [
                { id: "offer" as const, label: "Nabídka" },
                { id: "contract" as const, label: "Smlouva" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDocType(option.id)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                  docType === option.id
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
          <div className="grid content-start gap-x-4 gap-y-3 border-b border-border/50 px-4 py-4 sm:grid-cols-6 sm:px-6 sm:py-5 lg:border-b-0 lg:border-r">
            <Field label="Firma klienta" htmlFor="g-company" className="sm:col-span-3">
              <Input
                id="g-company"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Eagle Fitness s.r.o."
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Kontaktní osoba" htmlFor="g-name" className="sm:col-span-3">
              <Input
                id="g-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Jan Novák"
                className="h-10 text-sm"
              />
            </Field>

            <Field label="Předmět" htmlFor="g-subject" className="sm:col-span-6">
              <Input
                id="g-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Správa Meta Ads Q3"
                className="h-10 text-sm"
              />
            </Field>

            <Field label="Popis / rozsah" htmlFor="g-desc" className="sm:col-span-6">
              <Textarea
                id="g-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Co přesně nabízíte nebo sjednáváte…"
                className="min-h-[96px] resize-y text-sm"
              />
            </Field>

            <Field label="Částka" htmlFor="g-amount" className="sm:col-span-2">
              <Input
                id="g-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25000"
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Měna" className="sm:col-span-1">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950">
                  <SelectItem value="CZK">CZK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Platnost do" htmlFor="g-valid" className="sm:col-span-2">
              <Input
                id="g-valid"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Splatnost" className="sm:col-span-1">
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950">
                  <SelectItem value="ihned">Ihned</SelectItem>
                  <SelectItem value="7 dní">7 dní</SelectItem>
                  <SelectItem value="14 dní">14 dní</SelectItem>
                  <SelectItem value="30 dní">30 dní</SelectItem>
                  <SelectItem value="60 dní">60 dní</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Poznámky / podmínky" htmlFor="g-notes" className="sm:col-span-4">
              <Input
                id="g-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Např. Cena bez DPH, start do 7 dní…"
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Uložit do" className="sm:col-span-2">
              <Select
                value={saveTo}
                onValueChange={(value) => setSaveTo(value === "SHARED" ? "SHARED" : "PERSONAL")}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950">
                  <SelectItem value="PERSONAL">Moje úložiště</SelectItem>
                  <SelectItem value="SHARED">Společné</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex min-h-0 flex-col bg-muted/15 px-4 py-4 sm:px-5 sm:py-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Google Docs</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Propojte účet — dokumenty z Google uvidíte tady i v Úložišti a naopak
                  je otevřete v Docs.
                </p>
              </div>
              {googleConnected ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 p-0"
                  disabled={docsLoading}
                  onClick={() => void refreshGoogleDocs(docsQuery)}
                  title="Obnovit"
                >
                  <RefreshCw className={cn("h-4 w-4", docsLoading && "animate-spin")} />
                </Button>
              ) : null}
            </div>

            {!googleConnected ? (
              <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/60 px-4 py-8">
                <p className="text-sm text-muted-foreground">
                  Zatím nepropojeno. Připojení nevyžaduje vyplnění formuláře vlevo.
                </p>
                <Button
                  type="button"
                  disabled={googleConnecting}
                  onClick={() => void connectGoogle()}
                  className="rounded-lg bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                >
                  {googleConnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  Připojit Google Docs
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Propojeno{googleEmail ? `: ${googleEmail}` : ""}
                </div>
                <div className="mb-2 flex gap-2">
                  <Input
                    value={docsQuery}
                    onChange={(e) => setDocsQuery(e.target.value)}
                    placeholder="Hledat v Google Docs…"
                    className="h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void refreshGoogleDocs(docsQuery);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0"
                    disabled={docsLoading}
                    onClick={() => void refreshGoogleDocs(docsQuery)}
                  >
                    Hledat
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/60 bg-background [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {docsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Načítám Docs…
                    </div>
                  ) : googleDocs.length === 0 ? (
                    <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                      Žádné Google Docs. Vytvořte nabídku vlevo, nebo ji najděte hledáním.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {googleDocs.map((file) => (
                        <li key={file.id} className="flex items-center gap-2 px-3 py-2.5">
                          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDocDate(file.modifiedTime) || "Google Doc"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 shrink-0 px-2"
                            onClick={() => {
                              const url =
                                file.webViewLink ||
                                `https://docs.google.com/document/d/${file.id}/edit`;
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                            title="Otevřít v Google Docs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 shrink-0 text-xs"
                            disabled={linkingId === file.id}
                            onClick={() => void linkDoc(file)}
                          >
                            {linkingId === file.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Do Úložiště"
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  className="mt-2 text-left text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => void connectGoogle()}
                >
                  Znovu připojit Google (nová oprávnění)
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/50 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button type="button" variant="ghost" asChild className="h-9 px-2 text-sm">
            <Link href="/uloziste">
              <FolderOpen className="mr-1.5 h-4 w-4" />
              Úložiště
            </Link>
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isGeneratingDoc || googleConnecting}
              onClick={() => void handleCreateInGoogleDocs()}
              className="h-9 flex-1 rounded-lg px-3 text-sm sm:flex-none"
            >
              {isGeneratingDoc || googleConnecting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              {googleConnected ? "Vytvořit v Google Docs" : "Připojit Google Docs"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isGeneratingWord || microsoftConnecting}
              onClick={() =>
                void (microsoftConnected ? handleGenerateWordDoc() : connectMicrosoft())
              }
              className="h-9 flex-1 rounded-lg px-3 text-sm sm:flex-none"
            >
              {isGeneratingWord || microsoftConnecting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              {microsoftConnected ? "Word" : "Připojit Word"}
            </Button>
            <Button
              type="button"
              disabled={isGenerating}
              onClick={() => void handleGeneratePdf()}
              className="h-9 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 sm:flex-none"
            >
              {isGenerating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              Vygenerovat PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
