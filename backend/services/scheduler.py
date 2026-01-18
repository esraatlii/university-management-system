from sqlalchemy.orm import Session
from backend import models
from backend.services.schedule_conflicts import check_schedule_entry_conflicts_multi
from sqlalchemy import or_

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

    # Planlama yapılan bölümün fakülte bilgisini al
    dept = db.query(models.Departments).filter(models.Departments.id == schedule.department_id).first()
    target_faculty_id = dept.faculty_id

    # Sadece aynı fakültedeki sınıfları getir:
    # 1. Ya direkt benim bölümümün sınıfı olacak
    # 2. Ya da benim fakültemde olan paylaşımlı (shared) bir sınıf olacak
    halls = db.query(models.Halls).filter(
        models.Halls.faculty_id == target_faculty_id,
        or_(
            models.Halls.department_id == schedule.department_id,
            models.Halls.is_shared == True
        )
    ).all()

    halls = sorted(halls,key=lambda x: (x.department_id != schedule.department_id)) #false dönecği için 0 olur ve bölümün kendi sınıfları listenin başına gelir

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
        last_reason = "Kapasite yetersiz veya uygun tipte sınıf yok"  # Başlangıç sebebi

        # Her ders için uygun salonları tara
        for hall in halls:
            if is_placed: break

            # Eğer ders Lab ise sadece Lab tipindeki sınıfları dene
            if offering.course_type == models.CourseType.lab:
                if hall.hall_type != models.HallType.lab:
                    continue
            else:
                if hall.hall_type == models.HallType.lab:
                    continue

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

                else:
                    last_reason = conflict["message"]

        if not is_placed:
            course_info = db.query(models.Courses).filter(models.Courses.id == offering.course_id).first()
            results["failed_details"].append({
                "course_id": offering.id,
                "course_code": course_info.code if course_info else "Bilinmiyor",
                "course_name": course_info.name if course_info else "Bilinmiyor",
                "reason": last_reason
            })

    # 6. ADIM: Değişiklikleri Kaydet
    db.commit()
    return results