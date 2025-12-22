from fastapi import APIRouter,HTTPException
from sqlalchemy.exc import IntegrityError
from backend import models,schemas
from backend.database import db_dependency

router = APIRouter(
    prefix="/api/halls",
    tags=["halls"]
)

def build_hall_out(db, hall_id: int):
    row = (
        db.query(models.Halls, models.Departments.name.label("department_name"))
        .outerjoin(models.Departments, models.Halls.department_id == models.Departments.id)
        .filter(models.Halls.id == hall_id)
        .first()
    )
    if not row:
        return None

    hall, dept_name = row
    return {
        "id": hall.id,
        "hall_name": hall.hall_name,
        "capacity": hall.capacity,
        "hall_type": hall.hall_type.value if hall.hall_type else None,
        "department_id": hall.department_id,
        "department_name": dept_name,
        "is_shared": hall.is_shared,
        "two_invigilators_required": hall.two_invigilators_required,
        "seating_arrangement": hall.seating_arrangement,
    }

def build_hall_list_out(db):
    rows = (
        db.query(models.Halls, models.Departments.name.label("department_name"))
        .outerjoin(models.Departments, models.Halls.department_id == models.Departments.id)
        .order_by(models.Halls.id.asc())
        .all()
    )

    return [
        {
            "id": hall.id,
            "hall_name": hall.hall_name,
            "capacity": hall.capacity,
            "hall_type": hall.hall_type.value if hall.hall_type else None,
            "department_id": hall.department_id,
            "department_name": dept_name,
            "is_shared": hall.is_shared,
            "two_invigilators_required": hall.two_invigilators_required,
            "seating_arrangement": hall.seating_arrangement,
        }
        for hall, dept_name in rows
    ]

@router.get("/", response_model=list[schemas.HallOut])
def list_halls(db:db_dependency):
    return build_hall_list_out(db)

@router.get("/{id}", response_model=schemas.HallOut)
def get_hall(db:db_dependency,id: int):
    out = build_hall_out(db, id)
    if not out:
        raise HTTPException(status_code=404, detail="Hall not found")
    return out

@router.post("/", response_model=schemas.HallOut)
def create_hall(data: schemas.HallCreate, db: db_dependency):

    existing = (
        db.query(models.Halls)
        .filter(
            models.Halls.hall_name == data.hall_name,
            models.Halls.department_id == data.department_id
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="This hall already exists in this department.")

    # 2) Model oluşturalım (DB'de olan kolonlar)
    new_hall = models.Halls(
        hall_name=data.hall_name,
        capacity=data.capacity,
        hall_type=data.hall_type,
        department_id=data.department_id,
        is_shared=data.is_shared,
        two_invigilators_required=data.two_invigilators_required,
        seating_arrangement=data.seating_arrangement,
    )

    # 3) Kaydet
    db.add(new_hall)
    db.commit()
    db.refresh(new_hall)

    # 4) Out formatında döndürelim (department_name JOIN ile gelsin diye)
    return build_hall_out(db, new_hall.id)

@router.put("/{id}", response_model=schemas.HallOut)
def update_hall(id: int, patch: schemas.HallsUpdate, db: db_dependency):
    hall = db.query(models.Halls).filter(models.Halls.id == id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    # 1) sadece gönderilen alanlar
    data = patch.model_dump(exclude_unset=True)
    if not data:
        return build_hall_out(db, hall.id)

    # 2) "son değerleri" hesapla (merge)
    final_is_shared = data.get("is_shared", hall.is_shared)
    final_department_id = data.get("department_id", hall.department_id)

    # 3) shared ↔ department kuralını SON değerlere göre kontrol et
    if final_is_shared is True and final_department_id is not None:
        raise HTTPException(
            status_code=400,
            detail="is_shared=True iken department_id boş (null) olmalı."
        )
    if final_is_shared is False and final_department_id is None:
        raise HTTPException(
            status_code=400,
            detail="is_shared=False iken department_id dolu olmalı."
        )

    # 4) sadece gelen alanları modele bas
    for key, value in data.items():
        if hasattr(hall, key):
            setattr(hall, key, value)

    # 5) kaydet
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        # UniqueConstraint (department_id, hall_name) çakışırsa buraya düşer
        raise HTTPException(status_code=400, detail="Bu bölümde bu isimde bir salon zaten var.") from e

    db.refresh(hall)

    # 6) response: department_name JOIN ile gelsin diye
    return build_hall_out(db, hall.id)

@router.delete("/{id}",status_code=204)
def delete_hall(id: int, db: db_dependency):
    hall = db.query(models.Halls).filter(models.Halls.id == id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    db.delete(hall)
    db.commit()
    return
