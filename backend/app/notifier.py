import os
import logging
import httpx
from .schemas import OrderResponse

logger = logging.getLogger(__name__)

async def notify_owner(order: OrderResponse) -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("OWNER_CHAT_ID")
    if not token or not chat_id:
        return
    
    items_str = ", ".join(f"{k} x{v}" for k, v in order.items.items())
    text = (
        f"Новый заказ!\n"
        f"Имя: {order.customer_name}\n"
        f"Позиции: {items_str}\n"
        f"Сумма: {order.total}р\n"
        f"Комментарий: {order.comment or '—'}"
    )
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json={"chat_id": chat_id, "text": text})
    except Exception:
        logger.exception("Failed to send Telegram notification")
