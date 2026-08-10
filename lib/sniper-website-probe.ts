/**
 * Bezplatná heuristika webu pro Sniper autodetekci.
 * Žádné Tavily / Search API — jen HTTP fetch + regexy nad HTML (stejný náklad jako dřív).
 */

import { assertSafeHttpUrl, safeFetchHtml } from "@/lib/ssrf-guard";

export const SNIPER_PRIMARY_OFFERS = [
 "Redesign a tvorba webů",
 "E-shopy (Shopify) a redesign e-shopů",
 "AI systémy a chatboti",
 "Aplikace a interní systémy na míru",
 "Automatizace procesů",
 "UI/UX Design",
] as const;

export type SniperPrimaryOffer = (typeof SNIPER_PRIMARY_OFFERS)[number];

export type WebsiteProbeResult = {
 /** Text for LLM (title, meta, body snippet). */
 textForModel: string;
 /** Structured block injected into autodetection prompts. */
 autodectHintBlock: string;
 recommendedOffer: SniperPrimaryOffer;
 confidence: "high" | "medium" | "low";
 signals: string[];
 platform: string | null;
 isEcommerce: boolean;
};

const WEB_TEXT_MAX = 3600;
const FETCH_BODY_MAX = 80_000;
const FETCH_TIMEOUT_MS = 8000;

function extractMeta(html: string, name: string): string {
 const re = new RegExp(
 `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
 "i",
 );
 const re2 = new RegExp(
 `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
 "i",
 );
 return (re.exec(html)?.[1] ?? re2.exec(html)?.[1] ?? "").trim();
}

function extractTitle(html: string): string {
 const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
 return (m?.[1] ?? "").replace(/\s+/g, " ").trim();
}

function extractH1(html: string): string {
 const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
 if (!m) return "";
 return m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

function htmlToPlain(html: string): string {
 return html
 .replace(/<script[\s\S]*?<\/script>/gi, " ")
 .replace(/<style[\s\S]*?<\/style>/gi, " ")
 .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
 .replace(/<[^>]+>/g, " ")
 .replace(/\s+/g, " ")
 .trim();
}

function detectPlatform(html: string, hostname: string): string | null {
 const h = html.toLowerCase();
 const host = hostname.toLowerCase();
 if (
 h.includes("cdn.shopify.com") ||
 h.includes("myshopify.com") ||
 h.includes("shopify.theme") ||
 /shopify/i.test(extractMeta(html, "generator"))
 ) {
 return "Shopify";
 }
 if (h.includes("cdn.myshoptet.com") || h.includes("shoptet.") || host.includes("shoptet")) {
 return "Shoptet";
 }
 if (h.includes("woocommerce") || h.includes("wp-content/plugins/woocommerce")) {
 return "WooCommerce";
 }
 if (h.includes("wix.com") || h.includes("static.wixstatic.com")) return "Wix";
 if (h.includes("squarespace")) return "Squarespace";
 if (h.includes("webflow")) return "Webflow";
 if (h.includes("wp-content") || h.includes("wordpress")) return "WordPress";
 if (h.includes("prestashop")) return "PrestaShop";
 if (h.includes("magento")) return "Magento";
 const gen = extractMeta(html, "generator");
 if (gen) return gen.slice(0, 60);
 return null;
}

function detectEcommerce(html: string, plain: string): boolean {
 const h = html.toLowerCase();
 const p = plain.toLowerCase();
 const strong = [
 "cdn.shopify.com",
 "cdn.myshoptet.com",
 "woocommerce",
 'name="shopify-digital-wallet"',
 "/cart.js",
 "add-to-cart",
 "add_to_cart",
 "do košíku",
 "přidat do košíku",
 "productform",
 "data-product-id",
 ];
 const soft = ["/cart", "checkout", "pokladna", "product-price", "košík"];
 const strongHits = strong.filter((m) => h.includes(m) || p.includes(m)).length;
 const softHits = soft.filter((m) => h.includes(m) || p.includes(m)).length;
 // Marketing pages often mention „e-shop“ without being one — require real cart/product markup.
 return strongHits >= 1 || softHits >= 2;
}

function extractCopyrightYear(html: string, plain: string): number | null {
 const m =
 /(?:©|&copy;|copyright)\s*(?:19|20)(\d{2})/i.exec(html) ||
 /(?:©|&copy;|copyright)\s*(20\d{2})/i.exec(plain);
 if (!m) {
 const years = [...plain.matchAll(/\b(20[0-2]\d)\b/g)].map((x) => Number(x[1]));
 if (years.length === 0) return null;
 return Math.max(...years);
 }
 const raw = m[1];
 if (raw.length === 2) return 2000 + Number(raw);
 return Number(raw);
}

function scoreRedesignSignals(html: string, plain: string, copyrightYear: number | null): string[] {
 const signals: string[] = [];
 const h = html.toLowerCase();
 const year = new Date().getFullYear();

 if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
 signals.push("chybí viewport meta (riziko slabé mobilní verze)");
 }
 if (copyrightYear != null && copyrightYear <= year - 4) {
 signals.push(`copyright / rok ${copyrightYear} (web působí zastarale)`);
 }
 if (/jquery[.-]?1\.[0-7]/i.test(h) || /jquery-1\./i.test(h)) {
 signals.push("velmi stará jQuery");
 }
 if ((h.match(/<table[\s>]/gi) ?? []).length >= 8) {
 signals.push("hodně HTML tabulek (starší layout)");
 }
 if (/application\/x-shockwave-flash|\.swf\b/i.test(h)) {
 signals.push("stopy Flash");
 }
 if (/bootstrap\/3\.|bootstrap@3/i.test(h)) {
 signals.push("Bootstrap 3 (zastaralý UI stack)");
 }
 if (plain.length < 400) {
 signals.push("málo textového obsahu na homepage");
 }
 const imgCount = (h.match(/<img\b/gi) ?? []).length;
 if (imgCount > 40) {
 signals.push(`hodně obrázků na homepage (${imgCount})`);
 }
 return signals;
}

