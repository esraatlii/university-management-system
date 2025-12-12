from fastapi import APIRouter, HTTPException
from backend import schemas, models
from backend.database import db_dependency

router = APIRouter(prefix="/api/departments", tags=["departments"])


def _department_out(db, department_id: int):
    row = (
        db.query(models.Departments, models.Faculties.name.label("faculty_name"))
        .join(models.Faculties, models.Departments.faculty_id == models.Faculties.id)
        .filter(models.Departments.id == department_id)
        .first()
    )
    if not row:
        return None
    dept, faculty_name = row
    return {
        "id": dept.id,
        "code": dept.code,
        "name": dept.name,
        "faculty_id": dept.faculty_id,
        "faculty_name": faculty_name,
    }


@router.get("/", response_model=list[schemas.DepartmentOut])
def get_departments(db: db_dependency):
    rows = (
        db.query(models.Departments, models.Faculties.name.label("faculty_name"))
        .join(models.Faculties, models.Departments.faculty_id == models.Faculties.id)
        .all()
    )
    return [
        {
            "id": d.id,
            "code": d.code,
            "name": d.name,
            "faculty_id": d.faculty_id,
            "faculty_name": faculty_name,
        }
        for d, faculty_name in rows
    ]


@router.get("/{id}", response_model=schemas.DepartmentOut)
def get_department_by_id(id: int, db: db_dependency):
    out = _department_out(db, id)
    if not out:
        raise HTTPException(404, detail="Department not found")
    return out


@router.post("/", response_model=schemas.DepartmentOut, status_code=201)
def create_department(data: schemas.DepartmentBase, db: db_dependency):
    # faculty var mı?
    if not db.query(models.Faculties).filter(models.Faculties.id == data.faculty_id).first():
        raise HTTPException(400, detail="Faculty not found")

    # unique kontroller
    if db.query(models.Departments).filter(models.Departments.name == data.name).first():
        raise HTTPException(400, detail="Department name already exists")
    if db.query(models.Departments).filter(models.Departments.code == data.code).first():
        raise HTTPException(400, detail="Department code already exists")

    new_department = models.Departments(
        name=data.name.strip(),
        code=data.code.strip(),
        faculty_id=data.faculty_id,
    )
    db.add(new_department)
    db.commit()
    db.refresh(new_department)

    return _department_out(db, new_department.id)


@router.put("/{id}", response_model=schemas.DepartmentOut)
def update_department(id: int, data: schemas.DepartmentUpdate, db: db_dependency):
    dept = db.query(models.Departments).filter(models.Departments.id == id).first()
    if not dept:
        raise HTTPException(404, detail="Department not found")

    # faculty var mı?
    if not db.query(models.Faculties).filter(models.Faculties.id == data.faculty_id).first():
        raise HTTPException(400, detail="Faculty not found")

    # unique kontroller (kendisi hariç)
    if (
        db.query(models.Departments)
        .filter(models.Departments.name == data.name, models.Departments.id != id)
        .first()
    ):
        raise HTTPException(400, detail="Department name already exists")

    if (
        db.query(models.Departments)
        .filter(models.Departments.code == data.code, models.Departments.id != id)
        .first()
    ):
        raise HTTPException(400, detail="Department code already exists")

    dept.name = data.name.strip()
    dept.code = data.code.strip()
    dept.faculty_id = data.faculty_id

    db.commit()
    db.refresh(dept)

    return _department_out(db, id)


@router.delete("/{id}", response_model=schemas.Message)
def delete_department(id: int, db: db_dependency):
    dept = db.query(models.Departments).filter(models.Departments.id == id).first()
    if not dept:
        raise HTTPException(404, detail="Department not found")

    db.delete(dept)
    db.commit()
    return {"message": "Department deleted"}
