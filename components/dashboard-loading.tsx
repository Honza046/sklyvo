import { Loader2 } from "lucide-react";
import { cz } from "@/lib/i18n/messages/cz";

/** Server-safe default subtitle (Czech). Client pages use `DashboardSubtitle` for i18n. */
export const DASHBOARD_SUBTITLE = cz.dashboard.subtitle;

/** Obsah pod hlavičkou – karty s borderem, uvnitř pulzující „duchové“. */
function DashboardSkeletonBody() {
  return (
    <div className="animate-in fade-in duration-300 flex min-h-0 flex-1 flex-col">
      <div className="mb-4 mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex h-28 animate-pulse flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="flex h-full flex-col justify-center gap-3">
              <div className="h-4 w-24 rounded-md bg-slate-200 " />
              <div className="mt-2 h-8 w-16 rounded-md bg-slate-200 " />
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-1 flex h-full flex-col gap-4 lg:col-span-2">
          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex h-full flex-col gap-4 animate-pulse">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="h-5 w-40 rounded-md bg-slate-200 " />
                <div className="h-8 w-[148px] shrink-0 rounded-md bg-slate-100 " />
              </div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 w-full rounded-md bg-slate-100 " />
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="animate-pulse flex min-h-0 flex-1 flex-col gap-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="h-5 w-32 rounded-md bg-slate-200 " />
                <div className="h-4 w-20 rounded-md bg-slate-200 " />
              </div>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border/40 py-2 last:border-0"
                >
                  <div className="h-4 w-48 rounded-md bg-slate-100 " />
                  <div className="h-3 w-16 rounded-md bg-slate-100 " />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="animate-pulse flex flex-col gap-4">
              <div className="mb-2 h-5 w-32 rounded-md bg-slate-200 " />
              <div className="h-14 w-full rounded-xl bg-slate-100 " />
              <div className="h-14 w-full rounded-xl bg-slate-100 " />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="animate-pulse flex min-h-0 flex-1 flex-col gap-4">
              <div className="mb-2 h-5 w-24 rounded-md bg-slate-200 " />
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border/40 py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200 " />
                    <div className="flex flex-col gap-1">
                      <div className="h-4 w-32 rounded-md bg-slate-100 " />
                      <div className="h-3 w-20 rounded-md bg-slate-100 " />
                    </div>
                  </div>
                  <div className="h-6 w-12 rounded-md bg-slate-200 " />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Celá stránka pro `app/loading.tsx` – zarovnání jako na `page.tsx`. */
export function DashboardLoading() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-3 overflow-hidden p-4 md:p-6">
      <div className="mb-2 flex w-full shrink-0 flex-col justify-between gap-2 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="h-8 w-[220px] animate-pulse rounded-md bg-slate-200 md:w-[280px]" />
          <p className="text-sm text-muted-foreground">
            {DASHBOARD_SUBTITLE}{" "}
            <span className="ml-3 inline-flex animate-in fade-in items-center text-sm font-medium text-blue-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {cz.common.loading}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-[7.5rem] animate-pulse rounded-xl bg-slate-200 " />
          <div className="h-9 w-[9.5rem] animate-pulse rounded-xl bg-slate-200 " />
        </div>
      </div>
      <DashboardSkeletonBody />
    </div>
  );
}

/** Fallback uvnitř `Suspense` – jen obsah pod reálnou hlavičkou. */
export function DashboardBodySkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <DashboardSkeletonBody />
    </div>
  );
}
