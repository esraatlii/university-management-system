from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr,Field, ConfigDict
from backend.models import Role,CourseType

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
    term_id: Optional[int] = None
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

    term_name: str | None = None

    parent_course_code: str | None = None
    parent_course_name: str | None = None

    model_config = ConfigDict(from_attributes=True)

