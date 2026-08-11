export default function UlozisteLoading() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center overflow-hidden">
      <div className="mb-3 shrink-0 space-y-1 text-center">
        <div className="mb-2 flex items-center justify-center">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="mx-auto h-7 w-28 animate-pulse rounded-md bg-slate-200" />
        <div className="mx-auto h-4 w-64 animate-pulse rounded-md bg-slate-200" />
      </div>

      {/* Tabs */}
      <div className="mb-3 flex shrink-0 items-center gap-3">
        <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex w-full shrink-0 items-center gap-3 px-4">
        <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200" />
      </div>

      {/* File grid */}
      <div className="grid w-full grid-cols-2 gap-3 px-4 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm"
          >
            <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
