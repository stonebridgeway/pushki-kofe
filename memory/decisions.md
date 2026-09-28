# Architecture decisions

## 2026-09-28: Публикация статического frontend через GitHub Pages
Chosen: GitHub Actions публикует только `frontend/` из ветки `master`.
Reason: Pages подходит для публичной демонстрации статического сайта и обновляет его автоматически после push.
Do NOT: размещать FastAPI, PostgreSQL или Telegram-бота на GitHub Pages; для заказов нужен отдельно развернутый API с настроенным адресом и CORS.

## 2026-05-07: Google Sheets как источник меню
Chosen: Google Sheets API (read from "Меню" sheet)
Reason: клиент сам управляет меню без разработчика
Do NOT: добавлять отдельную admin-панель для меню в демке

## 2026-05-07: aiogram polling (не webhook) для демки
Chosen: polling (бот сам опрашивает Telegram)
Reason: проще поднять локально и на VPS без домена
Switch to webhook: после перехода на продакшн домен

## 2026-05-07: Frontend — vanilla JS, без фреймворков
Chosen: HTML + CSS + JS + React/Vue
Reason: демка, нет смысла в сборке, быстрее деплоить
Exception: если клиент после питча захочет SPA — обсудить

## 2026-05-07: Docker Compose вместо bare-metal запуска
Chosen: Docker Compose (fastapi + postgres как отдельные сервисы)
Reason: изоляция окружения, healthcheck для postgres, легко воспроизвести на любом хосте
Do NOT: запускать uvicorn и postgres напрямую на хосте в продакшне

## 2026-05-07: asyncpg как драйвер PostgreSQL
Chosen: asyncpg (через SQLAlchemy async engine)
Reason: нативный async, лучшая производительность для FastAPI, не блокирует event loop
Do NOT: использовать psycopg2 — он синхронный, несовместим с async SQLAlchemy

## 2026-05-07: .venv для локальной разработки + Docker для запуска
Chosen: параллельно держим .venv (для IDE/автодополнения) и Docker (для запуска)
Reason: без venv IDE не видит типы и зависимости; Docker даёт воспроизводимость
Do NOT: удалять .venv, он нужен только для разработки, не для деплоя

## 2026-05-07: In-memory TTL caching for Google Sheets
Chosen: In-memory TTL Cache (5 minutes)
Reason: Google Sheets API is slow; caching reduces latency and avoids hitting API limits
Do NOT: use Redis for caching at this stage (overkill for MVP)

## 2026-05-07: Структура позиций в заказе (items)
Chosen: Dict[str, int] (Название -> Количество)
Reason: Прямое соответствие формату вывода в Google Sheets ("Название xКолво")
Do NOT: Использовать вложенные объекты или сложные структуры без необходимости

## 2026-05-07: Расширение прав Google Sheets
Chosen: SCOPES = ['.../spreadsheets'] (полный доступ)
Reason: Необходима запись заказов в лист "Заказы"
Do NOT: Оставлять .readonly, если планируется запись из бекенда

## 2026-05-07: Токен-авторизация для административных эндпоинтов
Chosen: Bearer Token (header `Authorization`) + `API_SECRET_TOKEN` в `.env`
Reason: простая защита админских ручек (просмотр заказов) без полноценного OAuth2/JWT на этапе MVP
Do NOT: выводить секретный токен в логах или возвращать его в API
