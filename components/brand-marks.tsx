import { cn } from "@/lib/utils";

const MARK_MASK_SRC = "/brand/sklyvo-mark-mask.png";
const AI_MASK_SRC = "/brand/ai-mask.png";

/** Logo značka — jen geometrie, barva přes `text-*` / currentColor. */
export function SklyvoBrandMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
  /** @deprecated priority is unused for CSS-mask marks */
  priority?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${MARK_MASK_SRC})`,
        maskImage: `url(${MARK_MASK_SRC})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

export function SklyvoWordmark({
  className,
  markSize = 28,
  showText = true,
  textClassName,
  markClassName,
}: {
  className?: string;
  markSize?: number;
  showText?: boolean;
  textClassName?: string;
  markClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <SklyvoBrandMark
        size={markSize}
        className={cn("text-blue-600", markClassName)}
      />
      {showText ? (
        <span
          className={cn(
            "truncate text-sm font-bold tracking-[0.2em] text-foreground",
            textClassName,
          )}
        >
          SKLYVO
        </span>
      ) : null}
    </div>
  );
}

/** Mask cover ikona AI asistenta — geometrie přes CSS mask. */
export function AiMaskIcon({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-current",
        className,
      )}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${AI_MASK_SRC})`,
        maskImage: `url(${AI_MASK_SRC})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
