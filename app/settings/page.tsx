import { getSessionUser } from "@/app/actions/auth";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { SettingsWorkspaceView } from "@/app/settings/settings-workspace-view";
import { parseStoredAiBehaviorSettings } from "@/lib/ai-behavior-settings";
import { personalizeEmailSignature } from "@/lib/email-format";
import { authorFromSessionUser } from "@/lib/lead-provenance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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

  const isTrialWithFutureEnd =
    subscriptionStatus === "TRIAL" &&
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

  return (
    <SettingsWorkspaceView
      isWorkspaceReady={isWorkspaceReady}
      isFreePlanTier={isFreePlanTier}
      isAgencyPlan={isAgencyPlan}
      billingManagerName={billingManagerName}
      planTier={planTier}
      subscriptionStatus={subscriptionStatus}
      creditsLeft={creditsLeft}
      creditsTotal={creditsTotal}
      creditPercentage={creditPercentage}
      daysUntilRenewal={daysUntilRenewal}
      isTrialWithFutureEnd={Boolean(isTrialWithFutureEnd)}
      trialEndsAtIso={trialEndsAt?.toISOString() ?? null}
      subscriptionPeriodEndIso={subscriptionPeriodEnd?.toISOString() ?? null}
      companyContext={workspace?.companyContext ?? ""}
      offeredServices={workspace?.offeredServices ?? []}
      companyServices={workspace?.companyServices ?? ""}
      personalizedEmailSignature={personalizedEmailSignature}
      signatureAuthor={signatureAuthor}
      signatureEmail={signatureEmail}
      systemPrompt={aiBehaviorSettings.systemPrompt}
      forbiddenWords={aiBehaviorSettings.forbiddenWords}
      emailConnection={emailConnection}
    />
  );
}
