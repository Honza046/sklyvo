"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { LandingAuthLink } from "@/components/sklyvo/landing-auth-link";
import { SklyvoMark, type MarkGaze } from "@/components/sklyvo/sklyvo-mark";
import { BotGlyph } from "@/components/sklyvo/bot-glyph";
import { LegalDocumentDialog } from "@/components/legal/legal-document-dialog";
import { LEGAL_DOCUMENT_IDS } from "@/lib/legal/types";
import type { LegalDocumentId } from "@/lib/legal/types";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/sklyvo/landing-v2.css";

/**
 * The 2.0 landing page. Two product demos animate in place — a tile grid that
 * pops and flags matches, and a send queue that walks rows from queued to sent —
 * and the oversized outline head at the bottom glances at the sign-up button.
 *
 * The eyes on this page reach less far vertically than in the app, hence the
 * reachY the marks are given.
 */

const REACH_Y = 0.72;

/** the Skly Bot dome in the blue band, and how far it hangs below its edge */
const BAND_MARK_SIZE = 310;
const BAND_MARK_DROP = 48;

type NavLink = {
  label: string;
  href: string;
  /** use LandingAuthLink for handoff from landing → auth */
  auth?: "login" | "register";
};

type FootLink = {
  label: string;
  href: string;
  external?: boolean;
  auth?: "login" | "register";
};

type Copy = {
  title: string;
  sub: string;
  navLinks: NavLink[];
  menuLabel: string;
  ctaPrimary: string;
  ctaSecondary: string;
  note: string;
  qQueued: string;
  qSending: string;
  qSent: string;
  qTally: string;
  bandTitle: string;
  bandSub: string;
  whyKicker: string;
  whyTitle: string;
  priceKicker: string;
  priceTitle: string;
  priceSub: string;
  priceFrom: string;
  priceTrial: string;
  priceTrialStrong: string;
  priceCompare: string;
  faqTitle: string;
  faqSub: string;
  endTitle: string;
  endBody: string;
  botHintQ: string;
  botAskCta: string;
  footTop: string;
  footNote: string;
  legalList: string[];
  footClaim: string;
  footCols: { title: string; links: FootLink[] }[];
  why: { title: string; body: string }[];
  steps: { n: string; title: string; body: string }[];
  faq: { q: string; a: string }[];
};

const CS: Copy = {
  title: "Přístup je otevřený. Zatím.",
  sub: "Zatímco ostatní hledají klienty ručně, vy už jim fakturujete. Sklyvo firmy najde a osloví za vás. První vlna míst je otevřená pro omezený počet.",
  navLinks: [
    { label: "Jak to funguje", href: "#how" },
    { label: "Pro agentury", href: "#why" },
    { label: "Ceník", href: "#pricing" },
    { label: "Časté otázky", href: "#faq" },
    { label: "Přihlásit se", href: "/login", auth: "login" },
  ],
  menuLabel: "Menu",
  ctaPrimary: "Vyzkoušet zdarma",
  ctaSecondary: "Přihlásit se",
  note: "473 aktivních uživatelů · zbývá 27 míst",
  qQueued: "Ve frontě",
  qSending: "Odesílá se",
  qSent: "Odesláno",
  qTally: "DNES OSLOVENO KLIENTŮ",
  bandTitle: "Nezáleží na tom, v jakém jste oboru.",
  bandSub: "Sklyvo hledá podle toho, co nabízíte vy. Jakékoli odvětví, jakýkoli obor, žádný hotový seznam. Klienty pro vás najde kdekoli na světě.",
  whyKicker: "PROČ SKLYVO",
  whyTitle: "Dvě věci, které za vás dělá už dnes.",
  priceKicker: "CENÍK",
  priceTitle: "Dva způsoby, jak Sklyvo používat.",
  priceSub: "Sami, nebo s týmem. Ceny při roční platbě, dva měsíce zdarma.",
  priceFrom: "od",
  priceTrial: "Tři dny na zkoušku a 250 kreditů.",
  priceTrialStrong: "Plán si vyberete až potom.",
  priceCompare: "Porovnat plány",
  faqTitle: "Časté otázky",
  faqSub: "Vše, co potřebujete vědět, než se přidáte.",
  endTitle: "Než to dočtete, někdo je oslovil první.",
  endBody: "Založte si účet na Sklyvo a získejte prvního klienta ještě dnes.",
  botHintQ: "Nenašli jste odpověď?",
  botAskCta: "Zeptat se Skly Bota",
  footTop: "Nahoru",
  footNote: "© 2026 Sklyvo by ",
  legalList: ["Zásady ochrany osobních údajů", "Podmínky použití", "Zpracování dat", "Cookies"],
  footClaim: "Najde klienty, které potřebujete, a osloví je automaticky za vás. V jakémkoli odvětví, kdekoli na světě.",
  footCols: [
    {
      title: "Sítě",
      links: [
        { label: "@sklyvo", href: "mailto:podpora@venegard.com?subject=Sklyvo" },
        { label: "@venegard", href: "https://venegard.com", external: true },
        { label: "Novinky", href: "mailto:podpora@venegard.com?subject=Novinky" },
      ],
    },
    {
      title: "Produkt",
      links: [
        { label: "Jak to funguje", href: "#how" },
        { label: "Ceník", href: "#pricing" },
        { label: "Přihlásit se", href: "/login", auth: "login" },
        { label: "Vyzkoušet zdarma", href: "/register", auth: "register" },
      ],
    },
    {
      title: "Firma",
      links: [
        { label: "O nás", href: "#why" },
        { label: "Sklyvo", href: "#" },
        { label: "Affiliate", href: "mailto:podpora@venegard.com?subject=Affiliate" },
        { label: "Kontakt", href: "mailto:podpora@venegard.com" },
      ],
    },
    {
      title: "Podpora",
      links: [
        { label: "Časté dotazy", href: "#faq" },
        { label: "Stav služby", href: "mailto:podpora@venegard.com?subject=Stav%20slu%C5%BEby" },
        { label: "Nápověda", href: "#faq" },
        { label: "Skly Bot", href: "#faq" },
      ],
    },
  ],
  why: [
    {
      title: "Najde pro vás potenciální klienty",
      body: "Minuta nastavení, zbytek běží sám. Sklyvo prohledá veřejné zdroje, ověří kontakty a denně dodá nový seznam.",
    },
    {
      title: "Osloví je automaticky za vás",
      body: "Personalizované oslovení i připomenutí, vše připravené na míru danému klientovi. Vy už jen dodáváte službu a řešíte zakázky.",
    },
  ],
  steps: [
    { n: "1", title: "Řeknete, komu a co nabízíte", body: "Nastavíte jednou. Změnit to jde kdykoli." },
    { n: "2", title: "Sklyvo pracuje na pozadí", body: "Nové kontakty i oslovení každý den." },
    { n: "3", title: "Dohodnete se a vyděláte", body: "Žádné hledání. Jen hotové obchody." },
  ],
  faq: [
    {
      q: "Co přesně Sklyvo dělá a k čemu mi je?",
      a: "Nástroj, který automaticky najde firmy odpovídající vašemu ideálnímu zákazníkovi, a sám je osloví. Místo hodin na mapách a v tabulkách řešíte jen odpovědi.",
    },
    {
      q: "Proč se mám přidat právě teď, a ne později?",
      a: "Spouštíme první vlnu a míst je omezený počet. Kdo se přidá dřív, dostane lepší podmínky i přednost v podpoře.",
    },
    {
      q: "Kolik Sklyvo stojí a co všechno je v ceně?",
      a: "Basic od 1 190 Kč měsíčně, Plus 2 690 Kč a Pro 6 390 Kč. Při roční platbě jsou dva měsíce zdarma.",
    },
    {
      q: "Musím být technický typ, abych to rozjel?",
      a: "Ne. Sklyvo je no-code, e-mail připojíte jedním kliknutím a zbytek nastavíte v běžném formuláři.",
    },
    {
      q: "Jak je to s ochranou dat a s GDPR?",
      a: "Pracujeme jen s veřejně dostupnými firemními kontakty, data ukládáme v EU a kdykoli je můžete exportovat nebo smazat.",
    },
    {
      q: "Odkud berete kontakty na firmy?",
      a: "Z veřejných zdrojů na internetu: registrů, webů firem, katalogů, map a sociálních sítí. Zdroje se liší podle toho, co nabízíte a kam míříte.",
    },
    {
      q: "Za jak dlouho můžu čekat prvního klienta?",
      a: "Oslovení začne hned po nastavení. Většina uživatelů uzavře první obchod během několika dní, záleží na obboru a na tom, jak rychle odpovídáte.",
    },
  ],
};

