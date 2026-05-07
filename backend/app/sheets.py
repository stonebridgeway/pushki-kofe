import os
import json
import base64
import asyncio
import time
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
CACHE_TTL = 300  # 5 minutes

_menu_cache: Optional[List[Dict]] = None
_last_update: float = 0

def _get_credentials():
    creds_b64 = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if not creds_b64:
        return None
    try:
        creds_json = base64.b64decode(creds_b64).decode('utf-8')
        creds_dict = json.loads(creds_json)
        return Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    except Exception:
        return None

def _read_menu_sync() -> List[Dict]:
    creds = _get_credentials()
    sheet_id = os.environ.get("GOOGLE_SHEETS_ID")
    if not creds or not sheet_id:
        return []

    try:
        service = build('sheets', 'v4', credentials=creds)
        sheet = service.spreadsheets()
        result = sheet.values().get(spreadsheetId=sheet_id, range='Меню').execute()
        values = result.get('values', [])

        if not values:
            return []

        headers = values[0]
        menu = []
        for row in values[1:]:
            item = {}
            for i, header in enumerate(headers):
                item[header] = row[i] if i < len(row) else None
            menu.append(item)
        return menu
    except Exception:
        logger.exception("Failed to read menu from Google Sheets")
        return []

async def read_menu() -> List[Dict]:
    global _menu_cache, _last_update
    
    current_time = time.time()
    if _menu_cache is not None and (current_time - _last_update) < CACHE_TTL:
        return _menu_cache

    data = await asyncio.to_thread(_read_menu_sync)
    _menu_cache = data
    _last_update = current_time
    return data

async def write_order(order) -> None:
    await asyncio.to_thread(_write_order_sync, order)

def _write_order_sync(order) -> None:
    creds = _get_credentials()
    sheet_id = os.environ.get("GOOGLE_SHEETS_ID")
    if not creds or not sheet_id:
        return
    
    # Format items: "Latte x2, Cappuccino x1"
    items_str = ", ".join(f"{k} x{v}" for k, v in order.items.items())
    
    # Row format based on README: id | datetime | customer_name | items | total | comment | status
    row = [
        order.id,
        str(order.datetime),
        order.customer_name,
        items_str,
        order.total,
        order.comment or "",
        order.status
    ]
    
    try:
        service = build('sheets', 'v4', credentials=creds)
        service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range='Заказы',
            valueInputOption='RAW',
            body={'values': [row]}
        ).execute()
    except Exception:
        logger.exception("Failed to write order to Google Sheets")
