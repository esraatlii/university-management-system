const API_URL = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', async function() {
    // 1. GİRİŞ KONTROLÜ VE HEADER GÜNCELLEME
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '../index.html'; // Giriş yoksa at
        return;
    }

    // Header Bilgilerini Güncelle (Unvansız, sadece İsim)
    const nameElement = document.querySelector('.user-info .name');
    if (nameElement) nameElement.innerText = user.full_name;

    const roleElement = document.querySelector('.user-info .role');
    if (roleElement) roleElement.innerText = "Admin"; // Rolü sabit Admin yazabiliriz veya user.role

    const avatarElement = document.querySelector('.user-profile .avatar');
    if (avatarElement) {
        // İsim baş harflerini al (Örn: Sena Yılmaz -> SY)
        avatarElement.innerText = user.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    }

    // Dashboard'daki "Hoşgeldin [İsim]" Kısmı
    const welcomeHeader = document.querySelector('.welcome-text h3');
    if (welcomeHeader) {
        welcomeHeader.innerText = `Hoşgeldin, ${user.full_name}`;
    }

    // 2. SAYFAYA GÖRE FONKSİYONLARI ÇALIŞTIR
    const path = window.location.pathname;

    if (path.includes('admin_dashboard.html') || path.endsWith('/admin/')) {
        await initAdminDashboard();
        initAvailabilityGrid();
    } else if (path.includes('user_add.html')) {
        await initUserAddPage();
    } else if (path.includes('department_identification.html')) {
        await initDepartmentPage();
    }
});

// ==========================================
// 1. DASHBOARD VERİLERİ (SAHTE VERİ YOK)
// ==========================================
async function initAdminDashboard() {
    try {
        // Paralel olarak Kullanıcıları ve Bölümleri çek
        const [usersRes, deptsRes] = await Promise.all([
            fetch(`${API_URL}/users/`),
            fetch(`${API_URL}/departments/`)
        ]);

        const users = await usersRes.json();
        const departments = await deptsRes.json();

        // --- İSTATİSTİK KARTLARI ---
        const stats = document.querySelectorAll('.stat-number');
        if (stats.length >= 4) {
            stats[0].innerText = users.length; // Toplam Kullanıcı
            stats[1].innerText = departments.length; // Aktif Bölüm
            stats[2].innerText = users.filter(u => u.role === 'department_rep').length; // Temsilciler
            stats[3].innerText = users.filter(u => u.role === 'dean' || u.role === 'admin').length; // Yöneticiler
        }

        // --- SON KAYIT OLANLAR TABLOSU ---
        const tableBody = document.querySelector('.users-table tbody');
        if (tableBody) {
            tableBody.innerHTML = ''; // Temizle

            if (users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Kayıtlı kullanıcı yok.</td></tr>';
                return;
            }

            // Son 5 kullanıcıyı gösterelim (ters çevirip kesiyoruz)
            const recentUsers = users.slice().reverse().slice(0, 10);

            recentUsers.forEach(u => {
                // Rol Renklendirme
                let roleBadge = 'badge-blue';
                if (u.role === 'admin') roleBadge = 'badge-orange';
                if (u.role === 'dean') roleBadge = 'badge-purple';

                // Bölüm Adını Bul (users endpoint'inde department_id dönerse eşleştirme gerekebilir)
                // Şimdilik backend'in department_name döndürdüğünü varsayıyoruz veya '-' koyuyoruz.
                let deptName = u.department_name || '-';
                if (!u.department_name && u.department_id) {
                    const d = departments.find(dep => dep.id === u.department_id);
                    if (d) deptName = d.name;
                }

                const row = `
                    <tr>
                        <td>${u.full_name}</td>
                        <td><span class="badge ${roleBadge}">${u.role}</span></td>
                        <td class="department">${deptName}</td>
                        <td class="registerDate">${new Date(u.created_at || Date.now()).toLocaleDateString('tr-TR')}</td>
                        <td><span class="badge badge-green">Aktif</span></td>
                        <td style="text-align: center;">
                            <button class="btn-availability" onclick="openModal('${u.full_name}')">
                                <i class="fa-regular fa-calendar-xmark"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }

    } catch (error) {
        console.error("Dashboard verileri yüklenemedi:", error);
    }
}

// ==========================================
// 2. KULLANICI EKLEME SAYFASI
// ==========================================
async function initUserAddPage() {
    const roleSelect = document.getElementById('role'); 
    const deptSelect = document.getElementById('department');
    const saveBtn = document.querySelector('.createBtn'); 
    
    // Bölümleri Çek ve Select'e Doldur
    try {
        const res = await fetch(`${API_URL}/departments/`);
        const depts = await res.json();
        
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">Lütfen Seçiniz...</option>' + 
                depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        }
    } catch (e) { console.error("Bölümler yüklenemedi"); }

    // Rol değişince Bölüm alanını aç/kapat
    if (roleSelect && deptSelect) {
        roleSelect.addEventListener('change', function() {
            // Sadece 'department_rep' (Öğretim Görevlisi/Temsilci) bölüm seçebilir
            if (this.value === 'dekan' || this.value === 'admin') {
                deptSelect.setAttribute('disabled', 'true');
                deptSelect.value = ""; 
            } else {
                deptSelect.removeAttribute('disabled');
            }
        });
    }

    // Kaydet Butonu
    if (saveBtn) {
        saveBtn.addEventListener('click', async function(e) {
            e.preventDefault(); 
            
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const roleValue = roleSelect.value;
            const password = document.getElementById('temp-password').value || "123456"; // Boşsa varsayılan

            // Backend Enum değerlerine çevir
            let backendRole = "department_rep"; // Varsayılan
            if (roleValue === "admin") backendRole = "admin";
            if (roleValue === "dekan") backendRole = "dean";
            // Not: HTML value'su '1' ise department_rep olarak kalır

            const payload = {
                full_name: fullname,
                email: email,
                role: backendRole,
                password: password,
                department_id: (backendRole === "department_rep" && deptSelect.value) ? parseInt(deptSelect.value) : null
            };

            try {
                const response = await fetch(`${API_URL}/users/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert("Kullanıcı başarıyla oluşturuldu!");
                    document.querySelector('.userAdd-form').reset();
                } else {
                    const err = await response.json();
                    alert("Hata: " + (err.detail || JSON.stringify(err)));
                }
            } catch (err) { 
                console.error(err);
                alert("Sunucu hatası!"); 
            }
        });
    }
}

