from datetime import datetime
from sqlalchemy import BigInteger, String, Integer, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class User(Base):
    __tablename__ = "users"

    telegram_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    datetime: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    customer_name: Mapped[str] = mapped_column(String)
    items: Mapped[dict] = mapped_column(JSON)
    total: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="new", server_default="new")

    def __repr__(self) -> str:
        return f"Order(id={self.id!r}, customer_name={self.customer_name!r}, total={self.total!r}, status={self.status!r})"
