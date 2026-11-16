from datetime import datetime, timedelta, timezone

from app.config import BOOKING_LEAD_MINUTES


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
