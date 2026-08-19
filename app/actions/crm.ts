"use server";

import { getSessionUser } from "@/app/actions/auth";
import { scheduleCrmSheetsSync } from "@/lib/google-sheets-sync";
import { buildLeadFaviconUrl } from "@/lib/lead-favicon";
import {
  authorFromSessionUser,
  type ContactedViaValue,
  type LeadSourceValue,
} from "@/lib/lead-provenance";
import { inferLeadTags } from "@/lib/lead-tags";
import { mapPool, scrapeWebsiteContacts } from "@/lib/website-contacts";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  leadStatusLabel,
  notifyCampaignReply,
  notifyCrmActivity,
} from "@/lib/emails/notifications";

async function dispatchLeadStatusNotification(input: {
  workspaceId: string;
  leadId: string;
  companyName: string;
  status: string;
}) {
  try {
    if (input.status === "REPLIED") {
      await notifyCampaignReply({
        workspaceId: input.workspaceId,
        companyName: input.companyName,
        leadId: input.leadId,
      });
      return;
    }
    await notifyCrmActivity({
      workspaceId: input.workspaceId,
      companyName: input.companyName,
      statusLabel: leadStatusLabel(input.status),
      leadId: input.leadId,
    });
  } catch (err) {
    console.error("[notifications] lead status notify failed", err);
  }
}

type CrmLead = {
  id: string;
  company: string;
  url: string;
  status: "new" | "contacted" | "follow_up" | "meeting";
  leadStatus:
    | "NEW"
    | "CONTACTED"
    | "REPLIED"
    | "MEETING_SET"
    | "CLOSED_WON"
    | "CLOSED_LOST"
    | "BREAK_UP";
  date: string;
  createdAt: string;
  value: number;
  avatar: string;
  faviconUrl: string | null;
  placeId: string | null;
  email: string;
  phone: string;
  author: string;
  source: LeadSourceValue;
  contactedVia: ContactedViaValue | "";
  websiteVisited: boolean;
  websiteVisitedBy: string;
  lastContactedAt: string | null;
  nextOutreachAt: string | null;
  nextOutreachKind: "INITIAL" | "FOLLOW_UP" | "BREAKUP" | null;
  outreachDue: boolean;
  /** Neviditelné tagy pro filtraci. */
  tags: string[];
};

function mapLeadStatus(status: string): CrmLead["status"] {
  if (status === "CONTACTED") return "contacted";
  if (status === "REPLIED") return "follow_up";
  if (
    status === "MEETING_SET" ||
    status === "CLOSED_WON" ||
    status === "CLOSED_LOST" ||
    status === "BREAK_UP"
  ) {
    return "meeting";
  }
  return "new";
}

function getInitials(companyName: string) {
  return companyName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function toDomain(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "");
  } catch {
    return raw;
  }
}

