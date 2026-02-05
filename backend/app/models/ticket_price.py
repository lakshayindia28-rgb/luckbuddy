# app/models/ticket_price.py
from sqlalchemy import Column, Integer, String
from app.database.base import Base

class TicketPrice(Base):
    __tablename__ = "ticket_prices"

    id = Column(Integer, primary_key=True)
    serial = Column(String, unique=True, index=True)
    price = Column(Integer, default=10)
