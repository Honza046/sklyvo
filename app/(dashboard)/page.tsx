import { Suspense } from "react";
import { getSessionUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { DashboardBody } from "@/app/dashboard-body";
import {
  DashboardBodySkeleton,
  DASHBOARD_SUBTITLE,
} from "@/components/dashboard-loading";

export default async function DashboardPage() {
  const session = await getSessionUser();
  const firstName = session.user?.firstName ?? "Uživatel";
  const emailsSent = session.workspace?.emailsSent ?? 0;

  return (
    <>
      <div className="mx-auto flex h-[calc(100vh-100px)] min-h-0 w-full max-w-7xl flex-col gap-3 overflow-hidden p-3 md:p-4">
        <div className="mb-2 flex w-full shrink-0 flex-col justify-between gap-2 md:flex-row md:items-end">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Vítejte zpět, {firstName}! 👋
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-9 rounded-xl border-border/60 bg-background font-semibold hover:bg-muted"
              asChild
            >
              <Link href="/crm">Zobrazit CRM</Link>
            </Button>
            <Button
              className="h-9 rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
              asChild
            >
              <Link href="/radar">
                <Plus className="mr-2 h-4 w-4" /> Nové hledání
              </Link>
            </Button>
          </div>
        </div>

        <Suspense
          fallback={
            <>
              <p className="shrink-0 text-sm text-muted-foreground">
                {DASHBOARD_SUBTITLE}{" "}
                <span className="ml-3 inline-flex animate-in fade-in items-center text-sm font-medium text-blue-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Načítám data...
                </span>
              </p>
              <DashboardBodySkeleton />
            </>
          }
        >
          <>
            <p className="shrink-0 text-sm text-muted-foreground">{DASHBOARD_SUBTITLE}</p>
            <DashboardBody emailsSent={emailsSent} />
          </>
        </Suspense>
      </div>
    </>
  );
}
