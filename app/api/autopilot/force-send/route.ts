import { NextResponse } from "next/server";
import { forceSendAutopilotEmailQueue } from "@/app/actions/autopilot";
import { readSessionUserId } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    // Defense-in-depth: do not rely only on the action's internal session check.
    const userId = await readSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Nejste přihlášen." }, { status: 401 });
    }

    const result = await forceSendAutopilotEmailQueue();

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznámá chyba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
