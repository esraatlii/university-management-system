const API_BASE = "http://127.0.0.1:8001/api";
let allSchedules = []; // Global veri

document.addEventListener('DOMContentLoaded', async function () {
    const tableBody = document.querySelector('.table-container tbody');
    const tabs = document.querySelectorAll('.filter-tabs .tab');

    // 1. Verileri Çek
    async function fetchSchedules() {
        try {
            const response = await fetch(`${API_BASE}/schedules`);
            allSchedules = await response.json();
            renderTable(allSchedules);
            updateTabCounts();
        } catch (error) {
            console.error("Programlar yüklenemedi:", error);
        }
    }

    // 2. Tabloyu Çiz
    function renderTable(data) {
        if (!tableBody) return;
        tableBody.innerHTML = ''; 

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Veri bulunamadı.</td></tr>';
            return;
        }

        data.forEach(s => {
            let badgeClass = 'badge-gray';
            let statusText = 'Taslak';
            if (s.status === 'submitted') { badgeClass = 'badge-orange'; statusText = 'Onay Bekliyor'; }
            if (s.status === 'approved') { badgeClass = 'badge-green'; statusText = 'Onaylandı'; }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${s.department_name}</strong></td>
                <td>
                    <div class="user-info">
                        <span class="avatar blue">${s.department_name.substring(0,2).toUpperCase()}</span>
                        <span class="user-name">Temsilci</span>
                    </div>
                </td>
                <td>${new Date(s.updated_at).toLocaleString('tr-TR')}</td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td>
                    ${s.status === 'approved' ? '<span class="status-success"><i class="fa-regular fa-circle-check"></i> Sorunsuz</span>' : '-'}
                </td>
                <td>
                    ${s.status === 'submitted' 
                        ? `<button class="btn-primary" onclick="approveSchedule(${s.id})">Onayla</button>` 
                        : `<button class="btn-light" onclick="alert('Detay sayfası hazırlanıyor...')">Detay</button>`
                    }
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // 3. Tab Filtreleme
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const text = this.innerText.toLowerCase();
            let filtered = allSchedules;

            if (text.includes('bekleyen')) filtered = allSchedules.filter(s => s.status === 'submitted');
            else if (text.includes('onaylanan')) filtered = allSchedules.filter(s => s.status === 'approved');
            else if (text.includes('hatalı')) filtered = []; // Backend'de hata flag'i varsa buraya eklenebilir

            renderTable(filtered);
        });
    });

    // 4. Onaylama İşlemi
    window.approveSchedule = async function(id) {
        if(!confirm("Programı onaylamak istiyor musunuz?")) return;
        try {
            const res = await fetch(`${API_BASE}/schedules/${id}/approve`, { method: 'POST' });
            if (res.ok) {
                alert("Program onaylandı!");
                fetchSchedules();
            } else {
                alert("İşlem başarısız.");
            }
        } catch (e) { console.error(e); }
    };

    function updateTabCounts() {
        if(tabs.length < 3) return;
        tabs[0].innerText = `Tümü (${allSchedules.length})`;
        tabs[1].innerText = `Onay Bekleyenler (${allSchedules.filter(s => s.status === 'submitted').length})`;
        tabs[2].innerText = `Onaylananlar (${allSchedules.filter(s => s.status === 'approved').length})`;
    }

    fetchSchedules();
});