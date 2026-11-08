from pydantic import BaseModel


class SFacultyBase(BaseModel):
    name: str


class SFacultyAdd(SFacultyBase):
    pass


class SFacultyPatch(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class SFaculty(SFacultyBase):
    id: int
    is_active: bool

    model_config = {"from_attributes": True}
