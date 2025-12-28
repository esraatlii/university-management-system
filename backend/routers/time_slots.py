from fastapi import APIRouter, HTTPException, Query, status
from backend.database import db_dependency
from backend import models, schemas
from backend.constants.days import day_name_tr
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/api/time-slots", tags=["time_slots"])


def _slot_out(slot: models.TimeSlots) -> dict:
    """
    DB'den gelen TimeSlots ORM objesini, frontend'e gönderilecek TimeSlotOut formatına çevirir.
    day_name DB'de olmadığı için burada üretilir.
    """
    return {
        "id": slot.id,
        "day_of_week": slot.day_of_week,
        "day_name": day_name_tr(slot.day_of_week),
        "start_time": slot.start_time,
        "end_time": slot.end_time,
    }


@router.get("", response_model=list[schemas.TimeSlotOut])
def list_time_slots(
    db: db_dependency,
    day_of_week: int | None = Query(None, ge=1, le=7),
):
    q = db.query(models.TimeSlots)

    # Query param geldi mi gelmedi mi?
    if day_of_week is not None:
        q = q.filter(models.TimeSlots.day_of_week == day_of_week)

    rows = q.order_by(models.TimeSlots.day_of_week, models.TimeSlots.start_time).all()
    return [_slot_out(r) for r in rows]


@router.get("/{time_slot_id}", response_model=schemas.TimeSlotOut)
def get_time_slot(time_slot_id: int, db: db_dependency):
    r = db.query(models.TimeSlots).filter(models.TimeSlots.id == time_slot_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Time slot not found.")
    return _slot_out(r)

@router.post("", response_model=schemas.TimeSlotOut, status_code=status.HTTP_201_CREATED)
def create_time_slot(payload: schemas.TimeSlotCreate, db: db_dependency):
    obj = models.TimeSlots(**payload.model_dump())
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Bu gün + saat aralığı zaten mevcut.",
        )
    db.refresh(obj)
    return _slot_out(obj)

@router.patch("/{slot_id}", response_model=schemas.TimeSlotOut)
def update_time_slot(slot_id: int, payload: schemas.TimeSlotUpdate, db: db_dependency):
    obj = db.query(models.TimeSlots).filter(models.TimeSlots.id == slot_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Time slot not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Güncelleme çakışma yarattı: aynı gün/saat aralığı zaten var.",
        )

    db.refresh(obj)
    return _slot_out(obj)

@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_slot(slot_id: int, db: db_dependency):
    obj = db.query(models.TimeSlots).filter(models.TimeSlots.id == slot_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Time slot not found.")

    db.delete(obj)
    db.commit()
    return None
