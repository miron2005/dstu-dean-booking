from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import AppealTopic, User
from app.schemas.topic import TopicCreate, TopicOut, TopicUpdate

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("", response_model=list[TopicOut])
def get_topics(faculty_id: int | None = None, db: Session = Depends(get_db)):
    query = select(AppealTopic).where(AppealTopic.is_active).order_by(AppealTopic.id)
    if faculty_id is not None:
        query = query.where(AppealTopic.faculty_id == faculty_id)
    return db.scalars(query).all()


@router.post("", response_model=TopicOut, status_code=201)
def create_topic(
    data: TopicCreate,
    user: User = Depends(require_role("secretary")),
    db: Session = Depends(get_db),
):
    topic = AppealTopic(faculty_id=user.faculty_id, title=data.title, description=data.description)
    db.add(topic)
    db.commit()
    return topic


@router.patch("/{topic_id}", response_model=TopicOut)
def update_topic(
    topic_id: int,
    data: TopicUpdate,
    user: User = Depends(require_role("secretary")),
    db: Session = Depends(get_db),
):
    topic = db.get(AppealTopic, topic_id)
    if topic is None or topic.faculty_id != user.faculty_id:
        raise HTTPException(404, "Тема не найдена")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    db.commit()
    return topic
