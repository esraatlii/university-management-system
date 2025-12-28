from fastapi import APIRouter,HTTPException
from backend.database import db_dependency
from backend import schemas,models

router = APIRouter(
    prefix="/api/faculties",
    tags=["faculties"]
)

@router.get("/",response_model=list[schemas.FacultyOut])
def get_faculty(db: db_dependency):
    faculties = db.query(models.Faculties).all()
    return faculties

@router.post("/",response_model=schemas.FacultyOut)
def add_faculty(data: schemas.FacultyCreate,db: db_dependency):
    name = data.name.strip()
    faculty = db.query(models.Faculties).filter(models.Faculties.name == name).first()
    if faculty:
        raise HTTPException(status_code=400,
                            detail="Faculty already exists")
    new_faculty = models.Faculties(name=name)

    db.add(new_faculty)
    db.commit()
    db.refresh(new_faculty)
    return new_faculty

@router.put("/{faculty_id}",response_model=schemas.FacultyOut)
def update_faculty(faculty_id: int,data: schemas.FacultyUpdate,db: db_dependency):
    faculty = db.query(models.Faculties).filter(models.Faculties.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404,
                            detail="Faculty does not exist")
    faculty.name = data.name

    db.commit()
    db.refresh(faculty)

    return faculty

@router.delete("/{faculty_id}",response_model=schemas.Message)
def delete_faculty(faculty_id: int,db: db_dependency):
    faculty = db.query(models.Faculties).filter(models.Faculties.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404,
                            detail="Faculty does not exist")
    db.delete(faculty)
    db.commit()
    return {"message": "Faculty deleted"}

@router.get("/{faculty_id}", response_model=schemas.FacultyOut)
def get_one_faculty(faculty_id: int, db: db_dependency):
    faculty = db.query(models.Faculties).filter(models.Faculties.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty does not exist")
    return faculty
