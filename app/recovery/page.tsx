"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { checkIfUserExists } from "@/app/actions/auth";

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

    const userCheck = await checkIfUserExists(email);
    if (!userCheck.exists) {
      setError("Tento e-mail u nás není registrován.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (supabaseError) {
        console.error("resetPasswordForEmail:", supabaseError);
        setError("Při odesílání e-mailu nastala chyba. Zkuste to prosím znovu.");
      } else {
        setMessage("Odkaz pro obnovu hesla byl úspěšně odeslán na váš e-mail.");
      }
    } catch (err) {
      console.error(err);
      setError(
        "Konfigurace Supabase není k dispozici nebo došlo k chybě. Zkuste to později.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-muted/20 p-4 dark:bg-background">
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px] dark:bg-blue-600/20" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[30%] w-[30%] rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="relative z-10 flex w-full max-w-[400px] flex-col gap-8">
        <div className="flex justify-center items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
          <span className="text-xl font-bold tracking-[0.2em] text-foreground">
            VENEGARD
          </span>
        </div>

        <div className="flex flex-col gap-8 rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Obnova hesla
            </h1>
            <p className="text-sm text-muted-foreground">
              Zadejte svůj e-mail a pošleme vám odkaz pro vytvoření nového hesla.
            </p>
          </div>

          <form onSubmit={(ev) => void handleResetPassword(ev)} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Pracovní email
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  className="h-12 rounded-xl border-border/50 bg-background pl-10 text-base focus-visible:ring-blue-600"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center text-sm text-red-500">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm text-green-600 dark:bg-green-950/30 dark:text-green-400">
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="group mt-2 h-12 w-full rounded-xl bg-blue-600 font-bold text-white shadow-md hover:bg-blue-700"
            >
              {isLoading ? "Odesílám…" : "Odeslat odkaz"}
              {!isLoading && (
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Vzpomněli jste si na heslo?{" "}
          <Link
            href="/login"
            className="font-bold text-blue-600 hover:underline dark:text-blue-400"
          >
            Zpět na přihlášení
          </Link>
        </p>
      </div>
    </div>
  );
}
