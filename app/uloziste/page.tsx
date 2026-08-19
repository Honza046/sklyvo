"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Presentation,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import {
  deleteWorkspaceDocument,
  getStorageOverviewStats,
  getWorkspaceDocumentDownloadUrl,
  getWorkspaceDocumentFullPreviewUrl,
  listWorkspaceDocuments,
  uploadWorkspaceDocument,
  type StorageOverviewStats,
  type WorkspaceDocumentRow,
} from "@/app/actions/storage";
import {
  getGoogleDriveConnectionState,
  getGoogleDriveOAuthUrl,
  importGoogleDriveFile,
  listGoogleDriveFiles,
} from "@/app/actions/google-drive";
import type { GoogleDriveFileRow } from "@/lib/google-drive-docs";
import {
  getMicrosoftConnectionState,
  getMicrosoftOAuthUrl,
  importOneDriveFile,
  listMicrosoftOneDriveFiles,
} from "@/app/actions/microsoft";
import type { OneDriveFileRow } from "@/lib/microsoft-graph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { StorageFilesTable } from "@/components/storage/storage-files-table";

type StorageTab = "personal" | "shared";
type DriveTypeFilter = "all" | "folder" | "doc" | "sheet" | "pdf" | "other";

type DriveKind = {
  id: DriveTypeFilter | "image" | "slides";
  label: string;
  shortLabel: string;
  filterGroup: DriveTypeFilter;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getDriveFileKind(file: GoogleDriveFileRow): DriveKind {
  const mime = file.mimeType;
  if (file.isFolder || mime === "application/vnd.google-apps.folder") {
    return {
      id: "folder",
      label: "Složka",
      shortLabel: "Složka",
      filterGroup: "folder",
    };
  }
  if (
    mime === "application/vnd.google-apps.spreadsheet" ||
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv" ||
    /\.(xlsx?|csv)$/i.test(file.name)
  ) {
    return {
      id: "sheet",
      label: "Tabulka",
      shortLabel: "Tabulka",
      filterGroup: "sheet",
    };
  }
  if (
    mime === "application/vnd.google-apps.document" ||
    mime.includes("wordprocessingml") ||
    mime === "application/msword" ||
    mime === "application/rtf" ||
    mime.startsWith("text/") ||
    /\.(docx?|rtf|txt|md)$/i.test(file.name)
  ) {
    return {
      id: "doc",
      label: file.isGoogleDoc ? "Dokument → PDF" : "Dokument",
      shortLabel: "Dokument",
      filterGroup: "doc",
    };
  }
  if (
    mime === "application/vnd.google-apps.presentation" ||
    mime.includes("presentation") ||
    /\.(pptx?|key)$/i.test(file.name)
  ) {
    return {
      id: "slides",
      label: "Prezentace",
      shortLabel: "Prezentace",
      filterGroup: "other",
    };
  }
  if (mime === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return { id: "pdf", label: "PDF", shortLabel: "PDF", filterGroup: "pdf" };
  }
  if (mime.startsWith("image/")) {
    return {
      id: "image",
      label: "Obrázek",
      shortLabel: "Obrázek",
      filterGroup: "other",
    };
  }
  return {
    id: "other",
    label: "Soubor",
    shortLabel: "Soubor",
    filterGroup: "other",
  };
}

function DriveFileIcon({ kind }: { kind: DriveKind }) {
  const className = "h-4 w-4";
  if (kind.id === "folder")
    return <Folder className={cn(className, "text-amber-600")} />;
  if (kind.id === "sheet")
    return <FileSpreadsheet className={cn(className, "text-emerald-600")} />;
  if (kind.id === "doc")
    return <FileText className={cn(className, "text-blue-600")} />;
  if (kind.id === "slides")
    return <Presentation className={cn(className, "text-orange-500")} />;
  if (kind.id === "pdf")
    return <FileText className={cn(className, "text-rose-600")} />;
  if (kind.id === "image")
    return <ImageIcon className={cn(className, "text-sky-600")} />;
  return <File className={cn(className, "text-muted-foreground")} />;
}

const DRIVE_FILTERS: { id: DriveTypeFilter; label: string }[] = [
  { id: "all", label: "Vše" },
  { id: "folder", label: "Složky" },
  { id: "doc", label: "Dokumenty" },
  { id: "sheet", label: "Tabulky" },
  { id: "pdf", label: "PDF" },
  { id: "other", label: "Ostatní" },
];

export default function StoragePage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<StorageTab>("personal");
  const [documents, setDocuments] = useState<WorkspaceDocumentRow[]>([]);
  const [stats, setStats] = useState<StorageOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [driveOpen, setDriveOpen] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveOauthConfigured, setDriveOauthConfigured] = useState(true);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFileRow[]>([]);
  const [driveQuery, setDriveQuery] = useState("");
  const [driveTypeFilter, setDriveTypeFilter] =
    useState<DriveTypeFilter>("all");
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [drivePath, setDrivePath] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [importingId, setImportingId] = useState<string | null>(null);

  const [oneDriveOpen, setOneDriveOpen] = useState(false);
  const [oneDriveConnected, setOneDriveConnected] = useState(false);
  const [oneDriveEmail, setOneDriveEmail] = useState<string | null>(null);
  const [oneDriveOauthConfigured, setOneDriveOauthConfigured] = useState(true);
  const [oneDriveLoading, setOneDriveLoading] = useState(false);
  const [oneDriveConnecting, setOneDriveConnecting] = useState(false);
  const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveFileRow[]>([]);
  const [oneDriveQuery, setOneDriveQuery] = useState("");
  const [oneDriveImportingId, setOneDriveImportingId] = useState<string | null>(
    null,
  );

  const [previewDoc, setPreviewDoc] = useState<WorkspaceDocumentRow | null>(
    null,
  );
  const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);
  const [fullPreviewLoading, setFullPreviewLoading] = useState(false);

  const loadDocuments = useCallback(async (scope: "PERSONAL" | "SHARED") => {
    setIsLoading(true);
    try {
      const [result, statsResult] = await Promise.all([
        listWorkspaceDocuments(scope),
        getStorageOverviewStats(scope),
      ]);
      if ("error" in result) {
        toast.error(result.error);
        setDocuments([]);
      } else {
        setDocuments(result.documents);
      }
      if (!("error" in statsResult)) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error("loadDocuments:", error);
      toast.error("Nepodařilo se načíst soubory.");
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshDriveConnection = useCallback(async () => {
    const state = await getGoogleDriveConnectionState();
    setDriveConnected(state.connected);
    setDriveEmail(state.accountEmail);
    setDriveOauthConfigured(state.oauthConfigured);
  }, []);

  const refreshOneDriveConnection = useCallback(async () => {
    const state = await getMicrosoftConnectionState();
    setOneDriveConnected(state.connected);
    setOneDriveEmail(state.accountEmail);
    setOneDriveOauthConfigured(state.oauthConfigured);
  }, []);

  useEffect(() => {
    void loadDocuments(tab === "personal" ? "PERSONAL" : "SHARED");
  }, [tab, loadDocuments]);

  useEffect(() => {
    void refreshDriveConnection();
    void refreshOneDriveConnection();
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleConnected") === "1") {
      toast.success("Google účet připojen.");
      params.delete("googleConnected");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    if (params.get("msConnected") === "1") {
      toast.success("Microsoft 365 připojeno.");
      params.delete("msConnected");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    const err = params.get("sheetsError");
    if (err) {
      toast.error(decodeURIComponent(err));
      params.delete("sheetsError");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    const msError = params.get("msError");
    if (msError) {
      toast.error(decodeURIComponent(msError));
      params.delete("msError");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [refreshDriveConnection, refreshOneDriveConnection]);

  useEffect(() => {
    if (!previewDoc?.previewUrl) {
      setFullPreviewUrl(null);
      setFullPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setFullPreviewLoading(true);
    setFullPreviewUrl(null);

    void getWorkspaceDocumentFullPreviewUrl(previewDoc.id).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        toast.error(result.error);
        setFullPreviewUrl(null);
      } else {
        setFullPreviewUrl(result.url);
      }
      setFullPreviewLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [previewDoc?.id, previewDoc?.previewUrl]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("scope", tab === "shared" ? "SHARED" : "PERSONAL");
      formData.set("name", file.name);
      const result = await uploadWorkspaceDocument(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDocuments((prev) => [result.document, ...prev]);
      toast.success("Soubor nahrán.");
      await loadDocuments(tab === "personal" ? "PERSONAL" : "SHARED");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (id: string) => {
    setBusyId(id);
    try {
      const result = await getWorkspaceDocumentDownloadUrl(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const result = await deleteWorkspaceDocument(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success("Soubor smazán.");
      await loadDocuments(tab === "personal" ? "PERSONAL" : "SHARED");
    } finally {
      setBusyId(null);
    }
  };

  const connectGoogleDrive = async () => {
    setDriveConnecting(true);
    try {
      const result = await getGoogleDriveOAuthUrl("/uloziste");
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.url;
    } finally {
      setDriveConnecting(false);
    }
  };

  const loadDriveFiles = useCallback(
    async (opts?: { query?: string; folderId?: string | null }) => {
      if (!driveConnected) return;
      setDriveLoading(true);
      try {
        const result = await listGoogleDriveFiles({
          query: opts?.query,
          folderId: opts?.folderId ?? null,
        });
        if ("error" in result) {
          toast.error(result.error);
          setDriveFiles([]);
          return;
        }
        setDriveFiles(result.files);
      } finally {
        setDriveLoading(false);
      }
    },
    [driveConnected],
  );

  const openDrivePicker = async () => {
    setDriveOpen(true);
    setDriveQuery("");
    setDriveTypeFilter("all");
    setDriveFolderId(null);
    setDrivePath([]);
    if (!driveConnected) return;
    await loadDriveFiles({ folderId: null });
  };

  const searchDrive = async () => {
    const q = driveQuery.trim();
    if (q) {
      await loadDriveFiles({ query: q });
    } else {
      await loadDriveFiles({ folderId: driveFolderId });
    }
  };

  const openDriveFolder = async (folder: GoogleDriveFileRow) => {
    if (!folder.isFolder) return;
    setDriveQuery("");
    setDriveFolderId(folder.id);
    setDrivePath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    await loadDriveFiles({ folderId: folder.id });
  };

  const goDrivePath = async (index: number) => {
    setDriveQuery("");
    if (index < 0) {
      setDriveFolderId(null);
      setDrivePath([]);
      await loadDriveFiles({ folderId: null });
      return;
    }
    const next = drivePath.slice(0, index + 1);
    const folder = next[next.length - 1];
    setDrivePath(next);
    setDriveFolderId(folder?.id ?? null);
    await loadDriveFiles({ folderId: folder?.id ?? null });
  };

  const filteredDriveFiles = useMemo(() => {
    if (driveTypeFilter === "all") return driveFiles;
    return driveFiles.filter(
      (file) => getDriveFileKind(file).filterGroup === driveTypeFilter,
    );
  }, [driveFiles, driveTypeFilter]);

  const importFromDrive = async (file: GoogleDriveFileRow) => {
    if (file.isFolder) {
      await openDriveFolder(file);
      return;
    }
    setImportingId(file.id);
    try {
      const result = await importGoogleDriveFile({
        fileId: file.id,
        mimeType: file.mimeType,
        scope: tab === "shared" ? "SHARED" : "PERSONAL",
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Importováno: ${result.name}`);
      setDriveOpen(false);
      await loadDocuments(tab === "personal" ? "PERSONAL" : "SHARED");
    } finally {
      setImportingId(null);
    }
  };

  const connectOneDrive = async () => {
    setOneDriveConnecting(true);
    try {
      const result = await getMicrosoftOAuthUrl("/uloziste");
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.url;
    } finally {
      setOneDriveConnecting(false);
    }
  };

  const openOneDrivePicker = async () => {
    setOneDriveOpen(true);
    if (!oneDriveConnected) return;
    setOneDriveLoading(true);
    try {
      const result = await listMicrosoftOneDriveFiles(oneDriveQuery);
      if ("error" in result) {
        toast.error(result.error);
        setOneDriveFiles([]);
        return;
      }
      setOneDriveFiles(result.files.filter((f) => !f.isFolder));
    } finally {
      setOneDriveLoading(false);
    }
  };

  const searchOneDrive = async () => {
    if (!oneDriveConnected) return;
    setOneDriveLoading(true);
    try {
      const result = await listMicrosoftOneDriveFiles(oneDriveQuery);
      if ("error" in result) {
        toast.error(result.error);
        setOneDriveFiles([]);
        return;
      }
      setOneDriveFiles(result.files.filter((f) => !f.isFolder));
    } finally {
      setOneDriveLoading(false);
    }
  };

  const importFromOneDrive = async (file: OneDriveFileRow) => {
    setOneDriveImportingId(file.id);
    try {
      const result = await importOneDriveFile({
        fileId: file.id,
        scope: tab === "shared" ? "SHARED" : "PERSONAL",
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Importováno: ${result.name}`);
      setOneDriveOpen(false);
      await loadDocuments(tab === "personal" ? "PERSONAL" : "SHARED");
    } finally {
      setOneDriveImportingId(null);
    }
  };

  const quotaPct = stats
    ? Math.min(
        100,
        Math.round((stats.workspaceBytes / Math.max(1, stats.quotaBytes)) * 100),
      )
    : 0;

  const quotaLabel = stats
    ? stats.quotaBytes >= 1024 * 1024 * 1024
      ? `${(stats.quotaBytes / (1024 * 1024 * 1024)).toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} GB`
      : `${(stats.quotaBytes / (1024 * 1024)).toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} MB`
    : "—";

  const scopeBytesLabel = stats
    ? stats.scopeBytes >= 1024 * 1024 * 1024
      ? `${(stats.scopeBytes / (1024 * 1024 * 1024)).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} GB`
      : stats.scopeBytes >= 1024 * 1024
        ? `${(stats.scopeBytes / (1024 * 1024)).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} MB`
        : `${(stats.scopeBytes / 1024).toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} kB`
    : "0 kB";

  return (
    <div className="sk-storage-page">
      <div className="sk-page-head shrink-0">
        <h1 className="sk-page-head__title">{t("storage.title")}</h1>
        <p className="sk-page-head__sub">{t("storage.subtitle")}</p>
      </div>

      <div className="sk-storebar">
        <div className="sk-storetabs">
          {(
            [
              { id: "personal" as const, label: t("storage.tabPersonal") },
              { id: "shared" as const, label: t("storage.tabShared") },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              data-active={tab === id || undefined}
              className="sk-storetabs__btn"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="sk-storeactions">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="sk-storebtn"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <Upload className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {t("storage.upload")}
          </button>
          <button
            type="button"
            disabled={driveConnecting}
            onClick={() =>
              void (driveConnected ? openDrivePicker() : connectGoogleDrive())
            }
            className={cn("sk-storebtn", !driveConnected && "sk-storebtn--muted")}
          >
            {driveConnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : null}
            {t("storage.connectDrive")}
          </button>
          <button
            type="button"
            disabled={oneDriveConnecting}
            onClick={() =>
              void (oneDriveConnected ? openOneDrivePicker() : connectOneDrive())
            }
            className={cn(
              "sk-storebtn",
              !oneDriveConnected && "sk-storebtn--muted",
            )}
          >
            {oneDriveConnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : null}
            {t("storage.connectOneDrive")}
          </button>
        </div>
      </div>

      <div className="sk-storestats">
        <div className="sk-storestats__cell">
          <span className="sk-storestats__label">{t("storage.statFiles")}</span>
          <span className="sk-storestats__value">
            {stats?.scopeFileCount ?? documents.length}
          </span>
        </div>
        <div className="sk-storestats__cell">
          <span className="sk-storestats__label">{t("storage.statSize")}</span>
          <span className="sk-storestats__value">{scopeBytesLabel}</span>
        </div>
        <div className="sk-storestats__cell">
          <span className="sk-storestats__label">{t("storage.statShared")}</span>
          <span className="sk-storestats__value">{stats?.sharedFileCount ?? 0}</span>
        </div>
        <div className="sk-storestats__quota">
          <div className="sk-storestats__bar">
            <span
              className="sk-storestats__bar-fill"
              style={{ width: `${quotaPct}%` }}
            />
          </div>
          <div className="sk-storestats__quota-text">
            {t("storage.statQuota", {
              pct: quotaPct,
              quota: quotaLabel,
              plan: stats?.planLabel ?? "Free",
            })}
          </div>
        </div>
      </div>

      <StorageFilesTable
        documents={documents}
        isLoading={isLoading}
        busyId={busyId}
        emptyTitle={t("storage.emptyTitle")}
        emptyDesc={t("storage.emptyDesc")}
        colName={t("storage.colName")}
        colSize={t("storage.colSize")}
        colAdded={t("storage.colAdded")}
        colUsedBy={t("storage.colUsedBy")}
        onPreview={setPreviewDoc}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onOpenExternal={(url) =>
          window.open(url, "_blank", "noopener,noreferrer")
        }
      />

      <Dialog
        open={Boolean(previewDoc)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDoc(null);
            setFullPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">
              {previewDoc?.name || "Náhled"}
            </DialogTitle>
            <DialogDescription>
              {previewDoc
                ? `${formatBytes(previewDoc.sizeBytes)} · ${formatDate(previewDoc.createdAt)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {previewDoc?.previewUrl ? (
            <div className="flex max-h-[70vh] min-h-[200px] items-center justify-center overflow-auto rounded-xl bg-muted/30 p-2">
              {fullPreviewLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : fullPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fullPreviewUrl}
                  alt={previewDoc.name}
                  className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Náhled se nepodařilo načíst.
                </p>
              )}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewDoc(null)}
            >
              Zavřít
            </Button>
            {previewDoc ? (
              <Button
                type="button"
                onClick={() => void handleDownload(previewDoc.id)}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Stáhnout
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={driveOpen} onOpenChange={setDriveOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="text-lg">Import z Google Drive</DialogTitle>
            <DialogDescription>
              {driveConnected
                ? `Připojeno jako ${driveEmail || "Google účet"}. Otevřete složku nebo importujte soubor do Úložiště.`
                : "Nejdřív připojte Google účet s přístupem k Drive."}
            </DialogDescription>
          </DialogHeader>

          {!driveConnected ? (
            <div className="px-5 py-6 sm:px-6">
              <Button
                type="button"
                disabled={driveConnecting || !driveOauthConfigured}
                onClick={() => void connectGoogleDrive()}
                className="w-full"
              >
                {driveConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <HardDrive className="mr-2 h-4 w-4" />
                )}
                Připojit Google Drive
              </Button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={driveQuery}
                    onChange={(e) => setDriveQuery(e.target.value)}
                    placeholder="Hledat podle názvu…"
                    className="h-10 pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void searchDrive();
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={driveLoading}
                  onClick={() => void searchDrive()}
                  className="h-10 shrink-0"
                >
                  Hledat
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {DRIVE_FILTERS.map((filter) => {
                  const active = driveTypeFilter === filter.id;
                  const count =
                    filter.id === "all"
                      ? driveFiles.length
                      : driveFiles.filter(
                          (f) => getDriveFileKind(f).filterGroup === filter.id,
                        ).length;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setDriveTypeFilter(filter.id)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-[color:var(--sk-brand)] bg-[color-mix(in_oklab,var(--sk-brand)_16%,var(--n-field))] text-[color:var(--sk-brand)] "
                          : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {filter.label}
                      <span className="ml-1 tabular-nums opacity-70">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-foreground hover:bg-muted"
                  onClick={() => void goDrivePath(-1)}
                >
                  <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                  Můj Drive
                </button>
                {drivePath.map((crumb, index) => (
                  <span
                    key={crumb.id}
                    className="inline-flex items-center gap-1"
                  >
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                    <button
                      type="button"
                      className="max-w-[140px] truncate rounded-md px-1.5 py-0.5 font-medium text-foreground hover:bg-muted"
                      onClick={() => void goDrivePath(index)}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
                {driveQuery.trim() ? (
                  <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
                    Výsledky hledání
                  </span>
                ) : null}
              </div>

              <div className="min-h-[320px] max-h-[55vh] overflow-hidden rounded-xl border border-border/60">
                <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1fr)_110px_80px_96px] gap-2 border-b border-border/60 bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                  <span>Název</span>
                  <span>Typ</span>
                  <span className="text-right">Velikost</span>
                  <span className="text-right">Akce</span>
                </div>
                <div className="max-h-[calc(55vh-2.25rem)] overflow-y-auto">
                  {driveLoading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Načítám Drive…
                    </div>
                  ) : filteredDriveFiles.length === 0 ? (
                    <p className="px-3 py-14 text-center text-sm text-muted-foreground">
                      Nic nenalezeno. Změňte filtr, hledání, nebo otevřete jinou
                      složku.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {filteredDriveFiles.map((file) => {
                        const kind = getDriveFileKind(file);
                        return (
                          <li
                            key={file.id}
                            className={cn(
                              "grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_110px_80px_96px] sm:gap-2",
                              file.isFolder &&
                                "cursor-pointer hover:bg-amber-50/60 ",
                              !file.isFolder && "hover:bg-muted/40",
                            )}
                            onDoubleClick={() => {
                              if (file.isFolder) void openDriveFolder(file);
                            }}
                          >
                            <button
                              type="button"
                              className="flex min-w-0 items-center gap-2.5 text-left"
                              onClick={() => {
                                if (file.isFolder) void openDriveFolder(file);
                              }}
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background">
                                <DriveFileIcon kind={kind} />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {file.name}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground sm:hidden">
                                  {kind.label}
                                  {file.sizeBytes != null
                                    ? ` · ${formatBytes(file.sizeBytes)}`
                                    : ""}
                                  {file.modifiedTime
                                    ? ` · ${formatDate(file.modifiedTime)}`
                                    : ""}
                                </span>
                                {file.modifiedTime ? (
                                  <span className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block">
                                    Upraveno {formatDate(file.modifiedTime)}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                            <span className="hidden text-xs text-muted-foreground sm:block">
                              {kind.shortLabel}
                            </span>
                            <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
                              {file.isFolder
                                ? "—"
                                : file.sizeBytes != null
                                  ? formatBytes(file.sizeBytes)
                                  : "—"}
                            </span>
                            <div className="flex justify-end">
                              {file.isFolder ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void openDriveFolder(file)}
                                  className="h-8 shrink-0"
                                >
                                  Otevřít
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={importingId === file.id}
                                  onClick={() => void importFromDrive(file)}
                                  className="h-8 shrink-0"
                                >
                                  {importingId === file.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    "Import"
                                  )}
                                </Button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="pb-1 text-left text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => void connectGoogleDrive()}
              >
                Znovu připojit Google (nová oprávnění)
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={oneDriveOpen} onOpenChange={setOneDriveOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import z OneDrive</DialogTitle>
            <DialogDescription>
              {oneDriveConnected
                ? `Připojeno jako ${oneDriveEmail || "Microsoft účet"}. Vyberte soubor k importu do Úložiště.`
                : "Nejdřív připojte Microsoft 365 s přístupem k OneDrive."}
            </DialogDescription>
          </DialogHeader>

          {!oneDriveConnected ? (
            <Button
              type="button"
              disabled={oneDriveConnecting || !oneDriveOauthConfigured}
              onClick={() => void connectOneDrive()}
              className="w-full"
            >
              {oneDriveConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="mr-2 h-4 w-4" />
              )}
              Připojit OneDrive
            </Button>
          ) : (
            <div className="flex min-h-0 flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  value={oneDriveQuery}
                  onChange={(e) => setOneDriveQuery(e.target.value)}
                  placeholder="Hledat na OneDrive…"
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void searchOneDrive();
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={oneDriveLoading}
                  onClick={() => void searchOneDrive()}
                  className="h-9 shrink-0"
                >
                  Hledat
                </Button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border/60">
                {oneDriveLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Načítám OneDrive…
                  </div>
                ) : oneDriveFiles.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Žádné soubory. Zkuste jiné hledání nebo znovu připojte účet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {oneDriveFiles.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {file.mimeType}
                            {file.sizeBytes != null
                              ? ` · ${formatBytes(file.sizeBytes)}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={oneDriveImportingId === file.id}
                          onClick={() => void importFromOneDrive(file)}
                          className="h-8 shrink-0"
                        >
                          {oneDriveImportingId === file.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Import"
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                className="text-left text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => void connectOneDrive()}
              >
                Znovu připojit Microsoft (nová oprávnění)
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
