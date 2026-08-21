"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  MapPin,
  Linkedin,
} from "lucide-react";
import { ToolToggle } from "@/components/sklyvo/tool-toggle";
import { cn } from "@/lib/utils";
import { searchRadarLeads } from "@/app/actions/radar";
import { addLeadFromRadar, importMultipleLeads } from "@/app/actions/crm";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { messages } from "@/lib/i18n/messages";
import type { TranslationParams } from "@/lib/i18n/types";
import {
  DEFAULT_RADAR_COUNTRY,
  RADAR_COUNTRY_NONE,
  RADAR_COUNTRY_OPTIONS,
  RADAR_COUNTRY_STORAGE_KEY,
  detectCountryFromQuery,
  localizedCountryLabel,
  normalizeCountryCode,
} from "@/lib/country-language";
import { DATE_LOCALE } from "@/lib/i18n/types";

const RADAR_RECENT_STORAGE_KEY = "sklyvo-radar-recent-searches";
const RADAR_RECENT_MAX = 4;

type RecentSearch = { query: string; count: number; at: number };

function loadRecentSearches(): RecentSearch[] {
  try {
    const raw = window.localStorage.getItem(RADAR_RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") {
          // legacy entries — query text only, no count/date yet
          return { query: item.trim(), count: 0, at: 0 };
        }
        if (item && typeof item === "object") {
          const r = item as Partial<RecentSearch>;
          if (typeof r.query === "string" && r.query.trim()) {
            return {
              query: r.query.trim(),
              count: typeof r.count === "number" ? r.count : 0,
              at: typeof r.at === "number" ? r.at : 0,
            };
          }
        }
        return null;
      })
      .filter((item): item is RecentSearch => item !== null && item.query.length > 0)
      .slice(0, RADAR_RECENT_MAX);
  } catch {
    return [];
  }
}

