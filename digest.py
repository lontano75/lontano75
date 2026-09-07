#!/usr/bin/env python3
"""Daily news digest: RSS feeds (OPML) → Claude → Telegram"""

import os
import re
import xml.etree.ElementTree as ET
import feedparser
import requests
import anthropic
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed


TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

OPML_PATH = os.path.join(os.path.dirname(__file__), "feeds.opml")
HOURS_BACK = 5
MAX_FEEDS_WORKERS = 20
FEED_TIMEOUT = 15


def parse_opml(path):
    tree = ET.parse(path)
    root = tree.getroot()
    urls = []
    for outline in root.iter("outline"):
        url = outline.get("xmlUrl")
        if url:
            urls.append(url)
    return urls


def fetch_feed(url, cutoff_dt):
    articles = []
    try:
        feed = feedparser.parse(url, request_headers={"User-Agent": "Mozilla/5.0"})
        source = feed.feed.get("title", url)
        for entry in feed.entries:
            # Try to get publication time
            pub = None
            for attr in ("published_parsed", "updated_parsed"):
                val = getattr(entry, attr, None)
                if val:
                    try:
                        pub = datetime(*val[:6], tzinfo=timezone.utc)
                    except Exception:
                        pass
                    break

            if pub is not None and pub < cutoff_dt:
                continue

            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            if not title or not link:
                continue

            summary = ""
            for attr in ("summary", "description", "content"):
                raw = entry.get(attr, "")
                if isinstance(raw, list) and raw:
                    raw = raw[0].get("value", "")
                if raw:
                    clean = re.sub(r"<[^>]+>", " ", raw)
                    clean = re.sub(r"\s+", " ", clean).strip()
                    summary = clean[:300]
                    break

            articles.append({
                "title": title,
                "url": link,
                "summary": summary,
                "source": source,
            })
    except Exception:
        pass
    return articles


def fetch_all_articles(feed_urls, hours_back=HOURS_BACK):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    all_articles = []
    with ThreadPoolExecutor(max_workers=MAX_FEEDS_WORKERS) as executor:
        futures = {executor.submit(fetch_feed, url, cutoff): url for url in feed_urls}
        for future in as_completed(futures):
            all_articles.extend(future.result())
    return all_articles


def select_top_articles(articles):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    articles_text = ""
    for i, a in enumerate(articles, 1):
        articles_text += f"{i}. [{a['source']}] {a['title']}\n"
        articles_text += f"   URL: {a['url']}\n"
        if a["summary"]:
            articles_text += f"   {a['summary']}\n"
        articles_text += "\n"

    today = datetime.now().strftime("%d/%m/%Y")

    prompt = f"""Sei un curatore editoriale esperto con il taglio di futuroprossimo.it: una testata italiana orientata al futuro, che guarda all'innovazione con occhio critico e ottimista, accessibile ma colta.

Ecco gli articoli delle ultime {HOURS_BACK} ore ({today}) dai feed RSS dell'utente:

{articles_text}

Seleziona gli 8 articoli più interessanti seguendo queste REGOLE:

MACRO-AREE DA COPRIRE (in ordine di priorità):
A. Medicina e salute (ricerca, scoperte, longevità, neuroscienze, psicologia, farmaci)
B. Tecnologia e innovazione (biotech, robotica, quantistica, chip, spazio, energia, materiali)
C. Ambiente e sostenibilità (clima, biodiversità, rinnovabili, agricoltura, oceani)
D. Intelligenza artificiale (ma MAX 2 articoli su questo tema!)
E. Società e futuro (economia, lavoro, demografia, città, mobilità, educazione)
F. Scienza di base (fisica, astronomia, archeologia, matematica, paleontologia)
G. Geopolitica e cultura (letti in chiave prospettica)

VINCOLI OBBLIGATORI:
- Massimo 2 articoli su Intelligenza Artificiale / LLM / chatbot
- Massimo 2 articoli sulla stessa macro-area tematica
- Almeno 5 macro-aree diverse rappresentate negli 8 pezzi
- Preferisci scoperte, tendenze, analisi — NON annunci commerciali o cronaca politica
- Se un articolo sembra vecchio o poco rilevante, scartalo e sostituiscilo

Restituisci SOLO testo semplice (niente HTML), esattamente in questo formato:

🗞 Digest – {today}

1. TITOLO IN ITALIANO

Una sola frase in italiano che spiega perché è interessante.

URL_PER_ESTESO

2. TITOLO IN ITALIANO

Una sola frase in italiano.

URL_PER_ESTESO

[...fino a 8...]

Buona lettura! 📖

IMPORTANTE: traduci sempre il titolo in italiano, anche se l'articolo è in inglese."""

    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    digest_text = message.content[0].text

    # Match URLs in the digest back to original articles (preserving order)
    url_map = {a["url"]: a for a in articles if a.get("url")}
    seen: set = set()
    selected = []
    for url, article in sorted(
        url_map.items(), key=lambda kv: digest_text.find(kv[0]) if kv[0] in digest_text else 10**9
    ):
        if url in digest_text and url not in seen:
            seen.add(url)
            selected.append(article)

    return digest_text, selected[:8]


def send_telegram(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    chunks = [text[i: i + 4000] for i in range(0, len(text), 4000)]
    for chunk in chunks:
        response = requests.post(
            url,
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": chunk,
                "disable_web_page_preview": True,
            },
            timeout=30,
        )
        response.raise_for_status()


def main():
    print("Caricamento feed da OPML...")
    feed_urls = parse_opml(OPML_PATH)
    print(f"Feed trovati: {len(feed_urls)}")

    print(f"Recupero articoli delle ultime {HOURS_BACK} ore...")
    articles = fetch_all_articles(feed_urls)
    print(f"Articoli trovati: {len(articles)}")

    if not articles:
        send_telegram(f"🗞 Digest\n\nNessun articolo trovato nelle ultime {HOURS_BACK} ore.")
        return

    print("Selezione top 8 con Claude...")
    digest, _ = select_top_articles(articles)

    print("Invio su Telegram...")
    send_telegram(digest)
    print("Fatto!")


if __name__ == "__main__":
    main()
