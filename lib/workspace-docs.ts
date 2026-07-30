import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const WORKSPACE_DOCS_BUCKET = "workspace-docs";

export function createSupabaseAdmin(): SupabaseClient | { error: string } {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  supabaseUrl = supabaseUrl.trim().replace(/\/$/, "");
  supabaseKey = supabaseKey.trim();

  if (!supabaseUrl || !supabaseKey) {
    return { error: "Chybí Supabase klíče v .env souboru." };
  }

  return createClient(supabaseUrl, supabaseKey);
}

export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export function buildDocumentStoragePath(params: {
  workspaceId: string;
  scope: "PERSONAL" | "SHARED";
  ownerUserId: string;
  documentId: string;
  fileName: string;
}): string {
  const safeName = sanitizeFileName(params.fileName);
  if (params.scope === "PERSONAL") {
    return `${params.workspaceId}/personal/${params.ownerUserId}/${params.documentId}-${safeName}`;
  }
  return `${params.workspaceId}/shared/${params.documentId}-${safeName}`;
}
