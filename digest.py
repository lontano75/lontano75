#!/usr/bin/env python3
"""Daily news digest: InoReader → Claude → Telegram"""

import os
import re
import html as html_module
import requests
import anthropic
from datetime import datetime, timedelta
from html.parser import HTMLParser


class _TelegramSanitizer(HTMLParser):
    """Strips unsupported HTML tags while keeping <b>, <i>, <a>, <code>."""
    ALLOWED = {"b", "strong", "i", "em", "u", "s", "a", "code", "pre"}

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag in self.ALLOWED:
            if tag == "a":
                href = dict(attrs).get("href", "")
                # escape & inside href
                href = href.replace("&amp;", "&").replace("&", "&amp;")
                self.out.append(f'<a href="{href}">')
            else:
                self.out.append(f"<{tag}>")

    def handle_endtag(self, tag):
        if tag in self.ALLOWED:
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        self.out.append(html_module.escape(data, quote=False))

    def handle_entityref(self, name):
        self.out.append(f"&{name};")

    def handle_charref(self, name):
        self.out.append(f"&#{name};")


def sanitize_telegram_html(text):
    """Return text with only Telegram-supported HTML tags."""
    parser = _TelegramSanitizer()
    parser.feed(text)
    return "".join(parser.out)


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


def fetch_articles(access_token, count=150, hours_back=24):
    """Fetch unread articles published in the last N hours from InoReader."""
    oldest_ts = int((datetime.now() - timedelta(hours=hours_back)).timestamp())

    headers = {
        "Authorization": f"Bearer {access_token}",
        "AppId": INOREADER_APP_ID,
        "AppKey": INOREADER_APP_KEY,
    }
    params = {
        "n": count,
        "output": "json",
        "xt": "user/-/state/com.google/read",
        "ot": oldest_ts,  # only items published after this Unix timestamp
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
        # belt-and-suspenders: also filter client-side on the publication timestamp
        published = item.get("published", 0)
        if published and published < oldest_ts:
            continue

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

Ecco gli articoli delle ultime 24 ore ({today}) dal feed reader dell'utente:

{articles_text}

Seleziona i 10 articoli più interessanti seguendo queste REGOLE:

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
- Almeno 6 macro-aree diverse rappresentate nei 10 pezzi
- Preferisci scoperte, tendenze, analisi — NON annunci commerciali o cronaca politica
- Se un articolo sembra vecchio o poco rilevante, scartalo e sostituiscilo

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
    """Send a message via Telegram with sanitized HTML."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    clean = sanitize_telegram_html(text)
    chunks = [clean[i : i + 4000] for i in range(0, len(clean), 4000)]
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

    print("Recupero articoli (ultime 24h)...")
    articles = fetch_articles(access_token, hours_back=24)
    print(f"Trovati {len(articles)} articoli non letti nelle ultime 24h")

    if not articles:
        send_telegram("🗞 <b>Morning Digest</b>\n\nNessun articolo non letto nelle ultime 24 ore.")
        return

    print("Selezione top 10 con Claude...")
    digest = select_top_articles(articles)

    print("Invio su Telegram...")
    send_telegram(digest)
    print("Fatto!")


if __name__ == "__main__":
    main()
