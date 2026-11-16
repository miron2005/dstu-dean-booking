from typing import Literal

from pydantic import AwareDatetime, BaseModel, Field


class SAppointmentBase(BaseModel):
    period_id: int
    topic_id: int | None = None
    question: str = Field(min_length=1)


class SAppointmentAdd(SAppointmentBase):
    slot_start: AwareDatetime


class SAppointmentResult(BaseModel):
    status: Literal["accepted", "no_show"]
    result_comment: str | None = None


class SAppointmentStatus(BaseModel):
    status: Literal["called", "accepted", "no_show", "cancelled"]
    result_comment: str | None = None


class SAppointment(SAppointmentBase):
    id: int
    queue_number: int
    slot_start: AwareDatetime | None
    status: str
    created_at: AwareDatetime

    model_config = {"from_attributes": True}


class SQueueItem(SAppointment):
    student_name: str
    result_comment: str | None