const EN: Copy = {
  title: "Access is open. For now.",
  sub: "While others hunt for clients by hand, you are already invoicing them. Sklyvo finds companies and reaches out for you. The first wave of seats is open to a limited number.",
  navLinks: [
    { label: "How it works", href: "#how" },
    { label: "For agencies", href: "#why" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Sign in", href: "/login", auth: "login" },
  ],
  menuLabel: "Menu",
  ctaPrimary: "Try for free",
  ctaSecondary: "Sign in",
  note: "473 active users · 27 seats left",
  qQueued: "Queued",
  qSending: "Sending",
  qSent: "Sent",
  qTally: "CLIENTS REACHED TODAY",
  bandTitle: "Your industry does not matter.",
  bandSub: "Sklyvo searches by what you offer. Any field, any industry, no fixed list to pick from. It finds your clients anywhere on Earth.",
  whyKicker: "WHY SKLYVO",
  whyTitle: "Two things it already does for you.",
  priceKicker: "PRICING",
  priceTitle: "Two ways to run Sklyvo.",
  priceSub: "On your own or with a team. Prices with yearly billing, two months free.",
  priceFrom: "from",
  priceTrial: "Three days to try it and 250 credits.",
  priceTrialStrong: "Pick a plan afterwards.",
  priceCompare: "Compare plans",
  faqTitle: "Frequently asked questions",
  faqSub: "Everything you need to know before you join.",
  endTitle: "By the time you finish reading, someone reached out first.",
  endBody: "Create your Sklyvo account and land your first client today.",
  botHintQ: "Did not find your answer?",
  botAskCta: "Ask Skly Bot",
  footTop: "Top",
  footNote: "© 2026 Sklyvo by ",
  legalList: ["Privacy policy", "Terms of use", "Data processing", "Cookies"],
  footClaim: "It automatically finds the clients you need and reaches them for you. Any industry, anywhere on Earth.",
  footCols: [
    {
      title: "Socials",
      links: [
        { label: "@sklyvo", href: "mailto:podpora@venegard.com?subject=Sklyvo" },
        { label: "@venegard", href: "https://venegard.com", external: true },
        { label: "News", href: "mailto:podpora@venegard.com?subject=News" },
      ],
    },
    {
      title: "Product",
      links: [
        { label: "How it works", href: "#how" },
        { label: "Pricing", href: "#pricing" },
        { label: "Sign in", href: "/login", auth: "login" },
        { label: "Try for free", href: "/register", auth: "register" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#why" },
        { label: "Sklyvo", href: "#" },
        { label: "Affiliate", href: "mailto:podpora@venegard.com?subject=Affiliate" },
        { label: "Contact", href: "mailto:podpora@venegard.com" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "FAQ", href: "#faq" },
        { label: "Service status", href: "mailto:podpora@venegard.com?subject=Service%20status" },
        { label: "Help", href: "#faq" },
        { label: "Skly Bot", href: "#faq" },
      ],
    },
  ],
  why: [
    {
      title: "It finds your potential clients",
      body: "A minute of setup, the rest runs itself. Sklyvo scans public sources, verifies contacts and builds a fresh list every day.",
    },
    {
      title: "It reaches them automatically",
      body: "Personalised outreach and follow-ups, all tailored to that specific client. You just deliver the service and handle the work.",
    },
  ],
  steps: [
    { n: "1", title: "Tell us who and what you sell", body: "Set it up once, change it anytime." },
    { n: "2", title: "Sklyvo works in the background", body: "New contacts and outreach every day." },
    { n: "3", title: "You close and get paid", body: "No hunting. Just closed deals." },
  ],
  faq: [
    {
      q: "What exactly does Sklyvo do for me?",
      a: "A tool that automatically finds companies matching your ideal customer and reaches out for you. Instead of hours on maps and spreadsheets you only handle replies.",
    },
    {
      q: "Why should I join now rather than later?",
      a: "We are launching the first wave and seats are limited. Joining early means better terms and priority support.",
    },
    {
      q: "What does Sklyvo cost and what is included?",
      a: "Basic from $49 a month, Plus $109 and Pro $259. Yearly billing gives you two months free.",
    },
    {
      q: "Do I need to be technical to set it up?",
      a: "No. Sklyvo is no-code, you connect email in one click and set the rest through a normal form.",
    },
    {
      q: "How do you handle data privacy and GDPR?",
      a: "We only work with publicly available business contacts, store data in the EU, and you can export or delete it at any time.",
    },
    {
      q: "Where do you get the company contacts from?",
      a: "From public sources online: registries, company websites, directories, maps and social networks. Sources differ by what you offer and where you target.",
    },
    {
      q: "How soon can I expect my first client?",
      a: "Outreach starts right after setup. Most users close their first deal within a few days, depending on the industry and how fast you reply.",
    },
  ],
};

/** the queue cycles through these names three at a time */
const CLIENT_POOL = [
  "Northbound Studio",
  "Vertex Labs",
  "Halden Group",
  "Meridian Fitness",
  "Blue Harbor Co.",
  "Atlas Interiors",
  "Nova Dental",
  "Riverstone Legal",
  "Kestrel Logistics",
  "Lumen Studio",
  "Orbit Autoworks",
  "Sierra Coffee",
  "Delta Robotics",
  "Pinewood Realty",
  "Astra Clinic",
];

const SENT_GREEN = "oklch(0.62 0.15 155)";

const priceCards = (cs: boolean) =>
  [
    {
      name: cs ? "Jeden účet" : "Single account",
      badgeText: cs ? "PRO JEDNOHO" : "SOLO",
      price: cs ? "990 Kč" : "$41",
      unit: cs ? "/ měsíc" : "/ month",
      billing: cs ? "Účtováno ročně, Basic tarif" : "Billed yearly, Basic plan",
      ctaText: cs ? "Začít zdarma" : "Start for free",
      includes: cs ? "Obsahuje:" : "Includes:",
      features: cs
        ? [
            "od 1 000 kreditů / měsíc",
            "Sniper a Radar",
            "CRM pro 500 kontaktů",
            "Vlastní e-mailová adresa",
            "Vyšší tarify přidají Autopilota",
          ]
        : [
            "from 1,000 credits / month",
            "Sniper and Radar",
            "CRM for 500 contacts",
            "Your own email address",
            "Higher plans add Autopilot",
          ],
      light: true,
    },
    {
      name: cs ? "Pro agentury" : "For agencies",
      badgeText: cs ? "PRO TÝMY" : "TEAMS",
      price: cs ? "1 410 Kč" : "$58",
      unit: cs ? "/ měsíc za uživatele" : "/ month per user",
      billing: cs ? "Účtováno ročně, Agency Pro" : "Billed yearly, Agency Pro",
      ctaText: cs ? "Založit tým" : "Set up your team",
      includes: cs ? "Vše z jednoho účtu a navíc:" : "Everything in single, plus:",
      features: cs
        ? [
            "od 3 000 kreditů / měsíc na uživatele",
            "Sdílený workspace pro tým",
            "Oddělené kampaně pro klienty",
            "Role a práva uživatelů",
            "Přehledy za všechny klienty",
          ]
        : [
            "from 3,000 credits / month per user",
            "Shared team workspace",
            "Separate campaigns per client",
            "User roles and permissions",
            "Reporting across all clients",
          ],
      light: false,
    },
  ] as const;

/* ---------------------------------------------------------------- icons -- */

function Tick({ size = 13, stroke = "#8A8F98", width = 2.4 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none", marginTop: 3 }}
      aria-hidden
    >
      <polyline points="4 12.5 9.5 18 20 6.5" />
    </svg>
  );
}

const SPARK_PATHS = [
  "M11 3.5 12.7 8l4.5 1.7-4.5 1.7L11 15.9 9.3 11.4 4.8 9.7l4.5-1.7L11 3.5Z",
  "M18 14.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3Z",
];

/* ------------------------------------------------------------- the page -- */

export function LandingV2() {
  const { language, setLanguage: setAppLanguage } = useLanguage();
  const cs = language !== "en";
  const t = cs ? CS : EN;
  const setLanguage = (v: "cs" | "en") => {
    setAppLanguage(v === "cs" ? "cz" : "en");
  };

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  useReveal();

  return (
    <div className="lp2-page">
      <div style={{ position: "relative", paddingTop: 72 }}>
        <Header t={t} cs={cs} setLanguage={setLanguage} />
        <Hero t={t} />
        <DemoFrame />
        <BotBand t={t} />
        <WhySection t={t} />
        <StepsSection t={t} />
        <PricingSection t={t} cs={cs} />
        <FaqSection t={t} openFaq={openFaq} setOpenFaq={setOpenFaq} />
        <EndSection t={t} />
        <Footer t={t} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- reveal -- */

/**
 * Sections fade up once they cross 94 % of the viewport height. The design
 * staggers them in threes, so every third element waits another 80 ms.
 */
function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".lp2-page [data-reveal]");
    nodes.forEach((el, i) => {
      if (!el.style.transitionDelay) el.style.transitionDelay = `${(i % 3) * 0.08}s`;
    });

    let queued = false;
    const run = () => {
      queued = false;
      const h = window.innerHeight || 800;
      const left = document.querySelectorAll<HTMLElement>(
        ".lp2-page [data-reveal]:not(.in)",
      );
      left.forEach((el) => {
        if (el.getBoundingClientRect().top < h * 0.94) el.classList.add("in");
      });
      // nothing left to reveal: stop reading layout on every scroll frame
      if (!left.length) {
        window.removeEventListener("scroll", scan);
        window.removeEventListener("resize", scan);
      }
    };
    const scan = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(run);
    };

    window.addEventListener("scroll", scan, { passive: true });
    window.addEventListener("resize", scan, { passive: true });
    run();
    return () => {
      window.removeEventListener("scroll", scan);
      window.removeEventListener("resize", scan);
    };
  }, []);
}

