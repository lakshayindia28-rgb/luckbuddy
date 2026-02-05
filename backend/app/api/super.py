from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user
from app.models.ticket import Ticket
from app.schemas.ticket import PlayGameRequest
from app.models.user import User
from app.core.security import hash_password
from app.utils.time_slots import current_timeslot
from datetime import date
from app.utils.validators import validate_number, validate_serial

router = APIRouter(prefix="/super", tags=["Super"])


# =================================================
# 🔹 SUPER plays on behalf of a VENDOR
# =================================================
@router.post(
    "/play-for-vendor",
    dependencies=[Depends(get_current_user(["super"]))]
)
def play_for_vendor(
    vendor_username: str,
    data: PlayGameRequest,
    db: Session = Depends(get_db)
):
    timeslot = current_timeslot()
    slot_date = date.today().isoformat()

    # 🔒 Check if vendor already played this slot
    existing = db.query(Ticket).filter(
        Ticket.vendor_username == vendor_username,
        Ticket.timeslot == timeslot,
        Ticket.locked == True
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Vendor already submitted for this time slot"
        )

    if not data.bets:
        raise HTTPException(status_code=400, detail="No tickets submitted")

    for bet in data.bets:
        try:
            validate_serial(bet.serial)
            validate_number(bet.number)
        except ValueError as e:
            raise HTTPException(400, str(e))

        if bet.points <= 0:
            continue

        db.add(
            Ticket(
                vendor_username=vendor_username,
                serial=bet.serial,
                number=bet.number,
                points=bet.points,
                timeslot=timeslot,
                slot_date=slot_date,
                locked=True
            )
        )

    db.commit()

    return {
        "message": f"Game locked for vendor {vendor_username}",
        "timeslot": timeslot
    }


# =================================================
# 🔹 LIST ALL VENDORS (Super Dashboard)
# =================================================
@router.get(
    "/vendors",
    dependencies=[Depends(get_current_user(["super"]))]
)
def list_vendors(request: Request, db: Session = Depends(get_db)):
    super_user = request.state.user

    vendors = db.query(User).filter(
        User.role == "vendor",
        User.super_id == super_user["id"]   # 🔥 MAIN FIX
    ).all()

    return [
        {"id": v.id, "username": v.username}
        for v in vendors
    ]



# =================================================
# 🔹 CREATE VENDOR (Super creates vendor)
# =================================================
@router.post(
    "/create-vendor",
    dependencies=[Depends(get_current_user(["super"]))]
)
def create_vendor(
    username: str,
    password: str,
     request: Request,
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter_by(username=username).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    vendor = User(
        username=username,
        password_hash=hash_password(password),
        role="vendor",
        super_id=request.state.user["id"]  # 🔥 auto assign
    )

    db.add(vendor)
    db.commit()

    return {"message": "Vendor created successfully"}
