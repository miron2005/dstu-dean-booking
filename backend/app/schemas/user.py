from typing import Literal

from pydantic import BaseModel, EmailStr

Role = Literal["student", "secretary", "dean", "admin"]


class SUserBase(BaseModel):
    full_name: str


class SRegister(SUserBase):
    email: EmailStr
    password: str
    faculty_id: int


class SUserAdd(SUserBase):
    email: EmailStr
    password: str
    role: Role
    faculty_id: int | None = None


class SUserPatch(BaseModel):
    full_name: str | None = None
    role: Role | None = None
    faculty_id: int | None = None
    is_active: bool | None = None


class SUser(SUserBase):
    id: int
    email: str
    role: str
    faculty_id: int | None
    is_active: bool

    model_config = {"from_attributes": True}


class SToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
