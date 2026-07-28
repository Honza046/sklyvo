import { NextResponse } from "next/server";
import { processEmailQueue } from "@/app/actions/autopilot";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createInternalCronToken } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processEmailQueue(50, {
      internalToken: createInternalCronToken("processEmailQueue"),
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznámá chyba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
