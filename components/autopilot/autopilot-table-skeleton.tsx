/** Ghost rows for Autopilot tables — same sunken chrome as CRM. */
export function AutopilotTableSkeletonRows({
  rows = 8,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="sk-crm-skeleton-row">
          {Array.from({ length: columns }, (_, col) => (
            <td
              key={col}
              className={
                col === 0
                  ? "min-w-0 px-3 py-2.5"
                  : col === columns - 1
                    ? "px-3 py-2.5"
                    : "px-3 py-2.5"
              }
            >
              {col === 0 ? (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="sk-skeleton-block h-8 w-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div
                      className="sk-skeleton-block h-3.5 rounded-md"
                      style={{
                        width: `${55 + (i % 3) * 10}%`,
                        maxWidth: 180,
                      }}
                    />
                    <div
                      className="sk-skeleton-block h-2.5 rounded-md"
                      style={{
                        width: `${35 + (i % 4) * 8}%`,
                        maxWidth: 120,
                      }}
                    />
                  </div>
                </div>
              ) : col === columns - 1 ? (
                <div className="sk-skeleton-block h-6 w-20 rounded-full" />
              ) : (
                <div
                  className="sk-skeleton-block h-3.5 rounded-md"
                  style={{
                    width: `${50 + ((i + col) % 4) * 10}%`,
                    maxWidth: 140,
                  }}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Standalone panel skeleton for route `loading.tsx` / queue panels. */
export function AutopilotTableSkeleton({
  rows = 8,
  columns = 4,
  headers,
}: {
  rows?: number;
  columns?: number;
  headers?: string[];
}) {
  const cols = headers?.length ?? columns;
  const labels = headers ?? Array.from({ length: cols }, () => "");

  return (
    <div className="sk-data-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm sm:rounded-2xl">
      <div className="sk-data-panel__scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full table-fixed text-sm" aria-hidden>
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              {labels.map((label, i) => (
                <th
                  key={i}
                  className="sticky top-0 z-10 bg-transparent px-3 py-2 font-semibold"
                >
                  {label || (
                    <div className="sk-skeleton-block h-3 w-16 rounded" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AutopilotTableSkeletonRows rows={rows} columns={cols} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Compact list skeleton (e.g. sniper queue while loading). */
export function AutopilotListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-data-row gap-3 py-3">
          <div className="sk-skeleton-block h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div
              className="sk-skeleton-block h-3.5 rounded-md"
              style={{ width: `${58 + (i % 3) * 12}%` }}
            />
            <div
              className="sk-skeleton-block h-3 rounded-md"
              style={{ width: `${40 + (i % 4) * 8}%` }}
            />
          </div>
          <div className="sk-skeleton-block h-7 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
