"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import { AUTOMATED_RADAR_CONFIG, type AutomatedRadarRunResult } from "@/lib/automated-radar-config";
import { buildRadarSearchQueries } from "@/lib/radar-settings-meta";
import { loadRadarSettingsPayloadForWorkspace } from "@/app/actions/radar-settings";
import { queueAutopilotLead } from "@/app/actions/autopilot";
import { loadSheetsArchiveExclusionKeys, scheduleCrmSheetsSync } from "@/lib/google-sheets-sync";
import { scrapeWebsiteContacts } from "@/lib/website-contacts";
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

  // Historická Google Sheets DB — vylučuj i firmy, které už nejsou v app CRM.
  try {
    const archive = await loadSheetsArchiveExclusionKeys(workspaceId);
    for (const d of archive.domains) domains.add(d);
    for (const n of archive.names) names.add(n);
  } catch (err) {
    console.warn("[radar] archive exclusion failed:", err);
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
    if (!phone && scraped.phone) phone = scraped.phone;
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
    source: "RADAR";
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
      source: "RADAR",
      workspaceId,
      industry: null,
    });
  }

  if (toCreate.length > 0) {
    await prisma.lead.createMany({ data: toCreate });
    created = toCreate.length;
    scheduleCrmSheetsSync(workspaceId);

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

  // Po automatickém Radaru řadíme ihned (scheduledAt = teď + drobný rozestup),
  // aby je cron /api/cron/send-emails odeslal při nejbližším běhu.
  const base = Date.now();
  const STAGGER_MS = 45_000;

  let queued = 0;
  for (let index = 0; index < leadIds.length; index += 1) {
    const result = await queueAutopilotLead({
      leadId: leadIds[index],
      scheduledAt: new Date(base + index * STAGGER_MS).toISOString(),
      workspaceId,
    });
    if ("success" in result && result.success) {
      queued += 1;
    }
  }

  return queued;
}

export async function runAutomatedRadarForWorkspace(
  workspaceId: string,
  options?: { forceAutoStartOutreach?: boolean },
): Promise<(AutomatedRadarRunResult & { outreachQueued?: number }) | { error: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { error: "Chybí GOOGLE_PLACES_API_KEY." };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { creditsUsed: true, creditsTotal: true },
  });
  if (!workspace) {
    return { error: "Workspace nenalezen." };
  }

  const creditsLeft = Math.max(
    0,
    (workspace.creditsTotal ?? 0) - (workspace.creditsUsed ?? 0),
  );
  const creditsPerLead = Math.max(1, AUTOMATED_RADAR_CONFIG.creditsPerNewLead);
  const maxAffordableLeads = Math.floor(creditsLeft / creditsPerLead);

  if (maxAffordableLeads <= 0) {
    return { error: "Nedostatek kreditů pro noční sběr Radaru." };
  }

  const radarSettings = await loadRadarSettingsPayloadForWorkspace(workspaceId);
  const searches = buildRadarSearchQueries(radarSettings);
  const maxPerRun = Math.min(
    Math.max(1, radarSettings.maxCompaniesPerRun ?? 50),
    maxAffordableLeads,
  );
  const minPerRun = Math.max(1, Math.min(radarSettings.minCompaniesPerRun ?? 1, maxPerRun));
  const shouldAutoQueue =
    options?.forceAutoStartOutreach === true || radarSettings.autoStartOutreach;

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

  const creditsCharged = createdCount * creditsPerLead;
  if (creditsCharged > 0) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { creditsUsed: { increment: creditsCharged } },
    });
  }

  let outreachQueued = 0;
  if (shouldAutoQueue && newLeadIds.length > 0) {
    outreachQueued = await autoQueueOutreachForLeads(workspaceId, newLeadIds);
  }

  revalidatePath("/crm");
  revalidatePath("/radar");
  revalidatePath("/autopilot");
  revalidatePath("/");

  if (createdCount < minPerRun) {
    console.warn(
      `[radar] workspace ${workspaceId}: pouze ${createdCount} nových firem (cíl ${minPerRun}–${maxPerRun}), queries=${queriesRun}, credits=${creditsCharged}`,
    );
  }

  return {
    ok: true,
    workspacesProcessed: 1,
    queriesRun,
    createdCount,
    skippedCount,
    creditsCharged,
    errors,
    outreachQueued,
  };
}

/** Prague wall-clock helpers for schedule matching (cron). */
function getPragueParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[get("weekday")] ?? now.getDay();
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const y = get("year");
  const m = get("month");
  const d = get("day");
  return {
    weekday,
    minutesOfDay: hour * 60 + minute,
    dateKey: `${y}-${m}-${d}`,
  };
}

