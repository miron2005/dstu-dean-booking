from pydantic import AwareDatetime, BaseModel


class SPeriodBase(BaseModel):
    dean_id: int
    starts_at: AwareDatetime
    ends_at: AwareDatetime


class SPeriodAdd(SPeriodBase):
    slot_minutes: int = 15


class SPeriodPatch(BaseModel):
    dean_id: int | None = None
    starts_at: AwareDatetime | None = None
    ends_at: AwareDatetime | None = None
    slot_minutes: int | None = None


class SPeriod(SPeriodBase):
    id: int
    faculty_id: int
    dean_name: str
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
