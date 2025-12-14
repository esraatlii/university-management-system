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
    // Eğer dosya ismin farklıysa burayı güncelle (örn: index.html ise index.html yaz)
    if (path.includes('admin_dashboard.html') || path.endsWith('/admin/')) {
        initAdminDashboard();
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
        // HTML'de value="1" Öğretim Görevlisi ise
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
            
            // Verileri al
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const roleSelect = document.getElementById('role');
            const roleText = roleSelect.options[roleSelect.selectedIndex].text; // Seçilen rolün yazısını al (Admin vb.)
            
            // Basit doğrulama
            if(fullname === "" || email === "" || roleSelect.value === "") {
                alert("Lütfen isim, e-posta ve rol alanlarını doldurunuz.");
                return;
            }

            // --- YENİ KISIM: LOCALSTORAGE KAYIT ---
            const newUser = {
                id: Date.now(), // Benzersiz ID
                name: fullname,
                email: email,
                role: roleText,
                date: new Date().toLocaleDateString('tr-TR'),
                status: "Aktif"
            };

            // Mevcut kullanıcıları getir veya boş dizi oluştur
            let users = JSON.parse(localStorage.getItem('users')) || [];
            
            // Yeni kullanıcıyı ekle
            users.push(newUser);

            // Tekrar kaydet
            localStorage.setItem('users', JSON.stringify(users));

            alert("Kullanıcı başarıyla oluşturuldu ve listeye eklendi!");
            
            // Formu temizle
            document.querySelector('.userAdd-form').reset();
            deptSelect.setAttribute('disabled', 'true');
            
            // İstersen işlem bitince listeye yönlendir:
            // window.location.href = "admin_dashboard.html";
        });
    }
}

// ==========================================
// 2. KULLANICI LİSTESİ (DASHBOARD) İŞLEMLERİ
// ==========================================
function initAdminDashboard() {
    const tableBody = document.querySelector('table tbody');
    
    // Eğer sayfada tablo yoksa çalışmayı durdur
    if (!tableBody) return;

    // LocalStorage'dan kullanıcıları çek
    let users = JSON.parse(localStorage.getItem('users'));

    // Eğer hiç kullanıcı yoksa (ilk açılış), örnek veri ekle
    if (!users || users.length === 0) {
        users = [
            { id: 1, name: "Ahmet Yılmaz", role: "Dekan", email: "ahmet@uni.edu.tr", date: "10.12.2024", status: "Aktif" },
            { id: 2, name: "Ayşe Demir", role: "Öğretim Görevlisi", email: "ayse@uni.edu.tr", date: "11.12.2024", status: "Aktif" }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Tabloyu temizle (Statik HTML verilerini sil)
    tableBody.innerHTML = "";

    // Kullanıcıları döngü ile tabloya yaz
    users.forEach(user => {
        const row = `
            <tr>
                <td>
                    <div class="user-info-cell">
                       <div class="user-avatar">${getInitials(user.name)}</div>
                       <div>
                           <div class="u-name">${user.name}</div>
                           <div class="u-email">${user.email}</div>
                       </div>
                    </div>
                </td>
                <td>${user.role}</td>
                <td>${user.date}</td>
                <td><span class="badge badge-green">${user.status}</span></td>
                <td>
                    <div class="action-icons">
                        <i class="fa-regular fa-trash-can" onclick="deleteUser(${user.id})" style="cursor:pointer; color:red;"></i>
                    </div>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// ==========================================
// 3. BÖLÜM YÖNETİMİ İŞLEMLERİ
// ==========================================
function initDepartmentPage() {
    const addBtn = document.querySelector('.addNewDepartmentBtn');
    const tableBody = document.querySelector('.department-table tbody');

    if (!addBtn || !tableBody) return;

    // Not: Bölümler için de LocalStorage yapılabilir ama şimdilik sadece DOM manipülasyonu bırakıldı.
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

// İsimden Baş Harf Alma (Örn: Ahmet Yılmaz -> AY)
function getInitials(name) {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
}

// Kullanıcı Silme (LocalStorage'dan da siler)
window.deleteUser = function(id) {
    if(confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        // ID'si eşleşmeyenleri filtrele (yani eşleşeni sil)
        users = users.filter(user => user.id != id);
        // Yeni listeyi kaydet
        localStorage.setItem('users', JSON.stringify(users));
        // Sayfayı yenile (tablo güncellensin)
        location.reload();
    }
}

// Basit Satır Silme (Bölümler sayfası için)
window.deleteRow = function(btn) {
    if(confirm("Silmek istiyor musunuz?")) {
        btn.closest('tr').remove();
    }
}