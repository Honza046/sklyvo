"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Lock,
  Presentation,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import {
  deleteWorkspaceDocument,
  getWorkspaceDocumentDownloadUrl,
  getWorkspaceDocumentFullPreviewUrl,
  listWorkspaceDocuments,
  uploadWorkspaceDocument,
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

function kindLabel(kind: WorkspaceDocumentRow["kind"]) {
  if (kind === "OFFER") return "Nabídka";
  if (kind === "CONTRACT") return "Smlouva";
  if (kind === "INVOICE") return "Faktura";
  return "Soubor";
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
      const result = await listWorkspaceDocuments(scope);
      if ("error" in result) {
        toast.error(result.error);
        setDocuments([]);
      } else {
        setDocuments(result.documents);
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

  const tabs = useMemo(
    () =>
      [
        {
          id: "personal" as const,
          label: t("storage.tabPersonal"),
          hint: t("storage.tabPersonalHint"),
          icon: Lock,
        },
        {
          id: "shared" as const,
          label: t("storage.tabShared"),
          hint: t("storage.tabSharedHint"),
          icon: Users,
        },
      ] as const,
    [t],
  );

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
      // Global search — leave folder path, search across Drive
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
    // -1 = root
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex w-full shrink-0 flex-col items-center px-0 pb-3 pt-1 text-center sm:pb-4 sm:pt-2">
        <div className="mb-2 flex items-center justify-center gap-2 md:mb-3 md:gap-3">
          <div className="sk-page-badge" data-accent="teal" aria-hidden>
            <FolderOpen strokeWidth={2} />
          </div>
        </div>
        <h1 className="sk-type-h1">{t("storage.title")}</h1>
        <p className="sk-type-body mt-1 max-w-xl px-2">
          {t("storage.subtitle")}
        </p>
      </div>

      <div className="flex w-full shrink-0 gap-1 border-b border-border/60 sm:gap-4">
        {tabs.map(({ id, label, hint, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px flex min-w-0 flex-1 flex-col items-center gap-0.5 border-b-2 px-1 pb-2 text-center transition-colors sm:flex-none sm:items-start sm:px-0 sm:pb-2.5 sm:text-left",
                active
                  ? "border-[color:var(--sk-ink)] text-[color:var(--sk-ink)]"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium sm:text-sm">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </span>
              <span className="hidden text-[10px] text-muted-foreground sm:block">
                {hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden pt-3 sm:pt-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 flex shrink-0 flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {tab === "personal"
                ? t("storage.privacyPersonal")
                : t("storage.privacyShared")}
            </p>
            <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => void handleUpload(e.target.files?.[0])}
              />
              <Button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                className="min-w-0"
              >
                {isUploading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 shrink-0 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                ) : (
                  <Upload className="mr-1 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                )}
                <span className="truncate">
                  <span className="sm:hidden">{t("storage.uploadShort")}</span>
                  <span className="hidden sm:inline">{t("storage.upload")}</span>
                </span>
              </Button>
              <Button
                type="button"
                variant={driveConnected ? "default" : "secondary"}
                size="sm"
                disabled={driveConnecting}
                onClick={() =>
                  void (driveConnected
                    ? openDrivePicker()
                    : connectGoogleDrive())
                }
                className={cn(
                  "min-w-0",
                  !driveConnected && "text-muted-foreground",
                )}
              >
                {driveConnecting ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 shrink-0 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                ) : (
                  <HardDrive className="mr-1 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                )}
                <span className="truncate">
                  <span className="sm:hidden">Drive</span>
                  <span className="hidden sm:inline">
                    {driveConnected ? "Google Drive" : t("storage.connectDrive")}
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant={oneDriveConnected ? "default" : "secondary"}
                size="sm"
                disabled={oneDriveConnecting}
                onClick={() =>
                  void (oneDriveConnected
                    ? openOneDrivePicker()
                    : connectOneDrive())
                }
                className={cn(
                  "min-w-0",
                  !oneDriveConnected && "text-muted-foreground",
                )}
              >
                {oneDriveConnecting ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 shrink-0 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                ) : (
                  <HardDrive className="mr-1 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                )}
                <span className="truncate">
                  <span className="sm:hidden">OneDrive</span>
                  <span className="hidden sm:inline">
                    {oneDriveConnected ? "OneDrive" : t("storage.connectOneDrive")}
                  </span>
                </span>
              </Button>
            </div>
          </div>

          <div className="sk-data-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl sm:rounded-2xl">
            {isLoading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Načítám soubory…
              </div>
            ) : documents.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  {t("storage.emptyTitle")}
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {t("storage.emptyDesc")}
                </p>
              </div>
            ) : (
              <ul className="sk-data-panel__scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="sk-data-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {doc.previewUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/80 bg-white/70 transition hover:ring-2 hover:ring-[color:var(--sk-brand)]/35"
                          title="Zobrazit náhled"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.previewUrl}
                            alt={doc.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/70 text-muted-foreground">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {doc.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {kindLabel(doc.kind)} · {formatBytes(doc.sizeBytes)} ·{" "}
                          {formatDate(doc.createdAt)}
                          {tab === "shared" ? ` · ${doc.ownerName}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full shrink-0 items-center justify-center gap-1.5 sm:w-auto sm:justify-end">
                      {doc.previewUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPreviewDoc(doc)}
                          className="h-8 rounded-lg px-2.5 text-xs"
                        >
                          <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                          Náhled
                        </Button>
                      ) : null}
                      {doc.externalUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              doc.externalUrl!,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="h-8 rounded-lg px-2.5 text-xs"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          {doc.externalLabel || "Otevřít"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyId === doc.id}
                        onClick={() => void handleDownload(doc.id)}
                        className="h-8 rounded-lg px-2.5 text-xs"
                      >
                        {busyId === doc.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {doc.externalUrl ? "Otevřít" : "Stáhnout"}
                      </Button>
                      {doc.canDelete ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyId === doc.id}
                          onClick={() => void handleDelete(doc.id)}
                          className="h-8 rounded-lg px-2.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 "
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Smazat
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

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
                          ? "border-blue-600 bg-blue-50 text-blue-800 "
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
