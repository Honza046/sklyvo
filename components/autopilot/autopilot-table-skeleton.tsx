import { cn } from "@/lib/utils";

function GhostBar({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("sk-ghost-spot inline-block max-w-full", className)}
      style={style}
      aria-hidden
    />
  );
}

type AutopilotSkeletonVariant = "lead" | "sniper" | "full-auto";

function resolveVariant(
  variant: AutopilotSkeletonVariant | undefined,
  columns: number,
): AutopilotSkeletonVariant {
  if (variant) return variant;
  if (columns >= 6) return "sniper";
  return "lead";
}

/** Ghost rows — same cell markup as loaded Autopilot tables. */
export function AutopilotTableSkeletonRows({
  rows = 8,
  columns = 4,
  variant,
}: {
  rows?: number;
  columns?: number;
  variant?: AutopilotSkeletonVariant;
}) {
  const layout = resolveVariant(variant, columns);

  return (
    <>
      {Array.from({ length: rows }, (_, i) => {
        const nameW = `${52 + (i % 4) * 9}%`;
        const subW = `${38 + (i % 3) * 10}%`;
        const contactW = `${58 + (i % 3) * 8}%`;
        const phoneW = `${42 + (i % 4) * 7}%`;
        const statusW = 64 + (i % 3) * 14;

        if (layout === "sniper") {
          return (
            <tr key={i} className="sk-ap-skeleton-row" aria-hidden>
              <td className="px-2 py-2.5 text-center">
                <div className="flex justify-center">
                  <GhostBar className="h-4 w-4 rounded-[4px]" />
                </div>
              </td>
              <td className="min-w-0 px-3 py-2.5">
                <p className="truncate">
                  <GhostBar className="h-[14px] rounded" style={{ width: nameW }} />
                </p>
              </td>
              <td className="px-2 py-2.5 text-center">
                <GhostBar className="mx-auto h-8 w-8 rounded-lg" />
              </td>
              <td className="min-w-0 overflow-hidden px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-0.5">
                  <GhostBar className="h-3.5 w-3.5 shrink-0 rounded-[3px]" />
                  <GhostBar
                    className="h-[14px] min-w-0 flex-1 rounded"
                    style={{ width: contactW }}
                  />
                </div>
              </td>
              <td className="min-w-0 overflow-hidden px-3 py-2.5">
                <span className="flex min-w-0 items-center">
                  <GhostBar className="mr-1.5 h-3.5 w-3.5 shrink-0 rounded-[3px]" />
                  <GhostBar
                    className="h-[14px] flex-1 rounded"
                    style={{ width: phoneW }}
                  />
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <GhostBar className="h-[14px] rounded" style={{ width: 72 }} />
              </td>
            </tr>
          );
        }

        if (layout === "full-auto") {
          return (
            <tr key={i} className="sk-ap-skeleton-row" aria-hidden>
              <td className="px-6 py-3.5">
                <div className="min-w-0">
                  <p className="truncate">
                    <GhostBar className="h-4 rounded" style={{ width: nameW }} />
                  </p>
                  <span className="mt-0.5 inline-flex max-w-full items-center gap-1">
                    <GhostBar className="h-3 w-3 shrink-0 rounded-[3px]" />
                    <GhostBar
                      className="h-3 flex-1 rounded"
                      style={{ width: subW }}
                    />
                  </span>
                </div>
              </td>
              <td className="px-6 py-3.5">
                <div className="flex min-w-0 items-center gap-0.5">
                  <GhostBar className="h-3.5 w-3.5 shrink-0 rounded-[3px]" />
                  <GhostBar
                    className="h-3 min-w-0 flex-1 rounded"
                    style={{ width: contactW }}
                  />
                </div>
              </td>
              <td className="px-6 py-3.5">
                <GhostBar className="h-3 rounded" style={{ width: 120 }} />
              </td>
              <td className="px-6 py-3.5">
                <GhostBar
                  className="h-[22px] rounded-full"
                  style={{ width: statusW }}
                />
              </td>
            </tr>
          );
        }

        return (
          <tr key={i} className="sk-ap-skeleton-row" aria-hidden>
            <td className="px-3 py-2.5">
              <p className="break-words">
                <GhostBar className="h-[13px] rounded" style={{ width: nameW }} />
              </p>
              <span className="mt-0.5 flex min-w-0 items-center break-words">
                <GhostBar className="mr-1 h-3 w-3 shrink-0 rounded-[3px]" />
                <GhostBar
                  className="h-[11px] flex-1 rounded"
                  style={{ width: subW }}
                />
              </span>
            </td>
            <td className="px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-0.5">
                <GhostBar className="h-3.5 w-3.5 shrink-0 rounded-[3px]" />
                <GhostBar
                  className="h-[13px] min-w-0 flex-1 rounded"
                  style={{ width: contactW }}
                />
              </div>
              <span className="mt-0.5 flex min-w-0 items-center break-words">
                <GhostBar className="mr-1.5 h-3.5 w-3.5 shrink-0 rounded-[3px]" />
                <GhostBar
                  className="h-[11px] flex-1 rounded"
                  style={{ width: phoneW }}
                />
              </span>
            </td>
            <td className="px-3 py-2.5">
              <GhostBar className="h-[13px] rounded" style={{ width: 88 }} />
            </td>
            <td className="px-3 py-2.5">
              <GhostBar
                className="h-[11px] rounded"
                style={{ width: statusW }}
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}

/** Standalone panel skeleton for route `loading.tsx` / queue panels. */
export function AutopilotTableSkeleton({
  rows = 8,
  columns = 4,
  headers,
  variant,
}: {
  rows?: number;
  columns?: number;
  headers?: string[];
  variant?: AutopilotSkeletonVariant;
}) {
  const cols = headers?.length ?? columns;
  const labels = headers ?? Array.from({ length: cols }, () => "");

  return (
    <div className="sk-data-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-[color:var(--n-card)] shadow-sm sm:rounded-2xl">
      <div className="sk-data-panel__scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full table-fixed text-sm" aria-hidden>
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              {labels.map((label, i) => (
                <th
                  key={i}
                  className="sticky top-0 z-10 bg-transparent px-3 py-2 font-semibold"
                >
                  {label || <GhostBar className="h-3 w-16 rounded" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AutopilotTableSkeletonRows
              rows={rows}
              columns={cols}
              variant={variant}
            />
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
        <div key={i} className="sk-data-row gap-3 py-3" aria-hidden>
          <GhostBar className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <GhostBar
              className="h-3.5 rounded-md"
              style={{ width: `${58 + (i % 3) * 12}%` }}
            />
            <GhostBar
              className="h-3 rounded-md"
              style={{ width: `${40 + (i % 4) * 8}%` }}
            />
          </div>
          <GhostBar className="h-7 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
