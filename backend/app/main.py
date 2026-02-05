from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# ================= DATABASE =================
from app.database.db import engine
from app.database.base import Base

# ================= MODELS (IMPORTANT) =================
# ⚠️ Ye imports zaroori hain taaki tables create ho
from app.models.user import User
from app.models.ticket import Ticket
from app.models.result import Result
from app.models.ticket_price import TicketPrice
from app.models.ticket_digit_price import TicketDigitPrice
from app.models.notification import Notification

from app.core.scheduler import start_scheduler

# ================= ROUTERS =================
from app.api import auth, admin, super, vendor, result, notification

# ================= APP INIT =================
app = FastAPI(title="BhagyaLaxmi")

# ================= CREATE TABLES =================
# ⚠️ Ye line bina fail honi chahiye
Base.metadata.create_all(bind=engine)

# ================= CORS =================
_cors_env = os.getenv("CORS_ORIGINS", "").strip()
if _cors_env:
    cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://bhagylaxmi.in",
        "https://www.bhagylaxmi.in",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= ROUTES =================
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(super.router)
app.include_router(vendor.router)
app.include_router(result.router)
app.include_router(notification.router)


@app.on_event("startup")
def _startup():
    start_scheduler()

# ================= HEALTH CHECK =================
@app.get("/")
def root():
    return {"status": "BhagyaLaxmi backend running"}
