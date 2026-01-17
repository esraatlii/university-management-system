const API_BASE = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Dean Dashboard Yüklendi");

    // 1. Kullanıcı Bilgilerini Yerleştir
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // Header İsim
        const nameEl = document.querySelector('.user-info .name');
        if (nameEl) nameEl.innerText = user.full_name;
        
        // Avatar Baş Harfler
        const avatarEl = document.querySelector('.user-profile .avatar');
        if (avatarEl) {
            avatarEl.innerText = user.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        }

        // Hoşgeldin Mesajı
        const welcomeTitle = document.querySelector('.welcome-text h3');
        if (welcomeTitle) welcomeTitle.innerText = `Hoşgeldin, ${user.full_name}`;
    } else {
        window.location.href = '../index.html'; // Giriş yoksa at
    }

    // 2. Dashboard Verilerini Çek
    await loadDeanStatsAndTable();
});

async function loadDeanStatsAndTable() {
    try {
        const response = await fetch(`${API_BASE}/schedules`);
        const schedules = await response.json();

        // --- İSTATİSTİKLER ---
        const totalDepts = schedules.length;
        const approvedCount = schedules.filter(s => s.status === 'approved').length;
        const pendingCount = schedules.filter(s => s.status === 'submitted').length;
        const draftCount = schedules.filter(s => s.status === 'draft').length;

        const stats = document.querySelectorAll('.stat-number');
        if (stats.length >= 4) {
            stats[0].innerText = totalDepts;
            stats[1].innerText = approvedCount;
            stats[2].innerText = pendingCount;
            stats[3].innerText = draftCount;
        }

        // --- TABLO ---
        const tableBody = document.querySelector('.courseProgramStatusTable tbody');
        if (tableBody) {
            tableBody.innerHTML = ''; // Temizle

            if (schedules.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#999;">Henüz veri yok.</td></tr>';
                return;
            }

            schedules.forEach(s => {
                // Duruma göre renk ve metin
                let badgeClass = 'badge-gray';
                let statusText = 'Taslak';
                let btnHtml = '<span class="empty">—</span>';

                if (s.status === 'submitted') {
                    badgeClass = 'badge-orange';
                    statusText = 'Onay Bekliyor';
                    btnHtml = `<button class="reviewBtn" onclick="inspectSchedule(${s.id})">İncele</button>`;
                } else if (s.status === 'approved') {
                    badgeClass = 'badge-green';
                    statusText = 'Onaylandı';
                }

                const row = `
                    <tr>
                        <td class="font-medium">${s.department_name}</td>
                        <td>Temsilci Bilgisi</td>
                        <td>${new Date(s.updated_at).toLocaleDateString('tr-TR')}</td>
                        <td><span class="badge ${badgeClass}">${statusText}</span></td>
                        <td>${btnHtml}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error("Dashboard veri hatası:", error);
    }
}

window.inspectSchedule = function(id) {
    window.location.href = `tumprogramlar.html?id=${id}`;
};