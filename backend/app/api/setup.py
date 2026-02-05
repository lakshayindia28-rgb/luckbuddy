from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.core.security import hash_password

router = APIRouter()

@router.get("/setup/check")
def check_admin_exists(db: Session = Depends(get_db)):
    admin_count = db.query(User).filter(User.role == "admin").count()
    return {"admin_exists": admin_count > 0}

@router.post("/setup/create")
def create_first_admin(username: str, password: str, db: Session = Depends(get_db)):
    admin_count = db.query(User).filter(User.role == "admin").count()

    if admin_count > 0:
        raise HTTPException(status_code=403, detail="Admin already exists")

    admin = User(
        username=username,
        password_hash=hash_password(password),
        role="admin"
    )
    db.add(admin)
    db.commit()
    return {"message": "Admin created successfully"}
