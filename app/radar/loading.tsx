export default function RadarLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden pb-8">
      <div className="mb-2 text-center">
        <div className="mb-1.5 flex items-center justify-center">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="mx-auto h-7 w-24 animate-pulse rounded-md bg-slate-200" />
        <div className="mx-auto mt-1 h-4 w-72 animate-pulse rounded-md bg-slate-200" />
      </div>

      <div className="flex w-full flex-col gap-4">
        {/* Search card */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
          <div className="flex justify-end">
            <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
