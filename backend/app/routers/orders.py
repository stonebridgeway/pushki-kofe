import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import async_session
from ..schemas import OrderCreate, OrderResponse
from ..models import Order
from ..sheets import write_order
from ..notifier import notify_owner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])

async def verify_token(authorization: str = Header(...)):
    api_secret = os.getenv("API_SECRET_TOKEN")
    if not api_secret:
        logger.error("API_SECRET_TOKEN is not set in environment variables")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: API_SECRET_TOKEN not set"
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme"
        )
    token = authorization.split(" ")[1]
    if token != api_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_db():
    async with async_session() as session:
        yield session

@router.post("/", response_model=OrderResponse)
async def create_order(order: OrderCreate, db: AsyncSession = Depends(get_db)):
    # 1. Save to DB
    db_order = Order(**order.model_dump())
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)

    # Convert to response schema for external services
    response_order = OrderResponse.model_validate(db_order)

    # 2. Write to Google Sheets — does not block response on failure
    try:
        await write_order(response_order)
    except Exception:
        pass

    # 3. Notify owner via Telegram — does not block response on failure
    try:
        await notify_owner(response_order)
    except Exception:
        pass

    return db_order

@router.get("/", response_model=list[OrderResponse])
async def get_orders(
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_token)
):
    result = await db.execute(select(Order).order_by(Order.datetime.desc()))
    orders = result.scalars().all()
    return orders
