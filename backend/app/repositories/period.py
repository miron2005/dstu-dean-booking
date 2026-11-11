from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Appointment, ReceptionPeriod


class PeriodRepository:
    @classmethod
    def get_all(cls, faculty_id: int, session: Session, day: date | None = None):
        query = (
            select(ReceptionPeriod)
            .where(ReceptionPeriod.faculty_id == faculty_id)
            .options(selectinload(ReceptionPeriod.dean))
            .order_by(ReceptionPeriod.starts_at)
        )
        if day is not None:
            start = datetime.combine(day, time.min, tzinfo=timezone.utc)
            query = query.where(
                ReceptionPeriod.starts_at >= start,
                ReceptionPeriod.starts_at < start + timedelta(days=1),
            )
        return session.scalars(query).all()

    @classmethod
    def get_one(cls, period_id: int, session: Session, for_update: bool = False):
        query = select(ReceptionPeriod).where(ReceptionPeriod.id == period_id)
        if for_update:
            query = query.with_for_update()
        return session.scalar(query)

    @classmethod
    def count_taken(cls, period_id: int, session: Session):
        query = select(func.count()).select_from(Appointment).where(
            Appointment.period_id == period_id,
            Appointment.status != "cancelled",
        )
        return session.scalar(query)

    @classmethod
    def has_overlap(cls, dean_id: int, starts_at, ends_at, exclude_id: int | None, session: Session):
        query = select(ReceptionPeriod.id).where(
            ReceptionPeriod.dean_id == dean_id,
            ReceptionPeriod.status == "open",
            ReceptionPeriod.starts_at < ends_at,
            ReceptionPeriod.ends_at > starts_at,
        )
        if exclude_id is not None:
            query = query.where(ReceptionPeriod.id != exclude_id)
        return session.scalar(query) is not None

    @classmethod
    def add_one(cls, period: ReceptionPeriod, session: Session):
        session.add(period)
        session.commit()
        session.refresh(period)
        return period