export async function getLeads() {
  try {
    const session = await getSessionUser();
    if (!session.workspace?.id) {
      return { error: "Nejste přihlášen.", leads: [] as CrmLead[] };
    }

    const workspaceId = session.workspace.id;
    let leadsRaw: Array<{
      id: string;
      companyName: string;
      domain: string | null;
      placeId: string | null;
      email: string | null;
      phone: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      status: CrmLead["leadStatus"];
      author: string | null;
      source: string | null;
      contactedVia?: string | null;
      websiteVisitedAt: Date | null;
      websiteVisitedBy: string | null;
      createdAt: Date;
      value: number | null;
      lastContactedAt: Date | null;
      nextOutreachAt: Date | null;
      nextOutreachKind: CrmLead["nextOutreachKind"];
      industry: string | null;
      tags: string[];
    }>;

    try {
      leadsRaw = await prisma.lead.findMany({
        where: { workspaceId },
        orderBy: [
          { lastContactedAt: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: {
          id: true,
          companyName: true,
          domain: true,
          placeId: true,
          email: true,
          phone: true,
          contactEmail: true,
          contactPhone: true,
          status: true,
          author: true,
          source: true,
          contactedVia: true,
          websiteVisitedAt: true,
          websiteVisitedBy: true,
          createdAt: true,
          value: true,
          lastContactedAt: true,
          nextOutreachAt: true,
          nextOutreachKind: true,
          industry: true,
          tags: true,
        },
      });
    } catch {
      // Stale Prisma client / schema drift — načti bez contactedVia / tags
      const fallback = await prisma.lead.findMany({
        where: { workspaceId },
        orderBy: [
          { lastContactedAt: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: {
          id: true,
          companyName: true,
          domain: true,
          placeId: true,
          email: true,
          phone: true,
          contactEmail: true,
          contactPhone: true,
          status: true,
          author: true,
          source: true,
          websiteVisitedAt: true,
          websiteVisitedBy: true,
          createdAt: true,
          value: true,
          lastContactedAt: true,
          nextOutreachAt: true,
          nextOutreachKind: true,
          industry: true,
        },
      });
      leadsRaw = fallback.map((lead) => ({ ...lead, tags: [] as string[] }));
    }

    // Jednorázový backfill prázdných tagů (max 150 / request).
    const needsTags = leadsRaw.filter(
      (lead) => !lead.tags || lead.tags.length === 0,
    );
    if (needsTags.length > 0) {
      const batch = needsTags.slice(0, 150);
      await Promise.all(
        batch.map(async (lead) => {
          const tags = inferLeadTags({
            companyName: lead.companyName,
            domain: lead.domain,
            industry: lead.industry,
          });
          lead.tags = tags;
          if (tags.length === 0) return;
          try {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { tags },
            });
          } catch {
            /* ignore — např. sloupec ještě není v DB */
          }
        }),
      );
    }

    const now = Date.now();
    const leads: CrmLead[] = leadsRaw.map((lead) => {
      const nextAt = lead.nextOutreachAt?.getTime() ?? null;
      const outreachDue = Boolean(
        nextAt != null &&
        nextAt <= now &&
        (lead.nextOutreachKind === "FOLLOW_UP" ||
          lead.nextOutreachKind === "BREAKUP"),
      );
      const source = (lead.source ?? "MANUAL") as LeadSourceValue;
      const contactedVia =
        lead.contactedVia === "SNIPER" ||
        lead.contactedVia === "AUTOPILOT_SNIPER"
          ? (lead.contactedVia as ContactedViaValue)
          : ("" as const);
      return {
        id: lead.id,
        company: lead.companyName,
        url: lead.domain ?? "",
        status: mapLeadStatus(lead.status),
        leadStatus: lead.status,
        date: lead.createdAt.toLocaleDateString("cs-CZ"),
        createdAt: lead.createdAt.toISOString(),
        value: lead.value ?? 0,
        avatar: getInitials(lead.companyName),
        faviconUrl: buildLeadFaviconUrl(lead.domain),
        placeId: lead.placeId ?? null,
        email: (lead.contactEmail ?? lead.email ?? "").trim(),
        phone: (lead.contactPhone ?? lead.phone ?? "").trim(),
        author: (lead.author ?? "").trim(),
        source,
        contactedVia,
        websiteVisited: Boolean(lead.websiteVisitedAt),
        websiteVisitedBy: (lead.websiteVisitedBy ?? "").trim(),
        lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
        nextOutreachAt: lead.nextOutreachAt?.toISOString() ?? null,
        nextOutreachKind: lead.nextOutreachKind,
        outreachDue,
        tags: Array.isArray(lead.tags) ? lead.tags : [],
      };
    });

    return { leads };
  } catch (err) {
    console.error("getLeads failed", err);
    return {
      error: "Nepodařilo se načíst leady.",
      leads: [] as CrmLead[],
    };
  }
}

type AddLeadFromRadarInput = {
  companyName: string;
  url?: string;
  email?: string;
  phone?: string;
  address?: string;
  placeId?: string;
  linkedinUrl?: string | null;
  discoverySources?: string[] | null;
  countryCode?: string | null;
  /** Text query z Radaru (např. „fitka Praha“) — pro neviditelné tagy. */
  searchQuery?: string | null;
  placeTypes?: string[] | null;
};

export async function addLeadFromRadar(input: AddLeadFromRadarInput) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const companyName = input.companyName?.trim();
  if (!companyName) {
    return { error: "Chybí název firmy." };
  }

  const { normalizeCountryCode } = await import("@/lib/country-language");
  const domain = toDomain(input.url);
  const email = input.email?.trim() || null;
  const contactPhone = input.phone?.trim() || null;
  const countryCode = normalizeCountryCode(input.countryCode);
  const author = authorFromSessionUser(session.user);
  const tags = inferLeadTags({
    companyName,
    domain,
    searchQuery: input.searchQuery,
    placeTypes: input.placeTypes,
  });
  const linkedinUrl = input.linkedinUrl?.trim() || null;
  const discoverySources = Array.from(
    new Set(
      (input.discoverySources ?? [])
        .map((s) => s.trim())
        .filter((s) => s === "places" || s === "web" || s === "linkedin"),
    ),
  );

  const lead = await prisma.lead.create({
    data: {
      companyName,
      domain,
      placeId: input.placeId?.trim() || null,
      linkedinUrl,
      discoverySources,
      email,
      phone: contactPhone,
      contactEmail: email,
      contactPhone,
      status: "NEW",
      source: "RADAR",
      author,
      workspaceId: session.workspace.id,
      industry: null,
      countryCode,
      tags,
    } as any,
    select: {
      id: true,
    },
  });

  revalidatePath("/crm");
  revalidatePath("/radar");
  revalidatePath("/");
  scheduleCrmSheetsSync(session.workspace.id);

  return { success: true as const, leadId: lead.id };
}

type CreateManualLeadInput = {
  companyName: string;
  domain?: string;
  contactEmail?: string;
  contactPhone?: string;
  value?: number;
};

export async function createManualLead(data: CreateManualLeadInput) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const companyName = data.companyName?.trim();
  if (!companyName) {
    return { error: "Chybí název firmy." };
  }

  const domainRaw = (data.domain ?? "").trim();
  const domain = domainRaw ? toDomain(domainRaw) : "";

  const value =
    typeof data.value === "number" && Number.isFinite(data.value)
      ? Math.max(0, Math.round(data.value))
      : 0;

  const ce = data.contactEmail?.trim() || null;
  const cp = data.contactPhone?.trim() || null;
  const author = authorFromSessionUser(session.user);
  const tags = inferLeadTags({ companyName, domain });
  const lead = await prisma.lead.create({
    data: {
      companyName,
      domain: domain || null,
      placeId: null,
      email: ce,
      phone: cp,
      contactEmail: ce,
      contactPhone: cp,
      value,
      status: "NEW",
      source: "MANUAL",
      author,
      workspaceId: session.workspace.id,
      industry: null,
      tags,
    } as any,
    select: { id: true },
  });

  revalidatePath("/crm");
  revalidatePath("/");
  scheduleCrmSheetsSync(session.workspace.id);

  return { success: true as const, leadId: lead.id };
}

