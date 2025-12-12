from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from backend import models, schemas
from backend.database import db_dependency

router = APIRouter(prefix="/api/users", tags=["users"])

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(p: str) -> str:
    return pwd_context.hash((p or "").strip())


def validate_user_role_department(role: models.Role, department_id: int | None):
    if role == models.Role.department_rep:
        if department_id is None:
            raise HTTPException(400, detail="department_id is required for department_rep")
    else:
        # admin/dean ise department_id olmamalı
        if department_id is not None:
            raise HTTPException(400, detail="department_id must be null for admin/dean")


def ensure_department_exists(db, department_id: int | None):
    if department_id is None:
        return
    exists = db.query(models.Departments).filter(models.Departments.id == department_id).first()
    if not exists:
        raise HTTPException(400, detail="Department not found")


def build_user_out(db, user_id: int):
    row = (
        db.query(models.User, models.Departments.name.label("department_name"))
        .outerjoin(models.Departments, models.User.department_id == models.Departments.id)
        .filter(models.User.id == user_id)
        .first()
    )
    if not row:
        return None

    user, dept_name = row
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "department_id": user.department_id,
        "department_name": dept_name,
    }


@router.get("/", response_model=list[schemas.UserOut])
def list_users(db: db_dependency):
    rows = (
        db.query(models.User, models.Departments.name.label("department_name"))
        .outerjoin(models.Departments, models.User.department_id == models.Departments.id)
        .all()
    )
    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "department_id": user.department_id,
            "department_name": dept_name,
        }
        for user, dept_name in rows
    ]


@router.get("/{id}", response_model=schemas.UserOut)
def get_user(id: int, db: db_dependency):
    out = build_user_out(db, id)
    if not out:
        raise HTTPException(404, detail="User not found")
    return out


@router.post("/", response_model=schemas.UserOut, status_code=201)
def create_user(user: schemas.UserCreate, db: db_dependency):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(400, detail="Email already registered")

    validate_user_role_department(user.role, user.department_id)
    ensure_department_exists(db, user.department_id)

    new_user = models.User(
        full_name=user.full_name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role,
        department_id=user.department_id,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return build_user_out(db, new_user.id)


@router.put("/{id}", response_model=schemas.UserOut)
def update_user(id: int, patch: schemas.UserUpdate, db: db_dependency):
    existing_user = db.query(models.User).filter(models.User.id == id).first()
    if not existing_user:
        raise HTTPException(404, detail="User not found")

    # ✅ Pydantic v2
    data = patch.model_dump(exclude_unset=True)

    # email değişiyorsa unique kontrol
    if "email" in data and data["email"] != existing_user.email:
        taken = db.query(models.User).filter(models.User.email == data["email"]).first()
        if taken:
            raise HTTPException(400, detail="Email already registered")

    # final role + final department_id (gelmeyenler DB'den)
    final_role = data.get("role", existing_user.role)
    final_department_id = data.get("department_id", existing_user.department_id)

    # Eğer role admin/dean'e döndüyse ve department_id gönderilmediyse -> otomatik null yapalım
    if final_role in (models.Role.admin, models.Role.dean):
        final_department_id = None
        data["department_id"] = None

    validate_user_role_department(final_role, final_department_id)
    ensure_department_exists(db, final_department_id)

    for k, v in data.items():
        setattr(existing_user, k, v)

    db.commit()
    db.refresh(existing_user)

    return build_user_out(db, existing_user.id)


@router.delete("/{id}", status_code=204)
def delete_user(id: int, db: db_dependency):
    existing_user = db.query(models.User).filter(models.User.id == id).first()
    if not existing_user:
        raise HTTPException(404, detail="User not found")

    db.delete(existing_user)
    db.commit()
    return
