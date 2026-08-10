"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/actions/auth";

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
