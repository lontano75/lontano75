#!/usr/bin/env python3
"""Daily news digest: InoReader → Claude → Telegram"""

import os
import re
import requests
import anthropic
from datetime import datetime


INOREADER_APP_ID = os.environ["INOREADER_APP_ID"]
INOREADER_APP_KEY = os.environ["INOREADER_APP_KEY"]
INOREADER_REFRESH_TOKEN = os.environ["INOREADER_REFRESH_TOKEN"]
TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]


def get_inoreader_token():
    """Get a fresh access token using the stored refresh token."""
    response = requests.post(
        "https://www.inoreader.com/oauth2/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": INOREADER_REFRESH_TOKEN,
            "client_id": INOREADER_APP_ID,
            "client_secret": INOREADER_APP_KEY,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def fetch_articles(access_token, count=80):
    """Fetch recent unread articles from InoReader."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "AppId": INOREADER_APP_ID,
        "AppKey": INOREADER_APP_KEY,
    }
    params = {
        "n": count,
        "output": "json",
        "xt": "user/-/state/com.google/read",
    }
    response = requests.get(
        "https://www.inoreader.com/reader/api/0/stream/contents/user/-/state/com.google/reading-list",
        headers=headers,
        params=params,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    articles = []
    for item in data.get("items", []):
        title = item.get("title", "").strip()
        url = ""
        if item.get("alternate"):
            url = item["alternate"][0].get("href", "")
        summary = ""
        if item.get("summary"):
            raw = item["summary"].get("content", "")
            summary = re.sub(r"<[^>]+>", " ", raw).strip()
            summary = re.sub(r"\s+", " ", summary)[:300]
        source = item.get("origin", {}).get("title", "")
        if title:
            articles.append({"title": title, "url": url, "summary": summary, "source": source})

    return articles


def select_top_articles(articles):
    """Use Claude to pick the 10 most interesting articles and write the digest."""
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

Ecco gli articoli non letti di oggi ({today}) dal feed reader dell'utente:

{articles_text}

Seleziona i 10 articoli più interessanti seguendo queste priorità:
1. PRIORITÀ ALTA: medicina e salute (ricerca, scoperte, longevità, neuroscienze)
2. PRIORITÀ ALTA: tecnologia e innovazione (AI, robotica, biotech, spazio, energia)
3. PRIORITÀ ALTA: ambiente e sostenibilità (clima, biodiversità, energie rinnovabili)
4. PRIORITÀ NORMALE: economia, lavoro, società, geopolitica letti attraverso la lente del futuro
5. Preferisci articoli che parlano di tendenze emergenti, scoperte, cambiamenti significativi — non semplici cronache
6. Varia gli argomenti: evita di mettere 3 articoli sullo stesso tema

Restituisci SOLO il testo del digest, già formattato per Telegram in HTML, esattamente così:

<b>🗞 Morning Digest – {today}</b>

<b>1. Titolo articolo</b>
<a href="URL">Leggi →</a>
Breve descrizione in italiano (2-3 righe) di cosa tratta e perché è interessante.

<b>2. Titolo articolo</b>
<a href="URL">Leggi →</a>
Breve descrizione in italiano.

[...fino a 10...]

<i>Buona lettura! 📖</i>"""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def send_telegram(text):
    """Send a message via Telegram, splitting if over 4096 chars."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    chunks = [text[i : i + 4000] for i in range(0, len(text), 4000)]
    for chunk in chunks:
        response = requests.post(
            url,
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": chunk,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=30,
        )
        response.raise_for_status()


def main():
    print("Autenticazione InoReader...")
    access_token = get_inoreader_token()

    print("Recupero articoli...")
    articles = fetch_articles(access_token)
    print(f"Trovati {len(articles)} articoli non letti")

    if not articles:
        send_telegram("🗞 <b>Morning Digest</b>\n\nNessun articolo non letto trovato oggi.")
        return

    print("Selezione top 10 con Claude...")
    digest = select_top_articles(articles)

    print("Invio su Telegram...")
    send_telegram(digest)
    print("Fatto!")


if __name__ == "__main__":
    main()
