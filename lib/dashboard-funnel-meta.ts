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
  dotClass: string;
  rowBgClass: string;
  badgeClass: string;
}> = [
  {
    key: "NEW",
    label: "Nový lead",
    dotClass: "bg-slate-500",
    rowBgClass: "bg-slate-500 dark:bg-slate-400",
    badgeClass:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    key: "CONTACTED",
    label: "Kontaktováno",
    dotClass: "bg-blue-500",
    rowBgClass: "bg-blue-500 dark:bg-blue-400",
    badgeClass:
      "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    key: "REPLIED",
    label: "Follow up",
    dotClass: "bg-amber-500",
    rowBgClass: "bg-amber-500 dark:bg-amber-400",
    badgeClass:
      "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    key: "MEETING_SET",
    label: "Komunikace",
    dotClass: "bg-violet-500",
    rowBgClass: "bg-violet-500 dark:bg-violet-400",
    badgeClass:
      "border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  },
  {
    key: "CLOSED_WON",
    label: "Domluveno",
    dotClass: "bg-emerald-500",
    rowBgClass: "bg-emerald-500 dark:bg-emerald-400",
    badgeClass:
      "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    key: "CLOSED_LOST",
    label: "Nedomluveno",
    dotClass: "bg-rose-500",
    rowBgClass: "bg-rose-500 dark:bg-rose-400",
    badgeClass:
      "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  },
];
