from pydantic import BaseModel


class TicketDigitPriceCreate(BaseModel):
    serial: str  # XA–XJ
    digit: int   # 0–9
    price: int
