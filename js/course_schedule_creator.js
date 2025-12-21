// --- 1. SAHTE VERİTABANI (MOCK DATA) ---
const classrooms = [
    { id: 'Amphi-A', cap: 150, type: 'Amphi' },
    { id: 'Class-101', cap: 40, type: 'Class' },
    { id: 'Class-102', cap: 60, type: 'Class' },
    { id: 'LAB-204', cap: 30, type: 'Lab' },
    { id: 'LAB-305', cap: 30, type: 'Lab' }
];

const instructorConstraints = {
    'Dr. Mehmet Öz': ['Wed-10:30', 'Mon-09:30'],
    'Dr. Can Yıldız': ['Fri-15:30']
};

// YENİ: Diğer bölümlerin rezervasyonları (Çakışma Kontrolü için)
// Format: 'Gün-Saat': { 'SınıfID': 'Bölüm Adı' }
const externalBookings = {
    'Mon-08:30': { 'Amphi-A': 'Bilgisayar Müh.', 'Class-101': 'Endüstri Müh.' },
    'Tue-10:30': { 'LAB-204': 'Elektrik-Elektronik' },
    'Wed-09:30': { 'Amphi-A': 'Makine Müh.' }
};

let draggedData = null; 
let targetCellData = null; 

document.addEventListener('DOMContentLoaded', () => {
    const draggables = document.querySelectorAll('.course-card');
    const dropZones = document.querySelectorAll('.grid-cell');

    // SÜRÜKLEME BAŞLANGICI
    draggables.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedData = {
                code: item.dataset.code,
                name: item.dataset.name,
                instructor: item.dataset.instructor,
                students: parseInt(item.dataset.students)
            };
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => item.classList.remove('dragging'));
    });

    // BIRAKMA ALANLARI
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');

            if (zone.children.length > 0) return; 

            targetCellData = {
                day: zone.dataset.day,
                time: zone.dataset.time,
                element: zone
            };

            openRoomModal();
        });
    });
});

const modal = document.getElementById('roomModal');
const roomList = document.getElementById('roomList');

function openRoomModal() {
    modal.classList.add('active');
    document.getElementById('modalTitle').innerText = `${draggedData.code} için Sınıf Ata`;
    document.getElementById('modalCourseInfo').innerText = 
        `${draggedData.name} - ${draggedData.instructor} (${draggedData.students} Öğrenci)`;

    roomList.innerHTML = '';

    // O anki zaman dilimini al (Örn: "Mon-08:30")
    const timeKey = `${targetCellData.day}-${targetCellData.time}`;

    classrooms.forEach(room => {
        let status = 'success';
        let statusText = 'Uygun';
        let badgeClass = 'tag-green';
        let extraInfo = '';

        // 1. Kapasite Kontrolü
        if (draggedData.students > room.cap) {
            status = 'error';
            statusText = `Kapasite Yetersiz (${room.cap})`;
            badgeClass = 'tag-red';
        }

        // 2. Hoca Müsaitlik Kontrolü
        const busyTimes = instructorConstraints[draggedData.instructor] || [];
        let instructorWarning = false;
        if (busyTimes.includes(timeKey)) {
            instructorWarning = true;
        }

        // 3. (YENİ) DİĞER BÖLÜM ÇAKIŞMASI KONTROLÜ
        let externalConflict = null;
        if (externalBookings[timeKey] && externalBookings[timeKey][room.id]) {
            externalConflict = externalBookings[timeKey][room.id];
            status = 'error';
            statusText = `DOLU: ${externalConflict}`; // Örn: DOLU: Bilgisayar Müh.
            badgeClass = 'tag-red'; // Kırmızı etiket
        }

        const li = document.createElement('li');
        li.className = 'room-item';
        
        // HTML İçeriği
        li.innerHTML = `
            <div class="room-info">
                <h4>${room.id} <span style="font-weight:400; font-size:0.8rem;">(${room.type})</span></h4>
                <p>Kapasite: ${room.cap}</p>
            </div>
            <div style="text-align:right;">
                <span class="tag ${badgeClass}">${statusText}</span>
                ${instructorWarning ? '<br><span class="tag tag-orange" style="margin-top:4px; display:inline-block;">Hoca Müsait Değil</span>' : ''}
            </div>
        `;
        
        // Tıklama Olayı (Çakışma verisini de gönderiyoruz)
        li.onclick = () => selectRoom(room, status, instructorWarning, externalConflict);
        roomList.appendChild(li);
    });
}