function scoreAiSignals(html: string, plain: string): string[] {
 const blob = `${html}\n${plain}`.toLowerCase();
 const signals: string[] = [];
 if (/intercom|drift\.com|crisp\.chat|tidio|livechat|zendesk|smartsupp|facebook\.com\/plugins\/customerchat/.test(blob)) {
 signals.push("už běží chat widget (AI chatbot méně prioritní jako cold pitch)");
 }
 // Strong need for AI / internal apps — rare for cold outreach default
 if (/\bintern[ií]\s+syst[eé]m|\bintranet\b|\bERP\b|\bCRM\b.*integr/.test(blob) && /software|saas|platforma/.test(blob)) {
 signals.push("zmínky o interních systémech / ERP");
 }
 return signals;
}

function recommendOffer(input: {
 platform: string | null;
 isEcommerce: boolean;
 redesignSignals: string[];
 aiSignals: string[];
}): { offer: SniperPrimaryOffer; confidence: "high" | "medium" | "low"; reasons: string[] } {
 const reasons: string[] = [];

 // Already on Shopify → pitch Shopify redesign / custom theme (not migration)
 if (input.platform === "Shopify") {
 reasons.push("detekován Shopify");
 return {
 offer: "E-shopy (Shopify) a redesign e-shopů",
 confidence: "high",
 reasons: [...reasons, "primárně redesign / custom téma / rychlost e-shopu"],
 };
 }

 // Other e-com platforms → Shopify migration or e-shop redesign
 if (
 input.isEcommerce &&
 (input.platform === "Shoptet" ||
 input.platform === "WooCommerce" ||
 input.platform === "Wix" ||
 input.platform === "PrestaShop" ||
 input.platform === "Magento")
 ) {
 reasons.push(`e-shop na platformě ${input.platform}`);
 return {
 offer: "E-shopy (Shopify) a redesign e-shopů",
 confidence: "high",
 reasons: [...reasons, "nabídnout migraci / moderní e-shop (Shopify) nebo redesign"],
 };
 }

 if (input.isEcommerce) {
 reasons.push("znaky e-shopu (košík / produkty)");
 return {
 offer: "E-shopy (Shopify) a redesign e-shopů",
 confidence: "medium",
 reasons: [...reasons, "primárně e-shop redesign / Shopify"],
 };
 }

 // Default path: website redesign (majority of leads)
 if (input.redesignSignals.length > 0) {
 reasons.push(...input.redesignSignals.slice(0, 3));
 return {
 offer: "Redesign a tvorba webů",
 confidence: input.redesignSignals.length >= 2 ? "high" : "medium",
 reasons: [...reasons, "výchozí nabídka = redesign / nový web"],
 };
 }

 // Weak AI path — only if no redesign signals and strong internal-system hints
 if (input.aiSignals.some((s) => s.includes("ERP") || s.includes("intern"))) {
 reasons.push(...input.aiSignals);
 return {
 offer: "Aplikace a interní systémy na míru",
 confidence: "low",
 reasons,
 };
 }

 reasons.push("žádné silné e-shop signály → default redesign webu");
 return {
 offer: "Redesign a tvorba webů",
 confidence: "medium",
 reasons,
 };
}

