from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Faculty, User
from app.schemas.user import Register, Token, UserOut
from app.security import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: Register, db: Session = Depends(get_db)):
    faculty = db.get(Faculty, data.faculty_id)
    if faculty is None or not faculty.is_active:
        raise HTTPException(400, "Факультет не найден")
    if db.scalar(select(User.id).where(User.email == data.email)):
        raise HTTPException(400, "Почта уже занята")
    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password),
        faculty_id=data.faculty_id,
        role="student",
    )
    db.add(user)
    db.commit()
    return user


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form.username))
    if user is None or not user.is_active or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Неверная почта или пароль")
    return Token(access_token=create_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
