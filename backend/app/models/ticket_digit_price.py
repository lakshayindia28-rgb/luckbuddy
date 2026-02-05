from sqlalchemy import Column, Integer, String, UniqueConstraint

from app.database.base import Base


class TicketDigitPrice(Base):
    __tablename__ = "ticket_digit_prices"

    id = Column(Integer, primary_key=True)
    serial = Column(String, index=True)  # XA–XJ
    digit = Column(Integer, index=True)  # 0–9 (units digit)
    price = Column(Integer, default=10)

    __table_args__ = (
        UniqueConstraint("serial", "digit", name="uq_ticket_digit_prices_serial_digit"),
    )
