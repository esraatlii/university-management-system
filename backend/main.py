from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine
from backend import models
from backend.routers import (
    users,auth,faculties,departments,terms,courses,halls,instructor, program_classes,
    time_slots,schedules,schedule_entries,instructor_unavailability,course_offerings)


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Frontend'in (file:// veya localhost) erişimine izin verir
    allow_credentials=True,
    allow_methods=["*"], # GET, POST vb. tüm metodlara izin verir
    allow_headers=["*"], # Tüm başlık bilgilerine izin verir
)

models.Base.metadata.create_all(bind=engine)


app.include_router(users.router)
app.include_router(auth.router)
app.include_router(faculties.router)
app.include_router(departments.router)
app.include_router(terms.router)
app.include_router(courses.router)
app.include_router(course_offerings.router)
app.include_router(halls.router)
app.include_router(instructor.router)
app.include_router(program_classes.router)
app.include_router(time_slots.router)
app.include_router(schedules.router)
app.include_router(schedule_entries.router)
app.include_router(instructor_unavailability.router)


@app.get("/")
def read_root():
    return {"Message": "FastAPI is up and running"},
 