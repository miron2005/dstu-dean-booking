from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Appointment, Notification


class NotificationRepository:
    @classmethod
    def get_by_student(cls, student_id: int, session: Session):
        query = (
            select(Notification)
            .join(Appointment, Appointment.id == Notification.appointment_id)
            .where(Appointment.student_id == student_id)
            .order_by(Notification.created_at.desc())
        )
        return session.scalars(query).all()

    @classmethod
    def get_one(cls, notification_id: int, session: Session):
        return session.get(Notification, notification_id)

    @classmethod
    def add(cls, appointment_id: int, kind: str, message: str, session: Session):
        session.add(Notification(appointment_id=appointment_id, kind=kind, message=message))

    @classmethod
    def save(cls, notification: Notification, session: Session):
        session.commit()
        session.refresh(notification)
        return notification
