"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

type RadarSearchInput = {
  query: string;
  limit: number;
};

type RadarLead = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  placeId: string;
  url: string;
  phone: string;
  email: string | null;
};

type GooglePlaceV2 = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  rating?: number;
};

type GoogleTextSearchV2Response = {
  places?: GooglePlaceV2[];
  error?: { message?: string };
};

async function extractEmailFromUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeoutId);

    const html = await response.text();
    const emails = html.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}/g);

    if (emails && emails.length > 0) {
      const valid = emails.filter(
        (e) =>
          !e.endsWith(".png") &&
          !e.endsWith(".jpg") &&
          !e.includes("sentry") &&
          !e.includes("example"),
      );
      return valid.length > 0 ? valid[0] : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function searchRadarLeads(input: RadarSearchInput) {
  const session = await getSessionUser();
  if (!session.user?.id || !session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const normalizedQuery = input.query.trim();
  if (!normalizedQuery) {
    return { error: "Vyhledávací dotaz je povinný." };
  }

  const creditsLeft = (session.workspace.creditsTotal ?? 0) - (session.workspace.creditsUsed ?? 0);
  if (creditsLeft <= 0) {
    return { error: "Nemáte dostatek kreditů pro Radar vyhledávání." };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { error: "Chybí GOOGLE_PLACES_API_KEY." };
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,places.rating",
    },
    body: JSON.stringify({
      textQuery: normalizedQuery,
    }),
  });
  const data = (await response.json()) as GoogleTextSearchV2Response;

  if (!response.ok) {
    return { error: data.error?.message || `Google API chyba (${response.status}).` };
  }

  const mappedResults: RadarLead[] = await Promise.all(
    (data.places ?? [])
      .slice(0, Math.max(1, input.limit))
      .map(async (item, index) => {
        const placeId = item.id || `place_${index}`;
        const url = item.websiteUri ?? "";
        const email = url ? await extractEmailFromUrl(url) : null;
        return {
          id: placeId,
          name: item.displayName?.text || "Neznámá firma",
          address: item.formattedAddress || "Adresa není k dispozici",
          rating: typeof item.rating === "number" ? item.rating : null,
          placeId,
          url,
          phone: item.internationalPhoneNumber ?? "",
          email,
        };
      }),
  );

  await prisma.workspace.update({
    where: { id: session.workspace.id },
    data: { creditsUsed: { increment: 1 } },
  });

  revalidatePath("/radar");
  revalidatePath("/");

  return { results: mappedResults };
}
