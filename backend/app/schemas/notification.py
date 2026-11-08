from pydantic import AwareDatetime, BaseModel


class SNotification(BaseModel):
    id: int
    appointment_id: int
    kind: str
    message: str
    created_at: AwareDatetime
    read_at: AwareDatetime | None

    model_config = {"from_attributes": True}
