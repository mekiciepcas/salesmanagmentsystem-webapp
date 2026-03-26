// portal.js

document.addEventListener('DOMContentLoaded', () => {
    const btnArge = document.getElementById('btn-arge');
    const btnSatis = document.getElementById('btn-satis');
    const btnDashboard = document.getElementById('btn-dashboard');

    // Kullanıcı bilgisini localStorage'dan al ve göster
    const usernameElement = document.getElementById('portal-username');
    try {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            console.log('Portal - Kullanıcı:', user);
            
            // Kullanıcı adını göster (fullName varsa onu, yoksa username'i kullan)
            if (usernameElement) {
                const displayName = user.fullName || user.full_name || user.username || 'Kullanıcı';
                usernameElement.textContent = displayName;
            }
        } else if (usernameElement) {
            usernameElement.textContent = 'Kullanıcı';
        }
    } catch (e) {
        console.error('Kullanıcı bilgisi alınamadı:', e);
        if (usernameElement) {
            usernameElement.textContent = 'Kullanıcı';
        }
    }

    btnArge?.addEventListener('click', () => {
        location.href = 'arge.html';
    });

    btnSatis?.addEventListener('click', () => {
        location.href = 'anasayfa.html';
    });

    btnDashboard?.addEventListener('click', () => {
        location.href = 'dashboard.html';
    });

    const btnLogout = document.getElementById('btn-logout');
    btnLogout?.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        location.href = 'login.html';
    });
});
