from sqlalchemy.orm import Session
from backend import models
from backend.services.schedule_conflicts import check_schedule_entry_conflicts_multi


def generate_automated_schedule(db: Session, schedule_id: int):
    # 1. ADIM: Mevcut program (schedule) bilgilerini çek
    schedule = db.query(models.Schedules).filter(models.Schedules.id == schedule_id).first()
    if not schedule:
        return {"status": "error", "message": "Program bulunamadı"}

    # 2. ADIM: Temizlik (Aynı program için önceden oluşturulmuş kayıtlar varsa sil)
    db.query(models.ScheduleEntries).filter(models.ScheduleEntries.schedule_id == schedule_id).delete()

    # 3. ADIM: Verileri Topla (Dersler, Sınıflar, Saatler)
    # Courses tablosuna join yaparak dersin haftalık saatini (weekly_hours) de alıyoruz
    offerings = (
        db.query(
            models.CourseOfferings,
            models.Courses.weekly_hours.label("weekly_hours")
        )
        .join(models.Courses, models.Courses.id == models.CourseOfferings.course_id)
        .filter(models.CourseOfferings.term_id == schedule.term_id)
        # HATA BURADAYDI: department_id'yi CourseOfferings'ten değil, Courses'tan alıyoruz
        .filter(models.Courses.department_id == schedule.department_id)
        .all()
    )

    # Salonlar ve zaman dilimleri
    halls = db.query(models.Halls).filter(models.Halls.department_id == schedule.department_id).all()
    slots = db.query(models.TimeSlots).order_by(models.TimeSlots.day_of_week, models.TimeSlots.start_time).all()

    # 4. ADIM: Zorluk Sırasına Göre Diz (Öğrenci sayısı çok olan dersi önce yerleştir)
    # Not: offerings bir tuple listesi olduğu için x.CourseOfferings üzerinden erişiyoruz
    offerings = sorted(offerings, key=lambda x: x.CourseOfferings.student_count, reverse=True)

    results = {"placed": 0, "failed": 0, "failed_details": []}

    # 5. ADIM: Ana Döngü (Yerleştirme Başlıyor)
    for row in offerings:
        offering = row.CourseOfferings
        duration = row.weekly_hours
        is_placed = False

        # Her ders için uygun salonları tara
        for hall in halls:
            if is_placed: break

            # Kapasite kontrolü
            if offering.student_count > hall.capacity:
                continue

            # Her salon için boş saat dilimi tara
            for slot in slots:
                # çakışma kontrolünü çağırıyoruz
                conflict = check_schedule_entry_conflicts_multi(
                    db,
                    schedule_id=schedule_id,
                    course_offering_id=offering.id,
                    hall_id=hall.id,
                    time_slot_id=slot.id,
                    duration_slots=duration,
                    week_pattern=models.WeekPatterns.all
                )

                if conflict["ok"]:
                    # Eğer çakışma yoksa (ok: True), kaydı oluştur
                    new_entry = models.ScheduleEntries(
                        schedule_id=schedule_id,
                        course_offering_id=offering.id,
                        hall_id=hall.id,
                        time_slot_id=slot.id,
                        duration_slots=duration,
                        week_pattern=models.WeekPatterns.all
                    )
                    db.add(new_entry)
                    db.flush()
                    is_placed = True
                    results["placed"] += 1
                    break  # Bu ders için yer bulundu, slot döngüsünden çık

        if not is_placed:
            results["failed"] += 1
            results["failed_details"].append(f"Ders ID {offering.id} için yer bulunamadı.")

    # 6. ADIM: Değişiklikleri Kaydet
    db.commit()
    return results