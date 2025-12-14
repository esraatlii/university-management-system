document.addEventListener('DOMContentLoaded', function() {
    
    // Hangi sayfada olduğumuzu anlayalım
    const currentPage = window.location.pathname;

    // --- EĞER DERSLER (COURSES) SAYFASINDAYSAK ---
    if (currentPage.includes('courses.html')) {
        loadCoursesTable(); // Mevcut dersleri yükle
        setupAddCourseButton(); // "Yeni Ekle" butonunu çalıştır
    }

    // --- EĞER DASHBOARD SAYFASINDAYSAK ---
    if (currentPage.includes('rep_dashboard.html')) {
        console.log("Dashboard yüklendi...");
    }

});

// --- MOCK DATA (Sahte Veriler) ---
const mockCourses = [
    { code: "CENG101", name: "Algoritma ve Programlama I", instructor: "Dr. Ahmet Yılmaz", quota: 80, duration: "90 dk", status: "active" },
    { code: "CENG205", name: "Veri Yapıları", instructor: "Doç. Dr. Ayşe Kaya", quota: 65, duration: "60 dk", status: "pending" },
    { code: "MATH101", name: "Matematik I", instructor: "Prof. Dr. Mehmet Öz", quota: 120, duration: "120 dk", status: "active" },
    { code: "PHYS101", name: "Fizik I", instructor: "Dr. Ali Veli", quota: 100, duration: "90 dk", status: "warning" },
    { code: "CENG301", name: "İşletim Sistemleri", instructor: "Dr. Canan Dağ", quota: 50, duration: "75 dk", status: "pending" }
];

// --- TABLOYU DOLDURAN FONKSİYON ---
function loadCoursesTable() {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Önce temizle

    mockCourses.forEach((course) => {
        // Duruma göre renk belirle
        let statusHtml = '';
        if (course.status === 'active') {
            statusHtml = '<span class="status-pill green">Yerleşti</span>';
        } else if (course.status === 'pending') {
            statusHtml = '<span class="status-pill red">Yerleşmedi</span>';
        } else {
            statusHtml = '<span class="status-pill yellow">Talep Bekleniyor</span>';
        }

        const row = `
            <tr>
                <td><span class="code-badge">${course.code}</span></td>
                <td class="font-medium">${course.name}</td>
                <td>${course.instructor}</td>
                <td>${course.quota}</td>
                <td>${course.duration}</td>
                <td>${statusHtml}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon edit" onclick="editCourse('${course.code}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" onclick="deleteCourse(this, '${course.code}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// --- YENİ DERS EKLEME FONKSİYONU (YENİ EKLENDİ) ---
function setupAddCourseButton() {
    const addBtn = document.querySelector('.btn-primary');
    
    if(addBtn) {
        addBtn.addEventListener('click', function() {
            // Basitçe kullanıcıdan bilgileri isteyelim
            const code = prompt("Ders Kodu (Örn: CENG101):");
            if(!code) return; // İptal ederse çık

            const name = prompt("Ders Adı:");
            if(!name) return;

            const instructor = prompt("Öğretim Üyesi:");
            const quota = prompt("Kontenjan:") || "0";
            
            // Yeni ders objesini oluştur
            const newCourse = {
                code: code.toUpperCase(),
                name: name,
                instructor: instructor || "Atanmadı",
                quota: parseInt(quota),
                duration: "60 dk", // Varsayılan
                status: "pending" // Yeni ders henüz yerleşmemiştir
            };

            // Listeye ekle ve tabloyu yenile
            mockCourses.push(newCourse);
            loadCoursesTable();

            alert(code + " başarıyla eklendi!");
        });
    }
}

// --- SİLME FONKSİYONU ---
function deleteCourse(button, courseCode) {
    if (confirm(courseCode + " kodlu dersi silmek istediğinize emin misiniz?")) {
        // 1. Görselden sil
        const row = button.closest('tr');
        row.remove();
        
        // 2. Arka plandaki listeden de sil (tekrar yüklenirse geri gelmesin diye)
        const index = mockCourses.findIndex(c => c.code === courseCode);
        if (index > -1) {
            mockCourses.splice(index, 1);
        }
    }
}

// --- DÜZENLEME (BOŞ) ---
function editCourse(courseCode) {
    alert(courseCode + " düzenleme özelliği yakında gelecek!");
}