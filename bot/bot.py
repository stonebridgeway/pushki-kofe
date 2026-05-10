import asyncio
import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, F
from aiogram.types import (
    Message,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)
from aiogram.filters import CommandStart
from sqlalchemy.exc import IntegrityError
from database import async_session
from models import User

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


def menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🎯 Открыть меню", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])


def phone_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Поделиться номером", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


async def get_or_create_user(telegram_id: int, first_name: str | None) -> User:
    async with async_session() as session:
        user = await session.get(User, telegram_id)
        if user is None:
            user = User(telegram_id=telegram_id, first_name=first_name)
            session.add(user)
            try:
                await session.commit()
                await session.refresh(user)
            except IntegrityError:
                await session.rollback()
                user = await session.get(User, telegram_id)
        return user


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    user = await get_or_create_user(
        telegram_id=message.from_user.id,
        first_name=message.from_user.first_name,
    )
    if user.phone:
        await message.answer(
            "Привет! Нажмите кнопку, чтобы открыть меню.",
            reply_markup=menu_keyboard(),
        )
    else:
        await message.answer(
            "Привет! Для оформления заказа нам нужен ваш номер телефона.",
            reply_markup=phone_keyboard(),
        )


@dp.message(F.contact)
async def handle_contact(message: Message) -> None:
    contact = message.contact
    # Принимаем только свой контакт
    if contact.user_id != message.from_user.id:
        await message.answer("Пожалуйста, поделитесь своим номером телефона.")
        return

    async with async_session() as session:
        user = await session.get(User, message.from_user.id)
        if user is None:
            user = User(
                telegram_id=message.from_user.id,
                first_name=message.from_user.first_name,
                phone=contact.phone_number,
            )
            session.add(user)
        else:
            user.phone = contact.phone_number
        await session.commit()

    await message.answer(
        "Спасибо! Теперь вы можете делать заказы.",
        reply_markup=ReplyKeyboardRemove(),
    )
    await message.answer(
        "Нажмите кнопку, чтобы открыть меню:",
        reply_markup=menu_keyboard(),
    )


async def main() -> None:
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
