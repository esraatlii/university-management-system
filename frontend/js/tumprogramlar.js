const API_BASE = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Tüm Programlar Sayfası Yüklendi");

    const tableBody = document.querySelector('.table-container tbody');
    const tabs = document.querySelectorAll('.filter-tabs .tab');
    let allSchedules = []; // Tüm veriyi burada tutacağız

    // 1. Backend'den Tüm Programları Çek
    async function fetchSchedules() {
        try {
            const response = await fetch(`${API_BASE}/schedules`);
            allSchedules = await response.json();
            renderTable(allSchedules); // Tabloyu ilk kez doldur
            updateTabCounts(); // Tablardaki sayıları güncelle
        } catch (error) {
            console.error("Programlar yüklenirken hata oluştu:", error);
        }
    }

    // 2. Tabloyu Ekrana Basan Fonksiyon
    function renderTable(data) {
        if (!tableBody) return;
        tableBody.innerHTML = ''; // Önce temizle

        data.forEach(s => {
            const row = document.createElement('tr');
            
            // Durum badge rengi ve metni
            let badgeClass = 'badge-gray';
            let statusText = 'Taslak';
            if (s.status === 'submitted') {
                badgeClass = 'badge-orange';
                statusText = 'Onay Bekliyor';
            } else if (s.status === 'approved') {
                badgeClass = 'badge-green';
                statusText = 'Onaylandı';
            }

            row.innerHTML = `
                <td><strong>${s.department_name}</strong></td>
                <td>
                    <div class="user-info">
                        <span class="avatar blue">${getInitials(s.department_name)}</span>
                        <span class="user-name">Temsilci Bilgisi</span>
                    </div>
                </td>
                <td>${new Date(s.updated_at).toLocaleString('tr-TR')}</td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td class="${s.status === 'draft' ? '' : 'status-success'}">
                    ${s.status === 'approved' ? '<i class="fa-regular fa-circle-check"></i> Sorunsuz' : '-'}
                </td>
                <td>
                    <button class="${s.status === 'submitted' ? 'btn-primary' : 'btn-light'}" 
                            onclick="${s.status === 'submitted' ? `approveSchedule(${s.id})` : `alert('Detaylar hazırlanıyor...')`}">
                        ${s.status === 'submitted' ? 'Onayla' : 'Detay'}
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // 3. Tablara Göre Filtreleme
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabText = this.innerText.toLowerCase();
            let filteredData = allSchedules;

            if (tabText.includes('onay bekleyenler')) {
                filteredData = allSchedules.filter(s => s.status === 'submitted');
            } else if (tabText.includes('onaylananlar')) {
                filteredData = allSchedules.filter(s => s.status === 'approved');
            } else if (tabText.includes('hatalı')) {
                // Mock: Şu anlık hata kontrolü backend'de yoksa boş dönebilir
                filteredData = [];
            }

            renderTable(filteredData);
        });
    });

    // 4. Onaylama Fonksiyonu (Backend'e POST atar)
    window.approveSchedule = async function(id) {
        if (confirm("Bu bölümün ders programını onaylamak istediğinize emin misiniz?")) {
            try {
                const response = await fetch(`${API_BASE}/schedules/${id}/approve`, {
                    method: 'POST'
                });

                if (response.ok) {
                    alert("Program başarıyla onaylandı!");
                    fetchSchedules(); // Listeyi yenile
                } else {
                    alert("Onay işlemi başarısız oldu.");
                }
            } catch (error) {
                console.error("Onay hatası:", error);
            }
        }
    };

    // Yardımcı: İsim baş harflerini al
    function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    // Yardımcı: Tab sayılarını güncelle (İsteğe bağlı)
    function updateTabCounts() {
        tabs[0].innerText = `Tümü (${allSchedules.length})`;
        tabs[1].innerText = `Onay Bekleyenler (${allSchedules.filter(s => s.status === 'submitted').length})`;
        tabs[2].innerText = `Onaylananlar (${allSchedules.filter(s => s.status === 'approved').length})`;
    }

    // Sayfa açıldığında verileri çek
    fetchSchedules();
});