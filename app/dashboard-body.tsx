import { getDashboardData } from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import {
  Users,
  Mail,
  Target,
  ArrowRight,
  Activity,
  Zap,
  Clock,
  MessageCircleWarning,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatActivityTime = (date: Date) => {
  const now = new Date();
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Právě teď";
  if (date.toDateString() === now.toDateString()) {
    return `Dnes, ${new Intl.DateTimeFormat("cs-CZ", { hour: "2-digit", minute: "2-digit" }).format(date)}`;
  }
  if (minutes < 60) return `Před ${minutes} min`;
  if (hours < 24) return `Před ${hours} h`;
  if (days < 7) return `Před ${days} dny`;

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type LeadStatus = "NEW" | "CONTACTED" | "REPLIED" | "MEETING_SET" | "CLOSED_WON" | "CLOSED_LOST";

const STATUS_META: Array<{
  key: LeadStatus;
  label: string;
  dotClass: string;
  rowBgClass: string;
  badgeClass: string;
}> = [
  {
    key: "NEW",
    label: "Nový lead",
    dotClass: "bg-slate-500",
    rowBgClass: "bg-slate-500 dark:bg-slate-400",
    badgeClass:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    key: "CONTACTED",
    label: "Kontaktováno",
    dotClass: "bg-blue-500",
    rowBgClass: "bg-blue-500 dark:bg-blue-400",
    badgeClass:
      "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    key: "REPLIED",
    label: "Follow up",
    dotClass: "bg-amber-500",
    rowBgClass: "bg-amber-500 dark:bg-amber-400",
    badgeClass:
      "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    key: "MEETING_SET",
    label: "Komunikace",
    dotClass: "bg-violet-500",
    rowBgClass: "bg-violet-500 dark:bg-violet-400",
    badgeClass:
      "border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  },
  {
    key: "CLOSED_WON",
    label: "Domluveno",
    dotClass: "bg-emerald-500",
    rowBgClass: "bg-emerald-500 dark:bg-emerald-400",
    badgeClass:
      "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    key: "CLOSED_LOST",
    label: "Nedomluveno",
    dotClass: "bg-rose-500",
    rowBgClass: "bg-rose-500 dark:bg-rose-400",
    badgeClass:
      "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  },
];

function attentionTaskSubtitle(status: LeadStatus): string {
  if (status === "NEW") return "Čeká na první oslovení";
  return "Klient odpověděl, nutná reakce";
}

function AttentionTaskIcon({ status }: { status: LeadStatus }) {
  if (status === "NEW") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <Clock className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
      <MessageCircleWarning className="h-4 w-4" />
    </div>
  );
}

type DashboardActivityItem = {
  id: string;
  companyName: string;
  leadStatus: LeadStatus;
  updatedAt: Date;
  createdAt: Date;
};

export async function DashboardBody({ emailsSent }: { emailsSent: number }) {
  const dashboardData = await getDashboardData();
  const recentActivity: DashboardActivityItem[] = dashboardData.recentActivities;
  const leadsCount = dashboardData.statusCounts.NEW;
  const totalLeads = Object.values(dashboardData.statusCounts).reduce((sum, count) => sum + count, 0);
  const activeDeals = Math.max(0, totalLeads - dashboardData.statusCounts.CLOSED_LOST);
  const pipelineValue = dashboardData.totalValue;
  const maxFunnelBase = totalLeads > 0 ? totalLeads : 0;
  const getFunnelWidth = (value: number) => {
    if (maxFunnelBase === 0 || value <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / maxFunnelBase) * 100)));
  };

  const funnelRows = STATUS_META.map((item) => ({
    ...item,
    count: dashboardData.statusCounts[item.key],
    width: getFunnelWidth(dashboardData.statusCounts[item.key]),
  }));
  const attentionRows = dashboardData.attentionTasks;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Target className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nové leady</h3>
          </div>
          <p className="text-xl font-bold tabular-nums text-foreground">{leadsCount}</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Mail className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Odeslané e-maily
            </h3>
          </div>
          <p className="text-xl font-bold tabular-nums text-foreground">{emailsSent}</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Aktivní Dealy
            </h3>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-xl font-bold tabular-nums text-foreground">{activeDeals}</p>
            <p className="mb-0.5 shrink-0 text-right text-[10px] font-medium leading-tight text-muted-foreground">
              V CRM
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Hodnota Pipeline
            </h3>
          </div>
          <p className="text-xl font-bold tabular-nums leading-tight text-foreground">
            {formatCurrency(pipelineValue)}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-4">
        <div className="flex h-full min-h-0 flex-col gap-4 lg:col-span-2">
          <div className="flex shrink-0 flex-col rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold">
                Konverzní trychtýř{" "}
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                  30 dní
                </span>
              </h2>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
              {funnelRows.map((row) => (
                <div key={row.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.dotClass}`} />{" "}
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{row.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${row.rowBgClass} rounded-full`} style={{ width: `${row.width}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ZDE ZAČÍNÁ BLOK NEDÁVNÉ AKTIVITY */}
          <div className="flex min-h-0 w-full flex-1 flex-col rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h3 className="m-0 text-lg font-bold text-foreground">Nedávná aktivita</h3>
              <span className="text-xs text-muted-foreground">
                {recentActivity.length > 0
                  ? `${recentActivity.length} nejnovějších`
                  : "Za poslední dobu"}
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border/40 bg-muted/30 p-6 text-center dark:bg-muted/20">
                <h4 className="mb-2 m-0 text-base font-semibold text-foreground">Zatím žádná aktivita</h4>
                <p className="m-0 text-sm text-muted-foreground">
                  Jakmile spustíte první akci, objeví se tady chronologie.
                </p>
              </div>
            ) : (
              <ul className="custom-scrollbar mb-4 max-h-[min(280px,40vh)] flex-1 divide-y divide-border/50 overflow-y-auto rounded-lg border border-border/40 bg-muted/20 dark:bg-muted/15">
                {recentActivity.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      Přidán nový lead:{" "}
                      <Link
                        href="/crm"
                        className="font-semibold text-foreground underline-offset-4 hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                      >
                        {item.companyName}
                      </Link>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatActivityTime(item.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-1 shrink-0 w-full text-center">
              <Link
                href="/crm"
                className="text-sm text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Zobrazit celou historii v CRM →
              </Link>
            </div>
          </div>
          {/* ZDE KONČÍ BLOK NEDÁVNÉ AKTIVITY */}
        </div> {/* <--- TADY JE TEN CHYBĚJÍCÍ DIV PRO LEVÝ SLOUPEC! */}
        
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="flex shrink-0 flex-col rounded-2xl border border-border/60 bg-card p-3 shadow-sm md:p-4">
            <h2 className="mb-2 shrink-0 text-base font-bold">Rychlé akce</h2>

            <div className="flex shrink-0 flex-col gap-2">
              <Link
                href="/radar"
                className="group flex items-center justify-between rounded-xl border border-border/60 bg-background p-2.5 transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-800"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-transform group-hover:scale-110 dark:bg-blue-900/30 dark:text-blue-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Spustit Auto Prospector</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Hledat nové firmy
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 translate-x-0 text-muted-foreground transition-colors group-hover:translate-x-1 group-hover:text-blue-600" />
              </Link>

              <Link
                href="/sniper"
                className="group flex items-center justify-between rounded-xl border border-border/60 bg-background p-2.5 transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-800"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Napsat Cold E-mail</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Direct Outreach
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 translate-x-0 text-muted-foreground transition-colors group-hover:translate-x-1 group-hover:text-emerald-600" />
              </Link>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <h3 className="shrink-0 font-semibold text-foreground">K řešení</h3>
            <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
              {attentionRows.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
                  <div className="rounded-full bg-muted p-4 text-muted-foreground">
                    <ClipboardList className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Zatím žádné úkoly k řešení</p>
                    <p className="max-w-[260px] text-xs text-muted-foreground">
                      Jakmile se objeví nové firmy, uvidíte je zde.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-0">
                  {attentionRows.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between border-b border-border/40 p-3 transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <AttentionTaskIcon status={task.status} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">{task.companyName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {attentionTaskSubtitle(task.status)}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                        <Link href="/crm">Vyřešit</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}