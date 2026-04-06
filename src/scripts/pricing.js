import dbService from '../services/dbService.js';
import { UPSCalculator } from './calculators/UPSCalculator.js';
import { RectifierCalculator } from './calculators/RectifierCalculator.js';
import { ComponentRegistry } from './components/ComponentRegistry.js';

// Electron modüllerini al
const { XLSX } = window.require('xlsx');
const fs = window.require('fs-extra');
const path = window.require('path');

// Hata yakalama
window.onerror = function (msg, url, line) {
  alert(`Hata: ${msg}\nSatır: ${line}`);
  return false;
};

// DataStore sınıfı
class DataStore {
  constructor(name) {
    this.name = name;
    this.data = new Map();
  }

  async init() {
    try {
      const storedData = localStorage.getItem(this.name);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        Object.entries(parsedData).forEach(([key, value]) => {
          this.data.set(key, value);
        });
      }
    } catch (error) {
      console.error(`DataStore ${this.name} başlatma hatası:`, error);
    }
  }

  async get(key) {
    return this.data.get(key);
  }

  async set(key, value) {
    this.data.set(key, value);
    this.save();
  }

  async save() {
    try {
      const dataObject = Object.fromEntries(this.data);
      localStorage.setItem(this.name, JSON.stringify(dataObject));
    } catch (error) {
      console.error(`DataStore ${this.name} kaydetme hatası:`, error);
    }
  }
}

// Event Bus sınıfı
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => callback(data));
    }
  }
}

// Core System - Krallığın Temeli
class CoreSystem {
  constructor() {
    this.modules = new Map();
    this.eventBus = new EventBus();
    this.state = new StateManager();
    this.db = new DatabaseManager();
  }

  registerModule(name, module) {
    this.modules.set(name, module);
    module.init(this);
  }
}

// State Management - Krallığın Hafızası
class StateManager {
  constructor() {
    this.state = new Proxy(
      {},
      {
        set: (target, property, value) => {
          target[property] = value;
          this.notifyListeners(property, value);
          return true;
        },
      }
    );
    this.listeners = new Map();
  }

  subscribe(property, callback) {
    if (!this.listeners.has(property)) {
      this.listeners.set(property, []);
    }
    this.listeners.get(property).push(callback);
  }

  notifyListeners(property, value) {
    if (this.listeners.has(property)) {
      this.listeners.get(property).forEach((callback) => callback(value));
    }
  }
}

// Database Management - Krallığın Arşivi
class DatabaseManager {
  constructor() {
    this.store = new DataStore('pricing-data');
    this.init();
  }

  async init() {
    await this.store.init();
    console.log('Database initialized');
  }

  async saveQuote(quote) {
    const quotes = (await this.store.get('quotes')) || [];
    quotes.push(quote);
    await this.store.set('quotes', quotes);
  }
}

// UI Manager - Krallığın Görünen Yüzü
class UIManager {
  constructor() {
    this.store = new DataStore('pricing-data');
    this.eventBus = new EventBus();
    this.setupComponents();
    this.bindEvents();
    this.loadExcelData();
    this.calculators = {
      ups: new UPSCalculator(),
      rectifier: new RectifierCalculator(),
    };
    this.setupDefaultValues();
    this.currentSelection = {
      product: null,
      subtype: null,
      cost: 0,
      quantity: 1,
    };
    this.isShowingTotals = false;
    this.rowMargins = new Map();
    this.marginMultipliers = {
      margin1: 1.2, // 1.2 kat
      margin2: 1.6, // 1.6 kat
    };
    this.activeDropdown = null;
    this.quotePanel = document.getElementById('quotePanel');
    this.quoteTotalPrice = document.getElementById('quoteTotalPrice');
  }

