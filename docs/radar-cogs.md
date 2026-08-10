# Radar multi-source — env & COGS

## Required / optional API keys

```bash
# Maps (Google Places) — stávající
GOOGLE_PLACES_API_KEY=

# Web + LinkedIn organic hits (Serper)
SERPER_API_KEY=

# E-mail enrichment když scrape nic nenašel (Hunter Domain Search)
HUNTER_API_KEY=

# LinkedIn company enrich z URL (Proxycurl) — jen když chybí web/jméno
PROXYCURL_API_KEY=

# Soft caps per search (COGS)
RADAR_SERPER_MAX=10
RADAR_HUNTER_MAX=20
RADAR_PROXYCURL_MAX=10

# Gemini — Sniper UI vs Autopilot
GOOGLE_API_KEY=
SNIPER_GEMINI_MODEL=gemini-3.5-flash
# Autopilot / Full Auto fronta: prefer Flash-Lite (~nižší Kč/email)
AUTOPILOT_GEMINI_MODEL=gemini-2.0-flash-lite
```

Bez `SERPER` / `HUNTER` / `PROXYCURL` klíčů daný provider soft-failne; Places dál běží, pokud je `GOOGLE_PLACES_API_KEY`.

## Kredity (produkt)

- Manuální Radar search = **1 kredit** (nezávisle na počtu zdrojů)
- Autopilot / cron = **1 kredit / nový lead**
- Provider usage se loguje do konzole (`[radar] provider usage`) pro pozdější unit cost

## Cíl COGS ~500–700 Kč/user/měsíc

| Položka | Poznámka |
|--------|----------|
| Places | Často free threshold |
| Serper | Desítky searchů ≈ řád Kč |
| Hunter / Proxycurl | Jen enrichment chybějících polí (gated caps) |
| Gemini Autopilot | `AUTOPILOT_GEMINI_MODEL` Flash-Lite |
| Gemini Sniper (ruční) | `SNIPER_GEMINI_MODEL` 3.5 Flash (~0,9 Kč/generate) |

Po nasazení: z dashboardů Serper / Hunter / Proxycurl / Google AI zapiš reálné Kč a případně sniž `RADAR_*_MAX`.
