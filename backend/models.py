from sqlalchemy import (
    Column, Integer, String, Boolean,
    Enum as SQLAEnum, ForeignKey, Date, DateTime,
    CheckConstraint,UniqueConstraint,Time)
from enum import Enum
from backend.database import Base
from sqlalchemy.sql import func


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
    home_department_id = Column(Integer,ForeignKey("departments.id"),index=True, nullable=False)

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

class ProgramClasses(Base):
    __tablename__ = "program_classes"

    id = Column(Integer, primary_key=True, index=True)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    term_id = Column(Integer, ForeignKey("terms.id"), nullable=False, index=True)
    class_level = Column(Integer, nullable=False, index=True)
    group_no = Column(Integer, nullable=False, index=True, default=1)
    label = Column(String(50), nullable=False, index=True)

    __table_args__ = (
        # Aynı dept+term+class_level+group_no bir kere olsun
        UniqueConstraint(
            "department_id", "term_id", "class_level", "group_no",
            name="uq_program_classes_dept_term_level_group"
        ),

        # class_level sadece 1-4
        CheckConstraint(
            "class_level BETWEEN 1 AND 4",
            name="ck_program_classes_class_level_range"
        ),

        # group_no 1'den küçük olmasın
        CheckConstraint(
            "group_no >= 1",
            name="ck_program_classes_group_no_positive"
        ),
    )

class CourseOfferings(Base):
    __tablename__ = "course_offerings"
    id = Column(Integer, primary_key=True)
    term_id = Column(Integer, ForeignKey("terms.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False, index=True)
    program_class_id = Column(Integer, ForeignKey("program_classes.id"), nullable=False, index=True)
    student_count = Column(Integer, nullable=False, index=True)

class Terms(Base):
    __tablename__ = "terms"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), index=True, nullable=False, unique=True)
    start_date = Column(Date,nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)

class TimeSlots(Base):
    __tablename__ = "time_slots"
    id = Column(Integer, primary_key=True)
    day_of_week = Column(Integer, nullable=False, index=True)
    start_time = Column(Time,nullable=False,index=True)
    end_time = Column(Time,nullable=False,index=True)

    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 1 AND 7" , name="ck_time_slots_day_of_week_range"),
        CheckConstraint("end_time > start_time",name="ck_time_slots_time_range"),
        UniqueConstraint("day_of_week","start_time","end_time",name="uq_time_slots_day_start_end"),
    )

class InstructorUnavailability(Base):
    __tablename__ = "instructor_unavailability"
    id = Column(Integer, primary_key=True)
    term_id = Column(Integer, ForeignKey("terms.id"), nullable=False, index=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False, index=True)
    time_slot_id = Column(Integer, ForeignKey("time_slots.id"), nullable=False, index=True)
    reason = Column(String(255), nullable=True,index=True)

    created_by = Column(Integer,ForeignKey("users.id") ,nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
            UniqueConstraint("term_id","instructor_id","time_slot_id",name="uq_unavailability_term_instructor_timeslot"),
    )

class HallType(str,Enum):
    classroom = "classroom"
    amphitheatre = "amphitheatre"
    lab = "lab"

class Halls(Base):
    __tablename__ = "halls"
    id = Column(Integer, primary_key=True,index=True)
    hall_name = Column(String(50), index=True, nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False, index=True)
    capacity = Column(Integer,nullable=False)
    hall_type = Column(SQLAEnum(HallType,name="hall_type_enum"), index=True, nullable=False)
    department_id = Column(Integer,ForeignKey("departments.id"),index=True, nullable=True)
    is_shared = Column(Boolean, default=False, nullable=False)
    two_invigilators_required = Column(Boolean, default=False, nullable=False)
    seating_arrangement = Column(String(255),nullable=True)

    __table_args__ = (
        # capacity negatif ve 0 olmasın > 0:
        CheckConstraint("capacity > 0", name="ck_halls_capacity_positive"),


        UniqueConstraint("department_id", "hall_name", name="uq_halls_department_hall_name"),

        CheckConstraint(
            "(is_shared = TRUE) OR (is_shared = FALSE AND department_id IS NOT NULL)",
            name="ck_halls_shared_department_rule"
        ),
    )

class ScheduleStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    locked = "locked"


class Schedules(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)

    term_id = Column(Integer, ForeignKey("terms.id"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)

    status = Column(
        SQLAEnum(ScheduleStatus, name="schedule_status_enum"),
        nullable=False,
        index=True,
        default=ScheduleStatus.draft
    )

    # --- workflow izleri ---
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # --- timestamps ---
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("term_id", "department_id", name="uq_schedules_term_department"),
    )

class WeekPatterns(str,Enum):
    all = "all"
    odd = "odd"
    even = "even"

class ScheduleEntries(Base):
    __tablename__ = "schedule_entries"
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False, index=True)
    course_offering_id = Column(Integer, ForeignKey("course_offerings.id"), nullable=False, index=True)
    hall_id = Column(Integer, ForeignKey("halls.id"), nullable=False, index=True)
    time_slot_id = Column(Integer, ForeignKey("time_slots.id"), nullable=False, index=True)
    duration_slots = Column(Integer, nullable=True)
    week_pattern = Column(
        SQLAEnum(WeekPatterns),
        nullable=False,
        default=WeekPatterns.all,
        server_default=WeekPatterns.all.value,
    )

    created_by = Column(Integer,ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # Aynı schedule içinde aynı time_slot'ta aynı hall'e 2 ders koymuyoruz (derslik çakışması)
        UniqueConstraint(
            "schedule_id", "time_slot_id", "hall_id", "week_pattern",
            name="uq_entries_schedule_timeslot_hall_week"
        ),

        # Aynı schedule içinde aynı time_slot'a aynı offering'i iki kez koymuyoruz (double insert önler)
        UniqueConstraint(
            "schedule_id", "time_slot_id", "course_offering_id", "week_pattern",
            name="uq_entries_schedule_timeslot_offering_week"
        ),
    )