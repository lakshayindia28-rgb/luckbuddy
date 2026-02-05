from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database.base import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True)
    vendor_username = Column(String, index=True)

    serial = Column(String, index=True)     # XA–XJ
    number = Column(Integer)                # 0–99
    points = Column(Integer)                # points placed

    timeslot = Column(String, index=True)   # 14:30-14:45
    slot_date = Column(String, index=True)  # YYYY-MM-DD (local day for the slot)
    locked = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
