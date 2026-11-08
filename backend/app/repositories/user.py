from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


class UserRepository:
    @classmethod
    def get_all(cls, session: Session):
        return session.scalars(select(User).order_by(User.id)).all()

    @classmethod
    def get_one(cls, user_id: int, session: Session):
        return session.get(User, user_id)

    @classmethod
    def get_by_email(cls, email: str, session: Session):
        return session.scalar(select(User).where(User.email == email))

    @classmethod
    def add_one(cls, fields: dict, session: Session):
        user = User(**fields)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    @classmethod
    def update_one(cls, user: User, changes: dict, session: Session):
        for field, value in changes.items():
            setattr(user, field, value)
        session.commit()
        session.refresh(user)
        return user
