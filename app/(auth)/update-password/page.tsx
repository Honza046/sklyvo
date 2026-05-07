"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    const allow = () => {
      if (!cancelled) setSessionOk(true);
    };
    const deny = () => {
      if (!cancelled) router.replace("/login");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) allow();
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) allow();
    });

    const t = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session) allow();
        else deny();
      });
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      subscription.unsubscribe();
    };
  }, [router]);

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        alert("Chyba při aktualizaci hesla: " + error.message);
      } else {
        alert("Heslo bylo úspěšně změněno! Nyní se můžete přihlásit.");
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionOk === null) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-muted/20 p-4 dark:bg-background">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px] dark:bg-blue-600/20" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[30%] w-[30%] rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="relative z-10 w-full max-w-[400px] rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
          <Skeleton className="mx-auto mb-4 h-8 w-48" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-muted/20 p-4 dark:bg-background">
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px] dark:bg-blue-600/20" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[30%] w-[30%] rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="relative z-10 flex w-full max-w-[400px] flex-col gap-8">
        <div className="flex items-center justify-center gap-3">
          <div className="h-4 w-4 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
          <span className="text-xl font-bold tracking-[0.2em] text-foreground">
            VENEGARD
          </span>
        </div>

        <div className="flex flex-col gap-8 rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nové heslo
            </h1>
            <p className="text-sm text-muted-foreground">
              Zadejte nové heslo pro svůj účet.
            </p>
          </div>

          <form onSubmit={(ev) => void handleUpdatePassword(ev)} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Nové heslo
              </Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="h-12 rounded-xl border-border/50 bg-background pl-10 text-base focus-visible:ring-blue-600"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-12 w-full rounded-xl bg-blue-600 font-bold text-white shadow-md hover:bg-blue-700"
            >
              {isLoading ? "Ukládám…" : "Uložit nové heslo"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
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
