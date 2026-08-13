export type FunnelLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "REPLIED"
  | "MEETING_SET"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export const FUNNEL_STATUS_META: Array<{
  key: FunnelLeadStatus;
  label: string;
  color: string;
  dotClass: string;
  rowBgClass: string;
  badgeClass: string;
}> = [
  {
    key: "NEW",
    label: "Nový lead",
    color: "#94a3b8",
    dotClass: "bg-slate-400",
    rowBgClass: "bg-slate-400 ",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700 ",
  },
  {
    key: "CONTACTED",
    label: "Kontaktováno",
    color: "#3b82f6",
    dotClass: "bg-blue-500",
    rowBgClass: "bg-blue-500 ",
    badgeClass: "border-blue-100 bg-blue-50 text-blue-700 ",
  },
  {
    key: "REPLIED",
    label: "Follow up",
    color: "#f59e0b",
    dotClass: "bg-amber-500",
    rowBgClass: "bg-amber-500 ",
    badgeClass: "border-amber-100 bg-amber-50 text-amber-700 ",
  },
  {
    key: "MEETING_SET",
    label: "Komunikace",
    color: "#8b5cf6",
    dotClass: "bg-violet-500",
    rowBgClass: "bg-violet-500 ",
    badgeClass: "border-violet-100 bg-violet-50 text-violet-700 ",
  },
  {
    key: "CLOSED_WON",
    label: "Domluveno",
    color: "#10b981",
    dotClass: "bg-emerald-500",
    rowBgClass: "bg-emerald-500 ",
    badgeClass: "border-emerald-100 bg-emerald-50 text-emerald-700 ",
  },
  {
    key: "CLOSED_LOST",
    label: "Nedomluveno",
    color: "#f43f5e",
    dotClass: "bg-rose-500",
    rowBgClass: "bg-rose-500 ",
    badgeClass: "border-rose-100 bg-rose-50 text-rose-700 ",
  },
];
