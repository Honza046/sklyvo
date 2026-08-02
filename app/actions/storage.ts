"use server";

import { revalidatePath } from "next/cache";
import type { DocumentKind, DocumentScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/actions/auth";
import {
  buildOfferOrContractPdf,
  type OfferDocumentType,
  type OfferGeneratorInput,
} from "@/lib/offer-pdf";
import {
  WORKSPACE_DOCS_BUCKET,
  buildDocumentStoragePath,
  buildThumbnailStoragePath,
  createSupabaseAdmin,
  sanitizeFileName,
} from "@/lib/workspace-docs";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export type WorkspaceDocumentRow = {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  scope: DocumentScope;
  kind: DocumentKind;
  ownerUserId: string;
  ownerName: string;
  createdAt: string;
  canDelete: boolean;
  /** Odkaz do Google Docs / OneDrive Word, pokud je dokument propojený. */
  externalUrl: string | null;
  externalLabel: string | null;
  /** URL malého náhledu v seznamu (obrázky) — ne originál. */
  previewUrl: string | null;
};

function imageThumbUrl(documentId: string): string {
  return `/uloziste/thumb/${documentId}`;
}

function isImageDocument(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic)$/i.test(fileName);
}

async function requireSession() {
  const session = await getSessionUser();
  if (!session?.user?.id || !session.workspace?.id) {
    return null;
  }
  return session;
}

function parseExternalLink(metaJson: string | null): {
  externalUrl: string | null;
  externalLabel: string | null;
} {
  if (!metaJson) return { externalUrl: null, externalLabel: null };
  try {
    const meta = JSON.parse(metaJson) as Record<string, unknown>;
    const googleDocUrl =
      typeof meta.googleDocUrl === "string" ? meta.googleDocUrl.trim() : "";
    const wordUrl = typeof meta.wordUrl === "string" ? meta.wordUrl.trim() : "";
    const fakturoidUrl =
      typeof meta.htmlUrl === "string" && meta.source === "fakturoid"
        ? meta.htmlUrl.trim()
        : "";
    if (googleDocUrl) {
      return { externalUrl: googleDocUrl, externalLabel: "Google Docs" };
    }
    if (wordUrl) {
      return { externalUrl: wordUrl, externalLabel: "Word / OneDrive" };
    }
    if (fakturoidUrl) {
      return { externalUrl: fakturoidUrl, externalLabel: "Fakturoid" };
    }
  } catch {
    // ignore
  }
  return { externalUrl: null, externalLabel: null };
}

function mapDocument(
  doc: {
    id: string;
    name: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    scope: DocumentScope;
    kind: DocumentKind;
    ownerUserId: string;
    createdAt: Date;
    metaJson?: string | null;
    owner: { name: string | null; email: string };
  },
  currentUserId: string,
  previewUrl: string | null = null,
): WorkspaceDocumentRow {
  const external = parseExternalLink(doc.metaJson ?? null);
  return {
    id: doc.id,
    name: doc.name,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    scope: doc.scope,
    kind: doc.kind,
    ownerUserId: doc.ownerUserId,
    ownerName: doc.owner.name?.trim() || doc.owner.email,
    createdAt: doc.createdAt.toISOString(),
    canDelete: doc.ownerUserId === currentUserId,
    externalUrl: external.externalUrl,
    externalLabel: external.externalLabel,
    previewUrl,
  };
}

export async function listWorkspaceDocuments(
  scope: DocumentScope,
): Promise<{ documents: WorkspaceDocumentRow[] } | { error: string }> {
  try {
    const session = await requireSession();
    if (!session) return { error: "Nejste přihlášen." };

    const where =
      scope === "PERSONAL"
        ? {
            workspaceId: session.workspace.id,
            scope: "PERSONAL" as const,
            ownerUserId: session.user.id,
          }
        : {
            workspaceId: session.workspace.id,
            scope: "SHARED" as const,
          };

    const rows = await prisma.workspaceDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { name: true, email: true } },
      },
    });

    return {
      documents: rows.map((row) =>
        mapDocument(
          row,
          session.user.id,
          isImageDocument(row.mimeType, row.fileName)
            ? imageThumbUrl(row.id)
            : null,
        ),
      ),
    };
  } catch (error) {
    console.error("listWorkspaceDocuments:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nepodařilo se načíst soubory z úložiště.",
    };
  }
}

