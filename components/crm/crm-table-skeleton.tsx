/** Skeleton rows for CRM list — same cell DOM / type rhythm as live rows. */
export function CrmTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="sk-data-panel__scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <table className="w-full table-fixed text-sm" aria-hidden>
        <thead>
          <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <th className="sticky top-0 z-10 w-[44px] bg-transparent px-3 py-3 text-center font-semibold">
              <div className="flex justify-center">
                <div className="sk-ghost-spot h-4 w-4 rounded-[4px]" />
              </div>
            </th>
            <th className="sticky top-0 z-10 w-[34%] bg-transparent px-3 py-3 font-semibold">
              Firma
            </th>
            <th className="sticky top-0 z-10 w-[7.25rem] bg-transparent px-2 py-3 font-semibold">
              Datum
            </th>
            <th className="sticky top-0 z-10 w-[24%] min-w-0 bg-transparent px-3 py-3 font-semibold">
              KONTAKT
            </th>
            <th className="sticky top-0 z-10 w-[14%] min-w-[9.75rem] bg-transparent px-3 py-3 pl-3 font-semibold">
              Status
            </th>
            <th className="sticky top-0 z-10 w-[10.5rem] bg-transparent px-2 py-3 pl-2 text-left font-semibold">
              Akce
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => {
            const nameW = `${58 + (i % 4) * 9}%`;
            const subW = `${36 + (i % 3) * 8}%`;
            const mailW = `${68 + (i % 3) * 7}%`;
            const phoneW = `${42 + (i % 2) * 12}%`;
            const statusW = i % 3 === 0 ? "5.75rem" : i % 3 === 1 ? "7rem" : "6.25rem";
            return (
              <tr key={i} className="sk-crm-skeleton-row">
                <td className="px-3 py-3 text-center">
                  <div className="flex justify-center">
                    <div className="sk-ghost-spot h-4 w-4 rounded-[4px]" />
                  </div>
                </td>

                <td className="min-w-0 overflow-hidden px-3 py-3 pr-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="sk-ghost-spot h-9 w-9 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      {/* Same type boxes as live: font-semibold + text-xs */}
                      <p className="truncate font-semibold leading-normal">
                        <span
                          className="sk-ghost-spot inline-block h-[0.72em] max-w-full rounded-md align-middle"
                          style={{ width: nameW, maxWidth: 220 }}
                        />
                      </p>
                      <p className="truncate text-xs leading-normal">
                        <span
                          className="sk-ghost-spot inline-block h-[0.72em] max-w-full rounded-md align-middle"
                          style={{ width: subW, maxWidth: 130 }}
                        />
                      </p>
                    </div>
                  </div>
                </td>

                <td className="w-[7.25rem] overflow-hidden px-2 py-3 align-top">
                  <div className="min-w-0 max-w-full leading-tight">
                    <p className="text-[10px] font-semibold uppercase tracking-wide">
                      <span className="sk-ghost-spot inline-block h-[0.75em] w-14 rounded align-middle" />
                    </p>
                    <p className="truncate text-sm tabular-nums leading-normal">
                      <span className="sk-ghost-spot inline-block h-[0.72em] w-[4.75rem] rounded-md align-middle" />
                    </p>
                  </div>
                </td>

                <td className="min-w-0 overflow-hidden px-3 py-3 align-middle">
                  <div className="flex min-w-0 max-w-full items-start gap-1.5">
                    {/* CopyEmailButton size="sm" variant="ghost" → h-6 w-6 */}
                    <div className="sk-ghost-spot mt-0.5 h-6 w-6 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1 overflow-hidden leading-tight">
                      <p className="truncate text-sm leading-snug">
                        <span
                          className="sk-ghost-spot inline-block h-[0.72em] max-w-full rounded-md align-middle"
                          style={{ width: mailW, maxWidth: 170 }}
                        />
                      </p>
                      <p className="truncate text-xs leading-snug">
                        <span
                          className="sk-ghost-spot inline-block h-[0.72em] max-w-full rounded-md align-middle"
                          style={{ width: phoneW, maxWidth: 120 }}
                        />
                      </p>
                    </div>
                  </div>
                </td>

                <td className="min-w-[9.75rem] px-3 py-3 pl-3">
                  {/* Same chrome as sk-crm-status-pill */}
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-transparent px-2.5 py-1">
                    <span
                      className="sk-ghost-spot block h-2.5 rounded"
                      style={{ width: statusW }}
                    />
                  </span>
                </td>

                <td className="w-[10.5rem] px-2 py-3 pl-2 text-left whitespace-nowrap">
                  <div className="flex items-center justify-start gap-1.5">
                    {[0, 1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="sk-ghost-spot h-8 w-8 shrink-0 rounded-lg"
                      />
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Soft-UI placeholder for the due follow-up / breakup strip. */
export function CrmDueBannerSkeleton() {
  return (
    <div
      className="sk-crm-due flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
      aria-hidden
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="sk-ghost-spot h-8 w-8 shrink-0 rounded-[10px]" />
        <div className="min-w-0 space-y-1.5 pt-0.5">
          <div className="sk-ghost-spot h-3.5 w-52 max-w-full rounded-md sm:h-4 sm:w-64" />
          <div className="sk-ghost-spot hidden h-3 w-72 max-w-full rounded-md sm:block" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <div className="sk-ghost-spot h-8 w-[5.5rem] rounded-xl sm:h-9 sm:w-28" />
        <div className="sk-ghost-spot h-8 w-[5.25rem] rounded-xl sm:h-9 sm:w-24" />
      </div>
    </div>
  );
}

export function CrmKanbanSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="sk-data-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        <div className="sk-ghost-spot h-2.5 w-2.5 rounded-full" />
        <div className="sk-ghost-spot h-4 w-24 rounded-md" />
        <div className="sk-ghost-spot h-3.5 w-8 rounded-md" />
      </div>
      <div className="sk-data-panel__scroll scrollbar-hide min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <div
              key={i}
              className="sk-data-row flex-col items-stretch gap-2.5 p-3.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="sk-ghost-spot h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-normal">
                    <span
                      className="sk-ghost-spot inline-block h-[0.72em] rounded-md align-middle"
                      style={{ width: `${62 + (i % 3) * 10}%` }}
                    />
                  </p>
                  <p className="truncate text-xs leading-normal">
                    <span className="sk-ghost-spot inline-block h-[0.72em] w-2/3 rounded-md align-middle" />
                  </p>
                </div>
              </div>
              <span className="inline-flex rounded-md border border-transparent px-2.5 py-1">
                <span className="sk-ghost-spot block h-2.5 w-20 rounded" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
