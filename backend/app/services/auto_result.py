from sqlalchemy.orm import Session
from datetime import datetime, date
import random

from app.models.ticket import Ticket
from app.models.result import Result
from app.utils.time_slots import current_timeslot, current_slot_date
from app.services.pricing import compute_totals_for_tickets


def generate_auto_result(db: Session, serial: str):
    """
    Auto result for one serial (XA–XJ) for current timeslot
    """

    timeslot = current_timeslot()
    slot_date = current_slot_date()

    existing = db.query(Result).filter(
        Result.serial == serial,
        Result.timeslot == timeslot,
        Result.slot_date == slot_date,
        Result.published == True
    ).first()
    if existing:
        return existing

    tickets = db.query(Ticket).filter(
        Ticket.serial == serial,
        Ticket.timeslot == timeslot,
        Ticket.slot_date == slot_date,
        Ticket.locked == True
    ).all()

    if not tickets:
        return None

    total_points, total_amount = compute_totals_for_tickets(db, tickets)

    # 🔢 pick winning number (0–99)
    winning_number = random.randint(0, 99)

    admin_cut = int(total_amount * 0.4)
    payout = total_amount - admin_cut

    result = Result(
        serial=serial,
        timeslot=timeslot,
        slot_date=slot_date,
        winning_number=winning_number,
        total_points=total_points,
        total_amount=total_amount,
        payout_amount=payout,
        admin_amount=admin_cut,
        is_manual=False,
        published=True,
        created_at=datetime.utcnow()
    )

    db.add(result)
    db.commit()

    return result