type ImportLeadInput = {
  companyName?: string;
  name?: string;
  url?: string;
  email?: string;
  phone?: string;
  placeId?: string;
  linkedinUrl?: string | null;
  discoverySources?: string[] | null;
  countryCode?: string | null;
  searchQuery?: string | null;
  placeTypes?: string[] | null;
};

export async function importMultipleLeads(leads: ImportLeadInput[]) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return { createdCount: 0, skippedCount: 0, inCrmPlaceIds: [] as string[] };
  }

  const { normalizeCountryCode } = await import("@/lib/country-language");
  const workspaceId = session.workspace.id;
  const author = authorFromSessionUser(session.user);
  const normalized = leads
    .map((lead) => {
      const companyName = (lead.companyName ?? lead.name ?? "").trim();
      const placeId = lead.placeId?.trim() || null;
      const domain = toDomain(lead.url);
      const email = lead.email?.trim() || null;
      const contactPhone = lead.phone?.trim() || null;
      const countryCode = normalizeCountryCode(lead.countryCode);
      const linkedinUrl = lead.linkedinUrl?.trim() || null;
      const discoverySources = Array.from(
        new Set(
          (lead.discoverySources ?? [])
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter(
              (s) => s === "places" || s === "web" || s === "linkedin",
            ),
        ),
      );
      const tags = inferLeadTags({
        companyName,
        domain,
        searchQuery: lead.searchQuery,
        placeTypes: lead.placeTypes,
      });
      return {
        companyName,
        placeId,
        domain,
        email,
        contactPhone,
        countryCode,
        linkedinUrl,
        discoverySources,
        tags,
      };
    })
    .filter((lead) => lead.companyName.length > 0);

  if (normalized.length === 0) {
    return { createdCount: 0, skippedCount: 0, inCrmPlaceIds: [] as string[] };
  }

  const placeIds = Array.from(
    new Set(
      normalized
        .map((lead) => lead.placeId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const domains = Array.from(
    new Set(
      normalized.map((lead) => lead.domain).filter((domain) => Boolean(domain)),
    ),
  );
  const linkedinUrls = Array.from(
    new Set(
      normalized
        .map((lead) => lead.linkedinUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  );

  const existingRaw = await prisma.lead.findMany({
    where: {
      workspaceId,
      OR: [
        ...(placeIds.length > 0 ? [{ placeId: { in: placeIds } }] : []),
        ...(domains.length > 0 ? [{ domain: { in: domains } }] : []),
        ...(linkedinUrls.length > 0
          ? [{ linkedinUrl: { in: linkedinUrls } }]
          : []),
      ],
    } as any,
    select: { placeId: true, domain: true, linkedinUrl: true } as any,
  });
  const existing = existingRaw as unknown as Array<{
    placeId: string | null;
    domain: string;
    linkedinUrl: string | null;
  }>;

  const existingPlaceIds = new Set(
    existing.map((lead) => lead.placeId).filter(Boolean) as string[],
  );
  const existingDomains = new Set(
    existing.map((lead) => lead.domain).filter(Boolean),
  );
  const existingLinkedIn = new Set(
    existing.map((lead) => lead.linkedinUrl).filter(Boolean) as string[],
  );
  const inBatchPlaceIds = new Set<string>();
  const inBatchDomains = new Set<string>();
  const inBatchLinkedIn = new Set<string>();

  const toCreate: Array<{
    companyName: string;
    domain: string;
    placeId: string | null;
    linkedinUrl: string | null;
    discoverySources: string[];
    email: string | null;
    phone: string | null;
    contactPhone: string | null;
    status: "NEW";
    source: "RADAR";
    author: string | null;
    workspaceId: string;
    industry: null;
    contactEmail: string | null;
    countryCode: string | null;
    tags: string[];
  }> = [];
  let skippedCount = 0;

  for (const lead of normalized) {
    const duplicateByPlaceId =
      !!lead.placeId &&
      (existingPlaceIds.has(lead.placeId) || inBatchPlaceIds.has(lead.placeId));
    const duplicateByDomain =
      !!lead.domain &&
      (existingDomains.has(lead.domain) || inBatchDomains.has(lead.domain));
    const duplicateByLinkedIn =
      !!lead.linkedinUrl &&
      (existingLinkedIn.has(lead.linkedinUrl) ||
        inBatchLinkedIn.has(lead.linkedinUrl));

    if (duplicateByPlaceId || duplicateByDomain || duplicateByLinkedIn) {
      skippedCount += 1;
      continue;
    }

    toCreate.push({
      companyName: lead.companyName,
      domain: lead.domain,
      placeId: lead.placeId,
      linkedinUrl: lead.linkedinUrl,
      discoverySources: lead.discoverySources,
      email: lead.email,
      phone: lead.contactPhone,
      contactPhone: lead.contactPhone,
      contactEmail: lead.email,
      status: "NEW",
      source: "RADAR" as const,
      author,
      workspaceId,
      industry: null,
      countryCode: lead.countryCode,
      tags: lead.tags,
    });

    if (lead.placeId) inBatchPlaceIds.add(lead.placeId);
    if (lead.domain) inBatchDomains.add(lead.domain);
    if (lead.linkedinUrl) inBatchLinkedIn.add(lead.linkedinUrl);
  }

  if (toCreate.length > 0) {
    await prisma.lead.createMany({ data: toCreate });
  }

  revalidatePath("/crm");
  revalidatePath("/radar");
  revalidatePath("/");
  if (toCreate.length > 0) {
    scheduleCrmSheetsSync(workspaceId);
  }

  const inCrmPlaceIds = Array.from(
    new Set(
      normalized
        .map((lead) => lead.placeId)
        .filter((id): id is string => Boolean(id))
        .filter((id) => existingPlaceIds.has(id) || inBatchPlaceIds.has(id)),
    ),
  );

  return {
    createdCount: toCreate.length,
    skippedCount,
    inCrmPlaceIds,
  };
}

type LeadStatusInput =
  | "NEW"
  | "CONTACTED"
  | "REPLIED"
  | "MEETING_SET"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "BREAK_UP";

export async function bulkUpdateLeads(
  ids: string[],
  data: Partial<{ status: LeadStatusInput; value: number }>,
) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const uniqueIds = Array.from(new Set((ids ?? []).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { updatedCount: 0 };
  }

  const payload: Record<string, unknown> = {};
  if (data.status) payload.status = data.status;
  if (typeof data.value === "number") payload.value = data.value;

  if (Object.keys(payload).length === 0) {
    return { updatedCount: 0 };
  }

  const before =
    data.status != null
      ? await prisma.lead.findMany({
          where: { workspaceId: session.workspace.id, id: { in: uniqueIds } },
          select: { id: true, status: true, companyName: true },
        })
      : [];

  const result = await prisma.lead.updateMany({
    where: { workspaceId: session.workspace.id, id: { in: uniqueIds } },
    data: payload as any,
  });

  revalidatePath("/crm");
  if (result.count > 0) {
    scheduleCrmSheetsSync(session.workspace.id);
    if (data.status) {
      for (const lead of before) {
        if (lead.status === data.status) continue;
        void dispatchLeadStatusNotification({
          workspaceId: session.workspace.id,
          leadId: lead.id,
          companyName: lead.companyName,
          status: data.status,
        });
      }
    }
  }
  return { updatedCount: result.count };
}

export async function bulkDeleteLeads(ids: string[]) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const uniqueIds = Array.from(new Set((ids ?? []).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { deletedCount: 0 };
  }

  const result = await prisma.lead.deleteMany({
    where: { workspaceId: session.workspace.id, id: { in: uniqueIds } },
  });

  revalidatePath("/crm");
  if (result.count > 0) {
    scheduleCrmSheetsSync(session.workspace.id);
  }
  return { deletedCount: result.count };
}

export async function updateLeadDetails(
  id: string,
  data: {
    company?: string;
    value?: number;
    url?: string;
    email?: string;
    phone?: string;
  },
) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const leadId = id?.trim();
  if (!leadId) {
    return { error: "Chybí ID leadu." };
  }

  const payload: Record<string, unknown> = {};
  if (typeof data.company === "string" && data.company.trim()) {
    payload.companyName = data.company.trim();
  }
  if (typeof data.value === "number" && Number.isFinite(data.value)) {
    payload.value = Math.max(0, Math.round(data.value));
  }
  if (typeof data.url === "string") {
    payload.domain = toDomain(data.url);
  }
  if (typeof data.email === "string") {
    const email = data.email.trim() || null;
    payload.contactEmail = email;
    payload.email = email;
  }
  if (typeof data.phone === "string") {
    const phone = data.phone.trim() || null;
    payload.contactPhone = phone;
    payload.phone = phone;
  }

  if (Object.keys(payload).length === 0) {
    return { error: "Nejsou žádné změny k uložení." };
  }

  const result = await prisma.lead.updateMany({
    where: {
      id: leadId,
      workspaceId: session.workspace.id,
    },
    data: payload as any,
  });

  revalidatePath("/crm");
  revalidatePath("/");
  if (result.count > 0) {
    scheduleCrmSheetsSync(session.workspace.id);
  }
  return { success: true as const, updatedCount: result.count };
}

export async function markLeadWebsiteVisited(id: string) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const leadId = id?.trim();
  if (!leadId) {
    return { error: "Chybí ID leadu." };
  }

  const visitedBy = authorFromSessionUser(session.user);
  const result = await prisma.lead.updateMany({
    where: {
      id: leadId,
      workspaceId: session.workspace.id,
      websiteVisitedAt: null,
    },
    data: {
      websiteVisitedAt: new Date(),
      websiteVisitedBy: visitedBy,
    },
  });

  // Už bylo označené — vrať success, ať UI zůstane zelené.
  if (result.count === 0) {
    const existing = await prisma.lead.findFirst({
      where: { id: leadId, workspaceId: session.workspace.id },
      select: { websiteVisitedAt: true, websiteVisitedBy: true },
    });
    if (!existing) {
      return { error: "Firma v CRM nebyla nalezena." };
    }
    return {
      success: true as const,
      alreadyVisited: true as const,
      websiteVisitedBy: (existing.websiteVisitedBy ?? "").trim(),
    };
  }

  revalidatePath("/crm");
  return {
    success: true as const,
    alreadyVisited: false as const,
    websiteVisitedBy: visitedBy ?? "",
  };
}

export async function updateSingleLeadStatus(
  id: string,
  status: LeadStatusInput,
) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }
  const leadId = id?.trim();
  if (!leadId) {
    return { error: "Chybí ID leadu." };
  }

  const existing = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId: session.workspace.id },
    select: { id: true, status: true, companyName: true },
  });
  if (!existing) {
    return { error: "Firma v CRM nebyla nalezena." };
  }

  const result = await prisma.lead.updateMany({
    where: { id: leadId, workspaceId: session.workspace.id },
    data: { status },
  });

  revalidatePath("/crm");
  if (result.count > 0) {
    scheduleCrmSheetsSync(session.workspace.id);
    if (existing.status !== status) {
      void dispatchLeadStatusNotification({
        workspaceId: session.workspace.id,
        leadId: existing.id,
        companyName: existing.companyName,
        status,
      });
    }
  }
  return { success: true as const, updatedCount: result.count };
}

