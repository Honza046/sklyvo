"use server";

import { revalidatePath } from "next/cache";
import type { DocumentScope } from "@prisma/client";
import { getSessionUser } from "@/app/actions/auth";
import {
  decryptEmailSecret,
  encryptEmailSecret,
} from "@/lib/email-connection-crypto";
import {
  createFakturoidInvoice,
  createFakturoidSubject,
  fetchFakturoidToken,
  fetchFakturoidUser,
  invoicePublicUrl,
  parseAmountToUnitPrice,
  parsePaymentDueDays,
  searchFakturoidSubjects,
} from "@/lib/fakturoid";
import type { OfferDocumentType } from "@/lib/offer-pdf";
import { prisma } from "@/lib/prisma";

export type FakturoidConnectionState = {
  connected: boolean;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  accountSlug: string | null;
  accountName: string | null;
  accountEmail: string | null;
  lastError: string | null;
};

async function requireSession() {
  const session = await getSessionUser();
  if (!session?.user?.id || !session.workspace?.id) return null;
  return session;
}

async function getValidAccessToken(workspaceId: string): Promise<
  | {
      accessToken: string;
      slug: string;
    }
  | { error: string }
> {
  const record = await prisma.workspaceFakturoidConnection.findUnique({
    where: { workspaceId },
  });

  if (
    !record ||
    record.status === "DISCONNECTED" ||
    !record.clientId ||
    !record.clientSecretEnc
  ) {
    return {
      error:
        "Fakturoid není připojen. Propojte ho v Pracovním prostoru → Integrace.",
    };
  }

  if (!record.accountSlug) {
    return {
      error: "Chybí Fakturoid účet (slug). Odpojte a znovu připojte integraci.",
    };
  }

  const secret = decryptEmailSecret(record.clientSecretEnc);
  if (!secret) {
    return {
      error: "Nepodařilo se načíst Fakturoid credentials. Připojte účet znovu.",
    };
  }

  const expiresAt = record.tokenExpiresAt?.getTime() ?? 0;
  const stillValid = record.accessToken && expiresAt > Date.now() + 60_000;

  if (stillValid && record.accessToken) {
    const plain = decryptEmailSecret(record.accessToken) ?? record.accessToken;
    return { accessToken: plain, slug: record.accountSlug };
  }

  try {
    const token = await fetchFakturoidToken(record.clientId, secret);
    const expires = new Date(
      Date.now() + Math.max(60, token.expires_in - 30) * 1000,
    );
    await prisma.workspaceFakturoidConnection.update({
      where: { workspaceId },
      data: {
        accessToken: encryptEmailSecret(token.access_token),
        tokenExpiresAt: expires,
        status: "CONNECTED",
        lastError: null,
      },
    });
    return { accessToken: token.access_token, slug: record.accountSlug };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Obnova tokenu selhala.";
    await prisma.workspaceFakturoidConnection.update({
      where: { workspaceId },
      data: { status: "ERROR", lastError: message },
    });
    return { error: message };
  }
}

export async function getFakturoidConnectionState(): Promise<FakturoidConnectionState> {
  const session = await requireSession();
  if (!session) {
    return {
      connected: false,
      status: "DISCONNECTED",
      accountSlug: null,
      accountName: null,
      accountEmail: null,
      lastError: null,
    };
  }

  const record = await prisma.workspaceFakturoidConnection.findUnique({
    where: { workspaceId: session.workspace.id },
  });

  if (!record || record.status === "DISCONNECTED") {
    return {
      connected: false,
      status: "DISCONNECTED",
      accountSlug: null,
      accountName: null,
      accountEmail: null,
      lastError: record?.lastError ?? null,
    };
  }

  return {
    connected: record.status === "CONNECTED" || record.status === "ERROR",
    status: record.status,
    accountSlug: record.accountSlug,
    accountName: record.accountName,
    accountEmail: record.accountEmail,
    lastError: record.lastError,
  };
}

