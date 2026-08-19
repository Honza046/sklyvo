"use client";

import { useEffect, useState, type CSSProperties, type SyntheticEvent } from "react";
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
  /** Custom initials chip styling when favicon is unavailable. */
  fallbackStyle?: CSSProperties;
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
  fallbackStyle,
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
        "relative flex shrink-0 items-center justify-center overflow-hidden font-bold",
        sizeClassName,
        shape === "circle" ? "rounded-full" : "rounded-[9px]",
        showImage
          ? "border border-[rgba(255,255,255,0.1)] bg-[#131417]"
          : fallbackStyle
            ? null
            : "border border-[color-mix(in_oklab,var(--sk-brand)_28%,transparent)] bg-[color-mix(in_oklab,var(--sk-brand)_14%,var(--n-field))] text-[color:var(--sk-brand)]",
        className,
      )}
      style={!showImage && fallbackStyle ? fallbackStyle : undefined}
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
