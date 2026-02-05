from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database.base import Base

class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True)

    serial = Column(String, index=True)          # XA–XJ
    timeslot = Column(String, index=True)        # 14:30-14:45
    slot_date = Column(String, index=True)       # YYYY-MM-DD (local day for the slot)
    winning_number = Column(Integer)

    total_points = Column(Integer)
    total_amount = Column(Integer)

    payout_amount = Column(Integer)
    admin_amount = Column(Integer)

    is_manual = Column(Boolean, default=False)
    published = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)  # 🔥 REQUIRED
