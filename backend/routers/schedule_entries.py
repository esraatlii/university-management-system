from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database import db_dependency
from backend import models, schemas

router = APIRouter(prefix="/api/schedule-entries", tags=["schedule_entries"])

def _out(db: Session, entry_id: int):
    row = (
        db.query(
            models.ScheduleEntries,
            models.Courses.name.label("course_name"),
            models.Instructors.full_name.label("instructor_name"),
            models.Schedules.term_id.label("term_id"),
            models.Schedules.department_id.label("department_id"),
            models.TimeSlots.day_of_week,
            models.TimeSlots.start_time,
            models.TimeSlots.end_time,
            models.Halls.hall_name.label("hall_name"),
        )
        .join(models.Schedules, models.ScheduleEntries.schedule_id == models.Schedules.id)
        .join(models.CourseOfferings, models.ScheduleEntries.course_offering_id == models.CourseOfferings.id)
        .join(models.Courses, models.CourseOfferings.course_id == models.Courses.id)
        .join(models.Instructors, models.CourseOfferings.instructor_id == models.Instructors.id)
        .join(models.TimeSlots, models.ScheduleEntries.time_slot_id == models.TimeSlots.id)
        .join(models.Halls, models.ScheduleEntries.hall_id == models.Halls.id)
        .filter(models.ScheduleEntries.id == entry_id)
        .first()
    )
    if not row:
        return None

    e, course_name, instructor_name, term_id, department_id, dow, st, et, hall_name = row
    return {
        "id": e.id,
        "schedule_id": e.schedule_id,
        "course_offering_id": e.course_offering_id,
        "hall_id": e.hall_id,
        "time_slot_id": e.time_slot_id,
        "duration_slots": e.duration_slots,
        "week_pattern": e.week_pattern,
        "course_name": course_name,
        "instructor_name": instructor_name,
        "term_id": term_id,
        "department_id": department_id,
        "day_of_week": dow,
        "start_time": st,
        "end_time": et,
        "hall_name": hall_name,
    }

@router.get("", response_model=list[schemas.ScheduleEntryOut])
def list_entries(
    db: db_dependency,
    term_id: int | None = Query(None, ge=1),
    department_id: int | None = Query(None, ge=1),
    schedule_id: int | None = Query(None, ge=1),
):
    q = (
        db.query(
            models.ScheduleEntries,
            models.Courses.name.label("course_name"),
            models.Instructors.full_name.label("instructor_name"),
            models.Schedules.term_id.label("term_id"),
            models.Schedules.department_id.label("department_id"),
            models.TimeSlots.day_of_week,
            models.TimeSlots.start_time,
            models.TimeSlots.end_time,
            models.Halls.hall_name.label("hall_name"),
        )
        .join(models.Schedules, models.ScheduleEntries.schedule_id == models.Schedules.id)
        .join(models.CourseOfferings, models.ScheduleEntries.course_offering_id == models.CourseOfferings.id)
        .join(models.Courses, models.CourseOfferings.course_id == models.Courses.id)
        .join(models.Instructors, models.CourseOfferings.instructor_id == models.Instructors.id)
        .join(models.TimeSlots, models.ScheduleEntries.time_slot_id == models.TimeSlots.id)
        .join(models.Halls, models.ScheduleEntries.hall_id == models.Halls.id)
    )

    if schedule_id:
        q = q.filter(models.ScheduleEntries.schedule_id == schedule_id)

    # schedule_id vermediyse dokümandaki gibi term+department ile filtreleyebiliriz
    if term_id:
        q = q.filter(models.Schedules.term_id == term_id)
    if department_id:
        q = q.filter(models.Schedules.department_id == department_id)

    rows = q.order_by(models.ScheduleEntries.id.desc()).all()
    return [
        {
            "id": e.id,
            "schedule_id": e.schedule_id,
            "course_offering_id": e.course_offering_id,
            "hall_id": e.hall_id,
            "time_slot_id": e.time_slot_id,
            "duration_slots": e.duration_slots,
            "week_pattern": e.week_pattern,
            "course_name": course_name,
            "instructor_name": instructor_name,
            "term_id": t_id,
            "department_id": d_id,
            "day_of_week": dow,
            "start_time": st,
            "end_time": et,
            "hall_name": hall_name,
        }
        for (e, course_name, instructor_name, t_id, d_id, dow, st, et, hall_name) in rows
    ]

@router.get("/{entry_id}", response_model=schemas.ScheduleEntryOut)
def get_entry(entry_id: int, db: db_dependency):
    data = _out(db, entry_id)
    if not data:
        raise HTTPException(404, "Schedule entry not found.")
    return data

@router.post("", response_model=schemas.ScheduleEntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(payload: schemas.ScheduleEntryCreate, db: db_dependency):
    obj = models.ScheduleEntries(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.patch("/{entry_id}", response_model=schemas.ScheduleEntryOut)
def update_entry(entry_id: int, payload: schemas.ScheduleEntryUpdate, db: db_dependency):
    obj = db.query(models.ScheduleEntries).filter(models.ScheduleEntries.id == entry_id).first()
    if not obj:
        raise HTTPException(404, "Schedule entry not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, db: db_dependency):
    obj = db.query(models.ScheduleEntries).filter(models.ScheduleEntries.id == entry_id).first()
    if not obj:
        raise HTTPException(404, "Schedule entry not found.")
    db.delete(obj)
    db.commit()
    return None
