document.addEventListener('DOMContentLoaded', function() {
    
    // Hangi sayfada olduğumuzu anlayalım
    const path = window.location.pathname;

    /* --- 1. KULLANICI EKLEME SAYFASI (user_add.html) --- */
    if (path.includes('user_add.html')) {
        initUserAddPage();
    }

    /* --- 2. BÖLÜM YÖNETİMİ SAYFASI (department_identification.html) --- */
    if (path.includes('department_identification.html')) {
        initDepartmentPage();
    }

    /* --- 3. KULLANICI LİSTESİ / DASHBOARD (admin_dashboard.html) --- */
    if (path.includes('admin_dashboard.html') || path.endsWith('/admin/')) {
        initAdminDashboard();
        
        // --- YENİ EKLENEN: Müsaitlik Gridini Başlat ---
        initAvailabilityGrid();
    }

});

// ==========================================
// 1. KULLANICI EKLEME SAYFASI İŞLEMLERİ
// ==========================================
function initUserAddPage() {
    const roleSelect = document.getElementById('role'); 
    const deptSelect = document.getElementById('department');
    const saveBtn = document.querySelector('.createBtn'); 
    
    if (!roleSelect || !deptSelect) return;

    // Rol değişince Bölüm seçimini aç/kapat
    roleSelect.addEventListener('change', function() {
        if (this.value === '1') {
            deptSelect.removeAttribute('disabled');
        } else {
            deptSelect.setAttribute('disabled', 'true');
            deptSelect.value = ""; 
        }
    });

    // KAYDET BUTONU
    if(saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault(); 
            
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const roleSelect = document.getElementById('role');
            const roleText = roleSelect.options[roleSelect.selectedIndex].text;
            
            if(fullname === "" || email === "" || roleSelect.value === "") {
                alert("Lütfen isim, e-posta ve rol alanlarını doldurunuz.");
                return;
            }

            const newUser = {
                id: Date.now(),
                name: fullname,
                email: email,
                role: roleText,
                date: new Date().toLocaleDateString('tr-TR'),
                status: "Aktif"
            };

            let users = JSON.parse(localStorage.getItem('users')) || [];
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            alert("Kullanıcı başarıyla oluşturuldu ve listeye eklendi!");
            document.querySelector('.userAdd-form').reset();
            deptSelect.setAttribute('disabled', 'true');
        });
    }
}

// ==========================================
// 2. KULLANICI LİSTESİ (DASHBOARD) İŞLEMLERİ
// ==========================================
function initAdminDashboard() {
    // --- NOT: Tablo yapın statik HTML olduğu için LocalStorage kısmını YORUMA ALDIM.
    // Eğer veriler LocalStorage'dan gelsin istiyorsan burayı açabilirsin.
    // Şimdilik sadece yeni özellik olan Modal Grid'i çalıştırıyoruz.

    /*
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;

    let users = JSON.parse(localStorage.getItem('users'));

    if (!users || users.length === 0) {
        users = [
            { id: 1, name: "Ahmet Yılmaz", role: "Dekan", email: "ahmet@uni.edu.tr", date: "10.12.2024", status: "Aktif" },
            { id: 2, name: "Ayşe Demir", role: "Öğretim Görevlisi", email: "ayse@uni.edu.tr", date: "11.12.2024", status: "Aktif" }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }
    */
    // Mevcut statik tablon korunduğu için buraya dokunmuyoruz.
}

// ==========================================
// 3. BÖLÜM YÖNETİMİ İŞLEMLERİ
// ==========================================
function initDepartmentPage() {
    const addBtn = document.querySelector('.addNewDepartmentBtn');
    const tableBody = document.querySelector('.department-table tbody');

    if (!addBtn || !tableBody) return;

    addBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const deptName = document.getElementById('departmentName').value;
        const deptCode = document.getElementById('departmentCode').value;

        if(deptName === "" || deptCode === "") {
            alert("Eksik bilgi!"); 
            return;
        }

        const today = new Date().toLocaleDateString('tr-TR');
        const newRow = `
            <tr>
                <td><span class="badge badge-blue">${deptCode.toUpperCase()}</span></td>
                <td>${deptName}</td>
                <td>${today}</td>
                <td class="actions">
                    <div class="action-icons">
                        <i class="fa-regular fa-trash-can" onclick="deleteRow(this)"></i>
                    </div>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', newRow);
        document.querySelector('.addNewDepartmentForm').reset();
    });
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
}

window.deleteUser = function(id) {
    if(confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        users = users.filter(user => user.id != id);
        localStorage.setItem('users', JSON.stringify(users));
        location.reload();
    }
}

window.deleteRow = function(btn) {
    if(confirm("Silmek istiyor musunuz?")) {
        btn.closest('tr').remove();
    }
}


// =========================================================
// --- YENİ EKLENEN ÖZELLİK: HOCA MÜSAİTLİK MODALI ---
// =========================================================

// Global değişkenler
let modal, gridContainer, modalTitle;

function initAvailabilityGrid() {
    modal = document.getElementById('availabilityModal');
    gridContainer = document.getElementById('gridContainer');
    modalTitle = document.getElementById('modalTitle');

    // Eğer bu elementler sayfada yoksa (başka sayfadaysak) hata vermesin
    if (!modal || !gridContainer) return;

    const hours = ['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    // Grid'i Temizle (tekrar tekrar eklenmesin)
    gridContainer.innerHTML = '';

    // Başlık Satırını (Saat boşluk + Pzt, Sal...) tekrar ekle
    const emptyCorner = document.createElement('div');
    gridContainer.appendChild(emptyCorner);

    const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
    dayLabels.forEach(d => {
        const dh = document.createElement('div');
        dh.className = 'day-header';
        dh.innerText = d;
        gridContainer.appendChild(dh);
    });

    // Saatleri ve Kutuları Oluştur
    hours.forEach(time => {
        // 1. Saat Etiketi (Sol taraf)
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.innerText = time;
        gridContainer.appendChild(timeLabel);

        // 2. Gün Kutucukları
        days.forEach(day => {
            const btn = document.createElement('div');
            btn.className = 'slot-btn';
            
            // Veri özelliklerini ekle
            btn.dataset.day = day;
            btn.dataset.time = time;
            
            // Tıklama Olayı (Kırmızı/Beyaz yapma)
            btn.onclick = function() {
                this.classList.toggle('unavailable');
            };

            gridContainer.appendChild(btn);
        });
    });

    // Dışarı tıklayınca kapatma
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
}

// Modalı Açan Fonksiyon (HTML'den çağrılıyor: onclick="openModal(...)")
window.openModal = function(name) {
    if(modalTitle) modalTitle.innerText = `${name} - Müsaitlik Ayarları`;
    
    // Her açılışta grid'i sıfırla (temizle)
    const slots = document.querySelectorAll('.slot-btn');
    if(slots) {
        slots.forEach(btn => btn.classList.remove('unavailable'));
    }
    
    if(modal) modal.classList.add('active');
}

// Modalı Kapatan Fonksiyon
window.closeModal = function() {
    if(modal) modal.classList.remove('active');
}