"use client";

import { useEffect, useMemo, useState } from "react";
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
  Search,
  Target,
  ListOrdered,
  Loader2,
  Globe,
  Crosshair,
  Plus,
  Zap,
  Check,
  Mail,
  Radio,
  Info,
  MapPin,
  Linkedin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchRadarLeads } from "@/app/actions/radar";
import { addLeadFromRadar, importMultipleLeads } from "@/app/actions/crm";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { messages } from "@/lib/i18n/messages";
import {
  DEFAULT_RADAR_COUNTRY,
  RADAR_COUNTRY_NONE,
  RADAR_COUNTRY_OPTIONS,
  RADAR_COUNTRY_STORAGE_KEY,
  detectCountryFromQuery,
  normalizeCountryCode,
} from "@/lib/country-language";

const RADAR_RECENT_STORAGE_KEY = "sklyvo-radar-recent-searches";
const RADAR_RECENT_MAX = 4;

function loadRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RADAR_RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, RADAR_RECENT_MAX);
  } catch {
    return [];
  }
}

function pushRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return loadRecentSearches();
  const next = [
    q,
    ...loadRecentSearches().filter(
      (item) => item.toLowerCase() !== q.toLowerCase(),
    ),
  ].slice(0, RADAR_RECENT_MAX);
  try {
    window.localStorage.setItem(RADAR_RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

type RadarDiscoverySource = "places" | "web" | "linkedin";

type RadarResult = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  placeId: string | null;
  url: string;
  phone: string;
  email: string | null;
  linkedinUrl?: string | null;
  discoverySources?: RadarDiscoverySource[];
  placeTypes?: string[];
};

const RADAR_HELP_SECTIONS = [
  {
    title: "Deep Scan",
    description: "Prohledá i podstránky pro skryté emaily.",
  },
  {
    title: "Vyloučit v CRM",
    description: "Skryje firmy, které už máte uložené.",
  },
  {
    title: "Pouze s emailem",
    description: "Ukáže jen výsledky s nalezeným kontaktem.",
  },
] as const;

/** Denní rotace tipů — stejný den = stejné 3 tipy, další den jiné. */
function pickDailyInspirations(pool: readonly string[], count = 3): string[] {
  if (pool.length <= count) return [...pool];
  const daySeed = Math.floor(Date.now() / 86_400_000);
  const picked: string[] = [];
  const used = new Set<number>();
  let seed = daySeed * 2654435761;
  while (picked.length < count) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const idx = seed % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx]!);
  }
  return picked;
}