  setupComponents() {
    try {
      this.productSelect = document.querySelector('select:first-of-type');
      this.subtypeSelect = document.querySelector('select:last-of-type');
      this.quantityInput = document.querySelector('input[type="number"]');
      this.addButton = document.querySelector('button.action-button');
      this.manualAddButton = document.getElementById('manualAddButton');
      this.deleteButton = document.getElementById('deleteButton');
      this.exportButton = document.getElementById('exportButton');
      this.showTotalsButton = document.getElementById('showTotalsButton');
      this.toolsButton = document.getElementById('toolsButton');
      this.toolsMenu = document.getElementById('toolsMenu');
      this.priceTable = document.getElementById('priceTableBody');

      console.log('Components registered successfully');
    } catch (error) {
      console.error('Component setup error:', error);
    }
  }

  bindEvents() {
    this.productSelect?.addEventListener('change', (e) =>
      this.handleProductChange(e.target.value)
    );
    this.subtypeSelect?.addEventListener('change', (e) =>
      this.handleSubtypeChange(e.target.value)
    );
    this.quantityInput?.addEventListener('input', (e) =>
      this.handleQuantityChange(e.target.value)
    );
    this.addButton?.addEventListener('click', () => this.addNewRow());
    this.manualAddButton?.addEventListener('click', () => this.addManualRow());
    this.deleteButton?.addEventListener('click', () =>
      this.deleteSelectedRows()
    );
    this.exportButton?.addEventListener('click', () => this.exportToExcel());
    this.showTotalsButton?.addEventListener('click', () => this.toggleTotals());

    // Menubar event listener'ları
    const menuButtons = document.querySelectorAll('.menubar-button');
    menuButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuItem = button.closest('.menubar-item');
        const dropdown = menuItem.querySelector('.menubar-dropdown');

        // Diğer açık menüleri kapat
        if (this.activeDropdown && this.activeDropdown !== dropdown) {
          this.activeDropdown.style.display = 'none';
        }

        // Tıklanan menüyü aç/kapat
        if (dropdown.style.display === 'block') {
          dropdown.style.display = 'none';
          this.activeDropdown = null;
        } else {
          dropdown.style.display = 'block';
          this.activeDropdown = dropdown;
        }
      });
    });

    // Menü item'larına event listener'lar
    document
      .getElementById('exportExcelBtn')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportToExcel();
        this.closeAllDropdowns();
      });

    document.getElementById('saveQuoteBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openQuotePanel();
      this.closeAllDropdowns();
    });

    document.getElementById('systemCalcBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCalculator('system');
      this.closeAllDropdowns();
    });

    document
      .getElementById('batteryCalcBtn')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openCalculator('battery');
        this.closeAllDropdowns();
      });

    // Sayfa herhangi bir yerine tıklandığında menüleri kapat
    document.addEventListener('click', () => {
      this.closeAllDropdowns();
    });

    // Dropdown içine tıklandığında kapanmasını engelle
    document.querySelectorAll('.menubar-dropdown').forEach((dropdown) => {
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    // Panel kapatma butonları için event listener'lar
    document.querySelectorAll('.panel-close-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const panel = btn.closest('.calculator-panel');
        if (panel) {
          panel.classList.remove('active');
        }
      });
    });

    // Teklif kaydetme butonu için event listener
    document.querySelector('.save-quote-btn')?.addEventListener('click', () => {
      this.saveQuote();
    });
  }

  closeAllDropdowns() {
    document.querySelectorAll('.menubar-dropdown').forEach((dropdown) => {
      dropdown.style.display = 'none';
    });
    this.activeDropdown = null;
  }

  async loadExcelData() {
    try {
      const data = await window.excelAPI.getData();
      if (data) {
        console.log('Excel data loaded:', data.length, 'rows');
        this.excelData = data; // Excel verisini sakla
        this.updateProductList(data);
      }
    } catch (error) {
      console.error('Excel data load error:', error);
    }
  }

  updateProductList(data) {
    if (!this.productSelect) return;

    const productTypes = [...new Set(data.map((row) => row['Product Type']))];
    this.productSelect.innerHTML = `
            <option value="">Ürün Seçin</option>
            ${productTypes
              .map(
                (type) => `
                <option value="${type}">${type}</option>
            `
              )
              .join('')}
        `;
  }

  handleProductChange(productType) {
    if (!productType) return;

    // Seçimi kaydet
    this.currentSelection.product = productType;
    this.currentSelection.subtype = null;

    // Excel'den seçilen ürünün verilerini bul
    const productData = this.excelData.find(
      (row) => row['Product Type'] === productType
    );

    if (productData) {
      // Subtype NaN veya boş ise direkt ürün olarak işle
      if (
        !productData.Subtype ||
        productData.Subtype === 'NaN' ||
        productData.Subtype === ''
      ) {
        // Alt tipi olmayan ürün
        this.currentSelection.cost = parseFloat(productData.Cost) || 0;
        this.subtypeSelect.innerHTML = '<option value="">Alt Tip Yok</option>';
        this.subtypeSelect.disabled = true;
        this.currentSelection.subtype = null; // Alt tip yok
      } else {
        // Alt tipi olan ürün
        this.updateSubtypes(productType);
        this.currentSelection.cost = 0; // Cost alt tip seçilince belirlenecek
        this.subtypeSelect.disabled = false;
      }
    }
  }

  handleSubtypeChange(subtype) {
    if (!subtype) return;

    const selectedOption = this.subtypeSelect.selectedOptions[0];
    const cost = parseFloat(selectedOption.dataset.cost) || 0;

    // Seçimi kaydet
    this.currentSelection.subtype = subtype;
    this.currentSelection.cost = cost;
  }

  handleQuantityChange(quantity) {
    if (!quantity) {
      this.quantityInput.value = '1';
      quantity = 1;
    }

    // Seçimi kaydet
    this.currentSelection.quantity = parseInt(quantity) || 1;
  }

  async updateSubtypes(productType) {
    try {
      // Excel'den bu ürüne ait alt tipleri filtrele
      const subtypes = this.excelData
        .filter(
          (row) =>
            row['Product Type'] === productType &&
            row.Subtype &&
            row.Subtype !== 'NaN' &&
            row.Subtype !== ''
        )
        .map((row) => ({
          subtype: row.Subtype,
          cost: row.Cost,
        }));

      if (this.subtypeSelect && subtypes.length > 0) {
        this.subtypeSelect.innerHTML = `
                    <option value="">Alt Tip Seçin</option>
                    ${subtypes
                      .map(
                        (sub) => `
                        <option value="${sub.subtype}" data-cost="${sub.cost}">
                            ${sub.subtype}
                        </option>
                    `
                      )
                      .join('')}
                `;
        this.subtypeSelect.disabled = false;
      } else {
        this.subtypeSelect.innerHTML = '<option value="">Alt Tip Yok</option>';
        this.subtypeSelect.disabled = true;
      }
    } catch (error) {
      console.error('Subtype update error:', error);
    }
  }

  calculateMargins(total) {
    // Direkt çarpan kullanarak hesaplama
    const total1 = total * this.marginMultipliers.margin1;
    const total2 = total * this.marginMultipliers.margin2;

    return {
      margin1: this.marginMultipliers.margin1,
      margin2: this.marginMultipliers.margin2,
      total1: total1,
      total2: total2,
    };
  }

  updateRowMargins(row) {
    const cells = row.cells;
    if (cells.length >= 10) {
      const rowIndex = row.rowIndex;
      const cost = parseFloat(cells[3].textContent) || 0;
      const quantity = parseInt(cells[4].textContent) || 0;
      const total = cost * quantity;

      // Satırın margin değerlerini al veya varsayılan değerleri kullan
      if (!this.rowMargins.has(rowIndex)) {
        this.rowMargins.set(rowIndex, {
          margin1: 1.2,
          margin2: 1.6,
        });
      }
      const margins = this.rowMargins.get(rowIndex);

      // Değerleri güncelle
      cells[5].textContent = total.toFixed(2);
      cells[6].textContent = String(margins.margin1);
      cells[7].textContent = String(margins.margin2);
      cells[8].textContent = (total * margins.margin1).toFixed(2);
      cells[9].textContent = (total * margins.margin2).toFixed(2);
    }
  }

  handleMarginInput(event, row, marginType) {
    const cell = event.target;
    let value = cell.textContent;

    // Sadece sayı ve nokta girişine izin ver
    value = value.replace(/[^\d.]/g, '');

    // Birden fazla nokta kullanımını engelle
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Değeri güncelle
    cell.textContent = value;
  }

  handleMarginBlur(row, marginType) {
    const cell = row.cells[marginType === 1 ? 6 : 7];
    const value = cell.textContent;

    // Değeri uygula
    this.applyMarginChange(value, row, marginType);
  }

  handleMarginKeydown(event, row, marginType) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const cell = event.target;
      const value = cell.textContent;

      // Değeri uygula
      this.applyMarginChange(value, row, marginType);

      // Düzenlemeden çık
      cell.blur();
    }
  }

  applyMarginChange(value, row, marginType) {
    const rowIndex = row.rowIndex;
    const newMultiplier = parseFloat(value) || 0;

    // Sadece ilgili satırın margin değerini güncelle
    if (!this.rowMargins.has(rowIndex)) {
      this.rowMargins.set(rowIndex, {
        margin1: 1.2,
        margin2: 1.6,
      });
    }

    const margins = this.rowMargins.get(rowIndex);
    if (marginType === 1) {
      margins.margin1 = newMultiplier;
    } else {
      margins.margin2 = newMultiplier;
    }

    // Sadece bu satırın toplamlarını güncelle
    const cells = row.cells;
    const total = parseFloat(cells[5].textContent) || 0;
    cells[marginType === 1 ? 8 : 9].textContent = (
      total * newMultiplier
    ).toFixed(2);

    // Toplamları güncelle
    this.updateTotals();
  }

  updateAllRows() {
    const rows = this.priceTable.querySelectorAll('tr:not(.total-row)');
    rows.forEach((row) => this.updateRowMargins(row));
  }

  addNewRow() {
    const { product, subtype, cost, quantity } = this.currentSelection;

    if (!product || !cost || !quantity) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    const total = cost * quantity;
    const rowIndex = this.priceTable.children.length + 1;

    // Yeni satır için varsayılan margin değerlerini ayarla
    this.rowMargins.set(rowIndex, {
      margin1: 1.2,
      margin2: 1.6,
    });
    const margins = this.rowMargins.get(rowIndex);

    const row = document.createElement('tr');
    row.className = 'selectable-row';
    row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td>
            <td>${rowIndex}</td>
            <td>${product}${subtype ? ` - ${subtype}` : ''}</td>
            <td class="numeric">${cost.toFixed(2)}</td>
            <td class="numeric">${quantity}</td>
            <td class="numeric">${total.toFixed(2)}</td>
            <td class="numeric" contenteditable="true">${margins.margin1}</td>
            <td class="numeric" contenteditable="true">${margins.margin2}</td>
            <td class="numeric">${(total * margins.margin1).toFixed(2)}</td>
            <td class="numeric">${(total * margins.margin2).toFixed(2)}</td>
        `;

    this.priceTable.appendChild(row);

    // Satır seçme olayını ekle
    row.addEventListener('click', (e) => this.handleRowClick(e, row));

    // Event listener'ları direkt olarak ekle
    const margin1Cell = row.cells[6];
    const margin2Cell = row.cells[7];

    margin1Cell.addEventListener('input', (e) =>
      this.handleMarginInput(e, row, 1)
    );
    margin1Cell.addEventListener('blur', () => this.handleMarginBlur(row, 1));
    margin1Cell.addEventListener('keydown', (e) =>
      this.handleMarginKeydown(e, row, 1)
    );

    margin2Cell.addEventListener('input', (e) =>
      this.handleMarginInput(e, row, 2)
    );
    margin2Cell.addEventListener('blur', () => this.handleMarginBlur(row, 2));
    margin2Cell.addEventListener('keydown', (e) =>
      this.handleMarginKeydown(e, row, 2)
    );

    this.updateTotals();
    this.resetSelections();
  }

  resetSelections() {
    // Comboboxları sıfırla
    if (this.productSelect) this.productSelect.value = '';
    if (this.subtypeSelect) {
      this.subtypeSelect.innerHTML = `
                <option value="">Alt Tip Seçin</option>
            `;
    }

    // Adet inputunu varsayılana çek
    if (this.quantityInput) this.quantityInput.value = '1';

    // Seçimleri sıfırla
    this.currentSelection = {
      product: null,
      subtype: null,
      cost: 0,
      quantity: 1,
    };
  }

  updateTotals() {
    let totals = {
      costTotal: 0, // Maliyet toplamı
      total1: 0, // Toplam-1
      total2: 0, // Toplam-2
    };

    const rows = this.priceTable.querySelectorAll('tr:not(.total-row)');
    rows.forEach((row) => {
      const cells = row.cells;
      if (cells.length >= 10) {
        totals.costTotal += parseFloat(cells[5].textContent) || 0; // Maliyet toplamı
        totals.total1 += parseFloat(cells[8].textContent) || 0; // Toplam-1
        totals.total2 += parseFloat(cells[9].textContent) || 0; // Toplam-2
      }
    });

    this.totals = totals;

    // Eğer toplamlar gösteriliyorsa güncelle
    if (this.isShowingTotals) {
      this.showTotalsRow();
    } else {
      this.hideTotalsRow();
    }
  }

  showTotalsRow() {
    let totalRow = this.priceTable.querySelector('.total-row');
    if (!totalRow) {
      totalRow = document.createElement('tr');
      totalRow.className = 'total-row';
      this.priceTable.appendChild(totalRow);
    }

    totalRow.innerHTML = `
            <td colspan="5" style="text-align: right"><strong>GENEL TOPLAM</strong></td>
            <td class="numeric"><strong>${this.totals.costTotal.toFixed(2)}</strong></td>
            <td colspan="2"></td>
            <td class="numeric"><strong>${this.totals.total1.toFixed(2)}</strong></td>
            <td class="numeric"><strong>${this.totals.total2.toFixed(2)}</strong></td>
        `;
  }

  hideTotalsRow() {
    const totalRow = this.priceTable.querySelector('.total-row');
    if (totalRow) {
      totalRow.remove();
    }
  }

  toggleTotals() {
    this.isShowingTotals = !this.isShowingTotals;

    if (this.isShowingTotals) {
      this.showTotalsRow();
      this.showTotalsButton.textContent = '💰 Toplamları Gizle';
    } else {
      this.hideTotalsRow();
      this.showTotalsButton.textContent = '💰 Toplamları Göster';
    }
  }

  setupDefaultValues() {
    // Adet için varsayılan değer
    if (this.quantityInput) {
      this.quantityInput.value = '1';
      this.quantityInput.min = '1';
    }
  }

  updatePrice(cost) {
    if (!cost) return;

    const quantity = parseInt(this.quantityInput?.value) || 1;
    const total = parseFloat(cost) * quantity;

    // Margin hesaplamalarını yap
    const margins = this.calculateMargins(total);

    // Eğer satır zaten eklenmişse güncelle
    const currentRow = this.priceTable.querySelector(
      'tr:last-child:not(.total-row)'
    );
    if (currentRow) {
      const cells = currentRow.cells;
      cells[3].textContent = parseFloat(cost).toFixed(2);
      cells[4].textContent = quantity;
      cells[5].textContent = total.toFixed(2);
      cells[6].textContent = margins.margin1.toFixed(2);
      cells[7].textContent = margins.margin2.toFixed(2);
      cells[8].textContent = margins.total1.toFixed(2);
      cells[9].textContent = margins.total2.toFixed(2);
    }

    this.updateTotals();
  }

  deleteSelectedRows() {
    const checkboxes = this.priceTable.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.closest('tr').remove();
    });
    this.updateTotals();
    this.renumberRows();
  }

  renumberRows() {
    const rows = this.priceTable.querySelectorAll('tr:not(.total-row)');
    rows.forEach((row, index) => {
      row.cells[1].textContent = index + 1;
    });
  }

  openCalculator(type) {
    const panel = document.getElementById(
      type === 'battery' ? 'batteryCalculatorPanel' : 'systemCalculatorPanel'
    );

    // Diğer paneli kapat
    const otherPanel = document.getElementById(
      type === 'battery' ? 'systemCalculatorPanel' : 'batteryCalculatorPanel'
    );
    otherPanel.classList.remove('active');

    // Seçilen paneli aç/kapat
    panel.classList.toggle('active');
  }

  openSaveQuoteModal() {
    // Teklif kaydetme modalını aç
  }

  async exportToExcel() {
    try {
      // Dosya konumu seç
      const filePath = await window.fileAPI.showSaveDialog({
        title: 'Excel Dosyasını Kaydet',
        defaultPath: 'fiyat_listesi.xlsx',
        filters: [{ name: 'Excel Dosyası', extensions: ['xlsx'] }],
      });

      if (!filePath) return; // Kullanıcı iptal ettiyse

      // Tablo verilerini topla
      const tableData = [];

      // Başlıkları ekle
      tableData.push([
        'No',
        'Ürün',
        'Maliyet',
        'Adet',
        'Maliyet Toplamı',
        'Çarpan-1',
        'Çarpan-2',
        'Toplam-1',
        'Toplam-2',
      ]);

      // Satır verilerini ekle
      const rows = this.priceTable.querySelectorAll('tr:not(.total-row)');
      rows.forEach((row) => {
        const cells = row.cells;
        if (cells.length >= 10) {
          tableData.push([
            cells[1].textContent, // No
            cells[2].textContent, // Ürün
            parseFloat(cells[3].textContent) || 0, // Maliyet
            parseInt(cells[4].textContent) || 0, // Adet
            parseFloat(cells[5].textContent) || 0, // Maliyet Toplamı
            parseFloat(cells[6].textContent) || 0, // Çarpan-1
            parseFloat(cells[7].textContent) || 0, // Çarpan-2
            parseFloat(cells[8].textContent) || 0, // Toplam-1
            parseFloat(cells[9].textContent) || 0, // Toplam-2
          ]);
        }
      });

      // Toplam satırını ekle
      if (this.totals) {
        tableData.push([
          '',
          'GENEL TOPLAM',
          '',
          '',
          this.totals.costTotal,
          '',
          '',
          this.totals.total1,
          this.totals.total2,
        ]);
      }

      // Excel stil ayarları
      const styles = {
        headerStyle: {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: { rgb: '1A2333' },
          },
          alignment: { horizontal: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '1E2A3B' } },
            bottom: { style: 'thin', color: { rgb: '1E2A3B' } },
          },
        },
        numberStyle: {
          alignment: { horizontal: 'right' },
          numFmt: '#,##0.00',
        },
        totalStyle: {
          font: { bold: true },
          fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: { rgb: '1A2333' },
          },
          alignment: { horizontal: 'right' },
          numFmt: '#,##0.00',
        },
      };

      // Excel dosyasını oluştur ve kaydet
      await window.excelAPI.createExcel(filePath, {
        preset: 'pricing-generic',
        sheetName: 'Fiyat Listesi',
        data: tableData,
        styles: styles,
      });

      alert('Excel dosyası başarıyla oluşturuldu!');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu!');
    }
  }

  addManualRow() {
    const rowIndex = this.priceTable.children.length + 1;

    // Yeni satır için varsayılan margin değerlerini ayarla
    this.rowMargins.set(rowIndex, {
      margin1: 1.2,
      margin2: 1.6,
    });
    const margins = this.rowMargins.get(rowIndex);

    const row = document.createElement('tr');
    row.className = 'selectable-row';
    row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td>
            <td>${rowIndex}</td>
            <td contenteditable="true"></td>
            <td class="numeric" contenteditable="true">0.00</td>
            <td class="numeric" contenteditable="true">1</td>
            <td class="numeric">0.00</td>
            <td class="numeric" contenteditable="true">${margins.margin1}</td>
            <td class="numeric" contenteditable="true">${margins.margin2}</td>
            <td class="numeric">0.00</td>
            <td class="numeric">0.00</td>
        `;

    this.priceTable.appendChild(row);

    // Satır seçme olayını ekle
    row.addEventListener('click', (e) => this.handleRowClick(e, row));

    // Event listener'ları ekle
    const cells = row.cells;

    // Ürün adı hücresi için listener
    cells[2].addEventListener('blur', () => this.updateManualRow(row));

    // Maliyet hücresi için listener
    cells[3].addEventListener('input', (e) => this.handleNumericInput(e));
    cells[3].addEventListener('blur', () => this.updateManualRow(row));

    // Adet hücresi için listener
    cells[4].addEventListener('input', (e) => this.handleNumericInput(e));
    cells[4].addEventListener('blur', () => this.updateManualRow(row));

    // Margin hücreleri için listener'lar
    const margin1Cell = cells[6];
    const margin2Cell = cells[7];

    margin1Cell.addEventListener('input', (e) =>
      this.handleMarginInput(e, row, 1)
    );
    margin1Cell.addEventListener('blur', () => this.handleMarginBlur(row, 1));
    margin1Cell.addEventListener('keydown', (e) =>
      this.handleMarginKeydown(e, row, 1)
    );

    margin2Cell.addEventListener('input', (e) =>
      this.handleMarginInput(e, row, 2)
    );
    margin2Cell.addEventListener('blur', () => this.handleMarginBlur(row, 2));
    margin2Cell.addEventListener('keydown', (e) =>
      this.handleMarginKeydown(e, row, 2)
    );

    this.updateTotals();
  }

  handleNumericInput(event) {
    const cell = event.target;
    let value = cell.textContent;

    // Sadece sayı ve nokta girişine izin ver
    value = value.replace(/[^\d.]/g, '');

    // Birden fazla nokta kullanımını engelle
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    cell.textContent = value;
  }

  updateManualRow(row) {
    const cells = row.cells;
    const cost = parseFloat(cells[3].textContent) || 0;
    const quantity = parseInt(cells[4].textContent) || 1;
    const total = cost * quantity;

    // Toplam maliyeti güncelle
    cells[5].textContent = total.toFixed(2);

    // Margin toplamlarını güncelle
    const margins = this.rowMargins.get(row.rowIndex);
    cells[8].textContent = (total * margins.margin1).toFixed(2);
    cells[9].textContent = (total * margins.margin2).toFixed(2);

    this.updateTotals();
  }

  handleRowClick(event, row) {
    // Eğer tıklanan yer düzenlenebilir hücre ise seçme işlemini yapma
    if (event.target.isContentEditable) {
      return;
    }

    // Checkbox'a tıklandıysa sadece checkbox'ı işaretle
    if (event.target.type === 'checkbox') {
      return;
    }

    // Satırdaki checkbox'ı bul ve durumunu tersine çevir
    const checkbox = row.querySelector('.row-checkbox');
    checkbox.checked = !checkbox.checked;
  }

  async saveQuote() {
    const quoteNumber = document.getElementById('quoteNumber').value;
    const quoteDetails = document.getElementById('quoteDetails').value;
    const totalPrice = this.totals?.total2 || 0;

    if (!quoteNumber) {
      alert('Lütfen teklif numarası giriniz!');
      return;
    }

    try {
      // Aktif kullanıcıyı al
      const currentUser = dbService.getCurrentUser();
      console.log('Teklif kaydeden kullanıcı:', currentUser);

      if (!currentUser) {
        alert('Oturum süreniz dolmuş. Lütfen yeniden giriş yapın.');
        window.location.href = 'login.html';
        return;
      }

      // Teklif verilerini hazırla
      const quoteData = {
        number: quoteNumber,
        details: quoteDetails,
        total_price: parseFloat(totalPrice),
        prepared_by: currentUser.fullName,
        items: this.getTableData(),
        date: new Date().toISOString(),
      };

      console.log('Kaydedilecek teklif:', quoteData);

      // API üzerinden kaydet
      await dbService.saveQuote(quoteData);

      alert('Teklif başarıyla kaydedildi!');
      this.quotePanel.classList.remove('active');

      // Form alanlarını temizle
      document.getElementById('quoteNumber').value = '';
      document.getElementById('quoteDetails').value = '';
    } catch (error) {
      console.error('Teklif kaydetme hatası:', error);
      alert(`Teklif kaydedilirken bir hata oluştu: ${error.message}`);
    }
  }

  getTableData() {
    // Tablodaki tüm satırları al
    const rows = Array.from(
      this.priceTable.querySelectorAll('tr:not(.total-row)')
    );
    return rows.map((row) => {
      const cells = row.cells;
      return {
        product: cells[2].textContent,
        cost: parseFloat(cells[3].textContent) || 0,
        quantity: parseInt(cells[4].textContent) || 0,
        totalCost: parseFloat(cells[5].textContent) || 0,
        margin1: parseFloat(cells[6].textContent) || 0,
        margin2: parseFloat(cells[7].textContent) || 0,
        total1: parseFloat(cells[8].textContent) || 0,
        total2: parseFloat(cells[9].textContent) || 0,
      };
    });
  }

  openQuotePanel() {
    // Diğer panelleri kapat
    document.getElementById('systemCalculatorPanel').classList.remove('active');
    document
      .getElementById('batteryCalculatorPanel')
      .classList.remove('active');

    // Teklif panelini aç
    this.quotePanel.classList.add('active');

    // Toplam fiyatı güncelle
    this.updateQuoteTotalPrice();
  }

  updateQuoteTotalPrice() {
    // Toplam-2'nin genel toplamını al
    const total = this.totals?.total2 || 0;
    this.quoteTotalPrice.textContent = `${total.toFixed(2)} TL`;
  }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  console.log('Rectifier Pricing başlatılıyor...');
  window.manager = new RectifierPricingManager();
});

