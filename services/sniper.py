"""
SKLYVO Sniper — streamovaný endpoint pro generování e-mailu.

Na Vercelu je tento soubor dostupný jako POST /api/sniper (FastAPI aplikace v `app`).
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator, Iterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import iterate_in_threadpool

# --- Placeholders pro tvé know-how (doplň vlastní texty / logiku) -----------------

SKLYVO_KNOW_HOW = ""  # TODO: Zde vlož firemní DNA

# TODO: Zde případně upřesni model (např. gemini-3.5-flash, …)
GEMINI_MODEL_NAME = "gemini-3.5-flash"

# TODO: Zde vlož logiku pro scrapování webu (beautifulsoup4 / requests / …)
async def scrape_target_page(url: str) -> str:
    """
    Vrať surový nebo znormalizovaný text ze stránky pro další zpracování.
    """
    _ = url
    return ""


# TODO: Zde vlož finální prompt pro vygenerování emailu (slož z SKLYVO_KNOW_HOW,
#       scrapnutého textu, URL a e-mailu kontaktu). Dokud nevracíš smysluplný prompt,
#       Gemini větev se nespustí (kvůli prázdnému řetězci níže).
def build_email_generation_prompt(*, url: str, email: str, scraped_text: str) -> str:
    _ = (SKLYVO_KNOW_HOW, scraped_text, url, email)
    return ""


# ---------------------------------------------------------------------------------

app = FastAPI(title="SKLYVO Sniper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SniperRequest(BaseModel):
    url: str = Field(...)
    pitch_type: str | None = Field(...)
    email: str | None = None


def _gemini_text_chunks(prompt: str) -> Iterator[str]:
    """Synchronní stream tokenů z Gemini — běží ve worker vlákně přes Starlette."""
    import google.generativeai as genai

    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(GEMINI_MODEL_NAME)
    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        text = getattr(chunk, "text", None)
        if text:
            yield text


async def _stub_stream(message: str) -> AsyncIterator[bytes]:
    """Nechá vidět „živý“ výstup i bez LLM; šetří timeouts díky průběžnému flushi chunků."""
    chunk_size = 48
    for i in range(0, len(message), chunk_size):
        await asyncio.sleep(0.02)
        yield message[i : i + chunk_size].encode("utf-8")


@app.get("/")
async def health():
    """GET pro rychlou kontrolu, že je funkce nahoře."""
    return {"ok": True, "service": "sklyvo-sniper"}


@app.post("/api/sniper")
async def sniper_analyze(body: SniperRequest):
    scraped_text = await scrape_target_page(body.url)
    prompt = build_email_generation_prompt(
        url=body.url,
        email=body.email,
        scraped_text=scraped_text,
    )
    api_key = os.environ.get("GEMINI_API_KEY")

    if api_key and prompt.strip():
        return StreamingResponse(
            iterate_in_threadpool(_gemini_text_chunks(prompt)),
            media_type="text/plain; charset=utf-8",
        )

    stub = (
        "[SKLYVO · Sniper — placeholder stream]\n\n"
        "Tento výstup ukazuje, že Next.js frontend správně přijímá chunked stream.\n\n"
        f"URL: {body.url}\nE-mail: {body.email}\n\n"
        "Až doplníš `build_email_generation_prompt()` a `SKLYVO_KNOW_HOW`, "
        "nastav na Vercelu proměnnou GEMINI_API_KEY a endpoint začne volat Gemini.\n\n"
        f"Délka scrapu: {len(scraped_text)} znaků\n"
        "TODO: scrape v scrape_target_page(), prompt v build_email_generation_prompt().\n"
    )
    return StreamingResponse(_stub_stream(stub), media_type="text/plain; charset=utf-8")
