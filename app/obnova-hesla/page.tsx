"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SklyvoWordmark } from "@/components/brand-marks";

function ObnovaHeslaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Chybí ověřovací token. Vyžádejte si nový odkaz.");
      return;
    }
    if (password.length < 8) {
      setError("Nové heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hesla se neshodují.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(token, password);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      setMessage("Heslo bylo změněno. Přesměrováváme na přihlášení…");
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      console.error(err);
      setError("Nepodařilo se změnit heslo. Zkuste to znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nové heslo</h1>
        <p className="text-sm text-muted-foreground">
          Zadejte nové heslo pro svůj Sklyvo účet.
        </p>
      </div>

      {!token ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          Odkaz je neplatný.{" "}
          <Link href="/recovery" className="font-semibold underline">
            Požádat o nový
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Nové heslo
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-background pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Potvrzení hesla
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-background pl-10"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              {message}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            {isLoading ? "Ukládám…" : "Uložit heslo"}
            {!isLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ObnovaHeslaPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-muted/20 p-4 dark:bg-background">
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px] dark:bg-blue-600/20" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[30%] w-[30%] rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="relative z-10 flex w-full max-w-[400px] flex-col gap-8">
        <div className="flex justify-center">
          <SklyvoWordmark markSize={36} textClassName="text-xl tracking-[0.2em]" />
        </div>
        <Suspense
          fallback={
            <div className="rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground shadow-xl">
              Načítám…
            </div>
          }
        >
          <ObnovaHeslaForm />
        </Suspense>
      </div>
    </div>
  );
}
