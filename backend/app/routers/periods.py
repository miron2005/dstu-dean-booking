from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.deps import SessionDep, require_role
from app.models import User
from app.repositories import PeriodRepository
from app.schemas.period import SPeriod, SPeriodAdd, SPeriodPatch
from app.services import periods as service

router = APIRouter(prefix="/periods", tags=["periods"])


@router.get("", response_model=list[SPeriod])
def get_periods(
    user: Annotated[User, Depends(require_role("student", "secretary", "dean"))],
    session: SessionDep,
    day: Annotated[date | None, Query(alias="date")] = None,
    only_available: bool = False,
):
    periods = PeriodRepository.get_all(user.faculty_id, session, day)
    result = [service.to_out(session, period) for period in periods]
    if only_available:
        now = datetime.now(timezone.utc)
        result = [p for p in result if p.status == "open" and p.free_places > 0 and p.starts_at > now]
    return result


@router.post("", response_model=SPeriod, status_code=status.HTTP_201_CREATED)
def create_period(
    data: SPeriodAdd,
    user: Annotated[User, Depends(require_role("secretary"))],
    session: SessionDep,
):
    return service.to_out(session, service.create_period(session, user, data))


@router.patch("/{period_id}", response_model=SPeriod)
def update_period(
    period_id: int,
    data: SPeriodPatch,
    user: Annotated[User, Depends(require_role("secretary"))],
    session: SessionDep,
):
    return service.to_out(session, service.update_period(session, user, period_id, data))


@router.post("/{period_id}/cancel", response_model=SPeriod)
def cancel_period(
    period_id: int,
    user: Annotated[User, Depends(require_role("secretary"))],
    session: SessionDep,
):
    return service.to_out(session, service.cancel_period(session, user, period_id))
