from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import Appointment, User
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentResult, QueueItem
from app.services import appointments as service

router = APIRouter(tags=["appointments"])


def to_queue_item(appointment):
    return QueueItem(
        **AppointmentOut.model_validate(appointment).model_dump(),
        student_name=appointment.student.full_name,
        result_comment=appointment.result_comment,
    )


@router.post("/appointments", response_model=AppointmentOut, status_code=201)
def create_appointment(
    data: AppointmentCreate,
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    return service.create_appointment(db, user, data)


@router.get("/appointments/my", response_model=list[AppointmentOut])
def my_appointments(user: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    return db.scalars(
        select(Appointment)
        .where(Appointment.student_id == user.id)
        .order_by(Appointment.created_at.desc())
    ).all()


@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(
    appointment_id: int,
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    return service.cancel_appointment(db, user, appointment_id)


@router.get("/periods/{period_id}/queue", response_model=list[QueueItem])
def get_queue(
    period_id: int,
    user: User = Depends(require_role("dean")),
    db: Session = Depends(get_db),
):
    return [to_queue_item(a) for a in service.get_queue(db, user, period_id)]


@router.post("/periods/{period_id}/call-next", response_model=QueueItem)
def call_next(
    period_id: int,
    user: User = Depends(require_role("dean")),
    db: Session = Depends(get_db),
):
    return to_queue_item(service.call_next(db, user, period_id))


@router.patch("/appointments/{appointment_id}/result", response_model=QueueItem)
def set_result(
    appointment_id: int,
    data: AppointmentResult,
    user: User = Depends(require_role("dean")),
    db: Session = Depends(get_db),
):
    return to_queue_item(service.set_result(db, user, appointment_id, data))
