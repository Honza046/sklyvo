"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Globe, Mail, Phone, Copy, ExternalLink, Settings2, RefreshCw } from "lucide-react";

function getSniperPostUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SNIPER_API_URL?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000/api/sniper";
  }
  return "/api/sniper";
}

const PITCH_OPTIONS = [
  { value: "Kompletní web", label: "Kompletní nový web + AI" },
  { value: "Pouze AI integraci", label: "Pouze integrace AI" },
] as const;

export function SniperClient() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pitchType, setPitchType] = useState<(typeof PITCH_OPTIONS)[number]["value"]>(PITCH_OPTIONS[0].value);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawStream, setRawStream] = useState("");
  const [isDone, setIsDone] = useState(false);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [editableBody, setEditableBody] = useState("");

  // ZMĚNA: Ref ukazuje na úplný konec stránky
  const endOfPageRef = useRef<HTMLDivElement>(null);

  // OPRAVA SCROLLU: Plynulý dojezd až úplně dolů po vyrenderování
  useEffect(() => {
    if (isDone && endOfPageRef.current) {
      setTimeout(() => {
        endOfPageRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [isDone]);

  const run = useCallback(async () => {
    setError(null);
    setRawStream("");
    setIsDone(false);
    setLoading(true);
    
    try {
      const res = await fetch(getSniperPostUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), pitch_type: pitchType }),
      });
      
      if (!res.ok) {
        const raw = await res.text();
        let msg = raw.trim() || `HTTP ${res.status}`;
        try {
          const j = JSON.parse(raw) as { message?: string };
          if (typeof j.message === "string" && j.message.trim()) {
            msg = j.message;
          }
        } catch {
          // není JSON
        }
        throw new Error(msg);
      }
      
      if (!res.body) throw new Error("Chybí stream těla odpovědi.");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setRawStream((prev) => prev + chunk);
        }
      }
      
      const tail = decoder.decode();
      if (tail) {
        fullText += tail;
        setRawStream((prev) => prev + tail);
      }

      // Parsování podle ===DELIC===
      if (fullText.includes("===DELIC===")) {
        const parts = fullText.split("===DELIC===");
        const rawSubjects = parts[0].trim().split("\n").map(s => s.trim().replace(/^-\s*/, '')).filter(Boolean);
        const cleanBody = parts[1].trim();
        
        setSubjects(rawSubjects.length > 0 ? rawSubjects : ["Dotaz k Vašemu webu"]);
        setSelectedSubject(rawSubjects[0] || "Dotaz k Vašemu webu");
        setEditableBody(cleanBody);
      } else {
        setSubjects(["Dotaz k Vašemu webu"]);
        setSelectedSubject("Dotaz k Vašemu webu");
        setEditableBody(fullText.trim());
      }
      
      setIsDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Neznámá chyba");
    } finally {
      setLoading(false);
    }
  }, [url, pitchType]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableBody);
    alert("Zkopírováno do schránky!"); 
  };

  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(selectedSubject)}&body=${encodeURIComponent(editableBody)}`;

  return (
      <div className="mx-auto flex max-w-4xl flex-col gap-10 pb-20">
        
        {/* HLAVIČKA */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Direct Outreach Engine</h2>
          <p className="mt-2 text-base text-muted-foreground max-w-2xl">
            Generování e-mailu na míru pro konkrétní cíl na základě analýzy webu a nastavených parametrů.
          </p>
        </div>

        {/* VSTUPY */}
        <div className="flex flex-col gap-8 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-[2fr_1.5fr_1.5fr]">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-xs font-semibold text-muted-foreground uppercase">Cílová URL adresa</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="url" placeholder="https://domain.com" className="pl-9" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase">Kontaktní e-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="email" placeholder="info@domain.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase">Telefon klienta</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="phone" placeholder="+420..." className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Typ nabídky:</Label>
            <div className="flex flex-wrap gap-2">
              {PITCH_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPitchType(o.value)}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                    pitchType === o.value 
                      ? "bg-foreground text-background" 
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={run} disabled={loading || !url.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 text-base font-semibold">
              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzuji...</> : "Vygenerovat email"}
            </Button>
            <Button variant="outline" className="flex items-center justify-center p-0 h-11 w-11 border-border/80">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        {/* LOADING STREAM */}
        {loading && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-6 animate-pulse">
             <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">{rawStream || "Inicializuji Venegard Sniper Engine..."}</p>
          </div>
        )}

        {/* HOTOVÝ E-MAIL */}
        {isDone && (
          <div className="flex flex-col gap-8 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            
            {/* Header a štítky */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h3 className="text-xl font-bold">Vygenerovaný e-mail</h3>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-blue-100">🎯 B2B SaaS</span>
                <span className="flex items-center bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-gray-200">🤝 Přátelský</span>
                <span className="flex items-center bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-gray-200">🌍 CS</span>
              </div>
            </div>

            <hr className="border-border/60" />

            <div className="space-y-6">
              {/* PŘEDMĚTY (OPRAVENO A ZVIDITELNĚNO) */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Předmět e-mailu</Label>
                <div className="flex items-center gap-3">
                  <select 
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    {subjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  </select>
                  <Button variant="outline" className="flex h-11 w-11 shrink-0 items-center justify-center p-0 text-muted-foreground hover:text-foreground" title="Vygenerovat nové předměty">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* TĚLO E-MAILU */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text zprávy</Label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background/50 px-4 py-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[300px] leading-relaxed resize-y"
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                />
              </div>
            </div>

            {/* TLAČÍTKA DOLE */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={copyToClipboard} className="h-11 px-5 font-semibold text-foreground">
                <Copy className="mr-2 h-4 w-4" /> Zkopírovat
              </Button>
              <Button asChild className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <a href={mailtoLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Otevřít v e-mailu
                </a>
              </Button>
            </div>

          </div>
        )}

        {/* Zarážka pro Auto-Scroll */}
        <div ref={endOfPageRef} className="h-1" />
      </div>
  );
}