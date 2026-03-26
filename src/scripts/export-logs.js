class ExportLogs {
  constructor() {
    this.loadLogs();
  }

  async loadLogs() {
    try {
      const response = await fetch('http://localhost:3110/api/export-logs');
      const result = await response.json();

      if (result.success) {
        this.displayLogs(result.data);
      }
    } catch (error) {
      console.error('Kayıtlar yüklenirken hata:', error);
    }
  }

  displayLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '';

    logs.forEach((log) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${new Date(log.export_date).toLocaleString()}</td>
                <td>${log.reference_no}</td>
                <td>${log.product_name}</td>
                <td>${log.quantity}</td>
                <td>${log.file_name}</td>
                <td>
                    <button onclick="openFile('${log.file_path}')">Aç</button>
                </td>
            `;
      tbody.appendChild(row);
    });
  }
}

// Dosyayı açma fonksiyonu
function openFile(filePath) {
  window.api.openFile(filePath);
}

// Sayfayı başlat
document.addEventListener('DOMContentLoaded', () => {
  new ExportLogs();
});
