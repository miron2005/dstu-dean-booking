from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import Appointment, Notification, User
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def get_notifications(user: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    return db.scalars(
        select(Notification)
        .join(Appointment, Appointment.id == Notification.appointment_id)
        .where(Appointment.student_id == user.id)
        .order_by(Notification.created_at.desc())
    ).all()


@router.post("/{notification_id}/read", response_model=NotificationOut)
def read_notification(
    notification_id: int,
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    notification = db.get(Notification, notification_id)
    if notification is None or db.get(Appointment, notification.appointment_id).student_id != user.id:
        raise HTTPException(404, "Уведомление не найдено")
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
    return notification
