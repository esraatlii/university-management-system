from fastapi import APIRouter,HTTPException
from backend import models,schemas
from backend.database import db_dependency

router = APIRouter(
    prefix="/api/terms",
    tags=["terms"]
)

@router.get("/",response_model=list[schemas.TermOut])
def show_terms(db: db_dependency):
    terms = db.query((models.Terms)).all()
    return terms

@router.post("/",response_model=schemas.TermOut)
def create_term(term:schemas.TermCreate,db: db_dependency):
    existing_term = db.query(models.Terms).filter(models.Terms.name == term.name).first()
    if existing_term:
        raise HTTPException(
            status_code=400,
            detail="term already exists",
        )
    new_term = models.Terms(
        name=term.name,
        start_date=term.start_date,
        end_date=term.end_date,
        is_active=term.is_active,
    )
    db.add(new_term)
    db.commit()
    db.refresh(new_term)
    return new_term

@router.put("/{id}",response_model=schemas.TermOut)
def update_term(id: int,term: schemas.TermUpdate,db: db_dependency):
    existing_term = db.query(models.Terms).filter(models.Terms.id == id).first()
    if not existing_term:
        raise HTTPException(
            status_code=404,
            detail="term does not exist",
        )
    existing_term.name = term.name
    existing_term.start_date = term.start_date
    existing_term.end_date = term.end_date
    existing_term.is_active = term.is_active

    db.commit()
    db.refresh(existing_term)
    return existing_term

@router.delete("/{id}",response_model=schemas.Message)
def delete_term(id: int,db: db_dependency):
    existing_term = db.query(models.Terms).filter(models.Terms.id == id).first()
    if not existing_term:
        raise HTTPException(
            status_code=404,
            detail="term does not exist",
        )
    db.delete(existing_term)
    db.commit()
    return {"message": "Term deleted"}

@router.get("/{id}",response_model=schemas.TermOut)
def show_term(id: int,db: db_dependency):
    term = db.query(models.Terms).filter(models.Terms.id == id).first()
    if not term:
        raise HTTPException(
            status_code=404,
            detail="term does not exist",
        )
    return term
