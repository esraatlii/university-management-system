from __future__ import annotations

from sqlalchemy.orm import Session
from backend import models
from backend.models import WeekPatterns


def _normalize_week_pattern(wp) -> WeekPatterns:
    return wp or WeekPatterns.all


def _normalize_duration(duration_slots: int | None) -> int:
    # None -> 1 slot kabul
    if duration_slots is None:
        return 1
    return max(1, duration_slots)


def _get_term_id_for_schedule(db: Session, schedule_id: int) -> int | None:
    return (
        db.query(models.Schedules.term_id)
        .filter(models.Schedules.id == schedule_id)
        .scalar()
    )


def _get_offering_meta(db: Session, course_offering_id: int):
    return (
        db.query(
            models.CourseOfferings.instructor_id,
            models.CourseOfferings.program_class_id,
        )
        .filter(models.CourseOfferings.id == course_offering_id)
        .first()
    )


def _get_timeslot_chain(db: Session, start_time_slot_id: int, duration_slots: int) -> list[int] | None:
    """
    Başlangıç time_slot_id'den itibaren aynı gün içinde start_time'a göre ardışık duration_slots tane slot döndürür.
    Yetersiz slot varsa None.
    """
    start_slot = db.query(models.TimeSlots).filter(models.TimeSlots.id == start_time_slot_id).first()
    if not start_slot:
        return None

    day = start_slot.day_of_week

    # aynı günün slotlarını start_time'a göre sırala
    day_slots = (
        db.query(models.TimeSlots.id)
        .filter(models.TimeSlots.day_of_week == day)
        .order_by(models.TimeSlots.start_time.asc())
        .all()
    )
    ids = [r[0] for r in day_slots]

    try:
        idx = ids.index(start_time_slot_id)
    except ValueError:
        return None

    end_idx = idx + duration_slots
    if end_idx > len(ids):
        return None

    return ids[idx:end_idx]


def check_schedule_entry_conflicts_multi(
    db: Session,
    *,
    schedule_id: int,
    course_offering_id: int,
    hall_id: int,
    time_slot_id: int,
    duration_slots: int | None,
    week_pattern,
    exclude_entry_id: int | None = None,
):
    """
    Multi-slot çakışma kontrolü.
    - ok=True ise sorun yok
    - ok=False ise reason/message/conflict_entry_id döner
    """

    wp = _normalize_week_pattern(week_pattern)
    dur = _normalize_duration(duration_slots)

    offering = _get_offering_meta(db, course_offering_id)
    if not offering:
        return {"ok": True}

    instructor_id, program_class_id = offering

    term_id = _get_term_id_for_schedule(db, schedule_id)
    if term_id is None:
        return {"ok": True}

    hall = db.query(models.Halls).filter(models.Halls.id == hall_id).first()
    if not hall:
        return {"ok": True}

    chain = _get_timeslot_chain(db, time_slot_id, dur)
    if chain is None:
        return {
            "ok": False,
            "reason": "duration_out_of_range",
            "conflict_entry_id": None,
            "message": "Bu başlangıç saatinden itibaren istenen süre kadar ardışık time_slot yok.",
        }

    # Her slot için tek tek kontrol
    for ts_id in chain:
        base_q = (
            db.query(models.ScheduleEntries)
            .join(models.Schedules, models.ScheduleEntries.schedule_id == models.Schedules.id)
            .join(models.CourseOfferings, models.ScheduleEntries.course_offering_id == models.CourseOfferings.id)
            .filter(
                models.Schedules.term_id == term_id,
                models.ScheduleEntries.time_slot_id == ts_id,
                models.ScheduleEntries.week_pattern == wp,
            )
        )

        if exclude_entry_id is not None:
            base_q = base_q.filter(models.ScheduleEntries.id != exclude_entry_id)

        # 1) Shared hall ise term genelinde, değilse sadece aynı schedule içinde
        if hall.is_shared:
            c = base_q.filter(models.ScheduleEntries.hall_id == hall_id).first()
            if c:
                return {
                    "ok": False,
                    "reason": "shared_hall_conflict",
                    "conflict_entry_id": c.id,
                    "message": "Çakışma: Paylaşımlı derslik bu saat diliminde (term genelinde) dolu.",
                }
        else:
            c = base_q.filter(
                models.ScheduleEntries.schedule_id == schedule_id,
                models.ScheduleEntries.hall_id == hall_id,
            ).first()
            if c:
                return {
                    "ok": False,
                    "reason": "hall_conflict",
                    "conflict_entry_id": c.id,
                    "message": "Çakışma: Bu derslik aynı programda bu saat diliminde dolu.",
                }

        # 2) Instructor unavailability
        unavail = (
            db.query(models.InstructorUnavailability)
            .filter(
                models.InstructorUnavailability.term_id == term_id,
                models.InstructorUnavailability.instructor_id == instructor_id,
                models.InstructorUnavailability.time_slot_id == ts_id,
            )
            .first()
        )
        if unavail:
            return {
                "ok": False,
                "reason": "instructor_unavailable",
                "conflict_entry_id": None,
                "message": "Çakışma: Hoca bu saat diliminde müsait değil (unavailability).",
            }

        # 3) Instructor çakışması
        c = base_q.filter(models.CourseOfferings.instructor_id == instructor_id).first()
        if c:
            return {
                "ok": False,
                "reason": "instructor_conflict",
                "conflict_entry_id": c.id,
                "message": "Çakışma: Hoca bu saat diliminde başka bir derste.",
            }

        # 4) ProgramClass çakışması
        c = base_q.filter(models.CourseOfferings.program_class_id == program_class_id).first()
        if c:
            return {
                "ok": False,
                "reason": "program_class_conflict",
                "conflict_entry_id": c.id,
                "message": "Çakışma: Bu sınıf/şube bu saat diliminde başka bir derste.",
            }

    return {"ok": True}
