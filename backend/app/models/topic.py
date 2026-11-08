from sqlalchemy import BigInteger, Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AppealTopic(Base):
    __tablename__ = "appeal_topics"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculties.id"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
