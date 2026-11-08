from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import SessionDep, require_role
from app.repositories import FacultyRepository
from app.schemas.faculty import SFaculty, SFacultyAdd, SFacultyPatch

router = APIRouter(prefix="/faculties", tags=["faculties"])


@router.get("", response_model=list[SFaculty])
def get_faculties(session: SessionDep):
    return FacultyRepository.get_all(session)


@router.post(
    "",
    response_model=SFaculty,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
def create_faculty(data: SFacultyAdd, session: SessionDep):
    if FacultyRepository.name_exists(data.name, session):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Факультет уже существует")
    return FacultyRepository.add_one(data.name, session)


@router.patch("/{faculty_id}", response_model=SFaculty, dependencies=[Depends(require_role("admin"))])
def update_faculty(faculty_id: int, data: SFacultyPatch, session: SessionDep):
    faculty = FacultyRepository.get_one(faculty_id, session)
    if faculty is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Факультет не найден")
    return FacultyRepository.update_one(faculty, data.model_dump(exclude_unset=True), session)
