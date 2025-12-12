from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from backend.database import db_dependency
from backend import schemas, models

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

@router.post("/login", response_model=schemas.UserOut)
def login(user_login: schemas.LoginUser, db: db_dependency):
    user = db.query(models.User).filter(models.User.email == user_login.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Geçersiz email veya şifre.")

    # ✅ hash doğrulama
    if not pwd_context.verify(user_login.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Geçersiz email veya şifre.")

    # ✅ users router gibi department_name dönmek istiyorsan:
    row = (
        db.query(models.User, models.Departments.name)
        .outerjoin(models.Departments, models.User.department_id == models.Departments.id)
        .filter(models.User.id == user.id)
        .first()
    )
    u, dept_name = row
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "role": u.role,
        "department_id": u.department_id,
        "department_name": dept_name,
    }
