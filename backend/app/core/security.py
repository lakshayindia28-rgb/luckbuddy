from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

from app.core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(p): return pwd_context.hash(p)
def verify_password(p, h): return pwd_context.verify(p, h)

def create_token(data: dict):
    payload = data.copy()  # 🔥 IMPORTANT (no mutation)
    payload["exp"] = int((datetime.utcnow() + timedelta(hours=6)).timestamp())

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
