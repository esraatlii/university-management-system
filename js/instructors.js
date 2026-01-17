const API_URL = "http://127.0.0.1:8001/api";
let currentInstructorId = null;

// GÜN SÖZLÜĞÜ
const dayMap = {
    "Mon": "Pazartesi", "Tue": "Salı", "Wed": "Çarşamba", "Thu": "Perşembe", "Fri": "Cuma"
};
const reverseDayMap = {
    "Pazartesi": "Mon", "Salı": "Tue", "Çarşamba": "Wed", "Perşembe": "Thu", "Cuma": "Fri"
};

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && document.getElementById('headerUserName')) {
        document.getElementById('headerUserName').innerText = user.full_name;
    }
    const addBtn = document.getElementById('openModalBtn');
    if(addBtn) addBtn.addEventListener('click', openAddInstructorModal);
    loadInstructors();
});

// --- MODAL ---
function openAddInstructorModal() {
    const modal = document.getElementById('addInstructorModal');
    const deptSelect = document.getElementById('deptSelect');
    if(modal) {
        modal.classList.add('active');
        deptSelect.innerHTML = `<option value="1">Bilgisayar Mühendisliği</option>`;
    }
}
window.closeModal = function(id) { document.getElementById(id).classList.remove('active'); }

// --- LİSTELEME ---
async function loadInstructors() {
    const tbody = document.getElementById('instructorsTableBody');
    try {
        const res = await fetch(`${API_URL}/instructors/`);
        const data = await res.json();
        tbody.innerHTML = '';
        data.forEach(inst => {
            const name = inst.full_name || `${inst.first_name} ${inst.last_name}`;
            tbody.innerHTML += `
            <tr>
                <td><span class="code-badge">${inst.title}</span></td>
                <td class="font-medium">${name}</td> 
                <td>${inst.department_name || '-'}</td>
                <td><span class="status-pill green">Aktif</span></td>
                <td style="text-align: right;">
                    <button class="btn-icon edit" onclick="openAvailabilityModal(${inst.id}, '${name}')">
                        <i class="fa-regular fa-calendar-xmark"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteInstructor(${inst.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    } catch (e) { console.error(e); }
}

// --- EKLEME ---
const addForm = document.getElementById('addInstructorForm');
if(addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            full_name: `${document.getElementById('firstNameInput').value} ${document.getElementById('lastNameInput').value}`,
            title: document.getElementById('titleSelect').value,
            email: document.getElementById('emailInput').value,
            home_department_id: 1
        };
        const res = await fetch(`${API_URL}/instructors/`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        if(res.ok) {
            const newInst = await res.json();
            closeModal('addInstructorModal');
            loadInstructors();
            if(confirm("Hoca eklendi! Müsaitlik girmek ister misiniz?")) openAvailabilityModal(newInst.id, newInst.full_name);
        }
    });
}

// --- MÜSAİTLİK GRID ---
async function openAvailabilityModal(id, name) {
    currentInstructorId = id;
    document.getElementById('availabilityInstructorName').innerText = name;
    document.getElementById('availabilityModal').classList.add('active');
    
    renderGrid(); 
    
    try {
        const res = await fetch(`${API_URL}/instructor-unavailability?instructor_id=${id}`);
        if(res.ok) {
            const data = await res.json();
            for (const record of data) {
                // Backend 'start_time' veya 'time_slot_id' yollayabilir
                let day = record.day; 
                let time = record.start_time;

                // TimeSlot detayı yoksa çekelim
                if (!time && record.time_slot_id) {
                     const tsRes = await fetch(`${API_URL}/time-slots/${record.time_slot_id}`);
                     if (tsRes.ok) {
                         const ts = await tsRes.json();
                         day = ts.day;
                         time = ts.start_time;
                     }
                }

                if (day && time) {
                    const dayShort = reverseDayMap[day]; 
                    const timeShort = time.substring(0, 5); // 09:30
                    const btn = document.querySelector(`.slot-btn[data-day="${dayShort}"][data-time="${timeShort}"]`);
                    if(btn) btn.classList.add('unavailable');
                }
            }
        }
    } catch(e) { console.error("Yükleme hatası", e); }
}

function renderGrid() {
    const grid = document.getElementById('availabilityGrid');
    grid.innerHTML = '';
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
    const hours = ['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30'];

    grid.appendChild(document.createElement('div'));
    dayLabels.forEach(d => {
        const div = document.createElement('div');
        div.className = 'day-header';
        div.innerText = d;
        grid.appendChild(div);
    });

    hours.forEach(time => {
        const tl = document.createElement('div');
        tl.className = 'time-label';
        tl.innerText = time;
        grid.appendChild(tl);
        days.forEach(day => {
            const btn = document.createElement('div');
            btn.className = 'slot-btn';
            btn.dataset.day = day;
            btn.dataset.time = time;
            btn.onclick = function() { this.classList.toggle('unavailable'); };
            grid.appendChild(btn);
        });
    });
}

// --- KAYDETME (İYİLEŞTİRİLMİŞ) ---
async function saveAvailability() {
    if(!currentInstructorId) return;
    
    const slots = [];
    document.querySelectorAll('.slot-btn.unavailable').forEach(btn => {
        const [h, m] = btn.dataset.time.split(':').map(Number);
        
        // Saatleri Backend formatına (HH:MM:SS) uygun hale getiriyoruz
        // Örn: "09:30" -> "09:30:00"
        const startTime = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:00`;
        const endTime = `${(h+1).toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:00`;

        slots.push({
            day: dayMap[btn.dataset.day], // Pazartesi
            start_time: startTime,        // 09:30:00
            end_time: endTime             // 10:30:00
        });
    });

    try {
        const res = await fetch(`${API_URL}/instructor-unavailability/batch-update`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                instructor_id: currentInstructorId, 
                unavailable_slots: slots 
            })
        });

        if(res.ok) {
            alert("Müsaitlik başarıyla kaydedildi! ✅");
            closeModal('availabilityModal');
        } else {
            // HATA VARSA DETAYINI GÖSTER
            const err = await res.json();
            alert("Kayıt Başarısız!\nSebep: " + JSON.stringify(err));
        }
    } catch(e) {
        alert("Bağlantı Hatası: Backend çalışıyor mu?\n" + e.message);
    }
}

window.deleteInstructor = async function(id) {
    if(confirm("Silmek istediğinize emin misiniz?")) {
        await fetch(`${API_URL}/instructors/${id}`, { method: 'DELETE' });
        loadInstructors();
    }
};