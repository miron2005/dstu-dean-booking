from typing import Literal

from pydantic import AwareDatetime, BaseModel


class AppointmentCreate(BaseModel):
    period_id: int
    topic_id: int
    question: str


class AppointmentResult(BaseModel):
    status: Literal["accepted", "no_show"]
    result_comment: str | None = None


class AppointmentOut(BaseModel):
    id: int
    period_id: int
    topic_id: int
    question: str
    queue_number: int
    status: str
    created_at: AwareDatetime

    model_config = {"from_attributes": True}


class QueueItem(AppointmentOut):
    student_name: str
    result_comment: str | None