function hasContactValue(raw: string | null | undefined) {
  const v = (raw ?? "").trim();
  return Boolean(v) && v !== "-";
}

/**
 * Důkladný re-scan jednoho leadu — doplní chybějící e-mail a/nebo telefon z webu.
 */
export async function scrapeLeadContacts(leadId: string) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const id = (leadId ?? "").trim();
  if (!id) {
    return { error: "Chybí ID leadu." };
  }

  const lead = await prisma.lead.findFirst({
    where: { id, workspaceId: session.workspace.id },
    select: {
      id: true,
      domain: true,
      email: true,
      contactEmail: true,
      phone: true,
      contactPhone: true,
    },
  });

  if (!lead) {
    return { error: "Lead nenalezen." };
  }

  const web = (lead.domain ?? "").trim();
  if (!web) {
    return { error: "Lead nemá webovou adresu." };
  }

  try {
    const scraped = await scrapeWebsiteContacts(web, { thorough: true });
    const needEmail =
      !hasContactValue(lead.contactEmail) && !hasContactValue(lead.email);
    const needPhone =
      !hasContactValue(lead.contactPhone) && !hasContactValue(lead.phone);

    const data: {
      email?: string;
      contactEmail?: string;
      phone?: string;
      contactPhone?: string;
    } = {};

    if (needEmail && scraped.email) {
      data.email = scraped.email;
      data.contactEmail = scraped.email;
    }
    if (needPhone && scraped.phone) {
      data.phone = scraped.phone;
      data.contactPhone = scraped.phone;
    }

    if (Object.keys(data).length > 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data,
      });
      revalidatePath("/crm");
      revalidatePath("/");
      scheduleCrmSheetsSync(session.workspace.id);
    }

    return {
      success: true as const,
      emailFound: Boolean(data.email),
      phoneFound: Boolean(data.phone),
      email: data.email ?? null,
      phone: data.phone ?? null,
      pagesChecked: scraped.pagesChecked,
      alreadyComplete: !needEmail && !needPhone,
    };
  } catch {
    return { error: "Nepodařilo se projít web." };
  }
}

