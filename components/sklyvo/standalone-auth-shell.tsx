"use client";

import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import "@/components/sklyvo/auth.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

function LockCrest() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F2F3F5"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function StandaloneAuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${jakarta.variable} min-h-dvh bg-[#08090a]`}>
      <main className="sklyvo-login sklyvo-login--solo">
        <Link className="sklyvo-brand" href="/" aria-label="Sklyvo — zpět na úvod">
          <SklyvoMark size={30} />
          <span className="sklyvo-brand__word">Sklyvo</span>
        </Link>

        <div className="sklyvo-auth sklyvo-auth--solo" data-mode="recovery">
          <section className="sklyvo-card sklyvo-card--form">
            <div className="sklyvo-card__crest">
              <span className="sklyvo-crest">
                <LockCrest />
              </span>
            </div>
            <div className="sklyvo-card__body">{children}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
