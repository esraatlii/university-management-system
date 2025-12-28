from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database import db_dependency
from backend import models, schemas

router = APIRouter(prefix="/api/program-classes", tags=["program_classes"])

def _out(db: Session, pc_id: int):
    row = (
        db.query(
            models.ProgramClasses,
            models.Departments.name.label("department_name"),
            models.Terms.name.label("term_name"),
        )
        .join(models.Departments, models.ProgramClasses.department_id == models.Departments.id)
        .join(models.Terms, models.ProgramClasses.term_id == models.Terms.id)
        .filter(models.ProgramClasses.id == pc_id)
        .first()
    )
    if not row:
        return None
    pc, department_name, term_name = row
    return {
        "id": pc.id,
        "department_id": pc.department_id,
        "term_id": pc.term_id,
        "class_level": pc.class_level,
        "group_no": pc.group_no,
        "label": pc.label,
        "department_name": department_name,
        "term_name": term_name,
    }

@router.get("", response_model=list[schemas.ProgramClassOut])
def list_program_classes(
    db: db_dependency,
    department_id: int | None = Query(None, ge=1),
    term_id: int | None = Query(None, ge=1),
    class_level: int | None = Query(None, ge=1, le=4),
):
    q = (
        db.query(
            models.ProgramClasses,
            models.Departments.name.label("department_name"),
            models.Terms.name.label("term_name"),
        )
        .join(models.Departments, models.ProgramClasses.department_id == models.Departments.id)
        .join(models.Terms, models.ProgramClasses.term_id == models.Terms.id)
    )
    if department_id: q = q.filter(models.ProgramClasses.department_id == department_id)
    if term_id: q = q.filter(models.ProgramClasses.term_id == term_id)
    if class_level: q = q.filter(models.ProgramClasses.class_level == class_level)

    rows = q.order_by(models.ProgramClasses.id.desc()).all()
    return [
        {
            "id": pc.id,
            "department_id": pc.department_id,
            "term_id": pc.term_id,
            "class_level": pc.class_level,
            "group_no": pc.group_no,
            "label": pc.label,
            "department_name": department_name,
            "term_name": term_name,
        }
        for (pc, department_name, term_name) in rows
    ]

@router.get("/{pc_id}", response_model=schemas.ProgramClassOut)
def get_program_class(pc_id: int, db: db_dependency):
    data = _out(db, pc_id)
    if not data:
        raise HTTPException(404, "Program class not found.")
    return data

@router.post("", response_model=schemas.ProgramClassOut, status_code=status.HTTP_201_CREATED)
def create_program_class(payload: schemas.ProgramClassCreate, db: db_dependency):
    obj = models.ProgramClasses(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.patch("/{pc_id}", response_model=schemas.ProgramClassOut)
def update_program_class(pc_id: int, payload: schemas.ProgramClassUpdate, db: db_dependency):
    obj = db.query(models.ProgramClasses).filter(models.ProgramClasses.id == pc_id).first()
    if not obj:
        raise HTTPException(404, "Program class not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _out(db, obj.id)

@router.delete("/{pc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program_class(pc_id: int, db: db_dependency):
    obj = db.query(models.ProgramClasses).filter(models.ProgramClasses.id == pc_id).first()
    if not obj:
        raise HTTPException(404, "Program class not found.")
    db.delete(obj)
    db.commit()
    return None
