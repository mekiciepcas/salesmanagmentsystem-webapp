// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Form elements
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.querySelector('input[name="username"]');
  const passwordInput = document.querySelector('input[name="password"]');
  const loginButton = document.querySelector('.login-button');
  const exitButton = document.querySelector('.exit-button');
  const forgotButton = document.querySelector('.forgot-button');
  const minimizeButton = document.querySelector('.minimize');
  const closeButton = document.querySelector('.close');
  const errorMessage = document.getElementById('error-message');

  // Function to show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('visible');
  }

  // Function to hide error message
  function hideError() {
    errorMessage.textContent = '';
    errorMessage.classList.remove('visible');
  }

  // Window controls
  minimizeButton?.addEventListener('click', () => window.api.minimize());
  closeButton?.addEventListener('click', () => window.api.close());
  exitButton?.addEventListener('click', () => window.api.close());

  // Login form handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Lütfen kullanıcı adı ve şifre giriniz.');
      return;
    }

    loginButton.textContent = 'Giriş Yapılıyor...';
    loginButton.disabled = true;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.token) {
        throw new Error(result.error || 'Kullanıcı adı veya şifre hatalı!');
      }

      localStorage.setItem('authToken', result.token);
      localStorage.setItem('token', result.token);
      if (result.user) {
        localStorage.setItem('currentUser', JSON.stringify(result.user));
      }
      window.location.href = 'anasayfa.html';
    } catch (error) {
      showError(error.message || 'Giriş sırasında bir hata oluştu.');
      loginButton.textContent = 'Giriş Yap';
      loginButton.disabled = false;
    }
  });

  // Forgot password handler
  forgotButton?.addEventListener('click', () => {
    showError('Şifre sıfırlama özelliği yakında eklenecektir.');
  });

  // Input focus effects
  document.querySelectorAll('.modern-input').forEach((input) => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
      hideError();
    });

    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('focused');
    });
  });
});
