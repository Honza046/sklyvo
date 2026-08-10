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
  createGoogleDocFromOffer,
  downloadDriveFileBytes,
  listWorkspaceDriveFiles,
  listWorkspaceGoogleDocs,
} from "@/lib/google-drive-docs";
import {
  buildGoogleSheetsAuthorizeUrl,
  getGoogleSheetsOAuthConfig,
} from "@/lib/google-sheets-oauth";
import { prisma } from "@/lib/prisma";
import {
  WORKSPACE_DOCS_BUCKET,
  buildDocumentStoragePath,
  createSupabaseAdmin,
  sanitizeFileName,
} from "@/lib/workspace-docs";

export type GoogleDriveConnectionState = {
  connected: boolean;
  accountEmail: string | null;
  oauthConfigured: boolean;
  needsReconnect: boolean;
};

async function requireSession() {
  const session = await getSessionUser();
  if (!session?.user?.id || !session.workspace?.id) return null;
  return session;
}

export async function getGoogleDriveConnectionState(): Promise<GoogleDriveConnectionState> {
  const { clientId, clientSecret } = getGoogleSheetsOAuthConfig();
  const oauthConfigured = Boolean(clientId && clientSecret);
  const session = await requireSession();
  if (!session) {
    return {
      connected: false,
      accountEmail: null,
      oauthConfigured,
      needsReconnect: false,
    };
  }

  const record = await prisma.workspaceGoogleSheetsConnection.findUnique({
    where: { workspaceId: session.workspace.id },
    select: {
      status: true,
      googleAccountEmail: true,
      googleRefreshToken: true,
      googleAccessToken: true,
    },
  });

  const connected =
    record?.status === "CONNECTED" &&
    Boolean(record.googleRefreshToken || record.googleAccessToken);

  return {
    connected,
    accountEmail: record?.googleAccountEmail ?? null,
    oauthConfigured,
    needsReconnect: !connected,
  };
}

export async function getGoogleDriveOAuthUrl(returnPath = "/uloziste") {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };

  const { clientId, clientSecret } = getGoogleSheetsOAuthConfig();
  if (!clientId || !clientSecret) {
    return {
      error:
        "Google OAuth není nakonfigurován. Přidejte GOOGLE_SHEETS_CLIENT_ID a GOOGLE_SHEETS_CLIENT_SECRET.",
    };
  }

  const url = buildGoogleSheetsAuthorizeUrl(
    session.workspace.id,
    process.env.GOOGLE_SHEETS_LOGIN_HINT?.trim() || session.user.email,
    returnPath,
  );
  if (!url) return { error: "Nepodařilo se sestavit Google OAuth URL." };
  return { url };
}

export async function listGoogleDriveFiles(options?: {
  query?: string;
  folderId?: string | null;
}) {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };
  return listWorkspaceDriveFiles(session.workspace.id, options);
}

export async function listLinkedGoogleDocs(query?: string) {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };
  return listWorkspaceGoogleDocs(session.workspace.id, query);
}

/** Propojí existující Google Doc do Úložiště (odkaz oběma směry). */
export async function linkGoogleDocToStorage(input: {
  fileId: string;
  name: string;
  webViewLink?: string | null;
  scope?: "PERSONAL" | "SHARED";
}) {
  try {
    const session = await requireSession();
    if (!session) return { error: "Nejste přihlášen." };

    const docUrl =
      input.webViewLink?.trim() ||
      `https://docs.google.com/document/d/${input.fileId}/edit`;
    const scope: DocumentScope =
      input.scope === "SHARED" ? "SHARED" : "PERSONAL";
    const documentId = crypto.randomUUID();
    const fileName = sanitizeFileName(
      `${input.name || "Google-Doc"}.gdoc.json`,
    );
    const linkBody = Buffer.from(
      JSON.stringify(
        {
          type: "google-doc-link",
          googleDocId: input.fileId,
          googleDocUrl: docUrl,
          name: input.name,
        },
        null,
        2,
      ),
      "utf8",
    );

    const supabase = createSupabaseAdmin();
    if ("error" in supabase) return supabase;

    const storagePath = buildDocumentStoragePath({
      workspaceId: session.workspace.id,
      scope,
      ownerUserId: session.user.id,
      documentId,
      fileName,
    });

    const { error: uploadError } = await supabase.storage
      .from(WORKSPACE_DOCS_BUCKET)
      .upload(storagePath, linkBody, {
        contentType: "application/json",
        upsert: false,
      });
    if (uploadError) {
      return { error: `Uložení odkazu selhalo: ${uploadError.message}` };
    }

    const created = await prisma.workspaceDocument.create({
      data: {
        id: documentId,
        workspaceId: session.workspace.id,
        ownerUserId: session.user.id,
        scope,
        kind: "UPLOAD",
        name: input.name || "Google Doc",
        fileName,
        mimeType: "application/vnd.google-apps.document",
        sizeBytes: linkBody.byteLength,
        storagePath,
        metaJson: JSON.stringify({
          source: "google-docs-link",
          googleDocId: input.fileId,
          googleDocUrl: docUrl,
        }),
      },
    });

    revalidatePath("/uloziste");
    revalidatePath("/generator");
    return { documentId: created.id, name: created.name, docUrl };
  } catch (error) {
    console.error("linkGoogleDocToStorage:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Propojení Google Doc selhalo.",
    };
  }
}

