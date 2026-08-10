"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, getWorkspaceAccessState } from "@/app/actions/auth";
import {
  AUTOMATED_RADAR_CONFIG,
  type AutomatedRadarRunResult,
} from "@/lib/automated-radar-config";
import { buildRadarSearchQueries } from "@/lib/radar-settings-meta";
import { loadRadarSettingsPayloadForWorkspace } from "@/lib/radar-settings-load";
import { queueAutopilotLead } from "@/app/actions/autopilot";
import {
  loadSheetsArchiveExclusionKeys,
  scheduleCrmSheetsSync,
} from "@/lib/google-sheets-sync";
import { prisma } from "@/lib/prisma";
import { normalizeCountryCode } from "@/lib/country-language";
import {
  authorFromSessionUser,
  authorFromSessionName,
} from "@/lib/lead-provenance";
import { inferLeadTags } from "@/lib/lead-tags";
import {
  normalizeCompanyName,
  normalizeDomainFromWebsite,
  normalizeLinkedInUrl,
} from "@/lib/radar/normalize";
import { orchestrateRadarSearch } from "@/lib/radar/orchestrate";
import type { CrmExclusionKeys } from "@/lib/radar/providers/places";
import type {
  RadarDiscoverySource,
  RadarLead,
  RadarSourceFlags,
} from "@/lib/radar/types";
import { DEFAULT_RADAR_SOURCES } from "@/lib/radar/types";

type RadarSearchInput = {
  query: string;
  limit: number;
  /** Pokud true, vynechá firmy už uložené v CRM (placeId, doména webu, název). */
  excludeCrm?: boolean;
  /** ISO country for Places regionCode (e.g. CZ, DE). */
  regionCode?: string | null;
  /** Deep Scan = thorough website contact scrape. */
  deepScan?: boolean;
  /** Multi-source toggles (Maps / Web / LinkedIn). */
  sources?: Partial<RadarSourceFlags>;
};

