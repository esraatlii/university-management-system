// backend adresini tanımlayalım
const API_URL = "http://127.0.0.1:8001/api";

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Sayfanın yenilenmesini engelle

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('error-message');
    const loginBtn = document.querySelector('.login-btn');

    // Görsel geri bildirim
    loginBtn.innerText = "Giriş Yapılıyor...";
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        // Backend'deki /api/auth/login endpoint'ine istek atıyoruz [cite: 13, 14]
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

        if (response.ok) {
            const user = await response.json(); // Backend'den UserOut şeması döner 
            
            // Başarılı: Kullanıcı bilgilerini tarayıcı hafızasına kaydet
            localStorage.setItem('user', JSON.stringify(user));
            
            // Role göre yönlendirme mantığı 
            if (user.role === "admin") {
                window.location.href = "admin/admin_dashboard.html";
            } else if (user.role === "dean") {
                window.location.href = "dean/dean_dashboard.html";
            } else if (user.role === "department_rep") {
                window.location.href = "department_rep/rep_dashboard.html";
            }
        } else {
            // Hatalı giriş (401 vb.) 
            const errorData = await response.json();
            errorMsg.innerText = errorData.detail || "Giriş başarısız.";
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Bağlantı hatası:", error);
        errorMsg.innerText = "Sunucuya bağlanılamadı. Lütfen backend'in çalıştığından emin olun.";
        errorMsg.style.display = 'block';
    } finally {
        loginBtn.innerText = "Giriş Yap";
        loginBtn.disabled = false;
    }
});