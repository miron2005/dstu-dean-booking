from fastapi import HTTPException, status

from app.models import ReceptionPeriod
from app.repositories import AppointmentRepository, NotificationRepository, PeriodRepository, UserRepository
from app.schemas.period import SPeriod


def to_out(session, period):
    return SPeriod(
        id=period.id,
        faculty_id=period.faculty_id,
        dean_id=period.dean_id,
        starts_at=period.starts_at,
        ends_at=period.ends_at,
        capacity=period.capacity,
        free_places=period.capacity - PeriodRepository.count_taken(period.id, session),
        status=period.status,
    )


def check_dean(session, dean_id, faculty_id):
    dean = UserRepository.get_one(dean_id, session)
    if dean is None or dean.role != "dean" or dean.faculty_id != faculty_id or not dean.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Декан не найден на этом факультете")


def check_time(starts_at, ends_at, capacity):
    if starts_at >= ends_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Начало должно быть раньше окончания")
    if capacity <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Лимит мест должен быть больше нуля")


def check_overlap(session, dean_id, starts_at, ends_at, exclude_id=None):
    if PeriodRepository.has_overlap(dean_id, starts_at, ends_at, exclude_id, session):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Периоды одного декана пересекаются")


def create_period(session, secretary, data):
    check_time(data.starts_at, data.ends_at, data.capacity)
    check_dean(session, data.dean_id, secretary.faculty_id)
    check_overlap(session, data.dean_id, data.starts_at, data.ends_at)
    period = ReceptionPeriod(
        faculty_id=secretary.faculty_id,
        dean_id=data.dean_id,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        capacity=data.capacity,
    )
    return PeriodRepository.add_one(period, session)


def update_period(session, secretary, period_id, data):
    period = PeriodRepository.get_one(period_id, session, for_update=True)
    if period is None or period.faculty_id != secretary.faculty_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Период не найден")
    if period.status != "open":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Период отменён")

    if PeriodRepository.count_taken(period.id, session) > 0:
        if data.dean_id or data.starts_at or data.ends_at:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "После первой записи можно только увеличить лимит")
        if data.capacity is None or data.capacity <= period.capacity:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Лимит можно только увеличить")
        period.capacity = data.capacity
        return PeriodRepository.add_one(period, session)

    dean_id = data.dean_id or period.dean_id
    starts_at = data.starts_at or period.starts_at
    ends_at = data.ends_at or period.ends_at
    capacity = data.capacity or period.capacity
    check_time(starts_at, ends_at, capacity)
    check_dean(session, dean_id, period.faculty_id)
    check_overlap(session, dean_id, starts_at, ends_at, period.id)
    period.dean_id = dean_id
    period.starts_at = starts_at
    period.ends_at = ends_at
    period.capacity = capacity
    return PeriodRepository.add_one(period, session)


def cancel_period(session, secretary, period_id):
    period = PeriodRepository.get_one(period_id, session, for_update=True)
    if period is None or period.faculty_id != secretary.faculty_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Период не найден")
    if period.status == "cancelled":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Период уже отменён")

    period.status = "cancelled"
    for appointment in AppointmentRepository.get_active_by_period(period.id, session):
        appointment.status = "cancelled"
        NotificationRepository.add(
            appointment.id,
            "period_cancelled",
            "Период приёма отменён, ваша запись отменена",
            session,
        )
    return PeriodRepository.add_one(period, session)
