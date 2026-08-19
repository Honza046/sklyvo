import { Loader2 } from "lucide-react";

function CrmSkeletonRow({ index }: { index: number }) {
  const nameW = `${58 + (index % 4) * 9}%`;

  return (
    <div className="sk-crm-table__row sk-crm-table__row--ghost" aria-hidden>
      <div className="sk-ghost-spot h-[18px] w-[18px] rounded-[5px]" />

      <div className="sk-crm-firm">
        <div className="sk-ghost-spot h-[30px] w-[30px] shrink-0 rounded-[9px]" />
        <div className="min-w-0 flex-1">
          <div
            className="sk-ghost-spot h-[14px] rounded"
            style={{ width: nameW, maxWidth: 240 }}
          />
          <div
            className="sk-ghost-spot mt-0.5 h-[11px] rounded"
            style={{ width: "42%", maxWidth: 72 }}
          />
        </div>
      </div>

      <span className="sk-crm-date">
        <span className="sk-ghost-spot inline-block h-3 w-[72px] rounded" />
      </span>

      <div className="sk-crm-contact">
        <div className="min-w-0 flex-1">
          <div className="sk-ghost-spot h-[12.5px] w-full max-w-[148px] rounded" />
          <div className="sk-ghost-spot mt-0.5 h-[11px] w-[84px] rounded" />
        </div>
      </div>

      <div className="sk-crm-status-cell">
        <div className="sk-ghost-spot h-6 w-[92px] rounded-[7px]" />
        <div className="sk-ghost-spot h-[26px] w-[26px] shrink-0 rounded-full" />
      </div>

      <div className="sk-crm-actions">
        {Array.from({ length: 4 }, (_, j) => (
          <div key={j} className="sk-ghost-spot h-7 w-7 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Centered spinner for first load when CRM has no rows yet. */
export function CrmTableLoadingSpinner() {
  return (
    <div className="sk-crm-table__loading" aria-busy="true" aria-label="Načítání CRM">
      <Loader2 className="h-7 w-7 animate-spin text-[#6b7078]" strokeWidth={2} />
    </div>
  );
}

/** Skeleton rows for CRM list — mirrors sk-crm-table__row layout. */
export function CrmTableSkeleton({
  rows = 8,
  embedded = false,
}: {
  rows?: number;
  embedded?: boolean;
}) {
  const content = (
    <>
      {!embedded ? (
        <div className="sk-crm-table__head" aria-hidden>
          <div className="sk-ghost-spot h-[18px] w-[18px] rounded-[5px]" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="sk-ghost-spot h-2.5 w-16 rounded" />
          ))}
        </div>
      ) : null}
      {Array.from({ length: rows }, (_, i) => (
        <CrmSkeletonRow key={i} index={i} />
      ))}
    </>
  );

  if (embedded) {
    return <>{content}</>;
  }

  return (
    <div className="sk-crm-table">
      <div className="sk-crm-table__body">{content}</div>
    </div>
  );
}

/** Kanban board loading placeholder. */
export function CrmKanbanSkeleton() {
  return (
    <div className="sk-crm-board flex min-h-0 flex-1 flex-col gap-3" aria-hidden>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="sk-ghost-spot h-[4.5rem] rounded-[14px]" />
        ))}
      </div>
      <div className="sk-ghost-spot h-5 w-64 self-center rounded-md" />
      <div className="sk-ghost-spot min-h-[min(40vh,20rem)] flex-1 rounded-[14px]" />
    </div>
  );
}
