from pydantic import BaseModel


class FacultyCreate(BaseModel):
    name: str


class FacultyUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class FacultyOut(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = {"from_attributes": True}
