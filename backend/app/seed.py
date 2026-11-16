
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import Model, engine, new_session
from app.models import AppealTopic, Faculty, ReceptionPeriod, User
from app.security import hash_password

PASSWORD = "test12345"

FACULTIES = {
    "Факультет информационных технологий": ["Академическая задолженность", "Перевод и восстановление", "Справки и документы"],
    "Экономический факультет": ["Стипендия", "Пересдача экзамена", "Практика"],
}


def get_or_create_user(db, email, full_name, role, faculty_id):
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            role=role,
            faculty_id=faculty_id,
            password_hash=hash_password(PASSWORD),
        )
        db.add(user)
        db.flush()
    return user


Model.metadata.create_all(engine)

with new_session() as db:
    for index, (name, topics) in enumerate(FACULTIES.items(), start=1):
        faculty = db.scalar(select(Faculty).where(Faculty.name == name))
        if faculty is None:
            faculty = Faculty(name=name)
            db.add(faculty)
            db.flush()

        for title in topics:
            exists = db.scalar(select(AppealTopic).where(AppealTopic.faculty_id == faculty.id, AppealTopic.title == title))
            if exists is None:
                db.add(AppealTopic(faculty_id=faculty.id, title=title))

        dean = get_or_create_user(db, f"dean{index}@test.ru", f"Декан {index}", "dean", faculty.id)
        get_or_create_user(db, f"secretary{index}@test.ru", f"Секретарь {index}", "secretary", faculty.id)
        get_or_create_user(db, f"student{index}@test.ru", f"Студент {index}", "student", faculty.id)

        if db.scalar(select(ReceptionPeriod).where(ReceptionPeriod.faculty_id == faculty.id)) is None:
            start = datetime.now(timezone.utc).replace(hour=10, minute=0, second=0, microsecond=0)
            for days in (1, 2, 3):
                db.add(
                    ReceptionPeriod(
                        faculty_id=faculty.id,
                        dean_id=dean.id,
                        starts_at=start + timedelta(days=days),
                        ends_at=start + timedelta(days=days, hours=3),
                        capacity=12,
                        slot_minutes=15,
                        room="101",
                    )
                )

    db.commit()

print(f"Готово. Логины: student1@test.ru, dean1@test.ru, secretary1@test.ru (и с цифрой 2). Пароль у всех: {PASSWORD}")
