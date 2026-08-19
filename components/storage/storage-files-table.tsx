"use client";

import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { WorkspaceDocumentRow } from "@/app/actions/storage";
import { cn } from "@/lib/utils";

const FILE_TINT: Record<string, string> = {
  pdf: "#FB7185",
  xlsx: "#34D399",
  xls: "#34D399",
  csv: "#34D399",
  png: "#02A7FF",
  jpg: "#02A7FF",
  jpeg: "#02A7FF",
  webp: "#02A7FF",
  docx: "#7FCDFB",
  doc: "#7FCDFB",
};

function fileExt(doc: WorkspaceDocumentRow): string {
  const fromName = doc.fileName.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;
  if (doc.mimeType === "application/pdf") return "pdf";
  if (doc.mimeType.includes("spreadsheet") || doc.mimeType.includes("excel"))
    return "xlsx";
  if (doc.mimeType.includes("word")) return "docx";
  if (doc.mimeType.startsWith("image/")) return "png";
  return "file";
}

function formatStorageBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} kB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} GB`;
}

function formatStorageDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function usedByLabel(doc: WorkspaceDocumentRow): string {
  if (doc.externalLabel?.includes("Google")) return "Generátor";
  if (doc.externalLabel?.includes("Word") || doc.externalLabel?.includes("OneDrive"))
    return "OneDrive";
  if (doc.externalLabel?.includes("Fakturoid")) return "Fakturace";
  if (doc.kind === "OFFER" || doc.kind === "CONTRACT") return "Generátor";
  if (doc.kind === "INVOICE") return "Fakturace";
  if (doc.mimeType.includes("pdf")) return "Sniper";
  return "—";
}

export function StorageFilesTable({
  documents,
  isLoading,
  busyId,
  emptyTitle,
  emptyDesc,
  colName,
  colSize,
  colAdded,
  colUsedBy,
  onPreview,
  onDownload,
  onDelete,
  onOpenExternal,
}: {
  documents: WorkspaceDocumentRow[];
  isLoading: boolean;
  busyId: string | null;
  emptyTitle: string;
  emptyDesc: string;
  colName: string;
  colSize: string;
  colAdded: string;
  colUsedBy: string;
  onPreview: (doc: WorkspaceDocumentRow) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenExternal: (url: string) => void;
}) {
  return (
    <div className="sk-files">
      <div className="sk-files__head">
        <span className="sk-files__th">{colName}</span>
        <span className="sk-files__th">{colSize}</span>
        <span className="sk-files__th">{colAdded}</span>
        <span className="sk-files__th sk-files__th--right">{colUsedBy}</span>
      </div>
      <div className="sk-files__body">
        {isLoading ? (
          <div className="sk-files__empty">
            <Loader2 className="h-5 w-5 animate-spin text-[color:var(--sk-muted)]" />
          </div>
        ) : documents.length === 0 ? (
          <div className="sk-files__empty">
            <p className="text-sm font-semibold text-[color:var(--n-text-soft)]">
              {emptyTitle}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[color:var(--n-muted)]">
              {emptyDesc}
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const ext = fileExt(doc);
            const tint = FILE_TINT[ext] ?? "#8B919A";
            return (
              <div key={doc.id} className="sk-files__row group">
                <button
                  type="button"
                  className="sk-files__name-btn"
                  onClick={() => {
                    if (doc.previewUrl) onPreview(doc);
                    else if (doc.externalUrl) onOpenExternal(doc.externalUrl);
                    else void onDownload(doc.id);
                  }}
                >
                  <span
                    className="sk-files__ext"
                    style={{
                      background: `${tint}1F`,
                      color: tint,
                    }}
                  >
                    {ext.toUpperCase().slice(0, 4)}
                  </span>
                  <span className="sk-files__name">{doc.name}</span>
                </button>
                <span className="sk-files__cell">{formatStorageBytes(doc.sizeBytes)}</span>
                <span className="sk-files__cell">{formatStorageDate(doc.createdAt)}</span>
                <div className="sk-files__actions">
                  <span className="sk-files__used group-hover:hidden">
                    {usedByLabel(doc)}
                  </span>
                  <div className="hidden items-center justify-end gap-1 group-hover:flex">
                    {doc.previewUrl ? (
                      <button
                        type="button"
                        className="sk-files__icon-btn"
                        onClick={() => onPreview(doc)}
                        aria-label="Náhled"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {doc.externalUrl ? (
                      <button
                        type="button"
                        className="sk-files__icon-btn"
                        onClick={() => onOpenExternal(doc.externalUrl!)}
                        aria-label="Otevřít"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sk-files__icon-btn"
                        disabled={busyId === doc.id}
                        onClick={() => void onDownload(doc.id)}
                        aria-label="Stáhnout"
                      >
                        {busyId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {doc.canDelete ? (
                      <button
                        type="button"
                        className={cn("sk-files__icon-btn", "sk-files__icon-btn--danger")}
                        disabled={busyId === doc.id}
                        onClick={() => void onDelete(doc.id)}
                        aria-label="Smazat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
