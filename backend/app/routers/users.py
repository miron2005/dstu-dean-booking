from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import Faculty, User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_role("admin"))])


def check_faculty(db, role, faculty_id):
    if role != "admin" and faculty_id is None:
        raise HTTPException(400, "Для этой роли нужен факультет")
    if faculty_id is not None and db.get(Faculty, faculty_id) is None:
        raise HTTPException(400, "Факультет не найден")


@router.get("", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    check_faculty(db, data.role, data.faculty_id)
    if db.scalar(select(User.id).where(User.email == data.email)):
        raise HTTPException(400, "Почта уже занята")
    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        faculty_id=data.faculty_id,
    )
    db.add(user)
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Пользователь не найден")
    changes = data.model_dump(exclude_unset=True)
    check_faculty(db, changes.get("role", user.role), changes.get("faculty_id", user.faculty_id))
    for field, value in changes.items():
        setattr(user, field, value)
    db.commit()
    return user
