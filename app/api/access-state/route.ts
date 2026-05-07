import { NextResponse } from "next/server";
import { getWorkspaceAccessState } from "@/app/actions/auth";

export async function GET() {
  const state = await getWorkspaceAccessState();

  return NextResponse.json({
    isAuthenticated: state.isAuthenticated,
    isBlocked: state.isBlocked,
  });
}
