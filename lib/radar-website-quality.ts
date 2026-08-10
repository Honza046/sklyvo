/**
 * Radar quality filters: prefer real company websites, skip directories / promo hubs / social-only.
 */

const DIRECTORY_OR_PROMO_HOSTS = [
 // CZ / SK directories
 "firmy.cz",
 "www.firmy.cz",
 "zlatestranky.cz",
 "www.zlatestranky.cz",
 "najisto.cz",
 "edb.cz",
 "www.edb.cz",
 "firmy.sk",
 "azet.sk",
 "katalogfirem.cz",
 "podnikatel.cz",
 "penize.cz",
 "ares.gov.cz",
 "or.justice.cz",
 "justice.cz",
 // International directories / B2B lists
 "europages.com",
 "europages.cz",
 "kompass.com",
 "cylex.cz",
 "cylex.de",
 "cylex.com",
 "yellowpages.com",
 "yelp.com",
 "yelp.cz",
 "tripadvisor.com",
 "tripadvisor.cz",
 "booking.com",
 "hotels.com",
 "foursquare.com",
 "wikipedia.org",
 "wikidata.org",
 // Social / promo landing
 "facebook.com",
 "m.facebook.com",
 "fb.com",
 "instagram.com",
 "linkedin.com",
 "twitter.com",
 "x.com",
 "youtube.com",
 "youtu.be",
 "tiktok.com",
 "pinterest.com",
 "linktr.ee",
 "bio.link",
 "beacons.ai",
 "carrd.co",
 // Maps / Google profile shells
 "maps.google.com",
 "goo.gl",
 "g.page",
 "business.site",
 "sites.google.com",
 "mapy.cz",
 // Ecommerce platform vendors (HQ / corporate — not merchant shops)
 "shopify.com",
 "shopify.co.uk",
 "myshopify.com",
 "shoptet.cz",
 "shoptet.sk",
 "shoptet.com",
 "woocommerce.com",
 "wordpress.com",
 "wix.com",
 "squarespace.com",
 "bigcommerce.com",
 "prestashop.com",
 "magento.com",
 "adobe.com",
] as const;

/** Exact / near-exact Place names that are the platform company, not a merchant. */
const PLATFORM_VENDOR_NAMES = [
 /^shopify$/i,
 /^shopify\s+(inc|ltd|limited|uk|ireland|europe)\.?$/i,
 /^shoptet$/i,
 /^shoptet\s+(a\.?\s*s\.?|s\.?\s*r\.?\s*o\.?)$/i,
 /^woocommerce$/i,
 /^wix\.com$/i,
 /^wix$/i,
 /^squarespace$/i,
 /^bigcommerce$/i,
];

const PROMO_PATH_HINTS = [
 "/katalog",
 "/katalog/",
 "/directory",
 "/directories",
 "/firmy/",
 "/company-list",
 "/business-directory",
 "/yellow-pages",
];

function hostnameOf(rawUrl: string): string | null {
 const s = rawUrl.trim();
 if (!s) return null;
 try {
 const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
 return u.hostname.toLowerCase().replace(/^www\./, "");
 } catch {
 return null;
 }
}

function pathOf(rawUrl: string): string {
 const s = rawUrl.trim();
 if (!s) return "";
 try {
 const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
 return (u.pathname || "/").toLowerCase();
 } catch {
 return "";
 }
}

/** True if URL looks like a directory, social profile, or promo/listing hub. */
export function isDirectoryOrPromoWebsite(rawUrl: string | null | undefined): boolean {
 const host = hostnameOf(rawUrl ?? "");
 if (!host) return true;

 for (const blocked of DIRECTORY_OR_PROMO_HOSTS) {
 const b = blocked.replace(/^www\./, "");
 if (host === b || host.endsWith(`.${b}`)) return true;
 }
 // Partial host matches for network directories (cylex.*, europages.*)
 if (/(^|\.)cylex\./.test(host) || /(^|\.)europages\./.test(host)) return true;
 if (/(^|\.)yellowpages\./.test(host) || /(^|\.)yelp\./.test(host)) return true;

 const path = pathOf(rawUrl ?? "");
 if (PROMO_PATH_HINTS.some((p) => path.includes(p))) return true;

 return false;
}

/**
 * Standalone company site: has a real URL that is not a directory/social/promo hub.
 */
export function isStandaloneCompanyWebsite(rawUrl: string | null | undefined): boolean {
 const url = (rawUrl ?? "").trim();
 if (!url) return false;
 if (isDirectoryOrPromoWebsite(url)) return false;
 const host = hostnameOf(url);
 if (!host) return false;
 // Require a real domain with a TLD (skip bare IPs / localhost)
 if (!host.includes(".")) return false;
 return true;
}

/** True if Places result is the ecommerce platform vendor itself (Shopify HQ, Shoptet…). */
export function isEcommercePlatformVendor(input: {
 name?: string | null;
 websiteUri?: string | null;
}): boolean {
 const name = (input.name ?? "").trim();
 if (name && PLATFORM_VENDOR_NAMES.some((re) => re.test(name))) return true;
 const host = hostnameOf(input.websiteUri ?? "");
 if (!host) return false;
 const vendorHosts = [
 "shopify.com",
 "shopify.co.uk",
 "shoptet.cz",
 "shoptet.sk",
 "shoptet.com",
 "woocommerce.com",
 "wix.com",
 "squarespace.com",
 "bigcommerce.com",
 ];
 return vendorHosts.some((h) => host === h || host.endsWith(`.${h}`));
}

export type PlaceWithWebsite = {
 websiteUri?: string | null;
 displayName?: { text?: string } | null;
 name?: string | null;
};

/** Keep places that have their own company website (not directories / social-only / platform HQ). */
export function filterStandaloneCompanyPlaces<T extends PlaceWithWebsite>(places: T[]): T[] {
 return places.filter((p) => {
 const name = p.displayName?.text ?? p.name ?? "";
 const url = p.websiteUri ?? "";
 if (!isStandaloneCompanyWebsite(url)) return false;
 if (isEcommercePlatformVendor({ name, websiteUri: url })) return false;
 return true;
 });
}

/**
 * Broaden a too-specific query so Places returns more candidates.
 * Keeps the core terms; drops trailing micro-location noise when needed.
 */
export function broadenRadarQuery(query: string): string[] {
 const q = query.trim().replace(/\s+/g, " ");
 if (!q) return [];

 const variants = new Set<string>([q]);

 // Soft broaden: add company intent without changing meaning much
 if (!/\b(firma|firmy|společnost|company|agency|studio|obchod)\b/i.test(q)) {
 variants.add(`${q} firma`);
 }

 // Drop trailing region/city-like tail after 3+ tokens (keep industry focus)
 const parts = q.split(" ");
 if (parts.length >= 4) {
 variants.add(parts.slice(0, -1).join(" "));
 }
 if (parts.length >= 5) {
 variants.add(parts.slice(0, 3).join(" "));
 }

 return Array.from(variants);
}
