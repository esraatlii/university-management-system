const API_URL = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Halls Page Loaded");

    const form = document.querySelector('.addClassRoomForm');
    const tableBody = document.querySelector('.classroom-table tbody');

    // 1. Tabloyu Doldur
    await fetchHalls();

    // 2. Yeni Sınıf Ekleme
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Form elemanlarını sırasıyla alıyoruz
            // DİKKAT: HTML sırasına güveniyoruz (Ad, Kapasite, Tip)
            const inputs = form.querySelectorAll('input, select');
            
            const hall_name = inputs[0].value;
            const capacity = inputs[1].value;
            const hall_type = inputs[2].value.toLowerCase(); // 'Classroom' -> 'classroom'

            // Checkbox'lar (Donanımlar)
            const checkedBoxes = form.querySelectorAll('.facilities input[type="checkbox"]:checked');
            const facilities = Array.from(checkedBoxes)
                .map(box => box.parentElement.textContent.trim())
                .join(', ');

            if (!hall_name || !capacity) {
                alert("Lütfen isim ve kapasite alanlarını doldurun.");
                return;
            }

            const payload = {
                hall_name: hall_name,
                capacity: parseInt(capacity),
                hall_type: hall_type,
                department_id: null, // Ortak alan
                is_shared: true,
                seating_arrangement: facilities
            };

            try {
                const response = await fetch(`${API_URL}/halls/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert("Sınıf başarıyla eklendi!");
                    form.reset();
                    await fetchHalls();
                } else {
                    // HATA DÜZELTME KISMI BURASI:
                    const error = await response.json();
                    alert("Kaydedilemedi:\n" + JSON.stringify(error, null, 2));
                }
            } catch (error) {
                console.error("Sunucu hatası:", error);
                alert("Sunucuya bağlanılamadı.");
            }
        });
    }

    // 3. Verileri Çek ve Listele
    async function fetchHalls() {
        try {
            const response = await fetch(`${API_URL}/halls/`);
            const halls = await response.json();

            if (!tableBody) return;
            tableBody.innerHTML = '';

            halls.forEach(hall => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-medium">${hall.hall_name}</td>
                    <td><span class="badge badge-purple">${hall.hall_type.toUpperCase()}</span></td>
                    <td>${hall.capacity} Öğrenci</td>
                    <td class="facilities-cell">
                        ${hall.seating_arrangement 
                            ? hall.seating_arrangement.split(',').map(tag => `<span class="facility-tag">${tag}</span>`).join('') 
                            : '-'}
                    </td>
                    <td class="actions">
                        <div class="action-icons">
                            <i class="fa-regular fa-trash-can" onclick="deleteHall(${hall.id})" title="Sil" style="cursor:pointer; color:red;"></i>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Sınıflar yüklenemedi:", error);
        }
    }

    // 4. Silme
    window.deleteHall = async function(id) {
        if (!confirm("Bu sınıfı silmek istediğinize emin misiniz?")) return;
        try {
            const res = await fetch(`${API_URL}/halls/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Sınıf silindi.");
                fetchHalls();
            } else {
                alert("Silme başarısız.");
            }
        } catch (e) { console.error(e); }
    };
});