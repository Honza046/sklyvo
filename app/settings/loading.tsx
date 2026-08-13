export default function WorkspaceLoading() {
  return (
    <div className="sk-settings-hub">
      <div className="sk-settings-hub__head shrink-0 animate-pulse space-y-2 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-slate-200 sm:h-14 sm:w-14" />
        <div className="mx-auto h-7 w-48 rounded-md bg-slate-200 sm:h-8 sm:w-56" />
        <div className="mx-auto h-4 w-72 max-w-full rounded-md bg-slate-200" />
      </div>

      <div className="sk-settings-hub__grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="sk-ghost-card flex h-full animate-pulse items-start gap-3 rounded-xl border border-border/60 bg-card p-4 sm:rounded-2xl sm:p-5"
          >
            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-28 rounded-md bg-slate-200 sm:h-5 sm:w-32" />
              <div className="h-3 w-full rounded-md bg-slate-200" />
              <div className="h-3 w-20 rounded-md bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="sk-settings-hub__foot shrink-0 animate-pulse">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
          <div className="h-10 w-28 rounded-md bg-slate-200" />
          <div className="h-9 min-w-[12rem] flex-1 rounded-lg bg-slate-200" />
          <div className="h-9 w-36 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
