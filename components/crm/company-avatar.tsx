"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

type CompanyAvatarProps = {
  name: string;
  initials: string;
  faviconUrl?: string | null;
  className?: string;
  /** square rounded-lg (CRM table) vs rounded-full (mobile) */
  shape?: "square" | "circle";
  sizeClassName?: string;
  textClassName?: string;
};

/**
 * Google s2 returns HTTP 200 even for missing favicons — a generic 16×16 globe.
 * Treat tiny default icons as missing so we show company initials instead.
 */
function isGenericFavicon(img: HTMLImageElement): boolean {
  return (
    img.naturalWidth > 0 && img.naturalWidth <= 16 && img.naturalHeight <= 16
  );
}

export function CompanyAvatar({
  name,
  initials,
  faviconUrl,
  className,
  shape = "square",
  sizeClassName = "h-9 w-9",
  textClassName = "text-[10px]",
}: CompanyAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [faviconUrl]);

  const showImage = Boolean(faviconUrl) && !failed;

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    if (isGenericFavicon(e.currentTarget)) {
      setFailed(true);
    }
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-blue-100 bg-blue-50 font-bold text-blue-700 ",
        sizeClassName,
        shape === "circle" ? "rounded-full" : "rounded-lg",
        className,
      )}
      title={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl!}
          alt=""
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={cn("font-bold", textClassName)}>{initials}</span>
      )}
    </div>
  );
}
