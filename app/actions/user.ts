"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { clearSession, getSessionUser } from "@/app/actions/auth";
import { verifyPassword } from "@/lib/password";

export async function uploadProfileAvatar(file: File) {
  try {
    const session = await getSessionUser();
    if (!session?.user?.id) {
      return { error: "Nejste přihlášen." };
    }

    if (!file) {
      return { error: "Nebyl vybrán soubor." };
    }

    // 1. BEZPEČNÉ NAČTENÍ KLÍČŮ A OČIŠTĚNÍ (odstraní případné lomítko na konci)
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    let supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    supabaseUrl = supabaseUrl.trim().replace(/\/$/, "");
    supabaseKey = supabaseKey.trim();

    if (!supabaseUrl || !supabaseKey) {
      return { error: "Chybí Supabase klíče v .env souboru." };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. ABSOLUTNĚ ČISTÝ NÁZEV SOUBORU (jen čas a náhodné číslo, ignorujeme původní název)
    const filePath = `${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;

    // 3. UNIVERZÁLNÍ PŘEVOD SOUBORU (Uint8Array funguje všude, na rozdíl od Bufferu)
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // 4. UPLOAD DO SUPABASE
    const { data, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, fileData, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase error detail:", uploadError);
      return { error: `Upload selhal: ${uploadError.message}` };
    }

    // 5. ZÍSKÁNÍ VEŘEJNÉ URL
    const { data: publicResult } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);
    const avatarUrl = publicResult.publicUrl;

    // 6. ULOŽENÍ DO DATABÁZE
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    });

    // 7. OBNOVENÍ STRÁNKY
    revalidatePath("/settings");
    revalidatePath("/");

    return { avatarUrl };
  } catch (error: any) {
    console.error("Kritická chyba v uploadu:", error);
    return { error: error.message || "Nepodařilo se nahrát avatar." };
  }
}

export async function exportAccountData(): Promise<
  { success: true; data: string; filename: string } | { error: string }
> {
  const session = await getSessionUser();
  if (!session.user?.id || !session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const [user, workspace, leads] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, role: true, createdAt: true },
    }),
    prisma.workspace.findUnique({
      where: { id: session.workspace.id },
      select: {
        name: true,
        companyName: true,
        planTier: true,
        creditsUsed: true,
        creditsTotal: true,
        emailsSent: true,
        leadsCount: true,
      },
    }),
    prisma.lead.findMany({
      where: { workspaceId: session.workspace.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyName: true,
        domain: true,
        email: true,
        phone: true,
        contactEmail: true,
        contactPhone: true,
        status: true,
        source: true,
        value: true,
        createdAt: true,
        lastContactedAt: true,
      },
    }),
  ]);

  if (!user || !workspace) {
    return { error: "Účet nebo workspace nebyl nalezen." };
  }

  const exportedAt = new Date().toISOString();
  const payload = {
    exportedAt,
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      memberSince: user.createdAt.toISOString(),
    },
    workspace: {
      name: workspace.name,
      companyName: workspace.companyName,
      planTier: workspace.planTier,
      creditsUsed: workspace.creditsUsed,
      creditsTotal: workspace.creditsTotal,
      emailsSent: workspace.emailsSent,
      leadsCount: workspace.leadsCount,
    },
    leads: leads.map((lead) => ({
      ...lead,
      createdAt: lead.createdAt.toISOString(),
      lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    })),
  };

  const stamp = exportedAt.slice(0, 10);
  return {
    success: true,
    data: JSON.stringify(payload, null, 2),
    filename: `sklyvo-export-${stamp}.json`,
  };
}

export async function requestAccountDeletion(
  password: string,
): Promise<{ success: true } | { error: string }> {
  const session = await getSessionUser();
  if (!session.user?.id) {
    return { error: "Nejste přihlášen." };
  }

  const trimmedPassword = password.trim();
  if (!trimmedPassword) {
    return { error: "Zadejte heslo pro potvrzení." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true, workspaceId: true, role: true },
  });

  if (!user) {
    return { error: "Účet nebyl nalezen." };
  }

  const check = await verifyPassword(trimmedPassword, user.passwordHash);
  if (!check.ok) {
    return { error: "Heslo není správné." };
  }

  if (user.role === "OWNER") {
    const memberCount = await prisma.user.count({
      where: { workspaceId: user.workspaceId },
    });
    if (memberCount > 1) {
      return {
        error:
          "Nejdřív odeberte ostatní členy týmu nebo převeďte vlastnictví workspace.",
      };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { disabledAt: new Date() },
  });

  await clearSession();
  revalidatePath("/account");
  return { success: true };
}