async function loadCrmExclusionKeys(
  workspaceId: string,
): Promise<CrmExclusionKeys> {
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

async function resolveWorkspaceLeadAuthor(
  workspaceId: string,
): Promise<string | null> {
  const owner = await prisma.user.findFirst({
    where: { workspaceId, role: "OWNER" },
    select: { name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  if (owner) {
    const fromOwner = authorFromSessionUser(owner);
    if (fromOwner) return fromOwner;
  }
  const anyMember = await prisma.user.findFirst({
    where: { workspaceId },
    select: { name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    authorFromSessionUser(anyMember) ?? authorFromSessionName(anyMember?.name)
  );
}

async function persistAutomatedRadarLeads(
  workspaceId: string,
  leads: RadarLead[],
  crmKeys: CrmExclusionKeys,
  crmEmails: Set<string>,
  maxToCreate?: number,
  countryCode?: string | null,
  author?: string | null,
  searchQuery?: string | null,
  leadSource: "AUTOPILOT" | "FULL_AUTO" = "AUTOPILOT",
): Promise<{ created: number; skipped: number; createdLeadIds: string[] }> {
  let created = 0;
  let skipped = 0;
  const createdLeadIds: string[] = [];
  const resolvedCountry = normalizeCountryCode(countryCode);
  const resolvedAuthor =
    author ?? (await resolveWorkspaceLeadAuthor(workspaceId));

  const toCreate: Array<{
    companyName: string;
    domain: string | null;
    placeId: string | null;
    linkedinUrl: string | null;
    discoverySources: RadarDiscoverySource[];
    email: string | null;
    phone: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    status: "NEW";
    source: "AUTOPILOT" | "FULL_AUTO";
    author: string | null;
    workspaceId: string;
    industry: null;
    countryCode: string | null;
    tags: string[];
  }> = [];

  const inBatchPlaceIds = new Set<string>();
  const inBatchDomains = new Set<string>();
  const inBatchEmails = new Set<string>();
  const inBatchLinkedIn = new Set<string>();

  const candidateLinkedIn = Array.from(
    new Set(
      leads
        .map((l) => normalizeLinkedInUrl(l.linkedinUrl))
        .filter((u): u is string => Boolean(u)),
    ),
  );
  const existingLinkedInRows =
    candidateLinkedIn.length > 0
      ? await prisma.lead.findMany({
          where: {
            workspaceId,
            linkedinUrl: { in: candidateLinkedIn },
          },
          select: { linkedinUrl: true },
        })
      : [];
  const existingLinkedIn = new Set(
    existingLinkedInRows
      .map((r) => r.linkedinUrl)
      .filter((u): u is string => Boolean(u)),
  );

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
    const linkedinUrl = normalizeLinkedInUrl(lead.linkedinUrl);
    const email = lead.email?.trim() || null;
    const emailKey = email?.toLowerCase() ?? null;
    const contactPhone = lead.phone?.trim() || null;
    const discoverySources =
      lead.discoverySources?.length > 0
        ? lead.discoverySources
        : (["places"] as RadarDiscoverySource[]);

    const duplicateByPlaceId =
      !!placeId &&
      (crmKeys.placeIds.has(placeId) || inBatchPlaceIds.has(placeId));
    const duplicateByDomain =
      !!domain && (crmKeys.domains.has(domain) || inBatchDomains.has(domain));
    const duplicateByEmail =
      !!emailKey && (crmEmails.has(emailKey) || inBatchEmails.has(emailKey));
    const duplicateByLinkedIn =
      !!linkedinUrl &&
      (existingLinkedIn.has(linkedinUrl) || inBatchLinkedIn.has(linkedinUrl));

    if (
      duplicateByPlaceId ||
      duplicateByDomain ||
      duplicateByEmail ||
      duplicateByLinkedIn
    ) {
      skipped += 1;
      continue;
    }

    if (placeId) inBatchPlaceIds.add(placeId);
    if (domain) inBatchDomains.add(domain);
    if (emailKey) inBatchEmails.add(emailKey);
    if (linkedinUrl) inBatchLinkedIn.add(linkedinUrl);

    toCreate.push({
      companyName,
      domain,
      placeId,
      linkedinUrl,
      discoverySources,
      email,
      phone: contactPhone,
      contactPhone,
      contactEmail: email,
      status: "NEW",
      source: leadSource,
      author: resolvedAuthor,
      workspaceId,
      industry: null,
      countryCode: resolvedCountry,
      tags: inferLeadTags({
        companyName,
        domain,
        searchQuery,
        placeTypes: lead.placeTypes,
      }),
    });
  }

  if (toCreate.length > 0) {
    await prisma.lead.createMany({ data: toCreate });
    created = toCreate.length;
    scheduleCrmSheetsSync(workspaceId);

    const placeIds = toCreate
      .map((row) => row.placeId)
      .filter((id): id is string => Boolean(id));
    const domains = toCreate
      .map((row) => row.domain)
      .filter((d): d is string => Boolean(d));
    const linkedinUrls = toCreate
      .map((row) => row.linkedinUrl)
      .filter((u): u is string => Boolean(u));

    const inserted = await prisma.lead.findMany({
      where: {
        workspaceId,
        OR: [
          ...(placeIds.length ? [{ placeId: { in: placeIds } }] : []),
          ...(domains.length ? [{ domain: { in: domains } }] : []),
          ...(linkedinUrls.length
            ? [{ linkedinUrl: { in: linkedinUrls } }]
            : []),
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: toCreate.length,
    });
    createdLeadIds.push(...inserted.map((lead) => lead.id));

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

async function autoQueueOutreachForLeads(
  workspaceId: string,
  leadIds: string[],
): Promise<number> {
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
      internalToken: (
        await import("@/lib/internal-auth")
      ).createInternalWorkspaceToken(workspaceId),
    });
    if ("success" in result && result.success) {
      queued += 1;
    }
  }

  return queued;
}

export async function runAutomatedRadarForWorkspace(
  workspaceId: string,
  options?: {
    forceAutoStartOutreach?: boolean;
    internalToken?: string;
    /** AUTOPILOT = noční Sběr; FULL_AUTO = Full Auto pipeline */
    leadSource?: "AUTOPILOT" | "FULL_AUTO";
  },
): Promise<
  (AutomatedRadarRunResult & { outreachQueued?: number }) | { error: string }
> {
  const { verifyInternalWorkspaceToken } = await import("@/lib/internal-auth");
  if (!verifyInternalWorkspaceToken(workspaceId, options?.internalToken)) {
    return { error: "Neautorizováno." };
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
  const regionCode = normalizeCountryCode(radarSettings.countryCode);
  const maxPerRun = Math.min(
    Math.max(1, radarSettings.maxCompaniesPerRun ?? 50),
    maxAffordableLeads,
  );
  const minPerRun = Math.max(
    1,
    Math.min(radarSettings.minCompaniesPerRun ?? 1, maxPerRun),
  );
  const shouldAutoQueue =
    options?.forceAutoStartOutreach === true || radarSettings.autoStartOutreach;
  const sources: RadarSourceFlags = {
    places: true,
    web: true,
    linkedin: true,
  };

  const crmKeys = await loadCrmExclusionKeys(workspaceId);
  const crmEmails = await loadCrmEmailKeys(workspaceId);
  const autopilotAuthor = await resolveWorkspaceLeadAuthor(workspaceId);

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
      const { results: mapped, error } = await orchestrateRadarSearch({
        query: search.query,
        limit: search.limit,
        regionCode,
        crmKeys,
        deepScan: AUTOMATED_RADAR_CONFIG.scrapeWebsites,
        sources,
      });

      if (error && mapped.length === 0) {
        errors.push(`"${search.query}" — ${error}`);
        continue;
      }

      const persist = await persistAutomatedRadarLeads(
        workspaceId,
        mapped,
        crmKeys,
        crmEmails,
        maxPerRun - createdCount,
        regionCode,
        autopilotAuthor,
        search.query,
        options?.leadSource === "FULL_AUTO" ? "FULL_AUTO" : "AUTOPILOT",
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

export async function runAutomatedRadar(): Promise<
  (AutomatedRadarRunResult & { outreachQueued?: number }) | { error: string }
> {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  return runAutomatedRadarForWorkspace(session.workspace.id, {
    internalToken: (
      await import("@/lib/internal-auth")
    ).createInternalWorkspaceToken(session.workspace.id),
  });
}

export async function searchRadarLeads(input: RadarSearchInput) {
  const session = await getSessionUser();
  if (!session.user?.id || !session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const access = await getWorkspaceAccessState();
  if (access.isBlocked) {
    return { error: "Váš trial nebo předplatné není aktivní." };
  }

  const { consumeRateLimit, RATE_LIMITS } = await import("@/lib/rate-limit");
  const limited = await consumeRateLimit({
    key: `radar:${session.workspace.id}`,
    ...RATE_LIMITS.radarSearch,
  });
  if (!limited.ok) {
    return {
      error: `Překročen limit Radar hledání. Zkuste to znovu za cca ${limited.retryAfterSec} s.`,
    };
  }

  const normalizedQuery = input.query.trim();
  if (!normalizedQuery) {
    return { error: "Vyhledávací dotaz je povinný." };
  }

  const creditsLeft =
    (session.workspace.creditsTotal ?? 0) -
    (session.workspace.creditsUsed ?? 0);
  if (creditsLeft <= 0) {
    return { error: "Nemáte dostatek kreditů pro Radar vyhledávání." };
  }

  /** Počet výsledků, který si uživatel vybral v UI. */
  const requestedLimit = Math.max(1, input.limit);
  const excludeCrm = input.excludeCrm === true;
  const crmKeys = excludeCrm
    ? await loadCrmExclusionKeys(session.workspace.id)
    : null;
  const regionCode = normalizeCountryCode(input.regionCode);
  const sources: Partial<RadarSourceFlags> = {
    places: input.sources?.places ?? DEFAULT_RADAR_SOURCES.places,
    web: input.sources?.web ?? DEFAULT_RADAR_SOURCES.web,
    linkedin: input.sources?.linkedin ?? DEFAULT_RADAR_SOURCES.linkedin,
  };

  const { results, error } = await orchestrateRadarSearch({
    query: normalizedQuery,
    limit: requestedLimit,
    regionCode,
    excludeCrm,
    crmKeys,
    deepScan: input.deepScan === true,
    sources,
  });

  if (error && results.length === 0) {
    return { error };
  }

  await prisma.workspace.update({
    where: { id: session.workspace.id },
    data: { creditsUsed: { increment: 1 } },
  });

  revalidatePath("/radar");
  revalidatePath("/");

  return { results };
}
