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
  loginForm.addEventListener('submit', (e) => {
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

    // Check default admin credentials
    if (username === 'admin' && password === 'admin123') {
      window.location.href = 'anasayfa.html';
      return;
    }

    // Check registered users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      window.location.href = 'anasayfa.html';
    } else {
      showError('Kullanıcı adı veya şifre hatalı!');
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
