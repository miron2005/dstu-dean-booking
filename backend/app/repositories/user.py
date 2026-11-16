from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.models import Appointment, Notification, ReceptionPeriod, User


class UserRepository:
    @classmethod
    def get_all(cls, session: Session):
        return session.scalars(select(User).order_by(User.id)).all()

    @classmethod
    def get_deans(cls, faculty_id: int | None, session: Session):
        query = select(User).where(User.role == "dean", User.is_active.is_(True)).order_by(User.full_name)
        if faculty_id is not None:
            query = query.where(User.faculty_id == faculty_id)
        return session.scalars(query).all()

    @classmethod
    def get_one(cls, user_id: int, session: Session):
        return session.get(User, user_id)

    @classmethod
    def get_by_email(cls, email: str, session: Session):
        return session.scalar(select(User).where(User.email == email))

    @classmethod
    def add_one(cls, fields: dict, session: Session):
        user = User(**fields)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    @classmethod
    def update_one(cls, user: User, changes: dict, session: Session):
        for field, value in changes.items():
            setattr(user, field, value)
        session.commit()
        session.refresh(user)
        return user

    @classmethod
    def delete_with_data(cls, user: User, session: Session):
        period_ids = select(ReceptionPeriod.id).where(ReceptionPeriod.dean_id == user.id)
        appointment_ids = select(Appointment.id).where(
            or_(Appointment.student_id == user.id, Appointment.period_id.in_(period_ids))
        )
        session.execute(delete(Notification).where(Notification.appointment_id.in_(appointment_ids)))
        session.execute(delete(Appointment).where(Appointment.id.in_(appointment_ids)))
        session.execute(delete(ReceptionPeriod).where(ReceptionPeriod.dean_id == user.id))
        session.delete(user)
        session.commit()
