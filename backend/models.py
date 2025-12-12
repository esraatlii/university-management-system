from sqlalchemy import Column, Integer, String, Boolean, Enum as SQLAEnum, ForeignKey, Date
from enum import Enum
from backend.database import Base


class Role(str,Enum):
    admin = "admin"
    dean =  "dean"
    department_rep = "department_rep"

class CourseType(str,Enum):
    theory = "theory"
    lab = "lab"
    practice = "practice"

class Faculties(Base):
    __tablename__ = "faculties"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), index=True, nullable=False, unique=True)


class Departments(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"),nullable=False)
    code = Column(String(50), index=True, nullable=False, unique=True)
    name = Column(String(50), index=True, nullable=False, unique=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    full_name = Column(String(50), index=True, nullable=False)
    email = Column(String(50), index=True, nullable=False, unique=True)
    password_hash = Column(String(200),nullable=False)
    role = Column(SQLAEnum(Role), index=True, nullable=False)
    department_id = Column(Integer,ForeignKey("departments.id"),index=True, nullable=True)

class Instructors(Base):
    __tablename__ = "instructors"
    id = Column(Integer, primary_key=True)
    full_name = Column(String(50), index=True, nullable=False)
    title = Column(String(50), index=True, nullable=False)
    email = Column(String(50), index=True, nullable=False, unique=True)
    home_department_id = Column(Integer,ForeignKey("departments.id"),index=True, nullable=True)

class Courses(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), index=True, nullable=False, unique=True)
    name = Column(String(100), index=True, nullable=False)
    department_id = Column(Integer,ForeignKey("departments.id"),index=True, nullable=False)
    term_id = Column(Integer,ForeignKey("terms.id"), index=True, nullable=True)
    class_level = Column(Integer, index=True, nullable=False)
    weekly_hours = Column(Integer, index=True, nullable=False)
    course_type = Column(SQLAEnum(CourseType), index=True, nullable=False)
    parent_course_id = Column(Integer,ForeignKey("courses.id"),index=True, nullable=True)
    is_mandatory = Column(Boolean, default=False, nullable=False)
    is_retake_critical = Column(Boolean, default=False, nullable=False)


class Terms(Base):
    __tablename__ = "terms"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), index=True, nullable=False, unique=True)
    start_date = Column(Date,nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)

