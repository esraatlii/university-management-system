document.addEventListener('DOMContentLoaded', function () {
    console.log("Halls Page Loaded");

    const form = document.querySelector('.addClassRoomForm');
    const tableBody = document.querySelector('.classroom-table tbody');

    // --- 1. Yeni Sınıf Ekleme ---
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault(); // Sayfanın yenilenmesini engelle

            // Input değerlerini al
            const inputs = form.querySelectorAll('input, select');
            const name = inputs[0].value;
            const capacity = inputs[1].value;
            const type = inputs[2].value;

            // Seçili özellikleri (checkbox) al
            const facilitiesDiv = form.querySelector('.facilities');
            const checkedBoxes = facilitiesDiv.querySelectorAll('input[type="checkbox"]:checked');
            let tagsHtml = '';
            
            checkedBoxes.forEach(box => {
                // Checkbox yanındaki label metnini al (örn: Projector)
                const labelText = box.parentElement.textContent.trim();
                tagsHtml += `<span>${labelText}</span>`;
            });

            if (!name || !capacity) {
                alert("Lütfen gerekli alanları doldurunuz.");
                return;
            }

            // Rozet rengini tipe göre ayarla
            let badgeClass = 'badge-purple'; // Varsayılan
            // İstersen type'a göre renk değiştirebilirsin

            // Yeni satır HTML'i
            const newRow = `
                <tr>
                    <td class="font-medium">${name}</td>
                    <td><span class="badge ${badgeClass}">${type}</span></td>
                    <td>${capacity} Students</td>
                    <td class="tags">${tagsHtml || '<span>-</span>'}</td>
                    <td class="actions">
                        <div class="action-icons">
                            <i class="fa-regular fa-eye" title="Görüntüle"></i>
                            <i class="fa-regular fa-pen-to-square" title="Düzenle"></i>
                            <i class="fa-regular fa-trash-can" title="Sil"></i>
                        </div>
                    </td>
                </tr>
            `;

            // Tabloya ekle
            tableBody.insertAdjacentHTML('beforeend', newRow);

            // Formu temizle
            form.reset();
            alert("Yeni sınıf başarıyla eklendi!");
        });
    }

    // --- 2. Silme İşlemi (Event Delegation) ---
    // Tabloya sonradan eklenen elemanları da silmek için tableBody'ye listener ekliyoruz
    if (tableBody) {
        tableBody.addEventListener('click', function(e) {
            // Tıklanan element çöp kutusu ikonu mu?
            if (e.target.classList.contains('fa-trash-can')) {
                if(confirm("Bu sınıfı silmek istediğinize emin misiniz?")) {
                    const row = e.target.closest('tr');
                    row.remove();
                }
            }
            
            // Düzenleme veya Görüntüleme ikonları için
            if (e.target.classList.contains('fa-pen-to-square') || e.target.classList.contains('fa-eye')) {
                alert("Bu özellik henüz aktif değil.");
            }
        });
    }
});