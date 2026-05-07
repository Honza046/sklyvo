"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, Target, ListOrdered, Loader2, 
  Globe, Crosshair, Plus, Zap, Check, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchRadarLeads } from "@/app/actions/radar";
import { addLeadFromRadar, importMultipleLeads } from "@/app/actions/crm";
import { toast } from "sonner";

type RadarResult = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  placeId: string;
  url: string;
  phone: string;
  email: string | null;
};

export default function RadarPage() {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState("5");
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  
  const [deepScan, setDeepScan] = useState(false);
  const [excludeCrm, setExcludeCrm] = useState(false);
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [results, setResults] = useState<RadarResult[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [addedLeadIds, setAddedLeadIds] = useState<string[]>([]);
  const [addingLeadIds, setAddingLeadIds] = useState<string[]>([]);
  const [isImportingAll, setIsImportingAll] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasResults(false);
    setSelectedLeads([]);
    setAddedLeadIds([]);
    setSearchError(null);

    const radarResponse = await searchRadarLeads({
      query,
      limit: Number(count),
    });

    setIsSearching(false);

    if ("error" in radarResponse && radarResponse.error) {
      setSearchError(radarResponse.error);
      setResults([]);
      return;
    }

    setResults(radarResponse.results ?? []);
    setHasResults(true);
  };

  const toggleLead = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAddLead = async (lead: RadarResult) => {
    if (addedLeadIds.includes(lead.id) || addingLeadIds.includes(lead.id)) return;
    setAddingLeadIds((prev) => [...prev, lead.id]);
    const result = await addLeadFromRadar({
      companyName: lead.name,
      url: lead.url,
      phone: lead.phone,
      address: lead.address,
      placeId: lead.placeId,
    });
    setAddingLeadIds((prev) => prev.filter((id) => id !== lead.id));

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    setAddedLeadIds((prev) => [...prev, lead.id]);
    toast.success("Firma přidána do CRM");
  };

  const handleImportAll = async () => {
    if (results.length === 0 || isImportingAll) return;
    setIsImportingAll(true);

    const result = await importMultipleLeads(
      results.map((lead) => ({
        companyName: lead.name,
        url: lead.url,
        phone: lead.phone,
        placeId: lead.placeId,
      })),
    );

    setIsImportingAll(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    setAddedLeadIds((prev) =>
      Array.from(new Set([...prev, ...(result.inCrmPlaceIds ?? [])])),
    );
    toast.success(
      `Úspěšně importováno ${result.createdCount} firem. ${result.skippedCount} duplicit bylo přeskočeno.`,
    );
  };

  return (
      <div className="flex h-full w-full flex-col items-center justify-start pt-0 pb-8">
        
        <div className="mb-4 text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Auto Prospector
          </h1>
          <p className="text-sm text-muted-foreground">
            Hledejte nové klienty pomocí AI analýzy trhu v reálném čase.
          </p>
        </div>

        <div className="w-full max-w-6xl px-4 md:px-8 flex flex-col gap-6">
          
          <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm flex flex-col gap-8 transition-all">
            
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Target className="h-3.5 w-3.5" />
                  Cílový profil / Segment
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70" />
                  <Input 
                    className="pl-10 h-12 rounded-xl bg-background border-border/50 text-base" 
                    placeholder="např. Architektonická studia v Brně" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <ListOrdered className="h-3.5 w-3.5" />
                  Počet firem
                </Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card rounded-xl shadow-lg border-border/60">
                    <SelectItem value="5">5 výsledků</SelectItem>
                    <SelectItem value="10">10 výsledků</SelectItem>
                    <SelectItem value="20">20 výsledků</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-10 gap-y-4 pt-4 border-t border-border/40">
              <div className="flex items-center space-x-3">
                <Switch 
                  id="deep-scan" 
                  checked={deepScan} 
                  onCheckedChange={setDeepScan} 
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700"
                />
                <Label htmlFor="deep-scan" className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Zap className={cn("h-3.5 w-3.5", deepScan ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                  Deep Scan (Kontakty)
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Switch 
                  id="exclude-crm" 
                  checked={excludeCrm} 
                  onCheckedChange={setExcludeCrm} 
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700"
                />
                <Label htmlFor="exclude-crm" className="text-sm font-semibold cursor-pointer">Vyloučit firmy v CRM</Label>
              </div>

              <div className="flex items-center space-x-3">
                <Switch 
                  id="only-email" 
                  checked={onlyEmail} 
                  onCheckedChange={setOnlyEmail} 
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700"
                />
                <Label htmlFor="only-email" className="text-sm font-semibold cursor-pointer">Pouze s e-mailem</Label>
              </div>
            </div>

            <Button 
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="w-full md:w-auto md:self-start h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-10 text-base font-bold shadow-md transition-all active:scale-95 disabled:bg-blue-400"
            >
              {isSearching ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Hledám...</> : <><Search className="mr-2 h-5 w-5" /> Spustit vyhledávání</>}
            </Button>
            {searchError && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{searchError}</p>
            )}
          </div>

          {hasResults && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Nalezené subjekty
                </h3>
                <Button
                  onClick={() => void handleImportAll()}
                  disabled={isImportingAll || results.length === 0}
                  className="h-9 rounded-xl bg-blue-600 px-4 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-blue-700"
                >
                  {isImportingAll ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Importuji...
                    </>
                  ) : (
                    `Importovat nalezené firmy (${results.length})`
                  )}
                </Button>
                
                {selectedLeads.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mr-2">{selectedLeads.length} vybráno</span>
                    {/* OPRAVENO: Tlačítko pro přidání do CRM */}
                    <Button variant="outline" className="flex items-center justify-center h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-all">
                      <Plus className="mr-2 h-3.5 w-3.5" /> Uložit do CRM
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {results.map((result) => (
                  <div 
                    key={result.id} 
                    className={cn(
                      "group relative flex items-start gap-5 rounded-2xl border bg-card p-6 transition-all shadow-sm",
                      selectedLeads.includes(result.id) ? "border-blue-400 bg-blue-50/20 dark:bg-blue-900/20 dark:border-blue-700" : "border-border/60 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md"
                    )}
                  >
                    <div className="pt-1.5">
                      <Checkbox 
                        checked={selectedLeads.includes(result.id)} 
                        onCheckedChange={() => toggleLead(result.id)}
                        className="rounded-md h-5 w-5 border-border/80 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-foreground truncate">{result.name}</h4>
                        <div className="flex gap-2 shrink-0">
                          {addedLeadIds.includes(result.id) && (
                            <span className="flex items-center text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tighter dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                              V CRM
                            </span>
                          )}
                          {/* OPRAVENO: Modrý URL štítek */}
                          <span className="flex items-center text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tighter dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400">
                            <Globe className="h-3 w-3 mr-1" /> Google profil
                          </span>
                          {result.rating !== null && (
                            <span className="flex items-center text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tighter dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                              Hodnocení {result.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-3xl">
                        {result.address}
                      </p>
                      {(result.phone || result.url) && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          {result.phone && (
                            <span className="text-muted-foreground">
                              Tel: <span className="font-semibold text-foreground">{result.phone}</span>
                            </span>
                          )}
                          {result.url && (
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-600 hover:underline"
                            >
                              Otevřít web
                            </a>
                          )}
                        </div>
                      )}
                      {result.email && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="font-semibold text-foreground">{result.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                      <Button
                        variant="ghost"
                        onClick={() => void handleAddLead(result)}
                        disabled={addedLeadIds.includes(result.id) || addingLeadIds.includes(result.id)}
                        className="flex items-center justify-center p-0 h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-100"
                      >
                        {addingLeadIds.includes(result.id) ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : addedLeadIds.includes(result.id) ? (
                          <Check className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Plus className="h-5 w-5" />
                        )}
                      </Button>
                      <Button asChild className="h-10 rounded-xl bg-foreground text-background hover:bg-foreground/90 px-5 font-bold text-[10px] uppercase tracking-widest shadow-sm">
                        <Link href={`/sniper?company=${encodeURIComponent(result.name)}&url=${encodeURIComponent(result.url || "")}&email=${encodeURIComponent(result.email || "")}`}>
                        <Crosshair className="mr-2 h-4 w-4" /> Sniper
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    
  );
}