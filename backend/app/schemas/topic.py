from pydantic import BaseModel


class TopicCreate(BaseModel):
    title: str
    description: str | None = None


class TopicUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None


class TopicOut(BaseModel):
    id: int
    faculty_id: int
    title: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}
