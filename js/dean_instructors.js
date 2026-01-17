const API_URL = "http://127.0.0.1:8001/api";
let currentInstructorId = null;
let allDepartments = []; // Bölümleri hafızada tutmak için

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && document.getElementById('headerUserName')) {
        document.getElementById('headerUserName').innerText = user.full_name;
    }

    const addBtn = document.getElementById('openModalBtn');
    if(addBtn) addBtn.addEventListener('click', openAddInstructorModal);

    // Fakülte seçilince bölümleri filtrele
    const facSelect = document.getElementById('facultySelect');
    if(facSelect) {
        facSelect.addEventListener('change', filterDepartments);
    }

    loadInstructors();
});

// --- LİSTELEME ---
async function loadInstructors() {
    const tbody = document.getElementById('instructorsTableBody');
    try {
        const res = await fetch(`${API_URL}/instructors/`);
        const data = await res.json();
        
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Kayıt bulunamadı.</td></tr>';
            return;
        }

        data.forEach(inst => {
            const displayName = inst.full_name || inst.name || "İsimsiz";
            const deptDisplay = inst.department_name || (inst.home_department_id ? `Bölüm ID: ${inst.home_department_id}` : '-');

            tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:15px;"><span style="background:#eff6ff; color:#2563eb; padding:4px 8px; border-radius:6px; font-size:0.85rem; font-weight:600;">${inst.title}</span></td>
                <td style="padding:15px; font-weight:600; color:#333;">${displayName}</td>
                <td style="padding:15px; color:#555;">${deptDisplay}</td>
                <td style="padding:15px; color:green; font-weight:500;">Aktif</td>
                <td style="padding:15px; text-align: right;">
                    <button style="border:none; background:none; cursor:pointer; color:#2563eb; margin-right:10px;" onclick="openAvailabilityModal(${inst.id}, '${displayName}')" title="Müsaitlik">
                        <i class="fa-regular fa-calendar-xmark" style="font-size:1.1rem;"></i>
                    </button>
                    <button style="border:none; background:none; cursor:pointer; color:#ef4444;" onclick="deleteInstructor(${inst.id})" title="Sil">
                        <i class="fa-solid fa-trash" style="font-size:1.1rem;"></i>
                    </button>
                </td>
            </tr>`;
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Bağlantı Hatası</td></tr>';
    }
}

// --- MODAL & VERİ ÇEKME ---
async function openAddInstructorModal() {
    document.getElementById('addInstructorModal').classList.add('active');
    
    // 1. Önce Fakülteleri ve Bölümleri Çek
    await loadFacultiesAndDepartments();
}

async function loadFacultiesAndDepartments() {
    const facultySelect = document.getElementById('facultySelect');
    const deptSelect = document.getElementById('deptSelect');

    try {
        // API'den Fakülteleri Çek
        const resFac = await fetch(`${API_URL}/faculties/`); 
        if (resFac.ok) {
            const faculties = await resFac.json();
            facultySelect.innerHTML = '<option value="">Fakülte Seçiniz...</option>';
            faculties.forEach(f => {
                facultySelect.innerHTML += `<option value="${f.id}">${f.name}</option>`;
            });
        } else {
            console.warn("Fakülteler çekilemedi veya API yok.");
            facultySelect.innerHTML = '<option value="">Fakülte API Yok</option>';
        }

        // API'den Bölümleri Çek
        const resDept = await fetch(`${API_URL}/departments/`);
        if (resDept.ok) {
            allDepartments = await resDept.json();
            // Başlangıçta hepsini yükle (Fakülte seçimi zorunlu değilse)
            populateDepartments(allDepartments);
        }

    } catch (e) {
        console.error("Veri yükleme hatası:", e);
    }
}

function filterDepartments() {
    const selectedFacId = document.getElementById('facultySelect').value;
    const deptSelect = document.getElementById('deptSelect');

    if (!selectedFacId) {
        // Fakülte seçili değilse hepsini göster
        populateDepartments(allDepartments);
        return;
    }

    // Seçilen fakülteye ait bölümleri filtrele
    // (Backend department objesinde 'faculty_id' olduğunu varsayıyoruz)
    const filtered = allDepartments.filter(d => d.faculty_id == selectedFacId);
    
    if (filtered.length > 0) {
        populateDepartments(filtered);
    } else {
        deptSelect.innerHTML = '<option value="">Bu fakültede bölüm yok</option>';
    }
}

function populateDepartments(depts) {
    const deptSelect = document.getElementById('deptSelect');
    deptSelect.innerHTML = '<option value="">Bölüm Seçiniz...</option>';
    depts.forEach(d => {
        deptSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
    });
}

// --- KAYDETME ---
document.getElementById('addInstructorForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        full_name: `${document.getElementById('firstNameInput').value.trim()} ${document.getElementById('lastNameInput').value.trim()}`,
        title: document.getElementById('titleSelect').value,
        email: document.getElementById('emailInput').value.trim(),
        home_department_id: parseInt(document.getElementById('deptSelect').value)
    };

    try {
        const res = await fetch(`${API_URL}/instructors/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            const newInst = await res.json();
            closeModal('addInstructorModal');
            document.getElementById('addInstructorForm').reset();
            loadInstructors();
            if(confirm("Hoca eklendi! Müsaitlik girmek ister misiniz?")) {
                openAvailabilityModal(newInst.id, newInst.full_name);
            }
        } else {
            const err = await res.json();
            alert("Hata: " + JSON.stringify(err.detail));
        }
    } catch(err) { alert("Sunucu hatası."); }
});

// --- MÜSAİTLİK VE DİĞERLERİ ---
function openAvailabilityModal(id, name) {
    currentInstructorId = id;
    document.getElementById('availabilityInstructorName').innerText = name;
    document.getElementById('availabilityModal').classList.add('active');
    renderGrid();
    loadInstructorAvailability(id);
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

async function loadInstructorAvailability(id) {
    try {
        const res = await fetch(`${API_URL}/instructor-unavailability?instructor_id=${id}`);
        if(res.ok) {
            const data = await res.json();
            data.forEach(slot => {
                const btn = document.querySelector(`.slot-btn[data-day="${slot.day}"][data-time="${slot.start_time}"]`);
                if(btn) btn.classList.add('unavailable');
            });
        }
    } catch(e) {}
}

async function saveAvailability() {
    if(!currentInstructorId) return;
    const slots = [];
    document.querySelectorAll('.slot-btn.unavailable').forEach(btn => {
        slots.push({ day: btn.dataset.day, start_time: btn.dataset.time, end_time: "00:00" });
    });

    await fetch(`${API_URL}/instructor-unavailability/batch-update`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ instructor_id: currentInstructorId, unavailable_slots: slots })
    });
    alert("Güncellendi!");
    closeModal('availabilityModal');
}

window.closeModal = function(id) { document.getElementById(id).classList.remove('active'); }
window.deleteInstructor = async function(id) {
    if(!confirm("Silmek istediğinize emin misiniz?")) return;
    await fetch(`${API_URL}/instructors/${id}`, { method: 'DELETE' });
    loadInstructors();
};