from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)

    # 👇 vendor → super mapping
    super_id = Column(Integer, ForeignKey("users.id"), nullable=True)
