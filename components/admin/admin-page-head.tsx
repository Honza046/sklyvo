import Link from "next/link";
import { cn } from "@/lib/utils";

type AdminPageHeadProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function AdminPageHead({
  title,
  backHref,
  backLabel,
  meta,
  actions,
  className,
}: AdminPageHeadProps) {
  return (
    <header className={cn("sk-admin__page-head sk-admin__page-head--row", className)}>
      <div className="min-w-0">
        {backHref ? (
          <Link href={backHref} className="sk-admin__back">
            ← {backLabel}
          </Link>
        ) : null}
        <h1 className="sk-admin__h1">{title}</h1>
        {meta ? <p className="sk-admin__meta">{meta}</p> : null}
      </div>
      {actions ? <div className="sk-admin__page-actions">{actions}</div> : null}
    </header>
  );
}
