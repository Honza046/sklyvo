"use server";

import { getSessionUser } from "@/app/actions/auth";
import { scheduleCrmSheetsSync } from "@/lib/google-sheets-sync";
import { buildLeadFaviconUrl } from "@/lib/lead-favicon";
import { mapPool, scrapeWebsiteContacts } from "@/lib/website-contacts";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  lastContactedAt: string | null;
  nextOutreachAt: string | null;
  nextOutreachKind: "INITIAL" | "FOLLOW_UP" | "BREAKUP" | null;
  outreachDue: boolean;
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
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen.", leads: [] as CrmLead[] };
  }

  const leadsRaw = await prisma.lead.findMany({
    where: { workspaceId: session.workspace.id },
    orderBy: { createdAt: "desc" },
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
      createdAt: true,
      value: true,
      lastContactedAt: true,
      nextOutreachAt: true,
      nextOutreachKind: true,
    },
  });

  const now = Date.now();
  const leads: CrmLead[] = leadsRaw.map((lead) => {
    const nextAt = lead.nextOutreachAt?.getTime() ?? null;
    const outreachDue = Boolean(
      nextAt != null &&
        nextAt <= now &&
        (lead.nextOutreachKind === "FOLLOW_UP" || lead.nextOutreachKind === "BREAKUP"),
    );
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
      lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
      nextOutreachAt: lead.nextOutreachAt?.toISOString() ?? null,
      nextOutreachKind: lead.nextOutreachKind,
      outreachDue,
    };
  });

  return { leads };
}

type AddLeadFromRadarInput = {
  companyName: string;
  url?: string;
  email?: string;
  phone?: string;
  address?: string;
  placeId?: string;
  countryCode?: string | null;
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
  const lead = await prisma.lead.create({
    data: {
      companyName,
      domain,
      placeId: input.placeId?.trim() || null,
      email,
      phone: contactPhone,
      contactEmail: email,
      contactPhone,
      status: "NEW",
      source: "RADAR",
      workspaceId: session.workspace.id,
      industry: null,
      countryCode,
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
      workspaceId: session.workspace.id,
      industry: null,
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
  countryCode?: string | null;
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
  const normalized = leads
    .map((lead) => {
      const companyName = (lead.companyName ?? lead.name ?? "").trim();
      const placeId = lead.placeId?.trim() || null;
      const domain = toDomain(lead.url);
      const email = lead.email?.trim() || null;
      const contactPhone = lead.phone?.trim() || null;
      const countryCode = normalizeCountryCode(lead.countryCode);
      return { companyName, placeId, domain, email, contactPhone, countryCode };
    })
    .filter((lead) => lead.companyName.length > 0);

  if (normalized.length === 0) {
    return { createdCount: 0, skippedCount: 0, inCrmPlaceIds: [] as string[] };
  }

  const placeIds = Array.from(
    new Set(normalized.map((lead) => lead.placeId).filter((id): id is string => Boolean(id))),
  );
  const domains = Array.from(
    new Set(normalized.map((lead) => lead.domain).filter((domain) => Boolean(domain))),
  );

  const existingRaw = await prisma.lead.findMany({
    where: {
      workspaceId,
      OR: [
        ...(placeIds.length > 0 ? [{ placeId: { in: placeIds } }] : []),
        ...(domains.length > 0 ? [{ domain: { in: domains } }] : []),
      ],
    } as any,
    select: { placeId: true, domain: true } as any,
  });
  const existing = existingRaw as unknown as Array<{ placeId: string | null; domain: string }>;

  const existingPlaceIds = new Set(existing.map((lead) => lead.placeId).filter(Boolean) as string[]);
  const existingDomains = new Set(existing.map((lead) => lead.domain).filter(Boolean));
  const inBatchPlaceIds = new Set<string>();
  const inBatchDomains = new Set<string>();

  const toCreate: Array<{
    companyName: string;
    domain: string;
    placeId: string | null;
    email: string | null;
    phone: string | null;
    contactPhone: string | null;
    status: "NEW";
    source: "RADAR";
    workspaceId: string;
    industry: null;
    contactEmail: string | null;
    countryCode: string | null;
  }> = [];
  let skippedCount = 0;

  for (const lead of normalized) {
    const duplicateByPlaceId =
      !!lead.placeId && (existingPlaceIds.has(lead.placeId) || inBatchPlaceIds.has(lead.placeId));
    const duplicateByDomain =
      !!lead.domain && (existingDomains.has(lead.domain) || inBatchDomains.has(lead.domain));

    if (duplicateByPlaceId || duplicateByDomain) {
      skippedCount += 1;
      continue;
    }

    toCreate.push({
      companyName: lead.companyName,
      domain: lead.domain,
      placeId: lead.placeId,
      email: lead.email,
      phone: lead.contactPhone,
      contactPhone: lead.contactPhone,
      contactEmail: lead.email,
      status: "NEW",
      source: "RADAR" as const,
      workspaceId,
      industry: null,
      countryCode: lead.countryCode,
    });

    if (lead.placeId) inBatchPlaceIds.add(lead.placeId);
    if (lead.domain) inBatchDomains.add(lead.domain);
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

  const result = await prisma.lead.updateMany({
    where: { workspaceId: session.workspace.id, id: { in: uniqueIds } },
    data: payload as any,
  });

  revalidatePath("/crm");
  if (result.count > 0) {
    scheduleCrmSheetsSync(session.workspace.id);
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
  data: { company?: string; value?: number; url?: string; email?: string; phone?: string },
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

export async function updateSingleLeadStatus(id: string, status: LeadStatusInput) {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }
  const leadId = id?.trim();
  if (!leadId) {
    return { error: "Chybí ID leadu." };
  }

  const result = await prisma.lead.updateMany({
    where: { id: leadId, workspaceId: session.workspace.id },
    data: { status } as any,
  });

  revalidatePath("/crm");
  if (result.count > 0) {
    scheduleCrmSheetsSync(session.workspace.id);
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
