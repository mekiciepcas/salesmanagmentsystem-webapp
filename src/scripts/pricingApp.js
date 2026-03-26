class PricingApp {
  constructor() {
    // HTML'deki mevcut elementleri al
    this.productSelect = document.getElementById('productSelect');
    this.subtypeSelect = document.getElementById('subtypeSelect');
    this.quantityInput = document.getElementById('quantityInput');
    this.addButton = document.getElementById('addButton');
    this.manualAddButton = document.getElementById('manualAddButton');
    this.deleteButton = document.getElementById('deleteButton');
    this.exportButton = document.getElementById('exportButton');
    this.showTotalsButton = document.getElementById('showTotalsButton');
    this.priceTableBody = document.getElementById('priceTableBody');

    // Araçlar butonu ve menüsü
    this.toolsButton = document.getElementById('toolsButton');
    this.toolsMenu = document.getElementById('toolsMenu');

    // Debug için
    console.log('Product Select:', this.productSelect);
    console.log('Subtype Select:', this.subtypeSelect);

    // Quantity input için varsayılan değeri ayarla
    this.quantityInput.value = '1';
    this.quantityInput.min = '1'; // Minimum değeri de 1 olarak ayarla

    this.setupEventListeners();
    this.loadExcelData();

    // Tablo ayarlarını yap
    this.setupTable();

    // Araçlar menüsünü aç/kapa
    this.setupToolsMenu();

    // Hesaplayıcıları ayarla
    this.setupCalculators();
  }

  async loadExcelData() {
    try {
      console.log('Loading Excel data...');
      const result = await window.api.loadExcelData();
      console.log('Excel data loaded:', result);
      await this.loadProductTypes();
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    }
  }

  async loadProductTypes() {
    try {
      console.log('Loading product types...');
      const productTypes = await window.api.getProductTypes();
      console.log('Product types:', productTypes);

      this.productSelect.innerHTML =
        '<option value="">Ürün Seçiniz...</option>';
      productTypes.forEach((type) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        this.productSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Product types yükleme hatası:', error);
    }
  }

  async loadSubtypes(productType) {
    try {
      console.log('Loading subtypes for:', productType);
      const result = await window.api.getSubtypes(productType);
      console.log('Subtype result:', result);

      if (!result.hasSubtypes) {
        // Alt kategori yoksa
        this.subtypeSelect.disabled = true;
        this.subtypeSelect.innerHTML = '<option value="">Alt Tip Yok</option>';

        // Fiyatı direkt ürüne ekle
        const selectedOption =
          this.productSelect.options[this.productSelect.selectedIndex];
        selectedOption.dataset.cost = result.cost;
      } else {
        // Alt kategoriler varsa
        this.subtypeSelect.disabled = false;
        this.subtypeSelect.innerHTML =
          '<option value="">Alt Tip Seçiniz...</option>';
        result.subtypes.forEach((item) => {
          const option = document.createElement('option');
          option.value = item.subtype;
          option.textContent = item.subtype;
          option.dataset.cost = item.cost;
          this.subtypeSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Subtypes yükleme hatası:', error);
    }
  }

  setupEventListeners() {
    // Debug için event listener'ları
    console.log('Setting up event listeners...');

    this.productSelect?.addEventListener('change', (e) => {
      console.log('Product selected:', e.target.value);
      this.loadSubtypes(e.target.value);
    });

    this.addButton?.addEventListener('click', () => this.addRow());
    this.deleteButton?.addEventListener('click', () =>
      this.removeSelectedRows()
    );
    this.showTotalsButton?.addEventListener('click', () => this.showTotals());
    this.exportButton?.addEventListener('click', () => this.exportToExcel());
    this.manualAddButton?.addEventListener('click', () => this.addManualRow());
  }

  setupTable() {
    // Tablo özelliklerini ayarla
    this.priceTableBody.addEventListener('click', (event) => {
      const row = event.target.closest('tr');
      if (!row) return;

      // Input'a tıklanmışsa satır seçimini engelle
      if (
        event.target.tagName === 'INPUT' &&
        event.target.type !== 'checkbox'
      ) {
        return;
      }

      // Checkbox'ı bul ve durumunu değiştir
      const checkbox = row.querySelector('.row-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        // Seçili sınıfını güncelle
        row.classList.toggle('selected', checkbox.checked);
      }
    });

    // Input değişikliklerini dinle
    this.priceTableBody.addEventListener('input', (event) => {
      const input = event.target;
      if (input.tagName === 'INPUT') {
        const row = input.closest('tr');
        if (row) {
          this.recalculateRow(row);
        }
      }
    });

    // Delete tuşu ile silme
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Delete') {
        this.removeSelectedRows();
      }
    });
  }

  handleRowSelection(row, isCtrlPressed) {
    // Ctrl basılı değilse önceki seçimleri kaldır
    if (!isCtrlPressed) {
      const selectedRows = this.priceTableBody.querySelectorAll('tr.selected');
      selectedRows.forEach((selectedRow) => {
        if (selectedRow !== row) {
          selectedRow.classList.remove('selected');
        }
      });
    }

    // Seçili durumu değiştir
    row.classList.toggle('selected');
  }

  addRow() {
    // Önce önceki seçili satırları temizle
    const selectedRows = this.priceTableBody.querySelectorAll('tr.selected');
    selectedRows.forEach((row) => row.classList.remove('selected'));

    const row = this.priceTableBody.insertRow();
    const rowNum = this.priceTableBody.rows.length - 1;

    let productName, cost;
    const selectedProduct =
      this.productSelect.options[this.productSelect.selectedIndex];

    // Quantity değerini kontrol et, boşsa 1 kullan
    const quantity = this.quantityInput.value || '1';

    if (this.subtypeSelect.disabled) {
      // Alt kategori yoksa direkt ürün adı ve fiyatını kullan
      productName = selectedProduct.value;
      cost = selectedProduct.dataset.cost;
    } else {
      // Alt kategori varsa ürün - alt kategori formatını kullan
      const selectedSubtype =
        this.subtypeSelect.options[this.subtypeSelect.selectedIndex];
      if (!selectedSubtype || !selectedSubtype.value) {
        alert('Lütfen alt tip seçiniz');
        row.remove();
        return;
      }
      productName = `${selectedProduct.value} - ${selectedSubtype.value}`;
      cost = selectedSubtype.dataset.cost;
    }

    const cells = Array(10)
      .fill(null)
      .map(() => row.insertCell());

    // Checkbox hücresi
    cells[0].innerHTML = `<input type="checkbox" class="row-checkbox">`;
    cells[0].className = 'checkbox-cell';

    // Diğer hücreler
    cells[1].textContent = rowNum;
    cells[2].textContent = productName;
    cells[3].textContent = cost;
    cells[4].innerHTML = `<input type="number" class="quantity-input" value="${quantity}" min="1" />`;
    cells[5].className = 'total-cost';
    cells[6].innerHTML = `<input type="number" class="margin1-input" value="1.2" />`; // Margin-1 varsayılan 1.2
    cells[7].innerHTML = `<input type="number" class="margin2-input" value="1.6" />`; // Margin-2 varsayılan 1.6
    cells[8].className = 'total-margin1';
    cells[9].className = 'total-margin2';

    // Checkbox event listener
    const checkbox = cells[0].querySelector('.row-checkbox');
    checkbox.addEventListener('change', (event) => {
      row.classList.toggle('selected', event.target.checked);
    });

    this.recalculateRow(row);

    // Quantity input'u varsayılan değere resetle
    this.quantityInput.value = '1';

    // Yeni satırı seçili yap
    row.classList.add('selected');
  }

  removeSelectedRows() {
    try {
      const selectedRows = Array.from(
        this.priceTableBody.querySelectorAll('input.row-checkbox:checked')
      )
        .map((checkbox) => checkbox.closest('tr'))
        .sort((a, b) => b.rowIndex - a.rowIndex);

      if (selectedRows.length === 0) {
        console.log('Silinecek satır seçilmedi');
        return;
      }

      selectedRows.forEach((row) => row.remove());
      this.updateRowNumbers();

      console.log(`${selectedRows.length} satır silindi`);
    } catch (error) {
      console.error('Satır silme hatası:', error);
    }
  }

  updateRowNumbers() {
    try {
      const rows = Array.from(this.priceTableBody.getElementsByTagName('tr'));
      rows.forEach((row, index) => {
        // Sadece sıra numarası sütununu güncelle (cells[1])
        row.cells[1].textContent = index + 1;
      });
    } catch (error) {
      console.error('Satır numaraları güncelleme hatası:', error);
    }
  }

  recalculateRow(row) {
    const costCell = row.cells[3]; // Maliyet hücresi
    const quantityInput = row.querySelector('.quantity-input');
    const margin1Input = row.querySelector('.margin1-input');
    const margin2Input = row.querySelector('.margin2-input');

    if (costCell && quantityInput && margin1Input && margin2Input) {
      const cost = parseFloat(costCell.textContent) || 0;
      const quantity = parseInt(quantityInput.value) || 0;
      const margin1 = parseFloat(margin1Input.value) || 0;
      const margin2 = parseFloat(margin2Input.value) || 0;

      const totalCost = cost * quantity;
      // Margin hesaplamalarını düzelt - sadece margin değeri ile çarp
      const totalM1 = totalCost * margin1;
      const totalM2 = totalCost * margin2;

      row.querySelector('.total-cost').textContent = totalCost.toFixed(2);
      row.querySelector('.total-margin1').textContent = totalM1.toFixed(2);
      row.querySelector('.total-margin2').textContent = totalM2.toFixed(2);
    }
  }

  showTotals() {
    let totalCost = 0;
    let totalMargin1 = 0;
    let totalMargin2 = 0;

    const rows = Array.from(this.priceTableBody.getElementsByTagName('tr'));
    rows.forEach((row) => {
      if (!row.classList.contains('total-row')) {
        // Toplam satırı değilse
        totalCost +=
          parseFloat(row.querySelector('.total-cost')?.textContent) || 0;
        totalMargin1 +=
          parseFloat(row.querySelector('.total-margin1')?.textContent) || 0;
        totalMargin2 +=
          parseFloat(row.querySelector('.total-margin2')?.textContent) || 0;
      }
    });

    // Varsa önceki toplam satırını kaldır
    const existingTotalRow = this.priceTableBody.querySelector('.total-row');
    if (existingTotalRow) {
      existingTotalRow.remove();
    }

    // Toplam satırını ekle
    const totalRow = this.priceTableBody.insertRow();
    totalRow.className = 'total-row';

    const cells = Array(10)
      .fill(null)
      .map(() => totalRow.insertCell());

    // Checkbox hücresi boş
    cells[0].className = 'checkbox-cell';

    // Diğer hücreler
    cells[1].textContent = ''; // No
    cells[2].textContent = 'TOPLAM'; // Ürün
    cells[3].textContent = ''; // Maliyet
    cells[4].textContent = ''; // Adet
    cells[5].textContent = totalCost.toFixed(2); // Toplam Maliyet
    cells[6].textContent = ''; // Margin-1
    cells[7].textContent = ''; // Margin-2
    cells[8].textContent = totalMargin1.toFixed(2); // Toplam-1
    cells[9].textContent = totalMargin2.toFixed(2); // Toplam-2

    // Toplam satırı stilini güncelle
    cells.forEach((cell) => {
      cell.style.fontWeight = 'bold';
      if (cell.textContent) {
        cell.style.borderTop = '2px solid #374151';
      }
    });
  }

  async exportToExcel() {
    try {
      // Önce kaydetme dialog'unu göster
      const filePath = await window.api.showSaveDialog();
      if (!filePath) return; // Kullanıcı iptal ettiyse çık

      // Başlık satırı
      const headers = [
        'No',
        'Ürün',
        'Maliyet ($)',
        'Adet',
        'Toplam Maliyet ($)',
        'Margin-1',
        'Margin-2',
        'Toplam M-1 ($)',
        'Toplam M-2 ($)',
      ];

      // Normal satırların verilerini hazırla
      const rows = Array.from(this.priceTableBody.getElementsByTagName('tr'))
        .filter((row) => !row.classList.contains('total-row'))
        .map((row) => {
          const cells = Array.from(row.cells).slice(1);
          return [
            cells[0].textContent, // No
            cells[1].querySelector('input')
              ? cells[1].querySelector('input').value
              : cells[1].textContent,
            cells[2].querySelector('input')
              ? cells[2].querySelector('input').value
              : cells[2].textContent,
            cells[3].querySelector('input').value,
            cells[4].textContent,
            cells[5].querySelector('input').value,
            cells[6].querySelector('input').value,
            cells[7].textContent,
            cells[8].textContent,
          ];
        });

      // Toplam satırını bul ve ekle
      const totalRow = this.priceTableBody.querySelector('.total-row');
      let totals = null;
      if (totalRow) {
        const cells = Array.from(totalRow.cells).slice(1); // Checkbox hücresini atla
        totals = [
          '', // No
          'TOPLAM',
          '', // Maliyet
          '', // Adet
          cells[4].textContent, // Toplam Maliyet
          '', // Margin-1
          '', // Margin-2
          cells[7].textContent, // Toplam M-1
          cells[8].textContent, // Toplam M-2
        ];
      } else {
        // Eğer toplam satırı yoksa, showTotals'ı çağır ve tekrar dene
        this.showTotals();
        const newTotalRow = this.priceTableBody.querySelector('.total-row');
        if (newTotalRow) {
          const cells = Array.from(newTotalRow.cells).slice(1);
          totals = [
            '', // No
            'TOPLAM',
            '', // Maliyet
            '', // Adet
            cells[4].textContent, // Toplam Maliyet
            '', // Margin-1
            '', // Margin-2
            cells[7].textContent, // Toplam M-1
            cells[8].textContent, // Toplam M-2
          ];
        }
      }

      // Boş satır ekle
      const emptyRow = Array(headers.length).fill('');

      // Excel verisi oluştur
      const excelData = {
        headers,
        rows,
        emptyRow,
        totals,
        filePath,
      };

      // Excel'e aktar
      await window.api.exportToExcel(excelData);
      console.log('Excel dosyası kaydedildi:', filePath);
    } catch (error) {
      console.error('Excel aktarma hatası:', error);
      console.error('Hata detayı:', error.message);
    }
  }

  addManualRow() {
    try {
      // Önce önceki seçili satırları temizle
      const selectedRows = this.priceTableBody.querySelectorAll('tr.selected');
      selectedRows.forEach((row) => row.classList.remove('selected'));

      const row = this.priceTableBody.insertRow();
      const rowNum = this.priceTableBody.rows.length - 1;

      const cells = Array(10)
        .fill(null)
        .map(() => row.insertCell());

      // Checkbox hücresi
      cells[0].innerHTML = `<input type="checkbox" class="row-checkbox">`;
      cells[0].className = 'checkbox-cell';

      // Diğer hücreler
      cells[1].textContent = rowNum; // Sıra no
      cells[2].innerHTML = `<input type="text" class="product-input" value="" placeholder="Ürün adı..." />`; // Ürün adı
      cells[3].innerHTML = `<input type="number" class="cost-input" value="0" step="0.01" min="0" />`; // Maliyet
      cells[4].innerHTML = `<input type="number" class="quantity-input" value="1" min="1" />`; // Adet
      cells[5].className = 'total-cost';
      cells[5].textContent = '0';
      cells[6].innerHTML = `<input type="number" class="margin1-input" value="1.2" step="0.1" min="0" />`; // Margin-1 varsayılan 1.2
      cells[7].innerHTML = `<input type="number" class="margin2-input" value="1.6" step="0.1" min="0" />`; // Margin-2 varsayılan 1.6
      cells[8].className = 'total-margin1';
      cells[8].textContent = '0';
      cells[9].className = 'total-margin2';
      cells[9].textContent = '0';

      // Input event listener'ları ekle - her değişiklikte hesaplama yap
      const inputs = row.querySelectorAll('input:not([type="checkbox"])');
      inputs.forEach((input) => {
        input.addEventListener('change', () => this.recalculateManualRow(row));
        input.addEventListener('keyup', () => this.recalculateManualRow(row));
        input.addEventListener('input', () => this.recalculateManualRow(row));
      });

      // Checkbox event listener
      const checkbox = cells[0].querySelector('.row-checkbox');
      checkbox.addEventListener('change', (event) => {
        row.classList.toggle('selected', event.target.checked);
      });

      // İlk hesaplamayı yap
      this.recalculateManualRow(row);

      // Yeni satırı seçili yap
      row.classList.add('selected');

      console.log('Manuel satır eklendi');
    } catch (error) {
      console.error('Manuel satır ekleme hatası:', error);
    }
  }

  // Manuel satır için özel hesaplama metodu
  recalculateManualRow(row) {
    const costInput = row.querySelector('.cost-input');
    const quantityInput = row.querySelector('.quantity-input');
    const margin1Input = row.querySelector('.margin1-input');
    const margin2Input = row.querySelector('.margin2-input');

    if (costInput && quantityInput && margin1Input && margin2Input) {
      const cost = parseFloat(costInput.value) || 0;
      const quantity = parseInt(quantityInput.value) || 0;
      const margin1 = parseFloat(margin1Input.value) || 0;
      const margin2 = parseFloat(margin2Input.value) || 0;

      const totalCost = cost * quantity;
      // Margin hesaplamalarını düzelt - sadece margin değeri ile çarp
      const totalM1 = totalCost * margin1;
      const totalM2 = totalCost * margin2;

      const totalCostCell = row.querySelector('.total-cost');
      if (totalCostCell) {
        totalCostCell.textContent = totalCost.toFixed(2);
      }

      const totalMargin1Cell = row.querySelector('.total-margin1');
      const totalMargin2Cell = row.querySelector('.total-margin2');

      if (totalMargin1Cell) {
        totalMargin1Cell.textContent = totalM1.toFixed(2);
      }
      if (totalMargin2Cell) {
        totalMargin2Cell.textContent = totalM2.toFixed(2);
      }
    }
  }

  setupToolsMenu() {
    // Araçlar menüsünü aç/kapa
    this.toolsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toolsMenu.classList.toggle('show');
    });

    // Menü dışına tıklandığında kapat
    document.addEventListener('click', (e) => {
      if (
        !this.toolsMenu.contains(e.target) &&
        !this.toolsButton.contains(e.target)
      ) {
        this.toolsMenu.classList.remove('show');
      }
    });

    // Hesaplama araçları için event listener'lar
    document
      .getElementById('systemCalcButton')
      .addEventListener('click', () => {
        this.showSystemCalculator();
      });

    document
      .getElementById('batteryCalcButton')
      .addEventListener('click', () => {
        this.showBatteryCalculator();
      });
  }

  showSystemCalculator() {
    const panel = document.getElementById('systemCalculatorPanel');
    panel.classList.add('show');

    // Kapatma butonu için event listener
    panel.querySelector('.close-panel').addEventListener('click', () => {
      panel.classList.remove('show');
    });

    // Panel dışına tıklandığında kapatma
    document.addEventListener('click', (e) => {
      if (
        !panel.contains(e.target) &&
        !e.target.closest('#systemCalcButton') &&
        panel.classList.contains('show')
      ) {
        panel.classList.remove('show');
      }
    });
  }

  showBatteryCalculator() {
    const panel = document.getElementById('batteryCalculatorPanel');
    panel.classList.add('show');

    // Kapatma butonu için event listener
    panel.querySelector('.close-panel').addEventListener('click', () => {
      panel.classList.remove('show');
    });

    // Panel dışına tıklandığında kapatma
    document.addEventListener('click', (e) => {
      if (
        !panel.contains(e.target) &&
        !e.target.closest('#batteryCalcButton') &&
        panel.classList.contains('show')
      ) {
        panel.classList.remove('show');
      }
    });
  }

  // Sistem hesaplama fonksiyonu
  calculateSystem() {
    try {
      const inputVoltage = parseFloat(
        document.getElementById('inputVoltage').value
      );
      const outputVoltage = parseFloat(
        document.getElementById('outputVoltage').value
      );
      const outputCurrent = parseFloat(
        document.getElementById('outputCurrent').value
      );
      const cells = parseFloat(document.getElementById('cells').value);
      const batteryVoltage = parseFloat(
        document.getElementById('batteryVoltage').value
      );
      const floatVoltage = parseFloat(
        document.getElementById('floatVoltage').value
      );
      const boostVoltage = parseFloat(
        document.getElementById('boostVoltage').value
      );
      const eff = parseFloat(document.getElementById('eff').value);
      const pf = parseFloat(document.getElementById('pf').value);
      const numberOfPh = parseFloat(
        document.getElementById('numberOfPh').value
      );

      // Hesaplamalar
      const outputPower = outputVoltage * outputCurrent;
      const inputPower = outputPower / (eff * pf);
      const inputCurrent = inputPower / (inputVoltage * Math.sqrt(numberOfPh));
      const floatChargeVoltage = cells * floatVoltage;
      const boostChargeVoltage = cells * boostVoltage;
      const batteryGroupVoltage = cells * batteryVoltage;

      // Sonuçları göster
      const resultsDiv = document.createElement('div');
      resultsDiv.className = 'calculation-results';
      resultsDiv.innerHTML = `
                <h4>Sonuçlar:</h4>
                <div class="result-item">
                    <label>Çıkış Gücü:</label>
                    <span>${outputPower.toFixed(2)} W</span>
                </div>
                <div class="result-item">
                    <label>Giriş Gücü:</label>
                    <span>${inputPower.toFixed(2)} W</span>
                </div>
                <div class="result-item">
                    <label>Giriş Akımı:</label>
                    <span>${inputCurrent.toFixed(2)} A</span>
                </div>
                <div class="result-item">
                    <label>Float Şarj Voltajı:</label>
                    <span>${floatChargeVoltage.toFixed(2)} V</span>
                </div>
                <div class="result-item">
                    <label>Boost Şarj Voltajı:</label>
                    <span>${boostChargeVoltage.toFixed(2)} V</span>
                </div>
                <div class="result-item">
                    <label>Batarya Grup Voltajı:</label>
                    <span>${batteryGroupVoltage.toFixed(2)} V</span>
                </div>
            `;

      // Önceki sonuçları temizle ve yenisini ekle
      const panel = document.getElementById('systemCalculatorPanel');
      const oldResults = panel.querySelector('.calculation-results');
      if (oldResults) {
        oldResults.remove();
      }
      panel.querySelector('.panel-body').appendChild(resultsDiv);
    } catch (error) {
      console.error('Sistem hesaplama hatası:', error);
    }
  }

  // Batarya hesaplama fonksiyonu
  calculateBattery() {
    try {
      const power = parseFloat(document.getElementById('power').value);
      const batteryCount = parseFloat(
        document.getElementById('batteryCount').value
      );
      const cellCount = parseFloat(document.getElementById('cellCount').value);
      const stringCount = parseFloat(
        document.getElementById('stringCount').value
      );
      const powerFactor = parseFloat(
        document.getElementById('powerFactor').value
      );
      const efficiency = parseFloat(
        document.getElementById('efficiency').value
      );

      // Hesaplamalar
      const wBlock =
        ((power * powerFactor) / (efficiency * batteryCount * stringCount)) *
        1000;
      const wCell = wBlock / cellCount;

      // Sonuçları göster
      const resultsDiv = document.createElement('div');
      resultsDiv.className = 'calculation-results';
      resultsDiv.innerHTML = `
                <h4>Sonuçlar:</h4>
                <div class="result-item">
                    <label>W/Blok:</label>
                    <span>${wBlock.toFixed(2)} W</span>
                </div>
                <div class="result-item">
                    <label>W/Hücre:</label>
                    <span>${wCell.toFixed(2)} W</span>
                </div>
            `;

      // Önceki sonuçları temizle ve yenisini ekle
      const panel = document.getElementById('batteryCalculatorPanel');
      const oldResults = panel.querySelector('.calculation-results');
      if (oldResults) {
        oldResults.remove();
      }
      panel.querySelector('.panel-body').appendChild(resultsDiv);
    } catch (error) {
      console.error('Batarya hesaplama hatası:', error);
    }
  }

  // Event listener'ları ekle
  setupCalculators() {
    // Sistem hesaplama butonu
    const systemCalcButton = document.querySelector(
      '#systemCalculatorPanel .calculate-button'
    );
    if (systemCalcButton) {
      systemCalcButton.addEventListener('click', () => this.calculateSystem());
    }

    // Batarya hesaplama butonu
    const batteryCalcButton = document.querySelector(
      '#batteryCalculatorPanel .calculate-button'
    );
    if (batteryCalcButton) {
      batteryCalcButton.addEventListener('click', () =>
        this.calculateBattery()
      );
    }
  }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing PricingApp...');
  const app = new PricingApp();
});

