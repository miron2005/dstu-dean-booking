from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = decode_token(token)
    if user_id is None:
        raise HTTPException(401, "Неверный токен")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(401, "Пользователь не найден")
    return user


def require_role(*roles):
    def check(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(403, "Недостаточно прав")
        return user

    return check
