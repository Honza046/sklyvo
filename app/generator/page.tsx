"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
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
import {
  createFakturoidInvoiceFromOffer,
  getFakturoidConnectionState,
} from "@/app/actions/fakturoid";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSlidingThumb } from "@/components/sklyvo/use-sliding-thumb";
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function formatMoney(amountRaw: string, currency: string) {
  const n = Number(String(amountRaw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: currency || "CZK",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString("cs-CZ")} ${currency}`;
  }
}

function LiveDocPreview({
  docType,
  clientCompany,
  clientName,
  clientEmail,
  clientIco,
  clientDic,
  subject,
  description,
  amount,
  currency,
  vatRate,
  validUntil,
  paymentTerms,
  notes,
}: {
  docType: "offer" | "contract";
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  clientIco: string;
  clientDic: string;
  subject: string;
  description: string;
  amount: string;
  currency: string;
  vatRate: string;
  validUntil: string;
  paymentTerms: string;
  notes: string;
}) {
  const isContract = docType === "contract";
  const title = isContract ? "Smlouva" : "Obchodní nabídka";
  const partyLabel = isContract ? "Smluvní strana" : "Klient";
  const displayCompany = clientCompany.trim() || "Název firmy";
  const displayName = clientName.trim() || "Kontaktní osoba";
  const displaySubject =
    subject.trim() || (isContract ? "Předmět smlouvy" : "Předmět nabídky");
  const displayDesc =
    description.trim() ||
    (isContract
      ? "Popis předmětu a rozsahu smluvního plnění se zobrazí zde."
      : "Popis rozsahu prací a dodávky se zobrazí zde.");
  const net = Number(String(amount).replace(/\s/g, "").replace(",", "."));
  const vat = Number(vatRate) || 0;
  const hasAmount = Number.isFinite(net) && net > 0;
  const gross = hasAmount ? net * (1 + vat / 100) : 0;
  const netLabel = formatMoney(amount, currency);
  const grossLabel = hasAmount ? formatMoney(String(gross), currency) : null;

  return (
    <div className="sk-generator-preview flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Náhled
          </p>
          <p className="text-sm font-semibold text-foreground">
            {isContract ? "Smlouva" : "Nabídka"} · live
          </p>
        </div>
        <span className="rounded-full bg-[color-mix(in_oklab,var(--sk-brand)_12%,white)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--sk-brand)]">
          {isContract ? "Smlouva" : "Nabídka"}
        </span>
      </div>

      <div className="sk-generator-preview__sheet min-h-0 flex-1 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--sk-brand)]">
          Sklyvo
        </p>
        <h2 className="sk-type-h2 mt-3">{title}</h2>
        <p className="mt-1 text-sm font-medium text-foreground/80">
          {displaySubject}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {partyLabel}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {displayCompany}
            </p>
            <p className="text-xs text-muted-foreground">{displayName}</p>
            {clientEmail.trim() ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {clientEmail.trim()}
              </p>
            ) : null}
            {(clientIco.trim() || clientDic.trim()) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {clientIco.trim() ? `IČO ${clientIco.trim()}` : ""}
                {clientIco.trim() && clientDic.trim() ? " · " : ""}
                {clientDic.trim() ? `DIČ ${clientDic.trim()}` : ""}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Podmínky
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Splatnost:{" "}
              <span className="font-medium text-foreground">
                {paymentTerms}
              </span>
            </p>
            {validUntil ? (
              <p className="text-xs text-muted-foreground">
                Platnost do:{" "}
                <span className="font-medium text-foreground">
                  {new Date(`${validUntil}T12:00:00`).toLocaleDateString(
                    "cs-CZ",
                  )}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/70">
                Platnost neuvedena
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {isContract ? "Předmět plnění" : "Rozsah"}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
            {displayDesc}
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-[color-mix(in_oklab,oklch(0.94_0.006_245)_70%,white)] px-4 py-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Cena bez DPH
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {netLabel ?? "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Celkem s DPH {vat} %
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--sk-brand)]">
                {grossLabel ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {notes.trim() ? (
          <div className="mt-5 border-t border-border/50 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Poznámky
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {notes.trim()}
            </p>
          </div>
        ) : null}
      </div>
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
  const docTypeIndex = docType === "offer" ? 0 : 1;
  const { trackRef: docTypeTrackRef, thumbStyle: docTypeThumbStyle } =
    useSlidingThumb(docTypeIndex, [docType]);
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientIco, setClientIco] = useState("");
  const [clientDic, setClientDic] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CZK");
  const [vatRate, setVatRate] = useState("21");
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("14 dní");
  const [notes, setNotes] = useState("");
  const [saveTo, setSaveTo] = useState<"PERSONAL" | "SHARED">("PERSONAL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftConnecting, setMicrosoftConnecting] = useState(false);
  const [fakturoidConnected, setFakturoidConnected] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsQuery, setDocsQuery] = useState("");
  const [googleDocs, setGoogleDocs] = useState<GoogleDriveFileRow[]>([]);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);

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
    void getFakturoidConnectionState().then((state) => {
      setFakturoidConnected(state.connected);
    });
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleConnected") === "1") {
      toast.success(
        "Google Docs propojeno. Dokumenty se zobrazí u vás i v Google.",
      );
      setGoogleConnected(true);
      params.delete("googleConnected");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
      void refreshGoogleDocs();
    }
    if (params.get("msConnected") === "1") {
      toast.success("Microsoft 365 připojeno. Můžete vytvořit Word dokument.");
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
    clientEmail,
    clientIco,
    clientDic,
    subject,
    description,
    amount,
    currency,
    validUntil,
    paymentTerms,
    notes,
    vatRate: Number(vatRate) || 21,
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
          ? "Dokument je v Google Docs i v Úložišti. Upravujte v Google, odkaz zůstane u vás."
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

  const handleCreateFakturoidInvoice = async () => {
    if (!fakturoidConnected) {
      toast.message(
        "Nejdřív připojte Fakturoid v Pracovním prostoru → Integrace.",
      );
      router.push("/settings#integrations");
      return;
    }
    setIsGeneratingInvoice(true);
    try {
      const result = await createFakturoidInvoiceFromOffer(formPayload());
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.number
          ? `Faktura ${result.number} vytvořena ve Fakturoidu.`
          : "Faktura vytvořena ve Fakturoidu.",
      );
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setIsGeneratingInvoice(false);
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

  const renderGoogleDocsPanel = () => (
    <>
      {!googleConnected ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border/70 bg-background/60 px-4 py-5">
          <p className="text-sm text-muted-foreground">
            Propojte Google a dokumenty uvidíte tady i v Úložišti.
          </p>
          <Button
            type="button"
            size="sm"
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-emerald-800 ">
              Propojeno{googleEmail ? `: ${googleEmail}` : ""}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 shrink-0 p-0"
              disabled={docsLoading}
              onClick={() => void refreshGoogleDocs(docsQuery)}
              title="Obnovit"
            >
              <RefreshCw
                className={cn("h-4 w-4", docsLoading && "animate-spin")}
              />
            </Button>
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
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border/60 bg-background [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {docsLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Načítám Docs…
              </div>
            ) : googleDocs.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Žádné Google Docs.
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {googleDocs.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-2.5"
                  >
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
        </>
      )}
    </>
  );

  const secondaryBusy =
    isGeneratingDoc ||
    googleConnecting ||
    isGeneratingWord ||
    microsoftConnecting ||
    isGeneratingInvoice;

  const typeToggle = (
    <div
      ref={docTypeTrackRef as RefObject<HTMLDivElement>}
      className="sk-segment flex w-full shrink-0 sm:w-auto"
    >
      <span
        className="sk-segment__thumb"
        style={docTypeThumbStyle}
        aria-hidden
      />
      {(
        [
          { id: "offer" as const, label: "Nabídka" },
          { id: "contract" as const, label: "Smlouva" },
        ] as const
      ).map((option, i) => {
        const active = i === docTypeIndex;
        return (
          <button
            key={option.id}
            type="button"
            data-slide-item
            onClick={() => setDocType(option.id)}
            className={cn(
              "sk-segment__item flex-1 whitespace-nowrap px-3.5 py-1.5 text-sm font-semibold sm:flex-none",
              active ? "sk-segment__item--active" : "sk-segment__item--idle",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const formSections = (
    <>
      <section className="space-y-3">
        <SectionLabel>Klient</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Firma klienta" htmlFor="g-company">
            <Input
              id="g-company"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="Eagle Fitness s.r.o."
              className="h-10 text-sm"
            />
          </Field>
          <Field label="Kontaktní osoba" htmlFor="g-name">
            <Input
              id="g-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Jan Novák"
              className="h-10 text-sm"
            />
          </Field>
          <Field label="E-mail klienta (faktura)" htmlFor="g-email">
            <Input
              id="g-email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="jan@firma.cz"
              className="h-10 text-sm"
            />
          </Field>
          <Field label="IČO" htmlFor="g-ico">
            <Input
              id="g-ico"
              value={clientIco}
              onChange={(e) => setClientIco(e.target.value)}
              placeholder="12345678"
              className="h-10 text-sm"
            />
          </Field>
          <Field label="DIČ" htmlFor="g-dic" className="sm:col-span-2">
            <Input
              id="g-dic"
              value={clientDic}
              onChange={(e) => setClientDic(e.target.value)}
              placeholder="CZ12345678"
              className="h-10 text-sm"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Obsah</SectionLabel>
        <div className="grid gap-3">
          <Field label="Předmět" htmlFor="g-subject">
            <Input
              id="g-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Správa Meta Ads Q3"
              className="h-10 text-sm"
            />
          </Field>
          <Field label="Popis / rozsah" htmlFor="g-desc">
            <Textarea
              id="g-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Co přesně nabízíte nebo sjednáváte…"
              className="min-h-[96px] resize-y text-sm"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Cena</SectionLabel>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 sm:grid-cols-[minmax(0,1fr)_110px_100px]">
          <Field label="Částka (bez DPH)" htmlFor="g-amount">
            <Input
              id="g-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
              className="h-10 text-sm"
            />
          </Field>
          <Field label="Měna" className="w-[110px] sm:w-auto">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card ">
                <SelectItem value="CZK">CZK</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="DPH %" className="w-[100px] sm:w-auto">
            <Select value={vatRate} onValueChange={setVatRate}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card ">
                <SelectItem value="21">21 %</SelectItem>
                <SelectItem value="12">12 %</SelectItem>
                <SelectItem value="0">0 %</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex w-full items-center justify-between gap-2 sm:pointer-events-none"
        >
          <SectionLabel>Další podrobnosti</SectionLabel>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform sm:hidden",
              showMore && "rotate-180",
            )}
          />
        </button>
        <div
          className={cn(
            "grid gap-3 sm:grid-cols-6",
            showMore ? "grid" : "hidden sm:grid",
          )}
        >
          <Field
            label="Platnost do"
            htmlFor="g-valid"
            className="sm:col-span-2"
          >
            <Input
              id="g-valid"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="h-10 text-sm"
            />
          </Field>
          <Field label="Splatnost" className="sm:col-span-2">
            <Select value={paymentTerms} onValueChange={setPaymentTerms}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card ">
                <SelectItem value="ihned">Ihned</SelectItem>
                <SelectItem value="7 dní">7 dní</SelectItem>
                <SelectItem value="14 dní">14 dní</SelectItem>
                <SelectItem value="30 dní">30 dní</SelectItem>
                <SelectItem value="60 dní">60 dní</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Uložit do" className="sm:col-span-2">
            <Select
              value={saveTo}
              onValueChange={(value) =>
                setSaveTo(value === "SHARED" ? "SHARED" : "PERSONAL")
              }
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card ">
                <SelectItem value="PERSONAL">Moje úložiště</SelectItem>
                <SelectItem value="SHARED">Společné</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Poznámky / podmínky"
            htmlFor="g-notes"
            className="sm:col-span-6"
          >
            <Input
              id="g-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Např. Cena bez DPH, start do 7 dní…"
              className="h-10 text-sm"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-2">
        <button
          type="button"
          onClick={() => setIntegrationsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5 text-left transition-colors hover:bg-muted/25"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Google Docs</p>
            <p className="text-[11px] text-muted-foreground">
              {googleConnected
                ? googleEmail
                  ? `Účet: ${googleEmail}`
                  : "Účet propojen"
                : "Volitelné propojení s Drive"}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              integrationsOpen && "rotate-180",
            )}
          />
        </button>
        {integrationsOpen ? (
          <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
            {renderGoogleDocsPanel()}
          </div>
        ) : null}
      </section>
    </>
  );

  const previewProps = {
    docType,
    clientCompany,
    clientName,
    clientEmail,
    clientIco,
    clientDic,
    subject,
    description,
    amount,
    currency,
    vatRate,
    validUntil,
    paymentTerms,
    notes,
  };

  const primaryPdfButton = (className?: string) => (
    <Button
      type="button"
      disabled={isGenerating}
      onClick={() => void handleGeneratePdf()}
      className={cn(
        "h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700",
        className,
      )}
    >
      {isGenerating ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-1.5 h-4 w-4" />
      )}
      Vygenerovat PDF
    </Button>
  );

  const exportMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={secondaryBusy}
          className="h-9 w-full rounded-lg px-3 text-sm sm:w-auto"
        >
          {secondaryBusy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : null}
          Další exporty
          <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-50 w-56 border bg-white shadow-md "
      >
        <DropdownMenuItem
          disabled={isGeneratingDoc || googleConnecting}
          onClick={() => void handleCreateInGoogleDocs()}
        >
          <FileText className="mr-2 h-4 w-4" />
          {googleConnected ? "Vytvořit Google Doc" : "Připojit Google Docs"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isGeneratingWord || microsoftConnecting}
          onClick={() =>
            void (microsoftConnected
              ? handleGenerateWordDoc()
              : connectMicrosoft())
          }
        >
          <FileText className="mr-2 h-4 w-4" />
          {microsoftConnected ? "Vytvořit Word" : "Připojit Word"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isGeneratingInvoice}
          onClick={() => void handleCreateFakturoidInvoice()}
        >
          <FileText className="mr-2 h-4 w-4" />
          {fakturoidConnected ? "Vytvořit fakturu" : "Připojit Fakturoid"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center overflow-hidden">
      <div className="mb-2 shrink-0 space-y-1 text-center">
        <div className="mb-2 flex items-center justify-center gap-3">
          <div className="sk-page-badge" aria-hidden>
            <FileText strokeWidth={2} />
          </div>
        </div>
        <h1 className="sk-type-h1">Generátor</h1>
        <p className="sk-type-body mx-auto max-w-lg">
          Vytvořte nabídku nebo smlouvu. Živý náhled vpravo, PDF jedním klikem.
        </p>
      </div>

      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden px-0 pb-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              Vyplňte údaje a náhled se aktualizuje hned
            </p>
            {typeToggle}
          </div>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.95fr)]">
            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto border-b border-border/50 px-4 py-4 sm:px-6 sm:py-5 lg:border-b-0 lg:border-r [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {formSections}
              <div className="lg:hidden">
                <LiveDocPreview {...previewProps} />
              </div>
            </div>

            <div className="hidden min-h-0 flex-col overflow-hidden bg-[color-mix(in_oklab,oklch(0.955_0.006_245)_55%,white)] px-4 py-4 sm:px-5 sm:py-5 lg:flex">
              <LiveDocPreview {...previewProps} />
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-border/50 bg-muted/15 px-6 py-3">
            <Button
              type="button"
              variant="ghost"
              asChild
              className="h-9 px-2 text-sm"
            >
              <Link href="/uloziste">
                <FolderOpen className="mr-1.5 h-4 w-4" />
                Úložiště
              </Link>
            </Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {exportMenu()}
              {primaryPdfButton()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
