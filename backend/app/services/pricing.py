from __future__ import annotations

from typing import Dict, Iterable, Tuple

from sqlalchemy.orm import Session

from app.models.ticket_digit_price import TicketDigitPrice
from app.models.ticket_price import TicketPrice


def build_digit_price_map(db: Session) -> Dict[Tuple[str, int], int]:
    rows = db.query(TicketDigitPrice).all()
    return {(r.serial, r.digit): int(r.price) for r in rows}


def get_digit_price(db: Session, serial: str, digit: int) -> int:
    row = db.query(TicketDigitPrice).filter_by(serial=serial, digit=digit).first()
    if row:
        return int(row.price)

    fallback = db.query(TicketPrice).filter_by(serial=serial).first()
    if fallback:
        return int(fallback.price)

    return 10


def compute_totals_for_tickets(db: Session, tickets: Iterable) -> tuple[int, int]:
    """Returns (total_points, total_amount) for given Ticket rows.

    Uses digit-wise pricing (serial + units digit), with fallback to serial price.
    Ignores tickets missing number.
    """

    digit_prices = build_digit_price_map(db)

    # Fallback serial prices (only fetched if needed)
    serial_price_cache: Dict[str, int] = {}

    total_points = 0
    total_amount = 0

    for t in tickets:
        if t.number is None:
            continue

        digit = int(t.number) % 10
        key = (t.serial, digit)
        price = digit_prices.get(key)
        if price is None:
            if t.serial not in serial_price_cache:
                fallback = db.query(TicketPrice).filter_by(serial=t.serial).first()
                serial_price_cache[t.serial] = int(fallback.price) if fallback else 10
            price = serial_price_cache[t.serial]

        pts = int(t.points or 0)
        if pts <= 0:
            continue

        total_points += pts
        total_amount += pts * int(price)

    return total_points, total_amount
