from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.core.security import verify_password, create_token

router = APIRouter()

@router.post("/login")
def login(username: str, password: str, role: str, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=username, role=role).first()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_payload = {
        "user_id": user.id,
        "role": user.role,
        "username": user.username   # 🔥 VERY IMPORTANT
    }

    token = create_token(token_payload)

    return {
        "token": token,
        "role": user.role,
        "username": user.username   # 🔥 frontend / logs ke liye
    }