/**
 * Spustí naplánovaný Radar pro workspace, jejichž den (Europe/Prague)
 * sedí a dnes ještě neběžel.
 *
 * Pozn.: Na Vercel Hobby může cron běžet max 1× denně (typicky ~01:00 UTC ≈ 03:00 Praha v létě).
 * Proto nečekáme na přesné 10min okno — stačí shoda dne + max 1 běh / den.
 */
export async function processScheduledRadarRuns(): Promise<{
  ok: true;
  checked: number;
  ran: number;
  results: Array<{ workspaceId: string; createdCount?: number; creditsCharged?: number; error?: string }>;
}> {
  const { weekday, dateKey } = getPragueParts();
  const settings = await prisma.radarSettings.findMany({
    where: { radarCronEnabled: true },
    select: {
      workspaceId: true,
      scheduleDays: true,
      scheduleTime: true,
      lastScheduledRunAt: true,
    },
  });

  const results: Array<{
    workspaceId: string;
    createdCount?: number;
    creditsCharged?: number;
    error?: string;
  }> = [];
  let ran = 0;

  for (const row of settings) {
    const days = row.scheduleDays?.length ? row.scheduleDays : [1, 4];
    if (!days.includes(weekday)) continue;

    if (row.lastScheduledRunAt) {
      const last = getPragueParts(row.lastScheduledRunAt);
      if (last.dateKey === dateKey) continue;
    }

    const run = await runAutomatedRadarForWorkspace(row.workspaceId);
    if ("error" in run) {
      results.push({ workspaceId: row.workspaceId, error: run.error });
      continue;
    }

    await prisma.radarSettings.update({
      where: { workspaceId: row.workspaceId },
      data: { lastScheduledRunAt: new Date() },
    });

    ran += 1;
    results.push({
      workspaceId: row.workspaceId,
      createdCount: run.createdCount,
      creditsCharged: run.creditsCharged,
    });
  }

  return { ok: true, checked: settings.length, ran, results };
}

const FULL_AUTO_DAYS: Record<string, number[]> = {
  once_weekly: [1],
  twice_weekly: [1, 4],
  daily: [1, 2, 3, 4, 5],
};

/**
 * Full Auto cron: Radar (včetně fronty) + okamžité odeslání splatných e-mailů.
 * Frekvence once_weekly / twice_weekly / daily podle DB; max 1× denně.
 */
export async function processScheduledFullAutoRuns(): Promise<{
  ok: true;
  checked: number;
  ran: number;
  results: Array<{
    workspaceId: string;
    createdCount?: number;
    outreachQueued?: number;
    emailsSent?: number;
    error?: string;
  }>;
}> {
  const { weekday, dateKey } = getPragueParts();
  const settings = await prisma.radarSettings.findMany({
    where: { fullAutoEnabled: true },
    select: {
      workspaceId: true,
      fullAutoFrequency: true,
      lastFullAutoRunAt: true,
    },
  });

  const results: Array<{
    workspaceId: string;
    createdCount?: number;
    outreachQueued?: number;
    emailsSent?: number;
    error?: string;
  }> = [];
  let ran = 0;

  for (const row of settings) {
    const freq = row.fullAutoFrequency || "twice_weekly";
    const days = FULL_AUTO_DAYS[freq] ?? FULL_AUTO_DAYS.twice_weekly;
    if (!days.includes(weekday)) continue;

    if (row.lastFullAutoRunAt) {
      const last = getPragueParts(row.lastFullAutoRunAt);
      if (last.dateKey === dateKey) continue;
    }

    const run = await runAutomatedRadarForWorkspace(row.workspaceId, {
      forceAutoStartOutreach: true,
    });
    if ("error" in run) {
      results.push({ workspaceId: row.workspaceId, error: run.error });
      continue;
    }

    const { processEmailQueue } = await import("@/app/actions/autopilot");
    const send = await processEmailQueue(50, {
      workspaceId: row.workspaceId,
      ignoreSchedule: true,
    });

    await prisma.radarSettings.update({
      where: { workspaceId: row.workspaceId },
      data: { lastFullAutoRunAt: new Date() },
    });

    ran += 1;
    results.push({
      workspaceId: row.workspaceId,
      createdCount: run.createdCount,
      outreachQueued: run.outreachQueued,
      emailsSent: send.sent,
    });
  }

  return { ok: true, checked: settings.length, ran, results };
}

export async function runAutomatedRadar(): Promise<
  (AutomatedRadarRunResult & { outreachQueued?: number }) | { error: string }
> {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  return runAutomatedRadarForWorkspace(session.workspace.id);
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
