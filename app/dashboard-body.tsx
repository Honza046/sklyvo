import { getDashboardData, getDashboardFunnelStats } from "@/app/actions/dashboard";
import type { LeadStatus } from "@/app/actions/dashboard";
import { DashboardConversionFunnel } from "@/components/dashboard-conversion-funnel";
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

function attentionTaskSubtitle(status: LeadStatus): string {
  if (status === "NEW") return "Čeká na první oslovení";
  return "Klient odpověděl, nutná reakce";
}

function AttentionTaskIcon({ status }: { status: LeadStatus }) {
  if (status === "NEW") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 sm:h-8 sm:w-8">
        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 sm:h-8 sm:w-8">
      <MessageCircleWarning className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
  const [dashboardData, funnelInitialCounts] = await Promise.all([
    getDashboardData(),
    getDashboardFunnelStats(30),
  ]);
  const recentActivity: DashboardActivityItem[] = dashboardData.recentActivities;
  const leadsCount = dashboardData.statusCounts.NEW;
  const totalLeads = Object.values(dashboardData.statusCounts).reduce((sum, count) => sum + count, 0);
  const activeDeals = Math.max(0, totalLeads - dashboardData.statusCounts.CLOSED_LOST);
  const pipelineValue = dashboardData.totalValue;
  const attentionRows = dashboardData.attentionTasks;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 md:gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800 sm:rounded-2xl sm:p-4">
          <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
            <div className="rounded-md bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 sm:rounded-lg sm:p-2">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
              Nové leady
            </h3>
          </div>
          <p className="text-base font-bold tabular-nums text-foreground sm:text-xl">{leadsCount}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800 sm:rounded-2xl sm:p-4">
          <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
            <div className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 sm:rounded-lg sm:p-2">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
              Odeslané e-maily
            </h3>
          </div>
          <p className="text-base font-bold tabular-nums text-foreground sm:text-xl">{emailsSent}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800 sm:rounded-2xl sm:p-4">
          <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
            <div className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 sm:rounded-lg sm:p-2">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
              Aktivní Dealy
            </h3>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-base font-bold tabular-nums text-foreground sm:text-xl">{activeDeals}</p>
            <p className="mb-0.5 shrink-0 text-right text-[9px] font-medium leading-tight text-muted-foreground sm:text-[10px]">
              V CRM
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800 sm:rounded-2xl sm:p-4">
          <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
            <div className="rounded-md bg-purple-50 p-1.5 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 sm:rounded-lg sm:p-2">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
              Hodnota Pipeline
            </h3>
          </div>
          <p className="text-base font-bold tabular-nums leading-tight text-foreground sm:text-xl">
            {formatCurrency(pipelineValue)}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 lg:grid-cols-3 lg:gap-4">
        <div className="flex h-full min-h-0 flex-col gap-2.5 lg:col-span-2 lg:gap-4">
          <DashboardConversionFunnel initialCounts={funnelInitialCounts} />

          {/* ZDE ZAČÍNÁ BLOK NEDÁVNÉ AKTIVITY */}
          <div className="flex min-h-0 w-full flex-1 flex-col rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:p-6">
            <div className="mb-2 flex shrink-0 items-center justify-between sm:mb-4">
              <h3 className="m-0 text-sm font-bold text-foreground sm:text-lg">Nedávná aktivita</h3>
              <span className="text-[10px] text-muted-foreground sm:text-xs">
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
              <ul className="custom-scrollbar min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto rounded-lg border border-border/40 bg-muted/20 dark:bg-muted/15">
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
          </div>
          {/* ZDE KONČÍ BLOK NEDÁVNÉ AKTIVITY */}
        </div> {/* <--- TADY JE TEN CHYBĚJÍCÍ DIV PRO LEVÝ SLOUPEC! */}
        
        <div className="flex h-full min-h-0 flex-col gap-2.5 lg:gap-4">
          <div className="flex shrink-0 flex-col rounded-xl border border-border/60 bg-card p-2.5 shadow-sm sm:rounded-2xl md:p-4">
            <h2 className="mb-1.5 shrink-0 text-sm font-bold sm:mb-2 sm:text-base">Rychlé akce</h2>

            <div className="flex shrink-0 flex-col gap-1.5 sm:gap-2">
              <Link
                href="/radar"
                className="group flex items-center justify-between rounded-lg border border-border/60 bg-background p-2 transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-800 sm:rounded-xl sm:p-2.5"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="rounded-md bg-blue-50 p-1.5 text-blue-600 transition-transform group-hover:scale-110 dark:bg-blue-900/30 dark:text-blue-400 sm:rounded-lg sm:p-2">
                    <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold sm:text-sm">Spustit Auto Prospector</p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                      Hledat nové firmy
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 translate-x-0 text-muted-foreground transition-colors group-hover:translate-x-1 group-hover:text-blue-600 sm:h-4 sm:w-4" />
              </Link>

              <Link
                href="/sniper"
                className="group flex items-center justify-between rounded-lg border border-border/60 bg-background p-2 transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-800 sm:rounded-xl sm:p-2.5"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-900/30 dark:text-emerald-400 sm:rounded-lg sm:p-2">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold sm:text-sm">Napsat Cold E-mail</p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                      Direct Outreach
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 translate-x-0 text-muted-foreground transition-colors group-hover:translate-x-1 group-hover:text-emerald-600 sm:h-4 sm:w-4" />
              </Link>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-2.5 shadow-sm sm:gap-4 sm:rounded-2xl sm:p-4">
            <h3 className="shrink-0 text-sm font-semibold text-foreground sm:text-base">K řešení</h3>
            <div className="custom-scrollbar flex-1 overflow-y-auto pr-1 sm:pr-2">
              {attentionRows.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center sm:min-h-[200px] sm:gap-3 sm:px-4 sm:py-10">
                  <div className="rounded-full bg-muted p-3 text-muted-foreground sm:p-4">
                    <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground sm:text-sm">Zatím žádné úkoly k řešení</p>
                    <p className="max-w-[260px] text-[10px] text-muted-foreground sm:text-xs">
                      Jakmile se objeví nové firmy, uvidíte je zde.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-0">
                  {attentionRows.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between border-b border-border/40 p-2 transition-colors last:border-0 hover:bg-muted/50 sm:p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <AttentionTaskIcon status={task.status} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-xs font-medium sm:text-sm">{task.companyName}</span>
                          <span className="text-[9px] text-muted-foreground sm:text-[10px]">
                            {attentionTaskSubtitle(task.status)}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] sm:text-xs" asChild>
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