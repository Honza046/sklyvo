"use server";

import { revalidatePath } from "next/cache";
import type { DocumentScope } from "@prisma/client";
import { getSessionUser } from "@/app/actions/auth";
import {
  buildOfferOrContractPdf,
  type OfferDocumentType,
  type OfferGeneratorInput,
} from "@/lib/offer-pdf";
import {
  createWordDocInOneDrive,
  downloadOneDriveFileBytes,
  exportCrmCsvToOneDrive,
  listOneDriveFiles,
  type OneDriveFileRow,
} from "@/lib/microsoft-graph";
import {
  buildMicrosoftAuthorizeUrl,
  getMicrosoftOAuthConfig,
} from "@/lib/microsoft-oauth";
import { prisma } from "@/lib/prisma";
import {
  WORKSPACE_DOCS_BUCKET,
  buildDocumentStoragePath,
  createSupabaseAdmin,
  sanitizeFileName,
} from "@/lib/workspace-docs";

export type MicrosoftConnectionState = {
  connected: boolean;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  accountEmail: string | null;
  displayName: string | null;
  oauthConfigured: boolean;
  lastError: string | null;
};

async function requireSession() {
  const session = await getSessionUser();
  if (!session?.user?.id || !session.workspace?.id) return null;
  return session;
}

export async function getMicrosoftConnectionState(): Promise<MicrosoftConnectionState> {
  const { clientId, clientSecret } = getMicrosoftOAuthConfig();
  const oauthConfigured = Boolean(clientId && clientSecret);
  const session = await requireSession();
  if (!session) {
    return {
      connected: false,
      status: "DISCONNECTED",
      accountEmail: null,
      displayName: null,
      oauthConfigured,
      lastError: null,
    };
  }

  const record = await prisma.workspaceMicrosoftConnection.findUnique({
    where: { workspaceId: session.workspace.id },
  });

  if (!record || record.status === "DISCONNECTED") {
    return {
      connected: false,
      status: "DISCONNECTED",
      accountEmail: null,
      displayName: null,
      oauthConfigured,
      lastError: record?.lastError ?? null,
    };
  }

  return {
    connected: record.status === "CONNECTED" || record.status === "ERROR",
    status: record.status,
    accountEmail: record.msAccountEmail,
    displayName: record.msDisplayName,
    oauthConfigured,
    lastError: record.lastError,
  };
}

export async function getMicrosoftOAuthUrl(
  returnPath = "/settings#integrations",
) {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };

  const { clientId, clientSecret } = getMicrosoftOAuthConfig();
  if (!clientId || !clientSecret) {
    return {
      error:
        "Microsoft OAuth není nakonfigurován. Přidejte MICROSOFT_CLIENT_ID a MICROSOFT_CLIENT_SECRET.",
    };
  }

  const url = buildMicrosoftAuthorizeUrl(
    session.workspace.id,
    session.user.email,
    returnPath,
  );
  if (!url) return { error: "Nepodařilo se sestavit Microsoft OAuth URL." };
  return { url };
}

