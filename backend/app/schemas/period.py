from pydantic import AwareDatetime, BaseModel


class PeriodCreate(BaseModel):
    dean_id: int
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    capacity: int


class PeriodUpdate(BaseModel):
    dean_id: int | None = None
    starts_at: AwareDatetime | None = None
    ends_at: AwareDatetime | None = None
    capacity: int | None = None


class PeriodOut(BaseModel):
    id: int
    faculty_id: int
    dean_id: int
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    capacity: int
    free_places: int
    status: str
