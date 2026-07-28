"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import { VenegardWordmark } from "@/components/brand-marks";

export default function RecoveryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const emailRaw = formData.get("email");
    const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
    if (!email) {
      setIsLoading(false);
      setError("Vyplňte e-mailovou adresu.");
      return;
    }

    try {
      const result = await requestPasswordReset(email, window.location.origin);
      if ("error" in result) {
        setError(result.error);
      } else {
        setMessage("Odkaz pro obnovu hesla byl odeslán na váš e-mail. Zkontrolujte schránku (i spam).");
      }
    } catch (err) {
      console.error(err);
      setError("Při odesílání e-mailu nastala chyba. Zkuste to později.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-muted/20 p-4 dark:bg-background">
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px] dark:bg-blue-600/20" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[30%] w-[30%] rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="relative z-10 flex w-full max-w-[400px] flex-col gap-8">
        <div className="flex justify-center">
          <VenegardWordmark markSize={36} textClassName="text-xl tracking-[0.2em]" />
        </div>

        <div className="flex flex-col gap-8 rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Obnova hesla
            </h1>
            <p className="text-sm text-muted-foreground">
              Zadejte e-mail svého účtu a pošleme vám odkaz pro nové heslo.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="jan@firma.cz"
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
              {isLoading ? "Odesílám…" : "Odeslat odkaz"}
              {!isLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Vzpomněli jste si?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Přihlásit se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
