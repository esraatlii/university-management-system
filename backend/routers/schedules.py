from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from backend.database import db_dependency
from backend import models, schemas

router = APIRouter(prefix="/api/schedules", tags=["schedules"])

def _out(db: Session, schedule_id: int):
    row = (
        db.query(
            models.Schedules,
            models.Terms.name.label("term_name"),
            models.Departments.name.label("department_name"),
        )
        .join(models.Terms, models.Schedules.term_id == models.Terms.id)
        .join(models.Departments, models.Schedules.department_id == models.Departments.id)
        .filter(models.Schedules.id == schedule_id)
        .first()
    )
    if not row:
        return None

    s, term_name, department_name = row
    return {
        "id": s.id,
        "term_id": s.term_id,
        "department_id": s.department_id,
        "status": s.status,
        "term_name": term_name,
        "department_name": department_name,
        "submitted_at": s.submitted_at,
        "submitted_by": s.submitted_by,
        "approved_at": s.approved_at,
        "approved_by": s.approved_by,
        "locked_at": s.locked_at,
        "locked_by": s.locked_by,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
    }

@router.get("", response_model=list[schemas.ScheduleOut])
def list_schedules(
    db: db_dependency,
    term_id: int | None = Query(None, ge=1),
    department_id: int | None = Query(None, ge=1),
):
    q = (
        db.query(
            models.Schedules,
            models.Terms.name.label("term_name"),
            models.Departments.name.label("department_name"),
        )
        .join(models.Terms, models.Schedules.term_id == models.Terms.id)
        .join(models.Departments, models.Schedules.department_id == models.Departments.id)
    )
    if term_id: q = q.filter(models.Schedules.term_id == term_id)
    if department_id: q = q.filter(models.Schedules.department_id == department_id)

    rows = q.order_by(models.Schedules.id.desc()).all()
    return [
        {
            "id": s.id,
            "term_id": s.term_id,
            "department_id": s.department_id,
            "status": s.status,
            "term_name": term_name,
            "department_name": department_name,
            "submitted_at": s.submitted_at,
            "submitted_by": s.submitted_by,
            "approved_at": s.approved_at,
            "approved_by": s.approved_by,
            "locked_at": s.locked_at,
            "locked_by": s.locked_by,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for (s, term_name, department_name) in rows
    ]

@router.get("/{schedule_id}", response_model=schemas.ScheduleOut)
def get_schedule(schedule_id: int, db: db_dependency):
    data = _out(db, schedule_id)
    if not data:
        raise HTTPException(404, "Schedule not found.")
    return data

@router.post("", response_model=schemas.ScheduleOut, status_code=status.HTTP_201_CREATED)
def create_schedule(payload: schemas.ScheduleCreate, db: db_dependency):
    obj = models.Schedules(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.patch("/{schedule_id}", response_model=schemas.ScheduleOut)
def update_schedule(schedule_id: int, payload: schemas.ScheduleUpdate, db: db_dependency):
    obj = db.query(models.Schedules).filter(models.Schedules.id == schedule_id).first()
    if not obj:
        raise HTTPException(404, "Schedule not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)


@router.post("/{schedule_id}/submit", response_model=schemas.ScheduleOut)
def submit_schedule(schedule_id: int, user_id: int | None = None, db: db_dependency = None):
    obj = db.query(models.Schedules).filter(models.Schedules.id == schedule_id).first()
    if not obj:
        raise HTTPException(404, "Schedule not found.")
    obj.status = models.ScheduleStatus.submitted
    obj.submitted_at = func.now()
    obj.submitted_by = user_id
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.post("/{schedule_id}/approve", response_model=schemas.ScheduleOut)
def approve_schedule(schedule_id: int, user_id: int | None = None, db: db_dependency = None):
    obj = db.query(models.Schedules).filter(models.Schedules.id == schedule_id).first()
    if not obj:
        raise HTTPException(404, "Schedule not found.")
    obj.status = models.ScheduleStatus.approved
    obj.approved_at = func.now()
    obj.approved_by = user_id
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.post("/{schedule_id}/lock", response_model=schemas.ScheduleOut)
def lock_schedule(schedule_id: int, user_id: int | None = None, db: db_dependency = None):
    obj = db.query(models.Schedules).filter(models.Schedules.id == schedule_id).first()
    if not obj:
        raise HTTPException(404, "Schedule not found.")
    obj.status = models.ScheduleStatus.locked
    obj.locked_at = func.now()
    obj.locked_by = user_id
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)
