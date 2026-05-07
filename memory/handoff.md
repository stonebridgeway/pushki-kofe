## Session: 2026-05-07

DONE:
- Создал проект и настроил .md файлы
- Инициализировал FastAPI проект с Docker Compose (fastapi + postgres)
- Созданы: docker-compose.yml, backend/Dockerfile, backend/requirements.txt, backend/app/main.py, .env
- Создано виртуальное окружение `.venv` и установлены зависимости
- Реализовал модель SQLAlchemy `Order` и Pydantic схемы `OrderCreate`, `OrderResponse`.
- Настроил асинхронное подключение к PostgreSQL через `database.py`.
- Добавил автоматическую инициализацию БД (создание таблиц) при запуске FastAPI через `lifespan`.
- Реализовал эндпоинт `GET /menu` с интеграцией Google Sheets.
- Добавил in-memory TTL кэширование (5 мин) для данных меню.
- Реализовал эндпоинт `POST /order` с сохранением в PostgreSQL.
- Добавил интеграцию с Google Sheets для записи новых заказов.
- Реализовал уведомления владельца в Telegram при создании заказа.
- Настроил расширенные SCOPES для работы с Google Sheets (запись).
- Реализовал эндпоинт `GET /orders` с токен-авторизацией и сортировкой (newest first).
- Обновил префикс роутера на `/orders` для соответствия REST.
- Ревью бэкенда: проверка импортов, роутов, кода.
- Добавил CORSMiddleware в main.py (allow_origins=["*"] для демки).
- Исправил verify_token: читает токен при каждом вызове, возвращает 500 если не задан.
- Заменил `except: pass` на `logging.exception()` в sheets.py и notifier.py.
- Убрал `version: '3.8'` из docker-compose.yml (устаревший атрибут).
- Добавил named volume `postgres_data` в docker-compose.yml (данные БД не теряются при down).

NEXT:
Реализовать фронтенд (Этап 2 из README):
- Одностраничник: шапка, каталог карточек меню (из GET /menu/)
- Корзина (JS, без перезагрузки)
- Форма заказа: имя + комментарий + кнопка → POST /orders/
- Экран подтверждения
- Адаптив под мобильный
- Дизайн: тёмно-зелёный/хаки/бежевый, брутальный военный стиль + кофейня

FILES_CHANGED:
- backend/app/main.py [MODIFY] — CORSMiddleware
- backend/app/routers/orders.py [MODIFY] — logging, fix verify_token
- backend/app/sheets.py [MODIFY] — logging
- backend/app/notifier.py [MODIFY] — logging
- docker-compose.yml [MODIFY] — убран version, добавлен volume

BLOCKERS:
- None
