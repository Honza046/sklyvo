export type SniperRecentStatus = "draft" | "sent";

export type SniperRecentItem = {
  id: string;
  targetUrl: string;
  companyLabel: string;
  contactEmail: string;
  status: SniperRecentStatus;
  createdAt: number;
  updatedAt: number;
  selectedOffer: string;
  tone: string;
  language: string;
  subjects: string[];
  selectedSubject: string;
  body: string;
  segment: string | null;
  analysis: string | null;
};

const STORAGE_PREFIX = "sklyvo.sniper.recent.v1";
const MAX_ITEMS = 6;

export function companyLabelFromUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "—";
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./i, "") || raw;
  } catch {
    return raw.replace(/^https?:\/\//i, "").split("/")[0] || raw;
  }
}

function storageKey(workspaceId: string, userId: string) {
  return `${STORAGE_PREFIX}:${workspaceId}:${userId}`;
}

function normalizeKey(url: string, email: string) {
  return `${url.trim().toLowerCase()}|${email.trim().toLowerCase()}`;
}

export function listSniperRecent(
  workspaceId: string | null | undefined,
  userId: string | null | undefined,
): SniperRecentItem[] {
  if (typeof window === "undefined" || !workspaceId || !userId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(workspaceId, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SniperRecentItem => {
        return (
          item &&
          typeof item === "object" &&
          typeof (item as SniperRecentItem).id === "string" &&
          typeof (item as SniperRecentItem).targetUrl === "string"
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeSniperRecent(
  workspaceId: string,
  userId: string,
  items: SniperRecentItem[],
) {
  window.localStorage.setItem(
    storageKey(workspaceId, userId),
    JSON.stringify(items.slice(0, MAX_ITEMS)),
  );
}

export function upsertSniperRecent(
  workspaceId: string | null | undefined,
  userId: string | null | undefined,
  input: Omit<SniperRecentItem, "id" | "createdAt" | "updatedAt" | "companyLabel"> & {
    id?: string;
    companyLabel?: string;
    status?: SniperRecentStatus;
  },
): SniperRecentItem[] {
  if (typeof window === "undefined" || !workspaceId || !userId) return [];
  const now = Date.now();
  const current = listSniperRecent(workspaceId, userId);
  const key = normalizeKey(input.targetUrl, input.contactEmail);
  const existingIndex = current.findIndex(
    (item) => normalizeKey(item.targetUrl, item.contactEmail) === key,
  );

  const nextItem: SniperRecentItem = {
    id:
      existingIndex >= 0
        ? current[existingIndex]!.id
        : input.id ??
          `${now}-${Math.random().toString(36).slice(2, 8)}`,
    targetUrl: input.targetUrl.trim(),
    companyLabel:
      input.companyLabel?.trim() || companyLabelFromUrl(input.targetUrl),
    contactEmail: input.contactEmail.trim(),
    status: input.status ?? "draft",
    createdAt: existingIndex >= 0 ? current[existingIndex]!.createdAt : now,
    updatedAt: now,
    selectedOffer: input.selectedOffer,
    tone: input.tone,
    language: input.language,
    subjects: input.subjects,
    selectedSubject: input.selectedSubject,
    body: input.body,
    segment: input.segment,
    analysis: input.analysis,
  };

  const without = current.filter((_, i) => i !== existingIndex);
  const next = [nextItem, ...without].slice(0, MAX_ITEMS);
  writeSniperRecent(workspaceId, userId, next);
  return next;
}

export function markSniperRecentSent(
  workspaceId: string | null | undefined,
  userId: string | null | undefined,
  targetUrl: string,
  contactEmail: string,
): SniperRecentItem[] {
  if (typeof window === "undefined" || !workspaceId || !userId) return [];
  const current = listSniperRecent(workspaceId, userId);
  const key = normalizeKey(targetUrl, contactEmail);
  const now = Date.now();
  const next = current
    .map((item) =>
      normalizeKey(item.targetUrl, item.contactEmail) === key
        ? { ...item, status: "sent" as const, updatedAt: now }
        : item,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  writeSniperRecent(workspaceId, userId, next);
  return next;
}
