# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online ordering system for "Пушки и Кофе" (airsoft + coffee cafe). Demo v1.0 — customers order via website or Telegram Mini App; owner receives Telegram notifications and orders appear in Google Sheets.

**Architecture:** Vanilla HTML frontend → FastAPI backend → PostgreSQL (orders) + Google Sheets (menu source + order log) + Telegram Bot (owner notifications)

## Development Commands

```bash
# Start everything (FastAPI + PostgreSQL)
docker-compose up --build

# Rebuild without cache
docker-compose up --build --force-recreate

# View logs
docker-compose logs -f fastapi

# Stop
docker-compose down
```

API available at `http://localhost:8000`, Swagger docs at `http://localhost:8000/docs`.

No test suite exists yet. Manual testing via Swagger UI or curl.

## Project Status

| Stage | Status |
|-------|--------|
| Backend (FastAPI + DB + Integrations) | Done |
| Frontend (single-page HTML/JS) | In progress |
| Telegram Mini App | Not started |

## Backend Architecture

**Entry point:** `backend/app/main.py` — FastAPI app with async lifespan (calls `init_db` on startup), wildcard CORS (demo only), two routers.

**Database:** SQLAlchemy async engine (`asyncpg` driver). Single model: `Order` (id, datetime, customer_name, items: JSON dict, total: int, comment, status). Sessions via `async_sessionmaker`.

**Routers:**
- `GET /menu/` — reads "Меню" sheet from Google Sheets, cached 5 min in-memory
- `POST /orders/` — saves to DB, then attempts Sheets write + Telegram notify (failures don't block response)
- `GET /orders/` — Bearer token auth (`API_SECRET_TOKEN`), returns all orders newest-first
- `GET /` — health check

**External integrations:**
- `sheets.py`: Google Sheets API via service account credentials (stored as base64-encoded JSON in `GOOGLE_CREDENTIALS_JSON` env var). Sheet names: "Меню" (menu source), "Заказы" (order log).
- `notifier.py`: Telegram Bot API via `httpx.AsyncClient` — sends new order summary to owner.

**All DB and external calls are async/await throughout.**

## Environment Variables

Copy `.env` and fill in real values:

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/pushki_kofe
TELEGRAM_BOT_TOKEN=...
OWNER_CHAT_ID=...
GOOGLE_SHEETS_ID=...
GOOGLE_CREDENTIALS_JSON=...   # base64-encoded service account JSON
API_SECRET_TOKEN=...
```

`GOOGLE_CREDENTIALS_JSON` must be the entire service account JSON encoded as base64 (single-line string). The `sheets.py` module decodes it at runtime.

## Frontend

Three files, no build step, no framework:
- `frontend/index.html` — HTML разметка
- `frontend/style.css` — все стили (~43 KB)
- `frontend/app.js` — вся логика (корзина, модалка, order submit)

**Design system:** dark military-coffee aesthetic. CSS custom properties: `--bg`, `--bg2`, `--card`, `--brown`, `--amber`, `--cream`, `--red`, `--border`. Fonts: Bebas Neue (headings), Rajdhani (body), Share Tech Mono (mono). Clipped-corner buttons via `clip-path: polygon(...)`.

**Required functionality (Этап 2):**
- Menu cards populated from `GET /menu/`
- Cart (JS, no page reload)
- Order form (name + comment) → `POST /orders/`
- Confirmation screen
- Mobile-responsive

## Google Sheets Structure

**"Меню" sheet columns:** `id | name | description | price | category | available`

**"Заказы" sheet columns:** `id | datetime | customer_name | items | total | comment | status`

## Key Architecture Decisions

- `asyncpg` (not psycopg2) — required for async SQLAlchemy; don't switch drivers
- `items` field is `Dict[str, int]` (name → quantity) — matches Sheets output format
- Menu cache TTL is 5 min — Google Sheets API is slow, intentional trade-off
- `GET /orders/` uses simple Bearer token, not OAuth2 — MVP simplification
- Frontend is vanilla JS (no framework) — faster MVP delivery

Full decision log: [memory/decisions.md](memory/decisions.md) — don't re-litigate decisions already recorded there.

## Agent Behavior Rules

**Response format:** ГОТОВО / ЧАСТИЧНО / ЗАБЛОКИРОВАНО + причина. Без предисловий — сразу к делу.

**Читать файлы только по необходимости — не сканировать весь проект.**

**Одна задача за раз. Если задача непонятна — уточнить до выполнения.**

**Читать всегда в начале сессии:** `memory/handoff.md`, `memory/index.md`

**Читать по необходимости:** `memory/decisions.md`, `memory/bugs.md`, `README.md`

**Ignore:** `/node_modules`, `/dist`, `__pycache__`, `*.pyc`, `.env` (не читать, не выводить секреты)

### После каждой выполненной задачи

1. **memory/decisions.md** — если принято архитектурное решение:
   ```
   ## YYYY-MM-DD: [тема]
   Chosen: [что выбрали]
   Reason: [почему]
   Do NOT: [что не делать в будущих сессиях]
   ```
2. **memory/bugs.md** — если найден баг или применён workaround.
3. **memory/handoff.md** — обновить DONE / NEXT / FILES_CHANGED / BLOCKERS.

### Критическое мышление

Если подход пользователя хуже альтернативы — сказать ДО выполнения:

```
ПРОБЛЕМА: [конкретная проблема, 1 предложение]
АЛЬТЕРНАТИВА: [лучший подход]
КОМПРОМИСС: [что выигрываем и теряем]
Продолжать? да/нет
```

Если пользователь настаивает — выполнить, но добавить в код: `# ВНИМАНИЕ: рассмотреть [альтернативу]`
