from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from backend.database import db_dependency
from backend import models, schemas

router = APIRouter(
    prefix="/api/instructors",
    tags=["instructors"],
)

def build_instructor_out(db, instructor_id:int):
    row = (
        db.query(models.Instructors, models.Departments.name.label("department_name"))
        .outerjoin(models.Departments, models.Instructors.home_department_id == models.Departments.id)
        .filter(models.Instructors.id == instructor_id)
        .first()
    )
    if not row:
        return None

    instructor, dept_name = row
    return {
        "id": instructor.id,
        "full_name": instructor.full_name,
        "title": instructor.title,
        "email": instructor.email,
        "home_department_id": instructor.home_department_id,
        "department_name": dept_name
    }

def build_instructor_list_out(db):
    row = (
        db.query(models.Instructors, models.Departments.name.label("department_name"))
        .outerjoin(models.Departments, models.Instructors.home_department_id == models.Departments.id)
        .all()
    )

    return [
        {
            "id": instructor.id,
            "full_name": instructor.full_name,
            "title": instructor.title,
            "email": instructor.email,
            "home_department_id": instructor.home_department_id,
            "department_name": dept_name
        }
        for instructor, dept_name in row
    ]

@router.get("/",response_model=list[schemas.InstructorOut])
def list_instructors(db:db_dependency):
    return build_instructor_list_out(db)

@router.get("/{id}",response_model=schemas.InstructorOut)
def get_instructor(db:db_dependency, id:int):
    out = build_instructor_out(db, id)
    if not out:
        raise HTTPException(status_code=404, detail="Instructor not found")
    return out

@router.post("/", response_model=schemas.InstructorOut, status_code=status.HTTP_201_CREATED)
def create_instructor(data: schemas.InstructorCreate, db: db_dependency):
    existing = db.query(models.Instructors).filter(models.Instructors.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Instructor already exists")

    new_instructor = models.Instructors(
        full_name=data.full_name,
        title=data.title,
        email=data.email,
        home_department_id=data.home_department_id,
    )

    db.add(new_instructor)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email must be unique") from e

    db.refresh(new_instructor)
    return build_instructor_out(db, new_instructor.id)


@router.put("/{id}",response_model=schemas.InstructorOut)
def update_instructor(id:int, patch:schemas.InstructorUpdate, db:db_dependency):
    existing = db.query(models.Instructors).filter(models.Instructors.id == id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Instructor not found")

    data = patch.model_dump(exclude_unset=True)
    if not data:
        return build_instructor_out(db, existing.id)

    for key,value in data.items():
        if hasattr(existing, key):
            setattr(existing, key, value)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400,detail="hata") from e

    db.refresh(existing)
    return build_instructor_out(db, existing.id)

@router.delete("/{id}",status_code=204)
def delete_instructor(db:db_dependency,id:int):
    instructor = db.query(models.Instructors).filter(models.Instructors.id == id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    db.delete(instructor)
    db.commit()
    return