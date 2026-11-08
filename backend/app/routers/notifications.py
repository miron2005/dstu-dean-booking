from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import SessionDep, require_role
from app.models import User
from app.repositories import AppointmentRepository, NotificationRepository
from app.schemas.notification import SNotification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[SNotification])
def get_notifications(user: Annotated[User, Depends(require_role("student"))], session: SessionDep):
    return NotificationRepository.get_by_student(user.id, session)


@router.post("/{notification_id}/read", response_model=SNotification)
def read_notification(
    notification_id: int,
    user: Annotated[User, Depends(require_role("student"))],
    session: SessionDep,
):
    notification = NotificationRepository.get_one(notification_id, session)
    if notification is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Уведомление не найдено")
    appointment = AppointmentRepository.get_one(notification.appointment_id, session)
    if appointment.student_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Уведомление не найдено")
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        NotificationRepository.save(notification, session)
    return notification
