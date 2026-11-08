from typing import Literal

from pydantic import AwareDatetime, BaseModel


class SAppointmentBase(BaseModel):
    period_id: int
    topic_id: int
    question: str


class SAppointmentAdd(SAppointmentBase):
    pass


class SAppointmentResult(BaseModel):
    status: Literal["accepted", "no_show"]
    result_comment: str | None = None


class SAppointmentStatus(BaseModel):
    status: Literal["called", "accepted", "no_show", "cancelled"]
    result_comment: str | None = None


class SAppointment(SAppointmentBase):
    id: int
    queue_number: int
    status: str
    created_at: AwareDatetime

    model_config = {"from_attributes": True}


class SQueueItem(SAppointment):
    student_name: str
    result_comment: str | None
