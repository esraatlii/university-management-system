# backend/routers/course_offerings.py

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database import db_dependency
from backend import models, schemas

router = APIRouter(prefix="/api/course-offerings", tags=["course_offerings"])


def _offering_out(db: Session, offering_id: int):
    row = (
        db.query(
            models.CourseOfferings,
            models.Terms.name.label("term_name"),
            models.Courses.name.label("course_name"),
            models.Instructors.full_name.label("instructor_name"),
        )
        .join(models.Terms, models.CourseOfferings.term_id == models.Terms.id)
        .join(models.Courses, models.CourseOfferings.course_id == models.Courses.id)
        .join(models.Instructors, models.CourseOfferings.instructor_id == models.Instructors.id)
        .filter(models.CourseOfferings.id == offering_id)
        .first()
    )

    if not row:
        return None

    o, term_name, course_name, instructor_name = row
    return {
        "id": o.id,
        "term_id": o.term_id,
        "course_id": o.course_id,
        "instructor_id": o.instructor_id,
        "program_class_id": o.program_class_id,
        "student_count": o.student_count,
        "term_name": term_name,
        "course_name": course_name,
        "instructor_name": instructor_name,
    }


@router.get("", response_model=list[schemas.CourseOfferingsOut])
def list_course_offerings(
    db: db_dependency,
    term_id: int | None = Query(None, ge=1),
    course_id: int | None = Query(None, ge=1),
    instructor_id: int | None = Query(None, ge=1),
    program_class_id: int | None = Query(None, ge=1),
):
    q = (
        db.query(
            models.CourseOfferings,
            models.Terms.name.label("term_name"),
            models.Courses.name.label("course_name"),
            models.Instructors.full_name.label("instructor_name"),
        )
        .join(models.Terms, models.CourseOfferings.term_id == models.Terms.id)
        .join(models.Courses, models.CourseOfferings.course_id == models.Courses.id)
        .join(models.Instructors, models.CourseOfferings.instructor_id == models.Instructors.id)
    )

    if term_id is not None:
        q = q.filter(models.CourseOfferings.term_id == term_id)
    if course_id is not None:
        q = q.filter(models.CourseOfferings.course_id == course_id)
    if instructor_id is not None:
        q = q.filter(models.CourseOfferings.instructor_id == instructor_id)
    if program_class_id is not None:
        q = q.filter(models.CourseOfferings.program_class_id == program_class_id)

    rows = q.order_by(models.CourseOfferings.id.desc()).all()

    return [
        {
            "id": o.id,
            "term_id": o.term_id,
            "course_id": o.course_id,
            "instructor_id": o.instructor_id,
            "program_class_id": o.program_class_id,
            "student_count": o.student_count,
            "term_name": term_name,
            "course_name": course_name,
            "instructor_name": instructor_name,
        }
        for (o, term_name, course_name, instructor_name) in rows
    ]


@router.get("/{offering_id}", response_model=schemas.CourseOfferingsOut)
def get_course_offering(offering_id: int, db: db_dependency):
    data = _offering_out(db, offering_id)
    if not data:
        raise HTTPException(status_code=404, detail="Course offering not found.")
    return data


@router.post("", response_model=schemas.CourseOfferingsOut, status_code=status.HTTP_201_CREATED)
def create_course_offering(payload: schemas.CourseOfferingsCreate, db: db_dependency):
    obj = models.CourseOfferings(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)

    return _offering_out(db, obj.id)


@router.patch("/{offering_id}", response_model=schemas.CourseOfferingsOut)
def update_course_offering(offering_id: int, payload: schemas.CourseOfferingsUpdate, db: db_dependency):
    obj = db.query(models.CourseOfferings).filter(models.CourseOfferings.id == offering_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Course offering not found.")

    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)

    return _offering_out(db, obj.id)


@router.delete("/{offering_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_offering(offering_id: int, db: db_dependency):
    obj = db.query(models.CourseOfferings).filter(models.CourseOfferings.id == offering_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Course offering not found.")

    db.delete(obj)
    db.commit()
    return None
