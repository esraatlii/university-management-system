const API_URL = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Header Bilgileri
    if (user) {
        if(document.querySelector('.name')) document.querySelector('.name').innerText = user.full_name;
        const initials = user.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        if(document.querySelector('.avatar')) document.querySelector('.avatar').innerText = initials;
    }

    // Sayfa Kontrolü
    if (window.location.pathname.includes('courses.html')) {
        loadOfferingsTable();
    }
});

// ======================================================
// 1. AÇILAN DERSLERİ (OFFERINGS) LİSTELEME
// ======================================================
async function loadOfferingsTable() {
    const tableBody = document.getElementById('coursesTableBody');
    if (!tableBody) return;

    try {
        const [resOfferings, resCourses] = await Promise.all([
            fetch(`${API_URL}/course-offerings/`),
            fetch(`${API_URL}/courses/`)
        ]);

        const offerings = await resOfferings.json();
        const courses = await resCourses.json();

        // Haritalama
        const courseMap = {};
        courses.forEach(c => { courseMap[c.id] = c; });

        tableBody.innerHTML = '';
        if(offerings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Henüz açılan ders yok.</td></tr>';
            return;
        }

        offerings.forEach((offering) => {
            const courseDetails = courseMap[offering.course_id] || { code: '???', weekly_hours: '-' };
            const instructorName = offering.instructor_name || "<span style='color:red;'>Hoca Yok</span>";

            const row = `
                <tr>
                    <td><span class="code-badge">${courseDetails.code}</span></td>
                    <td class="font-medium">${offering.course_name}</td>
                    <td><span style="color:#2563EB; font-weight:600;">${instructorName}</span></td>
                    <td>${courseDetails.weekly_hours} Saat</td>
                    <td><span class="status-pill green">Açıldı</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon delete" onclick="deleteOffering(${offering.id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

    } catch (error) {
        console.error("Yükleme hatası:", error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Veriler yüklenemedi. Backend açık mı?</td></tr>';
    }
}

// ======================================================
// 2. MODAL İÇİN VERİ YÜKLEME (HOCALAR & SINIFLAR)
// ======================================================
async function loadInstructorsForSelect() {
    const select = document.getElementById('instructorSelect');
    if (!select) return;
    const user = JSON.parse(localStorage.getItem('user'));
    const deptId = user ? user.department_id : 1;

    try {
        const res = await fetch(`${API_URL}/instructors/`);
        const instructors = await res.json();
        select.innerHTML = '<option value="">Bir Öğretim Üyesi Seçin</option>';
        instructors.forEach(inst => {
            if (!inst.department_id || inst.department_id === deptId) {
                const name = inst.full_name || `${inst.first_name} ${inst.last_name}`;
                select.innerHTML += `<option value="${inst.id}">${inst.title} ${name}</option>`;
            }
        });
    } catch (e) { console.error(e); }
}

// DÜZELTİLEN FONKSİYON BURASI 👇
async function loadProgramClasses() {
    const select = document.getElementById('programClassSelect');
    if (!select) return;

    try {
        const res = await fetch(`${API_URL}/program-classes/`);
        if (!res.ok) {
            select.innerHTML = `<option value="1">1. Sınıf (Manuel)</option>`;
            return;
        }
        const classes = await res.json();
        select.innerHTML = '<option value="">Sınıf Seçiniz</option>';
        
        classes.forEach(cls => {
            // BURAYI DEĞİŞTİRDİK: Backend 'label' gönderiyor!
            const className = cls.label || cls.name || "Bilinmeyen Sınıf";
            select.innerHTML += `<option value="${cls.id}">${className}</option>`;
        });
    } catch (error) { console.error("Sınıf hatası:", error); }
}

window.openAddCourseModal = function() {
    const modal = document.getElementById('addCourseModal');
    if(modal) {
        modal.classList.add('active'); 
        loadInstructorsForSelect(); 
        loadProgramClasses(); 
    }
}

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.remove('active');
}

// ======================================================
// 3. KAYDETME (DERS KONTROLÜ + OFFERING)
// ======================================================
const addForm = document.getElementById('addCourseForm');
if (addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        const deptId = user ? user.department_id : 1;
        
        // Form Verilerini Al
        const codeVal = document.getElementById('courseCode').value.toUpperCase().trim();
        const nameVal = document.getElementById('courseName').value.trim();
        const instructorVal = document.getElementById('instructorSelect').value;
        const termVal = document.getElementById('termSelect').value;
        const hoursVal = document.getElementById('weeklyHours').value;
        const typeVal = document.getElementById('courseType').value;
        const studentCountVal = document.getElementById('studentCount').value;
        const programClassIdVal = document.getElementById('programClassSelect').value; 

        if(!programClassIdVal) {
            alert("Lütfen Sınıf Seviyesini Seçiniz!");
            return;
        }

        try {
            // ADIM 1: Ders zaten var mı?
            const checkRes = await fetch(`${API_URL}/courses/`);
            if (!checkRes.ok) throw new Error("Ders listesi kontrol edilemedi.");
            const allCourses = await checkRes.json();
            const existingCourse = allCourses.find(c => c.code === codeVal);
            
            let finalCourseId = null;
            // Sınıf seviyesini de veritabanından aldığımız nesneye göre güncellemek gerekebilir
            // Ama şimdilik basit tutuyoruz, offering'e ID'yi basacağız.

            if (existingCourse) {
                console.log(`Ders (${codeVal}) bulundu, ID: ${existingCourse.id} kullanılıyor.`);
                finalCourseId = existingCourse.id;
            } else {
                console.log("Yeni ders oluşturuluyor...");
                // Not: course tablosunda class_level olmayabilir ama offering'de program_class_id kesin var.
                // Burada class_level'a 1 verip geçiyoruz (veya programClassIdVal'ı sayıya çevirip verebiliriz)
                const coursePayload = {
                    code: codeVal, name: nameVal, department_id: deptId,
                    term_id: parseInt(termVal), weekly_hours: parseInt(hoursVal),
                    course_type: typeVal, is_mandatory: true, 
                    class_level: 1 // Varsayılan
                };

                const createRes = await fetch(`${API_URL}/courses/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(coursePayload)
                });
                if (!createRes.ok) throw new Error("Ders oluşturulamadı.");
                const newCourse = await createRes.json();
                finalCourseId = newCourse.id;
            }

            // ADIM 2: Offering Oluştur
            if (finalCourseId) {
                const offeringPayload = {
                    course_id: finalCourseId,
                    instructor_id: parseInt(instructorVal),
                    term_id: parseInt(termVal),
                    student_count: parseInt(studentCountVal),
                    program_class_id: parseInt(programClassIdVal)
                };

                console.log("Hoca atanıyor...", offeringPayload);
                const offRes = await fetch(`${API_URL}/course-offerings/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(offeringPayload)
                });

                if (!offRes.ok) {
                    const err = await offRes.json();
                    throw new Error("Offering Hatası: " + JSON.stringify(err.detail));
                }

                alert("Başarılı! Ders Eklendi.");
                closeModal('addCourseModal');
                addForm.reset();
                loadOfferingsTable();
            }

        } catch (error) {
            console.error(error);
            alert("Hata: " + error.message);
        }
    });
}

// ======================================================
// 4. SİLME
// ======================================================
window.deleteOffering = async function(offeringId) {
    if (confirm("Bu ders atamasını kaldırmak istediğinize emin misiniz?")) {
        try {
            const res = await fetch(`${API_URL}/course-offerings/${offeringId}`, { method: 'DELETE' });
            if(res.ok) loadOfferingsTable();
            else alert("Silinemedi.");
        } catch (error) { console.error("Silme hatası:", error); }
    }
}