/**
 * Deep scrape webů vybraných leadů — doplní chybějící e-mail / telefon.
 * Běží s omezenou paralelitou (4), aby servery webů nepadaly.
 */
export async function bulkScrapeLeadContacts(ids: string[]) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const uniqueIds = Array.from(new Set((ids ?? []).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return {
      scanned: 0,
      updated: 0,
      emailsFound: 0,
      phonesFound: 0,
      skippedNoWeb: 0,
      failed: 0,
    };
  }

  const leads = await prisma.lead.findMany({
    where: { workspaceId: session.workspace.id, id: { in: uniqueIds } },
    select: {
      id: true,
      domain: true,
      email: true,
      contactEmail: true,
      phone: true,
      contactPhone: true,
    },
  });

  let updated = 0;
  let emailsFound = 0;
  let phonesFound = 0;
  let skippedNoWeb = 0;
  let failed = 0;

  await mapPool(leads, 4, async (lead) => {
    const web = (lead.domain ?? "").trim();
    if (!web) {
      skippedNoWeb += 1;
      return;
    }

    try {
      const scraped = await scrapeWebsiteContacts(web, { thorough: true });
      const needEmail =
        !hasContactValue(lead.contactEmail) && !hasContactValue(lead.email);
      const needPhone =
        !hasContactValue(lead.contactPhone) && !hasContactValue(lead.phone);

      const data: {
        email?: string;
        contactEmail?: string;
        phone?: string;
        contactPhone?: string;
      } = {};

      if (needEmail && scraped.email) {
        data.email = scraped.email;
        data.contactEmail = scraped.email;
        emailsFound += 1;
      }
      if (needPhone && scraped.phone) {
        data.phone = scraped.phone;
        data.contactPhone = scraped.phone;
        phonesFound += 1;
      }

      if (Object.keys(data).length === 0) return;

      await prisma.lead.update({
        where: { id: lead.id },
        data,
      });
      updated += 1;
    } catch {
      failed += 1;
    }
  });

  revalidatePath("/crm");
  revalidatePath("/");
  if (updated > 0) {
    scheduleCrmSheetsSync(session.workspace.id);
  }

  return {
    scanned: leads.length,
    updated,
    emailsFound,
    phonesFound,
    skippedNoWeb,
    failed,
  };
}

