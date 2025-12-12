from fastapi import FastAPI
from backend.database import engine
from backend import models
from backend.routers import users,auth,faculties,departments,terms,courses


app = FastAPI()

models.Base.metadata.create_all(bind=engine)


app.include_router(users.router)
app.include_router(auth.router)
app.include_router(faculties.router)
app.include_router(departments.router)
app.include_router(terms.router)
app.include_router(courses.router)

@app.get("/")
def read_root():
    return {"Message": "FastAPI is up and running"}

