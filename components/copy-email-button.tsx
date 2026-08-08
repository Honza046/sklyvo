"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyEmailButtonProps = {
  email: string | null | undefined;
  className?: string;
  /** Menší ikona vedle textu e-mailu (tabulky). */
  size?: "sm" | "icon";
  /** ghost = jen obrys ikony hned u e-mailu (šetří místo). */
  variant?: "outline" | "ghost";
};

/**
 * Jedním klikem zkopíruje e-mail do schránky (Sniper/Autopilot tabulky, CRM).
 */
export function CopyEmailButton({
  email,
  className,
  size = "icon",
  variant = "outline",
}: CopyEmailButtonProps) {
  const trimmed = (email ?? "").trim();
  const [copied, setCopied] = useState(false);

  if (!trimmed) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      toast.success("E-mail zkopírován");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kopírování selhalo");
    }
  };

  const iconClass = size === "icon" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <Button
      type="button"
      variant={variant === "ghost" ? "ghost" : "outline"}
      size="sm"
      onClick={(e) => void handleCopy(e)}
      className={cn(
        "shrink-0 p-0 text-muted-foreground hover:text-foreground",
        variant === "ghost"
          ? "h-6 w-6 rounded-md border-0 bg-transparent shadow-none hover:bg-muted/60"
          : "border-border/60 bg-background shadow-sm hover:bg-muted",
        variant === "outline" && (size === "icon" ? "h-8 w-8 rounded-lg" : "h-7 w-7 rounded-md"),
        className,
      )}
      title={`Kopírovat ${trimmed}`}
      aria-label={`Kopírovat e-mail ${trimmed}`}
    >
      {copied ? (
        <Check className={cn(iconClass, "text-emerald-600")} />
      ) : (
        <Copy className={iconClass} />
      )}
    </Button>
  );
}
