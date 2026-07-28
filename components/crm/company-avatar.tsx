"use client";

import { useState } from "react";
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
  const showImage = Boolean(faviconUrl) && !failed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-blue-100 bg-blue-50 font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
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
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={cn("font-bold", textClassName)}>{initials}</span>
      )}
    </div>
  );
}