// Güç Sistemleri Krallığı hazır!
console.log('Güç Sistemleri Krallığı hazır!');

// Ürün tipleri tanımlaması
const productTypes = {
  rectifier: 'Rectifier Systems',
  inverter: 'Inverter Systems',
  ups: 'UPS Systems',
};

// Excel dosya yolları
const excelPaths = {
  rectifier:
    '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Rectifier.xlsx',
};

// Ürün modellerini yükle
async function loadProductModels(productType) {
  try {
    const excelPath = excelPaths[productType];
    if (!excelPath) {
      throw new Error('Excel dosya yolu bulunamadı');
    }

    const result = await window.api.loadExcelData(excelPath);
    return result.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      phase: productType === 'inverter' ? row.phase : null,
      power: productType === 'inverter' ? row.power : null,
      price: row.price,
    }));
  } catch (error) {
    console.error('Model yükleme hatası:', error);
    throw error;
  }
}

class RectifierPricingManager {
  constructor() {
    // Excel yolu
    this.dataFolder =
      '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data\\fiyatlandırma excel';
    this.excelFile = 'Rectifier.xlsx';
    this.excelPath = `${this.dataFolder}\\${this.excelFile}`;

    // Excel işlemleri için gerekli modüller
    this.XLSX = XLSX;
    this.fs = fs;
    this.path = path;

    // Başlangıç ayarları
    this.setupComponents();
    this.bindEvents();
    this.loadExcelData();
  }

  async loadExcelData() {
    try {
      // Excel dosyasını kontrol et
      if (!this.fs.existsSync(this.excelPath)) {
        throw new Error(`Excel dosyası bulunamadı: ${this.excelPath}`);
      }

      // Excel'i direkt oku
      const workbook = this.XLSX.readFile(this.excelPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Veriyi JSON'a çevir
      const rawData = this.XLSX.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: null,
        header: 1,
      });

      // Başlıkları al ve veriyi işle
      const headers = rawData[0];
      const data = rawData
        .slice(1)
        .map((row) => {
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });
          return rowData;
        })
        .filter((row) => row['Product Type']);

      // Veriyi sakla ve UI'ı güncelle
      this.excelData = data;
      this.updateProductList(data);
    } catch (error) {
      console.error('Excel yükleme hatası:', error);
      alert('Excel verisi yüklenirken hata oluştu: ' + error.message);
    }
  }

  // ... diğer metodlar
}
