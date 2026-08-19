/**
 * Sidebar nav icon set — exact SVG path data copied from the Sklyvo 2.0
 * workspace mockup (components/workspace-v2.tsx, the `D` dictionary) so the
 * real app's sidebar matches the mockup pixel-for-pixel.
 */

type IconProps = { className?: string; "aria-hidden"?: boolean };

const NAV_ICON_PATHS = {
  grid: "M3 3h7v7H3z|M14 3h7v7h-7z|M3 14h7v7H3z|M14 14h7v7h-7z",
  rocket:
    "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0z|m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z|M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0|M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  sniper:
    "M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18Z|M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z|M12 1v4|M12 19v4|M1 12h4|M19 12h4",
  radar:
    "M12 14a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z|M7.8 7.8a6 6 0 0 0 0 8.4|M16.2 16.2a6 6 0 0 0 0-8.4|M4.9 4.9a10 10 0 0 0 0 14.2|M19.1 19.1a10 10 0 0 0 0-14.2",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z|M22 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75",
  folder:
    "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z",
  plane: "M14.5 20.5 21 3 3.5 9.5l6.2 2.4z|M9.7 11.9 14.5 20.5|M9.7 11.9 21 3",
  bolt: "M13 2 3 14h9l-1 8 10-12h-9l1-8Z",
  lock: "M4 11h16v10H4z|M8 11V7a4 4 0 0 1 8 0v4",
  spark:
    "M11 3.5 12.7 8l4.5 1.7-4.5 1.7L11 15.9 9.3 11.4 4.8 9.7l4.5-1.7L11 3.5Z|M18 14.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3Z",
  chevron: "M9 6l6 6-6 6",
  arrowOut: "M7 17 17 7|M9 7h8v8",
} as const;

const BOT_GLYPH_PATH =
  "M127.977 4C173.999 4.00007 214.973 26.9868 241.297 62.7518C260.404 88.7116 251.094 92.4727 256.004 127.636C256.004 212.094 207.405 309.848 127.977 309.848C48.5489 309.848 -1.71875 212.094 -1.71875 127.636C2.36488 95.8746 -4.45112 88.7116 14.6561 62.7518C40.9803 26.9867 81.9541 4 127.977 4ZM129.854 92.1594C126.809 76.5654 114.787 65.7905 103.001 68.0932C91.2161 70.3962 84.1306 84.9049 87.1759 100.499C90.2212 116.093 102.244 126.868 114.029 124.565C125.815 122.262 132.9 107.753 129.854 92.1594ZM195.985 77.5459C192.94 61.952 180.918 51.1775 169.132 53.4803C157.347 55.7833 150.262 70.2916 153.307 85.8856C156.352 101.48 168.375 112.254 180.16 109.951C191.946 107.648 199.031 93.14 195.985 77.5459Z";

function strokeIconMarkup(
  d: string,
  size = 22,
): string {
  const paths = d
    .split("|")
    .map((path) => `<path d="${path}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function botGlyphMarkup(size = 22): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 254 195" fill="currentColor" aria-hidden="true"><path d="${BOT_GLYPH_PATH}"/></svg>`;
}

/** Same icons as sidebar — order matches onboarding tour steps. */
export const TOUR_STEP_ICON_SVGS = [
  strokeIconMarkup(NAV_ICON_PATHS.grid),
  strokeIconMarkup(NAV_ICON_PATHS.sniper),
  strokeIconMarkup(NAV_ICON_PATHS.radar),
  strokeIconMarkup(NAV_ICON_PATHS.rocket),
  strokeIconMarkup(NAV_ICON_PATHS.people),
  strokeIconMarkup(NAV_ICON_PATHS.plane),
  botGlyphMarkup(),
] as const;

function StrokeIcon({
  d,
  className,
}: IconProps & { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {d.split("|").map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.grid} />;
}

export function RocketIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.rocket} />;
}

export function SniperIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.sniper} />;
}

export function RadarIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.radar} />;
}

export function PeopleIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.people} />;
}

export function FolderIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.folder} />;
}

export function PlaneIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.plane} />;
}

export function BoltIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.bolt} />;
}

export function LockIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.lock} />;
}

export function SparkIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.spark} />;
}

export function ChevronIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.chevron} />;
}

export function ArrowOutIcon(props: IconProps) {
  return <StrokeIcon {...props} d={NAV_ICON_PATHS.arrowOut} />;
}

/** the Skly Bot glyph, a masked wordless logo — used for the "Podpora" nav item */
export function BotGlyphIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 254 195"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d={BOT_GLYPH_PATH} />
    </svg>
  );
}
