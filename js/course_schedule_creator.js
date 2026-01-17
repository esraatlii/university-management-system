const API_URL = "http://127.0.0.1:8001/api";
const user = JSON.parse(localStorage.getItem('user'));

let draggedCourse = null;
let targetSlot = null;

let allOfferings = [];          
let allHalls = [];              
let existingSchedule = [];      
let instructorUnavailability = [];
let allTimeSlots = []; // YENİ: Zaman ID'lerini tutmak için

// Backend (1) -> Frontend (Mon) Haritası
const dayIntMap = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };
// Frontend (Mon) -> Backend (1) Haritası
const dayStrMap = { "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5 };

document.addEventListener('DOMContentLoaded', async () => {
    if (user) {
        const avatar = document.querySelector('.user-avatar');
        if(avatar) avatar.innerText = user.full_name.substring(0,2).toUpperCase();
    }
    console.log("🚀 Program Başlatılıyor...");
    await loadAllData();
    renderCourseList();
    initGridEvents();
});

async function loadAllData() {
    try {
        const [resOfferings, resHalls, resSched, resBusy, resSlots] = await Promise.all([
            fetch(`${API_URL}/course-offerings/`),        
            fetch(`${API_URL}/halls/`),                   
            fetch(`${API_URL}/schedule-entries`),         
            fetch(`${API_URL}/instructor-unavailability`),
            fetch(`${API_URL}/time_slots`) // YENİ: Zaman dilimlerini çekiyoruz
        ]);

        allOfferings = await resOfferings.json();
        allHalls = await resHalls.json();
        existingSchedule = await resSched.json();
        instructorUnavailability = await resBusy.json();
        allTimeSlots = await resSlots.json(); // Hafızaya al

    } catch (error) {
        console.error("❌ Veri yükleme hatası:", error);
    }
}

// --- YARDIMCI: GÜN ve SAATTEN -> TIME_SLOT_ID BULMA ---
function findTimeSlotId(dayStr, timeStr) {
    const dayInt = dayStrMap[dayStr]; // Mon -> 1
    // Backend'den gelen saat "08:30:00" formatında olabilir, biz "08:30" arıyoruz
    const slot = allTimeSlots.find(s => 
        s.day_of_week === dayInt && 
        s.start_time.startsWith(timeStr)
    );
    return slot ? slot.id : null;
}

function renderCourseList() {
    const container = document.getElementById('courseListContainer');
    container.innerHTML = '';
    if (allOfferings.length === 0) {
        container.innerHTML = '<p style="padding:20px; color:#666;">Ders bulunamadı.</p>';
        return;
    }
    allOfferings.forEach(offering => {
        const courseCode = offering.course_code || offering.course_name.split(' ')[0]; 
        const instructorName = offering.instructor_name || "Hoca Atanmamış";
        
        const card = document.createElement('div');
        card.className = 'course-card';
        card.draggable = true;
        
        card.dataset.offeringId = offering.id;
        card.dataset.courseId = offering.course_id;
        card.dataset.code = courseCode;
        card.dataset.name = offering.course_name;
        card.dataset.instructorId = offering.instructor_id;
        card.dataset.instructorName = instructorName;
        card.dataset.studentCount = offering.student_count || 0;

        card.innerHTML = `
            <div style="color:#2563EB; font-weight:700;">${courseCode}</div>
            <div style="font-size:0.9rem;">${offering.course_name}</div>
            <div style="font-size:0.75rem; color:#666;">
                <i class="fa-solid fa-users"></i> ${offering.student_count || 0} Öğrenci<br>
                ${instructorName}
            </div>
        `;

        card.addEventListener('dragstart', () => { 
            draggedCourse = { ...card.dataset }; 
            card.style.opacity = '0.5'; 
        });
        card.addEventListener('dragend', () => { card.style.opacity = '1'; });
        container.appendChild(card);
    });
}

function initGridEvents() {
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('drag-over'); });
        cell.addEventListener('dragleave', () => { cell.classList.remove('drag-over'); });
        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            if (cell.children.length > 0) { alert("Bu saat dolu!"); return; }
            targetSlot = { day: cell.dataset.day, time: cell.dataset.time, element: cell };
            openRoomSelectionModal();
        });
    });
}

