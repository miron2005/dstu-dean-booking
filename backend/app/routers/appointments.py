from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.deps import SessionDep, require_role
from app.models import User
from app.repositories import AppointmentRepository
from app.schemas.appointment import SAppointment, SAppointmentAdd, SAppointmentResult, SQueueItem
from app.services import appointments as service

router = APIRouter(tags=["appointments"])


def to_queue_item(appointment):
    return SQueueItem(
        **SAppointment.model_validate(appointment).model_dump(),
        student_name=appointment.student.full_name,
        result_comment=appointment.result_comment,
    )


@router.post("/appointments", response_model=SAppointment, status_code=status.HTTP_201_CREATED)
def create_appointment(
    data: SAppointmentAdd,
    user: Annotated[User, Depends(require_role("student"))],
    session: SessionDep,
):
    return service.create_appointment(session, user, data)


@router.get("/appointments/my", response_model=list[SAppointment])
def my_appointments(user: Annotated[User, Depends(require_role("student"))], session: SessionDep):
    return AppointmentRepository.get_by_student(user.id, session)


@router.post("/appointments/{appointment_id}/cancel", response_model=SAppointment)
def cancel_appointment(
    appointment_id: int,
    user: Annotated[User, Depends(require_role("student"))],
    session: SessionDep,
):
    return service.cancel_appointment(session, user, appointment_id)


@router.get("/periods/{period_id}/queue", response_model=list[SQueueItem])
def get_queue(
    period_id: int,
    user: Annotated[User, Depends(require_role("dean"))],
    session: SessionDep,
):
    return [to_queue_item(a) for a in service.get_queue(session, user, period_id)]


@router.post("/periods/{period_id}/call-next", response_model=SQueueItem)
def call_next(
    period_id: int,
    user: Annotated[User, Depends(require_role("dean"))],
    session: SessionDep,
):
    return to_queue_item(service.call_next(session, user, period_id))


@router.patch("/appointments/{appointment_id}/result", response_model=SQueueItem)
def set_result(
    appointment_id: int,
    data: SAppointmentResult,
    user: Annotated[User, Depends(require_role("dean"))],
    session: SessionDep,
):
    return to_queue_item(service.set_result(session, user, appointment_id, data))