function pushRecentSearch(query: string, count: number): RecentSearch[] {
  const q = query.trim();
  if (!q) return loadRecentSearches();
  const next = [
    { query: q, count, at: Date.now() },
    ...loadRecentSearches().filter(
      (item) => item.query.toLowerCase() !== q.toLowerCase(),
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

function formatRelativeDate(
  at: number,
  t: (path: string, params?: TranslationParams) => string,
): string {
  const diffMs = Date.now() - at;
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (minutes < 1) return t("dashboard.timeNow");
  if (hours < 1) return t("dashboard.timeMinutesAgo", { minutes });
  if (days < 1) return t("dashboard.timeHoursAgo", { hours });
  if (days === 1) return t("dashboard.timeYesterday");
  const d = new Date(at);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

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
  const [count, setCount] = useState("25");
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
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

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

    const raw = radarResponse.results ?? [];
    const filtered = onlyEmail
      ? raw.filter((r) => Boolean(r.email?.trim()))
      : raw;
    setResults(filtered);
    setHasResults(true);
    setRecentSearches(pushRecentSearch(query.trim(), filtered.length));
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
    toast.success(t("radar.addedToCrm"));
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
    const companyWord =
      created === 1
        ? t("radar.companyOne")
        : language === "cz" && created >= 2 && created <= 4
          ? t("radar.companyFew")
          : t("radar.companyMany");
    if (created > 0) {
      toast.success(
        t("radar.importedToCrm", { count: created, word: companyWord }),
      );
    } else {
      toast.message(t("radar.nothingToImport"));
    }
  };

  const recentIn7Days = useMemo(
    () =>
      recentSearches.filter(
        (s) => s.at === 0 || Date.now() - s.at < 7 * 86_400_000,
      ),
    [recentSearches],
  );

  return (
    <div className="sk-tool-page sk-tool-page--stack">
      <div className="sk-page-head sk-page-head--tool shrink-0">
        <h1 className="sk-page-head__title">{t("radar.title")}</h1>
        <p className="sk-page-head__sub">{t("radar.subtitle")}</p>
      </div>

      <div className="sk-tool-form shrink-0">
        <div className="sk-tool-form__grid">
          <div className="sk-tool-form__field">
            <Label className="sk-field-label">
              {t("radar.targetProfile")}
            </Label>
            <div className="sk-field">
              <Search className="sk-field__icon" aria-hidden />
              <input
                className="sk-plain-field"
                placeholder={t("radar.searchPlaceholder")}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="sk-tool-form__field">
            <Label className="sk-field-label">{t("radar.country")}</Label>
            <Select value={country} onValueChange={handleCountryChange}>
              <SelectTrigger className="sk-field w-full justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RADAR_COUNTRY_NONE}>
                  {t("radar.countryAny")}
                </SelectItem>
                {RADAR_COUNTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.code} value={opt.code}>
                    {localizedCountryLabel(opt.code, DATE_LOCALE[language]) ??
                      opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sk-tool-form__field">
            <Label className="sk-field-label">{t("radar.resultCount")}</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="sk-field w-full justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">
                  {t("radar.resultsN", { n: 5 })}
                </SelectItem>
                <SelectItem value="10">
                  {t("radar.resultsN", { n: 10 })}
                </SelectItem>
                <SelectItem value="15">
                  {t("radar.resultsN", { n: 15 })}
                </SelectItem>
                <SelectItem value="25">
                  {t("radar.resultsN", { n: 25 })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="sk-tool-ideas">
          <span className="sk-tool-ideas__label">
            {t("radar.inspirationLabel")}
          </span>
          {searchInspirations.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => handleQueryChange(text)}
              className="sk-tool-chip"
            >
              {text}
            </button>
          ))}
        </div>

        <div className="sk-tool-toggles">
          <ToolToggle
            checked={deepScan}
            onChange={setDeepScan}
            label={t("radar.deepScanLabel")}
          />
          <ToolToggle
            checked={excludeCrm}
            onChange={setExcludeCrm}
            label={t("radar.excludeCrmLabel")}
          />
          <ToolToggle
            checked={onlyEmail}
            onChange={setOnlyEmail}
            label={t("radar.emailOnlyLabel")}
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={isSearching || !query.trim()}
          className="sk-tool-cta"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("radar.searching")}
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5" />
              {t("radar.runSearch")}
            </>
          )}
        </button>
        {searchError && (
          <p className="mt-2 text-sm font-medium text-red-500">{searchError}</p>
        )}
      </div>

      {!hasResults ? (
        <section
          className="sk-sniper-recent"
          aria-label={t("radar.recentLabel")}
        >
          <div className="sk-sniper-recent__head">
            <h2 className="sk-sniper-recent__title">{t("radar.recentLabel")}</h2>
            <span className="sk-sniper-recent__count">
              {t("radar.recentCount", { count: recentIn7Days.length })}
            </span>
          </div>
          <div className="sk-sniper-recent__list">
            {recentSearches.length === 0 ? (
              <p className="sk-sniper-recent__empty">{t("radar.recentEmpty")}</p>
            ) : (
              recentSearches.map((item) => (
                <button
                  key={item.query}
                  type="button"
                  onClick={() => handleQueryChange(item.query)}
                  className="sk-history__row"
                >
                  <span className="sk-history__query">
                    <span className="sk-history__dot" aria-hidden />
                    <span className="sk-history__text">{item.query}</span>
                  </span>
                  <span className="sk-history__meta">
                    {item.count > 0 && (
                      <span className="sk-history__found">
                        {t("radar.recentFoundCount", { count: item.count })}
                      </span>
                    )}
                    {item.at > 0 && (
                      <span className="sk-history__when">
                        {formatRelativeDate(item.at, t)}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      ) : null}

      {hasResults && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Nalezené subjekty
              </h3>
              <Button
                onClick={() => void handleImportAll()}
                disabled={isImportingAll || results.length === 0}
                className="h-9 rounded-xl bg-[color:var(--sk-brand)] px-4 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[color:var(--sk-brand)]/90"
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
                  <span className="text-xs font-bold text-[color:var(--sk-brand)] mr-2">
                    {selectedLeads.length} vybráno
                  </span>
                  {/* OPRAVENO: Tlačítko pro přidání do CRM */}
                  <Button
                    variant="outline"
                    className="sk-pill sk-pill--soft flex h-9 items-center justify-center px-4 text-[10px] font-bold uppercase tracking-widest transition-all"
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
                    "sk-list-card group relative flex items-start gap-3 rounded-xl border p-3 transition-all sm:gap-5 sm:rounded-2xl sm:p-6",
                    selectedLeads.includes(result.id)
                      ? "sk-list-card--selected border-[color:var(--sk-brand)]/50 bg-[color-mix(in_oklab,var(--sk-brand)_10%,var(--n-card))]"
                      : "border-[color:var(--n-hairline)] bg-[color:var(--n-card)] hover:border-[color:var(--sk-brand)]/30",
                  )}
                >
                  <div className="pt-0.5 sm:pt-1.5">
                    <Checkbox
                      checked={selectedLeads.includes(result.id)}
                      onCheckedChange={() => toggleLead(result.id)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-col gap-1.5 sm:mb-2 sm:flex-row sm:items-center sm:gap-3">
                      <h4 className="sk-type-h3 truncate">{result.name}</h4>
                      <div className="flex shrink-0 flex-wrap gap-1.5 sm:gap-2">
                        {addedLeadIds.includes(result.id) && (
                          <span className="sk-pill sk-pill--positive sk-pill--xs">
                            V CRM
                          </span>
                        )}
                        {(result.discoverySources?.includes("places") ||
                          (!result.discoverySources?.length &&
                            result.placeId)) && (
                          <span className="sk-pill sk-pill--soft sk-pill--xs">
                            <MapPin className="mr-1 h-3 w-3" /> Maps
                          </span>
                        )}
                        {result.discoverySources?.includes("web") && (
                          <span className="sk-pill sk-pill--sky sk-pill--xs">
                            <Globe className="mr-1 h-3 w-3" /> Web
                          </span>
                        )}
                        {result.discoverySources?.includes("linkedin") && (
                          <span className="sk-pill sk-pill--indigo sk-pill--xs">
                            <Linkedin className="mr-1 h-3 w-3" /> LinkedIn
                          </span>
                        )}
                        {result.rating !== null && (
                          <span className="sk-pill sk-pill--positive sk-pill--xs">
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
  );
}
