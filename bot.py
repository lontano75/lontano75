#!/usr/bin/env python3
"""FP 2026 Telegram bot: RSS digest with inline buttons to copy prompts for Claude."""

import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CallbackQueryHandler, ContextTypes

from digest import HOURS_BACK, fetch_all_articles, parse_opml, select_top_articles

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

OPML_PATH = os.path.join(os.path.dirname(__file__), "feeds.opml")

logging.basicConfig(
    format="%(asctime)s — %(levelname)s — %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# In-memory session store: {session_id: [articles]}
_store: dict[str, list] = {}
MAX_SESSIONS = 5


def _save_session(session_id: str, articles: list) -> None:
    _store[session_id] = articles
    if len(_store) > MAX_SESSIONS:
        del _store[sorted(_store)[0]]


def _keyboard(n: int, session_id: str) -> InlineKeyboardMarkup:
    buttons = [
        InlineKeyboardButton(f"📋 {i + 1}", callback_data=f"{session_id}:{i}")
        for i in range(n)
    ]
    rows = [buttons[i : i + 4] for i in range(0, len(buttons), 4)]
    return InlineKeyboardMarkup(rows)


def _format_prompt(article: dict, num: int) -> str:
    lines = [
        f"📋 Notizia {num} — incolla in Claude (progetto FP 2026)",
        "─" * 40,
        "",
        "Usa il workflow FP 2026 — modalità FAST.",
        "",
        f"Fonte: {article['source']}",
        f"Titolo originale: {article['title']}",
        f"URL: {article['url']}",
    ]
    if article.get("summary"):
        lines += ["", f"Sommario: {article['summary']}"]
    lines += [
        "",
        "Recupera il testo completo dall'URL e produci l'articolo.",
    ]
    return "\n".join(lines)


async def send_digest(app: Application) -> None:
    from datetime import datetime
    session_id = datetime.now().strftime("%Y%m%d%H%M")
    logger.info("Digest start — session %s", session_id)

    feed_urls = parse_opml(OPML_PATH)
    articles = fetch_all_articles(feed_urls, hours_back=HOURS_BACK)
    logger.info("Fetched %d articles", len(articles))

    if not articles:
        await app.bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text=f"🗞 Digest\n\nNessun articolo nelle ultime {HOURS_BACK} ore.",
        )
        return

    digest_text, selected = select_top_articles(articles)
    _save_session(session_id, selected)

    await app.bot.send_message(
        chat_id=TELEGRAM_CHAT_ID,
        text=digest_text,
        reply_markup=_keyboard(len(selected), session_id),
        disable_web_page_preview=True,
    )
    logger.info("Digest sent — %d articles", len(selected))


async def on_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    try:
        session_id, raw_idx = query.data.rsplit(":", 1)
        idx = int(raw_idx)
        articles = _store.get(session_id)
        if not articles or idx >= len(articles):
            await query.message.reply_text(
                "⚠️ Sessione scaduta. Aspetta il prossimo digest."
            )
            return
        await query.message.reply_text(_format_prompt(articles[idx], idx + 1))
    except Exception:
        logger.exception("Button handler error")
        await query.message.reply_text("⚠️ Errore interno. Riprova.")


async def _post_init(app: Application) -> None:
    scheduler = AsyncIOScheduler(timezone="Europe/Rome")
    for hour in (6, 10, 14, 18, 22):
        scheduler.add_job(send_digest, "cron", hour=hour, minute=10, args=[app])
    scheduler.start()
    app.bot_data["scheduler"] = scheduler
    logger.info("Scheduler started (06:10 / 10:10 / 14:10 / 18:10 / 22:10 Rome)")


async def _post_shutdown(app: Application) -> None:
    sched = app.bot_data.get("scheduler")
    if sched:
        sched.shutdown(wait=False)


def main() -> None:
    app = (
        Application.builder()
        .token(TELEGRAM_BOT_TOKEN)
        .post_init(_post_init)
        .post_shutdown(_post_shutdown)
        .build()
    )
    app.add_handler(CallbackQueryHandler(on_button))
    logger.info("Bot polling started")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
