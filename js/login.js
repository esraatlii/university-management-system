// Backend adresi (Daha önceki konuşmalara istinaden 8001 portu)
const API_URL = "http://127.0.0.1:8001/api";

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Sayfanın yenilenmesini engelle

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorBox = document.getElementById('error-message');
    const loginBtn = document.querySelector('.login-btn');

    // Başlangıç durumu: Butonu kilitle, hatayı gizle
    loginBtn.innerText = "Giriş Yapılıyor...";
    loginBtn.disabled = true;
    errorBox.style.display = 'none';
    errorBox.innerText = "";

    try {
        // 1. Backend'e Giriş İsteği At
        // Not: Backend'in login endpoint'i genelde '/auth/login' veya '/login' olur. 
        // FastAPI standardına göre form-data veya json bekleyebilir. Biz JSON deniyoruz.
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        // 2. Yanıtı Kontrol Et
        if (response.ok) {
            const userData = await response.json(); 
            
            // Kullanıcı bilgilerini tarayıcıya kaydet (İsim, Rol vb.)
            localStorage.setItem('user', JSON.stringify(userData));

            // Rol Kontrolü ve Yönlendirme
            const role = userData.role; // backend'den 'admin', 'dean', 'department_rep' gelmeli

            if (role === 'admin') {
                window.location.href = "admin/admin_dashboard.html";
            } else if (role === 'dean') {
                window.location.href = "dean/dean_dashboard.html";
            } else if (role === 'department_rep') {
                window.location.href = "department_rep/rep_dashboard.html";
            } else {
                // Rol tanımsızsa varsayılan
                alert("Rol tanımlanamadı, ana sayfaya yönlendiriliyorsunuz.");
                window.location.href = "index.html";
            }

        } else {
            // Hata Durumu (401 Unauthorized vb.)
            const errorData = await response.json();
            errorBox.innerText = errorData.detail || "Email veya şifre hatalı!";
            errorBox.style.display = 'block';
        }

    } catch (error) {
        console.error("Bağlantı hatası:", error);
        errorBox.innerText = "Sunucuya bağlanılamadı. Backend (8001) açık mı?";
        errorBox.style.display = 'block';
    } finally {
        // İşlem bitince butonu eski haline getir
        loginBtn.innerText = "Giriş Yap";
        loginBtn.disabled = false;
    }
});