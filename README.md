# Sklyvo — produkční aplikace

Toto je **jediná funkční aplikace** (auth, CRM, Sniper, Radar, billing, e-mail).

Matejův vizuální prototyp 2.0 je v kořenovém repozitáři (`../`) na portu **3001**.  
Produkční build běží zde na portu **3000**.

## Vývoj

```bash
npm install
npm run dev
```

Otevřete [http://localhost:3000](http://localhost:3000).

## Design vs. logika

| Vrstva | Kde | Poznámka |
|--------|-----|----------|
| Vizuální reference (Matej 2.0) | `../app/login`, `../app/workspace`, `../app/design` | Bez DB, bez auth — jen UI |
| Produkční UI | `components/sklyvo/app-ui.css`, `components/sklyvo/auth.css` | Tokeny a komponenty z 2.0 |
| Auth obrazovky | `components/sklyvo/login-screen.tsx`, `auth-shell.tsx` | Zachována 2FA, OAuth, session |
| Workspace shell | `components/dashboard-shell.tsx` | Reálná navigace + data |

**Pravidlo:** nové funkce a opravy logiky vždy sem do `Backend/`.  
Z rootu přebírejte jen vizuál (barvy, spacing, ikony), ne kopírujte soubory s routami.

## Git

`Backend/` je samostatný git repozitář (submodule v matejmix/sklyvo).  
Remote produktu: `sklyvo` → `github.com/Honza046/sklyvo.git`.
