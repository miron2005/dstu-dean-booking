from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import Faculty
from app.schemas.faculty import FacultyCreate, FacultyOut, FacultyUpdate

router = APIRouter(prefix="/faculties", tags=["faculties"])


@router.get("", response_model=list[FacultyOut])
def get_faculties(db: Session = Depends(get_db)):
    return db.scalars(select(Faculty).where(Faculty.is_active).order_by(Faculty.name)).all()


@router.post("", response_model=FacultyOut, status_code=201, dependencies=[Depends(require_role("admin"))])
def create_faculty(data: FacultyCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Faculty.id).where(Faculty.name == data.name)):
        raise HTTPException(400, "Факультет уже существует")
    faculty = Faculty(name=data.name)
    db.add(faculty)
    db.commit()
    return faculty


@router.patch("/{faculty_id}", response_model=FacultyOut, dependencies=[Depends(require_role("admin"))])
def update_faculty(faculty_id: int, data: FacultyUpdate, db: Session = Depends(get_db)):
    faculty = db.get(Faculty, faculty_id)
    if faculty is None:
        raise HTTPException(404, "Факультет не найден")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(faculty, field, value)
    db.commit()
    return faculty
