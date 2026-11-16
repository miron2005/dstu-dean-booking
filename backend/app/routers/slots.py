from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends

from app.deps import SessionDep, require_role
from app.models import User
from app.schemas.period import SWeekSlot
from app.services import slots as service

router = APIRouter(prefix="/slots", tags=["slots"])


@router.get("", response_model=list[SWeekSlot])
def get_slots(
    date_from: date,
    date_to: date,
    user: Annotated[User, Depends(require_role("student", "secretary", "dean"))],
    session: SessionDep,
):
    return service.week_slots(session, user, date_from, date_to)
