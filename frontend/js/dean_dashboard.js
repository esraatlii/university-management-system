const API_BASE = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Dean Dashboard Loaded");

    // 1. Üst Menüdeki Kullanıcı Bilgilerini Güncelle
    const loggedInUser = JSON.parse(localStorage.getItem('user'));
    if (loggedInUser) {
        document.querySelector('.userInfoName').innerText = loggedInUser.full_name;
        document.querySelector('.userInfoRole').innerText = "Fakülte Dekanı";
        document.querySelector('.user-profile-circle').innerText = 
            loggedInUser.full_name.split(' ').map(n => n[0]).join('');
    }

    // 2. Dashboard Verilerini Yükle
    await loadDeanStatsAndTable();
});

async function loadDeanStatsAndTable() {
    try {
        // Backend'den tüm programları (schedules) çekiyoruz
        const response = await fetch(`${API_BASE}/schedules`);
        const schedules = await response.json();

        // --- İSTATİSTİK KARTLARINI HESAPLA ---
        const totalDepts = schedules.length;
        const approvedCount = schedules.filter(s => s.status === 'approved').length;
        const pendingCount = schedules.filter(s => s.status === 'submitted').length;
        const draftCount = schedules.filter(s => s.status === 'draft').length;

        // Kartları HTML'e yaz
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length >= 4) {
            statNumbers[0].innerText = totalDepts;    // Toplam Bölüm Sayısı
            statNumbers[1].innerText = approvedCount; // Onaylanan
            statNumbers[2].innerText = pendingCount;  // Onay Bekleyen
            statNumbers[3].innerText = draftCount;    // Taslak Aşamasında
        }

        // --- TABLOYU DOLDUR ---
        const tableBody = document.querySelector('.courseProgramStatusTable tbody');
        if (!tableBody) return;

        tableBody.innerHTML = ''; // Eski verileri temizle

        schedules.forEach(schedule => {
            const row = document.createElement('tr');
            
            // Durum badge rengini belirle
            let badgeClass = 'badge-gray';
            if (schedule.status === 'approved') badgeClass = 'badge-green';
            else if (schedule.status === 'submitted') badgeClass = 'badge-orange';

            row.innerHTML = `
                <td>${schedule.department_name}</td>
                <td>Temsilci Bilgisi</td>
                <td>${new Date(schedule.updated_at).toLocaleDateString('tr-TR')}</td>
                <td><span class="badge ${badgeClass}">${getTranslatedStatus(schedule.status)}</span></td>
                <td>
                    ${schedule.status === 'submitted' ? 
                        `<button class="reviewBtn" onclick="inspectSchedule(${schedule.id})">İncele</button>` : 
                        '<span class="empty">—</span>'}
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Dekan verileri yüklenirken hata oluştu:", error);
    }
}

// Durumları Türkçeleştirme Yardımı
function getTranslatedStatus(status) {
    const translations = {
        'draft': 'Taslak',
        'submitted': 'Onay Bekliyor',
        'approved': 'Onaylandı',
        'locked': 'Kilitli'
    };
    return translations[status] || status;
}

// İncele Butonu Fonksiyonu
window.inspectSchedule = function(scheduleId) {
    // Burada tümprogramlar.html sayfasına ID ile yönlendirme yapabiliriz
    window.location.href = `tumprogramlar.html?id=${scheduleId}`;
};