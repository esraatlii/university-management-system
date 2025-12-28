from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from backend.database import db_dependency
from backend import models, schemas
from backend.models import WeekPatterns
from backend.services.schedule_conflicts import check_schedule_entry_conflicts_multi

router = APIRouter(prefix="/api/schedule-entries", tags=["schedule_entries"])

def _normalize_week_pattern(wp):
    return wp or WeekPatterns.all

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

    if schedule_id is not None:
        q = q.filter(models.ScheduleEntries.schedule_id == schedule_id)
    if term_id is not None:
        q = q.filter(models.Schedules.term_id == term_id)
    if department_id is not None:
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
    wp = _normalize_week_pattern(payload.week_pattern)

    conflict = check_schedule_entry_conflicts_multi(
        db,
        schedule_id=payload.schedule_id,
        course_offering_id=payload.course_offering_id,
        hall_id=payload.hall_id,
        time_slot_id=payload.time_slot_id,
        duration_slots=payload.duration_slots,
        week_pattern=wp,
    )
    if not conflict.get("ok"):
        raise HTTPException(
            status_code=409,
            detail={
                "message": conflict.get("message"),
                "reason": conflict.get("reason"),
                "conflict_entry_id": conflict.get("conflict_entry_id"),
            },
        )

    obj = models.ScheduleEntries(**payload.model_dump(exclude={"week_pattern"}), week_pattern=wp)
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Çakışma: DB constraint ile çelişti (duplicate).",
                "reason": "db_constraint",
                "conflict_entry_id": None,
            },
        )
    db.refresh(obj)
    return _out(db, obj.id)

@router.patch("/{entry_id}", response_model=schemas.ScheduleEntryOut)
def update_entry(entry_id: int, payload: schemas.ScheduleEntryUpdate, db: db_dependency):
    obj = db.query(models.ScheduleEntries).filter(models.ScheduleEntries.id == entry_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Schedule entry not found.")

    new_schedule_id = payload.schedule_id if payload.schedule_id is not None else obj.schedule_id
    new_course_offering_id = payload.course_offering_id if payload.course_offering_id is not None else obj.course_offering_id
    new_hall_id = payload.hall_id if payload.hall_id is not None else obj.hall_id
    new_time_slot_id = payload.time_slot_id if payload.time_slot_id is not None else obj.time_slot_id
    new_duration = payload.duration_slots if payload.duration_slots is not None else obj.duration_slots
    new_week_pattern = _normalize_week_pattern(
        payload.week_pattern if payload.week_pattern is not None else obj.week_pattern
    )

    conflict = check_schedule_entry_conflicts_multi(
        db,
        schedule_id=new_schedule_id,
        course_offering_id=new_course_offering_id,
        hall_id=new_hall_id,
        time_slot_id=new_time_slot_id,
        duration_slots=new_duration,
        week_pattern=new_week_pattern,
        exclude_entry_id=obj.id,
    )
    if not conflict.get("ok"):
        raise HTTPException(
            status_code=409,
            detail={
                "message": conflict.get("message"),
                "reason": conflict.get("reason"),
                "conflict_entry_id": conflict.get("conflict_entry_id"),
            },
        )

    for k, v in payload.model_dump(exclude_unset=True).items():
        if k == "week_pattern":
            v = _normalize_week_pattern(v)
        setattr(obj, k, v)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Çakışma: Güncelleme DB constraint ile çelişti (duplicate).",
                "reason": "db_constraint",
                "conflict_entry_id": None,
            },
        )

    db.refresh(obj)
    return _out(db, obj.id)

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, db: db_dependency):
    obj = db.query(models.ScheduleEntries).filter(models.ScheduleEntries.id == entry_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Schedule entry not found.")

    db.delete(obj)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Bu kayıt başka veriler tarafından kullanılıyor, silinemez.",
                "reason": "fk_conflict",
                "conflict_entry_id": None,
            },
        )
    return None
