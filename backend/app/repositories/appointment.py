from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Appointment


class AppointmentRepository:
    @classmethod
    def get_one(cls, appointment_id: int, session: Session):
        return session.get(Appointment, appointment_id)

    @classmethod
    def get_by_student(cls, student_id: int, session: Session):
        query = (
            select(Appointment)
            .where(Appointment.student_id == student_id)
            .order_by(Appointment.created_at.desc())
        )
        return session.scalars(query).all()

    @classmethod
    def student_has_active(cls, period_id: int, student_id: int, session: Session):
        query = select(Appointment.id).where(
            Appointment.period_id == period_id,
            Appointment.student_id == student_id,
            Appointment.status != "cancelled",
        )
        return session.scalar(query) is not None

    @classmethod
    def get_queue(cls, period_id: int, session: Session):
        query = (
            select(Appointment)
            .where(Appointment.period_id == period_id, Appointment.status != "cancelled")
            .options(selectinload(Appointment.student))
            .order_by(Appointment.queue_number)
        )
        return session.scalars(query).all()

    @classmethod
    def get_active_by_period(cls, period_id: int, session: Session):
        query = select(Appointment).where(
            Appointment.period_id == period_id,
            Appointment.status == "active",
        )
        return session.scalars(query).all()

    @classmethod
    def get_first_active(cls, period_id: int, session: Session):
        query = (
            select(Appointment)
            .where(Appointment.period_id == period_id, Appointment.status == "active")
            .order_by(Appointment.queue_number)
            .limit(1)
            .with_for_update()
        )
        return session.scalar(query)

    @classmethod
    def add_one(cls, appointment: Appointment, session: Session):
        session.add(appointment)
        session.commit()
        session.refresh(appointment)
        return appointment
