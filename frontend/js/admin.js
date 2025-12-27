// --- BACKEND BAĞLANTISI ---
const API_URL = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;

    if (path.includes('user_add.html')) {
        initUserAddPage();
    }

    if (path.includes('department_identification.html')) {
        initDepartmentPage();
    }

    if (path.includes('admin_dashboard.html') || path.endsWith('/admin/')) {
        initAdminDashboard();
        initAvailabilityGrid(); // Grid yapısını kur
    }
});

// ==========================================
// 1. KULLANICI EKLEME (BACKEND BAĞLANTILI)
// ==========================================
async function initUserAddPage() {
    const roleSelect = document.getElementById('role'); 
    const deptSelect = document.getElementById('department');
    const saveBtn = document.querySelector('.createBtn'); 
    
    if (!roleSelect || !deptSelect) return;

    try {
        const res = await fetch(`${API_URL}/departments/`);
        const depts = await res.json();
        deptSelect.innerHTML = '<option value="">Lütfen Seçiniz...</option>' + 
            depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    } catch (e) { console.error("Bölümler yüklenemedi"); }

    roleSelect.addEventListener('change', function() {
        if (this.value === 'dekan' || this.value === 'admin') {
            deptSelect.setAttribute('disabled', 'true');
            deptSelect.value = ""; 
        } else {
            deptSelect.removeAttribute('disabled');
        }
    });

    if(saveBtn) {
        saveBtn.addEventListener('click', async function(e) {
            e.preventDefault(); 
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const roleValue = roleSelect.value;
            const password = document.getElementById('temp-password').value || "password123";

            let backendRole = roleValue === "admin" ? "admin" : (roleValue === "dekan" ? "dean" : "department_rep");

            const payload = {
                full_name: fullname,
                email: email,
                role: backendRole,
                password: password,
                department_id: (backendRole === "department_rep") ? parseInt(deptSelect.value) : null
            };

            try {
                const response = await fetch(`${API_URL}/users/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    alert("Kullanıcı başarıyla eklendi!");
                    document.querySelector('.userAdd-form').reset();
                } else {
                    const error = await response.json();
                    alert("Hata: " + (error.detail || "Kayıt yapılamadı"));
                }
            } catch (err) { alert("Sunucu hatası!"); }
        });
    }
}

// ==========================================
// 2. DASHBOARD (GERÇEK VERİLER)
// ==========================================
async function initAdminDashboard() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.querySelector('.userInfoName').innerText = user.full_name;
        document.querySelector('.userInfoRole').innerText = user.role.toUpperCase();
        document.querySelector('.user-profile-circle').innerText = user.full_name.charAt(0);
    }

    try {
        const [uRes, dRes] = await Promise.all([
            fetch(`${API_URL}/users/`),
            fetch(`${API_URL}/departments/`)
        ]);
        const users = await uRes.json();
        const departments = await dRes.json();

        const stats = document.querySelectorAll('.stat-number');
        stats[0].innerText = users.length;
        stats[1].innerText = departments.length;
        stats[2].innerText = users.filter(u => u.role === 'department_rep').length;
        stats[3].innerText = users.filter(u => u.role === 'admin').length;

        const tableBody = document.querySelector('.users-table tbody');
        tableBody.innerHTML = '';
        users.forEach(u => {
            const row = `<tr><td>${u.full_name}</td><td><span class="badge badge-blue">${u.role}</span></td><td>${u.department_name || '-'}</td><td>Yeni</td><td><span class="badge badge-green">Aktif</span></td><td style="text-align: center;"><button class="btn-availability" onclick="openModal('${u.full_name}')"><i class="fa-regular fa-calendar-xmark"></i></button></td></tr>`;
            tableBody.innerHTML += row;
        });
    } catch (e) { console.error("Veri yükleme hatası"); }
}

// ==========================================
// 3. BÖLÜM YÖNETİMİ
// ==========================================
function initDepartmentPage() {
    const addBtn = document.querySelector('.addNewDepartmentBtn');
    const tableBody = document.querySelector('.department-table tbody');
    if (!addBtn || !tableBody) return;
    addBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const deptName = document.getElementById('departmentName').value;
        const deptCode = document.getElementById('departmentCode').value;
        if(deptName && deptCode) {
            const row = `<tr><td><span class="badge badge-blue">${deptCode.toUpperCase()}</span></td><td>${deptName}</td><td>${new Date().toLocaleDateString('tr-TR')}</td><td class="actions"><div class="action-icons"><i class="fa-regular fa-trash-can" onclick="deleteRow(this)"></i></div></td></tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
            document.querySelector('.addNewDepartmentForm').reset();
        }
    });
}

// =========================================================
// --- YENİ EKLENEN ÖZELLİK: MÜSAİTLİK GRIDİ (İŞARETLEME DAHİL) ---
// =========================================================
let modal, gridContainer, modalTitle;

function initAvailabilityGrid() {
    modal = document.getElementById('availabilityModal');
    gridContainer = document.getElementById('gridContainer');
    modalTitle = document.getElementById('modalTitle');

    if (!modal || !gridContainer) return;

    const hours = ['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];

    gridContainer.innerHTML = ''; // Temizle

    // Başlık Satırı
    gridContainer.appendChild(document.createElement('div')); // Köşe boşluğu
    dayLabels.forEach(d => {
        const dh = document.createElement('div');
        dh.className = 'day-header';
        dh.innerText = d;
        gridContainer.appendChild(dh);
    });

    // Saatler ve Tıklanabilir Kutular
    hours.forEach(time => {
        const tl = document.createElement('div');
        tl.className = 'time-label';
        tl.innerText = time;
        gridContainer.appendChild(tl);

        days.forEach(day => {
            const btn = document.createElement('div');
            btn.className = 'slot-btn';
            btn.dataset.day = day;
            btn.dataset.time = time;
            
            // İŞARETLEME MANTIĞI BURADA:
            btn.onclick = function() {
                this.classList.toggle('unavailable');
            };

            gridContainer.appendChild(btn);
        });
    });
}

window.openModal = function(name) {
    if(modalTitle) modalTitle.innerText = `${name} - Müsaitlik Ayarları`;
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('unavailable'));
    if(modal) modal.classList.add('active');
};

window.closeModal = function() {
    if(modal) modal.classList.remove('active');
};

window.deleteRow = function(btn) { if(confirm("Silmek istiyor musunuz?")) btn.closest('tr').remove(); };