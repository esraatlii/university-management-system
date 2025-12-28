from datetime import date
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
from backend.models import Role, CourseType, HallType
from datetime import time, datetime
from typing import Optional
from backend.models import ScheduleStatus, WeekPatterns
"""----------------users işlemleri---------------------------"""
class UserBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    role: Role
    department_id: Optional[int] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=4,max_length=128)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[Role] = None
    department_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: Role
    department_id: Optional[int] = None


    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class Message(BaseModel):
    message: str



"""-----------------login işlemleri----------------------"""
class LoginUser(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=4,max_length=128)



"""-----------------faculties işlemleri-------------------"""
class FacultyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

class FacultyCreate(FacultyBase):
    pass

class FacultyUpdate(FacultyBase):
    pass


class FacultyOut(FacultyBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


"""---------------------departments işlemleri-----------------------------"""
class DepartmentBase(BaseModel):
    code : str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    faculty_id: int = Field(..., ge=1)

class DepartmentUpdate(DepartmentBase):
    pass


class DepartmentOut(BaseModel):
    id: int
    code: str
    name: str
    faculty_id: int
    faculty_name: str | None = None

    model_config = ConfigDict(from_attributes=True)

"""----------------------terms işlelmeri---------------------------"""
class TermBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    start_date: date
    end_date: date
    is_active: bool

class TermCreate(TermBase):
    pass

class TermOut(TermBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class TermUpdate(TermBase):
    pass

"""----------------courses işlemleri----------------------"""

class CoursesBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    department_id: int
    term_id: Optional[int] = None
    class_level: int
    weekly_hours: int
    course_type: CourseType
    parent_course_id: Optional[int] = None
    is_mandatory: bool = False
    is_retake_critical: bool = False

class CoursesCreate(CoursesBase):
    pass

class CoursesUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    department_id: Optional[int] = None
    #term_id: Optional[int] = None
    class_level: Optional[int] = None
    weekly_hours: Optional[int] = None
    course_type: Optional[CourseType] = None
    parent_course_id: Optional[int] = None
    is_mandatory: Optional[bool] = None
    is_retake_critical: Optional[bool] = None

class CoursesOut(CoursesBase):
    id: int

    department_name: str
    faculty_id: int
    faculty_name: str

    #term_name: str | None = None

    parent_course_code: str | None = None
    parent_course_name: str | None = None

    model_config = ConfigDict(from_attributes=True)

"""----------------------------Halls işlemleri--------------------"""

class HallBase(BaseModel):
    hall_name: str = Field(..., min_length=1, max_length=50)
    capacity: int = Field(..., gt=0)
    hall_type: HallType

    department_id: int | None = None
    is_shared : bool = False
    two_invigilators_required: bool = False

    seating_arrangement: str | None = None

    @model_validator(mode='after')
    def validate_shared_rule(self):
        if self.is_shared and self.department_id is not None:
            raise ValueError('is_shared=True iken department_id null olmalı')
        if(not self.is_shared) and self.department_id is None:
            raise ValueError("is_shared=False iken department_id dolu olmalı")
        return self

class HallCreate(HallBase):
    pass


class HallsUpdate(BaseModel):
    """
    ✅ Update'te KURAL: tüm alanlar opsiyonel olmalı.
    Çünkü kullanıcı sadece değiştirmek istediğini gönderecek.
    """

    hall_name: str | None = Field(None, min_length=1, max_length=50)
    capacity: int | None = Field(None, gt=0)
    hall_type: HallType | None = None

    department_id: int | None = None
    is_shared: bool | None = None
    two_invigilators_required: bool | None = None
    seating_arrangement: str | None = None

    @model_validator(mode="after")
    def validate_shared_rule_partial(self):
        # kullanıcı ikisini de göndermediyse kontrol etmiyoruz (partial update)
        if self.is_shared is None and self.department_id is None:
            return self

        # sadece is_shared geldiyse: department_id'yi zorlamayız (çünkü eski değer DB'de olabilir)
        if self.is_shared is not None and self.department_id is None:
            return self

        # sadece department_id geldiyse: is_shared'i zorlamayız
        if self.department_id is not None and self.is_shared is None:
            return self

        # ikisi de geldiyse tutarlılık kontrolü yap
        if self.is_shared is True and self.department_id is not None:
            raise ValueError("is_shared=True iken department_id null olmalı.")
        if self.is_shared is False and self.department_id is None:
            raise ValueError("is_shared=False iken department_id dolu olmalı.")

        return self

class HallOut(HallBase):
    id: int
    department_id: int| None = None
    department_name: str| None = None
    model_config = ConfigDict(from_attributes=True)

"""-----------------------Instructor İşlemleri---------------------"""

class InstructorBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    home_department_id: int = Field(..., ge=1)

class InstructorCreate(InstructorBase):
    pass

class InstructorUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=50)
    title: str | None = Field(None, min_length=1, max_length=50)
    email: EmailStr | None = None
    home_department_id: int | None = Field(None, ge=1)

class InstructorOut(InstructorBase):
    id: int
    department_name: str | None = None   
    model_config = ConfigDict(from_attributes=True)

"""------------------------Course Offerings işlemleri-----------------------"""

class CourseOfferingsBase(BaseModel):
    term_id: int = Field(..., ge=1)
    course_id: int = Field(..., ge=1)
    instructor_id: int = Field(..., ge=1)
    program_class_id: int = Field(..., ge=1)
    student_count: int = Field(..., ge=1)

class CourseOfferingsCreate(CourseOfferingsBase):
    pass

class CourseOfferingsUpdate(BaseModel):
    term_id: int | None = Field(None, ge=1)
    course_id: int | None = Field(None, ge=1)
    instructor_id: int | None = Field(None, ge=1)
    program_class_id: int | None = Field(None, ge=1)
    student_count: int | None = Field(None, ge=1)

class CourseOfferingsOut(CourseOfferingsBase):
    id: int
    term_name: str | None = None
    course_name: str | None = None
    instructor_name: str | None = None
    model_config = ConfigDict(from_attributes=True)




"""-------------------- Program Classes --------------------"""

class ProgramClassBase(BaseModel):
    department_id: int = Field(..., ge=1)
    term_id: int = Field(..., ge=1)
    class_level: int = Field(..., ge=1, le=4)
    group_no: int = Field(1, ge=1)
    label: str = Field(..., min_length=1, max_length=50)

class ProgramClassCreate(ProgramClassBase):
    pass

class ProgramClassUpdate(BaseModel):
    department_id: int | None = Field(None, ge=1)
    term_id: int | None = Field(None, ge=1)
    class_level: int | None = Field(None, ge=1, le=4)
    group_no: int | None = Field(None, ge=1)
    label: str | None = Field(None, min_length=1, max_length=50)

class ProgramClassOut(ProgramClassBase):
    id: int
    department_name: str | None = None
    term_name: str | None = None
    group_letter: str
    model_config = ConfigDict(from_attributes=True)


"""-------------------- Time Slots --------------------"""

class TimeSlotBase(BaseModel):
    day_of_week: int = Field(..., ge=1, le=7)
    start_time: time
    end_time: time

class TimeSlotCreate(TimeSlotBase):
    pass

class TimeSlotUpdate(BaseModel):
    day_of_week: int | None = Field(None, ge=1, le=7)
    start_time: time | None = None
    end_time: time | None = None

class TimeSlotOut(BaseModel):
    id: int
    day_of_week: int = Field(..., ge=1, le=7)
    day_name: str
    start_time: time
    end_time: time
    model_config = ConfigDict(from_attributes=True)


"""-------------------- Instructor Unavailability --------------------"""

class InstructorUnavailabilityBase(BaseModel):
    term_id: int = Field(..., ge=1)
    instructor_id: int = Field(..., ge=1)
    time_slot_id: int = Field(..., ge=1)
    reason: str | None = Field(None, max_length=255)

class InstructorUnavailabilityCreate(InstructorUnavailabilityBase):
    pass

class InstructorUnavailabilityUpdate(BaseModel):
    term_id: int | None = Field(None, ge=1)
    instructor_id: int | None = Field(None, ge=1)
    time_slot_id: int | None = Field(None, ge=1)
    reason: str | None = Field(None, max_length=255)

class InstructorUnavailabilityOut(InstructorUnavailabilityBase):
    id: int
    term_name: str | None = None
    instructor_name: str | None = None
    day_of_week: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    created_by: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


"""-------------------- Schedules --------------------"""

class ScheduleBase(BaseModel):
    term_id: int = Field(..., ge=1)
    department_id: int = Field(..., ge=1)
    status: ScheduleStatus = ScheduleStatus.draft

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    term_id: int | None = Field(None, ge=1)
    department_id: int | None = Field(None, ge=1)
    status: ScheduleStatus | None = None

class ScheduleOut(ScheduleBase):
    id: int
    term_name: str | None = None
    department_name: str | None = None
    submitted_at: datetime | None = None
    submitted_by: int | None = None
    approved_at: datetime | None = None
    approved_by: int | None = None
    locked_at: datetime | None = None
    locked_by: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


"""-------------------- Schedule Entries --------------------"""

class ScheduleEntryBase(BaseModel):
    schedule_id: int = Field(..., ge=1)
    course_offering_id: int = Field(..., ge=1)
    hall_id: int = Field(..., ge=1)
    time_slot_id: int = Field(..., ge=1)
    duration_slots: int | None = Field(None, ge=1)
    week_pattern: WeekPatterns | None = None

class ScheduleEntryCreate(ScheduleEntryBase):
    pass

class ScheduleEntryUpdate(BaseModel):
    schedule_id: int | None = Field(None, ge=1)
    course_offering_id: int | None = Field(None, ge=1)
    hall_id: int | None = Field(None, ge=1)
    time_slot_id: int | None = Field(None, ge=1)
    duration_slots: int | None = Field(None, ge=1)
    week_pattern: WeekPatterns | None = None

class ScheduleEntryOut(ScheduleEntryBase):
    id: int
    course_name: str | None = None
    instructor_name: str | None = None
    term_id: int | None = None
    department_id: int | None = None
    day_of_week: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    hall_name: str | None = None
    model_config = ConfigDict(from_attributes=True)
