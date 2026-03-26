class AdminPanel {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
      uploadForm.addEventListener('submit', this.handleUpload.bind(this));
    }
  }

  async handleUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];

    if (file) {
      try {
        const data = await this.readExcelFile(file);
        const result = await window.api.uploadExcelData(data);

        if (result.success) {
          this.showMessage('Veriler başarıyla yüklendi', 'success');
        } else {
          this.showMessage('Veri yükleme hatası', 'error');
        }
      } catch (error) {
        console.error('Yükleme hatası:', error);
        this.showMessage('Veri yükleme hatası', 'error');
      }
    }
  }

  async readExcelFile(file) {
    // Excel okuma işlemleri
    // XLSX kütüphanesi kullanarak Excel dosyasını oku
    // ve verileri uygun formata dönüştür
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
}
