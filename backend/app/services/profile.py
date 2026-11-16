from app.repositories import FacultyRepository, UserRepository
from app.schemas.user import SMe, SUser


def to_me(session, user):
    faculty = FacultyRepository.get_one(user.faculty_id, session) if user.faculty_id else None
    deans = UserRepository.get_deans(user.faculty_id, session) if user.faculty_id else []
    return SMe(
        **SUser.model_validate(user).model_dump(),
        faculty_name=faculty.name if faculty else None,
        dean_name=", ".join(dean.full_name for dean in deans) or None,
    )