export async function disconnectMicrosoft() {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };

  await prisma.workspaceMicrosoftConnection.upsert({
    where: { workspaceId: session.workspace.id },
    create: {
      workspaceId: session.workspace.id,
      status: "DISCONNECTED",
    },
    update: {
      status: "DISCONNECTED",
      msAccessToken: null,
      msRefreshToken: null,
      msTokenExpiresAt: null,
      msAccountEmail: null,
      msDisplayName: null,
      lastError: null,
      connectedAt: null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/uloziste");
  revalidatePath("/generator");
  return { ok: true };
}

export async function listMicrosoftOneDriveFiles(
  query?: string,
): Promise<{ files: OneDriveFileRow[] } | { error: string }> {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };
  return listOneDriveFiles(session.workspace.id, query);
}

export async function importOneDriveFile(input: {
  fileId: string;
  scope?: "PERSONAL" | "SHARED";
}) {
  try {
    const session = await requireSession();
    if (!session) return { error: "Nejste přihlášen." };

    const downloaded = await downloadOneDriveFileBytes(
      session.workspace.id,
      input.fileId,
    );
    if ("error" in downloaded) return downloaded;

    const supabase = createSupabaseAdmin();
    if ("error" in supabase) return supabase;

    const scope: DocumentScope =
      input.scope === "SHARED" ? "SHARED" : "PERSONAL";
    const documentId = crypto.randomUUID();
    const fileName = sanitizeFileName(downloaded.fileName);
    const storagePath = buildDocumentStoragePath({
      workspaceId: session.workspace.id,
      scope,
      ownerUserId: session.user.id,
      documentId,
      fileName,
    });

    const { error: uploadError } = await supabase.storage
      .from(WORKSPACE_DOCS_BUCKET)
      .upload(storagePath, downloaded.bytes, {
        contentType: downloaded.contentType,
        upsert: false,
      });
    if (uploadError) {
      return { error: `Uložení do Úložiště selhalo: ${uploadError.message}` };
    }

    const created = await prisma.workspaceDocument.create({
      data: {
        id: documentId,
        workspaceId: session.workspace.id,
        ownerUserId: session.user.id,
        scope,
        kind: "UPLOAD",
        name: downloaded.fileName,
        fileName,
        mimeType: downloaded.contentType,
        sizeBytes: downloaded.bytes.byteLength,
        storagePath,
        metaJson: JSON.stringify({
          source: "onedrive",
          driveFileId: input.fileId,
        }),
      },
    });

    revalidatePath("/uloziste");
    return { documentId: created.id, name: created.name };
  } catch (error) {
    console.error("importOneDriveFile:", error);
    return {
      error:
        error instanceof Error ? error.message : "Import z OneDrive selhal.",
    };
  }
}

export async function generateOfferWordDoc(input: {
  type: OfferDocumentType;
  clientName: string;
  clientCompany: string;
  subject: string;
  description: string;
  amount: string;
  currency: string;
  validUntil: string;
  paymentTerms?: string;
  notes?: string;
  savePdfCopy?: boolean;
  saveTo?: "PERSONAL" | "SHARED";
}) {
  try {
    const session = await requireSession();
    if (!session) return { error: "Nejste přihlášen." };

    if (!input.subject.trim()) {
      return { error: "Vyplňte předmět nabídky / smlouvy." };
    }
    if (!input.clientName.trim() && !input.clientCompany.trim()) {
      return { error: "Vyplňte alespoň jméno nebo firmu klienta." };
    }

    const payload: OfferGeneratorInput = {
      type: input.type === "contract" ? "contract" : "offer",
      clientName: input.clientName.trim(),
      clientCompany: input.clientCompany.trim(),
      subject: input.subject.trim(),
      description: input.description.trim(),
      amount: input.amount.trim(),
      currency: (input.currency || "CZK").trim(),
      validUntil: input.validUntil.trim(),
      paymentTerms: (input.paymentTerms || "").trim(),
      notes: (input.notes || "").trim(),
      issuerName: session.user.name?.trim() || session.user.email || "",
      issuerCompany:
        session.workspace.companyName?.trim() || session.workspace.name || "",
    };

    const doc = await createWordDocInOneDrive(session.workspace.id, payload);
    if ("error" in doc) return doc;

    let pdfSaved = false;
    if (input.savePdfCopy) {
      const pdfBytes = await buildOfferOrContractPdf(payload);
      const supabase = createSupabaseAdmin();
      if (!("error" in supabase)) {
        const scope: DocumentScope =
          input.saveTo === "SHARED" ? "SHARED" : "PERSONAL";
        const documentId = crypto.randomUUID();
        const label = payload.type === "contract" ? "Smlouva" : "Nabidka";
        const fileName = sanitizeFileName(
          `${label}-${payload.clientCompany || payload.clientName || "dokument"}.pdf`,
        );
        const storagePath = buildDocumentStoragePath({
          workspaceId: session.workspace.id,
          scope,
          ownerUserId: session.user.id,
          documentId,
          fileName,
        });
        const { error: uploadError } = await supabase.storage
          .from(WORKSPACE_DOCS_BUCKET)
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (!uploadError) {
          await prisma.workspaceDocument.create({
            data: {
              id: documentId,
              workspaceId: session.workspace.id,
              ownerUserId: session.user.id,
              scope,
              kind: payload.type === "contract" ? "CONTRACT" : "OFFER",
              name: payload.subject,
              fileName,
              mimeType: "application/pdf",
              sizeBytes: pdfBytes.byteLength,
              storagePath,
              metaJson: JSON.stringify({ ...payload, wordUrl: doc.webUrl }),
            },
          });
          pdfSaved = true;
        }
      }
    }

    revalidatePath("/uloziste");
    revalidatePath("/generator");
    return { webUrl: doc.webUrl, fileId: doc.fileId, pdfSaved };
  } catch (error) {
    console.error("generateOfferWordDoc:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nepodařilo se vytvořit Word dokument.",
    };
  }
}

export async function exportCrmToExcelOneDrive() {
  try {
    const session = await requireSession();
    if (!session) return { error: "Nejste přihlášen." };

    const leads = await prisma.lead.findMany({
      where: { workspaceId: session.workspace.id },
      orderBy: { updatedAt: "desc" },
      take: 2000,
      select: {
        companyName: true,
        email: true,
        contactEmail: true,
        phone: true,
        domain: true,
        status: true,
        author: true,
      },
    });

    const rows = leads.map((lead) => ({
      company: lead.companyName || "",
      email: (lead.contactEmail || lead.email || "").trim(),
      phone: lead.phone || "",
      url: lead.domain || "",
      status: lead.status || "",
      author: lead.author || "",
    }));

    const result = await exportCrmCsvToOneDrive(session.workspace.id, rows);
    if ("error" in result) return result;

    revalidatePath("/settings");
    revalidatePath("/crm");
    return result;
  } catch (error) {
    console.error("exportCrmToExcelOneDrive:", error);
    return {
      error:
        error instanceof Error ? error.message : "Export do Excelu selhal.",
    };
  }
}