// CSS stillerini güncelle
const style = document.createElement('style');
style.textContent = `
    .price-table tr {
        cursor: pointer;
        user-select: none;
        transition: background-color 0.2s ease;
        border-bottom: 1px solid #374151;
    }

    .price-table tr:hover {
        background-color: rgba(31, 41, 55, 0.4) !important;
    }

    .price-table tr.selected {
        background-color: rgba(59, 130, 246, 0.1) !important;
    }

    .price-table tr.selected td {
        background-color: transparent !important;
    }

    .price-table td {
        padding: 12px 8px;
    }

    .price-table input {
        background-color: #1f2937;
        border: 1px solid #374151;
        border-radius: 4px;
        padding: 4px 8px;
        width: 80px;
        color: #e0e0e0;
    }

    .price-table tr.selected input {
        background-color: #2563eb;
        color: white;
        border-color: #60a5fa;
    }

    .price-table input:focus {
        outline: 2px solid #60a5fa;
        border-color: transparent;
        background-color: #1f2937;
    }

    .total-row {
        font-weight: bold;
        background-color: #1f2937 !important;
    }

    .total-row td {
        padding: 12px 8px !important;
        text-align: right;
    }

    .total-row td:nth-child(3) {  /* TOPLAM yazısı */
        text-align: left;
    }

    .total-row td:not(:empty) {
        border-top: 2px solid #374151 !important;
    }

    .checkbox-cell {
        width: 16px !important;  /* Genişliği daha da azalt */
        text-align: center;
        padding: 0 !important;
        min-width: 16px !important;
    }

    .row-checkbox {
        width: 12px;  /* Checkbox boyutunu daha da küçült */
        height: 12px;
        cursor: pointer;
        margin: 0;
        padding: 0;
        accent-color: #3b82f6;
        vertical-align: middle;
    }

    /* Input alanlarına tıklandığında satır seçimini engelle */
    .price-table input:not([type="checkbox"]) {
        pointer-events: auto;
        position: relative;
        z-index: 1;
    }

    .product-input {
        width: 180px !important;
    }

    .cost-input {
        width: 100px !important;
        text-align: right;
    }

    .price-table input[type="text"],
    .price-table input[type="number"] {
        background-color: #1f2937;
        border: 1px solid #374151;
        border-radius: 4px;
        padding: 4px 8px;
        color: #e0e0e0;
        font-size: 13px;
    }

    .price-table input[type="text"]:focus,
    .price-table input[type="number"]:focus {
        outline: 2px solid #60a5fa;
        border-color: transparent;
    }

    .price-table tr.selected input[type="text"],
    .price-table tr.selected input[type="number"] {
        background-color: #2563eb;
        color: white;
        border-color: #60a5fa;
    }

    .sidebar-panel {
        position: fixed;
        top: 0;
        right: -500px; /* Başlangıçta gizli */
        width: 400px;
        height: 100vh;
        background: var(--bg-secondary);
        border-left: 1px solid var(--border);
        transition: right 0.3s ease;
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }

    .sidebar-panel.show {
        right: 0;
    }

    .panel-header {
        padding: 16px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--bg-tertiary);
    }

    .panel-header h3 {
        font-size: 16px;
        font-weight: 500;
        color: var(--text);
    }

    .close-panel {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 20px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
    }

    .close-panel:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .panel-body {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
    }

    /* Input grupları için stil güncellemeleri */
    .panel-body .input-group {
        margin-bottom: 16px;
    }

    .panel-body .input-group label {
        display: block;
        margin-bottom: 6px;
        color: var(--text-secondary);
    }

    .panel-body .input-group input {
        width: 100%;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        padding: 8px 12px;
        border-radius: 4px;
        color: var(--text);
    }

    .panel-body .input-group input:focus {
        border-color: var(--blue-accent);
        outline: none;
    }
`;
document.head.appendChild(style);
