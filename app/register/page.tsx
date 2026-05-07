"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import { registerUser } from "@/app/actions/auth"; // Importujeme naši novou serverovou funkci

export default function RegisterPage() {
  
  // Funkce pro klasickou registraci přes e-mail
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Získáme data z formuláře
    const formData = new FormData(e.currentTarget);
    
    // Pošleme data do databáze
    const result = await registerUser(formData);

    if ("error" in result && result.error) {
      alert(result.error); // Pokud e-mail už existuje, vyhodí chybu
      return;
    }

    // Úspěch! Session cookie je nastavena v server action a jdeme na onboarding
    window.location.href = "/onboarding"; // <-- ZMĚNĚNO: Teď to pošle nového uživatele rovnou vyplnit dotazník
  };

  // Dočasná funkce pro Google (dokud nemáme napojený Google OAuth)
  const handleGoogle = () => {
    alert("Google přihlášení zapojíme později, zatím prosím použijte registraci e-mailem.");
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-muted/20 dark:bg-background p-4 relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-[400px] flex flex-col gap-8 relative z-10">
        
        <div className="flex justify-center items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
          <span className="text-xl font-bold tracking-[0.2em] text-foreground">
            VENEGARD
          </span>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-xl flex flex-col gap-8">
          
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Vytvořit účet
            </h1>
            <p className="text-sm text-muted-foreground">
              Začněte budovat svou pipeline ještě dnes.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Celé jméno
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  type="text"
                  name="name" // PŘIDÁNO
                  placeholder="Jméno Příjmení"
                  className="pl-10 h-12 rounded-xl bg-background border-border/50 text-base focus-visible:ring-blue-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Pracovní email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  type="email"
                  name="email" // PŘIDÁNO
                  placeholder="name@company.com"
                  className="pl-10 h-12 rounded-xl bg-background border-border/50 text-base focus-visible:ring-blue-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Heslo
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  type="password"
                  name="password" // PŘIDÁNO
                  placeholder="••••••••"
                  className="pl-10 h-12 rounded-xl bg-background border-border/50 text-base focus-visible:ring-blue-600"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md mt-2 group">
              Zaregistrovat se
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-card px-4 text-muted-foreground font-bold">Nebo</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            type="button" 
            onClick={handleGoogle} // ZMĚNĚNO NA handleGoogle
            className="w-full h-12 rounded-xl border-border/60 bg-background hover:bg-muted font-semibold"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Registrace přes Google
          </Button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-xs text-muted-foreground font-medium">
            Už máte účet?{" "}
            <Link href="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Přihlaste se
            </Link>
          </p>
          <Link href="/login" className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors">
            <ArrowLeft className="mr-2 h-3 w-3" />
            Zpět na login
          </Link>
        </div>

      </div>
    </div>
  );
}