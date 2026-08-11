export default function HelpLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden px-4 pb-8">
      <div className="mb-3 shrink-0 space-y-1 text-center sm:mb-4 md:mb-5">
        <div className="mb-2 flex items-center justify-center">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="mx-auto h-7 w-28 animate-pulse rounded-md bg-slate-200" />
        <div className="mx-auto h-4 w-80 animate-pulse rounded-md bg-slate-200" />
      </div>

      {/* Chat teaser */}
      <div className="mb-4 h-14 w-full max-w-xl animate-pulse rounded-2xl bg-slate-100" />

      {/* Guide cards */}
      <div className="mb-6 grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="sk-ghost-card flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* FAQ columns */}
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, col) => (
          <div key={col} className="flex flex-col gap-3">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            {[...Array(4)].map((_, row) => (
              <div
                key={row}
                className="h-4 w-full animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
