import "@/components/sklyvo/landing.css";
import type { Viewport } from "next";

export const viewport: Viewport = { themeColor: "#08090a" };

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