/* --------------------------------------------------------------- header -- */

function langBtn(active: boolean): CSSProperties {
  return {
    position: "relative",
    width: 40,
    height: 26,
    padding: 0,
    border: "none",
    borderRadius: 8,
    fontFamily: "inherit",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
    cursor: "pointer",
    transition: "background 0.16s ease, color 0.16s ease",
    background: active ? "#22242A" : "transparent",
    color: active ? "#FAFAFB" : "#6B7078",
  };
}

function Header({
  t,
  cs,
  setLanguage,
}: {
  t: Copy;
  cs: boolean;
  setLanguage: (v: "cs" | "en") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // shut the sheet on Escape, and on the way back up to desktop, where the bar
  // holds everything itself and a stuck-open sheet would cover the page
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const wide = window.matchMedia("(min-width: 641px)");
    const onWide = () => {
      if (wide.matches) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [menuOpen]);

  return (
    <header className="lp2-header" data-open={menuOpen ? "" : undefined}>
      <div className="lp2-header__inner">
        <a
          href="#"
          className="lp2-brand"
          data-eyes
          style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 1160, textDecoration: "none" }}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <SklyvoMark size={28} reachY={REACH_Y} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "#F2F3F5" }}>
            Sklyvo
          </span>
        </a>

        {/* the class does the hiding: an inline `display` would beat the
            stylesheet and the bar stayed broken on phones */}
        <nav className="lp2-nav">
          {t.navLinks.map((n) => {
            if (n.auth) {
              return (
                <LandingAuthLink
                  key={n.label}
                  data-navlink
                  href={n.auth === "login" ? "/login" : "/register"}
                  className="lp2-navlink"
                >
                  {n.label}
                </LandingAuthLink>
              );
            }
            return (
              <a key={n.label} data-navlink href={n.href} className="lp2-navlink">
                {n.label}
              </a>
            );
          })}
        </nav>

        <div className="lp2-headend">
          <div className="lp2-lang">
            <button type="button" onClick={() => setLanguage("cs")} style={langBtn(cs)}>
              CS
            </button>
            <button type="button" onClick={() => setLanguage("en")} style={langBtn(!cs)}>
              EN
            </button>
          </div>

          <button
            type="button"
            className="lp2-burger"
            aria-label={t.menuLabel}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* the sheet is always in the DOM so it can slide, and is taken out of the
          tab order while shut */}
      <div className="lp2-menu" inert={!menuOpen || undefined}>
        {/* one grid child, so the collapsing row governs the whole sheet: with
            two, the second landed in an implicit auto row and stayed open */}
        <div className="lp2-menu__inner">
        <nav className="lp2-menu__nav">
          {t.navLinks.map((n) => {
            if (n.auth) {
              return (
                <LandingAuthLink
                  key={n.label}
                  href={n.auth === "login" ? "/login" : "/register"}
                  className="lp2-menu__link"
                  onClick={() => setMenuOpen(false)}
                >
                  {n.label}
                </LandingAuthLink>
              );
            }
            return (
              <a
                key={n.label}
                href={n.href}
                className="lp2-menu__link"
                onClick={() => setMenuOpen(false)}
              >
                {n.label}
              </a>
            );
          })}
        </nav>

        {/* the action sits under the last link on the left, the language goes
            to the far right. Sign-in is already in the list above. */}
        <div className="lp2-menu__foot">
          <LandingAuthLink href="/register" className="lp2-btn lp2-btn--white" onClick={() => setMenuOpen(false)}>
            {t.ctaPrimary}
          </LandingAuthLink>
          <div className="lp2-lang">
            <button type="button" onClick={() => setLanguage("cs")} style={langBtn(cs)}>
              CS
            </button>
            <button type="button" onClick={() => setLanguage("en")} style={langBtn(!cs)}>
              EN
            </button>
          </div>
        </div>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- hero -- */

