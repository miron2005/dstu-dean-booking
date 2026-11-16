from datetime import datetime, time, timedelta, timezone

from fastapi import HTTPException, status

from app.config import BOOKING_LEAD_MINUTES
from app.repositories import AppointmentRepository, PeriodRepository


def total_slots(starts_at, ends_at, slot_minutes):
    return int((ends_at - starts_at).total_seconds() // (slot_minutes * 60))


def slot_grid(period):
    step = timedelta(minutes=period.slot_minutes)
    return [period.starts_at + step * i for i in range(total_slots(period.starts_at, period.ends_at, period.slot_minutes))]


def booking_deadline(now=None):
    return (now or datetime.now(timezone.utc)) + timedelta(minutes=BOOKING_LEAD_MINUTES)


def slot_states(period, taken_starts, now=None):
    deadline = booking_deadline(now)
    step = timedelta(minutes=period.slot_minutes)
    result = []
    for start in slot_grid(period):
        is_past = start < deadline
        result.append(
            {
                "starts_at": start,
                "ends_at": start + step,
                "is_free": period.status == "open" and not is_past and start not in taken_starts,
                "is_past": is_past,
            }
        )
    return result


def period_slots(session, user, period_id):
    period = PeriodRepository.get_one(period_id, session)
    if period is None or (user.role != "admin" and period.faculty_id != user.faculty_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Период не найден")
    return slot_states(period, AppointmentRepository.get_taken_starts(period.id, session))


def week_slots(session, user, date_from, date_to):
    if date_to < date_from:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Конец диапазона раньше начала")
    if (date_to - date_from).days > 31:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Диапазон не больше 31 дня")
    start = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
    end = datetime.combine(date_to, time.min, tzinfo=timezone.utc) + timedelta(days=1)
    result = []
    for period in PeriodRepository.get_open_in_range(user.faculty_id, start, end, session):
        for item in slot_states(period, AppointmentRepository.get_taken_starts(period.id, session)):
            if start <= item["starts_at"] < end:
                result.append({**item, "period_id": period.id, "dean_name": period.dean.full_name, "room": period.room})
    result.sort(key=lambda item: item["starts_at"])
    return result
