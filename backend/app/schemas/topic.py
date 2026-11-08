from pydantic import BaseModel


class STopicBase(BaseModel):
    title: str
    description: str | None = None


class STopicAdd(STopicBase):
    pass


class STopicPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None


class STopic(STopicBase):
    id: int
    faculty_id: int
    is_active: bool

    model_config = {"from_attributes": True}