function closeModal() { modal.classList.remove('active'); }

// --- DERSİ YERLEŞTİRME ---
function selectRoom(room, status, instructorBusy, externalConflict) {
    closeModal();

    let finalStatusClass = 'status-success';
    let errorMessage = '';

    // Hata tipine göre kart rengini ve mesajını ayarla
    if (externalConflict) {
        finalStatusClass = 'status-error';
        errorMessage = `<div style="font-size:0.7rem; color:#991B1B;">⛔ ${externalConflict}</div>`;
    } else if (status === 'error') {
        finalStatusClass = 'status-error';
        errorMessage = '<div style="font-size:0.7rem; color:#991B1B;">⚠️ Kapasite!</div>';
    } else if (instructorBusy) {
        finalStatusClass = 'status-warning';
        errorMessage = '<div style="font-size:0.7rem; color:#92400E;">🕒 Hoca Dolu</div>';
    }

    const newCard = document.createElement('div');
    newCard.className = `placed-card ${finalStatusClass}`;
    newCard.dataset.courseCode = draggedData.code; 

    newCard.innerHTML = `
        <div>
            <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:2px;">
                <span>${draggedData.code}</span>
                <span style="font-size:0.7rem; opacity:0.7;">${room.id}</span>
            </div>
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${draggedData.name}</div>
            ${errorMessage}
        </div>

        <div class="card-actions">
            <button class="action-btn btn-edit" title="Düzenle">✏️</button>
            <button class="action-btn btn-delete" title="Sil">🗑️</button>
        </div>
    `;

    // Silme İşlemi
    const btnDelete = newCard.querySelector('.btn-delete');
    btnDelete.onclick = function() {
        if(confirm('Dersi kaldırmak istiyor musunuz?')) {
            newCard.remove();
            const sidebarItem = document.querySelector(`.course-card[data-code="${newCard.dataset.courseCode}"]`);
            if (sidebarItem) {
                sidebarItem.style.display = 'block';
                sidebarItem.style.opacity = '1';
            }
            updateIssuesPanel();
        }
    };

    // Düzenleme İşlemi
    const btnEdit = newCard.querySelector('.btn-edit');
    btnEdit.onclick = function() {
        targetCellData = {
            day: newCard.parentElement.dataset.day,
            time: newCard.parentElement.dataset.time,
            element: newCard.parentElement
        };
        newCard.remove();
        openRoomModal();
    };

    targetCellData.element.appendChild(newCard);

    // Listeden Gizle
    const sidebarItem = document.querySelector(`.course-card[data-code="${draggedData.code}"]`);
    if (sidebarItem) {
        sidebarItem.style.display = 'none';
    }

    addIssueToPanel(draggedData, room, status, instructorBusy, externalConflict);
}

function addIssueToPanel(course, room, status, instBusy, extConflict) {
    const panel = document.getElementById('issues-container');
    if (panel.innerText.includes('Henüz bir sorun yok')) panel.innerHTML = '';

    // Diğer Bölüm Çakışması Hatası
    if (extConflict) {
        panel.innerHTML += `
            <div style="padding:10px; background:#FEF2F2; border:1px solid #EF4444; border-radius:6px; margin-bottom:8px; font-size:0.85rem;">
                <strong style="color:#991B1B">⛔ Oda Çakışması</strong><br>
                ${room.id}, <b>${extConflict}</b> tarafından kullanılıyor.
            </div>
        `;
        return; // Çakışma varsa diğer hataları yazmaya gerek yok
    }

    // Kapasite Hatası
    if (status === 'error') {
        panel.innerHTML += `
            <div style="padding:10px; background:#FEF2F2; border:1px solid #EF4444; border-radius:6px; margin-bottom:8px; font-size:0.85rem;">
                <strong style="color:#991B1B">🚫 Kapasite Hatası</strong><br>
                ${course.code} -> ${room.id} sınıfına sığmıyor.
            </div>
        `;
    }

    // Hoca Uyarısı
    if (instBusy) {
        panel.innerHTML += `
            <div style="padding:10px; background:#FFFBEB; border:1px solid #F59E0B; border-radius:6px; margin-bottom:8px; font-size:0.85rem;">
                <strong style="color:#92400E">⚠️ Hoca Uyarısı</strong><br>
                ${course.instructor}, bu saatte uygun görünmüyor.
            </div>
        `;
    }
}

function updateIssuesPanel() {
    // Panel temizleme mantığı buraya eklenebilir
}