from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import ReceptionPeriod, User
from app.schemas.period import PeriodCreate, PeriodOut, PeriodUpdate
from app.services import periods as service

router = APIRouter(prefix="/periods", tags=["periods"])


@router.get("", response_model=list[PeriodOut])
def get_periods(
    user: User = Depends(require_role("student", "secretary", "dean")),
    db: Session = Depends(get_db),
):
    periods = db.scalars(
        select(ReceptionPeriod)
        .where(ReceptionPeriod.faculty_id == user.faculty_id)
        .order_by(ReceptionPeriod.starts_at)
    ).all()
    return [service.to_out(db, period) for period in periods]


@router.post("", response_model=PeriodOut, status_code=201)
def create_period(
    data: PeriodCreate,
    user: User = Depends(require_role("secretary")),
    db: Session = Depends(get_db),
):
    return service.to_out(db, service.create_period(db, user, data))


@router.patch("/{period_id}", response_model=PeriodOut)
def update_period(
    period_id: int,
    data: PeriodUpdate,
    user: User = Depends(require_role("secretary")),
    db: Session = Depends(get_db),
):
    return service.to_out(db, service.update_period(db, user, period_id, data))


@router.post("/{period_id}/cancel", response_model=PeriodOut)
def cancel_period(
    period_id: int,
    user: User = Depends(require_role("secretary")),
    db: Session = Depends(get_db),
):
    return service.to_out(db, service.cancel_period(db, user, period_id))
