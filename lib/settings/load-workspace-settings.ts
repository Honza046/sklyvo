import { getSessionUser } from "@/app/actions/auth";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { parseStoredAiBehaviorSettings } from "@/lib/ai-behavior-settings";
import { personalizeEmailSignature } from "@/lib/email-format";
import type { EmailConnectionState } from "@/lib/email-connection-types";
import { authorFromSessionUser } from "@/lib/lead-provenance";
import { prisma } from "@/lib/prisma";

export type HubTeamMember = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  avatarUrl: string | null;
};

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Kolega";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export type WorkspaceSettingsData = {
  workspaceId: string | null;
  isWorkspaceReady: boolean;
  isFreePlanTier: boolean;
  isAgencyPlan: boolean;
  billingManagerName: string | null;
  planTier: string | null | undefined;
  subscriptionStatus: string;
  creditsLeft: number | null;
  creditsTotal: number | undefined;
  creditPercentage: number;
  daysUntilRenewal: number | null;
  isTrialWithFutureEnd: boolean;
  trialEndsAtIso: string | null;
  subscriptionPeriodEndIso: string | null;
  companyContext: string;
  offeredServices: string[];
  companyServices: string;
  personalizedEmailSignature: string;
  signatureAuthor: string;
  signatureEmail: string;
  systemPrompt: string;
  forbiddenWords: string;
  emailConnection: EmailConnectionState | null;
  hasCompanyProfile: boolean;
  hasOfferedServices: boolean;
  hubSheetsConnected: boolean;
  hubMicrosoftConnected: boolean;
  hubFakturoidConnected: boolean;
  hubMemberCount: number;
  hubTeamMembers: HubTeamMember[];
};

export async function loadWorkspaceSettings(): Promise<WorkspaceSettingsData> {
  const session = await getSessionUser();
  const workspace = session.workspace;
  const isWorkspaceReady = Boolean(workspace);

  const planTier = workspace?.planTier;
  const isFreePlanTier =
    !planTier || planTier === "NONE" || planTier === "FREE";
  const isAgencyPlan =
    typeof planTier === "string" && planTier.toUpperCase().includes("AGENCY");

  let billingManagerName: string | null = null;
  if (isAgencyPlan && workspace?.id) {
    const owner = await prisma.user.findFirst({
      where: { workspaceId: workspace.id, role: "OWNER" },
      select: { name: true, email: true },
    });
    const name = owner?.name?.trim();
    if (name) {
      billingManagerName = name;
    } else if (owner?.email) {
      const local = owner.email.split("@")[0] ?? "";
      billingManagerName = local
        ? local.charAt(0).toUpperCase() + local.slice(1)
        : null;
    }
  }

  const creditsUsed = workspace?.creditsUsed;
  const creditsTotal = workspace?.creditsTotal;
  const creditsLeft =
    typeof creditsUsed === "number" && typeof creditsTotal === "number"
      ? Math.max(0, creditsTotal - creditsUsed)
      : null;
  const creditPercentage =
    typeof creditsUsed === "number" &&
    typeof creditsTotal === "number" &&
    creditsTotal > 0
      ? (creditsUsed / creditsTotal) * 100
      : 0;

  const nowMs = Date.now();
  const trialEndsAt = workspace?.trialEndsAt;
  const subscriptionPeriodEnd = workspace?.subscriptionPeriodEnd;
  const subscriptionStatus = workspace?.subscriptionStatus ?? "FREE";

  const status = (subscriptionStatus ?? "FREE").toUpperCase();
  const isTrialWithFutureEnd =
    (status === "TRIAL" || status === "TRIALING") &&
    trialEndsAt &&
    !Number.isNaN(trialEndsAt.getTime()) &&
    nowMs < trialEndsAt.getTime();

  const renewalReferenceDate = isTrialWithFutureEnd
    ? trialEndsAt
    : subscriptionPeriodEnd;

  const daysUntilRenewal =
    renewalReferenceDate && !Number.isNaN(renewalReferenceDate.getTime())
      ? Math.max(
          0,
          Math.ceil(
            (renewalReferenceDate.getTime() - nowMs) / (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  const aiBehaviorSettings = parseStoredAiBehaviorSettings(
    workspace?.systemPrompt,
  );
  const signatureAuthor =
    authorFromSessionUser(session.user) ||
    session.user?.name?.trim() ||
    "User";
  const signatureEmail = session.user?.email?.trim() || "";
  const personalizedEmailSignature = personalizeEmailSignature(
    workspace?.emailSignature ?? "",
    { fullName: signatureAuthor, senderEmail: signatureEmail },
  );
  const emailConnection = isWorkspaceReady
    ? await getEmailConnectionState()
    : null;

  const companyContext = workspace?.companyContext?.trim() ?? "";
  const offeredServices = workspace?.offeredServices ?? [];

  let hubSheetsConnected = false;
  let hubMicrosoftConnected = false;
  let hubFakturoidConnected = false;
  let hubMemberCount = 0;
  let hubTeamMembers: HubTeamMember[] = [];

  if (workspace?.id) {
    const hubExtras = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      select: {
        googleSheetsConnection: { select: { status: true } },
        microsoftConnection: { select: { status: true } },
        fakturoidConnection: { select: { connectedAt: true } },
        members: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });
    hubSheetsConnected =
      hubExtras?.googleSheetsConnection?.status === "CONNECTED";
    hubMicrosoftConnected =
      hubExtras?.microsoftConnection?.status === "CONNECTED";
    hubFakturoidConnected = Boolean(hubExtras?.fakturoidConnection?.connectedAt);
    hubTeamMembers =
      hubExtras?.members.map((member) => ({
        id: member.id,
        name: member.name?.trim() || displayNameFromEmail(member.email),
        email: member.email,
        role: member.role,
        avatarUrl: member.avatarUrl?.trim() || null,
      })) ?? [];
    hubMemberCount = hubTeamMembers.length;
  }

  return {
    workspaceId: workspace?.id ?? null,
    isWorkspaceReady,
    isFreePlanTier,
    isAgencyPlan,
    billingManagerName,
    planTier,
    subscriptionStatus,
    creditsLeft,
    creditsTotal,
    creditPercentage,
    daysUntilRenewal,
    isTrialWithFutureEnd: Boolean(isTrialWithFutureEnd),
    trialEndsAtIso: trialEndsAt?.toISOString() ?? null,
    subscriptionPeriodEndIso: subscriptionPeriodEnd?.toISOString() ?? null,
    companyContext,
    offeredServices,
    companyServices: workspace?.companyServices ?? "",
    personalizedEmailSignature,
    signatureAuthor,
    signatureEmail,
    systemPrompt: aiBehaviorSettings.systemPrompt,
    forbiddenWords: aiBehaviorSettings.forbiddenWords,
    emailConnection,
    hasCompanyProfile: companyContext.length > 40,
    hasOfferedServices: offeredServices.length > 0,
    hubSheetsConnected,
    hubMicrosoftConnected,
    hubFakturoidConnected,
    hubMemberCount,
    hubTeamMembers,
  };
}
