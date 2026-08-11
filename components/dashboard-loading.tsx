const FUNNEL_BAR_WIDTHS = [88, 72, 58, 46, 34, 22] as const;

const PANEL_CARD =
  "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:gap-4 sm:p-4";

/** Obsah Přehledu — stejná kompozice jako `DashboardBodyView`. */
function DashboardSkeletonBody() {
  return (
    <div
      className="scrollbar-hide flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto sm:gap-3 lg:overflow-hidden"
      aria-hidden
    >
      {/* 4 KPI karty — icon chip + label, pak číslo (3. má „v CRM“) */}
      <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm sm:rounded-2xl sm:p-4"
          >
            <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
              <div className="sk-ghost-spot rounded-md p-1.5 sm:rounded-lg sm:p-2">
                <div className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div
                className="sk-ghost-spot h-2.5 rounded-md"
                style={{ width: `${42 + (i % 3) * 12}%`, maxWidth: 110 }}
              />
            </div>
            {i === 2 ? (
              <div className="flex items-end justify-between gap-2">
                <div className="sk-ghost-spot h-[1.375rem] w-14 rounded-md sm:h-7 sm:w-16" />
                <div className="sk-ghost-spot mb-0.5 h-2.5 w-10 shrink-0 rounded" />
              </div>
            ) : (
              <div
                className="sk-ghost-spot h-[1.375rem] rounded-md sm:h-7"
                style={{ width: `${28 + (i % 2) * 14}%`, maxWidth: 96 }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 pb-1 lg:grid-cols-3 lg:gap-4 lg:overflow-hidden lg:pb-0">
        <div className="contents lg:col-span-2 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-3">
          {/* Funnel — label+dot+count, pak tenký bar (ne tlusté bloky) */}
          <div className="sk-surface sk-surface--pad order-1 flex shrink-0 flex-col lg:order-none">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 sm:mb-2 sm:gap-2">
              <div className="sk-ghost-spot h-4 w-36 rounded-md" />
              <div className="sk-ghost-spot h-[34px] w-[9.25rem] shrink-0 rounded-xl" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 sm:gap-1.5">
              {FUNNEL_BAR_WIDTHS.map((w, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-[11px] sm:text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <div className="sk-ghost-spot h-1.5 w-1.5 shrink-0 rounded-full" />
                      <div
                        className="sk-ghost-spot h-2.5 rounded"
                        style={{ width: 52 + (i % 4) * 10 }}
                      />
                    </span>
                    <div className="sk-ghost-spot h-2.5 w-6 shrink-0 rounded" />
                  </div>
                  <div className="sk-funnel-bar h-1 sm:h-1.5">
                    <div
                      className="sk-ghost-spot h-full rounded-full"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nedávná aktivita — title + count, sunken list rows */}
          <div
            className={`order-3 max-h-[260px] lg:order-none lg:max-h-none ${PANEL_CARD}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div className="sk-ghost-spot h-4 w-32 rounded-md" />
              <div className="sk-ghost-spot h-2.5 w-16 shrink-0 rounded" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border/40 bg-muted/20">
              <ul className="divide-y divide-border/50">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="px-4 py-3">
                    <p className="text-sm font-medium leading-snug">
                      <span
                        className="sk-ghost-spot inline-block h-[0.72em] max-w-full rounded-md align-middle"
                        style={{ width: `${62 + i * 8}%`, maxWidth: 260 }}
                      />
                    </p>
                    <p className="mt-1">
                      <span className="sk-ghost-spot inline-block h-2.5 w-16 rounded align-middle" />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="contents lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-3">
          {/* Rychlé akce — bordered action rows + arrow */}
          <div className="order-2 flex shrink-0 flex-col rounded-2xl border border-border/60 bg-card p-3 shadow-sm md:p-4 lg:order-none">
            <div className="sk-ghost-spot mb-2 h-4 w-28 rounded-md" />
            <div className="flex shrink-0 flex-col gap-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="sk-ghost-spot rounded-lg p-2">
                      <div className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="leading-[1.3]">
                        <span
                          className="sk-ghost-spot inline-block h-3.5 rounded-md align-middle"
                          style={{ width: 108 + i * 16 }}
                        />
                      </p>
                      <p className="mt-0.5">
                        <span
                          className="sk-ghost-spot inline-block h-2 rounded align-middle"
                          style={{ width: 72 + i * 12 }}
                        />
                      </p>
                    </div>
                  </div>
                  <div className="sk-ghost-spot h-4 w-4 shrink-0 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* K řešení — avatar + 2 řádky + Vyřešit */}
          <div
            className={`order-4 mb-1 max-h-[280px] lg:order-none lg:mb-0 lg:max-h-none ${PANEL_CARD}`}
          >
            <div className="sk-ghost-spot h-4 w-24 shrink-0 rounded-md" />
            <div className="flex min-h-0 flex-1 flex-col">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border/40 p-3 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="sk-ghost-spot h-8 w-8 shrink-0 rounded-full" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium leading-snug">
                        <span
                          className="sk-ghost-spot inline-block h-[0.72em] rounded-md align-middle"
                          style={{ width: 96 + i * 20 }}
                        />
                      </span>
                      <span className="text-[10px] leading-normal">
                        <span className="sk-ghost-spot inline-block h-[0.75em] w-20 rounded align-middle" />
                      </span>
                    </div>
                  </div>
                  <div className="sk-ghost-spot h-7 w-14 shrink-0 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Celá stránka pro `app/(dashboard)/loading.tsx`. */
export function DashboardLoading() {
  return (
    <div className="sk-dashboard-frame flex h-full min-h-0 w-full flex-col gap-2 md:gap-3">
      <div className="sk-dashboard-header mb-0.5 flex w-full shrink-0 flex-col justify-between gap-2 md:mb-1 md:flex-row md:items-end md:gap-3">
        <div className="sk-page-head">
          <div className="sk-ghost-spot h-8 w-[min(100%,18rem)] rounded-lg md:h-9 md:w-[20rem]" />
          <div className="sk-ghost-spot mt-1.5 h-3 w-[min(100%,22rem)] rounded-md" />
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="sk-ghost-spot h-9 w-16 rounded-xl" />
          <div className="sk-ghost-spot h-9 w-[7.5rem] rounded-xl" />
          <div className="sk-ghost-spot h-9 w-[9.5rem] rounded-xl" />
        </div>
      </div>
      <DashboardSkeletonBody />
    </div>
  );
}

/** Fallback uvnitř `Suspense` – jen obsah pod reálnou hlavičkou. */
export function DashboardBodySkeleton() {
  return <DashboardSkeletonBody />;
}

/** @deprecated Kept for imports; prefer ghost spots over copy during load. */
export const DASHBOARD_SUBTITLE = "";
