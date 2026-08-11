import {
  CrmDueBannerSkeleton,
  CrmTableSkeleton,
} from "@/components/crm/crm-table-skeleton";

export default function CrmLoading() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center overflow-hidden">
      <div className="mb-2 shrink-0 space-y-1 text-center">
        <div className="mb-2 flex items-center justify-center gap-3">
          <div className="sk-page-badge" aria-hidden>
            <div className="sk-ghost-spot h-5 w-5 rounded-md" />
          </div>
        </div>
        <div className="sk-ghost-spot mx-auto h-8 w-20 rounded-md" />
        <div className="sk-ghost-spot mx-auto h-4 w-[min(100%,22rem)] rounded-md" />
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden px-0 sm:gap-4">
        <CrmDueBannerSkeleton />

        <div className="sk-surface sk-toolbar flex shrink-0 items-center gap-1.5 px-3 py-2 sm:px-4 md:gap-4">
          <div className="sk-ghost-spot h-9 min-w-0 flex-1 rounded-xl md:max-w-xs" />
          <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
            <div className="sk-ghost-spot h-9 w-9 rounded-xl md:w-[7.5rem]" />
            <div className="sk-ghost-spot h-9 w-9 rounded-xl" />
            <div className="sk-ghost-spot h-9 w-9 rounded-xl" />
            <div className="sk-ghost-spot h-9 w-[7.5rem] rounded-xl" />
          </div>
        </div>

        <div className="sk-data-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
          <CrmTableSkeleton rows={10} />
          <div className="sk-pager mt-0 flex shrink-0 items-center justify-between gap-2 border-0 bg-transparent px-3 py-2 md:gap-3 md:px-4 md:py-2.5">
            <div className="sk-ghost-spot h-3 w-40 rounded" />
            <div className="flex items-center gap-1">
              <div className="sk-ghost-spot h-7 w-20 rounded-lg" />
              <div className="sk-ghost-spot h-3 w-8 rounded" />
              <div className="sk-ghost-spot h-7 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
