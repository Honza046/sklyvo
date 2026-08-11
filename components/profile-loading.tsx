/** Načítací rozvržení pro `/account` (Můj profil) — shodné pro route `loading.tsx` i `if (isLoading)`. */
export function ProfilePageSkeleton() {
  const closedAccordionRows = [
    { key: "security", barClass: "h-5 w-40 rounded-md bg-slate-200 " },
    { key: "linked", barClass: "h-5 w-56 rounded-md bg-slate-200 " },
    { key: "billing", barClass: "h-5 w-48 rounded-md bg-slate-200 " },
  ];

  return (
    <div className="flex h-full w-full flex-col items-center justify-start pb-8 pt-8">
      {/* Hlavička s ikonou */}
      <div className="mb-8 flex animate-pulse flex-col items-center space-y-4 px-4 text-center">
        <div className="h-12 w-12 rounded-xl bg-slate-200 " />
        <div className="h-8 w-48 rounded-md bg-slate-200 " />
        <div className="h-4 w-80 max-w-full rounded-md bg-slate-200 " />
      </div>

      {/* Kontejner pro karty */}
      <div className="flex w-full max-w-3xl flex-col gap-4 px-4 md:px-8">
        {/* Karta 1: Osobní údaje */}
        <div className="sk-ghost-card flex flex-col gap-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
          <div className="flex animate-pulse items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-md bg-slate-200 " />
              <div className="h-6 w-32 rounded-md bg-slate-200 " />
            </div>
          </div>

          <div className="flex animate-pulse flex-col gap-8 md:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-4 md:items-start">
              <div className="h-28 w-28 rounded-2xl bg-slate-200 " />
              <div className="h-8 w-24 rounded-xl bg-slate-200 " />
            </div>

            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded-md bg-slate-200 " />
                  <div className="h-11 w-full rounded-xl bg-slate-200 " />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded-md bg-slate-200 " />
                  <div className="h-11 w-full rounded-xl bg-slate-200 " />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-32 rounded-md bg-slate-200 " />
                <div className="h-11 w-full rounded-xl bg-slate-200 " />
              </div>
              <div className="flex justify-end pt-2">
                <div className="h-10 w-32 rounded-xl bg-slate-200 " />
              </div>
            </div>
          </div>
        </div>

        {/* Zavřené akordeony */}
        {closedAccordionRows.map(({ key, barClass }) => (
          <div
            key={key}
            className="sk-ghost-card flex animate-pulse items-center justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-md bg-slate-200 " />
              <div className={barClass} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