function buildHintBlock(probe: {
 recommendedOffer: SniperPrimaryOffer;
 confidence: "high" | "medium" | "low";
 signals: string[];
 platform: string | null;
 isEcommerce: boolean;
 title: string;
 description: string;
}): string {
 return [
 "AUTODETECT HEURISTIKA (spočítáno lokálně z HTML — zdarma, bez Tavily; drž se jí, pokud web neříká jasný opak):",
 `• Doporučená služba: ${probe.recommendedOffer} (jistota: ${probe.confidence})`,
 probe.platform ? `• Platforma: ${probe.platform}` : "• Platforma: nerozpoznána",
 `• E-commerce signály: ${probe.isEcommerce ? "ano" : "ne"}`,
 probe.title ? `• Title: ${probe.title.slice(0, 120)}` : null,
 probe.description ? `• Meta description: ${probe.description.slice(0, 160)}` : null,
 probe.signals.length > 0 ? `• Signály: ${probe.signals.join("; ")}` : "• Signály: slabé → default redesign webu",
 "• Pravidlo: většina firem = redesign / nový web / e-shop. AI, automatizaci nebo interní apps zvol jen při jasných důkazech z webu.",
 ]
 .filter(Boolean)
 .join("\n");
}

/**
 * Stáhne homepage a spočítá autodetekční tip. Při chybě vrátí bezpečný default (redesign).
 */
export async function probeClientWebsite(urlRaw: string): Promise<WebsiteProbeResult> {
 const fallback = (msg: string): WebsiteProbeResult => ({
 textForModel: msg,
 autodectHintBlock: buildHintBlock({
 recommendedOffer: "Redesign a tvorba webů",
 confidence: "low",
 signals: ["web se nepodařilo plně načíst → default redesign"],
 platform: null,
 isEcommerce: false,
 title: "",
 description: "",
 }),
 recommendedOffer: "Redesign a tvorba webů",
 confidence: "low",
 signals: ["fetch failed"],
 platform: null,
 isEcommerce: false,
 });

 const raw = urlRaw.trim();
 if (!raw) return fallback("(URL nebyla zadána.)");

 const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
 const u = assertSafeHttpUrl(withProtocol);
 if (!u) {
 return fallback("(Interní, neplatná nebo nepovolená adresa — obsah nestahujeme.)");
 }

 try {
 const fetched = await safeFetchHtml(u.toString(), {
 timeoutMs: FETCH_TIMEOUT_MS,
 maxBodyChars: FETCH_BODY_MAX,
 headers: {
 "User-Agent":
 "Mozilla/5.0 (compatible; SklyvoSniper/2.0; +https://venegard.com)",
 Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
 "Accept-Language": "cs,en;q=0.8",
 },
 });
 if (!fetched.ok) {
 return fallback(`(Stažení stránky selhalo: ${fetched.reason}.)`);
 }
 const html = fetched.html;
 const title = extractTitle(html);
 const description =
 extractMeta(html, "description") || extractMeta(html, "og:description");
 const h1 = extractH1(html);
 const plain = htmlToPlain(html).slice(0, WEB_TEXT_MAX);
 const platform = detectPlatform(html, u.hostname);
 const isEcommerce = detectEcommerce(html, plain);
 const copyrightYear = extractCopyrightYear(html, plain);
 const redesignSignals = scoreRedesignSignals(html, plain, copyrightYear);
 const aiSignals = scoreAiSignals(html, plain);
 const rec = recommendOffer({ platform, isEcommerce, redesignSignals, aiSignals });

 const signals = [
 ...(platform ? [`platforma: ${platform}`] : []),
 ...(isEcommerce ? ["e-commerce"] : []),
 ...redesignSignals,
 ...aiSignals,
 ...rec.reasons,
 ];

 const textForModel = [
 title ? `TITLE: ${title}` : null,
 description ? `META: ${description}` : null,
 h1 ? `H1: ${h1}` : null,
 platform ? `DETECTED_PLATFORM: ${platform}` : null,
 isEcommerce ? "DETECTED_TYPE: ecommerce" : "DETECTED_TYPE: brochure_or_service_site",
 "",
 plain.length > 0 ? plain : "(Stránka neobsahovala čitelný text.)",
 ]
 .filter(Boolean)
 .join("\n");

 return {
 textForModel,
 autodectHintBlock: buildHintBlock({
 recommendedOffer: rec.offer,
 confidence: rec.confidence,
 signals: signals.slice(0, 10),
 platform,
 isEcommerce,
 title,
 description,
 }),
 recommendedOffer: rec.offer,
 confidence: rec.confidence,
 signals: signals.slice(0, 12),
 platform,
 isEcommerce,
 };
 } catch {
 return fallback(
 "(Obsah stránky se nepodařilo načíst — pracuj jen s informacemi z URL a názvu domény. NEVYMÝŠLEJ SaaS ani jiný obor, pokud z URL jasně neplyne.)",
 );
 }
}
