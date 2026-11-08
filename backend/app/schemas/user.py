from typing import Literal

from pydantic import BaseModel, EmailStr

Role = Literal["student", "secretary", "dean", "admin"]


class Register(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    faculty_id: int


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Role
    faculty_id: int | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: Role | None = None
    faculty_id: int | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    faculty_id: int | None
    is_active: bool

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
