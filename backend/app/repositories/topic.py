from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AppealTopic
from app.schemas.topic import STopicAdd


class TopicRepository:
    @classmethod
    def get_all(cls, faculty_id: int | None, session: Session):
        query = select(AppealTopic).where(AppealTopic.is_active).order_by(AppealTopic.id)
        if faculty_id is not None:
            query = query.where(AppealTopic.faculty_id == faculty_id)
        return session.scalars(query).all()

    @classmethod
    def get_one(cls, topic_id: int, session: Session):
        return session.get(AppealTopic, topic_id)

    @classmethod
    def add_one(cls, faculty_id: int, data: STopicAdd, session: Session):
        topic = AppealTopic(faculty_id=faculty_id, **data.model_dump())
        session.add(topic)
        session.commit()
        session.refresh(topic)
        return topic

    @classmethod
    def update_one(cls, topic: AppealTopic, changes: dict, session: Session):
        for field, value in changes.items():
            setattr(topic, field, value)
        session.commit()
        session.refresh(topic)
        return topic
