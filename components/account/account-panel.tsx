"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountPanelProps = {
  title?: string;
  titleId?: string;
  description?: string;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  hint?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
  children?: React.ReactNode;
};

export function AccountPanel({
  title,
  titleId,
  description,
  badge,
  footer,
  hint,
  variant = "default",
  loading = false,
  loadingLabel,
  className,
  children,
}: AccountPanelProps) {
  if (loading) {
    return (
      <section
        className={cn(
          "sk-profile-panel sk-account-panel",
          variant === "danger" && "sk-profile-panel--danger",
          className,
        )}
      >
        <div className="sk-account-sub__loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </div>
      </section>
    );
  }

  const hasHead = Boolean(title || badge);

  return (
    <section
      className={cn(
        "sk-profile-panel sk-account-panel",
        variant === "danger" && "sk-profile-panel--danger",
        className,
      )}
      aria-labelledby={title ? titleId : undefined}
    >
      {hasHead ? (
        <div className="sk-account-panel__head">
          {title ? (
            <h2 id={titleId} className="sk-profile-panel__title">
              {title}
            </h2>
          ) : (
            <span aria-hidden />
          )}
          {badge}
        </div>
      ) : null}

      {description ? <p className="sk-account-sub__lead">{description}</p> : null}

      {children ? <div className="sk-account-panel__content">{children}</div> : null}

      {hint ? (
        <p className="sk-profile-personal__hint sk-account-panel__hint">{hint}</p>
      ) : null}

      {footer ? <div className="sk-account-panel__footer">{footer}</div> : null}
    </section>
  );
}
