from fastapi import APIRouter, HTTPException, Query, status
from backend.database import db_dependency
from backend import models, schemas

router = APIRouter(prefix="/api/time-slots", tags=["time_slots"])

@router.get("", response_model=list[schemas.TimeSlotOut])
def list_time_slots(db: db_dependency, day_of_week: int | None = Query(None, ge=1, le=7)):
    q = db.query(models.TimeSlots)
    if day_of_week:
        q = q.filter(models.TimeSlots.day_of_week == day_of_week)
    return q.order_by(models.TimeSlots.day_of_week, models.TimeSlots.start_time).all()

@router.get("/{slot_id}", response_model=schemas.TimeSlotOut)
def get_time_slot(slot_id: int, db: db_dependency):
    obj = db.query(models.TimeSlots).filter(models.TimeSlots.id == slot_id).first()
    if not obj:
        raise HTTPException(404, "Time slot not found.")
    return obj

@router.post("", response_model=schemas.TimeSlotOut, status_code=status.HTTP_201_CREATED)
def create_time_slot(payload: schemas.TimeSlotCreate, db: db_dependency):
    obj = models.TimeSlots(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.patch("/{slot_id}", response_model=schemas.TimeSlotOut)
def update_time_slot(slot_id: int, payload: schemas.TimeSlotUpdate, db: db_dependency):
    obj = db.query(models.TimeSlots).filter(models.TimeSlots.id == slot_id).first()
    if not obj:
        raise HTTPException(404, "Time slot not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_slot(slot_id: int, db: db_dependency):
    obj = db.query(models.TimeSlots).filter(models.TimeSlots.id == slot_id).first()
    if not obj:
        raise HTTPException(404, "Time slot not found.")
    db.delete(obj)
    db.commit()
    return None
