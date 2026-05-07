from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routers.menu import router as menu_router
from .routers.orders import router as orders_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    await init_db()
    yield
    # Clean up (if needed) on shutdown

app = FastAPI(title="Pushki Kofe API", lifespan=lifespan)

# CORS — allow all origins for demo; restrict to your domain in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu_router)
app.include_router(orders_router)

@app.get("/")
async def root():
    return {"status": "ok"}
