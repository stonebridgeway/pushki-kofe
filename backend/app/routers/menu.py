from fastapi import APIRouter
from ..sheets import read_menu

router = APIRouter(prefix="/menu", tags=["menu"])

@router.get("/")
async def get_menu():
    items = await read_menu()
    return {"items": items}
