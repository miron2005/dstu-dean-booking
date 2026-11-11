from typing import Annotated

from fastapi import APIRouter, Depends

from app.deps import SessionDep, require_role
from app.models import User
from app.repositories import UserRepository
from app.schemas.user import SDean

router = APIRouter(prefix="/deans", tags=["deans"])


@router.get("", response_model=list[SDean])
def get_deans(
    user: Annotated[User, Depends(require_role("secretary", "admin"))],
    session: SessionDep,
    faculty_id: int | None = None,
):
    if user.role == "secretary":
        faculty_id = user.faculty_id
    return UserRepository.get_deans(faculty_id, session)
