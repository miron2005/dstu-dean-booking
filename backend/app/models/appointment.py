from datetime import datetime, timezone

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Model


class Appointment(Model):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint("period_id", "queue_number", name="uq_appointment_number"),
        CheckConstraint("queue_number > 0", name="ck_appointment_number"),
        Index(
            "uq_appointment_active_student",
            "period_id",
            "student_id",
            unique=True,
            postgresql_where="status <> 'cancelled'",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    period_id: Mapped[int] = mapped_column(ForeignKey("reception_periods.id"))
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    topic_id: Mapped[int] = mapped_column(ForeignKey("appeal_topics.id"))
    question: Mapped[str] = mapped_column(Text)
    queue_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    result_comment: Mapped[str | None] = mapped_column(Text)

    student = relationship("User")
