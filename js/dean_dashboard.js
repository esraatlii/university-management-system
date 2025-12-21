document.addEventListener('DOMContentLoaded', function () {
    console.log("Dean Dashboard Loaded");

    // --- İncele Butonları ---
    const reviewButtons = document.querySelectorAll('.reviewBtn');
    
    reviewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Tıklanan satırdaki bölüm adını al
            const row = this.closest('tr');
            const deptName = row.querySelector('td:first-child').innerText;
            
            // Gerçek senaryoda burası detay sayfasına yönlendirir
            alert(`${deptName} için inceleme sayfası açılıyor...`);
            // Örn: window.location.href = 'program_details.html?dept=' + encodeURIComponent(deptName);
        });
    });

    // --- Sayfalama (Pagination) Mock Mantığı ---
    const prevBtn = document.querySelector('.prevBtn');
    const nextBtn = document.querySelector('.nextBtn');
    
    if(prevBtn) {
        prevBtn.addEventListener('click', () => {
            alert("Önceki sayfaya gidiliyor...");
        });
    }

    if(nextBtn) {
        nextBtn.addEventListener('click', () => {
            alert("Sonraki sayfaya gidiliyor...");
        });
    }
});