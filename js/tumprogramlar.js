document.addEventListener('DOMContentLoaded', function () {
    console.log("Tüm Programlar Loaded");

    const tabs = document.querySelectorAll('.filter-tabs .tab');
    const tableRows = document.querySelectorAll('.table-container tbody tr');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 1. Aktif tab sınıfını değiştir
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // 2. Tıklanan tab'ın metnini veya sırasını al
            // (Burada buton metinleri HTML'de hardcoded olduğu için index veya içerik kontrolü yapacağız)
            const tabText = this.innerText.toLowerCase();

            // 3. Satırları filtrele
            tableRows.forEach(row => {
                const statusBadge = row.querySelector('.badge');
                const healthCell = row.querySelector('td:nth-child(5)'); // Sağlık sütunu
                
                let showRow = false;

                if (tabText.includes('tümü')) {
                    showRow = true;
                } 
                else if (tabText.includes('onay bekleyenler')) {
                    // Turuncu badge kontrolü
                    if (statusBadge && statusBadge.classList.contains('badge-orange')) {
                        showRow = true;
                    }
                } 
                else if (tabText.includes('onaylananlar')) {
                    // Yeşil badge kontrolü
                    if (statusBadge && statusBadge.classList.contains('badge-green')) {
                        showRow = true;
                    }
                } 
                else if (tabText.includes('hatalı') || tabText.includes('çakışmalı')) {
                    // Sağlık sütununda hata ikonu veya status-error sınıfı var mı?
                    if (healthCell && healthCell.classList.contains('status-error')) {
                        showRow = true;
                    }
                }

                // Göster veya Gizle
                row.style.display = showRow ? '' : 'none';
            });
        });
    });

    // Buton İşlevleri (İncele / Detay)
    const actionButtons = document.querySelectorAll('.btn-primary, .btn-light');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
             const row = this.closest('tr');
             const deptName = row.querySelector('td:first-child strong').innerText;
             alert(`${deptName} detaylarına gidiliyor...`);
        });
    });
});