function openRoomSelectionModal() {
    const modal = document.getElementById('roomModal');
    const list = document.getElementById('roomList');
    const info = document.getElementById('modalCourseInfo');
    const warningBox = document.getElementById('instructorWarning');

    if (!draggedCourse) return;
    modal.classList.add('active');
    
    const courseSize = parseInt(draggedCourse.studentCount) || 0;

    info.innerHTML = `
        <span style="color:#2563EB; font-weight:bold;">${draggedCourse.name}</span>
        <span class="tag tag-blue" style="font-size:0.7rem; margin-left:5px;">${courseSize} Öğrenci</span><br>
        <span style="font-size:0.9rem;">${draggedCourse.instructorName}</span><br>
        <span style="color:#666; font-size:0.8rem;">${targetSlot.day} - ${targetSlot.time}</span>
    `;

    list.innerHTML = '';
    
    const isInstructorBusy = instructorUnavailability.some(u => {
        return parseInt(u.instructor_id) === parseInt(draggedCourse.instructorId) &&
               dayIntMap[u.day_of_week] === targetSlot.day &&
               u.start_time.startsWith(targetSlot.time);
    });

    if (isInstructorBusy) {
        warningBox.style.display = 'block';
        warningBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <b>UYARI:</b> ${draggedCourse.instructorName} bu saatte MÜSAİT DEĞİL!`;
    } else {
        warningBox.style.display = 'none';
    }

    allHalls.forEach(hall => {
        const isRoomBooked = existingSchedule.some(s => s.hall_id === hall.id && s.day === targetSlot.day && s.start_time === targetSlot.time);
        const roomCap = parseInt(hall.capacity) || 0;
        const isCapacityLow = courseSize > roomCap;

        let statusHtml = '<span class="tag tag-green">Uygun</span>';
        let itemClass = 'room-item';
        let clickAction = () => placeCourse(hall);

        if (isRoomBooked) {
            statusHtml = '<span class="tag tag-red">DOLU</span>';
            itemClass += ' disabled';
            clickAction = null;
        } else if (isInstructorBusy) {
            statusHtml = '<span class="tag tag-orange">Hoca Meşgul</span>';
            clickAction = () => { if(confirm("Hoca müsait değil. Yine de atamak istiyor musunuz?")) placeCourse(hall); }
        } else if (isCapacityLow) {
            statusHtml = `<span class="tag tag-orange" style="background-color:#fff7ed; color:#c2410c;">Kapasite Yetersiz (${roomCap})</span>`;
            clickAction = () => { if(confirm("Kapasite yetersiz. Yine de atamak istiyor musunuz?")) placeCourse(hall); }
        }

        const li = document.createElement('li');
        li.className = itemClass;
        li.innerHTML = `<div><strong>${hall.hall_name}</strong> <span style="font-size:0.8rem;">(Kap: ${roomCap})</span></div>${statusHtml}`;
        if (clickAction) li.onclick = clickAction;
        list.appendChild(li);
    });
}

// --- MANUEL EKLEME ---
async function placeCourse(hall) {
    const tsId = findTimeSlotId(targetSlot.day, targetSlot.time);
    if(!tsId) { alert("Hata: Bu saat dilimi veritabanında bulunamadı!"); return; }

    const cell = targetSlot.element;
    cell.innerHTML = `
        <div class="placed-card">
            <div style="font-weight:bold; color:#1e3a8a;">${draggedCourse.code}</div>
            <div style="font-size:0.7rem;">${hall.hall_name}</div>
            <div style="font-size:0.65rem; color:#555;">${draggedCourse.instructorName}</div>
            <button class="remove-btn" onclick="removeScheduleItem(this)">×</button>
        </div>
    `;
    existingSchedule.push({ hall_id: hall.id, day: targetSlot.day, start_time: targetSlot.time, course_code: draggedCourse.code });

    await fetch(`${API_URL}/schedule-entries`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            course_offering_id: parseInt(draggedCourse.offeringId),
            hall_id: hall.id, 
            time_slot_id: tsId, // ARTIK ID GÖNDERİYORUZ
            week_pattern: "all" // Varsayılan değer
        })
    });
    closeModal();
}

// --- OTOMATİK OLUŞTURUCU ---
async function generateAutoScheduleFrontend() {
    if(!confirm("Bu işlem, yerleştirilmemiş dersleri otomatik olarak boşluklara dağıtacak.\n\nBaşlasın mı?")) return;

    const btn = document.querySelector('button[onclick="generateAutoScheduleFrontend()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Çalışıyor...';
    btn.disabled = true;

    try {
        await loadAllData();
        const placedCourseCodes = new Set(existingSchedule.map(s => s.course_code));
        const pendingCourses = allOfferings.filter(offering => {
            const code = offering.course_code || offering.course_name.split(' ')[0];
            return !placedCourseCodes.has(code);
        });

        if (pendingCourses.length === 0) { alert("Tüm dersler zaten yerleştirilmiş!"); return; }

        const sortedHalls = [...allHalls].sort((a, b) => (parseInt(a.capacity)||0) - (parseInt(b.capacity)||0));
        let placedCount = 0;
        let errors = [];

        for (const course of pendingCourses) {
            let isPlaced = false;
            const courseCode = course.course_code || course.course_name.split(' ')[0];
            const studentCount = parseInt(course.student_count) || 0;
            const instructorId = parseInt(course.instructor_id);

            loopDays: for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
                for (const time of ["08:30", "09:30", "10:30", "11:30", "13:30", "14:30", "15:30", "16:30"]) {
                    
                    // ID Bul
                    const tsId = findTimeSlotId(day, time);
                    if (!tsId) continue;

                    // Hoca Müsait mi?
                    const isInstructorBusy = instructorUnavailability.some(u => 
                        parseInt(u.instructor_id) === instructorId &&
                        dayIntMap[u.day_of_week] === day &&
                        u.start_time.startsWith(time)
                    );
                    if (isInstructorBusy) continue;

                    // Sınıf Bul
                    for (const hall of sortedHalls) {
                        const hallCap = parseInt(hall.capacity) || 0;
                        if (hallCap < studentCount) continue; 

                        const isRoomBusy = existingSchedule.some(s => 
                            s.hall_id === hall.id && s.day === day && s.start_time === time
                        );
                        if (isRoomBusy) continue;

                        // Kaydet
                        const res = await fetch(`${API_URL}/schedule-entries`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                course_offering_id: course.id,
                                hall_id: hall.id,
                                time_slot_id: tsId, // ID GÖNDERİYORUZ
                                week_pattern: "all"
                            })
                        });

                        if (res.ok) {
                            existingSchedule.push({ hall_id: hall.id, day: day, start_time: time, course_code: courseCode });
                            placedCount++;
                            isPlaced = true;
                            break loopDays;
                        } else {
                             const err = await res.json();
                             console.error(`❌ API Hatası (${courseCode}):`, err);
                        }
                    }
                }
            }
            if (!isPlaced) errors.push(courseCode);
        }

        let msg = `İşlem Tamamlandı!\nToplam ${placedCount} ders yerleştirildi.`;
        if (errors.length > 0) msg += `\n\nYerleşemeyenler:\n` + errors.join(", ");
        alert(msg);
        location.reload();

    } catch (e) {
        console.error(e);
        alert("Hata: " + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.removeScheduleItem = function(btn) { if(confirm("Silmek istediğinize emin misiniz?")) btn.parentElement.parentElement.innerHTML = ''; }
window.closeModal = function() { document.getElementById('roomModal').classList.remove('active'); }