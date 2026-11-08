from fastapi import HTTPException
from sqlalchemy import func, select

from app.models import Appointment, Notification, ReceptionPeriod, User
from app.schemas.period import PeriodOut


def count_taken(db, period_id):
    return db.scalar(
        select(func.count()).select_from(Appointment).where(
            Appointment.period_id == period_id,
            Appointment.status != "cancelled",
        )
    )


def to_out(db, period):
    return PeriodOut(
        id=period.id,
        faculty_id=period.faculty_id,
        dean_id=period.dean_id,
        starts_at=period.starts_at,
        ends_at=period.ends_at,
        capacity=period.capacity,
        free_places=period.capacity - count_taken(db, period.id),
        status=period.status,
    )


def get_faculty_period(db, period_id, faculty_id):
    period = db.get(ReceptionPeriod, period_id)
    if period is None or period.faculty_id != faculty_id:
        raise HTTPException(404, "Период не найден")
    return period


def check_dean(db, dean_id, faculty_id):
    dean = db.get(User, dean_id)
    if dean is None or dean.role != "dean" or dean.faculty_id != faculty_id or not dean.is_active:
        raise HTTPException(400, "Декан не найден на этом факультете")


def check_time(starts_at, ends_at, capacity):
    if starts_at >= ends_at:
        raise HTTPException(400, "Начало должно быть раньше окончания")
    if capacity <= 0:
        raise HTTPException(400, "Лимит мест должен быть больше нуля")


def check_overlap(db, dean_id, starts_at, ends_at, exclude_id=None):
    query = select(ReceptionPeriod.id).where(
        ReceptionPeriod.dean_id == dean_id,
        ReceptionPeriod.status == "open",
        ReceptionPeriod.starts_at < ends_at,
        ReceptionPeriod.ends_at > starts_at,
    )
    if exclude_id is not None:
        query = query.where(ReceptionPeriod.id != exclude_id)
    if db.scalar(query) is not None:
        raise HTTPException(400, "Периоды одного декана пересекаются")


def create_period(db, secretary, data):
    check_time(data.starts_at, data.ends_at, data.capacity)
    check_dean(db, data.dean_id, secretary.faculty_id)
    check_overlap(db, data.dean_id, data.starts_at, data.ends_at)
    period = ReceptionPeriod(
        faculty_id=secretary.faculty_id,
        dean_id=data.dean_id,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        capacity=data.capacity,
    )
    db.add(period)
    db.commit()
    return period


def update_period(db, secretary, period_id, data):
    period = db.scalar(
        select(ReceptionPeriod).where(ReceptionPeriod.id == period_id).with_for_update()
    )
    if period is None or period.faculty_id != secretary.faculty_id:
        raise HTTPException(404, "Период не найден")
    if period.status != "open":
        raise HTTPException(400, "Период отменён")

    if count_taken(db, period.id) > 0:
        if data.dean_id or data.starts_at or data.ends_at:
            raise HTTPException(400, "После первой записи можно только увеличить лимит")
        if data.capacity is None or data.capacity <= period.capacity:
            raise HTTPException(400, "Лимит можно только увеличить")
        period.capacity = data.capacity
        db.commit()
        return period

    dean_id = data.dean_id or period.dean_id
    starts_at = data.starts_at or period.starts_at
    ends_at = data.ends_at or period.ends_at
    capacity = data.capacity or period.capacity
    check_time(starts_at, ends_at, capacity)
    check_dean(db, dean_id, period.faculty_id)
    check_overlap(db, dean_id, starts_at, ends_at, period.id)
    period.dean_id = dean_id
    period.starts_at = starts_at
    period.ends_at = ends_at
    period.capacity = capacity
    db.commit()
    return period


def cancel_period(db, secretary, period_id):
    period = db.scalar(
        select(ReceptionPeriod).where(ReceptionPeriod.id == period_id).with_for_update()
    )
    if period is None or period.faculty_id != secretary.faculty_id:
        raise HTTPException(404, "Период не найден")
    if period.status == "cancelled":
        raise HTTPException(400, "Период уже отменён")

    period.status = "cancelled"
    appointments = db.scalars(
        select(Appointment).where(
            Appointment.period_id == period.id,
            Appointment.status == "active",
        )
    ).all()
    for appointment in appointments:
        appointment.status = "cancelled"
        db.add(Notification(
            appointment_id=appointment.id,
            kind="period_cancelled",
            message="Период приёма отменён, ваша запись отменена",
        ))
    db.commit()
    return period
