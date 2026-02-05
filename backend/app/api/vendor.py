from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user
from app.models.ticket import Ticket
from app.schemas.ticket import PlayGameRequest
from app.utils.time_slots import current_timeslot
from datetime import date
from app.utils.validators import validate_number, validate_serial
from app.services.pricing import build_digit_price_map, get_digit_price

router = APIRouter(prefix="/vendor", tags=["Vendor"])


@router.post("/play-game", dependencies=[Depends(get_current_user(["vendor","super"]))])
def play_game(data: PlayGameRequest, request: Request, db: Session = Depends(get_db)):

    user = request.state.user
    vendor_username = user["username"]

    if user["role"] == "super":
        if not data.forced_vendor:
            raise HTTPException(400, "Vendor not specified")
        vendor_username = data.forced_vendor

    slot = current_timeslot()
    slot_date = date.today().isoformat()

    exists = db.query(Ticket).filter_by(
        vendor_username=vendor_username,
        timeslot=slot,
        slot_date=slot_date,
        locked=True
    ).first()

    if exists:
        raise HTTPException(400, "Already played")

    if not data.bets:
        raise HTTPException(400, "No tickets submitted")

    for bet in data.bets:
        try:
            validate_serial(bet.serial)
            validate_number(bet.number)
        except ValueError as e:
            raise HTTPException(400, str(e))

        if bet.points <= 0:
            continue

        db.add(Ticket(
            vendor_username=vendor_username,
            serial=bet.serial,
            number=bet.number,
            points=bet.points,
            timeslot=slot,
            slot_date=slot_date,
            locked=True
        ))

    db.commit()
    return {"message": "Game locked"}


@router.get(
    "/tickets",
    dependencies=[Depends(get_current_user(["vendor", "super"]))]
)
def my_tickets(
    request: Request,
    timeslot: str | None = None,
    slot_date: str | None = None,
    db: Session = Depends(get_db)
):
    user = request.state.user
    vendor_username = user["username"]

    # Vendor dashboard should only show today's data by default.
    slot_date = slot_date or date.today().isoformat()

    q = db.query(Ticket).filter(
        Ticket.vendor_username == vendor_username,
        Ticket.locked == True,
        Ticket.slot_date == slot_date,
    )
    if timeslot:
        q = q.filter(Ticket.timeslot == timeslot)

    tickets = q.order_by(Ticket.timeslot.desc(), Ticket.serial.asc(), Ticket.number.asc()).all()
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