function Hero({ t }: { t: Copy }) {
  return (
    <section style={{ maxWidth: 860, margin: "0 auto", padding: "56px 28px 0", textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          animation: "lp2RiseIn var(--lp2-rise-dur) var(--lp2-ease) both",
        }}
      >
        <div data-eyes>
          <SklyvoMark size={62} reachY={REACH_Y} />
        </div>
      </div>

      <div className="lp2-note">
        <span className="lp2-dot" />
        {t.note}
      </div>

      <h1 id="how" className="lp2-h1 lp2-anchor">
        {t.title}
      </h1>

      <p className="lp2-sub">{t.sub}</p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          animation: "lp2RiseIn var(--lp2-rise-dur) var(--lp2-ease) 0.24s both",
        }}
      >
        <LandingAuthLink href="/register" className="lp2-btn lp2-btn--white">
          {t.ctaPrimary}
        </LandingAuthLink>
        <LandingAuthLink href="/login" className="lp2-btn lp2-btn--raised">
          {t.ctaSecondary}
        </LandingAuthLink>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- demo window -- */

function DemoFrame() {
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "52px 28px 0" }}>
      <div data-reveal className="lp2-demoframe">
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "15px 18px" }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c }} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- bot band -- */

/**
 * How far the head sinks when it ducks. At rest the eyes sit only 67px above
 * the band's bottom edge, so anything past ~60 buries them completely; 52
 * leaves them peering over the rim with their lower third cut off.
 */
const BAND_DUCK = 30;

function BotBand({ t }: { t: Copy }) {
  const duckRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<MarkGaze | null>(null);

  /**
   * Two beats on a slow loop, picked at random: the head ducks out of sight
   * leaving only its crown and eyes over the edge, or it stares straight down
   * at the floor with its eyes pushed past their usual travel and swollen.
   * Between beats it goes back to following the cursor like the other marks.
   */
  useEffect(() => {
    const duck = duckRef.current;
    if (!duck) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let stopped = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });

    const run = async () => {
      for (;;) {
        await wait(11000 + Math.random() * 8000);
        if (stopped) return;

        if (Math.random() < 0.5) {
          // Sink, check right, check left, then come back up. Every wait is
          // longer than the 1.4s travel: releasing the eyes before the head has
          // finished moving is what makes a duck look jerky.
          duck.style.transform = `translateY(${BAND_DUCK}px)`;
          setPose({ gx: 1.6, gy: -0.45 });
          await wait(2000);
          if (stopped) return;

          setPose({ gx: -1.6, gy: -0.45 });
          await wait(1400);
          if (stopped) return;

          setPose({ gx: 0, gy: -0.3 });
          duck.style.transform = "translateY(0px)";
          await wait(1600);
          setPose(null);
        } else {
          // look at the floor: past the normal reach, and a little bigger
          setPose({ gx: 0, gy: 8, pop: 0.25 });
          await wait(1900);
          if (stopped) return;
          setPose(null);
        }
      }
    };
    void run();

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "190px 28px 0" }}>
      <div data-reveal className="lp2-band">
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            // stops well short of the dome: at 560 the column ended exactly
            // where the head begins, with no gap at all
            maxWidth: 450,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              textWrap: "pretty",
              color: "#FFFFFF",
            }}
          >
            {t.bandTitle}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              lineHeight: 1.6,
              textWrap: "pretty",
              color: "rgba(255,255,255,0.78)",
            }}
          >
            {t.bandSub}
          </p>
        </div>
        {/* No tile of its own — the dome sits straight on the gradient and
            breaks out over the top. It hangs BAND_MARK_DROP below the band and
            is clipped back to the edge, which trades height for width so it
            reads as a broad dome rather than a tall sliver. */}
        {/*
          * The clipper's own bottom edge IS the band's bottom edge, because it
          * is pinned to it with `bottom: 0`, and `overflow: hidden` cuts exactly
          * at a box edge. A clip-path measured in pixels could not do this: the
          * band's height is set by its text and lands on a fraction of a pixel,
          * so the cut was always a hair out and had to be nudged by hand.
          * The top is pulled far up so the dome may still overhang the band.
          */}
        <div
          data-eyes
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            top: -500,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* relative to the clipper, whose bottom edge is the band's bottom
              edge, so this is the same placement as before: BAND_MARK_DROP
              below the band, with the overflow doing the cutting */}
          <div className="lp2-bandmark" style={{ bottom: -BAND_MARK_DROP }}>
          <div
            ref={duckRef}
            style={{
              transform: "translateY(0px)",
              /* long and symmetric, so the sink and the rise feel the same and
                 neither end arrives abruptly */
              transition: "transform 1.4s cubic-bezier(0.42, 0, 0.3, 1)",
            }}
          >
            {/* breathing lives on its own element: the duck owns the transform
                of the one above it, and a single element cannot hold both */}
            <div className="lp2-bandbot">
              <SklyvoMark
                size={BAND_MARK_SIZE}
                reachY={REACH_Y}
                bare
                round
                glow={0.45}
                gaze={pose}
                shadow={false}
              />
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ why cards -- */

const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")";

function shuffled<T>(list: T[]) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** the screen inside each card: a painted desktop with a little window on it */
function CardScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp2-screen">
      <span className="lp2-screen__noise" style={{ backgroundImage: NOISE_SVG }} />
      <span className="lp2-screen__vignette" />
      <div className="lp2-window">
        <div className="lp2-window__bar">
          {/* one shade for all three: the graded 0.26 / 0.18 / 0.12 read as a
              colour difference rather than as depth */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ width: 5, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.18)" }}
            />
          ))}
        </div>
        <div className="lp2-window__body">{children}</div>
      </div>
    </div>
  );
}

function FindDemo({ hits }: { hits: number[] }) {
  return (
    <>
      <div className="lp2-tiles">
        {Array.from({ length: 12 }, (_, i) => {
          const hit = hits.includes(i);
          const rot = (i % 2 ? 1 : -1) * (6 + (i % 3) * 4);
          const d = ((i % 4) * 0.07 + Math.floor(i / 4) * 0.05).toFixed(2);
          return (
            <div
              key={i}
              className="lp2-tile"
              data-clock={i === 0 ? "tiles" : undefined}
              // both animations always run; `data-hit` only swaps the colours the
              // keyframes read, so a changing match set never restarts the cycle
              data-hit={hit ? "" : undefined}
              style={
                {
                  "--rot": `${rot}deg`,
                  animation:
                    `lp2TilePop 3.6s cubic-bezier(0.34,1.56,0.5,1) ${d}s infinite, ` +
                    `lp2TileHit 3.6s ease-in-out ${d}s infinite`,
                } as CSSProperties
              }
            >
              {/* the bars turn white on the same clock as the tile lights up,
                  rather than starting white and giving the match away */}
              <span
                className="lp2-tilebar"
                style={
                  {
                    height: 4,
                    width: `${58 + ((i * 7) % 34)}%`,
                    "--bar-rest": "#2A2D33",
                    "--bar-hit": "var(--hit-bar1)",
                    animationDelay: `${d}s`,
                  } as CSSProperties
                }
              />
              <span
                className="lp2-tilebar"
                style={
                  {
                    height: 3,
                    width: `${34 + ((i * 11) % 26)}%`,
                    "--bar-rest": "#24272C",
                    "--bar-hit": "var(--hit-bar2)",
                    animationDelay: `${d}s`,
                  } as CSSProperties
                }
              />
              <span
                style={{
                  position: "absolute",
                  right: -5,
                  top: -6,
                  fontSize: 11,
                  lineHeight: 1,
                  color: "#FFEE00",
                  opacity: 0,
                  // hidden rather than unmounted: the keyframes keep their clock
                  visibility: hit ? "visible" : "hidden",
                  animation: `lp2Sparkle 3.6s ease-out ${d}s infinite`,
                }}
              >
                ✦
              </span>
            </div>
          );
        })}
      </div>

      <div className="lp2-scanner" />

    </>
  );
}