export default function RadarPage() {
  const { t, language } = useLanguage();
  const searchInspirations = useMemo(() => {
    const pool = messages[language].radar.inspirations;
    return pickDailyInspirations(pool, 3);
  }, [language]);
  const [query, setQuery] = useState("");
  const [count, setCount] = useState("5");
  const [country, setCountry] = useState(DEFAULT_RADAR_COUNTRY);
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const [deepScan, setDeepScan] = useState(false);
  const [excludeCrm, setExcludeCrm] = useState(true);
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [results, setResults] = useState<RadarResult[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [addedLeadIds, setAddedLeadIds] = useState<string[]>([]);
  const [addingLeadIds, setAddingLeadIds] = useState<string[]>([]);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
    try {
      const stored = window.localStorage
        .getItem(RADAR_COUNTRY_STORAGE_KEY)
        ?.trim();
      if (!stored) return;
      if (stored === RADAR_COUNTRY_NONE) {
        setCountry(RADAR_COUNTRY_NONE);
        return;
      }
      const normalized = normalizeCountryCode(stored);
      if (normalized) setCountry(normalized);
    } catch {
      /* ignore */
    }
  }, []);

  const handleCountryChange = (value: string) => {
    setCountry(value);
    try {
      window.localStorage.setItem(RADAR_COUNTRY_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  };

  /** When query mentions a city/country (Londýn, Berlín…), auto-switch the country select. */
  const applyCountryFromQuery = (text: string) => {
    const detected = detectCountryFromQuery(text);
    if (!detected) return null;
    if (country !== detected) {
      handleCountryChange(detected);
    }
    return detected;
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    applyCountryFromQuery(value);
  };

  const activeCountryCode =
    country === RADAR_COUNTRY_NONE ? null : normalizeCountryCode(country);

  const sniperHref = (result: RadarResult) => {
    const params = new URLSearchParams();
    params.set("company", result.name);
    if (result.url) params.set("url", result.url);
    if (result.email) params.set("email", result.email);
    if (activeCountryCode) params.set("country", activeCountryCode);
    return `/sniper?${params.toString()}`;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasResults(false);
    setSelectedLeads([]);
    setAddedLeadIds([]);
    setSearchError(null);

    const detected = applyCountryFromQuery(query);
    const regionForSearch =
      detected ??
      (country === RADAR_COUNTRY_NONE ? null : normalizeCountryCode(country));

    const radarResponse = await searchRadarLeads({
      query,
      limit: Number(count),
      excludeCrm,
      regionCode: regionForSearch,
      deepScan,
      sources: { places: true, web: true, linkedin: true },
    });

    setIsSearching(false);

    if ("error" in radarResponse && radarResponse.error) {
      setSearchError(radarResponse.error);
      setResults([]);
      return;
    }

    setRecentSearches(pushRecentSearch(query.trim()));

    const raw = radarResponse.results ?? [];
    const filtered = onlyEmail
      ? raw.filter((r) => Boolean(r.email?.trim()))
      : raw;
    setResults(filtered);
    setHasResults(true);
  };

  const toggleLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAddLead = async (lead: RadarResult) => {
    if (addedLeadIds.includes(lead.id) || addingLeadIds.includes(lead.id))
      return;
    setAddingLeadIds((prev) => [...prev, lead.id]);
    const result = await addLeadFromRadar({
      companyName: lead.name,
      url: lead.url,
      email: lead.email ?? undefined,
      phone: lead.phone,
      address: lead.address,
      placeId: lead.placeId ?? undefined,
      linkedinUrl: lead.linkedinUrl,
      discoverySources: lead.discoverySources,
      countryCode: activeCountryCode,
      searchQuery: query,
      placeTypes: lead.placeTypes,
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
        email: lead.email ?? undefined,
        phone: lead.phone,
        placeId: lead.placeId ?? undefined,
        linkedinUrl: lead.linkedinUrl,
        discoverySources: lead.discoverySources,
        countryCode: activeCountryCode,
        searchQuery: query,
        placeTypes: lead.placeTypes,
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

    const created = result.createdCount ?? 0;
    const skipped = result.skippedCount ?? 0;
    if (created > 0 && skipped > 0) {
      toast.success(
        `Do CRM přidáno ${created} firem. ${skipped} už v CRM bylo (přeskočeno).`,
      );
    } else if (created > 0) {
      toast.success(
        `Do CRM přidáno ${created} ${created === 1 ? "firma" : created < 5 ? "firmy" : "firem"}.`,
      );
    } else if (skipped > 0) {
      toast.message(`Nic nového. Všech ${skipped} už je v CRM.`);
    } else {
      toast.message("Nebylo co importovat.");
    }
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center overflow-y-auto pb-8 scrollbar-hide",
        !hasResults && "overflow-hidden",
      )}
    >
      <div className="mb-2 text-center">
        <div className="mb-1.5 flex items-center justify-center">
          <div className="sk-page-badge" aria-hidden>
            <Radio strokeWidth={2} />
          </div>
        </div>
        <h1 className="sk-type-h1 text-[28px]">{t("radar.title")}</h1>
        <p className="sk-type-small mx-auto max-w-lg">{t("radar.subtitle")}</p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Cílový profil / Segment
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  className="h-11 rounded-xl border-border/50 bg-background pl-10 text-sm outline-none ring-0 focus:ring-0 focus-visible:ring-0"
                  placeholder="např. Architektonická studia v Brně"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                Země
              </Label>
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background text-sm outline-none ring-0 focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 bg-card shadow-lg">
                  <SelectItem value={RADAR_COUNTRY_NONE}>
                    Bez omezení
                  </SelectItem>
                  {RADAR_COUNTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.code} value={opt.code}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <ListOrdered className="h-3.5 w-3.5" />
                Počet firem
              </Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background text-sm outline-none ring-0 focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 bg-card shadow-lg">
                  <SelectItem value="5">5 výsledků</SelectItem>
                  <SelectItem value="10">10 výsledků</SelectItem>
                  <SelectItem value="15">15 výsledků</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                {t("radar.inspirationLabel")}
              </p>
              <div className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto scrollbar-hide">
                {searchInspirations.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => handleQueryChange(text)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-left text-xs font-medium text-foreground/90 transition-colors hover:border-border hover:bg-muted"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                {t("radar.recentLabel")}
              </p>
              {recentSearches.length > 0 ? (
                <div className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto scrollbar-hide">
                  {recentSearches.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => handleQueryChange(text)}
                      className="shrink-0 whitespace-nowrap rounded-full border border-border/50 bg-background px-3 py-1 text-left text-xs font-medium text-foreground/90 transition-colors hover:border-border hover:bg-muted"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/80">
                  {t("radar.recentEmpty")}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-border/40 pt-3">
            <div className="flex items-center gap-3">
              <Switch
                id="deep-scan"
                className="sk-switch--sm shrink-0"
                checked={deepScan}
                onCheckedChange={setDeepScan}
              />
              <Label
                htmlFor="deep-scan"
                className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium"
              >
                <Zap
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    deepScan
                      ? "fill-amber-500 text-amber-500"
                      : "text-muted-foreground",
                  )}
                />
                Deep Scan (Kontakty)
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="exclude-crm"
                className="sk-switch--sm shrink-0"
                checked={excludeCrm}
                onCheckedChange={setExcludeCrm}
              />
              <Label
                htmlFor="exclude-crm"
                className="cursor-pointer text-[13px] font-medium"
              >
                Vyloučit firmy v CRM / Sheets archivu
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="only-email"
                className="sk-switch--sm shrink-0"
                checked={onlyEmail}
                onCheckedChange={setOnlyEmail}
              />
              <Label
                htmlFor="only-email"
                className="cursor-pointer text-[13px] font-medium"
              >
                Pouze s e-mailem
              </Label>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="h-11 w-full self-start px-6 text-sm md:w-auto"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("radar.searching")}
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" /> {t("radar.runSearch")}
              </>
            )}
          </Button>
          {searchError && (
            <p className="text-sm font-medium text-red-600 ">{searchError}</p>
          )}

          <div className="absolute bottom-4 right-4 z-40">
            <div
              tabIndex={0}
              className="group relative inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2"
            >
              <div
                id="radar-switch-help-tooltip"
                role="tooltip"
                className={cn(
                  "absolute bottom-full right-1 z-50 mb-2 w-[min(20rem,calc(100vw-2.5rem))]",
                  "origin-bottom-right translate-y-2 scale-[0.98] opacity-0 transition-all duration-200 ease-out",
                  "pointer-events-none rounded-xl border border-border/70 bg-white p-4 shadow-xl ",
                  "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
                  "group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100",
                )}
              >
                <div className="space-y-3">
                  {RADAR_HELP_SECTIONS.map((section) => (
                    <div key={section.title}>
                      <p className="text-sm font-semibold text-foreground">
                        {section.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <span
                className="inline-flex cursor-default text-gray-400 transition-colors group-hover:text-gray-600 "
                aria-describedby="radar-switch-help-tooltip"
              >
                <Info className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>
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
                  <span className="text-xs font-bold text-blue-600 mr-2">
                    {selectedLeads.length} vybráno
                  </span>
                  {/* OPRAVENO: Tlačítko pro přidání do CRM */}
                  <Button
                    variant="outline"
                    className="flex items-center justify-center h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all"
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" /> Uložit do CRM
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:gap-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={cn(
                    "sk-list-card group relative flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all sm:gap-5 sm:rounded-2xl sm:p-6",
                    selectedLeads.includes(result.id)
                      ? "sk-list-card--selected border-blue-400 bg-blue-50/20"
                      : "border-border/60 hover:border-blue-200 hover:shadow-md",
                  )}
                >
                  <div className="pt-0.5 sm:pt-1.5">
                    <Checkbox
                      checked={selectedLeads.includes(result.id)}
                      onCheckedChange={() => toggleLead(result.id)}
                      className="h-4 w-4 rounded-md border-border/80 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 sm:h-5 sm:w-5"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-col gap-1.5 sm:mb-2 sm:flex-row sm:items-center sm:gap-3">
                      <h4 className="sk-type-h3 truncate">{result.name}</h4>
                      <div className="flex shrink-0 flex-wrap gap-1.5 sm:gap-2">
                        {addedLeadIds.includes(result.id) && (
                          <span className="flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-emerald-600 sm:px-2.5 sm:text-[10px]">
                            V CRM
                          </span>
                        )}
                        {(result.discoverySources?.includes("places") ||
                          (!result.discoverySources?.length &&
                            result.placeId)) && (
                          <span className="flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-blue-600 sm:px-2.5 sm:text-[10px]">
                            <MapPin className="mr-1 h-3 w-3" /> Maps
                          </span>
                        )}
                        {result.discoverySources?.includes("web") && (
                          <span className="flex items-center rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-sky-700 sm:px-2.5 sm:text-[10px]">
                            <Globe className="mr-1 h-3 w-3" /> Web
                          </span>
                        )}
                        {result.discoverySources?.includes("linkedin") && (
                          <span className="flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-indigo-700 sm:px-2.5 sm:text-[10px]">
                            <Linkedin className="mr-1 h-3 w-3" /> LinkedIn
                          </span>
                        )}
                        {result.rating !== null && (
                          <span className="flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-emerald-600 sm:px-2.5 sm:text-[10px]">
                            Hodnocení {result.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="max-w-3xl text-xs leading-snug text-muted-foreground/80 sm:text-sm sm:leading-relaxed">
                      {result.address}
                    </p>
                    {result.phone && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] sm:mt-2 sm:gap-3 sm:text-xs">
                        <span className="text-muted-foreground">
                          Tel:{" "}
                          <span className="font-semibold text-foreground">
                            {result.phone}
                          </span>
                        </span>
                      </div>
                    )}
                    {result.email && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground sm:mt-2 sm:text-xs">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="font-semibold text-foreground">
                          {result.email}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 opacity-0 transition-all duration-200 translate-x-2 group-hover:translate-x-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      onClick={() => void handleAddLead(result)}
                      disabled={
                        addedLeadIds.includes(result.id) ||
                        addingLeadIds.includes(result.id)
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl p-0 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-100"
                    >
                      {addingLeadIds.includes(result.id) ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : addedLeadIds.includes(result.id) ? (
                        <Check className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      disabled={!result.url}
                      className="flex h-10 w-10 items-center justify-center rounded-xl p-0 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      <a
                        href={result.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Otevřít web"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      disabled={!result.linkedinUrl}
                      className="flex h-10 w-10 items-center justify-center rounded-xl p-0 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      <a
                        href={result.linkedinUrl || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Otevřít LinkedIn"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="flex h-10 w-10 items-center justify-center rounded-xl p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Link href={sniperHref(result)} aria-label="Sniper">
                        <Crosshair className="h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
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
