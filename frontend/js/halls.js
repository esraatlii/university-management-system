// --- BACKEND AYARLARI ---
const API_URL = "http://127.0.0.1:8001/api";

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Halls Page Loaded");

    const form = document.querySelector('.addClassRoomForm');
    const tableBody = document.querySelector('.classroom-table tbody');

    // 1. Sayfa Açıldığında Mevcut Sınıfları Listele
    await fetchHalls();

    // 2. Yeni Sınıf Ekleme İşlemi
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Form verilerini al
            const inputs = form.querySelectorAll('input, select');
            const hall_name = inputs[0].value;
            const capacity = parseInt(inputs[1].value);
            const hall_type = inputs[2].value.toLowerCase(); // Backend enum ile uyumlu olması için küçük harf

            // Checkbox'lardan tesisleri (facilities) metin olarak birleştiriyoruz
            const checkedBoxes = form.querySelectorAll('.facilities input[type="checkbox"]:checked');
            const seatingArrangement = Array.from(checkedBoxes)
                .map(box => box.parentElement.textContent.trim())
                .join(', ');

            if (!hall_name || !capacity) {
                alert("Lütfen gerekli alanları doldurunuz.");
                return;
            }

            // Backend'in beklediği veri yapısı (schemas.HallCreate)
            const payload = {
                hall_name: hall_name,
                capacity: capacity,
                hall_type: hall_type, // 'classroom', 'hall', 'lab'
                is_shared: true, // Dekan eklediği için varsayılan olarak paylaşımlı
                department_id: null, // Genel sınıflarda departman boş bırakılır
                seating_arrangement: seatingArrangement,
                two_invigilators_required: false
            };

            try {
                const response = await fetch(`${API_URL}/halls/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert("Sınıf başarıyla kaydedildi!");
                    form.reset();
                    await fetchHalls(); // Tabloyu yenile
                } else {
                    const error = await response.json();
                    alert("Hata: " + (error.detail || "Sınıf eklenemedi"));
                }
            } catch (error) {
                console.error("Bağlantı hatası:", error);
                alert("Sunucuya bağlanılamadı.");
            }
        });
    }

    // 3. Tabloyu Backend Verileriyle Doldurma
    async function fetchHalls() {
        try {
            const response = await fetch(`${API_URL}/halls/`);
            const halls = await response.json();

            tableBody.innerHTML = ''; // Eski satırları temizle

            halls.forEach(hall => {
                const row = document.createElement('tr');
                row.dataset.id = hall.id; // Silme işlemi için ID'yi saklıyoruz

                row.innerHTML = `
                    <td class="font-medium">${hall.hall_name}</td>
                    <td><span class="badge badge-purple">${hall.hall_type.toUpperCase()}</span></td>
                    <td>${hall.capacity} Students</td>
                    <td class="tags">
                        ${hall.seating_arrangement ? 
                            hall.seating_arrangement.split(', ').map(tag => `<span>${tag}</span>`).join('') : 
                            '<span>-</span>'}
                    </td>
                    <td class="actions">
                        <div class="action-icons">
                            <i class="fa-regular fa-eye" title="Görüntüle"></i>
                            <i class="fa-regular fa-trash-can" onclick="deleteHall(${hall.id})" title="Sil"></i>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Veri çekme hatası:", error);
        }
    }

    // 4. Sınıf Silme İşlemi
    window.deleteHall = async function(id) {
        if (confirm("Bu sınıfı veritabanından tamamen silmek istediğinize emin misiniz?")) {
            try {
                const response = await fetch(`${API_URL}/halls/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert("Sınıf silindi.");
                    await fetchHalls();
                } else {
                    alert("Silme işlemi başarısız.");
                }
            } catch (error) {
                console.error("Silme hatası:", error);
            }
        }
    };
});