// ==========================================
// 3. BÖLÜM YÖNETİMİ SAYFASI
// ==========================================
async function initDepartmentPage() {
    const tableBody = document.querySelector('.department-table tbody');
    const addBtn = document.querySelector('.addNewDepartmentBtn');

    // Tabloyu Doldur
    async function loadDepts() {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        try {
            const res = await fetch(`${API_URL}/departments/`);
            const depts = await res.json();
            
            depts.forEach(d => {
                const row = `
                    <tr>
                        <td><span class="code-badge">${d.code || 'CODE'}</span></td>
                        <td class="font-medium">${d.name}</td>
                        <td>${new Date().toLocaleDateString('tr-TR')}</td>
                        <td class="actions">
                            <div class="action-icons">
                                <i class="fa-regular fa-trash-can" onclick="deleteDept(${d.id})" style="color:red;"></i>
                            </div>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (e) { console.error("Bölüm listesi hatası"); }
    }

    await loadDepts();

    // Yeni Bölüm Ekle
    if (addBtn) {
        addBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            const name = document.getElementById('departmentName').value;
            const code = document.getElementById('departmentCode').value;

            if (!name || !code) return alert("Lütfen tüm alanları doldurun.");

            try {
                const res = await fetch(`${API_URL}/departments/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, code: code.toUpperCase() }) // code ekledim
                });

                if (res.ok) {
                    alert("Bölüm eklendi.");
                    document.querySelector('.addNewDepartmentForm').reset();
                    loadDepts();
                } else {
                    alert("Ekleme başarısız.");
                }
            } catch (e) { console.error(e); }
        });
    }

    // Silme Fonksiyonu (Global'e atıyoruz ki HTML onclick görebilsin)
    window.deleteDept = async function(id) {
        if (!confirm("Bu bölümü silmek istediğinize emin misiniz?")) return;
        try {
            const res = await fetch(`${API_URL}/departments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Bölüm silindi.");
                loadDepts();
            } else {
                alert("Silinemedi.");
            }
        } catch (e) { console.error(e); }
    };
}

// ==========================================
// 4. MÜSAİTLİK GRID (GÖRSEL ARAYÜZ)
// ==========================================
let modal, gridContainer, modalTitle;

function initAvailabilityGrid() {
    modal = document.getElementById('availabilityModal');
    gridContainer = document.getElementById('gridContainer');
    modalTitle = document.getElementById('modalTitle');

    if (!modal || !gridContainer) return;

    // Saatler ve Günler
    const hours = ['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];

    gridContainer.innerHTML = ''; 

    // Grid Header (Gün İsimleri)
    gridContainer.appendChild(document.createElement('div')); // Sol üst boş köşe
    dayLabels.forEach(d => {
        const dh = document.createElement('div');
        dh.className = 'day-header';
        dh.innerText = d;
        gridContainer.appendChild(dh);
    });

    // Grid Body (Saatler ve Kutular)
    hours.forEach(time => {
        // Saat Etiketi
        const tl = document.createElement('div');
        tl.className = 'time-label';
        tl.innerText = time;
        gridContainer.appendChild(tl);

        // 5 Gün İçin Kutular
        days.forEach(day => {
            const btn = document.createElement('div');
            btn.className = 'slot-btn';
            btn.dataset.day = day;
            btn.dataset.time = time;
            
            // Tıklayınca Kırmızı Yap / Kaldır
            btn.onclick = function() {
                this.classList.toggle('unavailable');
            };

            gridContainer.appendChild(btn);
        });
    });
}

// Modalı Açma Kapama Fonksiyonları
window.openModal = function(name) {
    if (modalTitle) modalTitle.innerText = `${name} - Müsaitlik Ayarları`;
    // Önce hepsini temizle (İleride backend'den çekip doluları işaretleyeceğiz)
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('unavailable'));
    
    if (modal) modal.classList.add('active');
};

window.closeModal = function() {
    if (modal) modal.classList.remove('active');
};