"use client";

import "@/components/sklyvo/landing.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LanguageToggle } from "@/components/sklyvo/language-toggle";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import { useLanguage } from "@/context/LanguageContext";
import { messages } from "@/lib/i18n/messages";
import { useReveal } from "@/lib/use-reveal";

const TILE_COUNT = 12;
const TILE_CYCLE = 3600;
const QUEUE_CYCLE = 5400;

const TALLY_MIN = 128;
const TALLY_MAX = 143;

const SEAT_FROM = 90;
const SEAT_TO = 27;
const SEAT_TOTAL = 500;
const SEAT_DURATION = 5600;

/** the initial values are fixed so the server and the client agree */
const FIRST_HITS = [2, 5, 8, 9];
const FIRST_CLIENTS = [
  "Premier Fitness",
  "Koloseum Sport",
  "Metalshop Megastore",
];

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

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function seatScale(remaining: number) {
  return ((100 - (remaining / SEAT_TOTAL) * 100) / 100).toFixed(5);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LandingPage() {
  const { language } = useLanguage();
  const copy = messages[language].landing;
  const [hits, setHits] = useState<number[]>(FIRST_HITS);
  const [clients, setClients] = useState<string[]>(FIRST_CLIENTS);
  const [tally, setTally] = useState(TALLY_MIN);
  const [openFaq, setOpenFaq] = useState(0);

  const seatCardRef = useRef<HTMLDivElement>(null);
  const seatNumRef = useRef<HTMLSpanElement>(null);
  const seatBarRef = useRef<HTMLSpanElement>(null);

  useReveal();

  // a fresh set of matches every scan
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => {
      const picked = shuffled([...Array(TILE_COUNT).keys()])
        .slice(0, 3 + Math.floor(Math.random() * 5))
        .sort((a, b) => a - b);
      setHits(picked);
    }, TILE_CYCLE);
    return () => clearInterval(id);
  }, []);

  // a fresh batch of companies every outreach cycle
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const pool = shuffled(CLIENT_POOL);
    let cursor = 0;
    const id = setInterval(() => {
      const picked = [0, 1, 2].map((k) => pool[(cursor + k) % pool.length]);
      cursor = (cursor + 3) % pool.length;
      setClients(picked);
    }, QUEUE_CYCLE);
    return () => clearInterval(id);
  }, []);

  // one tick per delivered message, then a smooth wind back to the start
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    let rewindId: ReturnType<typeof setInterval> | undefined;
    let phase: "count" | "rewind" = "count";
    let value = TALLY_MIN;

    const push = (next: number) => {
      value = next;
      setTally(next);
    };

    const startRewind = () => {
      phase = "rewind";
      timeouts.add(
        setTimeout(() => {
          rewindId = setInterval(() => {
            if (value <= TALLY_MIN) {
              clearInterval(rewindId);
              rewindId = undefined;
              phase = "count";
              return;
            }
            push(value - 1);
          }, 55);
        }, 1100),
      );
    };

    const bump = () => {
      if (phase !== "count") return;
      push(value + 1);
      if (value >= TALLY_MAX) startRewind();
    };

    const cycle = () => {
      for (const ms of [2440, 2940, 3440]) timeouts.add(setTimeout(bump, ms));
    };

    cycle();
    const cycleId = setInterval(cycle, QUEUE_CYCLE);

    return () => {
      for (const id of timeouts) clearTimeout(id);
      clearInterval(cycleId);
      if (rewindId) clearInterval(rewindId);
    };
  }, []);

  // the seat counter runs down once, the first time the panel is on screen
  useEffect(() => {
    const card = seatCardRef.current;
    const num = seatNumRef.current;
    const bar = seatBarRef.current;
    if (!card || !num || !bar) return;

    const settle = () => {
      num.textContent = String(SEAT_TO);
      bar.style.transform = `scaleX(${seatScale(SEAT_TO)})`;
      bar.dataset.counted = "true";
    };

    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      settle();
      return;
    }

    let frameId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - start) / SEAT_DURATION);
          const eased = 1 - Math.pow(1 - progress, 3.2);
          const remaining = SEAT_FROM - (SEAT_FROM - SEAT_TO) * eased;
          num.textContent = String(Math.round(remaining));
          bar.style.transform = `scaleX(${seatScale(remaining)})`;
          if (progress < 1) frameId = requestAnimationFrame(step);
          else bar.dataset.counted = "true";
        };
        frameId = requestAnimationFrame(step);
      },
      { rootMargin: "-6% 0px -6% 0px" },
    );

    observer.observe(card);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="lp-page">
      <LanguageToggle />

      {/* ------------------------------------------------------------ hero */}
      <section className="lp-hero">
        <div className="lp-hero__mark">
          <SklyvoMark size={62} />
        </div>

        <h1 className="lp-hero__title">{copy.title}</h1>
        <p className="lp-hero__sub">{copy.sub}</p>

        <div className="lp-hero__actions">
          <Link className="lp-cta lp-cta--dark" href="/register">
            {copy.ctaPrimary}
          </Link>
          <Link className="lp-cta lp-cta--light" href="/login">
            {copy.ctaSecondary}
          </Link>
        </div>

        <div className="lp-hero__note">
          <span className="lp-live-dot">
            <span className="lp-live-dot__ring" />
            <span className="lp-live-dot__core" />
          </span>
          {copy.note}
        </div>
      </section>

      {/* ------------------------------------------------------ demo slot */}
      <section className="lp-section lp-section--demo">
        <div className="lp-demo" data-reveal>
          <div className="lp-demo__inner">
            <div className="lp-demo__play">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polygon points="7 4 20 12 7 20 7 4" />
              </svg>
            </div>
            <div className="lp-demo__label">{copy.videoLabel}</div>
          </div>
          <div className="lp-demo__shine" />
        </div>
      </section>

      {/* ------------------------------------------------------------- why */}
      <section className="lp-section">
        <div className="lp-heading" data-reveal>
          <div className="lp-kicker">{copy.whyKicker}</div>
          <h2 className="lp-h2">{copy.whyTitle}</h2>
        </div>

        <div className="lp-why">
          <div className="lp-why__card" data-reveal>
            <div className="lp-why__stage">
              <div className="lp-tiles">
                {Array.from({ length: TILE_COUNT }, (_, i) => {
                  const hit = hits.includes(i);
                  const rotate = (i % 2 ? 1 : -1) * (6 + (i % 3) * 4);
                  const delay = (i % 4) * 0.07 + Math.floor(i / 4) * 0.05;
                  return (
                    <div
                      key={i}
                      className={hit ? "lp-tile lp-tile--hit" : "lp-tile"}
                      style={
                        {
                          "--rot": `${rotate}deg`,
                          animationDelay: `${delay}s`,
                        } as React.CSSProperties
                      }
                    >
                      <span
                        className="lp-tile__bar"
                        style={{ width: `${58 + ((i * 7) % 34)}%` }}
                      />
                      <span
                        className="lp-tile__bar lp-tile__bar--thin"
                        style={{ width: `${34 + ((i * 11) % 26)}%` }}
                      />
                      {hit && (
                        <span
                          className="lp-tile__spark"
                          style={{ animationDelay: `${delay}s` }}
                        >
                          ✦
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="lp-scanner" />
              <div className="lp-hits">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span className="lp-hits__label">
                  {hits.length} {copy.matchLabel}
                </span>
              </div>
            </div>
            <div className="lp-why__title">{copy.why[0].title}</div>
            <p className="lp-why__body">{copy.why[0].body}</p>
          </div>

          <div className="lp-why__card" data-reveal>
            <div className="lp-why__stage">
              <div className="lp-queue">
                {clients.map((name, i) => (
                  <div
                    key={`${name}-${i}`}
                    className="lp-queue__row"
                    style={{ animationDelay: `${i * 0.5}s` }}
                  >
                    <span className="lp-queue__name">{name}</span>
                    <span
                      className="lp-pill lp-pill--queued"
                      style={{ animationDelay: `${i * 0.5}s` }}
                    >
                      {copy.qQueued}
                    </span>
                    <span
                      className="lp-pill lp-pill--sending"
                      style={{ animationDelay: `${i * 0.5}s` }}
                    >
                      <span className="lp-spinner" />
                      {copy.qSending}
                    </span>
                    <span
                      className="lp-pill lp-pill--sent"
                      style={{ animationDelay: `${i * 0.5}s` }}
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
                      {copy.qSent}
                    </span>
                    <span
                      className="lp-queue__bar"
                      style={{ animationDelay: `${i * 0.5}s` }}
                    />
                  </div>
                ))}
              </div>
              <div className="lp-tally">
                <span className="lp-tally__label">{copy.qTally}</span>
                <div className="lp-spacer" />
                <span className="lp-tally__value">{tally}</span>
              </div>
            </div>
            <div className="lp-why__title">{copy.why[1].title}</div>
            <p className="lp-why__body">{copy.why[1].body}</p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- steps */}
      <section className="lp-section">
        <div className="lp-steps" data-reveal>
          {copy.steps.map((step) => (
            <div key={step.n} className="lp-step">
              <div className="lp-step__n">{step.n}</div>
              <div className="lp-step__title">{step.title}</div>
              <p className="lp-step__body">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section className="lp-section lp-section--narrow">
        <div className="lp-heading" data-reveal>
          <h2 className="lp-faq__title">{copy.faqTitle}</h2>
          <p className="lp-faq__sub">{copy.faqSub}</p>
        </div>

        <div className="lp-faq">
          {copy.faq.map((entry, i) => {
            const open = openFaq === i;
            return (
              <div key={entry.q} className="lp-faq__item" data-reveal>
                <button
                  type="button"
                  className="lp-faq__q"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? -1 : i)}
                >
                  <span className="lp-faq__label">{entry.q}</span>
                  <span className="lp-faq__icon">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <line
                        className="lp-faq__bar"
                        x1="12"
                        y1="5"
                        x2="12"
                        y2="19"
                      />
                    </svg>
                  </span>
                </button>
                <div className="lp-faq__body" data-open={open}>
                  <div className="lp-faq__clip">
                    <p className="lp-faq__a">{entry.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --------------------------------------------------- closing panel */}
      <section className="lp-section lp-section--end">
        <div className="lp-end" data-reveal>
          <div className="lp-end__glow" />

          <div className="lp-end__col">
            <h2 className="lp-end__title">{copy.endTitle}</h2>
            <p className="lp-end__body">{copy.endBody}</p>
            <div className="lp-end__actions">
              <Link className="lp-cta lp-cta--onDark" href="/register">
                {copy.ctaPrimary}
              </Link>
              <Link className="lp-cta lp-cta--sunkDark" href="/login">
                {copy.ctaSecondary}
              </Link>
            </div>
            <div className="lp-end__note">{copy.endNote}</div>
          </div>

          <div className="lp-end__stage">
            <div className="lp-seat" ref={seatCardRef}>
              <div className="lp-seat__label">
                <span className="lp-seat__dot">
                  <span />
                  <span />
                </span>
                {copy.seatLabel}
              </div>
              <div className="lp-seat__count">
                <span className="lp-seat__num" ref={seatNumRef}>
                  {SEAT_FROM}
                </span>
                <span className="lp-seat__of">{copy.seatOf}</span>
              </div>
              <div className="lp-seat__track">
                <span className="lp-seat__bar" ref={seatBarRef}>
                  <span className="lp-seat__sheen" />
                </span>
              </div>
              <div className="lp-seat__taken">{copy.seatTaken}</div>
              <div className="lp-seat__note">{copy.seatNote}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- footer */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__grid">
            <div>
              <div className="lp-footer__brand">
                <SklyvoMark size={26} />
                <span className="lp-footer__word">Sklyvo</span>
              </div>
              <p className="lp-footer__claim">{copy.footClaim}</p>
            </div>

            {copy.footCols.map((column) => (
              <div key={column.title}>
                <div className="lp-footer__title">{column.title}</div>
                <div className="lp-footer__links">
                  {column.links.map((link) => (
                    <a key={link} className="lp-footer__link" href="#">
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="lp-footer__bar">
            <span className="lp-footer__note">{copy.footNote}</span>
            <span className="lp-footer__ven">
              {copy.venLead}
              <a
                href="https://venegard.com"
                target="_blank"
                rel="noreferrer"
              >
                Venegard
              </a>
            </span>
            <div className="lp-spacer" />
            <div className="lp-footer__legal">
              <a className="lp-footer__link" href="#">
                {copy.footTerms}
              </a>
              <a className="lp-footer__link" href="#">
                {copy.footPrivacy}
              </a>
              <a className="lp-footer__link" href="#">
                {copy.footContact}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
