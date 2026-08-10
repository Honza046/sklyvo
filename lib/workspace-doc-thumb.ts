import {
 WORKSPACE_DOCS_BUCKET,
 buildThumbnailStoragePath,
 createSupabaseAdmin,
} from "@/lib/workspace-docs";

const THUMB_SIZE = 160;

async function loadSharp() {
 const mod = await import("sharp");
 return mod.default;
}

export async function createImageThumbnailWebp(input: Buffer): Promise<Buffer> {
 const sharp = await loadSharp();
 return sharp(input)
 .rotate()
 .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: "centre" })
 .webp({ quality: 72 })
 .toBuffer();
}

/** Nahraje / obnoví thumbnail vedle originálu v bucketu. */
export async function uploadDocumentThumbnail(
 storagePath: string,
 imageBytes: Buffer,
): Promise<boolean> {
 const supabase = createSupabaseAdmin();
 if ("error" in supabase) return false;

 try {
 const thumb = await createImageThumbnailWebp(imageBytes);
 const thumbPath = buildThumbnailStoragePath(storagePath);
 const { error } = await supabase.storage
 .from(WORKSPACE_DOCS_BUCKET)
 .upload(thumbPath, thumb, {
 contentType: "image/webp",
 upsert: true,
 cacheControl: "86400",
 });
 return !error;
 } catch (error) {
 console.error("uploadDocumentThumbnail:", error);
 return false;
 }
}

/**
 * Vrátí thumbnail bytes — z cache v Storage, nebo vygeneruje z originálu.
 */
export async function getOrCreateDocumentThumbnail(storagePath: string): Promise<{
 bytes: Buffer;
 contentType: string;
} | { error: string }> {
 const supabase = createSupabaseAdmin();
 if ("error" in supabase) return supabase;

 const thumbPath = buildThumbnailStoragePath(storagePath);

 const existing = await supabase.storage.from(WORKSPACE_DOCS_BUCKET).download(thumbPath);
 if (existing.data && !existing.error) {
 const bytes = Buffer.from(await existing.data.arrayBuffer());
 if (bytes.length > 0) {
 return { bytes, contentType: "image/webp" };
 }
 }

 const original = await supabase.storage.from(WORKSPACE_DOCS_BUCKET).download(storagePath);
 if (original.error || !original.data) {
 return { error: original.error?.message || "Soubor náhledu nenalezen." };
 }

 const originalBytes = Buffer.from(await original.data.arrayBuffer());
 try {
 const thumb = await createImageThumbnailWebp(originalBytes);
 void supabase.storage.from(WORKSPACE_DOCS_BUCKET).upload(thumbPath, thumb, {
 contentType: "image/webp",
 upsert: true,
 cacheControl: "86400",
 });
 return { bytes: thumb, contentType: "image/webp" };
 } catch (error) {
 console.error("getOrCreateDocumentThumbnail:", error);
 return { error: "Nepodařilo se vytvořit náhled." };
 }
}