export async function uploadWorkspaceDocument(formData: FormData) {
  try {
    const session = await requireSession();
    if (!session) return { error: "Nejste přihlášen." };

    const file = formData.get("file");
    const scopeRaw = String(formData.get("scope") || "PERSONAL");
    const displayName = String(formData.get("name") || "").trim();

    if (!(file instanceof File)) {
      return { error: "Nebyl vybrán soubor." };
    }
    if (file.size <= 0) {
      return { error: "Soubor je prázdný." };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { error: "Soubor je příliš velký (max. 20 MB)." };
    }

    const scope: DocumentScope = scopeRaw === "SHARED" ? "SHARED" : "PERSONAL";
    const supabase = createSupabaseAdmin();
    if ("error" in supabase) return supabase;

    const documentId = crypto.randomUUID();
    const fileName = sanitizeFileName(file.name || "soubor");
    const storagePath = buildDocumentStoragePath({
      workspaceId: session.workspace.id,
      scope,
      ownerUserId: session.user.id,
      documentId,
      fileName,
    });

    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);
    const mimeType = file.type || "application/octet-stream";

    const { error: uploadError } = await supabase.storage
      .from(WORKSPACE_DOCS_BUCKET)
      .upload(storagePath, fileData, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("workspace-docs upload:", uploadError);
      return {
        error: `Upload selhal: ${uploadError.message}. Ověřte, že v Supabase existuje bucket „${WORKSPACE_DOCS_BUCKET}“.`,
      };
    }

    const created = await prisma.workspaceDocument.create({
      data: {
        id: documentId,
        workspaceId: session.workspace.id,
        ownerUserId: session.user.id,
        scope,
        kind: "UPLOAD",
        name: displayName || fileName,
        fileName,
        mimeType,
        sizeBytes: file.size,
        storagePath,
      },
      include: {
        owner: { select: { name: true, email: true } },
      },
    });

    revalidatePath("/uloziste");
    revalidatePath("/generator");

    // Náhled se vygeneruje lazy v /uloziste/thumb (sharp jen v Node route, ne v SSR).
    const previewUrl = isImageDocument(mimeType, fileName)
      ? imageThumbUrl(created.id)
      : null;

    return { document: mapDocument(created, session.user.id, previewUrl) };
  } catch (error) {
    console.error("uploadWorkspaceDocument:", error);
    return {
      error: error instanceof Error ? error.message : "Nepodařilo se nahrát soubor.",
    };
  }
}

export async function getWorkspaceDocumentDownloadUrl(documentId: string) {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };

  const doc = await prisma.workspaceDocument.findFirst({
    where: {
      id: documentId,
      workspaceId: session.workspace.id,
      OR: [
        { scope: "SHARED" },
        { scope: "PERSONAL", ownerUserId: session.user.id },
      ],
    },
  });

  if (!doc) return { error: "Soubor nenalezen." };

  const external = parseExternalLink(doc.metaJson);
  if (external.externalUrl) {
    return {
      url: external.externalUrl,
      fileName: doc.fileName,
      external: true as const,
      externalLabel: external.externalLabel,
    };
  }

  const supabase = createSupabaseAdmin();
  if ("error" in supabase) return supabase;

  const { data, error } = await supabase.storage
    .from(WORKSPACE_DOCS_BUCKET)
    .createSignedUrl(doc.storagePath, 60 * 10);

  if (error || !data?.signedUrl) {
    return { error: error?.message || "Nepodařilo se vytvořit odkaz ke stažení." };
  }

  return { url: data.signedUrl, fileName: doc.fileName, external: false as const };
}

