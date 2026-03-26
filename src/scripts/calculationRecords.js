
//Bu dosya Yapılan sistem hesaplarının hafızada tutulabilmesi ve gelecekte örnek cihaz hesaplamaları için 
class CalculationRecords {
  constructor() {
    // CalculationRecords sınıfının yapıcı metodu.
    // Sınıf örneği oluşturulduğunda çalışır ve gerekli başlangıç işlemlerini yapar.
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.records = [];
    this.currentFilter = 'all';
    this.initializeElements();
    this.bindEvents();
    this.loadRecords();
  }

  initializeElements() {
    // Arayüzdeki HTML elementlerini seçer ve sınıf özelliklerine atar.
    this.recordsGrid = document.querySelector('.records-grid');
    this.searchInput = document.getElementById('searchInput');
    this.filterButtons = document.querySelectorAll('.filter-btn');
    this.detailModal = document.getElementById('detailModal');
  }

  bindEvents() {
    // Arayüzdeki elementlere olay dinleyicileri ekler.
    // Arama inputuna ve filtre butonlarına tıklama olayları bağlanır.
    this.searchInput.addEventListener('input', () => this.filterRecords());
    this.filterButtons.forEach((btn) => {
      btn.addEventListener('click', (e) =>
        this.setFilter(e.target.dataset.filter)
      );
    });
  }

  async loadRecords() {
    // Sunucudan hesaplama kayıtlarını yükler.
    try {
      const response = await fetch('/api/calculations');
      const data = await response.json();
      this.records = data;
      this.displayRecords();
    } catch (error) {
      console.error('Kayıtlar yüklenemedi:', error);
    }
  }

  displayRecords() {
    // Hesaplama kayıtlarını arayüzde görüntüler.
    this.recordsGrid.innerHTML = '';

    const filteredRecords = this.filterRecords();

    filteredRecords.forEach((record) => {
      const card = this.createRecordCard(record);
      this.recordsGrid.appendChild(card);
    });
  }

  createRecordCard(record) {
    // Hesaplama kaydı için bir kart oluşturur.
    const card = document.createElement('div');
    card.className = 'record-card';
    card.innerHTML = `
            <div class="record-header">
                <h3>${record.customer_name || 'İsimsiz Hesaplama'}</h3>
                <span class="reference">${record.reference_no}</span>
            </div>
            <div class="record-body">
                <div class="company">${record.customer_company || '-'}</div>
                <div class="items-count">${record.items.length} Ürün</div>
                <div class="total-price">${record.total_price.toFixed(2)} €</div>
            </div>
            <div class="record-footer">
                <span class="date">${new Date(record.created_at).toLocaleDateString()}</span>
                <button class="view-details" data-id="${record.id}">Detaylar</button>
            </div>
        `;

    card.querySelector('.view-details').addEventListener('click', () => {
      this.showDetails(record);
    });

    return card;
  }

  showDetails(record) {
    // Seçilen hesaplama kaydının detaylarını bir modal içinde gösterir.
    const modalBody = this.detailModal.querySelector('.modal-body');
    modalBody.innerHTML = `
            <div class="detail-section">
                <h3>Müşteri Bilgileri</h3>
                <div class="detail-row">
                    <span>Müşteri:</span>
                    <span>${record.customer_name}</span>
                </div>
                <div class="detail-row">
                    <span>Firma:</span>
                    <span>${record.customer_company}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Ürünler</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Ürün</th>
                            <th>Adet</th>
                            <th>Birim Fiyat</th>
                            <th>Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${record.items
                          .map(
                            (item) => `
                            <tr>
                                <td>${item.model_name}</td>
                                <td>${item.quantity}</td>
                                <td>${item.unit_price.toFixed(2)} €</td>
                                <td>${item.total_price.toFixed(2)} €</td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>

            ${
              record.system_calculation
                ? `
                <div class="detail-section">
                    <h3>Sistem Hesaplaması</h3>
                    <!-- Sistem hesaplama detayları -->
                </div>
            `
                : ''
            }

            ${
              record.battery_calculation
                ? `
                <div class="detail-section">
                    <h3>Batarya Hesaplaması</h3>
                    <!-- Batarya hesaplama detayları -->
                </div>
            `
                : ''
            }

            <div class="detail-section">
                <h3>Notlar</h3>
                <p>${record.notes || '-'}</p>
            </div>
        `;

    this.detailModal.style.display = 'block';
  }

  filterRecords() {
    // Hesaplama kayıtlarını filtreler.
    const searchTerm = this.searchInput.value.toLowerCase();
    return this.records.filter((record) => {
      const matchesFilter =
        this.currentFilter === 'all' || record.status === this.currentFilter;
      const matchesSearch =
        record.customer_name?.toLowerCase().includes(searchTerm) ||
        record.customer_company?.toLowerCase().includes(searchTerm) ||
        record.reference_no.toLowerCase().includes(searchTerm);

      return matchesFilter && matchesSearch;
    });
  }

  setFilter(filter) {
    // Filtreleme ayarını yapar ve kayıtları yeniden görüntüler.
    this.currentFilter = filter;
    this.filterButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.displayRecords();
  }

  async saveCalculation(data) {
    // Hesaplama verilerini sunucuya kaydeder.
    try {
      const calculationData = {
        ...data,
        prepared_by: this.currentUser?.fullName || 'Bilinmeyen Kullanıcı',
        user_id: this.currentUser?.id,
      };

      const response = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculationData),
      });
      // ...
    } catch (error) {
      console.error('Hesaplama kaydedilemedi:', error);
    }
  }
}

// Sayfa yüklendiğinde kayıtları başlat
document.addEventListener('DOMContentLoaded', () => {
  window.records = new CalculationRecords();
});