const pillBase: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  flex: "none",
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.04em",
  position: "absolute",
  right: 10,
};

function ReachDemo({ t, clients, tally }: { t: Copy; clients: string[]; tally: number }) {
  return (
    <>
      <div className="lp2-queue">
        {clients.map((name, i) => {
          const d = (i * 0.5).toFixed(2);
          return (
            <div
              key={i}
              className="lp2-qrow"
              data-clock={i === 0 ? "queue" : undefined}
              style={{ animation: `lp2QueueRow 5.4s cubic-bezier(0.32,0.72,0,1) ${d}s infinite` }}
            >
              {/* a bar standing in for the name: its width follows the name it
                  replaces, so the rows keep changing length as the list turns */}
              <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    display: "block",
                    height: 5,
                    // Spread from the name rather than scaled off its length:
                    // the pool's names are all 11 to 19 characters, so length
                    // alone put every bar between 52 and 72 per cent and they
                    // all looked the same. This runs 18 to 76 and gives some
                    // genuinely short ones.
                    width: `${18 + ((name.length * 7 + name.charCodeAt(0) * 3) % 58)}%`,
                    borderRadius: 99,
                    background: "rgba(255,255,255,0.34)",
                  }}
                />
              </span>
              <span
                style={{
                  ...pillBase,
                  background: "#22252A",
                  color: "#6B7078",
                  animation: `lp2StateQueued 5.4s ease-out ${d}s infinite`,
                }}
              >
                {t.qQueued}
              </span>
              <span
                style={{
                  ...pillBase,
                  background: "rgba(2,167,255,0.16)",
                  color: "#7FCDFB",
                  opacity: 0,
                  animation: `lp2StateSending 5.4s ease-out ${d}s infinite`,
                }}
              >
                <span className="lp2-spinner" />
                {t.qSending}
              </span>
              <span
                style={{
                  ...pillBase,
                  background: SENT_GREEN,
                  color: "#fff",
                  opacity: 0,
                  animation: `lp2StateSent 5.4s cubic-bezier(0.34,1.6,0.5,1) ${d}s infinite`,
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {t.qSent}
              </span>
              <span
                className="lp2-qbar"
                style={{ animation: `lp2BarFill 5.4s cubic-bezier(0.5,0,0.4,1) ${d}s infinite` }}
              />
            </div>
          );
        })}
      </div>

      <div className="lp2-tally">
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.09em", color: "#6B7078" }}>
          {t.qTally}
        </span>
        <div style={{ flex: 1 }} />
        <span className="lp2-tally__num">{tally}</span>
      </div>
    </>
  );
}

