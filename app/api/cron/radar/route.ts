import { NextResponse } from "next/server";
import { processScheduledRadarRuns } from "@/lib/cron/radar-jobs";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processScheduledRadarRuns();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznámá chyba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
