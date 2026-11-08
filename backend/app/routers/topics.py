from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import SessionDep, require_role
from app.models import User
from app.repositories import TopicRepository
from app.schemas.topic import STopic, STopicAdd, STopicPatch

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("", response_model=list[STopic])
def get_topics(session: SessionDep, faculty_id: int | None = None):
    return TopicRepository.get_all(faculty_id, session)


@router.post("", response_model=STopic, status_code=status.HTTP_201_CREATED)
def create_topic(
    data: STopicAdd,
    user: Annotated[User, Depends(require_role("secretary"))],
    session: SessionDep,
):
    return TopicRepository.add_one(user.faculty_id, data, session)


@router.patch("/{topic_id}", response_model=STopic)
def update_topic(
    topic_id: int,
    data: STopicPatch,
    user: Annotated[User, Depends(require_role("secretary"))],
    session: SessionDep,
):
    topic = TopicRepository.get_one(topic_id, session)
    if topic is None or topic.faculty_id != user.faculty_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Тема не найдена")
    return TopicRepository.update_one(topic, data.model_dump(exclude_unset=True), session)
