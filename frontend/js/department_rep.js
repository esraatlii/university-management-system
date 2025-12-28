const API_URL = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    const user = JSON.parse(localStorage.getItem('user')); // Giriş yapan kullanıcı bilgisi

    // Kullanıcı bilgisi yoksa login'e yönlendir
    if (!user && !currentPage.includes('index.html')) {
        window.location.href = '../index.html';
        return;
    }

    // Header bilgilerini güncelle
    if (document.querySelector('.name')) {
        document.querySelector('.name').innerText = user.full_name;
        document.querySelector('.avatar').innerText = user.full_name.charAt(0);
    }

    if (currentPage.includes('courses.html')) {
        loadCoursesTable(user.department_id);
        setupAddCourseButton(user.department_id);
    }

    if (currentPage.includes('rep_dashboard.html')) {
        loadDashboardStats(user.department_id);
    }
});

// --- 1. DERSLERİ LİSTELEME (GET /api/courses) ---
async function loadCoursesTable(deptId) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    try {
        // Backend'den dersleri çek
        const response = await fetch(`${API_URL}/courses/`);
        const allCourses = await response.json();

        // Sadece bu temsilcinin bölümüne ait dersleri filtrele
        const deptCourses = allCourses.filter(c => c.department_id === deptId);

        tableBody.innerHTML = ''; 

        deptCourses.forEach((course) => {
            const row = `
                <tr>
                    <td><span class="code-badge">${course.code}</span></td>
                    <td class="font-medium">${course.name}</td>
                    <td>-</td> <td>${course.weekly_hours} Saat</td>
                    <td>${course.course_type}</td>
                    <td><span class="status-pill ${course.is_mandatory ? 'green' : 'yellow'}">
                        ${course.is_mandatory ? 'Zorunlu' : 'Seçmeli'}
                    </span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit" onclick="editCourse(${course.id})"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon delete" onclick="deleteCourse(${course.id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Dersler yüklenemedi:", error);
    }
}

// --- 2. YENİ DERS EKLEME (POST /api/courses) ---
function setupAddCourseButton(deptId) {
    const addBtn = document.querySelector('.btn-primary');
    if (!addBtn) return;

    addBtn.addEventListener('click', async function() {
        const code = prompt("Ders Kodu (Örn: CENG101):");
        if (!code) return;
        const name = prompt("Ders Adı:");
        if (!name) return;

        // Backend'in beklediği CoursesCreate şeması
        const newCourse = {
            code: code.toUpperCase(),
            name: name,
            department_id: deptId,
            term_id: 1, // Örnek olarak 1. dönem
            class_level: 1,
            weekly_hours: 3,
            course_type: "theory",
            is_mandatory: true,
            is_retake_critical: false
        };

        try {
            const response = await fetch(`${API_URL}/courses/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCourse)
            });

            if (response.ok) {
                alert("Ders başarıyla veritabanına eklendi!");
                loadCoursesTable(deptId);
            } else {
                const err = await response.json();
                alert("Hata: " + err.detail);
            }
        } catch (error) {
            console.error("Ders ekleme hatası:", error);
        }
    });
}

// --- 3. DERS SİLME (DELETE /api/courses/{id}) ---
async function deleteCourse(courseId) {
    if (confirm("Bu dersi silmek istediğinize emin misiniz?")) {
        try {
            const response = await fetch(`${API_URL}/courses/${courseId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Ders silindi.");
                location.reload(); 
            } else {
                alert("Silme başarısız.");
            }
        } catch (error) {
            console.error("Silme hatası:", error);
        }
    }
}

// --- 4. DASHBOARD İSTATİSTİKLERİ ---
async function loadDashboardStats(deptId) {
    try {
        const res = await fetch(`${API_URL}/courses/`);
        const courses = await res.json();
        const deptCourses = courses.filter(c => c.department_id === deptId);

        const statsNumbers = document.querySelectorAll('.stat-number');
        if (statsNumbers.length > 0) {
            statsNumbers[0].innerText = `${deptCourses.length}%`; // Örnek bir mantık
            // Diğer istatistikleri backend'den gelen verilere göre doldurabilirsin
        }
    } catch (e) {
        console.error("İstatistikler yüklenemedi");
    }
}