function WhySection({ t }: { t: Copy }) {
  const [hits, setHits] = useState<number[]>([2, 5, 8, 9]);
  const [clients, setClients] = useState<string[]>([
    "Premier Fitness",
    "Koloseum Sport",
    "Metalshop Megastore",
  ]);
  const [tally, setTally] = useState(128);

  const sectionRef = useRef<HTMLElement>(null);
  const liveRef = useRef(true);
  const poolRef = useRef<string[] | null>(null);
  const cycleRef = useRef<(() => void) | undefined>(undefined);
  const cursorRef = useRef(0);

  const rollClients = useCallback(() => {
    if (!poolRef.current) {
      poolRef.current = shuffled(CLIENT_POOL);
      cursorRef.current = 0;
    }
    const pool = poolRef.current;
    const picked = [0, 1, 2].map((k) => pool[(cursorRef.current + k) % pool.length]);
    cursorRef.current = (cursorRef.current + 3) % pool.length;
    setClients(picked);
  }, []);

  const rollHits = useCallback(() => {
    const n = 3 + Math.floor(Math.random() * 5);
    setHits(
      shuffled([...Array(12).keys()])
        .slice(0, n)
        .sort((a, b) => a - b),
    );
  }, []);

  /**
   * The demos idle while the section is off-screen. `data-live` is what the
   * stylesheet watches: without it the section's 80 CSS animations ran from
   * page load, inside two grayscale filters, so the browser was re-rendering
   * and re-filtering 85 elements every frame the whole way down the page. That
   * cost landed right on top of the reveal transition and made it stutter.
   */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      sectionRef.current?.toggleAttribute("data-live", true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const live = entries.some((e) => e.isIntersecting);
        liveRef.current = live;
        el.toggleAttribute("data-live", live);
      },
      { rootMargin: "220px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /**
   * The CSS keyframes are the clock, not a timer. A `setInterval` drifts against
   * the animation it is meant to feed, so the tiles used to change colour while
   * they were mid-flight; listening for the wrap means new data always lands at
   * 0 % of the cycle, where the tiles are invisible anyway.
   */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onWrap = (e: AnimationEvent) => {
      if (!liveRef.current) return;
      const target = e.target as HTMLElement | null;
      if (e.animationName === "lp2TilePop" && target?.dataset.clock === "tiles") {
        rollHits();
      } else if (e.animationName === "lp2QueueRow" && target?.dataset.clock === "queue") {
        rollClients();
        cycleRef.current?.();
      }
    };
    el.addEventListener("animationiteration", onWrap);
    return () => el.removeEventListener("animationiteration", onWrap);
  }, [rollHits, rollClients]);

  /**
   * One "sent" pill equals one tick. Rows land at 2.44 / 2.94 / 3.44 s of each
   * 5.4 s cycle; once the count reaches 143 it winds back down to 128.
   */
  useEffect(() => {
    const pending: ReturnType<typeof setTimeout>[] = [];
    let rewindDelay: ReturnType<typeof setTimeout> | undefined;
    let rewindStep: ReturnType<typeof setInterval> | undefined;

    const bump = () =>
      setTally((v) => {
        const next = v + 1;
        if (next >= 143) {
          clearTimeout(rewindDelay);
          rewindDelay = setTimeout(() => {
            rewindStep = setInterval(() => {
              setTally((cur) => {
                if (cur <= 128) {
                  clearInterval(rewindStep);
                  return 128;
                }
                return cur - 1;
              });
            }, 55);
          }, 1100);
        }
        return next;
      });

    // the queue's own wrap arms the three ticks, so a pill and its +1 stay
    // together however long the tab has been open
    cycleRef.current = () => {
      while (pending.length) clearTimeout(pending.pop());
      [2440, 2940, 3440].forEach((ms) => pending.push(setTimeout(bump, ms)));
    };
    cycleRef.current();

    return () => {
      cycleRef.current = undefined;
      pending.forEach(clearTimeout);
      clearTimeout(rewindDelay);
      clearInterval(rewindStep);
    };
  }, []);

  return (
    <section id="why" className="lp2-anchor" ref={sectionRef} data-demo style={{ maxWidth: 1000, margin: "0 auto", padding: "132px 28px 0" }}>
      <div data-reveal style={{ textAlign: "center" }}>
        <div className="lp2-kicker">{t.whyKicker}</div>
        <h2 className="lp2-h2" style={{ margin: "12px auto 0", maxWidth: 560 }}>
          {t.whyTitle}
        </h2>
      </div>

      {/* reveal on the grid, not on each card, so both appear together the way
          the three step cards below do. Keys are positional: keying on the
          title remounted the cards on a language switch, which dropped the
          `in` class and left them invisible until the next scroll. */}
      <div data-reveal className="lp2-whygrid">
        {t.why.map((w, i) => (
          <div key={i} className="lp2-whycard">
            <CardScreen>
              {i === 0 ? (
                <FindDemo hits={hits} />
              ) : (
                <ReachDemo t={t} clients={clients} tally={tally} />
              )}
            </CardScreen>
            <div
              style={{
                marginTop: 20,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#FAFAFB",
              }}
            >
              {w.title}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, textWrap: "pretty", color: "#8A8F98" }}>
              {w.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- steps -- */

function StepsSection({ t }: { t: Copy }) {
  return (
    <section data-demo style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 28px 0" }}>
      <div data-reveal className="lp2-steps">
        {t.steps.map((s, i) => (
          <div key={i} className="lp2-step">
            <div className="lp2-step__n">{s.n}</div>
            <div style={{ marginTop: 16, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.02em", color: "#FAFAFB" }}>
              {s.title}
            </div>
            <p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.6, textWrap: "pretty", color: "#8A8F98" }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- pricing -- */

function PricingSection({ t, cs }: { t: Copy; cs: boolean }) {
  return (
    <section id="pricing" className="lp2-anchor" style={{ maxWidth: 1000, margin: "0 auto", padding: "150px 28px 0" }}>
      <div data-reveal style={{ textAlign: "center" }}>
        <div className="lp2-kicker">{t.priceKicker}</div>
        <h2 className="lp2-h2" style={{ margin: "12px auto 0", maxWidth: 520 }}>
          {t.priceTitle}
        </h2>
        <p
          style={{
            margin: "12px auto 0",
            maxWidth: 420,
            fontSize: 13.5,
            lineHeight: 1.62,
            textWrap: "pretty",
            color: "#8A8F98",
          }}
        >
          {t.priceSub}
        </p>
      </div>

      <div data-reveal className="lp2-pricegrid">
        {priceCards(cs).map((p, i) => (
          <div
            key={i}
            id={i === 1 ? "agencies" : undefined}
            className={i === 1 ? "lp2-pricecard lp2-anchor" : "lp2-pricecard"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.01em", color: "#C9CDD3" }}>
                {p.name}
              </span>
              <span className="lp2-pricebadge">{p.badgeText}</span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7078" }}>{t.priceFrom}</span>
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  color: "#FAFAFB",
                }}
              >
                {p.price}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", color: "#6B7078" }}>
                {p.unit}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                marginTop: 9,
                fontSize: 11.5,
                color: "#6B7078",
              }}
            >
              <span>{p.billing}</span>
              {!p.light && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flex: "none" }}
                  aria-hidden
                >
                  {SPARK_PATHS.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </svg>
              )}
            </div>

            <LandingAuthLink href="/register" className={p.light ? "lp2-pricecta lp2-pricecta--white" : "lp2-pricecta lp2-pricecta--raised"}>
              {p.ctaText}
            </LandingAuthLink>

            <div style={{ marginTop: 24, fontSize: 12, fontWeight: 700, color: "#F2F3F5" }}>{p.includes}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 13 }}>
              {p.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Tick />
                  <span style={{ fontSize: 12.5, lineHeight: 1.5, textWrap: "pretty", color: "#8A8F98" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div data-reveal className="lp2-trial">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8A8F98"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flex: "none" }}
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15.5 14" />
        </svg>
        <span
          style={{
            flex: 1,
            minWidth: 220,
            fontSize: 12.5,
            lineHeight: 1.5,
            textWrap: "pretty",
            color: "#8A8F98",
          }}
        >
          {t.priceTrial} <span style={{ fontWeight: 700, color: "#F2F3F5" }}>{t.priceTrialStrong}</span>
        </span>
        <a href="/pricing" className="lp2-comparebtn">
          {t.priceCompare}
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ faq -- */

function FaqSection({
  t,
  openFaq,
  setOpenFaq,
}: {
  t: Copy;
  openFaq: number | null;
  setOpenFaq: (v: number | null) => void;
}) {
  return (
    <section id="faq" className="lp2-faqsection lp2-anchor">
      <div className="lp2-faqgrid">
        <div data-reveal>
          <h2 className="lp2-h2" style={{ margin: "0 0 12px", textWrap: "pretty" }}>
            {t.faqTitle}
          </h2>
          <p
            style={{
              margin: "0 0 18px",
              maxWidth: 320,
              fontSize: 13.5,
              lineHeight: 1.62,
              textWrap: "pretty",
              color: "#8A8F98",
            }}
          >
            {t.faqSub}
          </p>
          <LandingAuthLink data-faqbot href="/register" className="lp2-faqbot">
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                flex: "none",
              }}
            >
              <BotGlyph size={13} fill="#C9CDD3" opacity={0.9} />
            </span>
            <span style={{ whiteSpace: "nowrap", fontSize: 12.5, color: "#8A8F98" }}>
              {t.botHintQ} <span style={{ fontWeight: 700, color: "#F2F3F5" }}>{t.botAskCta}</span>
            </span>
          </LandingAuthLink>
        </div>

        <div data-reveal style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {t.faq.map((q, i) => {
            const open = openFaq === i;
            return (
              <div key={q.q} style={{ boxSizing: "border-box", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <a
                  data-faq
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenFaq(open ? null : i);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "12px 0",
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    textWrap: "pretty",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "color 0.14s ease",
                    color: open ? "#FAFAFB" : "#8A8F98",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      flex: "none",
                      marginTop: 3,
                      transition: "transform 0.24s cubic-bezier(0.4,0,0.2,1)",
                      transform: `rotate(${open ? 90 : 0}deg)`,
                    }}
                    aria-hidden
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                  <span>{q.q}</span>
                </a>
                <div
                  style={{
                    display: "grid",
                    transition:
                      "grid-template-rows 0.34s cubic-bezier(0.4,0,0.2,1), opacity 0.34s cubic-bezier(0.4,0,0.2,1)",
                    gridTemplateRows: open ? "1fr" : "0fr",
                    opacity: open ? 1 : 0,
                  }}
                >
                  <div
                    style={{
                      overflow: "hidden",
                      padding: `0 0 ${open ? 12 : 0}px 20px`,
                      fontSize: 13,
                      lineHeight: 1.6,
                      textWrap: "pretty",
                      color: "#6B7078",
                      transition: "padding-bottom 0.34s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  >
                    {q.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- closing head -- */

const CTA_SIZE = 566;
const EYE_W_PCT = (85.33 / 500) * 100;
const EYE_H_PCT = (112.88 / 500) * 100;
const CTA_EYES = [
  { cx: 42.4, cy: 60.5, trailing: false },
  { cx: 68.4, cy: 54.8, trailing: true },
] as const;

/** blink timing lifted straight from the painted mark, so both blink alike */
const CTA_BLINK_LAG = 14;

function ctaLidCurve(dt: number, close: number, hold: number, open: number) {
  if (dt <= 0) return 0;
  if (dt < close) {
    const u = dt / close;
    return u * u * (3 - 2 * u);
  }
  if (dt < close + hold) return 1;
  const u = Math.min(1, (dt - close - hold) / open);
  return Math.pow(1 - u, 2.4);
}

/** the outline ring; it fades out where it crosses the footer's edge */
const RING_R = (CTA_SIZE * 1.06) / 2 - 0.75;

function ctaEyeTransform(gx: number, gy: number, lid: number, pop = 0) {
  const range = CTA_SIZE * 0.03;
  const k = 1 + pop;
  return (
    "translate(-50%, -50%) " +
    `translate(${(gx * range).toFixed(2)}px, ${(gy * range * REACH_Y).toFixed(2)}px) ` +
    `rotate(-7deg) ` +
    // the painted mark's floor and curve, verbatim
    `scaleX(${k.toFixed(3)}) scaleY(${(Math.max(0.16, 1 - lid * 0.84) * k).toFixed(3)})`
  );
}


/**
 * The outline head under the closing CTA. It ignores the cursor entirely and
 * lives on its own clock: it looks around the room, blinks on its own rhythm,
 * and every 9–15 s glances straight at the sign-up button before drifting off.
 */
function CtaHead() {
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const ringId = `ctaring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    const head = headRef.current;
    const tilt = tiltRef.current;
    if (!left || !right || !head || !tilt) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { gx: 0, gy: 0 };
    const cur = { gx: 0, gy: 0 };
    let glance: { gx: number; gy: number } | null = null;
    let pose: {
      gx: number;
      gy: number;
      pop: number;
      slow?: boolean;
      quick?: boolean;
    } | null = null;
    let pop = 0;
    let lid = 0;
    let lid2 = 0;
    let lastBlink = 0;
    let blink: { t0: number; close: number; hold: number; open: number; total: number } | null =
      null;
    let startle = 0;
    let startleTarget = 0;
    let hoverTarget = 0;
    let hover = 0;
    let lastMove = performance.now();
    let nextWander = performance.now() + 900;
    let raf = 0;
    let stopped = false;
    // only one beat may drive the eyes at a time; without this the loops cut
    // into each other's sequences and the eyes hopped between two scripts
    let busy = false;
    const claim = () => {
      if (busy) return false;
      busy = true;
      return true;
    };

    // No CSS transition on the eyes. The loop writes transform every frame, and
    // a transition on top of that restarts itself against a moving target every
    // frame, which is what made the poses stutter. All easing is done here.
    left.style.transition = "none";
    right.style.transition = "none";

    const frame = () => {
      const now = performance.now();
      // a scripted pose outranks the glance, which outranks the idle wander
      const held = pose ?? glance;

      if (held) {
        target.gx = held.gx;
        target.gy = held.gy;
        nextWander = now + 1200;
      } else if (now - lastMove > 2200 && now > nextWander) {
        // the cursor has gone quiet: drift on its own, same as the solid marks
        target.gx = (Math.random() * 2 - 1) * 3;
        target.gy = (Math.random() * 2 - 1) * 1.3;
        nextWander = now + 1700 + Math.random() * 2600;
      }

      // one easing rate, chosen by what is driving: a flick snaps, a held look
      // arrives deliberately, idle drifting is slowest of all
      const k = pose?.quick ? 0.085 : pose?.slow ? 0.03 : pose ?? glance ? 0.07 : 0.034;
      cur.gx += (target.gx - cur.gx) * k;
      cur.gy += (target.gy - cur.gy) * k;

      pop += ((pose?.pop ?? 0) - pop) * 0.07;
      startle += (startleTarget - startle) * 0.16;
      hover += (hoverTarget - hover) * 0.14;
      if (blink) {
        const dt = now - blink.t0;
        lid = ctaLidCurve(dt, blink.close, blink.hold, blink.open);
        lid2 = ctaLidCurve(dt - CTA_BLINK_LAG, blink.close, blink.hold, blink.open);
        if (dt >= blink.total) {
          lid = 0;
          lid2 = 0;
          blink = null;
          lastBlink = now;
        }
      }

      // The head leans the way it is looking, but barely. At 1.5deg per unit it
      // reached almost 4deg on a full look sideways, which tipped the whole ring
      // over and read as the eyes being crooked rather than as a lean.
      const lean = Math.max(-1.3, Math.min(1.3, cur.gx * 0.45));
      tilt.style.transform = `rotate(${lean.toFixed(2)}deg)`;

      // Both eyes sit at the same offset: trailing one behind the other in
      // position reads as a squint. Only the blink and the swell differ.
      const swell = pop + startle * 0.11 + hover * 0.07;
      left.style.transform = ctaEyeTransform(cur.gx, cur.gy, lid, swell);
      right.style.transform = ctaEyeTransform(cur.gx, cur.gy, lid2, swell);

      raf = requestAnimationFrame(frame);
    };
    frame();

    // one shared timer pool so cleanup catches both loops
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });

    const startBlink = (sleepy: boolean) => {
      const now = performance.now();
      if (blink || now - lastBlink < 2800) return;
      const [close, hold, open] = sleepy ? [140, 90, 280] : [90, 36, 200];
      blink = { t0: now, close, hold, open, total: close + hold + open + CTA_BLINK_LAG };
      lastBlink = now;
    };

    const blinkLoop = async () => {
      for (;;) {
        await wait(3800 + Math.random() * 5600);
        if (stopped) return;
        startBlink(Math.random() < 0.1);
      }
    };

    const glanceLoop = async () => {
      for (;;) {
        await wait(9000 + Math.random() * 6000);
        if (stopped) return;
        if (!claim()) continue;
        const btn = document.querySelector<HTMLElement>("[data-cta-target]");
        if (!btn) {
          busy = false;
          continue;
        }
        const b = btn.getBoundingClientRect();
        const h = head.getBoundingClientRect();
        const gx = Math.max(-1, Math.min(1, (b.left + b.width / 2 - (h.left + h.width / 2)) / (h.width * 0.5)));
        const gy = Math.max(-1, Math.min(1, (b.top + b.height / 2 - (h.top + h.height * 0.55)) / (h.height * 0.5)));
        glance = { gx, gy };
        await wait(2100);
        glance = null;
        busy = false;
      }
    };

    /** every so often it drops its eyes to the floor, wide, then looks back up */
    const moodLoop = async () => {
      for (;;) {
        await wait(20000 + Math.random() * 14000);
        if (stopped) return;
        if (!claim()) continue;
        pose = { gx: -2.8, gy: 5.5, pop: 0.2 };
        await wait(2400);
        if (stopped) return;
        // come back across to the right rather than snapping to centre
        pose = { gx: 1.8, gy: 0.2, pop: 0 };
        await wait(900);
        pose = null;
        busy = false;
      }
    };

    /**
     * Look right, settle, then snap across to the left and stay there a while.
     * The point is the contrast: a slow arrival, a hard flick, a long hold.
     */
    const dartLoop = async () => {
      for (;;) {
        await wait(9000 + Math.random() * 7000);
        if (stopped) return;
        if (!claim()) continue;
        pose = { gx: 3.3, gy: 0.1, pop: 0 };
        await wait(1100);
        if (stopped) return;
        pose = { gx: -4.6, gy: 0.1, pop: 0, quick: true };
        await wait(1900);
        pose = null;
        busy = false;
      }
    };

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onMove = (e: MouseEvent) => {
      // the same reading the solid marks take, opened up to this head's range
      target.gx = clamp((e.clientX / window.innerWidth - 0.5) * 2.2) * 3;
      target.gy = clamp((e.clientY / window.innerHeight - 0.5) * 2.2) * 1.3;
      lastMove = performance.now();

      const r = head.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.55);
      hoverTarget = Math.hypot(dx, dy) < r.width * 0.5 ? 1 : 0;
    };
    let startleTimer: ReturnType<typeof setTimeout> | undefined;
    const onDown = () => {
      clearTimeout(startleTimer);
      startleTarget = 1;
      startleTimer = setTimeout(() => {
        startleTarget = 0;
      }, 180);
      lastMove = performance.now();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);

    void blinkLoop();
    void glanceLoop();
    void moodLoop();
    void dartLoop();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(startleTimer);
      timers.forEach(clearTimeout);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  const orbW = CTA_SIZE * 1.06;

  return (
    <>
      {/* three layers, because each owns a transform of its own: the tilt is
          driven from JS, the breathe and the drift are separate CSS cycles */}
      <div ref={tiltRef} className="lp2-ctatilt">
        <div className="lp2-ctabreathe">
        <div
          ref={headRef}
          data-eyes
          data-cta-head
          className="lp2-ctahead"
          style={{
            position: "relative",
            width: CTA_SIZE,
            height: CTA_SIZE,
            flex: "none",
            // The head box is 566px tall and pulled up over the buttons above
            // it, so it must never intercept a click. Hover is worked out from
            // the cursor's distance instead of from mouse events.
            pointerEvents: "none",
          }}
        >
          {/* The dome is a plain outline at this scale, not the painted orb. It
              is an SVG so the stroke can carry a gradient: the ring dies away to
              nothing at the two points where it meets the footer's edge, left
              and right, and only reads toward the crown. */}
          <svg
            className="lp2-ctaring"
            width={orbW}
            height={orbW}
            viewBox={`0 0 ${orbW} ${orbW}`}
            style={{
              position: "absolute",
              left: (CTA_SIZE - orbW) / 2,
              top: CTA_SIZE * 0.24,
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <defs>
              {/* a shade off vertical, so the left seam runs out of stroke a
                  little sooner than the right one does */}
              <linearGradient id={ringId} x1="0.028" y1="0" x2="0" y2="1">
                {/* 0.46 is where the footer's edge actually crosses the
                    circle, measured in the browser, so the stroke reaches zero
                    exactly at the two points where it meets the seam */}
                <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
                <stop offset="0.36" stopColor="#fff" stopOpacity="0.2" />
                <stop offset="0.46" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx={orbW / 2}
              cy={orbW / 2}
              r={RING_R}
              fill="none"
              stroke={`url(#${ringId})`}
              strokeWidth="1.5"
            />
          </svg>
          {CTA_EYES.map((spec, i) => (
            <span
              key={spec.cx}
              ref={i === 0 ? leftRef : rightRef}
              style={{
            position: "absolute",
            left: `${spec.cx}%`,
            top: `${spec.cy}%`,
            width: (CTA_SIZE * EYE_W_PCT) / 100,
            height: (CTA_SIZE * EYE_H_PCT) / 100,
            margin: 0,
            borderRadius: "50%",
            background: "transparent",
            border: "1.5px solid rgba(255,255,255,0.2)",
            boxSizing: "border-box",
                transform: ctaEyeTransform(0, 0, 0),
                pointerEvents: "none",
          }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function EndSection({ t }: { t: Copy }) {
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "34px 28px 0" }}>
      <div data-reveal className="lp2-end">
        <h2 className="lp2-endtitle">{t.endTitle}</h2>
        <p
          style={{
            margin: "0 auto 26px",
            maxWidth: 460,
            fontSize: 14.5,
            lineHeight: 1.6,
            textWrap: "pretty",
            color: "#8A8F98",
          }}
        >
          {t.endBody}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <LandingAuthLink data-cta-target href="/register" className="lp2-btn lp2-btn--white">
            {t.ctaPrimary}
          </LandingAuthLink>
          <LandingAuthLink href="/login" className="lp2-btn lp2-btn--raised">
            {t.ctaSecondary}
          </LandingAuthLink>
        </div>
        <div
          // the circle starts 24 % down its own box, so a bigger head sits
          // lower; the top margin claws that back and the bottom one keeps the
          // block's layout height where it was, so the footer does not move
          // pulled up over the CTA row by its top margin, so nothing inside may
          // take a click: this box, the fade and the head all sit on the buttons
          className="lp2-endhead"
          style={{ pointerEvents: "none" }}
        >
          <span className="lp2-end__fade" />
          <CtaHead />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- footer -- */

function Footer({ t }: { t: Copy }) {
  const [legalDoc, setLegalDoc] = useState<LegalDocumentId | null>(null);

  return (
    <footer className="lp2-footer">
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "46px 28px 0" }}>
        <div className="lp2-footgrid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BotGlyph size={26} fill="#F2F3F5" opacity={1} />
              <span style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.02em", color: "#F2F3F5" }}>
                Sklyvo
              </span>
            </div>
            <p
              style={{
                margin: "13px 0 0",
                maxWidth: 250,
                fontSize: 12.5,
                lineHeight: 1.6,
                textWrap: "pretty",
                color: "#8A8F98",
              }}
            >
              {t.footClaim}
            </p>
          </div>

          {t.footCols.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#6B7078",
                }}
              >
                {col.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
                {col.links.map((l) => {
                  if (l.auth) {
                    return (
                      <LandingAuthLink
                        key={l.label}
                        href={l.auth === "login" ? "/login" : "/register"}
                        className="lp2-footlink"
                      >
                        {l.label}
                      </LandingAuthLink>
                    );
                  }
                  if (l.href === "#") {
                    return (
                      <a
                        key={l.label}
                        href="#"
                        className="lp2-footlink"
                        onClick={(e) => {
                          e.preventDefault();
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        {l.label}
                      </a>
                    );
                  }
                  return (
                    <a
                      key={l.label}
                      href={l.href}
                      className="lp2-footlink"
                      {...(l.external
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                    >
                      {l.label}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="lp2-footbar">
          <span style={{ fontSize: 11, color: "#6B7078" }}>
            {t.footNote}
            <a
              href="https://venegard.com"
              target="_blank"
              rel="noreferrer"
              className="lp2-footlink"
              style={{ fontWeight: 400, fontSize: 11 }}
            >
              Venegard
            </a>
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 14px" }}>
            {LEGAL_DOCUMENT_IDS.map((id, index) => (
              <button
                key={id}
                type="button"
                className="lp2-footlink"
                style={{ fontSize: 11, whiteSpace: "nowrap" }}
                onClick={() => setLegalDoc(id)}
              >
                {t.legalList[index] ?? id}
              </button>
            ))}
            <button
              type="button"
              data-top
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label={t.footTop}
              className="lp2-topbtn"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="12" y1="19" x2="12" y2="6" />
                <polyline points="6 11 12 5 18 11" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <LegalDocumentDialog
        documentId={legalDoc}
        onOpenChange={(open) => {
          if (!open) setLegalDoc(null);
        }}
      />
    </footer>
  );
}

export { LandingV2 as LandingPage };
