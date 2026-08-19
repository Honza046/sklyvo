import { permanentRedirect } from "next/navigation";

/** Legacy URL — marketing home lives at `/`. */
export default function LandingRedirect() {
  permanentRedirect("/");
}
