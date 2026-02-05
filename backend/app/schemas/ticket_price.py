# app/schemas/ticket_price.py
from pydantic import BaseModel

class TicketPriceCreate(BaseModel):
    serial: str    # XA, XB ...
    price: int