export type LeadSentEmailRow = {
  id: string;
  subject: string;
  htmlBody: string;
  kind: "INITIAL" | "FOLLOW_UP" | "BREAKUP";
  sentAt: string | null;
  createdAt: string;
};

/** Odeslané e-maily pro lead (nejnovější první) — pro náhled v CRM. */
export async function getLeadSentEmails(
  leadId: string,
): Promise<{ emails: LeadSentEmailRow[] } | { error: string }> {
  try {
    const session = await getSessionUser();
    if (!session.workspace?.id || !session.user?.id) {
      return { error: "Nejste přihlášen." };
    }

    const id = leadId?.trim();
    if (!id) return { error: "Chybí ID leadu." };

    const lead = await prisma.lead.findFirst({
      where: { id, workspaceId: session.workspace.id },
      select: { id: true },
    });
    if (!lead) return { error: "Lead nenalezen." };

    const rows = await prisma.emailQueue.findMany({
      where: {
        leadId: id,
        status: "SENT",
      },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        subject: true,
        htmlBody: true,
        kind: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return {
      emails: rows.map((row) => ({
        id: row.id,
        subject: row.subject,
        htmlBody: row.htmlBody,
        kind: row.kind,
        sentAt: row.sentAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("getLeadSentEmails:", error);
    return { error: "Nepodařilo se načíst odeslané e-maily." };
  }
}
