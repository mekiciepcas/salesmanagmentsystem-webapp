// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Form elements
  const registerForm = document.getElementById('registerForm');
  const usernameInput = document.querySelector('input[name="username"]');
  const emailInput = document.querySelector('input[name="email"]');
  const passwordInput = document.querySelector('input[name="password"]');
  const confirmPasswordInput = document.querySelector(
    'input[name="confirmPassword"]'
  );
  const fullNameInput = document.querySelector('input[name="fullName"]');
  const departmentInput = document.querySelector('select[name="department"]');
  const registerButton = document.querySelector('.login-button');
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

  // Register form handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    const formData = new FormData(registerForm);
    const registrationKey =
      localStorage.getItem('epcRegistrationUnlocked') === '1'
        ? 'adminadmin'
        : '';
    if (!registrationKey) {
      errorMessage.textContent =
        'Kayıt kapalı. Giriş sayfasında yetkili alandan önce kayıt açın.';
      errorMessage.style.display = 'block';
      return;
    }

    const userData = {
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
      fullName: formData.get('fullName'),
      department: formData.get('department'),
      registrationKey,
    };

    // Basit validasyon
    if (
      !userData.username ||
      !userData.email ||
      !userData.password ||
      !userData.fullName ||
      !userData.department
    ) {
      errorMessage.textContent = 'Lütfen tüm alanları doldurun';
      errorMessage.style.display = 'block';
      return;
    }

    try {
      const response = await window.httpAPI.post(
        '/api/auth/register',
        userData
      );
      console.log('Register response:', response);

      if (response.success) {
        // Kayıt başarılı - giriş sayfasına yönlendir
        window.app.navigate('login.html');
      } else {
        // Hata mesajını göster
        errorMessage.textContent =
          response.error || 'Kayıt sırasında bir hata oluştu';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Register error:', error);
      errorMessage.textContent =
        'Kayıt yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
      errorMessage.style.display = 'block';
    }
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
