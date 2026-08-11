import { AutopilotTableSkeleton } from "@/components/autopilot/autopilot-table-skeleton";

/** Body-only — Autopilot layout keeps the page header + tabs. */
export default function AutopilotLoading() {
  return (
    <div className="sk-autopilot__stack flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <div className="sk-skeleton-block h-10 w-28 rounded-xl" />
        <div className="sk-skeleton-block h-10 w-10 rounded-xl" />
        <div className="sk-skeleton-block ml-auto h-10 w-32 rounded-xl" />
      </div>
      <AutopilotTableSkeleton
        rows={8}
        headers={["Firma", "Kontakt", "Datum", "Status"]}
      />
    </div>
  );
}