export async function connectFakturoid(input: {
  clientId: string;
  clientSecret: string;
  accountSlug?: string;
}) {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };

  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  if (!clientId || !clientSecret) {
    return { error: "Vyplňte Client ID i Client Secret z Fakturoidu." };
  }

  try {
    const token = await fetchFakturoidToken(clientId, clientSecret);
    const user = await fetchFakturoidUser(token.access_token);
    const accounts = user.accounts ?? [];
    if (accounts.length === 0) {
      return { error: "Účet nemá žádný Fakturoid účet (slug)." };
    }

    const preferred = input.accountSlug?.trim();
    const account =
      (preferred ? accounts.find((a) => a.slug === preferred) : undefined) ??
      accounts[0];

    if (!account) {
      return {
        error: `Účet „${preferred}“ nebyl nalezen. Dostupné: ${accounts.map((a) => a.slug).join(", ")}.`,
      };
    }

    const expires = new Date(
      Date.now() + Math.max(60, token.expires_in - 30) * 1000,
    );

    await prisma.workspaceFakturoidConnection.upsert({
      where: { workspaceId: session.workspace.id },
      create: {
        workspaceId: session.workspace.id,
        status: "CONNECTED",
        clientId,
        clientSecretEnc: encryptEmailSecret(clientSecret),
        accessToken: encryptEmailSecret(token.access_token),
        tokenExpiresAt: expires,
        accountSlug: account.slug,
        accountName: account.name,
        accountEmail: user.email ?? null,
        connectedAt: new Date(),
        lastError: null,
      },
      update: {
        status: "CONNECTED",
        clientId,
        clientSecretEnc: encryptEmailSecret(clientSecret),
        accessToken: encryptEmailSecret(token.access_token),
        tokenExpiresAt: expires,
        accountSlug: account.slug,
        accountName: account.name,
        accountEmail: user.email ?? null,
        connectedAt: new Date(),
        lastError: null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/generator");
    return {
      ok: true as const,
      accountSlug: account.slug,
      accountName: account.name,
      accounts: accounts.map((a) => ({ slug: a.slug, name: a.name })),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Připojení Fakturoidu selhalo.",
    };
  }
}

export async function disconnectFakturoid() {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };

  await prisma.workspaceFakturoidConnection.upsert({
    where: { workspaceId: session.workspace.id },
    create: {
      workspaceId: session.workspace.id,
      status: "DISCONNECTED",
    },
    update: {
      status: "DISCONNECTED",
      clientId: null,
      clientSecretEnc: null,
      accessToken: null,
      tokenExpiresAt: null,
      accountSlug: null,
      accountName: null,
      accountEmail: null,
      lastError: null,
      connectedAt: null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/generator");
  return { ok: true as const };
}

export async function createFakturoidInvoiceFromOffer(input: {
  type: OfferDocumentType;
  clientName: string;
  clientCompany: string;
  clientEmail?: string;
  clientIco?: string;
  clientDic?: string;
  subject: string;
  description: string;
  amount: string;
  currency: string;
  paymentTerms?: string;
  notes?: string;
  vatRate?: number;
  saveTo?: "PERSONAL" | "SHARED";
}) {
  try {
    const session = await requireSession();
    if (!session) return { error: "Nejste přihlášen." };

    if (!input.subject.trim()) {
      return { error: "Vyplňte předmět / název položky na faktuře." };
    }
    if (!input.clientName.trim() && !input.clientCompany.trim()) {
      return { error: "Vyplňte alespoň jméno nebo firmu klienta." };
    }

    const unitPrice = parseAmountToUnitPrice(input.amount);
    if (!unitPrice) {
      return { error: "Vyplňte platnou částku (např. 15000 nebo 15 000)." };
    }

    const auth = await getValidAccessToken(session.workspace.id);
    if ("error" in auth) return { error: auth.error };

    const companyName = input.clientCompany.trim() || input.clientName.trim();
    const personName = input.clientName.trim();
    const ico = input.clientIco?.trim() || "";
    const dic = input.clientDic?.trim() || "";
    const email = input.clientEmail?.trim() || "";

    let subjectId: number | null = null;

    const searchQuery = ico || companyName;
    try {
      const found = await searchFakturoidSubjects(
        auth.accessToken,
        auth.slug,
        searchQuery,
      );
      const match =
        found.find(
          (s) =>
            (ico &&
              s.registration_no &&
              s.registration_no.replace(/\s/g, "") ===
                ico.replace(/\s/g, "")) ||
            s.name.trim().toLowerCase() === companyName.toLowerCase(),
        ) ?? found[0];
      if (match?.id) subjectId = match.id;
    } catch {
      // search optional — create below
    }

    if (!subjectId) {
      const created = await createFakturoidSubject(
        auth.accessToken,
        auth.slug,
        {
          name: companyName,
          full_name:
            personName && personName !== companyName ? personName : undefined,
          email: email || undefined,
          registration_no: ico || undefined,
          vat_no: dic || undefined,
        },
      );
      subjectId = created.id;
    }

    const due = parsePaymentDueDays(input.paymentTerms ?? "14 dní");
    const vatRate = Number.isFinite(input.vatRate) ? Number(input.vatRate) : 21;
    const lineName = input.subject.trim();
    const lineDesc = input.description.trim();

    const invoice = await createFakturoidInvoice(auth.accessToken, auth.slug, {
      subject_id: subjectId,
      currency: (input.currency || "CZK").trim().toUpperCase(),
      due,
      note:
        [input.notes?.trim(), lineDesc && lineDesc !== lineName ? lineDesc : ""]
          .filter(Boolean)
          .join("\n") || undefined,
      lines: [
        {
          name: lineName,
          quantity: "1",
          unit_price: unitPrice,
          vat_rate: vatRate,
        },
      ],
    });

    const url = invoicePublicUrl(invoice, auth.slug);
    const scope: DocumentScope =
      input.saveTo === "SHARED" ? "SHARED" : "PERSONAL";
    const label = invoice.number
      ? `Faktura ${invoice.number}`
      : `Faktura ${companyName}`;

    await prisma.workspaceDocument.create({
      data: {
        workspaceId: session.workspace.id,
        ownerUserId: session.user.id,
        scope,
        kind: "INVOICE",
        name: label,
        fileName: `${label.replace(/[^\w\-]+/g, "_")}.fakturoid`,
        mimeType: "application/x-fakturoid-invoice",
        sizeBytes: 0,
        storagePath: url || `fakturoid://${auth.slug}/invoices/${invoice.id}`,
        metaJson: JSON.stringify({
          source: "fakturoid",
          fakturoidInvoiceId: invoice.id,
          fakturoidSubjectId: subjectId,
          accountSlug: auth.slug,
          number: invoice.number ?? null,
          htmlUrl: url,
          offerType: input.type,
          clientCompany: companyName,
          clientName: personName,
          amount: unitPrice,
          currency: (input.currency || "CZK").trim().toUpperCase(),
        }),
      },
    });

    revalidatePath("/generator");
    revalidatePath("/uloziste");

    return {
      ok: true as const,
      invoiceId: invoice.id,
      number: invoice.number ?? null,
      url,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Vytvoření faktury ve Fakturoidu selhalo.",
    };
  }
}
