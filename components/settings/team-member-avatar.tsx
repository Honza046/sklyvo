"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarHue(name: string) {
  const seed = name.trim() || "?";
  return (seed.charCodeAt(0) * 37) % 360;
}

function isLikelyAvatarUrl(value: string) {
  if (value.startsWith("data:image/")) return true;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type TeamMemberAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
};

export function TeamMemberAvatar({
  name,
  avatarUrl,
  className,
}: TeamMemberAvatarProps) {
  const src = avatarUrl?.trim() ?? "";
  const canLoadPhoto = isLikelyAvatarUrl(src);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const showPhoto = canLoadPhoto && !imageFailed;
  const hue = avatarHue(name);
  const initials = initialsOf(name) || "?";

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn("sk-team-avatar sk-team-avatar--photo", className)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={cn("sk-team-avatar", className)}
      style={
        {
          "--sk-team-avatar-hue": hue,
        } as CSSProperties
      }
    >
      {initials}
    </span>
  );
}
