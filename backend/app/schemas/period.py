from pydantic import AwareDatetime, BaseModel, Field


class SPeriodBase(BaseModel):
    starts_at: AwareDatetime
    ends_at: AwareDatetime


class SPeriodAdd(SPeriodBase):
    dean_id: int | None = None
    slot_minutes: int = 15
    room: str = Field(min_length=1, max_length=100)


class SPeriodPatch(BaseModel):
    dean_id: int | None = None
    starts_at: AwareDatetime | None = None
    ends_at: AwareDatetime | None = None
    slot_minutes: int | None = None
    room: str | None = Field(default=None, min_length=1, max_length=100)


class SPeriod(SPeriodBase):
    id: int
    faculty_id: int
    dean_id: int
    dean_name: str
    room: str | None
    capacity: int
    slot_minutes: int
    free_places: int
    status: str


class SSlot(BaseModel):
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    is_free: bool
    is_past: bool


class SWeekSlot(SSlot):
    period_id: int
    dean_name: str
    room: str | None
