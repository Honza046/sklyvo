"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";

export function AdminSearchForm({
  placeholder,
  defaultValue,
}: {
  placeholder: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="sk-admin__search"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") ?? "").trim();
        const url = new URL(window.location.pathname, window.location.origin);
        if (q) url.searchParams.set("q", q);
        startTransition(() => {
          router.push(url.pathname + url.search);
        });
      }}
    >
      <Input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="sk-admin__search-input"
        disabled={pending}
      />
      <button type="submit" className="sk-btn sk-btn--primary sk-btn--md" disabled={pending}>
        Hledat
      </button>
    </form>
  );
}
