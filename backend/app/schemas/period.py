from pydantic import AwareDatetime, BaseModel


class SPeriodBase(BaseModel):
    dean_id: int
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    capacity: int


class SPeriodAdd(SPeriodBase):
    pass


class SPeriodPatch(BaseModel):
    dean_id: int | None = None
    starts_at: AwareDatetime | None = None
    ends_at: AwareDatetime | None = None
    capacity: int | None = None


class SPeriod(SPeriodBase):
    id: int
    faculty_id: int
    dean_name: str
    free_places: int
    status: str
