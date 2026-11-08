from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import SessionDep, require_role
from app.repositories import FacultyRepository, UserRepository
from app.schemas.user import SUser, SUserAdd, SUserPatch
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_role("admin"))])


def check_faculty(session, role, faculty_id):
    if role != "admin" and faculty_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Для этой роли нужен факультет")
    if faculty_id is not None and FacultyRepository.get_one(faculty_id, session) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Факультет не найден")


@router.get("", response_model=list[SUser])
def get_users(session: SessionDep):
    return UserRepository.get_all(session)


@router.post("", response_model=SUser, status_code=status.HTTP_201_CREATED)
def create_user(data: SUserAdd, session: SessionDep):
    check_faculty(session, data.role, data.faculty_id)
    if UserRepository.get_by_email(data.email, session):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Почта уже занята")
    return UserRepository.add_one(
        {
            "full_name": data.full_name,
            "email": data.email,
            "password_hash": hash_password(data.password),
            "role": data.role,
            "faculty_id": data.faculty_id,
        },
        session,
    )


@router.patch("/{user_id}", response_model=SUser)
def update_user(user_id: int, data: SUserPatch, session: SessionDep):
    user = UserRepository.get_one(user_id, session)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
    changes = data.model_dump(exclude_unset=True)
    check_faculty(session, changes.get("role", user.role), changes.get("faculty_id", user.faculty_id))
    return UserRepository.update_one(user, changes, session)
