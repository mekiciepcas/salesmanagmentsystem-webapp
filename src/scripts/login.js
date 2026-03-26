/**
 * Giriş + compare.md: görünmez alanda "adminadmin" ile kayıt modalı.
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorMessage = document.getElementById('error-message');
  const trapInput = document.getElementById('adminTrapInput');
  const regOverlay = document.getElementById('adminRegisterOverlay');
  const regForm = document.getElementById('adminRegisterForm');
  const regClose = document.getElementById('adminRegisterClose');

  function showErr(msg) {
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    } else {
      alert(msg);
    }
  }

  function clearErr() {
    if (errorMessage) {
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
    }
  }

  trapInput?.addEventListener('input', () => {
    if (trapInput.value === 'adminadmin') {
      trapInput.value = '';
      localStorage.setItem('epcRegistrationUnlocked', '1');
      if (regOverlay) regOverlay.style.display = 'flex';
    }
  });

  regClose?.addEventListener('click', () => {
    if (regOverlay) regOverlay.style.display = 'none';
  });

  regOverlay?.addEventListener('click', (e) => {
    if (e.target === regOverlay) regOverlay.style.display = 'none';
  });

  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(regForm);
    const payload = {
      username: fd.get('username'),
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('fullName'),
      department: fd.get('department') || 'Satis',
      registrationKey: 'adminadmin',
    };
    try {
      const res = await window.httpAPI.post('/api/auth/register', payload);
      if (res.success) {
        if (regOverlay) regOverlay.style.display = 'none';
        clearErr();
        alert('Kayıt başarılı. Giriş yapın.');
      }
    } catch (err) {
      alert(err.message || 'Kayıt başarısız');
    }
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr();
    const formData = new FormData(loginForm);
    const userData = {
      username: formData.get('username'),
      password: formData.get('password'),
    };

    try {
      const response = await window.httpAPI.post('/api/auth/login', userData);

      if (response.success) {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        const userInfo = {
          id: response.user.id,
          username: response.user.username,
          fullName: response.user.full_name || response.user.fullName,
          department: response.user.department,
        };
        localStorage.setItem('currentUser', JSON.stringify(userInfo));
        window.location.href = 'portal.html';
      } else {
        showErr(response.error || 'Giriş başarısız');
      }
    } catch (error) {
      console.error('Login hatası:', error);
      showErr('Kullanıcı adı veya şifre yanlış');
    }
  });
});
