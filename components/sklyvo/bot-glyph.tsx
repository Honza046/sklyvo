"use client";

import { useId } from "react";

/**
 * The flat 2D Sklyvo mark, taken verbatim from the `2D Sklyvo.svg` brand asset:
 * the head drawn oversized and clipped to a rounded tile by an alpha mask. The
 * earlier hand-rolled version dropped the mask and let the viewBox crop the
 * shape square, which is why its corners were wrong.
 *
 * `fill` defaults to `currentColor` so callers can colour it from the outside.
 */
export function BotGlyph({
  size = 16,
  fill = "currentColor",
  opacity = 1,
}: {
  size?: number;
  fill?: string;
  opacity?: number;
}) {
  // useId can emit colons, which url(#…) will not resolve
  const maskId = `botglyph-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 254 191"
      fill="none"
      style={{ flex: "none", opacity }}
      aria-hidden
    >
      <mask
        id={maskId}
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="254"
        height="191"
      >
        <path
          d="M0 38.2C0 17.1027 22.7439 0 50.8 0H203.2C231.256 0 254 17.1027 254 38.2V152.8C254 173.897 231.256 191 203.2 191H50.8C22.7439 191 0 173.897 0 152.8V38.2Z"
          fill="black"
        />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path
          d="M127.977 0C173.999 7.24976e-05 214.973 22.9868 241.297 58.7518C260.404 84.7116 251.094 88.4727 256.004 123.636C256.004 208.094 207.405 305.848 127.977 305.848C48.5489 305.848 -1.71875 208.094 -1.71875 123.636C2.36488 91.8746 -4.45112 84.7116 14.6561 58.7518C40.9803 22.9867 81.9541 0 127.977 0ZM129.854 88.1594C126.809 72.5654 114.787 61.7905 103.001 64.0932C91.2161 66.3962 84.1306 80.9049 87.1759 96.499C90.2212 112.093 102.244 122.868 114.029 120.565C125.815 118.262 132.9 103.753 129.854 88.1594ZM195.985 73.5459C192.94 57.952 180.918 47.1775 169.132 49.4803C157.347 51.7833 150.262 66.2916 153.307 81.8856C156.352 97.4796 168.375 108.254 180.16 105.951C191.946 103.648 199.031 89.14 195.985 73.5459Z"
          fill={fill}
        />
      </g>
    </svg>
  );
}
