const API_URL = "http://127.0.0.1:8001/api";
let draggedData = null; 
let targetCellData = null; 
const user = JSON.parse(localStorage.getItem('user'));

// Global veri depoları
let dbHalls = [];
let dbTimeSlots = [];
let dbInstructorBusySlots = [];
let dbGlobalBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!user) return window.location.href = '../index.html';

    // 1. Backend verilerini çek
    await Promise.all([
        fetchHalls(),
        fetchTimeSlots(),
        fetchGlobalSchedule(),
        fetchInstructorBusy(),
        loadUnplannedCourses() // Kartları oluşturur ve sürüklemeyi bağlar
    ]);

    // Grid hücrelerine (bırakma alanlarına) olayları bağla
    initDropZones();
});

// --- 1. DERS KARTLARINI OLUŞTURMA ---
async function loadUnplannedCourses() {
    try {
        // Temsilcinin bölümüne ait teklif edilen dersleri getir
        const res = await fetch(`${API_URL}/course-offerings?program_class_id=${user.department_id}`);
        const offerings = await res.json();
        
        const listContainer = document.querySelector('.course-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        offerings.forEach(offering => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.draggable = true; // Sürüklemeyi aktif et
            
            // Backend için gerekli verileri dataset'e göm
            card.dataset.offeringId = offering.id;
            card.dataset.code = offering.course_name;
            card.dataset.instructor = offering.instructor_name;
            card.dataset.students = offering.student_count;

            card.innerHTML = `
                <div style="font-weight:700; color:var(--primary-blue);">${offering.course_name}</div>
                <div style="font-size:0.75rem; margin-top:4px;">👤 ${offering.instructor_name}</div>
                <div style="font-size:0.75rem; color:#666;">👥 ${offering.student_count} Öğrenci</div>
            `;

            // SÜRÜKLEME BAŞLADIĞINDA
            card.addEventListener('dragstart', (e) => {
                draggedData = { ...card.dataset };
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            
            listContainer.appendChild(card);
        });
    } catch (e) { console.error("Ders listesi yüklenemedi", e); }
}

// --- 2. BIRAKMA ALANLARINI (GRID) HAZIRLAMA ---
function initDropZones() {
    const dropZones = document.querySelectorAll('.grid-cell');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault(); // Bırakmaya izin ver
            zone.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');

            // Eğer hücrede zaten bir ders varsa bırakma
            if (zone.children.length > 0) return; 

            // Hedef hücre verilerini kaydet
            targetCellData = {
                day: zone.dataset.day, // HTML'de data-day="Mon" gibi olmalı
                time: zone.dataset.time, // data-time="08:30" gibi olmalı
                element: zone
            };

            openRoomModal(); // Sınıf seçim modalını aç
        });
    });
}

// --- 3. MODAL VE ÇAKIŞMA KONTROLÜ (Senin Kodun) ---
function openRoomModal() {
    const modal = document.getElementById('roomModal');
    const roomList = document.getElementById('roomList');
    if (!modal || !roomList) return;
    
    modal.classList.add('active');

    // Zaman dilimini bul
    const slot = dbTimeSlots.find(s => 
        mapDay(s.day_of_week) === targetCellData.day && 
        s.start_time.startsWith(targetCellData.time)
    );
    const timeSlotId = slot ? slot.id : null;

    roomList.innerHTML = '';

    dbHalls.forEach(room => {
        let status = 'success';
        let statusText = 'Uygun';
        let badgeClass = 'tag-green';

        // Kapasite Kontrolü
        if (parseInt(draggedData.students) > room.capacity) {
            status = 'error';
            statusText = `Kapasite Yetersiz (${room.capacity})`;
            badgeClass = 'tag-red';
        }

        // Doluluk Kontrolü
        const conflict = dbGlobalBookings.find(b => b.hall_id === room.id && b.time_slot_id === timeSlotId);
        if (conflict) {
            status = 'error';
            statusText = `DOLU: ${conflict.department_name}`;
            badgeClass = 'tag-red';
        }

        // Hoca Müsaitlik Kontrolü
        const hocaMesgul = dbInstructorBusySlots.find(un => 
            un.instructor_name === draggedData.instructor && un.time_slot_id === timeSlotId
        );

        const li = document.createElement('li');
        li.className = 'room-item';
        li.innerHTML = `
            <div class="room-info">
                <h4>${room.hall_name} <span style="font-size:0.7rem;">(${room.hall_type})</span></h4>
                <p>Kapasite: ${room.capacity}</p>
            </div>
            <div style="text-align:right;">
                <span class="tag ${badgeClass}">${statusText}</span>
                ${hocaMesgul ? '<br><span class="tag tag-orange">Hoca Müsait Değil</span>' : ''}
            </div>
        `;
        
        li.onclick = () => selectAndSaveRoom(room, timeSlotId, status, hocaMesgul);
        roomList.appendChild(li);
    });
}

// --- 4. VERİTABANINA KAYIT (POST) ---
async function selectAndSaveRoom(room, timeSlotId, status, hocaMesgul) {
    if (status === 'error' && !confirm("Çakışmaya rağmen kaydetmek istiyor musunuz?")) return;
    if (!timeSlotId) return alert("Zaman dilimi bulunamadı!");

    const payload = {
        schedule_id: 1, // Bu ID'yi backend'den dinamik alabilirsin
        course_offering_id: parseInt(draggedData.offeringId),
        hall_id: room.id,
        time_slot_id: timeSlotId,
        duration_slots: 1,
        week_pattern: "every_week"
    };

    try {
        const res = await fetch(`${API_URL}/schedule-entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            location.reload(); // Başarılıysa sayfayı yenile ve yerleşmiş halini gör
        } else {
            const err = await res.json();
            alert("Hata: " + err.detail);
        }
    } catch (e) { alert("Kaydetme sırasında sunucu hatası oluştu."); }
}

// Yardımcı Fonksiyonlar
function mapDay(dayNum) {
    const days = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
    return days[dayNum];
}

// Veri çekme fonksiyonları senin yazdığın gibi kalabilir...
async function fetchHalls() { const res = await fetch(`${API_URL}/halls/`); dbHalls = await res.json(); }
async function fetchTimeSlots() { const res = await fetch(`${API_URL}/time-slots`); dbTimeSlots = await res.json(); }
async function fetchGlobalSchedule() { const res = await fetch(`${API_URL}/schedule-entries`); dbGlobalBookings = await res.json(); }
async function fetchInstructorBusy() { const res = await fetch(`${API_URL}/instructor-unavailability`); dbInstructorBusySlots = await res.json(); }