/** Podepsaná URL plného obrázku pro dialog náhledu (ne miniaturu ze seznamu). */
export async function getWorkspaceDocumentFullPreviewUrl(documentId: string) {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };

  const doc = await prisma.workspaceDocument.findFirst({
    where: {
      id: documentId,
      workspaceId: session.workspace.id,
      OR: [
        { scope: "SHARED" },
        { scope: "PERSONAL", ownerUserId: session.user.id },
      ],
    },
  });

  if (!doc) return { error: "Soubor nenalezen." };
  if (!isImageDocument(doc.mimeType, doc.fileName)) {
    return { error: "Náhled není k dispozici." };
  }

  const supabase = createSupabaseAdmin();
  if ("error" in supabase) return supabase;

  const { data, error } = await supabase.storage
    .from(WORKSPACE_DOCS_BUCKET)
    .createSignedUrl(doc.storagePath, 60 * 30);

  if (error || !data?.signedUrl) {
    return { error: error?.message || "Nepodařilo se vytvořit odkaz k náhledu." };
  }

  return { url: data.signedUrl };
}

export async function deleteWorkspaceDocument(documentId: string) {
  const session = await requireSession();
  if (!session) return { error: "Nejste přihlášen." };

  const doc = await prisma.workspaceDocument.findFirst({
    where: {
      id: documentId,
      workspaceId: session.workspace.id,
      ownerUserId: session.user.id,
    },
  });

  if (!doc) {
    return { error: "Soubor nenalezen nebo nemáte oprávnění ke smazání." };
  }

  const supabase = createSupabaseAdmin();
  if ("error" in supabase) return supabase;

  await supabase.storage
    .from(WORKSPACE_DOCS_BUCKET)
    .remove([doc.storagePath, buildThumbnailStoragePath(doc.storagePath)]);
  await prisma.workspaceDocument.delete({ where: { id: doc.id } });

  revalidatePath("/uloziste");
  return { ok: true as const };
}

export async function generateOfferDocument(input: {
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
  saveTo: "PERSONAL" | "SHARED";
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
        session.workspace.companyName?.trim() ||
        session.workspace.name ||
        "",
    };

    const pdfBytes = await buildOfferOrContractPdf(payload);
    const supabase = createSupabaseAdmin();
    if ("error" in supabase) return supabase;

    const scope: DocumentScope = input.saveTo === "SHARED" ? "SHARED" : "PERSONAL";
    const kind: DocumentKind = payload.type === "contract" ? "CONTRACT" : "OFFER";
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

    if (uploadError) {
      console.error("offer pdf upload:", uploadError);
      return {
        error: `Uložení PDF selhalo: ${uploadError.message}. Ověřte bucket „${WORKSPACE_DOCS_BUCKET}“.`,
      };
    }

    const created = await prisma.workspaceDocument.create({
      data: {
        id: documentId,
        workspaceId: session.workspace.id,
        ownerUserId: session.user.id,
        scope,
        kind,
        name: payload.subject,
        fileName,
        mimeType: "application/pdf",
        sizeBytes: pdfBytes.byteLength,
        storagePath,
        metaJson: JSON.stringify(payload),
      },
      include: {
        owner: { select: { name: true, email: true } },
      },
    });

    const signed = await supabase.storage
      .from(WORKSPACE_DOCS_BUCKET)
      .createSignedUrl(storagePath, 60 * 10);

    revalidatePath("/uloziste");
    revalidatePath("/generator");
    return {
      document: mapDocument(created, session.user.id),
      downloadUrl: signed.data?.signedUrl ?? null,
    };
  } catch (error) {
    console.error("generateOfferDocument:", error);
    return {
      error:
        error instanceof Error ? error.message : "Nepodařilo se vygenerovat dokument.",
    };
  }
}
