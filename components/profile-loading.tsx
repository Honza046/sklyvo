import { Loader2 } from "lucide-react";

/** Centrované kolečko při načítání `/account` (Můj profil). */
export function ProfilePageLoadingSpinner() {
  return (
    <div
      className="sk-profile-page sk-profile-page__loading"
      aria-busy="true"
      aria-label="Načítání profilu"
    >
      <Loader2
        className="h-7 w-7 animate-spin text-[#6b7078]"
        strokeWidth={2}
        aria-hidden
      />
      <span className="sr-only">Načítání profilu</span>
    </div>
  );
}

/** @deprecated Prefer `ProfilePageLoadingSpinner`. */
export const ProfilePageSkeleton = ProfilePageLoadingSpinner;
