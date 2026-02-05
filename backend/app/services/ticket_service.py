from sqlalchemy.orm import Session
from app.models.ticket import Ticket
from app.utils.validators import validate_number, validate_serial

def add_ticket(db: Session, vendor_id: int, data):
    validate_number(data.number)
    validate_serial(data.serial)

    ticket = Ticket(
        vendor_id=vendor_id,
        serial=data.serial,
        number=data.number,
        points=data.points,
        timeslot=data.timeslot
    )
    db.add(ticket)
    db.commit()
    return ticket

def lock_tickets(db: Session, vendor_id: int, timeslot: str):
    db.query(Ticket).filter_by(
        vendor_id=vendor_id,
        timeslot=timeslot
    ).update({"locked": True})
    db.commit()
