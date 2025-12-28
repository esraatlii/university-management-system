from fastapi import FastAPI
from backend.database import engine
from backend import models
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import (
    users,auth,faculties,departments,terms,courses,halls,instructor, program_classes,
    time_slots,schedules,schedule_entries,instructor_unavailability,course_offerings)


app = FastAPI()

origins = [
    "http://localhost:3000",   # React (CRA)
    "http://localhost:5173",   # Vite
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return {"Message": "FastAPI is up and running"}



