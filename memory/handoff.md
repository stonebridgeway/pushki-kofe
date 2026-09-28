# Session: 2026-09-28

DONE:
- Репозиторий `stonebridgeway/pushki-kofe` склонирован отдельно в `C:\Users\sacha\Desktop\Учёба\pushki-kofe`.
- Добавлен `.github/workflows/deploy-pages.yml`: при push в `master` публикуется только `frontend/` через GitHub Actions и GitHub Pages.

NEXT:
- Проверить успешный Pages deployment после push; URL: `https://stonebridgeway.github.io/pushki-kofe/`.
- Для рабочего меню и оформления заказов развернуть FastAPI отдельно, настроить CORS и адрес API во фронтенде.

FILES_CHANGED:
- `.github/workflows/deploy-pages.yml` [NEW]
- `memory/decisions.md` [MODIFIED]
- `memory/handoff.md` [MODIFIED]

BLOCKERS:
- GitHub Pages размещает только статический сайт. Сейчас frontend строит API URL от `window.location.origin`, поэтому запросы меню/заказа на Pages не подключатся к FastAPI без отдельного API URL и настройки сервера.

---

## Session: 2026-05-10

DONE:
- Реализован Telegram Mini App:
  - frontend раздаётся через FastAPI StaticFiles на `/app`
  - TMA SDK подключён (`telegram-web-app.js`) в index.html
  - `API_BASE` → `window.location.origin` (работает и localhost, и ngrok)
  - TMA init: `tg.expand()` + `tg.ready()` при старте
  - Имя из Telegram (`initDataUnsafe.user.first_name`) предзаполняет поле заказа
  - После подтверждения заказа `tg.close()` закрывает Mini App (через 4 сек)
  - `aiofiles` добавлен в requirements.txt
- Реализован aiogram бот (Вариант Б):
  - `/start` → проверяет наличие телефона в БД
  - Первый визит: запрашивает контакт через ReplyKeyboard (request_contact)
  - После получения контакта: сохраняет phone в БД, показывает InlineButton "Открыть меню"
  - Повторный `/start`: сразу показывает кнопку меню
  - Новая таблица `users` (telegram_id PK, first_name, phone) создаётся бэкендом при старте
  - Бот работает как отдельный сервис в docker-compose (polling режим)

NEXT:
- Запустить `docker-compose up --build` — убедиться что 3 контейнера стартуют
- `ngrok http 8000` → обновить WEBAPP_URL в .env → перезапустить бот
- Для теста в Telegram: отправить /start боту

FILES_CHANGED:
- backend/app/models.py [MODIFIED] — добавлена модель User
- backend/app/database.py [MODIFIED] — init_db импортирует User
- docker-compose.yml [MODIFIED] — добавлен сервис bot
- .env [MODIFIED] — добавлена переменная WEBAPP_URL
- bot/Dockerfile [NEW]
- bot/requirements.txt [NEW]
- bot/database.py [NEW]
- bot/models.py [NEW]
- bot/bot.py [NEW]

BLOCKERS:
- WEBAPP_URL в .env нужно заменить на реальный ngrok URL перед тестом в Telegram

---

## Session: 2026-05-09

DONE:
- Создал проект и настроил .md файлы
- Инициализировал FastAPI проект с Docker Compose (fastapi + postgres)
- Реализован полный бэкенд: GET /menu/, POST /orders/, GET /orders/ с токен-авторизацией
- Интеграции: Google Sheets (меню + лог заказов), Telegram Bot (уведомления владельца)
- Фронтенд (одностраничник) разбит на три файла:
  - frontend/index.html — HTML разметка
  - frontend/style.css  — все стили (~43 KB)
  - frontend/app.js     — вся логика (корзина, модалка, order submit)
- Связан бэкенд и фронтенд:
  - Добавлен API_BASE = 'http://localhost:8000'
  - Убран DEMO_MODE, заменён реальным fetch на POST /orders/
  - Исправлен URL (был /order → стал /orders/)
  - Исправлен формат items: Array → Dict[str, int] (как ожидает бэкенд)
  - total теперь отправляется как int (не строка)
  - [data-add-cart] переведён на event delegation (работает для динамических карточек)
  - loadMenu() + renderMenuCards() — меню загружается из GET /menu/ при старте
  - Захардкоженные карточки меню убраны из HTML, заменены лоадером
- Добавлена поддержка фото в карточках меню:
  - fullCard() и previewCard() в app.js: если item.image есть → <img>, иначе emoji-заглушка
  - style.css: добавлен .catalog-card-icon для emoji-fallback (flex-центрирование)
  - backend не менялся — sheets.py возвращает все колонки динамически
- Проведена end-to-end проверка:
  - Исправлен CORS: allow_credentials=False (было True, несовместимо с allow_origins=["*"])
  - docker-compose up --build ✓ (оба контейнера healthy)
  - GET / → {"status":"ok"} ✓
  - GET /menu/ → {"items":[]} ✓ (пусто, Google Sheets не настроен в .env)
  - POST /orders/ → заказ сохранён в PostgreSQL, id=1, status="new" ✓
  - Telegram/Sheets: тихо пропускают ошибки если credentials не заданы (по дизайну)

NEXT:
- Реализовать Telegram Mini Aps

FILES_CHANGED:
- backend/app/main.py [MODIFIED] — allow_credentials=False
- .env [MODIFIED] — заполнен GOOGLE_CREDENTIALS_JSON (base64), GOOGLE_SHEETS_ID

BLOCKERS:
- None

## End-to-end статус: ВСЁ РАБОТАЕТ ✓
- GET /menu/ → читает из Google Sheets ✓
- POST /orders/ → сохраняет в PostgreSQL ✓
- Telegram уведомление владельцу ✓
- Google Sheets "Заказы" — запись строки ✓
- Фронтенд показывает карточки меню из API ✓