export async function importGoogleDriveFile(input: {
  fileId: string;
  mimeType?: string;
  scope?: "PERSONAL" | "SHARED";
}) {
  try {
    const session = await requireSession();
    if (!session) return { error: "Nejste přihlášen." };

    const downloaded = await downloadDriveFileBytes(
      session.workspace.id,
      input.fileId,
      input.mimeType || "application/octet-stream",
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
        name: downloaded.fileName.replace(/\.pdf$/i, "") || fileName,
        fileName,
        mimeType: downloaded.contentType,
        sizeBytes: downloaded.bytes.byteLength,
        storagePath,
        metaJson: JSON.stringify({
          source: "google-drive",
          driveFileId: input.fileId,
        }),
      },
    });

    revalidatePath("/uloziste");
    return {
      documentId: created.id,
      name: created.name,
    };
  } catch (error) {
    console.error("importGoogleDriveFile:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Import z Google Drive selhal.",
    };
  }
}

export async function generateOfferGoogleDoc(input: {
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

    const doc = await createGoogleDocFromOffer(session.workspace.id, payload);
    if ("error" in doc) return doc;

    const scope: DocumentScope =
      input.saveTo === "SHARED" ? "SHARED" : "PERSONAL";
    let pdfSaved = false;
    let linkedInStorage = false;

    const supabase = createSupabaseAdmin();
    if (!("error" in supabase)) {
      // Vždy založíme záznam v Úložišti s odkazem do Google Docs (obousměrné propojení).
      const documentId = crypto.randomUUID();
      const label = payload.type === "contract" ? "Smlouva" : "Nabidka";
      const fileName = sanitizeFileName(
        `${label}-${payload.clientCompany || payload.clientName || "dokument"}.gdoc.json`,
      );
      const linkBody = Buffer.from(
        JSON.stringify(
          {
            ...payload,
            linkType: "google-doc-link",
            googleDocId: doc.docId,
            googleDocUrl: doc.docUrl,
          },
          null,
          2,
        ),
        "utf8",
      );
      const storagePath = buildDocumentStoragePath({
        workspaceId: session.workspace.id,
        scope,
        ownerUserId: session.user.id,
        documentId,
        fileName,
      });
      const { error: linkUploadError } = await supabase.storage
        .from(WORKSPACE_DOCS_BUCKET)
        .upload(storagePath, linkBody, {
          contentType: "application/json",
          upsert: false,
        });
      if (!linkUploadError) {
        await prisma.workspaceDocument.create({
          data: {
            id: documentId,
            workspaceId: session.workspace.id,
            ownerUserId: session.user.id,
            scope,
            kind: payload.type === "contract" ? "CONTRACT" : "OFFER",
            name: payload.subject,
            fileName,
            mimeType: "application/vnd.google-apps.document",
            sizeBytes: linkBody.byteLength,
            storagePath,
            metaJson: JSON.stringify({
              ...payload,
              googleDocId: doc.docId,
              googleDocUrl: doc.docUrl,
            }),
          },
        });
        linkedInStorage = true;
      }

      if (input.savePdfCopy) {
        const pdfBytes = await buildOfferOrContractPdf(payload);
        const pdfDocumentId = crypto.randomUUID();
        const pdfFileName = sanitizeFileName(
          `${label}-${payload.clientCompany || payload.clientName || "dokument"}.pdf`,
        );
        const pdfPath = buildDocumentStoragePath({
          workspaceId: session.workspace.id,
          scope,
          ownerUserId: session.user.id,
          documentId: pdfDocumentId,
          fileName: pdfFileName,
        });
        const { error: uploadError } = await supabase.storage
          .from(WORKSPACE_DOCS_BUCKET)
          .upload(pdfPath, pdfBytes, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (!uploadError) {
          await prisma.workspaceDocument.create({
            data: {
              id: pdfDocumentId,
              workspaceId: session.workspace.id,
              ownerUserId: session.user.id,
              scope,
              kind: payload.type === "contract" ? "CONTRACT" : "OFFER",
              name: `${payload.subject} (PDF)`,
              fileName: pdfFileName,
              mimeType: "application/pdf",
              sizeBytes: pdfBytes.byteLength,
              storagePath: pdfPath,
              metaJson: JSON.stringify({
                ...payload,
                googleDocUrl: doc.docUrl,
              }),
            },
          });
          pdfSaved = true;
        }
      }
    }

    revalidatePath("/uloziste");
    revalidatePath("/generator");
    return {
      docUrl: doc.docUrl,
      docId: doc.docId,
      pdfSaved,
      linkedInStorage,
    };
  } catch (error) {
    console.error("generateOfferGoogleDoc:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nepodařilo se vytvořit Google Doc.",
    };
  }
}
