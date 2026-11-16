from fastapi import HTTPException, status

from app.models import ReceptionPeriod
from app.repositories import AppointmentRepository, NotificationRepository, PeriodRepository, UserRepository
from app.config import SLOT_CHOICES
from app.schemas.period import SPeriod
from app.services import slots


def to_out(session, period):
    states = slots.slot_states(period, AppointmentRepository.get_taken_starts(period.id, session))
    return SPeriod(
        id=period.id,
        faculty_id=period.faculty_id,
        dean_id=period.dean_id,
        dean_name=period.dean.full_name,
        starts_at=period.starts_at,
        ends_at=period.ends_at,
        capacity=len(states),
        slot_minutes=period.slot_minutes,
        free_places=sum(1 for item in states if item["is_free"]),
        status=period.status,
    )


def check_dean(session, dean_id, faculty_id):
    dean = UserRepository.get_one(dean_id, session)
    if dean is None or dean.role != "dean" or dean.faculty_id != faculty_id or not dean.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Декан не найден на этом факультете")


def check_time(starts_at, ends_at, slot_minutes):
    if starts_at >= ends_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Начало должно быть раньше окончания")
    if slot_minutes not in SLOT_CHOICES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Длительность окна: 10, 15, 20 или 30 минут")
    if slots.total_slots(starts_at, ends_at, slot_minutes) < 1:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "В интервале не помещается ни одного окна")


def check_overlap(session, dean_id, starts_at, ends_at, exclude_id=None):
    if PeriodRepository.has_overlap(dean_id, starts_at, ends_at, exclude_id, session):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Периоды одного декана пересекаются")


def create_period(session, secretary, data):
    check_time(data.starts_at, data.ends_at, data.slot_minutes)
    check_dean(session, data.dean_id, secretary.faculty_id)
    check_overlap(session, data.dean_id, data.starts_at, data.ends_at)
    period = ReceptionPeriod(
        faculty_id=secretary.faculty_id,
        dean_id=data.dean_id,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        capacity=slots.total_slots(data.starts_at, data.ends_at, data.slot_minutes),
        slot_minutes=data.slot_minutes,
    )
    return PeriodRepository.add_one(period, session)


def update_period(session, secretary, period_id, data):
    period = PeriodRepository.get_one(period_id, session, for_update=True)
    if period is None or period.faculty_id != secretary.faculty_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Период не найден")
    if period.status != "open":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Период отменён")

    if PeriodRepository.count_taken(period.id, session) > 0:
        if data.dean_id or data.starts_at or data.slot_minutes:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "После первой записи можно только продлить окончание")
        if data.ends_at is None or data.ends_at <= period.ends_at:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Окончание можно только продлить")
        check_overlap(session, period.dean_id, period.starts_at, data.ends_at, period.id)
        period.ends_at = data.ends_at
        period.capacity = slots.total_slots(period.starts_at, period.ends_at, period.slot_minutes)
        return PeriodRepository.add_one(period, session)

    dean_id = data.dean_id or period.dean_id
    starts_at = data.starts_at or period.starts_at
    ends_at = data.ends_at or period.ends_at
    slot_minutes = data.slot_minutes or period.slot_minutes
    check_time(starts_at, ends_at, slot_minutes)
    check_dean(session, dean_id, period.faculty_id)
    check_overlap(session, dean_id, starts_at, ends_at, period.id)
    period.dean_id = dean_id
    period.starts_at = starts_at
    period.ends_at = ends_at
    period.slot_minutes = slot_minutes
    period.capacity = slots.total_slots(starts_at, ends_at, slot_minutes)
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
