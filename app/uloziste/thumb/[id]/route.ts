import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateDocumentThumbnail } from "@/lib/workspace-doc-thumb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isImageDocument(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|avif|heic)$/i.test(fileName);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session?.user?.id || !session.workspace?.id) {
    return NextResponse.json({ error: "Nejste přihlášen." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Chybí ID souboru." }, { status: 400 });
  }

  const doc = await prisma.workspaceDocument.findFirst({
    where: {
      id,
      workspaceId: session.workspace.id,
      OR: [
        { scope: "SHARED" },
        { scope: "PERSONAL", ownerUserId: session.user.id },
      ],
    },
    select: {
      storagePath: true,
      mimeType: true,
      fileName: true,
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Soubor nenalezen." }, { status: 404 });
  }

  if (!isImageDocument(doc.mimeType, doc.fileName)) {
    return NextResponse.json(
      { error: "Náhled není k dispozici." },
      { status: 400 },
    );
  }

  const result = await getOrCreateDocumentThumbnail(doc.storagePath);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
