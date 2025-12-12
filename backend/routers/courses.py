from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import aliased

from backend import models, schemas
from backend.database import db_dependency
from backend.models import CourseType

router = APIRouter(prefix="/api/courses", tags=["courses"])


# -------------------- helpers --------------------

def ensure_department_exists(db, department_id: int):
    exists = db.query(models.Departments).filter(models.Departments.id == department_id).first()
    if not exists:
        raise HTTPException(status_code=400, detail="Department not found")


def ensure_term_exists(db, term_id: int | None):
    if term_id is None:
        return
    exists = db.query(models.Terms).filter(models.Terms.id == term_id).first()
    if not exists:
        raise HTTPException(status_code=400, detail="Term not found")


def validate_parent_rules(
    course_type: CourseType,
    parent_course_id: int | None,
    db,
    course_id_to_exclude: int | None = None
):
    # lab/practice -> parent zorunlu
    if course_type in (CourseType.lab, CourseType.practice) and parent_course_id is None:
        raise HTTPException(status_code=400, detail="Lab/Practice courses must have parent_course_id")

    # theory -> parent olamaz
    if course_type == CourseType.theory and parent_course_id is not None:
        raise HTTPException(status_code=400, detail="Theory courses cannot have parent_course_id")

    # parent verildiyse: var mı? kendi kendisi mi? parent theory mi?
    if parent_course_id is not None:
        if course_id_to_exclude is not None and parent_course_id == course_id_to_exclude:
            raise HTTPException(status_code=400, detail="A course cannot be its own parent")

        parent = db.query(models.Courses).filter(models.Courses.id == parent_course_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent course not found")

        if parent.course_type != CourseType.theory:
            raise HTTPException(status_code=400, detail="Parent course must be a theory course")


def build_course_out(db, course_id: int):
    Parent = aliased(models.Courses)

    row = (
        db.query(
            models.Courses,
            models.Departments.name.label("department_name"),
            models.Faculties.id.label("faculty_id"),
            models.Faculties.name.label("faculty_name"),
            models.Terms.name.label("term_name"),
            Parent.code.label("parent_course_code"),
            Parent.name.label("parent_course_name"),
        )
        .join(models.Departments, models.Courses.department_id == models.Departments.id)
        .join(models.Faculties, models.Departments.faculty_id == models.Faculties.id)
        .outerjoin(models.Terms, models.Courses.term_id == models.Terms.id)
        .outerjoin(Parent, models.Courses.parent_course_id == Parent.id)
        .filter(models.Courses.id == course_id)
        .first()
    )

    if not row:
        return None

    course = row[0]
    return {
        "id": course.id,
        "code": course.code,
        "name": course.name,
        "department_id": course.department_id,
        "term_id": course.term_id,
        "class_level": course.class_level,
        "weekly_hours": course.weekly_hours,
        "course_type": course.course_type,
        "parent_course_id": course.parent_course_id,
        "is_mandatory": course.is_mandatory,
        "is_retake_critical": course.is_retake_critical,

        "department_name": row.department_name,
        "faculty_id": row.faculty_id,
        "faculty_name": row.faculty_name,
        "term_name": row.term_name,
        "parent_course_code": row.parent_course_code,
        "parent_course_name": row.parent_course_name,
    }


# -------------------- endpoints --------------------

@router.get("/", response_model=list[schemas.CoursesOut])
def list_courses(db: db_dependency):
    Parent = aliased(models.Courses)

    rows = (
        db.query(
            models.Courses,
            models.Departments.name.label("department_name"),
            models.Faculties.id.label("faculty_id"),
            models.Faculties.name.label("faculty_name"),
            models.Terms.name.label("term_name"),
            Parent.code.label("parent_course_code"),
            Parent.name.label("parent_course_name"),
        )
        .join(models.Departments, models.Courses.department_id == models.Departments.id)
        .join(models.Faculties, models.Departments.faculty_id == models.Faculties.id)
        .outerjoin(models.Terms, models.Courses.term_id == models.Terms.id)
        .outerjoin(Parent, models.Courses.parent_course_id == Parent.id)
        .all()
    )

    result = []
    for row in rows:
        course = row[0]
        result.append({
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "department_id": course.department_id,
            "term_id": course.term_id,
            "class_level": course.class_level,
            "weekly_hours": course.weekly_hours,
            "course_type": course.course_type,
            "parent_course_id": course.parent_course_id,
            "is_mandatory": course.is_mandatory,
            "is_retake_critical": course.is_retake_critical,

            "department_name": row.department_name,
            "faculty_id": row.faculty_id,
            "faculty_name": row.faculty_name,
            "term_name": row.term_name,
            "parent_course_code": row.parent_course_code,
            "parent_course_name": row.parent_course_name,
        })
    return result


@router.get("/{course_id}", response_model=schemas.CoursesOut)
def get_course(course_id: int, db: db_dependency):
    out = build_course_out(db, course_id)
    if not out:
        raise HTTPException(status_code=404, detail="Course not found")
    return out


@router.post("/", response_model=schemas.CoursesOut, status_code=201)
def create_course(course: schemas.CoursesCreate, db: db_dependency):
    # code unique
    existing = db.query(models.Courses).filter(models.Courses.code == course.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists")

    # FK kontrolleri
    ensure_department_exists(db, course.department_id)
    ensure_term_exists(db, course.term_id)

    # parent kuralları
    validate_parent_rules(course.course_type, course.parent_course_id, db)

    new_course = models.Courses(**course.model_dump())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)

    return build_course_out(db, new_course.id)


@router.put("/{course_id}", response_model=schemas.CoursesOut)
def update_course(course_id: int, patch: schemas.CoursesUpdate, db: db_dependency):
    db_course = db.query(models.Courses).filter(models.Courses.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    # code değişiyorsa unique kontrol
    if patch.code is not None:
        existing = (
            db.query(models.Courses)
            .filter(models.Courses.code == patch.code, models.Courses.id != course_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Course code already exists")

    data = patch.model_dump(exclude_unset=True)

    # final değerleri hesapla (gelmeyenler DB'den)
    final_course_type = data.get("course_type", db_course.course_type)
    final_parent_id = data.get("parent_course_id", db_course.parent_course_id)
    final_department_id = data.get("department_id", db_course.department_id)
    final_term_id = data.get("term_id", db_course.term_id)

    # FK kontrolleri
    ensure_department_exists(db, final_department_id)
    ensure_term_exists(db, final_term_id)

    # parent kuralları
    validate_parent_rules(final_course_type, final_parent_id, db, course_id_to_exclude=course_id)

    # patch uygula
    for k, v in data.items():
        setattr(db_course, k, v)

    db.commit()
    db.refresh(db_course)

    return build_course_out(db, db_course.id)


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: db_dependency):
    course = db.query(models.Courses).filter(models.Courses.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Bu ders parent olarak kullanılıyorsa silme
    child = db.query(models.Courses).filter(models.Courses.parent_course_id == course_id).first()
    if child:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: this course has dependent lab/practice courses"
        )

    db.delete(course)
    db.commit()
    return
