from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.deps import SessionDep, get_current_user
from app.models import User
from app.repositories import FacultyRepository, UserRepository
from app.schemas.user import SRegister, SToken, SUser
from app.security import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=SUser, status_code=status.HTTP_201_CREATED)
def register(data: SRegister, session: SessionDep):
    faculty = FacultyRepository.get_one(data.faculty_id, session)
    if faculty is None or not faculty.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Факультет не найден")
    if UserRepository.get_by_email(data.email, session):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Почта уже занята")
    return UserRepository.add_one(
        {
            "full_name": data.full_name,
            "email": data.email,
            "password_hash": hash_password(data.password),
            "faculty_id": data.faculty_id,
            "role": "student",
        },
        session,
    )


@router.post("/login", response_model=SToken)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], session: SessionDep):
    user = UserRepository.get_by_email(form.username, session)
    if user is None or not user.is_active or not verify_password(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверная почта или пароль")
    return SToken(access_token=create_token(user.id))


@router.get("/me", response_model=SUser)
def me(user: Annotated[User, Depends(get_current_user)]):
    return user
