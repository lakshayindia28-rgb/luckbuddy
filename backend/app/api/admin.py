from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.core.security import hash_password
from app.middleware.auth import get_current_user
from app.schemas.ticket_price import TicketPriceCreate
from app.models.ticket_price import TicketPrice
from app.schemas.ticket_digit_price import TicketDigitPriceCreate
from app.models.ticket_digit_price import TicketDigitPrice
from app.models.ticket import Ticket
from app.services.pricing import build_digit_price_map, get_digit_price

router = APIRouter(prefix="/admin")

@router.post("/create-user")
def create_user(username: str, password: str, role: str, db: Session = Depends(get_db)):
    user = User(
        username=username,
        password_hash=hash_password(password),
        role=role
    )
    db.add(user)
    db.commit()
    return {"message": f"{role} created"}

@router.get(
    "/users",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role
        }
        for u in users
    ]


# =========================
# 🔹 RESET USER PASSWORD
# =========================
@router.post(
    "/reset-password",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def reset_password(
    user_id: int,
    new_password: str,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    user.password_hash = hash_password(new_password)
    db.commit()
    return {"message": "Password reset successfully"}


# =========================
# 🔹 DELETE USER (OPTIONAL)
# =========================
@router.delete(
    "/user/{user_id}",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(404, "User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

# =========================
# 🔹 LIST ALL USERS
# =========================
@router.get(
    "/users",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role
        }
        for u in users
    ]
# ======================================================
# TICKET PRICE (XA–XJ)
# ======================================================

# ================= SET / UPDATE TICKET PRICE =================
@router.post(
    "/ticket-price",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def set_ticket_price(
    data: TicketPriceCreate,
    db: Session = Depends(get_db)
):
    price = db.query(TicketPrice).filter_by(serial=data.serial).first()

    if price:
        price.price = data.price
    else:
        price = TicketPrice(
            serial=data.serial,
            price=data.price
        )
        db.add(price)

    db.commit()
    return {"message": "Ticket price updated successfully"}


@router.get(
    "/ticket-prices",
    dependencies=[Depends(get_current_user(["admin", "vendor", "super"]))]
)
def get_ticket_prices(db: Session = Depends(get_db)):
    return db.query(TicketPrice).all()


# ======================================================
# DIGIT PRICE (0–9) PER SERIAL (XA–XJ)
# ======================================================

@router.post(
    "/ticket-digit-price",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def set_ticket_digit_price(
    data: TicketDigitPriceCreate,
    db: Session = Depends(get_db)
):
    if data.digit < 0 or data.digit > 9:
        raise HTTPException(400, "Digit must be between 0 and 9")

    row = db.query(TicketDigitPrice).filter_by(
        serial=data.serial,
        digit=data.digit
    ).first()

    if row:
        row.price = data.price
    else:
        row = TicketDigitPrice(
            serial=data.serial,
            digit=data.digit,
            price=data.price
        )
        db.add(row)

    db.commit()
    return {"message": "Ticket digit price updated successfully"}


@router.get(
    "/ticket-digit-prices",
    dependencies=[Depends(get_current_user(["admin", "vendor", "super"]))]
)
def get_ticket_digit_prices(
    serial: str | None = None,
    db: Session = Depends(get_db)
):
    q = db.query(TicketDigitPrice)
    if serial:
        q = q.filter(TicketDigitPrice.serial == serial)
    return q.all()


# ======================================================
# VIEW VENDOR TICKETS (ADMIN)
# ======================================================

@router.get(
    "/tickets",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def list_tickets(
    timeslot: str | None = None,
    vendor_username: str | None = None,
    serial: str | None = None,
    db: Session = Depends(get_db)
):
    q = db.query(Ticket).filter(Ticket.locked == True)
    if timeslot:
        q = q.filter(Ticket.timeslot == timeslot)
    if vendor_username:
        q = q.filter(Ticket.vendor_username == vendor_username)
    if serial:
        q = q.filter(Ticket.serial == serial)

    tickets = q.order_by(Ticket.timeslot.desc(), Ticket.vendor_username.asc()).all()

    digit_prices = build_digit_price_map(db)

    total_points = 0
    total_amount = 0
    rows = []

    for t in tickets:
        if t.number is None:
            continue
        pts = int(t.points or 0)
        if pts <= 0:
            continue
        digit = int(t.number) % 10
        price = int(digit_prices.get((t.serial, digit)) or get_digit_price(db, t.serial, digit))
        amount = pts * price

        total_points += pts
        total_amount += amount
        rows.append(
            {
                "vendor_username": t.vendor_username,
                "serial": t.serial,
                "number": t.number,
                "digit": digit,
                "points": pts,
                "price": price,
                "amount": amount,
                "timeslot": t.timeslot,
            }
        )

    return {
        "tickets": rows,
        "totals": {
            "total_points": total_points,
            "total_amount": total_amount,
        },
    }

# ======================================================
# SUPER ↔ VENDOR ASSIGNMENT
# ======================================================

@router.post(
    "/assign-vendor",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def assign_vendor(super_username: str, vendor_username: str, db: Session = Depends(get_db)):

    super_user = db.query(User).filter_by(
        username=super_username,
        role="super"
    ).first()

    vendor = db.query(User).filter_by(
        username=vendor_username,
        role="vendor"
    ).first()

    if not super_user or not vendor:
        raise HTTPException(404, "Super or Vendor not found")

    # ✅ CORE FIX
    vendor.super_id = super_user.id

    db.commit()

    return {
        "message": f"Vendor {vendor_username} assigned to Super {super_username}"
    }
