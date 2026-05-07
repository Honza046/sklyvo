export default function WorkspaceLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-start pb-8 pt-8">
      {/* Hlavička s ikonou */}
      <div className="mb-8 flex flex-col items-center space-y-4 px-4 text-center animate-pulse">
        <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-8 w-64 rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-96 max-w-full rounded-md bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Kontejner pro karty */}
      <div className="flex w-full max-w-3xl flex-col gap-6 px-4 md:px-8">
        {/* Karta 1: Předplatné */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:flex-row sm:items-center md:p-8">
          <div className="w-full space-y-3 animate-pulse">
            <div className="h-3 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-32 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-10 w-36 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Karta 2: Nabízené služby */}
        <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
          <div className="flex animate-pulse items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-40 rounded-md bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
          <div className="space-y-6 pt-2 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 w-full max-w-lg rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 rounded-md bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="space-y-3">
              <div className="h-3 w-32 rounded-md bg-slate-200 dark:bg-slate-800" />
              {/* Simulace štítků pro služby */}
              <div className="flex flex-wrap gap-2">
                <div className="h-8 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-40 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-36 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="h-3 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="flex gap-3">
                <div className="h-11 flex-1 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-11 w-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        </div>

        {/* Karta 3: Spotřeba a Kredity */}
        <div className="flex animate-pulse items-center justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-6 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
