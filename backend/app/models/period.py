from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Model


class ReceptionPeriod(Model):
    __tablename__ = "reception_periods"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="ck_period_capacity"),
        CheckConstraint("next_queue_number > 0", name="ck_period_next_number"),
        CheckConstraint("starts_at < ends_at", name="ck_period_time"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculties.id"))
    dean_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer)
    next_queue_number: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(16), default="open")
