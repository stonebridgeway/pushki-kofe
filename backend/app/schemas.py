from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict

class OrderBase(BaseModel):
    customer_name: str
    items: Dict[str, int]  # Name -> Quantity
    total: int
    comment: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderResponse(OrderBase):
    id: int
    datetime: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)
