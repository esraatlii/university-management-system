from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database import db_dependency
from backend import models, schemas

router = APIRouter(prefix="/api/instructor-unavailability", tags=["instructor_unavailability"])

def _out(db: Session, un_id: int):
    row = (
        db.query(
            models.InstructorUnavailability,
            models.Terms.name.label("term_name"),
            models.Instructors.full_name.label("instructor_name"),
            models.TimeSlots.day_of_week,
            models.TimeSlots.start_time,
            models.TimeSlots.end_time,
        )
        .join(models.Terms, models.InstructorUnavailability.term_id == models.Terms.id)
        .join(models.Instructors, models.InstructorUnavailability.instructor_id == models.Instructors.id)
        .join(models.TimeSlots, models.InstructorUnavailability.time_slot_id == models.TimeSlots.id)
        .filter(models.InstructorUnavailability.id == un_id)
        .first()
    )
    if not row:
        return None

    u, term_name, instructor_name, dow, st, et = row
    return {
        "id": u.id,
        "term_id": u.term_id,
        "instructor_id": u.instructor_id,
        "time_slot_id": u.time_slot_id,
        "reason": u.reason,
        "term_name": term_name,
        "instructor_name": instructor_name,
        "day_of_week": dow,
        "start_time": st,
        "end_time": et,
        "created_by": u.created_by,
        "created_at": u.created_at,
        "updated_at": u.updated_at,
    }

@router.get("", response_model=list[schemas.InstructorUnavailabilityOut])
def list_unavailability(
    db: db_dependency,
    term_id: int | None = Query(None, ge=1),
    instructor_id: int | None = Query(None, ge=1),
):
    q = (
        db.query(
            models.InstructorUnavailability,
            models.Terms.name.label("term_name"),
            models.Instructors.full_name.label("instructor_name"),
            models.TimeSlots.day_of_week,
            models.TimeSlots.start_time,
            models.TimeSlots.end_time,
        )
        .join(models.Terms, models.InstructorUnavailability.term_id == models.Terms.id)
        .join(models.Instructors, models.InstructorUnavailability.instructor_id == models.Instructors.id)
        .join(models.TimeSlots, models.InstructorUnavailability.time_slot_id == models.TimeSlots.id)
    )
    if term_id: q = q.filter(models.InstructorUnavailability.term_id == term_id)
    if instructor_id: q = q.filter(models.InstructorUnavailability.instructor_id == instructor_id)

    rows = q.order_by(models.InstructorUnavailability.id.desc()).all()
    return [
        {
            "id": u.id,
            "term_id": u.term_id,
            "instructor_id": u.instructor_id,
            "time_slot_id": u.time_slot_id,
            "reason": u.reason,
            "term_name": term_name,
            "instructor_name": instructor_name,
            "day_of_week": dow,
            "start_time": st,
            "end_time": et,
            "created_by": u.created_by,
            "created_at": u.created_at,
            "updated_at": u.updated_at,
        }
        for (u, term_name, instructor_name, dow, st, et) in rows
    ]

@router.get("/{un_id}", response_model=schemas.InstructorUnavailabilityOut)
def get_unavailability(un_id: int, db: db_dependency):
    data = _out(db, un_id)
    if not data:
        raise HTTPException(404, "Unavailability not found.")
    return data

@router.post("", response_model=schemas.InstructorUnavailabilityOut, status_code=status.HTTP_201_CREATED)
def create_unavailability(payload: schemas.InstructorUnavailabilityCreate, db: db_dependency):
    obj = models.InstructorUnavailability(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.patch("/{un_id}", response_model=schemas.InstructorUnavailabilityOut)
def update_unavailability(un_id: int, payload: schemas.InstructorUnavailabilityUpdate, db: db_dependency):
    obj = db.query(models.InstructorUnavailability).filter(models.InstructorUnavailability.id == un_id).first()
    if not obj:
        raise HTTPException(404, "Unavailability not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.delete("/{un_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unavailability(un_id: int, db: db_dependency):
    obj = db.query(models.InstructorUnavailability).filter(models.InstructorUnavailability.id == un_id).first()
    if not obj:
        raise HTTPException(404, "Unavailability not found.")
    db.delete(obj)
    db.commit()
    return None
