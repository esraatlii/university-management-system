// js/login.js - BACKEND OLMADAN ÇALIŞAN VERSİYON (MOCK)

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Sayfanın yenilenmesini engelle

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('error-message');
    const loginBtn = document.querySelector('.login-btn');

    // Butona basıldığını hissettirelim
    loginBtn.innerText = "Kontrol Ediliyor...";
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';

    // 1 SANİYE BEKLEME (Gerçekçi olsun diye)
    setTimeout(() => {
        let userRole = null;
        let redirectUrl = "";
        let userName = "";

        // --- BURASI SENİN "SAHTE" VERİTABANIN ---
        // Şifre hepsinde "123456" olsun kolaylık olsun.
        
        if (email === "admin@uni.edu.tr" && password === "123456") {
            userRole = "admin";
            userName = "Sistem Yöneticisi";
            redirectUrl = "admin/admin_dashboard.html";
        } 
        else if (email === "dekan@uni.edu.tr" && password === "123456") {
            userRole = "dean";
            userName = "Prof. Dr. Dekan";
            redirectUrl = "dean/dean_dashboard.html";
        } 
        else if (email === "bolum@uni.edu.tr" && password === "123456") {
            userRole = "department_rep";
            userName = "Bölüm Başkanı";
            redirectUrl = "department_rep/rep_dashboard.html";
        }

        // --- KONTROL SONUCU ---
        
        if (userRole) {
            // BAŞARILI: Kullanıcıyı tarayıcı hafızasına (localStorage) kaydet
            const user = {
                id: 99,
                full_name: userName,
                email: email,
                role: userRole
            };
            
            localStorage.setItem('user', JSON.stringify(user));
            console.log("Giriş Başarılı:", user);

            // Yönlendir
            window.location.href = redirectUrl;

        } else {
            // HATA: Yanlış email veya şifre
            errorMsg.style.display = 'block';
            errorMsg.innerText = "Hatalı E-posta veya Şifre! (Şifre: 123456)";
            loginBtn.innerText = "Giriş Yap";
            loginBtn.disabled = false;
        }

    }, 800); // 0.8 saniye bekle
});