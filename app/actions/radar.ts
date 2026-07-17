"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import {
  AUTOMATED_RADAR_CONFIG,
  type AutomatedRadarRunResult,
} from "@/lib/automated-radar-config";
import { computeScheduledTimes } from "@/lib/email-scheduling";
import { DEFAULT_AUTOPILOT_SETTINGS } from "@/lib/autopilot-settings";
import { buildRadarSearchQueries } from "@/lib/radar-settings-meta";
import { loadRadarSettingsPayloadForWorkspace } from "@/app/actions/radar-settings";
import { queueAutopilotLead } from "@/app/actions/autopilot";
import { prisma } from "@/lib/prisma";

type RadarSearchInput = {
  query: string;
  limit: number;
  /** Pokud true, vynechá firmy už uložené v CRM (placeId, doména webu, název). */
  excludeCrm?: boolean;
};

type RadarLead = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  placeId: string;
  url: string;
  phone: string;
  email: string | null;
};

type GooglePlaceV2 = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  rating?: number;
};

type GoogleTextSearchV2Response = {
  places?: GooglePlaceV2[];
  nextPageToken?: string;
  error?: { message?: string };
};

const FETCH_TIMEOUT_MS = 4500;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseWebsiteUrl(websiteUri: string): URL | null {
  const raw = websiteUri.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const ct = response.headers.get("content-type") ?? "";
    if (ct && !ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

const CONTACT_EMAIL_LOCAL_PARTS = [
  "info",
  "kontakt",
  "contact",
  "office",
  "hello",
  "ahoj",
  "recepce",
  "support",
  "sales",
  "obchod",
  "mail",
];

function isValidScrapedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    !lower.endsWith(".png") &&
    !lower.endsWith(".jpg") &&
    !lower.includes("sentry") &&
    !lower.includes("example.com") &&
    !lower.includes("wixpress.com") &&
    !lower.includes("schema.org") &&
    !lower.includes("email.com") &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function pickBestContactEmail(emails: string[]): string | null {
  const valid = emails.map((e) => e.trim()).filter(isValidScrapedEmail);
  if (valid.length === 0) return null;

  const preferred = valid.find((email) => {
    const local = email.split("@")[0]?.toLowerCase() ?? "";
    return CONTACT_EMAIL_LOCAL_PARTS.some(
      (part) => local === part || local.startsWith(`${part}.`) || local.startsWith(`${part}-`),
    );
  });

  return preferred ?? valid[0];
}

function extractMailtoEmails(html: string): string[] {
  const found: string[] = [];
  const re = /href\s*=\s*["']mailto:([^"'?#]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = decodeURIComponent(match[1].trim()).split("?")[0]?.trim() ?? "";
    if (raw.includes("@")) found.push(raw);
  }
  return found;
}

function extractEmailFromHtml(html: string): string | null {
  const mailtoEmails = extractMailtoEmails(html);
  if (mailtoEmails.length > 0) {
    return pickBestContactEmail(mailtoEmails);
  }

  const emails = html.match(/[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}/g);
  if (!emails || emails.length === 0) return null;
  return pickBestContactEmail(emails);
}

function extractPhoneFromHtml(html: string): string | null {
  const re = /href\s*=\s*["']tel:\s*([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let v = decodeURIComponent(m[1].trim());
    v = v.replace(/^tel:/i, "").trim();
    v = v.split(";")[0]?.trim() ?? v;
    if (v.length < 7) continue;
    if (/^(javascript|void|#)/i.test(v)) continue;
    return v.replace(/\s+/g, " ").trim();
  }
  return null;
}

function normalizeFetchKey(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "") || "";
    return `${u.origin}${path}`.toLowerCase();
  } catch {
    return url.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
  }
}

async function fetchPageHtmlOnce(url: string, seen: Set<string>): Promise<string | null> {
  const key = normalizeFetchKey(url);
  if (seen.has(key)) return null;
  seen.add(key);
  return fetchPageHtml(url);
}

/** Stáhne homepage a při chybějícím e-mailu nebo telefonu zkusí /kontakt a /contact na stejné doméně. */
async function scrapeWebsiteContacts(
  websiteUri: string,
): Promise<{ email: string | null; phoneFromSite: string | null }> {
  const parsed = parseWebsiteUrl(websiteUri);
  if (!parsed) {
    return { email: null, phoneFromSite: null };
  }

  const homepage = parsed.href.split("#")[0];
  const origin = parsed.origin;

  let email: string | null = null;
  let phoneFromSite: string | null = null;

  const seen = new Set<string>();
  const homeHtml = await fetchPageHtmlOnce(homepage, seen);
  if (homeHtml) {
    email = extractEmailFromHtml(homeHtml);
    phoneFromSite = extractPhoneFromHtml(homeHtml);
  }

  if (email && phoneFromSite) {
    return { email, phoneFromSite };
  }

  const extraPaths = ["/kontakt", "/contact"];
  for (const path of extraPaths) {
    const pageUrl = `${origin}${path}`;
    const html = await fetchPageHtmlOnce(pageUrl, seen);
    if (!html) continue;
    if (!email) email = extractEmailFromHtml(html);
    if (!phoneFromSite) phoneFromSite = extractPhoneFromHtml(html);
    if (email && phoneFromSite) break;
  }

  return { email, phoneFromSite };
}

function normalizeCompanyName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Hostname bez www, malá písmena — shodné s ukládáním domény v CRM. */
function normalizeDomainFromWebsite(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = u.hostname.toLowerCase().replace(/^www\./i, "");
    return host || null;
  } catch {
    const cleaned = s.replace(/^https?:\/\//i, "").split("/")[0]?.trim().toLowerCase() ?? "";
    return cleaned.replace(/^www\./i, "") || null;
  }
}

type CrmExclusionKeys = {
  placeIds: Set<string>;
  domains: Set<string>;
  names: Set<string>;
};

async function loadCrmExclusionKeys(workspaceId: string): Promise<CrmExclusionKeys> {
  const leads = await prisma.lead.findMany({
    where: { workspaceId },
    select: { placeId: true, domain: true, companyName: true },
  });

  const placeIds = new Set<string>();
  const domains = new Set<string>();
  const names = new Set<string>();

  for (const lead of leads) {
    const pid = lead.placeId?.trim();
    if (pid) placeIds.add(pid);

    const dom = normalizeDomainFromWebsite(lead.domain);
    if (dom) domains.add(dom);

    const nk = normalizeCompanyName(lead.companyName);
    if (nk) names.add(nk);
  }

  return { placeIds, domains, names };
}

function googlePlaceIsInCrm(item: GooglePlaceV2, keys: CrmExclusionKeys): boolean {
  const pid = item.id?.trim();
  if (pid && keys.placeIds.has(pid)) return true;

  const nameKey = normalizeCompanyName(item.displayName?.text);
  if (nameKey && keys.names.has(nameKey)) return true;

  const dom = normalizeDomainFromWebsite(item.websiteUri);
  if (dom && keys.domains.has(dom)) return true;

  return false;
}

/** Text Search (New): max 20 výsledků na stránku, přes nextPageToken typicky do ~60 celkem. */
const GOOGLE_SEARCH_PAGE_SIZE = 20;
const GOOGLE_SEARCH_MAX_RAW_PLACES = 60;

async function fetchGooglePlacesSearchTextPage(
  apiKey: string,
  textQuery: string,
  pageToken?: string,
): Promise<{ places: GooglePlaceV2[]; nextPageToken?: string; error?: string }> {
  const body: Record<string, unknown> = {
    textQuery,
    pageSize: GOOGLE_SEARCH_PAGE_SIZE,
  };
  if (pageToken) {
    body.pageToken = pageToken;
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,places.rating",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as GoogleTextSearchV2Response;

  if (!response.ok) {
    return {
      places: [],
      error: data.error?.message || `Google API chyba (${response.status}).`,
    };
  }

  return {
    places: data.places ?? [],
    nextPageToken: data.nextPageToken,
  };
}

async function collectGooglePlacesForQuery(
  apiKey: string,
  textQuery: string,
  requestedLimit: number,
  crmKeys: CrmExclusionKeys | null,
): Promise<{ places: GooglePlaceV2[]; error?: string }> {
  const normalizedQuery = textQuery.trim();
  if (!normalizedQuery) {
    return { places: [], error: "Prázdný dotaz." };
  }

  const collected: GooglePlaceV2[] = [];
  const seenPlaceIds = new Set<string>();
  let pageToken: string | undefined;
  let pageIndex = 0;

  while (collected.length < GOOGLE_SEARCH_MAX_RAW_PLACES && pageIndex < 5) {
    pageIndex += 1;
    const page = await fetchGooglePlacesSearchTextPage(apiKey, normalizedQuery, pageToken);

    if (page.error) {
      if (collected.length === 0) {
        return { places: [], error: page.error };
      }
      break;
    }

    for (const p of page.places) {
      if (collected.length >= GOOGLE_SEARCH_MAX_RAW_PLACES) break;
      const pid = p.id?.trim();
      if (pid) {
        if (seenPlaceIds.has(pid)) continue;
        seenPlaceIds.add(pid);
      }
      collected.push(p);
    }

    const afterFilter = crmKeys
      ? collected.filter((place) => !googlePlaceIsInCrm(place, crmKeys))
      : collected;

    if (afterFilter.length >= requestedLimit) break;
    if (!page.nextPageToken) break;
    if (page.places.length === 0) break;

    pageToken = page.nextPageToken;
    await new Promise((r) => setTimeout(r, 150));
  }

  const afterFilter = crmKeys
    ? collected.filter((place) => !googlePlaceIsInCrm(place, crmKeys))
    : collected;

  return { places: afterFilter.slice(0, requestedLimit) };
}

async function mapGooglePlaceToRadarLead(
  item: GooglePlaceV2,
  index: number,
  scrapeWebsites = true,
): Promise<RadarLead> {
  const placeId = item.id || `place_${index}`;
  const url = item.websiteUri ?? "";
  let email: string | null = null;
  let phone = (item.internationalPhoneNumber ?? "").trim();

  if (scrapeWebsites && url) {
    const scraped = await scrapeWebsiteContacts(url);
    email = scraped.email;
    if (!phone && scraped.phoneFromSite) phone = scraped.phoneFromSite;
  }

  return {
    id: placeId,
    name: item.displayName?.text || "Neznámá firma",
    address: item.formattedAddress || "Adresa není k dispozici",
    rating: typeof item.rating === "number" ? item.rating : null,
    placeId,
    url,
    phone,
    email,
  };
}

async function loadCrmEmailKeys(workspaceId: string): Promise<Set<string>> {
  const leads = await prisma.lead.findMany({
    where: { workspaceId },
    select: { email: true, contactEmail: true },
  });

  const emails = new Set<string>();
  for (const lead of leads) {
    for (const raw of [lead.email, lead.contactEmail]) {
      const normalized = raw?.trim().toLowerCase();
      if (normalized) emails.add(normalized);
    }
  }

  return emails;
}

async function persistAutomatedRadarLeads(
  workspaceId: string,
  leads: RadarLead[],
  crmKeys: CrmExclusionKeys,
  crmEmails: Set<string>,
  maxToCreate?: number,
): Promise<{ created: number; skipped: number; createdLeadIds: string[] }> {
  let created = 0;
  let skipped = 0;
  const createdLeadIds: string[] = [];

  const toCreate: Array<{
    companyName: string;
    domain: string | null;
    placeId: string | null;
    email: string | null;
    phone: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    status: "NEW";
    workspaceId: string;
    industry: null;
  }> = [];

  const inBatchPlaceIds = new Set<string>();
  const inBatchDomains = new Set<string>();
  const inBatchEmails = new Set<string>();

  for (const lead of leads) {
    if (maxToCreate != null && toCreate.length >= maxToCreate) {
      break;
    }

    const companyName = lead.name.trim();
    if (!companyName) {
      skipped += 1;
      continue;
    }

    const placeId = lead.placeId?.trim() || null;
    const domain = normalizeDomainFromWebsite(lead.url);
    const email = lead.email?.trim() || null;
    const emailKey = email?.toLowerCase() ?? null;
    const contactPhone = lead.phone?.trim() || null;

    const duplicateByPlaceId =
      !!placeId && (crmKeys.placeIds.has(placeId) || inBatchPlaceIds.has(placeId));
    const duplicateByDomain =
      !!domain && (crmKeys.domains.has(domain) || inBatchDomains.has(domain));
    const duplicateByEmail =
      !!emailKey && (crmEmails.has(emailKey) || inBatchEmails.has(emailKey));

    if (duplicateByPlaceId || duplicateByDomain || duplicateByEmail) {
      skipped += 1;
      continue;
    }

    if (placeId) inBatchPlaceIds.add(placeId);
    if (domain) inBatchDomains.add(domain);
    if (emailKey) inBatchEmails.add(emailKey);

    toCreate.push({
      companyName,
      domain,
      placeId,
      email,
      phone: contactPhone,
      contactPhone,
      contactEmail: email,
      status: "NEW",
      workspaceId,
      industry: null,
    });
  }

  if (toCreate.length > 0) {
    await prisma.lead.createMany({ data: toCreate });
    created = toCreate.length;

    const placeIds = toCreate
      .map((row) => row.placeId)
      .filter((id): id is string => Boolean(id));

    if (placeIds.length > 0) {
      const inserted = await prisma.lead.findMany({
        where: { workspaceId, placeId: { in: placeIds } },
        select: { id: true },
      });
      createdLeadIds.push(...inserted.map((lead) => lead.id));
    }

    for (const row of toCreate) {
      if (row.placeId) crmKeys.placeIds.add(row.placeId);
      if (row.domain) crmKeys.domains.add(row.domain);
      const nameKey = normalizeCompanyName(row.companyName);
      if (nameKey) crmKeys.names.add(nameKey);
      for (const raw of [row.email, row.contactEmail]) {
        const normalized = raw?.trim().toLowerCase();
        if (normalized) crmEmails.add(normalized);
      }
    }
  }

  return { created, skipped, createdLeadIds };
}

async function autoQueueOutreachForLeads(workspaceId: string, leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0;

  const windows = [
    { start: DEFAULT_AUTOPILOT_SETTINGS.window1Start, end: DEFAULT_AUTOPILOT_SETTINGS.window1End },
    { start: DEFAULT_AUTOPILOT_SETTINGS.window2Start, end: DEFAULT_AUTOPILOT_SETTINGS.window2End },
  ].filter((window) => window.start.trim() && window.end.trim());

  if (windows.length === 0) return 0;

  let scheduledTimes: Date[];
  try {
    scheduledTimes = computeScheduledTimes(
      leadIds.length,
      windows,
      DEFAULT_AUTOPILOT_SETTINGS.maxEmailsPerBatch,
    );
  } catch {
    return 0;
  }

  let queued = 0;
  for (let index = 0; index < leadIds.length; index += 1) {
    const result = await queueAutopilotLead({
      leadId: leadIds[index],
      scheduledAt: scheduledTimes[index].toISOString(),
    });
    if ("success" in result && result.success) {
      queued += 1;
    }
  }

  return queued;
}

export async function runAutomatedRadar(): Promise<
  (AutomatedRadarRunResult & { outreachQueued?: number }) | { error: string }
> {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { error: "Chybí GOOGLE_PLACES_API_KEY." };
  }

  const workspaceId = session.workspace.id;
  const radarSettings = await loadRadarSettingsPayloadForWorkspace(workspaceId);
  const searches = buildRadarSearchQueries(radarSettings);
  const maxPerRun = Math.max(1, radarSettings.maxCompaniesPerRun ?? 50);

  const crmKeys = await loadCrmExclusionKeys(workspaceId);
  const crmEmails = await loadCrmEmailKeys(workspaceId);

  let queriesRun = 0;
  let createdCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];
  const newLeadIds: string[] = [];

  for (const search of searches) {
    if (createdCount >= maxPerRun) {
      break;
    }

    queriesRun += 1;

    try {
      const { places, error } = await collectGooglePlacesForQuery(
        apiKey,
        search.query,
        search.limit,
        crmKeys,
      );

      if (error) {
        errors.push(`"${search.query}" — ${error}`);
        continue;
      }

      const mapped = await Promise.all(
        places.map((item, index) =>
          mapGooglePlaceToRadarLead(item, index, AUTOMATED_RADAR_CONFIG.scrapeWebsites),
        ),
      );

      const persist = await persistAutomatedRadarLeads(
        workspaceId,
        mapped,
        crmKeys,
        crmEmails,
        maxPerRun - createdCount,
      );
      createdCount += persist.created;
      skippedCount += persist.skipped;
      newLeadIds.push(...persist.createdLeadIds);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Neznámá chyba";
      errors.push(`"${search.query}" — ${message}`);
    }
  }

  let outreachQueued = 0;
  if (radarSettings.autoStartOutreach && newLeadIds.length > 0) {
    outreachQueued = await autoQueueOutreachForLeads(workspaceId, newLeadIds);
  }

  revalidatePath("/crm");
  revalidatePath("/radar");
  revalidatePath("/autopilot");
  revalidatePath("/");

  return {
    ok: true,
    workspacesProcessed: 1,
    queriesRun,
    createdCount,
    skippedCount,
    errors,
    outreachQueued,
  };
}

export async function searchRadarLeads(input: RadarSearchInput) {
  const session = await getSessionUser();
  if (!session.user?.id || !session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const normalizedQuery = input.query.trim();
  if (!normalizedQuery) {
    return { error: "Vyhledávací dotaz je povinný." };
  }

  const creditsLeft = (session.workspace.creditsTotal ?? 0) - (session.workspace.creditsUsed ?? 0);
  if (creditsLeft <= 0) {
    return { error: "Nemáte dostatek kreditů pro Radar vyhledávání." };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { error: "Chybí GOOGLE_PLACES_API_KEY." };
  }

  /** Počet výsledků, který si uživatel vybral v UI (přesně tolik jde zpět po filtraci, pokud to API dovolí). */
  const requestedLimit = Math.max(1, input.limit);
  const excludeCrm = input.excludeCrm === true;
  const crmKeys = excludeCrm ? await loadCrmExclusionKeys(session.workspace.id) : null;

  const collected: GooglePlaceV2[] = [];
  const seenPlaceIds = new Set<string>();
  let pageToken: string | undefined;
  let pageIndex = 0;

  while (collected.length < GOOGLE_SEARCH_MAX_RAW_PLACES && pageIndex < 5) {
    pageIndex += 1;
    const page = await fetchGooglePlacesSearchTextPage(apiKey, normalizedQuery, pageToken);

    if (page.error) {
      if (collected.length === 0) {
        return { error: page.error };
      }
      break;
    }

    for (const p of page.places) {
      if (collected.length >= GOOGLE_SEARCH_MAX_RAW_PLACES) {
        break;
      }
      const pid = p.id?.trim();
      if (pid) {
        if (seenPlaceIds.has(pid)) continue;
        seenPlaceIds.add(pid);
      }
      collected.push(p);
    }

    const afterFilter = crmKeys
      ? collected.filter((place) => !googlePlaceIsInCrm(place, crmKeys))
      : collected;

    if (afterFilter.length >= requestedLimit) {
      break;
    }
    if (!page.nextPageToken) {
      break;
    }
    if (page.places.length === 0) {
      break;
    }

    pageToken = page.nextPageToken;
    await new Promise((r) => setTimeout(r, 150));
  }

  const afterFilter = crmKeys
    ? collected.filter((place) => !googlePlaceIsInCrm(place, crmKeys))
    : collected;

  const placesToMap = afterFilter.slice(0, requestedLimit);

  const mappedResults: RadarLead[] = await Promise.all(
    placesToMap.map((item, index) => mapGooglePlaceToRadarLead(item, index, true)),
  );

  await prisma.workspace.update({
    where: { id: session.workspace.id },
    data: { creditsUsed: { increment: 1 } },
  });

  revalidatePath("/radar");
  revalidatePath("/");

  return { results: mappedResults };
}
