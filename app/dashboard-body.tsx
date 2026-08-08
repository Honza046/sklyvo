import { getDashboardData, getDashboardFunnelStats } from "@/app/actions/dashboard";
import type { LeadStatus } from "@/app/actions/dashboard";
import { DashboardConversionFunnel } from "@/components/dashboard-conversion-funnel";
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
  return "Klient odpověděl";
}

function AttentionTaskIcon({ status }: { status: LeadStatus }) {
  if (status === "NEW") {
    return (
      <span className="sk-list__icon">
        <Clock className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="sk-list__icon sk-list__icon--alert">
      <MessageCircleWarning className="h-3.5 w-3.5" />
    </span>
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
    <div className="sk-dashboard-scroll scrollbar-hide flex min-h-0 w-full flex-1 flex-col gap-2 md:gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4 lg:gap-3">
        <div className="sk-stat">
          <div className="mb-0.5 flex items-center gap-1.5">
            <div className="sk-chip">
              <Target />
            </div>
            <h3 className="sk-stat__label">Nové leady</h3>
          </div>
          <p className="sk-stat__value">{leadsCount}</p>
        </div>

        <div className="sk-stat">
          <div className="mb-0.5 flex items-center gap-1.5">
            <div className="sk-chip">
              <Mail />
            </div>
            <h3 className="sk-stat__label">Odeslané e-maily</h3>
          </div>
          <p className="sk-stat__value">{emailsSent}</p>
        </div>

        <div className="sk-stat">
          <div className="mb-0.5 flex items-center gap-1.5">
            <div className="sk-chip">
              <Users />
            </div>
            <h3 className="sk-stat__label">Aktivní Dealy</h3>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="sk-stat__value">{activeDeals}</p>
            <p className="sk-stat__suffix">V CRM</p>
          </div>
        </div>

        <div className="sk-stat">
          <div className="mb-0.5 flex items-center gap-1.5">
            <div className="sk-chip">
              <Activity />
            </div>
            <h3 className="sk-stat__label">Hodnota Pipeline</h3>
          </div>
          <p className="sk-stat__value leading-tight">{formatCurrency(pipelineValue)}</p>
        </div>
      </div>

      <div className="sk-overview-grid">
        <div className="sk-overview-grid__left">
          <div className="shrink-0">
            <DashboardConversionFunnel initialCounts={funnelInitialCounts} />
          </div>

          <div className="sk-surface sk-panel-bottom flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h3 className="m-0 text-sm font-bold text-[color:var(--sk-ink)] sm:text-base">
                Nedávná aktivita
              </h3>
              <span className="text-[10px] text-[color:var(--sk-muted)] sm:text-xs">
                {recentActivity.length > 0
                  ? `${recentActivity.length} nejnovějších`
                  : "Za poslední dobu"}
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="sk-surface--empty flex-1">
                <h4 className="mb-1 m-0 text-sm font-semibold text-[color:var(--sk-ink)] sm:mb-2 sm:text-base">
                  Zatím žádná aktivita
                </h4>
                <p className="m-0 text-xs text-[color:var(--sk-muted)] sm:text-sm">
                  Jakmile spustíte první akci, objeví se tady chronologie.
                </p>
              </div>
            ) : (
              <ul className="sk-list sk-panel-bottom__scroll scrollbar-hide">
                {recentActivity.map((item) => (
                  <li key={item.id} className="sk-list__row sk-list__row--activity">
                    <p className="m-0 text-[13px] font-medium leading-snug text-[color:var(--sk-ink)]">
                      Přidán nový lead:{" "}
                      <Link href="/crm" className="sk-link-brand font-semibold underline-offset-4 hover:underline">
                        {item.companyName}
                      </Link>
                    </p>
                    <p className="m-0 mt-1 text-[11.5px] text-[color:var(--sk-muted-soft)]">
                      {formatActivityTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="sk-overview-grid__right">
          <div className="sk-surface sk-surface--pad flex shrink-0 grow-0 flex-col">
            <h2 className="mb-1.5 shrink-0 text-sm font-bold text-[color:var(--sk-ink)] sm:mb-2 sm:text-base">
              Rychlé akce
            </h2>
            <div className="flex shrink-0 flex-col gap-2.5">
              <Link href="/radar" className="sk-action-row group">
                <span className="sk-action-row__icon sk-action-row__icon--dark">
                  <Zap className="h-4 w-4" />
                </span>
                <span className="sk-action-row__body">
                  <span className="sk-action-row__title">Spustit Auto Prospector</span>
                  <span className="sk-action-row__meta">Hledat nové firmy</span>
                </span>
                <span className="sk-action-row__go">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <Link href="/sniper" className="sk-action-row group">
                <span className="sk-action-row__icon">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="sk-action-row__body">
                  <span className="sk-action-row__title">Napsat Cold E-mail</span>
                  <span className="sk-action-row__meta">Direct Outreach</span>
                </span>
                <span className="sk-action-row__go">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="sk-surface sk-panel-bottom flex min-h-0 flex-1 flex-col overflow-hidden">
            <h3 className="mb-2 shrink-0 text-sm font-bold text-[color:var(--sk-ink)] sm:text-base">
              K řešení
            </h3>
            <div className="sk-panel-bottom__scroll scrollbar-hide">
              {attentionRows.length === 0 ? (
                <div className="sk-surface--empty">
                  <div className="sk-list__icon sk-list__icon--lg">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[color:var(--sk-ink)] sm:text-sm">
                      Zatím žádné úkoly k řešení
                    </p>
                    <p className="max-w-[260px] text-[10px] text-[color:var(--sk-muted)] sm:text-xs">
                      Jakmile se objeví nové firmy, uvidíte je zde.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="sk-list">
                  {attentionRows.map((task) => (
                    <div key={task.id} className="sk-list__row">
                      <AttentionTaskIcon status={task.status} />
                      <div className="sk-list__body">
                        <div className="sk-list__title">{task.companyName}</div>
                        <div className="sk-list__meta">
                          {attentionTaskSubtitle(task.status)}
                        </div>
                      </div>
                      <Link href="/crm" className="sk-btn sk-btn--secondary sk-btn--row">
                        Vyřešit
                      </Link>
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
