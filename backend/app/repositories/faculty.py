from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Faculty


class FacultyRepository:
    @classmethod
    def get_all(cls, session: Session):
        query = select(Faculty).where(Faculty.is_active).order_by(Faculty.name)
        return session.scalars(query).all()

    @classmethod
    def get_one(cls, faculty_id: int, session: Session):
        return session.get(Faculty, faculty_id)

    @classmethod
    def name_exists(cls, name: str, session: Session):
        return session.scalar(select(Faculty.id).where(Faculty.name == name)) is not None

    @classmethod
    def add_one(cls, name: str, session: Session):
        faculty = Faculty(name=name)
        session.add(faculty)
        session.commit()
        session.refresh(faculty)
        return faculty

    @classmethod
    def update_one(cls, faculty: Faculty, changes: dict, session: Session):
        for field, value in changes.items():
            setattr(faculty, field, value)
        session.commit()
        session.refresh(faculty)
        return faculty
