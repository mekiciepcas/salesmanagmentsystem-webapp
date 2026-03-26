class PriceCalculator {
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.calculations = {
      items: [],
      systemCalc: null,
      batteryCalc: null,
    };
  }

  initializeElements() {
    // Form elementleri
    this.customerName = document.getElementById('customerName');
    this.customerCompany = document.getElementById('customerCompany');
    this.notes = document.getElementById('notes');

    // Tablo ve butonlar
    this.productsTable = document.getElementById('productsTable');
    this.addProductBtn = document.getElementById('addProduct');
    this.systemCalcBtn = document.getElementById('showSystemCalc');
    this.batteryCalcBtn = document.getElementById('showBatteryCalc');
    this.saveBtn = document.getElementById('saveCalculation');

    // Toplam alanları
    this.totalPrice = document.getElementById('totalPrice');
    this.totalMargin1 = document.getElementById('totalMargin1');
    this.totalMargin2 = document.getElementById('totalMargin2');
  }

  bindEvents() {
    this.addProductBtn.addEventListener('click', () => this.addProductRow());
    this.systemCalcBtn.addEventListener('click', () => this.showSystemCalc());
    this.batteryCalcBtn.addEventListener('click', () => this.showBatteryCalc());
    this.saveBtn.addEventListener('click', () => this.saveCalculation());
  }

  async addProductRow() {
    const row = this.productsTable.querySelector('tbody').insertRow();
    // Ürün seçimi ve diğer inputları ekle
    this.updateTotals();
  }

  updateTotals() {
    let total = 0,
      margin1 = 0,
      margin2 = 0;

    this.calculations.items.forEach((item) => {
      total += item.total_price;
      margin1 += item.margin_1;
      margin2 += item.margin_2;
    });

    this.totalPrice.textContent = `${total.toFixed(2)} €`;
    this.totalMargin1.textContent = `${margin1.toFixed(2)} €`;
    this.totalMargin2.textContent = `${margin2.toFixed(2)} €`;
  }

  async saveCalculation() {
    try {
      const calculationData = {
        customer_name: this.customerName.value,
        customer_company: this.customerCompany.value,
        notes: this.notes.value,
        items: this.calculations.items,
        system_calculation: this.calculations.systemCalc,
        battery_calculation: this.calculations.batteryCalc,
      };

      const response = await fetch('/api/calculations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calculationData),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Hesaplama kaydedildi. Referans No: ${result.reference_no}`);
        // Başarılı kayıt sonrası formu temizle
        this.resetForm();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      alert('Hesaplama kaydedilirken bir hata oluştu');
    }
  }

  resetForm() {
    this.customerName.value = '';
    this.customerCompany.value = '';
    this.notes.value = '';
    this.calculations.items = [];
    this.calculations.systemCalc = null;
    this.calculations.batteryCalc = null;
    this.productsTable.querySelector('tbody').innerHTML = '';
    this.updateTotals();
  }
}

// Sayfa yüklendiğinde calculator'ı başlat
document.addEventListener('DOMContentLoaded', () => {
  window.calculator = new PriceCalculator();
});
