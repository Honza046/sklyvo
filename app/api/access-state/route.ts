import { NextResponse } from "next/server";
import { getWorkspaceAccessState } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getWorkspaceAccessState();

  return NextResponse.json(
    {
      isAuthenticated: state.isAuthenticated,
      isBlocked: state.isBlocked,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
