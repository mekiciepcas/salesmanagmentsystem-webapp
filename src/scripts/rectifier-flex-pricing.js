const RECTIFIER_FLEX_SECTION_ORDER = [
  'transformers',
  'inductance',
  'cabinet',
  'heatsink',
  'semiconductors',
  'filterCaps',
  'electronicBoards',
  'fuses',
  'terminals',
  'humanInterface',
  'other',
];

const RECTIFIER_FLEX_SECTION_LABELS = {
  transformers: 'Transformers',
  inductance: 'Inductance',
  cabinet: 'Cabinet',
  heatsink: 'Heatsink',
  semiconductors: 'Semiconductors',
  filterCaps: 'Filter capacitors',
  electronicBoards: 'Electronic boards',
  fuses: 'Fuses',
  terminals: 'Terminals',
  humanInterface: 'Human interface',
  other: 'Diğer',
};

/** rectifier-pricing.js category → flex bölümü */
const RECTIFIER_FLEX_CATEGORY_TO_SECTION = {
  'Giriş Trafosu': 'transformers',
  'Besleme Trafosu': 'transformers',
  'Oto Trafo': 'transformers',
  'DC Şok': 'inductance',
  Kabin: 'cabinet',
  Soğutucu: 'heatsink',
  Fan: 'heatsink',
  Termostat: 'heatsink',
  Sensör: 'heatsink',
  Tristör: 'semiconductors',
  Diyot: 'semiconductors',
  Kapasitör: 'filterCaps',
  Kart: 'electronicBoards',
  Röle: 'electronicBoards',
  Haberleşme: 'electronicBoards',
  Kesici: 'fuses',
  Sigorta: 'fuses',
  'Fuse Holder': 'fuses',
  Terminal: 'terminals',
  Kontak: 'terminals',
  Panel: 'humanInterface',
  'Ölçü Aleti': 'humanInterface',
  'Power Supply': 'humanInterface',
};

/** Excel Product Type (Rectifier.xlsx) → bölüm; bilinmeyen → other */
const RECTIFIER_FLEX_PRODUCT_TYPE_TO_SECTION = {
  Terminals: 'terminals',
  'Circuit Breakers': 'fuses',
  'Current Reading Cards': 'electronicBoards',
  Thyristors: 'semiconductors',
  'Freewheeling Diodes': 'semiconductors',
  'DC Chokes': 'inductance',
  'DC Capacitors': 'filterCaps',
  Transformers: 'transformers',
};

function flexSectionIdForCategory(category) {
  const c = String(category || '').trim();
  if (!c) return 'other';
  return RECTIFIER_FLEX_CATEGORY_TO_SECTION[c] || 'other';
}

function flexSectionIdForProductType(productType) {
  const p = String(productType || '').trim();
  if (!p) return 'other';
  return RECTIFIER_FLEX_PRODUCT_TYPE_TO_SECTION[p] || 'other';
}

/** Diğer: direkt maliyet toplamı (maliyet×adet) üzerinden otomatik satırlar */
const RECTIFIER_FLEX_OVERHEAD_PRODUCTION_RATE = 0.1;
const RECTIFIER_FLEX_OVERHEAD_LABOR_RATE = 0.21;

class RectifierFlexiblePricing {
  constructor() {
    // Excel yolu
    this.excelPath =
      '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Rectifier.xlsx';

    // UI elementleri
    this.productSelect = document.getElementById('productSelect');
    this.subtypeSelect = document.getElementById('subtypeSelect');
    this.quantityInput = document.getElementById('quantityInput');
    this.priceTable = document.getElementById('priceTable');

    // Event listener'ları ekle
    this.setupEventListeners();
    this.setupMenubar();
    this.setupWindowControls();
    this.autoFillSystemBar();

    // Excel verilerini yükle
    this.loadExcelData();

    // Toplam gösterme durumu
    this.showingTotals = false;

    // Kullanıcı bilgisini yükle
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Veri değişkenleri
    this.currentProductData = [];
    this.currentCost = null;

    // Combobox durumu
    this.comboboxOpen = false;
    this.comboboxItems = [];
    this.selectedComboboxIndex = -1;

    // Hesaplama panellerini başlat
    this.initializeCalculators();

    // Combobox kurulumu
    this.setupCombobox();

    // Notification container'ı oluştur
    this.initializeNotifications();
    this.autoLoadedComponents = [];

    // Bu sınıf zaten DOMContentLoaded içinde oluşturuluyor; tekrar polling yapma.
    this.loadAutoComponentsFromStorage();

    /** Bölüm kapalıyken satır detayları gizli (varsayılan: kapalı) */
    this.flexSectionCollapsed = Object.fromEntries(
      RECTIFIER_FLEX_SECTION_ORDER.map((id) => [id, true])
    );

    if (this.priceTable && this.priceTable.rows.length === 0) {
      this.renderFlexSectionSkeleton();
    }
  }

  // localStorage'dan otomatik hesaplanan parçaları yükle
  loadAutoComponentsFromStorage() {
    try {
      // Tek seferlik güvenli referans yenileme
      if (!this.priceTable) {
        this.priceTable = document.getElementById('priceTable');
      }
      if (!this.priceTable) {
        console.warn('priceTable elementi bulunamadı, otomatik parça yükleme atlandı.');
        return;
      }

      const storedComponents = localStorage.getItem('rectifierCalculatedComponents');
      
      if (!storedComponents) {
        return;
      }

      let components;
      try {
        components = JSON.parse(storedComponents);
      } catch (parseError) {
        throw new Error(`JSON parse hatası: ${parseError.message}`);
      }

      // Veri validasyonu
      if (!Array.isArray(components)) {
        console.error('✗ Veri array değil, tip:', typeof components);
        throw new Error('Geçersiz veri formatı: Array bekleniyordu');
      }

      if (components.length === 0) {
        localStorage.removeItem('rectifierCalculatedComponents');
        return;
      }

      // Parçaları tabloya ekle
      try {
        this.autoLoadedComponents = components;
        this.addComponentsFromAuto(components);
        
        // Bildirim göster
        this.showSuccess(
          'Otomatik Parçalar Yüklendi',
          `${components.length} adet parça otomatik olarak listeye eklendi.`
        );
        
        // localStorage'ı temizle (tekrar yüklenmesin) - sadece başarılı yükleme sonrası
        localStorage.removeItem('rectifierCalculatedComponents');
      } catch (addError) {
        throw new Error(`Parça ekleme hatası: ${addError.message}`);
      }
    } catch (error) {
      console.error('Otomatik parça yükleme hatası:', error);
      this.showError(
        'Parça Yükleme Hatası',
        `Parçalar yüklenirken bir hata oluştu: ${error.message}`
      );
    }
  }

  // =================== NOTIFICATIONS ===================

  initializeNotifications() {
    if (!document.querySelector('.notification-container')) {
      const container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
  }

  showNotification(type, title, message = '', duration = 5000) {
    const container = document.querySelector('.notification-container');
    if (!container) {
      this.initializeNotifications();
      return this.showNotification(type, title, message, duration);
    }

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-icon">${icons[type] || icons.info}</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        ${message ? `<div class="notification-message">${message}</div>` : ''}
      </div>
      <button class="notification-close" type="button">×</button>
      <div class="notification-progress"></div>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    if (duration > 0) {
      const progressBar = notification.querySelector('.notification-progress');
      progressBar.style.width = '100%';
      progressBar.style.transitionDuration = `${duration}ms`;

      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 200);

      setTimeout(() => {
        this.hideNotification(notification);
      }, duration);
    }
  }

  hideNotification(notification) {
    notification.classList.add('hide');
    setTimeout(() => {
      notification.remove();
    }, 400);
  }

  showSuccess(title, message = '') {
    this.showNotification('success', title, message);
  }

  showError(title, message = '') {
    this.showNotification('error', title, message, 8000);
  }

  showWarning(title, message = '') {
    this.showNotification('warning', title, message, 6000);
  }

  showInfo(title, message = '') {
    this.showNotification('info', title, message);
  }

  // ---------- Gruplu fiyat tablosu (flex sections) ----------

  isFlexLineItemRow(row) {
    return row && row.dataset && row.dataset.rowKind === 'line-item';
  }

  clearFlexPriceTableBody() {
    if (!this.priceTable) return;
    this.priceTable.innerHTML = '';
  }

  getFlexSectionLabel(sectionId) {
    return RECTIFIER_FLEX_SECTION_LABELS[sectionId] || sectionId;
  }

  flexChevron(sectionId) {
    return this.flexSectionCollapsed[sectionId] ? '▶' : '▼';
  }

  applyFlexSectionVisibility(sectionId) {
    const collapsed = !!this.flexSectionCollapsed[sectionId];
    this.priceTable.querySelectorAll(`tr[data-section-id="${sectionId}"][data-row-kind="line-item"]`).forEach((tr) => {
      tr.classList.toggle('flex-line-item-hidden', collapsed);
      tr.style.display = collapsed ? 'none' : '';
    });
    const header = this.priceTable.querySelector(
      `tr[data-row-kind="section-header"][data-section-id="${sectionId}"] .flex-section-chevron`
    );
    if (header) header.textContent = this.flexChevron(sectionId);
  }

  toggleFlexSection(sectionId) {
    this.flexSectionCollapsed[sectionId] = !this.flexSectionCollapsed[sectionId];
    this.applyFlexSectionVisibility(sectionId);
  }

  recalculateFlexSectionSummary(sectionId) {
    const headerRow = this.priceTable.querySelector(
      `tr[data-row-kind="section-header"][data-section-id="${sectionId}"]`
    );
    if (!headerRow || headerRow.cells.length < 9) return;

    const items = Array.from(
      this.priceTable.querySelectorAll(`tr[data-row-kind="line-item"][data-section-id="${sectionId}"]`)
    );
    let sumQty = 0;
    let sumLineTotal = 0;
    let sumLineTotal2 = 0;
    let sumCostQty = 0;

    items.forEach((row) => {
      const c = row.cells;
      const unit = parseFloat((c[4]?.textContent || '').replace(/[^\d.-]/g, '')) || 0;
      const qty = parseInt(c[5]?.textContent, 10) || 0;
      const lineTot = parseFloat((c[6]?.textContent || '').replace(/[^\d.-]/g, '')) || 0;
      const lineTot2 = parseFloat((c[8]?.textContent || '').replace(/[^\d.-]/g, '')) || 0;
      sumQty += qty;
      sumLineTotal += lineTot;
      sumLineTotal2 += lineTot2;
      sumCostQty += unit * qty;
    });

    const avgUnit = sumQty > 0 ? sumCostQty / sumQty : 0;
    // Başlık satırı: td[0–3] kontrol/no/ürün/açıklama; td[4–8] = maliyet, adet, toplam, margin-2, toplam-2 (thead ile aynı sütun)
    headerRow.cells[4].textContent = items.length ? `${avgUnit.toFixed(2)}$` : '—';
    headerRow.cells[5].textContent = String(sumQty);
    headerRow.cells[6].textContent = `${sumLineTotal.toFixed(2)}$`;
    headerRow.cells[7].textContent = '—';
    headerRow.cells[8].textContent = `${sumLineTotal2.toFixed(2)}$`;
  }

  recalculateAllFlexSectionSummaries() {
    RECTIFIER_FLEX_SECTION_ORDER.forEach((id) => this.recalculateFlexSectionSummary(id));
  }

  insertFlexLineItemAfterSection(sectionId, row) {
    const all = Array.from(this.priceTable.querySelectorAll('tr')).filter(
      (r) => !r.classList.contains('total-row')
    );
    let insertAfter = null;
    for (const r of all) {
      if (r.dataset.sectionId !== sectionId) continue;
      if (r.dataset.rowKind === 'section-header' || r.dataset.rowKind === 'line-item') {
        insertAfter = r;
      }
    }
    if (insertAfter) {
      insertAfter.insertAdjacentElement('afterend', row);
    } else {
      const totalRow = this.priceTable.querySelector('.total-row');
      if (totalRow) this.priceTable.insertBefore(row, totalRow);
      else this.priceTable.appendChild(row);
    }
  }

  /**
   * other bölümünde genel gider satırlarının üstüne yeni kalem eklemek için.
   * Diğer bölümü dışında veya henüz overhead yoksa mevcut davranış (bölüm sonuna).
   */
  insertFlexLineItemIntoSection(sectionId, row, { beforeOverheads = false } = {}) {
    if (sectionId === 'other' && beforeOverheads) {
      const firstOh = this.priceTable.querySelector(
        'tr[data-section-id="other"][data-row-kind="line-item"][data-lineage="overhead"]'
      );
      if (firstOh) {
        firstOh.insertAdjacentElement('beforebegin', row);
        return;
      }
    }
    this.insertFlexLineItemAfterSection(sectionId, row);
  }

  /** Overhead satırları hariç tüm kalem satırlarının toplam maliyeti (Toplam sütunu). */
  getFlexBaseTotalCostExcludingOverhead() {
    if (!this.priceTable) return 0;
    let sum = 0;
    this.priceTable.querySelectorAll('tr[data-row-kind="line-item"]').forEach((row) => {
      if (row.dataset.lineage === 'overhead') return;
      sum +=
        parseFloat(String(row.cells[6]?.textContent || '').replace(/[^\d.-]/g, '')) || 0;
    });
    return sum;
  }

  /**
   * Diğer altında: genel üretim gideri %10, işçilik %21 (taban = diğer tüm kalemlerin toplam maliyeti).
   */
  syncIndirectCostRows() {
    if (!this.priceTable) return;
    if (
      !this.priceTable.querySelector(
        'tr[data-row-kind="section-header"][data-section-id="other"]'
      )
    ) {
      return;
    }

    const base = this.getFlexBaseTotalCostExcludingOverhead();
    const prodUnit = base * RECTIFIER_FLEX_OVERHEAD_PRODUCTION_RATE;
    const laborUnit = base * RECTIFIER_FLEX_OVERHEAD_LABOR_RATE;

    const kinds = [
      {
        kind: 'production',
        name: 'Genel üretim gideri',
        productName: '',
        desc: `Direkt maliyet toplamı × %${RECTIFIER_FLEX_OVERHEAD_PRODUCTION_RATE * 100} (otomatik)`,
        unit: prodUnit,
      },
      {
        kind: 'labor',
        name: 'İşçilik gideri',
        productName: '',
        desc: `Direkt maliyet toplamı × %${RECTIFIER_FLEX_OVERHEAD_LABOR_RATE * 100} (otomatik)`,
        unit: laborUnit,
      },
    ];

    kinds.forEach(({ kind, name, productName, desc, unit }) => {
      const dup = this.priceTable.querySelectorAll(
        `tr[data-section-id="other"][data-row-kind="line-item"][data-lineage="overhead"][data-overhead-kind="${kind}"]`
      );
      dup.forEach((r, i) => {
        if (i > 0) r.remove();
      });

      let row = this.priceTable.querySelector(
        `tr[data-section-id="other"][data-row-kind="line-item"][data-lineage="overhead"][data-overhead-kind="${kind}"]`
      );

      if (!row) {
        const compIdx = this.priceTable.querySelectorAll('tr[data-row-kind="line-item"]').length;
        const comp = {
          name,
          productName,
          category: desc,
          quantity: 1,
          unitPrice: unit,
          excelData: {},
          flexLineage: 'overhead',
          overheadKind: kind,
          selectionLogic: {
            title: name,
            steps: [
              {
                label: 'Direkt maliyet toplamı',
                detail: `${base.toFixed(2)} $ (genel üretim ve işçilik satırları hariç tüm kalemler)`,
              },
              {
                label: 'Oran',
                detail:
                  kind === 'production'
                    ? `%${RECTIFIER_FLEX_OVERHEAD_PRODUCTION_RATE * 100} × direkt toplam`
                    : `%${RECTIFIER_FLEX_OVERHEAD_LABOR_RATE * 100} × direkt toplam`,
              },
            ],
          },
        };
        row = this.buildFlexLineItemRow(comp, compIdx, 'other');
        this.insertFlexLineItemAfterSection('other', row);
      } else {
        row.cells[3].textContent = desc;
        row.cells[4].textContent = `${unit.toFixed(2)}$`;
        row.cells[5].textContent = '1';
        const margin2 = parseFloat(row.cells[7].getAttribute('data-value')) || 1.6;
        row.cells[6].textContent = `${unit.toFixed(2)}$`;
        row.cells[8].textContent = `${(unit * margin2).toFixed(2)}$`;
        row._componentData = {
          ...(row._componentData || {}),
          name,
          productName,
          category: desc,
          quantity: 1,
          unitPrice: unit,
          flexLineage: 'overhead',
          overheadKind: kind,
          selectionLogic: {
            title: name,
            steps: [
              {
                label: 'Direkt maliyet toplamı',
                detail: `${base.toFixed(2)} $ (genel üretim ve işçilik satırları hariç)`,
              },
              {
                label: 'Oran',
                detail:
                  kind === 'production'
                    ? `%${RECTIFIER_FLEX_OVERHEAD_PRODUCTION_RATE * 100}`
                    : `%${RECTIFIER_FLEX_OVERHEAD_LABOR_RATE * 100}`,
              },
            ],
          },
        };
      }

      if (this.flexSectionCollapsed && this.flexSectionCollapsed.other) {
        row.style.display = 'none';
      } else {
        row.style.display = '';
      }
    });

    this.recalculateFlexSectionSummary('other');
  }

  createFlexSectionHeaderRow(sectionId) {
    const tr = document.createElement('tr');
    tr.className = 'flex-section-header';
    tr.dataset.rowKind = 'section-header';
    tr.dataset.sectionId = sectionId;
    tr.innerHTML = `
      <td class="col-check"></td>
      <td class="flex-section-no col-no">—</td>
      <td class="col-product flex-section-title-cell flex-section-header-lead">
        <button type="button" class="flex-section-toggle" aria-expanded="false" title="Detayı aç/kapat">
          <span class="flex-section-chevron">${this.flexChevron(sectionId)}</span>
          <span class="flex-section-title">${this.escapeHtml(this.getFlexSectionLabel(sectionId))}</span>
        </button>
        <button type="button" class="flex-section-add-line" title="Bu gruba manuel satır ekle">+ Satır</button>
      </td>
      <td class="col-description flex-section-header-lead flex-section-desc-spacer" aria-hidden="true"></td>
      <td class="flex-section-sum-cell col-cost">—</td>
      <td class="flex-section-sum-cell col-qty">0</td>
      <td class="flex-section-sum-cell col-total">0.00$</td>
      <td class="flex-section-sum-cell col-margin">—</td>
      <td class="flex-section-sum-cell col-total2">0.00$</td>
    `;
    const toggleBtn = tr.querySelector('.flex-section-toggle');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFlexSection(sectionId);
      toggleBtn.setAttribute('aria-expanded', String(!this.flexSectionCollapsed[sectionId]));
    });
    tr.querySelector('.flex-section-add-line')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.addManualRowToFlexSection(sectionId);
    });
    tr.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      if (e.target.closest('.flex-section-sum-cell')) return;
      if (!e.target.closest('.flex-section-header-lead')) return;
      this.toggleFlexSection(sectionId);
      toggleBtn?.setAttribute('aria-expanded', String(!this.flexSectionCollapsed[sectionId]));
    });
    return tr;
  }

  renderFlexSectionSkeleton() {
    if (!this.priceTable) return;
    this.clearFlexPriceTableBody();
    RECTIFIER_FLEX_SECTION_ORDER.forEach((sectionId) => {
      this.priceTable.appendChild(this.createFlexSectionHeaderRow(sectionId));
      this.applyFlexSectionVisibility(sectionId);
    });
    this.showingTotals = true;
    this.updateTotals();
    this.renumberRows();
  }

  /**
   * Tek bir kalem satırı oluşturur (line-item); DOM'a ekleme çağırana aittir.
   */
  buildFlexLineItemRow(comp, compIndex, sectionId) {
    const quantity = Number(comp.quantity) || 1;
    const cost = Number(comp.unitPrice) || 0;
    const totalCost = cost * quantity;
    const margin2 = 1.6;
    const margin2Total = totalCost * margin2;

    const row = document.createElement('tr');
    const isOverhead = comp.flexLineage === 'overhead';
    row.className = 'flex-line-item' + (isOverhead ? ' flex-line-overhead' : '');
    row.dataset.rowKind = 'line-item';
    row.dataset.sectionId = sectionId;
    row.dataset.lineage = comp.flexLineage || 'standard';
    if (isOverhead && comp.overheadKind) {
      row.dataset.overheadKind = comp.overheadKind;
    }

    const excelData = comp.excelData || {};

    row.dataset.mainTitle = excelData.MainTitle || comp.name || '';
    row.dataset.model = excelData.Model || comp.productName || comp.name || '';
    row.dataset.description =
      excelData.Description || excelData.description || comp.specs || '';
    row.dataset.inputVoltage = excelData.InputVoltage || '';
    row.dataset.output = excelData.Output || '';
    row.dataset.technology = excelData.Technology || '';
    row.dataset.features = excelData.Features || '';
    row.dataset.dimensions = excelData.Dimensions || '';
    row.dataset.includes = excelData.Includes || '';
    row.dataset.componentIndex = String(compIndex);
    row._componentData = comp;

    const isCabinet = comp.category === 'Kabin';
    const costCellContent = isCabinet
      ? `<td class="col-cost editable-cell" contenteditable="true">${cost.toFixed(2)}$</td>`
      : `<td class="col-cost">${cost.toFixed(2)}$</td>`;

    const catLabel = comp.category || comp.description || '';
    let descCell = (this.escapeHtml(catLabel) || '').trim() || '—';
    if (comp.excelData?.__boardCatalog) {
      const tag =
        comp.excelData.__boardScope === 'option'
          ? 'Opsiyon kart'
          : comp.excelData.__boardScope === 'standard'
            ? 'Standart kart'
            : 'Kart';
      descCell = `${tag} — ${descCell}`;
    }

    const productTitle = [comp.name, comp.productName].filter(Boolean).join(' - ').trim();
    const qtyCell = isOverhead
      ? `<td class="col-qty">${quantity}</td>`
      : `<td class="col-qty editable-cell" contenteditable="true">${quantity}</td>`;

    row.innerHTML = `
      <td class="col-check col-check-with-info">
        <button type="button" class="flex-line-info-btn" aria-label="Nasıl hesaplandı?" title="Nasıl hesaplandı?">ⓘ</button>
        <input type="checkbox" class="row-checkbox">
      </td>
      <td class="flex-line-no col-no"></td>
      <td class="col-product">${this.escapeHtml(productTitle)}</td>
      <td class="col-description">${descCell}</td>
      ${costCellContent}
      ${qtyCell}
      <td class="col-total">${totalCost.toFixed(2)}$</td>
      <td class="col-margin margin-cell" data-value="${margin2}">${margin2}</td>
      <td class="col-total2">${margin2Total.toFixed(2)}$</td>
    `;

    if (isCabinet) {
      const costCell = row.cells[4];
      costCell.addEventListener('blur', () => {
        const newCost = parseFloat(costCell.textContent.replace(/[^\d.-]/g, '')) || 0;
        costCell.textContent = newCost.toFixed(2) + '$';
        this.calculateRowTotals(row);
      });
    }

    const checkbox = row.querySelector('.row-checkbox');
    const infoBtn = row.querySelector('.flex-line-info-btn');
    infoBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openCalculationExplainModal(row);
    });
    checkbox.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener('change', () => {
      row.classList.toggle('row-selected', checkbox.checked);
    });
    row.addEventListener('click', (event) => {
      if (event.target.closest('.flex-line-info-btn')) return;
      const clickedEditable = !!event.target.closest('[contenteditable="true"]');
      const clickedMargin = !!event.target.closest('.margin-cell');
      if (clickedEditable || clickedMargin) return;
      checkbox.click();
    });

    this.setupMarginCellListeners(row.cells[7]);
    return row;
  }

  renderGroupedFromComponents(components) {
    if (!this.priceTable || !Array.isArray(components)) return;

    const bySection = {};
    RECTIFIER_FLEX_SECTION_ORDER.forEach((id) => {
      bySection[id] = [];
    });

    components.forEach((comp, idx) => {
      const sid = flexSectionIdForCategory(comp.category);
      if (!bySection[sid]) bySection[sid] = [];
      bySection[sid].push({ comp, idx });
    });

    this.clearFlexPriceTableBody();
    this.autoLoadedComponents = components;
    this.flexSectionCollapsed = Object.fromEntries(
      RECTIFIER_FLEX_SECTION_ORDER.map((id) => [id, true])
    );

    RECTIFIER_FLEX_SECTION_ORDER.forEach((sectionId) => {
      this.priceTable.appendChild(this.createFlexSectionHeaderRow(sectionId));
      const pairs = bySection[sectionId] || [];
      pairs.forEach(({ comp, idx }) => {
        const lineRow = this.buildFlexLineItemRow(comp, idx, sectionId);
        this.insertFlexLineItemAfterSection(sectionId, lineRow);
      });
      this.applyFlexSectionVisibility(sectionId);
      this.recalculateFlexSectionSummary(sectionId);
    });

    this.showingTotals = true;
    this.updateTotals();
    this.renumberRows();
  }

  ensureFlexGroupedSkeletonIfEmpty() {
    if (!this.priceTable) return;
    const hasHeader = this.priceTable.querySelector('tr[data-row-kind="section-header"]');
    if (!hasHeader) {
      this.renderFlexSectionSkeleton();
    }
  }

  addManualRowToFlexSection(sectionId) {
    if (!RECTIFIER_FLEX_SECTION_ORDER.includes(sectionId)) sectionId = 'other';
    this.ensureFlexGroupedSkeletonIfEmpty();
    const pseudoComp = {
      name: 'Manuel Ürün',
      productName: '',
      category: '',
      quantity: 1,
      unitPrice: 0,
      excelData: {},
      flexLineage: 'manual',
    };
    const idx = this.priceTable.querySelectorAll('tr[data-row-kind="line-item"]').length;
    const row = this.buildFlexLineItemRow(pseudoComp, idx, sectionId);
    row.cells[2].textContent = 'Manuel Ürün';
    row.cells[2].classList.add('editable-cell');
    row.cells[2].contentEditable = 'true';
    row.cells[3].textContent = '';
    row.cells[3].classList.add('editable-cell');
    row.cells[3].contentEditable = 'true';
    row.cells[4].textContent = '0.00$';
    row.cells[4].classList.add('editable-cell');
    row.cells[4].contentEditable = 'true';
    row.cells[5].textContent = '1';
    row.cells[5].classList.add('editable-cell');
    row.cells[5].contentEditable = 'true';
    row.cells[6].textContent = '0.00$';
    row.cells[8].textContent = '0.00$';

    const cells = row.cells;
    [2, 3, 4, 5].forEach((cellIndex) => {
      cells[cellIndex].addEventListener('blur', () => this.calculateRowTotals(row));
    });

    this.insertFlexLineItemIntoSection(sectionId, row, {
      beforeOverheads: sectionId === 'other',
    });
    if (!this.flexSectionCollapsed[sectionId]) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
    this.calculateRowTotals(row);
    this.renumberRows();
  }

  // Otomatik komponent listesinden satır ekleme
  addComponentsFromAuto(components) {
    if (!Array.isArray(components) || components.length === 0) {
      this.showWarning(
        'Liste Boş',
        'Aktarılacak otomatik komponent listesi bulunamadı.'
      );
      return;
    }

    this.renderGroupedFromComponents(components);
  }

  // =================== EVENTLER ===================

  setupEventListeners() {
    document
      .getElementById('addButton')
      ?.addEventListener('click', () => this.addProductToTable());
    const finishBtn = document.getElementById('finishPricingBtn');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => this.finishPricing());
    }
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportRectifierOfferExcel());
    }
    const backBtn = document.getElementById('backToConfigBtn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const ctx = JSON.parse(sessionStorage.getItem('pricingQueueContext') || '{}');
        if (ctx?.pricingPage === 'rectifier-pricing.html') {
          location.href = 'rectifier-pricing.html';
          return;
        }
        location.href = 'project-costing.html';
      });
    }

    const manualAddBtn = document.getElementById('manualAddButton');
    if (manualAddBtn) {
      manualAddBtn.addEventListener('click', () => this.addManualRow());
    }

    const deleteBtn = document.getElementById('deleteButton');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteSelectedRows());
    }

    const showTotalsBtn = document.getElementById('showTotalsButton');
    if (showTotalsBtn) {
      showTotalsBtn.addEventListener('click', () => this.toggleTotals());
    }

    const batteryCalcBtn = document.getElementById('batteryCalcBtn');
    if (batteryCalcBtn) {
      batteryCalcBtn.addEventListener('click', () =>
        this.openPanel('batteryCalcPanel')
      );
    }

    document.querySelectorAll('.panel-close-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.calculator-panel').classList.remove('active');
      });
    });

    if (this.productSelect) {
      this.productSelect.addEventListener('change', (e) => {
        this.updateSubtypes(e.target.value);
      });
    }
  }

  // =================== MENÜ & PENCERE ===================

  setupMenubar() {
    const setupMenu = (btnId, menuId) => {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      if (btn && menu) {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.toggleMenu(menu);
        };
      }
    };
    setupMenu('fileMenuBtn', 'fileMenu');
    setupMenu('toolsMenuBtn', 'toolsMenu');
    document.addEventListener('click', () => this.closeAllMenus());
  }

  // Teklif oluştururken seçilen kaleme göre menüdeki sistem adı/adet bilgisini otomatik doldur
  autoFillSystemBar() {
    const systemNameInput = document.getElementById('systemNameInput');
    const systemQuantityInput = document.getElementById('systemQuantityInput');
    if (!systemNameInput || !systemQuantityInput) return;

    try {
      const ctx = JSON.parse(sessionStorage.getItem('pricingQueueContext') || '{}');
      const draft = JSON.parse(sessionStorage.getItem('offerDraft') || '{}');

      const lineId = ctx?.lineId;
      const lines = Array.isArray(draft?.lines) ? draft.lines : [];
      const line = lineId ? lines.find((l) => String(l.lineId) === String(lineId)) : null;

      const candidateName = (line?.lineDescription || line?.label || line?.routeKey || '').toString().trim();
      const candidateQty = line?.quantity != null ? Number(line.quantity) : null;

      // Kullanıcı elle bir şey girmişse zorla ezmeyelim; sadece varsayılanı değiştiriyoruz.
      if (candidateName) {
        const current = systemNameInput.value?.toString() || '';
        if (!current || current === 'Rectifier System') systemNameInput.value = candidateName;
      }

      if (candidateQty && candidateQty > 0) {
        const currentQty = Number(systemQuantityInput.value) || 1;
        if (currentQty === 1) systemQuantityInput.value = String(candidateQty);
      }
    } catch (_) {}
  }

  toggleMenu(menu) {
    if (!menu) return;
    document.querySelectorAll('.menubar-dropdown').forEach((m) => {
      if (m !== menu) m.style.display = 'none';
    });
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }

  closeAllMenus() {
    document
      .querySelectorAll('.menubar-dropdown')
      .forEach((m) => (m.style.display = 'none'));
  }

  setupWindowControls() {
    const minimizeBtn = document.querySelector('.window-button.minimize');
    const closeBtn = document.querySelector('.window-button.close');

    if (minimizeBtn) {
      minimizeBtn.onclick = () => window.app.minimize();
    }
    if (closeBtn) {
      closeBtn.onclick = () => window.app.close();
    }
  }

  // =================== HESAPLAMA PANELLERİ ===================

  openPanel(panelId) {
    document
      .querySelectorAll('.calculator-panel')
      .forEach((p) => p.classList.remove('active'));
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
    this.closeAllMenus();
  }

  initializeCalculators() {
    const closeAllPanels = () => {
      document.querySelectorAll('.calculator-panel').forEach((panel) => {
        panel.classList.remove('active');
      });
    };

    document.querySelectorAll('.panel-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.calculator-panel');
        if (panel) {
          panel.classList.remove('active');
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        document.querySelector('.calculator-panel.active')
      ) {
        closeAllPanels();
      }
    });

    const batteryCalcBtn = document.getElementById('calculateBattery');
    if (batteryCalcBtn) {
      batteryCalcBtn.addEventListener('click', () => {
        const inputs = {
          power: parseFloat(document.getElementById('powerInput').value),
          batteryCount: parseFloat(
            document.getElementById('batteryCount').value
          ),
          cellCount: parseFloat(document.getElementById('cellCount').value),
          stringCount: parseFloat(
            document.getElementById('stringCount').value
          ),
          powerFactor: parseFloat(
            document.getElementById('powerFactorBat').value
          ),
          efficiency:
            parseFloat(document.getElementById('efficiencyBat').value) / 100,
        };

        try {
          const results = this.calculateBattery(inputs);
          document.getElementById('wBlockResult').textContent =
            `${results.wBlock.toFixed(2)} W`;
          document.getElementById('wCellResult').textContent =
            `${results.wCell.toFixed(2)} W`;
          this.showSuccess(
            'Hesaplama Tamamlandı',
            'Batarya hesaplama sonuçları güncellendi.'
          );
        } catch (error) {
          this.showError('Batarya Hesaplama Hatası', error.message);
        }
      });
    }
  }

  calculateBattery(inputs) {
    if (
      !inputs.power ||
      !inputs.batteryCount ||
      !inputs.cellCount ||
      !inputs.stringCount ||
      !inputs.powerFactor ||
      !inputs.efficiency
    ) {
      throw new Error('Lütfen tüm alanları doldurun');
    }

    const wBlock =
      ((inputs.power * inputs.powerFactor) /
        (inputs.efficiency * inputs.batteryCount * inputs.stringCount)) *
      1000;

    const wCell =
      ((inputs.power * inputs.powerFactor) /
        (inputs.efficiency *
          inputs.batteryCount *
          inputs.stringCount *
          inputs.cellCount)) *
      1000;

    if (isNaN(wBlock) || isNaN(wCell)) {
      throw new Error('Geçersiz hesaplama sonucu');
    }

    return { wBlock, wCell };
  }

  // =================== EXCEL VERİLERİ ===================

  async loadExcelData() {
    try {
      this.showInfo('Veri Yükleniyor', 'Rectifier Excel verileri yükleniyor...');
      const client = window.runtimeHttpClient;
      const json = client
        ? await client.get('/api/excel/rectifier/Terminals')
        : await (await fetch('/api/excel/rectifier/Terminals')).json();
      const data = json.data || [];
      if (!data || data.length === 0) {
        throw new Error('Rectifier için Excel verisi boş veya hatalı.');
      }

      this.currentProductData = data;
      this.allProductTypes = [
        ...new Set(data.map((row) => row['Product Type'])),
      ].filter(Boolean);

      if (this.productDropdown) {
        this.renderComboboxItems(this.allProductTypes);
      } else if (this.productSelect) {
        this.productSelect.innerHTML =
          '<option value="">Ürün Seçin</option>' +
          this.allProductTypes
            .map((type) => `<option value="${type}">${type}</option>`)
            .join('');
      }

      this.showSuccess(
        'Veri Yüklendi',
        `${data.length} adet Rectifier ürünü başarıyla yüklendi.`
      );
    } catch (error) {
      console.error('Excel yükleme hatası:', error);
      if (error.status === 401) {
        this.showError(
          'Oturum Hatası',
          'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.'
        );
      } else if (error.status === 404 || error.status === 503) {
        this.showError(
          'Excel Dosyası Bulunamadı',
          error.detail || error.message
        );
      } else if (error.status === 400) {
        this.showError('Bileşen İsteği Geçersiz', error.message);
      } else {
        this.showError('Veri Yükleme Hatası', error.message);
      }
    }
  }

  updateSubtypes(productType) {
    const productData = this.currentProductData.filter(
      (row) => row['Product Type'] === productType
    );
    const subtypes = productData
      .filter(
        (row) =>
          row.Subtype &&
          String(row.Subtype).trim() !== '' &&
          String(row.Subtype) !== 'NaN'
      )
      .map((row) => ({ subtype: row.Subtype, cost: row.Cost }));

    const subtypeSelect = this.subtypeSelect;

    if (subtypes.length > 0) {
      subtypeSelect.innerHTML = `<option value="">Alt Tip Seçin</option>${subtypes
        .map(
          (sub) =>
            `<option value="${sub.subtype}" data-cost="${sub.cost}">${sub.subtype}</option>`
        )
        .join('')}`;
      subtypeSelect.disabled = false;
      this.currentCost = null;
    } else {
      subtypeSelect.innerHTML = '<option value="">Alt Tip Yok</option>';
      subtypeSelect.disabled = true;
      this.currentCost = productData[0]?.Cost;
    }

    subtypeSelect.onchange = (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      this.currentCost = parseFloat(selectedOption.dataset.cost);
    };
  }

  // =================== TABLO İŞLEMLERİ ===================

  addProductToTable() {
    const selectedProduct = this.productSelect.value;
    if (!selectedProduct) {
      this.showWarning('Ürün Seçimi', 'Lütfen bir ürün seçin.');
      return;
    }

    const hasSubtypes = !this.subtypeSelect.disabled;
    const selectedSubtype = this.subtypeSelect.value;
    if (hasSubtypes && !selectedSubtype) {
      this.showWarning('Alt Tip Seçimi', 'Lütfen bir alt tip seçin.');
      return;
    }

    const productData = this.currentProductData.find(
      (row) =>
        row['Product Type'] === selectedProduct &&
        (!hasSubtypes || row.Subtype === selectedSubtype)
    );
    if (!productData) {
      this.showError('Veri Hatası', 'Ürün detayları bulunamadı.');
      return;
    }

    const quantity = parseInt(this.quantityInput.value) || 1;
    const cost = this.currentCost;
    if (!cost || isNaN(cost)) {
      this.showError('Fiyat Hatası', 'Ürün fiyatı belirlenemedi.');
      return;
    }

    this.ensureFlexGroupedSkeletonIfEmpty();

    const sectionId = flexSectionIdForProductType(selectedProduct);
    const pseudoComp = {
      name: selectedProduct,
      productName: hasSubtypes ? selectedSubtype : '',
      category: productData.Description || productData.description || selectedProduct,
      quantity,
      unitPrice: cost,
      excelData: productData,
      flexLineage: 'standard',
    };
    const idx = this.priceTable.querySelectorAll('tr[data-row-kind="line-item"]').length;
    const row = this.buildFlexLineItemRow(pseudoComp, idx, sectionId);

    this.insertFlexLineItemIntoSection(sectionId, row, {
      beforeOverheads: sectionId === 'other',
    });
    if (!this.flexSectionCollapsed[sectionId]) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
    this.recalculateFlexSectionSummary(sectionId);
    this.updateTotals();
    this.renumberRows();
  }

  addManualRow() {
    this.addManualRowToFlexSection('other');
  }

  setupMarginCellListeners(cell) {
    cell.addEventListener('click', () => {
      cell.contentEditable = true;
      cell.focus();
    });
    cell.addEventListener('blur', () => {
      cell.contentEditable = false;
      const value = parseFloat(cell.textContent) || 1.0;
      cell.textContent = value;
      cell.setAttribute('data-value', value);
      this.calculateRowTotals(cell.closest('tr'));
    });
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cell.blur();
      }
    });
  }

  calculateRowTotals(row) {
    if (!row) return;
    const cells = row.cells;
    if (row.dataset.lineage === 'overhead') {
      const cost = parseFloat(cells[4].textContent.replace(/[^\d.-]/g, '')) || 0;
      const quantity = parseInt(cells[5].textContent, 10) || 1;
      const margin2 = parseFloat(cells[7].getAttribute('data-value')) || 1.6;
      const total = cost * quantity;
      cells[6].textContent = `${total.toFixed(2)}$`;
      cells[8].textContent = `${(total * margin2).toFixed(2)}$`;
      if (row.dataset.sectionId) {
        this.recalculateFlexSectionSummary(row.dataset.sectionId);
      }
      this.updateTotals();
      return;
    }
    const cost = parseFloat(cells[4].textContent.replace(/[^\d.-]/g, '')) || 0;
    const quantity = parseInt(cells[5].textContent) || 1;
    const margin2 = parseFloat(cells[7].getAttribute('data-value')) || 1.6;
    const total = cost * quantity;
    cells[6].textContent = total.toFixed(2) + '$';
    cells[8].textContent = (total * margin2).toFixed(2) + '$';
    if (row.dataset.sectionId) {
      this.recalculateFlexSectionSummary(row.dataset.sectionId);
    }
    this.syncIndirectCostRows();
    this.updateTotals();
  }

  updateTotals() {
    if (!this.showingTotals) return;
    this.syncIndirectCostRows();
    let totalCost = 0;
    let totalMargin2 = 0;

    Array.from(this.priceTable.rows)
      .filter((row) => this.isFlexLineItemRow(row))
      .forEach((row) => {
        totalCost += parseFloat(
          row.cells[6]?.textContent?.replace('$', '') || 0
        );
        totalMargin2 += parseFloat(
          row.cells[8]?.textContent?.replace('$', '') || 0
        );
      });

    let totalRow = this.priceTable.querySelector('.total-row');
    if (!totalRow) {
      totalRow = this.priceTable.insertRow();
      totalRow.className = 'total-row';
    }
    totalRow.innerHTML = `
      <td class="col-check"></td>
      <td class="col-no" colspan="5"><strong>TOPLAM</strong></td>
      <td class="col-total"><strong>${totalCost.toFixed(2)}$</strong></td>
      <td class="col-margin"></td>
      <td class="col-total2"><strong>${totalMargin2.toFixed(2)}$</strong></td>
    `;
  }

  deleteSelectedRows() {
    const affected = new Set();
    this.priceTable.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      const tr = cb.closest('tr');
      if (!tr || !this.isFlexLineItemRow(tr)) return;
      if (tr.dataset.sectionId) affected.add(tr.dataset.sectionId);
      tr.remove();
    });
    affected.forEach((sid) => this.recalculateFlexSectionSummary(sid));
    this.updateTotals();
    this.renumberRows();
  }

  renumberRows() {
    if (!this.priceTable) return;
    let n = 0;
    Array.from(this.priceTable.rows).forEach((row) => {
      if (row.classList.contains('total-row')) return;
      if (this.isFlexLineItemRow(row)) {
        n += 1;
        row.cells[1].textContent = String(n);
      } else if (row.dataset.rowKind === 'section-header') {
        row.cells[1].textContent = '—';
      }
    });
  }

  toggleTotals() {
    this.showingTotals = !this.showingTotals;
    const totalRow = this.priceTable.querySelector('.total-row');
    if (totalRow) totalRow.remove();
    if (this.showingTotals) this.updateTotals();
  }

  // =================== TEKLİFE EKLE ===================

  getLocalItems() {
    return Array.from(this.priceTable.rows)
      .filter((row) => this.isFlexLineItemRow(row))
      .map((row) => {
        const cells = row.cells;
        return {
          product_name: cells[2].textContent.trim(),
          description: cells[3].textContent.trim(),
          unit_price: parseFloat(cells[4].textContent.replace(/[^\d.-]/g, '')),
          quantity: parseInt(cells[5].textContent),
          total_price: parseFloat(
            cells[6].textContent.replace(/[^\d.-]/g, '')
          ),
          margin2: parseFloat(cells[7].textContent),
          total2: parseFloat(cells[8].textContent.replace(/[^\d.-]/g, '')),
          mainTitle: row.dataset.mainTitle || '',
          model: row.dataset.model || '',
          metadataDescription: row.dataset.description || '',
          inputVoltage: row.dataset.inputVoltage || '',
          output: row.dataset.output || '',
          technology: row.dataset.technology || '',
          features: row.dataset.features || '',
          dimensions: row.dataset.dimensions || '',
          includes: row.dataset.includes || '',
          flexSectionId: row.dataset.sectionId || '',
          flexLineage: row.dataset.lineage || 'standard',
        };
      });
  }

  async addToQuote({ advanceQueue = true } = {}) {
    const items = this.getLocalItems();
    if (items.length === 0) {
      this.showWarning(
        'Liste Boş',
        'Teklife eklemek için önce Rectifier ürün listesi oluşturun.'
      );
      return;
    }

    const systemName =
      document.getElementById('systemNameInput').value || 'Rectifier System';
    const systemQuantity =
      parseInt(document.getElementById('systemQuantityInput').value) || 1;

    const systemPackage = {
      name: systemName,
      quantity: systemQuantity,
      items,
      productType: 'Rectifier',
    };

    // Sepete ekle (web API)
    const client = window.runtimeHttpClient;
    const cartRequest = client
      ? client.post('/api/cart', systemPackage)
      : fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(systemPackage),
        });

    try {
      await Promise.resolve(cartRequest);
    } catch (err) {
      console.warn('Sepet kayıt hatası:', err);
      this.showError('Sepet Kaydı Hatası', err?.message || 'Sepete eklenemedi.');
      return;
    }

    if (advanceQueue && typeof window.onAddToCartProjectQueueHook === 'function') {
      void window.onAddToCartProjectQueueHook();
    }
    this.showSuccess(
      'Teklife Eklendi!',
      `'${systemName}' (x${systemQuantity}) başarıyla teklife eklendi!`
    );

    this.priceTable.innerHTML = '';
    this.updateTotals();
    this.renderFlexSectionSkeleton();
  }

  // =================== MALİYETLENDİRME BİTİR (Docs Modal) ===================
  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  downloadDocFile(filePath) {
    if (!filePath) return;
    const fp = String(filePath);
    if (/^https?:\/\//i.test(fp)) {
      window.open(fp, '_blank', 'noopener,noreferrer');
      return;
    }
    const a = document.createElement('a');
    a.href = fp;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
  }

  async openDocsModal(quoteProjectId) {
    const overlayId = 'rectifierDocsModalOverlay';
    document.getElementById(overlayId)?.remove();

    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';

    overlay.innerHTML = `
      <div style="width:min(900px, 92vw); max-height:82vh; overflow:auto; background: var(--card-bg, #fff); border:1px solid var(--border-color); border-radius:14px; padding:18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
          <h3 style="margin:0;">Dokümanlar</h3>
          <button type="button" id="rectifierDocsCloseBtn" style="border:none; background:transparent; font-size:20px; cursor:pointer;">×</button>
        </div>

        <div id="rectifierDocsStatus" style="color: var(--text-secondary, #6b7280); font-size:13px; margin-bottom:12px;">
          Dokümanlar hazırlanıyor...
        </div>

        <div id="rectifierDocsList" style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px;"></div>

        <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
          <button type="button" id="rectifierDocsDownloadAllBtn" style="padding:8px 12px; border:1px solid var(--border-color); border-radius:10px; background: var(--surface, #fff); cursor:pointer;">
            Hepsini İndir
          </button>
          <button type="button" id="rectifierDocsContinueBtn" style="padding:8px 14px; border:none; border-radius:10px; background: var(--epc-blue, #2563eb); color:#fff; cursor:pointer;">
            Devam
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const setStatus = (t) => {
      const el = overlay.querySelector('#rectifierDocsStatus');
      if (el) el.textContent = t;
    };
    const listEl = overlay.querySelector('#rectifierDocsList');
    setStatus('Dokümanlar listeleniyor...');

    let docs = [];
    try {
      // Paket üretimi (gerekirse)
      await fetch(`${window.location.origin}/api/user/quote-projects/${quoteProjectId}/finalize-docs`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }).catch(() => {});

      const projRes = await fetch(`${window.location.origin}/api/user/quote-projects/${quoteProjectId}`, {
        headers: this.getAuthHeaders(),
      });
      const projJ = await projRes.json().catch(() => ({}));
      const quoteNumber = projJ?.data?.quote_number;

      if (!quoteNumber) throw new Error('quote_number bulunamadı');

      const quotesRes = await fetch(`${window.location.origin}/api/user/quotes?limit=100`, {
        headers: this.getAuthHeaders(),
      });
      const quotesJ = await quotesRes.json().catch(() => ({ data: [] }));
      const match = (quotesJ.data || []).find((q) => String(q.number) === String(quoteNumber));
      if (!match?.id) throw new Error('Teklif (quote) kaydı bulunamadı');

      const docsRes = await fetch(`${window.location.origin}/api/quote-documents?quoteId=${match.id}`, {
        headers: this.getAuthHeaders(),
      });
      const docsJ = await docsRes.json().catch(() => ({ data: [] }));
      docs = Array.isArray(docsJ.data) ? docsJ.data : [];
    } catch (e) {
      setStatus('Dokümanlar alınamadı.');
      listEl.innerHTML = `<div style="color: var(--text-secondary, #6b7280);">Hata: ${this.escapeHtml(e?.message || 'unknown')}</div>`;
    }

    if (docs.length) {
      listEl.innerHTML = docs
        .map((d) => {
          const exists = !!d.file_exists;
          const fp = d.file_path || '';
          return `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; border:1px solid var(--border-color); border-radius:10px; background: var(--surface-light, #f8fafc);">
              <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:13px; margin-bottom:2px;">${this.escapeHtml(d.doc_type || '')}</div>
                <div style="color: var(--text-tertiary, #6b7280); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${this.escapeHtml(exists ? fp : `Dosya yok: ${fp}`)}
                </div>
              </div>
              <button type="button" class="rectifierDocDownloadBtn" data-file-path="${encodeURIComponent(fp)}" ${
                exists ? '' : 'disabled'
              } style="padding:6px 10px; border:1px solid var(--border-color); border-radius:10px; background: #fff; cursor:pointer;">
                İndir
              </button>
            </div>
          `;
        })
        .join('');

      overlay.querySelectorAll('.rectifierDocDownloadBtn').forEach((b) => {
        b.addEventListener('click', () => {
          const fp = decodeURIComponent(b.getAttribute('data-file-path') || '');
          this.downloadDocFile(fp);
        });
      });
    }

    overlay.querySelector('#rectifierDocsDownloadAllBtn')?.addEventListener('click', () => {
      overlay.querySelectorAll('.rectifierDocDownloadBtn:not([disabled])').forEach((btn) => {
        const fp = decodeURIComponent(btn.getAttribute('data-file-path') || '');
        this.downloadDocFile(fp);
      });
    });

    return new Promise((resolve) => {
      const closeBtn = overlay.querySelector('#rectifierDocsCloseBtn');
      const continueBtn = overlay.querySelector('#rectifierDocsContinueBtn');

      const cleanup = () => {
        overlay.remove();
      };
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
      });
      closeBtn?.addEventListener('click', () => {
        cleanup();
        resolve();
      });
      continueBtn?.addEventListener('click', () => {
        cleanup();
        resolve();
      });
    });
  }

  async finishPricing() {
    // 1) Sepete ekle ama kuyruğu otomatik ilerletme
    await this.addToQuote({ advanceQueue: false });

    // 2) Doküman modalı (kullanıcı “Devam” deyince devam edeceğiz)
    const ctx = JSON.parse(sessionStorage.getItem('pricingQueueContext') || '{}');
    const quoteProjectId = ctx?.quoteProjectId;

    if (quoteProjectId) {
      try {
        await this.openDocsModal(quoteProjectId);
      } catch (_) {}
    }

    // 3) Kuyruğu ilerlet + project-costing yönlendirmesi
    if (typeof window.onAddToCartProjectQueueHook === 'function') {
      void window.onAddToCartProjectQueueHook();
    } else {
      location.href = 'project-costing.html';
    }
  }

  /** localStorage / sessionStorage için güvenli JSON okuma */
  _safeStorageJson(storage, key) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** Excel üst bilgi blokları (proje + teknik özet) */
  buildRectifierExportMetadata() {
    const meta = [];
    const now = new Date();
    meta.push({ label: 'Teklif Tarihi', value: now.toLocaleString('tr-TR') });

    const sysName = document.getElementById('systemNameInput')?.value?.trim();
    const sysQty = document.getElementById('systemQuantityInput')?.value;
    if (sysName) meta.push({ label: 'Sistem adı', value: sysName });
    if (sysQty != null && String(sysQty).trim() !== '') {
      meta.push({ label: 'Sistem adedi', value: String(sysQty) });
    }

    try {
      const u = this._safeStorageJson(localStorage, 'currentUser');
      const who =
        u?.fullName ||
        u?.full_name ||
        u?.name ||
        u?.username ||
        u?.email;
      if (who) meta.push({ label: 'Hazırlayan', value: String(who) });
    } catch {
      /* ignore */
    }

    const selProj = this._safeStorageJson(localStorage, 'selectedProject');
    const curProj = this._safeStorageJson(localStorage, 'currentProject');
    const projName =
      selProj?.name ||
      curProj?.name ||
      selProj?.projectName ||
      curProj?.projectName;
    if (projName) meta.push({ label: 'Proje', value: String(projName) });

    const draft = this._safeStorageJson(sessionStorage, 'offerDraft');
    const cust =
      draft?.customerName ||
      draft?.customer?.name ||
      draft?.clientName;
    if (cust) meta.push({ label: 'Müşteri', value: String(cust) });

    const ctx = this._safeStorageJson(sessionStorage, 'pricingQueueContext');
    if (ctx?.lineDescription || ctx?.label) {
      meta.push({
        label: 'Teklif kalemi',
        value: String(ctx.lineDescription || ctx.label || ''),
      });
    }

    const calc = this._safeStorageJson(localStorage, 'rectifierCalculationResults');
    if (calc && typeof calc === 'object') {
      if (Number.isFinite(calc.transformerPower)) {
        meta.push({
          label: 'Giriş gücü (kVA)',
          value: Number(calc.transformerPower).toFixed(2),
        });
      }
      if (Number.isFinite(calc.inputCurrent)) {
        meta.push({
          label: 'Giriş akımı (A)',
          value: Number(calc.inputCurrent).toFixed(2),
        });
      }
      if (Number.isFinite(calc.floatVoltage)) {
        meta.push({
          label: 'Float gerilimi (V)',
          value: Number(calc.floatVoltage).toFixed(2),
        });
      }
      if (Number.isFinite(calc.boostVoltage)) {
        meta.push({
          label: 'Boost gerilimi (V)',
          value: Number(calc.boostVoltage).toFixed(2),
        });
      }
      if (Number.isFinite(calc.dcChokeInductance)) {
        meta.push({
          label: 'DC şok endüktansı (mH)',
          value: String(calc.dcChokeInductance),
        });
      }
      if (Number.isFinite(calc.dcCapacitorCount)) {
        meta.push({
          label: 'DC kapasitör adedi',
          value: String(calc.dcCapacitorCount),
        });
      }
    }

    const inputs = this._safeStorageJson(localStorage, 'rectifierInputs');
    if (inputs && typeof inputs === 'object') {
      if (Number.isFinite(inputs.outputCurrent)) {
        meta.push({
          label: 'Çıkış akımı (A)',
          value: String(inputs.outputCurrent),
        });
      }
      if (Number.isFinite(inputs.inputVoltage)) {
        meta.push({
          label: 'Giriş gerilimi (V)',
          value: String(inputs.inputVoltage),
        });
      }
      if (inputs.inputPhase != null && inputs.inputPhase !== '') {
        meta.push({ label: 'Faz sayısı', value: String(inputs.inputPhase) });
      }
    }

    return meta;
  }

  /** Satır verileri: sayısal sütunlar Excel formülleri için gerçek sayı */
  buildRectifierExcelTableData() {
    const lineRows = Array.from(this.priceTable?.rows || []).filter((r) =>
      this.isFlexLineItemRow(r)
    );
    const parseNum = (v) => {
      const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const header = [
      'No',
      'Bölüm',
      'Ürün',
      'Açıklama',
      'Maliyet',
      'Adet',
      'Toplam',
      'Margin-2',
      'Toplam-2',
    ];
    const body = lineRows.map((r) => {
      const c = r.cells;
      const qtyRaw = parseInt(String(c[5]?.textContent || '').trim(), 10);
      const qty = Number.isFinite(qtyRaw) ? qtyRaw : 0;
      const marginRaw =
        c[7]?.getAttribute?.('data-value') != null
          ? parseNum(c[7].getAttribute('data-value'))
          : parseNum(c[7]?.textContent);
      return [
        String(c[1]?.textContent?.trim() || ''),
        this.getFlexSectionLabel(r.dataset.sectionId || 'other'),
        c[2]?.textContent?.trim() || '',
        c[3]?.textContent?.trim() || '',
        parseNum(c[4]?.textContent),
        qty,
        parseNum(c[6]?.textContent),
        marginRaw,
        parseNum(c[8]?.textContent),
      ];
    });
    return { header, body, lineRows };
  }

  async exportRectifierOfferExcel() {
    try {
      const { header, body, lineRows } = this.buildRectifierExcelTableData();
      if (!lineRows.length) {
        this.showWarning('Dışa Aktarma', 'Aktarılacak satır bulunamadı.');
        return;
      }

      const data = [header, ...body];
      const metadata = this.buildRectifierExportMetadata();
      const timestamp = Date.now();
      const defaultName = `rectifier-teklif-${timestamp}.xlsx`;

      const excelOptions = {
        preset: 'rectifier-flex',
        sheetName: 'Rectifier Fiyat',
        metadata,
        data,
      };

      if (window.fileAPI?.showSaveDialog && window.excelAPI?.createExcel) {
        const dialogResult = await window.fileAPI.showSaveDialog({
          title: 'Excel dosyasını kaydet',
          defaultPath: defaultName,
          filters: [{ name: 'Excel Dosyası', extensions: ['xlsx'] }],
        });
        if (dialogResult?.canceled) return;
        const filePath =
          typeof dialogResult === 'string'
            ? dialogResult
            : dialogResult?.filePath || null;
        if (filePath) {
          await window.excelAPI.createExcel(filePath, excelOptions);
          this.showSuccess('Dışa Aktarma', 'Excel dosyası kaydedildi.');
          return;
        }
      }

      if (
        typeof window.showSaveFilePicker === 'function' &&
        window.excelAPI?.getExcelBuffer
      ) {
        try {
          const buffer = await window.excelAPI.getExcelBuffer(excelOptions);
          const handle = await window.showSaveFilePicker({
            suggestedName: defaultName,
            types: [
              {
                description: 'Excel',
                accept: {
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
                    '.xlsx',
                  ],
                },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(buffer);
          await writable.close();
          this.showSuccess('Dışa Aktarma', 'Excel dosyası kaydedildi.');
          return;
        } catch (e) {
          if (e?.name === 'AbortError') return;
          throw e;
        }
      }

      if (window.excelAPI?.getExcelBuffer) {
        const buffer = await window.excelAPI.getExcelBuffer(excelOptions);
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        this.showSuccess('Dışa Aktarma', 'Excel dosyası indirildi.');
        return;
      }

      this.showError(
        'Dışa Aktarma',
        'Excel oluşturma bu ortamda kullanılamıyor (excelAPI yok).'
      );
    } catch (error) {
      if (error?.name === 'AbortError') return;
      this.showError(
        'Dışa Aktarma Hatası',
        error.message || 'Excel dışa aktarılamadı.'
      );
    }
  }

  // =================== HESAP AÇIKLAMASI (Pricetable) ===================
  formatExplainMoney(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return '—';
    return `${x.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
  }

  openCalculationExplainModal(row) {
    if (!row) return;
    if (!this.isFlexLineItemRow(row)) return;
    const overlayId = 'rectifierCalcExplainModalOverlay';
    document.getElementById(overlayId)?.remove();
    if (this._calcExplainOnKey) {
      document.removeEventListener('keydown', this._calcExplainOnKey);
      this._calcExplainOnKey = null;
    }

    const parseNum = (v) => {
      const n = parseFloat(String(v || '').replace(/[^\d.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    const title = row.cells?.[2]?.textContent?.trim() || '';
    const category = row.cells?.[3]?.textContent?.trim() || '';

    const unitCost = parseNum(row.cells?.[4]?.textContent);
    const qty = parseNum(row.cells?.[5]?.textContent) || 1;
    const totalCost = parseNum(row.cells?.[6]?.textContent);
    const marginRaw =
      row.cells?.[7]?.getAttribute('data-value') ?? row.cells?.[7]?.textContent ?? '';
    const margin2 = parseNum(marginRaw) || 1.6;
    const total2 = parseNum(row.cells?.[8]?.textContent);
    const costFromParts = Number.isFinite(unitCost * qty) ? unitCost * qty : totalCost;

    let selectedComponent = row._componentData || null;
    if (!selectedComponent) {
      try {
        const index = Number(row.dataset.componentIndex);
        if (Number.isFinite(index) && Array.isArray(this.autoLoadedComponents)) {
          selectedComponent = this.autoLoadedComponents[index] || null;
        }
      } catch (_) {}
    }
    const selectionLogic = selectedComponent?.selectionLogic;
    const technicalRows = Array.isArray(selectionLogic?.steps) ? selectionLogic.steps : [];
    const technicalTitle = selectionLogic?.title || title || 'Parça';

    const stepsHtml = technicalRows.length
      ? technicalRows
          .map((step, i) => {
            const stepKey = step.key || step.label || 'Adım';
            const formula = step.formula || '';
            const value =
              step.value !== undefined && step.value !== null && step.value !== ''
                ? String(step.value)
                : step.detail
                  ? String(step.detail)
                  : '—';
            return `
            <li class="rf-calc-step">
              <span class="rf-calc-step-index" aria-hidden="true">${i + 1}</span>
              <div class="rf-calc-step-body">
                <div class="rf-calc-step-key">${this.escapeHtml(stepKey)}</div>
                ${
                  formula
                    ? `<div class="rf-calc-step-formula">${this.escapeHtml(formula)}</div>`
                    : ''
                }
                <div class="rf-calc-step-value">${this.escapeHtml(value)}</div>
              </div>
            </li>`;
          })
          .join('')
      : `<div class="rf-calc-empty">
          <span class="rf-calc-empty-icon" aria-hidden="true">◇</span>
          <p>Bu satır için kayıtlı teknik seçim adımı yok. Maliyet, tablodaki birim fiyat ve adetten türetilmiştir.</p>
        </div>`;

    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.className = 'rf-calc-explain-overlay';
    overlay.setAttribute('role', 'presentation');

    overlay.innerHTML = `
      <div class="rf-calc-explain-dialog" role="dialog" aria-modal="true" aria-labelledby="rfCalcExplainTitle">
        <header class="rf-calc-explain-header">
          <div class="rf-calc-explain-heading">
            <span class="rf-calc-explain-badge">Özet</span>
            <h2 id="rfCalcExplainTitle" class="rf-calc-explain-title">Nasıl hesaplandı?</h2>
            <p class="rf-calc-explain-subtitle">${this.escapeHtml(title)}${
              category ? ` <span class="rf-calc-explain-dot">·</span> ${this.escapeHtml(category)}` : ''
            }</p>
          </div>
          <button type="button" class="rf-calc-explain-close" id="rectifierCalcExplainCloseBtn" aria-label="Kapat">×</button>
        </header>

        <div class="rf-calc-explain-body">
          <section class="rf-calc-explain-section" aria-labelledby="rfCalcMoneyHeading">
            <div class="rf-calc-section-head">
              <span class="rf-calc-section-icon" aria-hidden="true">$</span>
              <h3 id="rfCalcMoneyHeading" class="rf-calc-section-title">Maliyet ve satış tutarı</h3>
            </div>
            <div class="rf-calc-flow">
              <div class="rf-calc-flow-cards">
                <div class="rf-calc-mini-card">
                  <span class="rf-calc-mini-label">Birim maliyet</span>
                  <span class="rf-calc-mini-value">${this.escapeHtml(this.formatExplainMoney(unitCost))}</span>
                </div>
                <span class="rf-calc-flow-op" aria-hidden="true">×</span>
                <div class="rf-calc-mini-card">
                  <span class="rf-calc-mini-label">Adet</span>
                  <span class="rf-calc-mini-value">${this.escapeHtml(String(qty))}</span>
                </div>
                <span class="rf-calc-flow-op rf-calc-flow-op--eq" aria-hidden="true">=</span>
                <div class="rf-calc-mini-card rf-calc-mini-card--highlight">
                  <span class="rf-calc-mini-label">Maliyet tutarı</span>
                  <span class="rf-calc-mini-value">${this.escapeHtml(this.formatExplainMoney(totalCost))}</span>
                </div>
              </div>
              <p class="rf-calc-flow-caption">
                ${this.escapeHtml(this.formatExplainMoney(unitCost))} × ${this.escapeHtml(String(qty))} = ${this.escapeHtml(this.formatExplainMoney(costFromParts))}
                ${
                  Math.abs(costFromParts - totalCost) > 0.005
                    ? ` <span class="rf-calc-flow-note">(tabloda gösterilen ara toplam: ${this.escapeHtml(this.formatExplainMoney(totalCost))})</span>`
                    : ''
                }
              </p>
              <div class="rf-calc-margin-rail">
                <div class="rf-calc-margin-line">
                  <span class="rf-calc-margin-label">Marj çarpanı</span>
                  <span class="rf-calc-margin-num">${this.escapeHtml(
                    margin2.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  )}</span>
                </div>
                <div class="rf-calc-margin-arrow" aria-hidden="true"></div>
                <div class="rf-calc-mini-card rf-calc-mini-card--total">
                  <span class="rf-calc-mini-label">Toplam tutar (satış)</span>
                  <span class="rf-calc-mini-value">${this.escapeHtml(this.formatExplainMoney(total2))}</span>
                </div>
              </div>
              <p class="rf-calc-flow-caption rf-calc-flow-caption--muted">
                Maliyet tutarı × marj çarpanı = ${this.escapeHtml(this.formatExplainMoney(totalCost))} × ${this.escapeHtml(
                  margin2.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                )} ≈ ${this.escapeHtml(this.formatExplainMoney(total2))}
              </p>
            </div>
          </section>

          <section class="rf-calc-explain-section rf-calc-explain-section--technical" aria-labelledby="rfCalcTechHeading">
            <div class="rf-calc-section-head">
              <span class="rf-calc-section-icon rf-calc-section-icon--tech" aria-hidden="true">⚙</span>
              <h3 id="rfCalcTechHeading" class="rf-calc-section-title">Teknik seçim mantığı</h3>
            </div>
            <p class="rf-calc-tech-lead">${this.escapeHtml(technicalTitle)}</p>
            ${
              technicalRows.length
                ? `<ol class="rf-calc-steps">${stepsHtml}</ol>`
                : stepsHtml
            }
          </section>
        </div>

        <footer class="rf-calc-explain-footer">
          <button type="button" class="rf-calc-explain-btn" id="rectifierCalcExplainOkBtn">Tamam</button>
        </footer>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      if (this._calcExplainOnKey) {
        document.removeEventListener('keydown', this._calcExplainOnKey);
        this._calcExplainOnKey = null;
      }
      document.body.classList.remove('rf-calc-explain-open');
      overlay.remove();
    };

    this._calcExplainOnKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', this._calcExplainOnKey);
    document.body.classList.add('rf-calc-explain-open');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('#rectifierCalcExplainCloseBtn')?.addEventListener('click', close);
    overlay.querySelector('#rectifierCalcExplainOkBtn')?.addEventListener('click', close);

    requestAnimationFrame(() => {
      overlay.querySelector('#rectifierCalcExplainCloseBtn')?.focus();
    });
  }

  // =================== COMBOBOX ===================

  setupCombobox() {
    this.productSearch = document.getElementById('productSearch');
    this.productCombobox = document.getElementById('productCombobox');
    this.productSelect = document.getElementById('productSelect');

    if (!this.productSearch || !this.productCombobox) {
      console.warn(
        'Combobox elementleri bulunamadı - normal select kullanılacak'
      );
      return;
    }

    this.productDropdown = this.productCombobox.querySelector(
      '.search-combobox-dropdown'
    );

    if (!this.productDropdown) {
      console.warn(
        'Product dropdown elementi bulunamadı - normal select kullanılacak'
      );
      return;
    }

    this.productSearch.addEventListener('input', () => this.filterCombobox());
    this.productSearch.addEventListener('focus', () => this.openCombobox());

    const toggleBtn = this.productCombobox.querySelector(
      '.search-combobox-toggle'
    );
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCombobox();
      });
    }

    this.productSearch.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateCombobox(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateCombobox(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectHighlightedItem();
      } else if (e.key === 'Escape') {
        this.closeCombobox();
      }
    });

    document.addEventListener('click', (e) => {
      if (!this.productCombobox.contains(e.target)) {
        this.closeCombobox();
      }
    });
  }

  filterCombobox() {
    if (!this.allProductTypes || !this.productSearch) return;

    const searchValue = this.productSearch.value.toLowerCase();
    const filteredItems = this.allProductTypes.filter(
      (item) => item && item.toLowerCase().includes(searchValue)
    );

    this.renderComboboxItems(filteredItems);
    this.openCombobox();
    this.selectedComboboxIndex = -1;
  }

  renderComboboxItems(items) {
    if (!this.productDropdown) return;

    this.productDropdown.innerHTML = '';
    this.comboboxItems = items;
    this.selectedComboboxIndex = -1;

    if (items.length === 0) {
      this.productDropdown.innerHTML = `
        <div class="search-combobox-no-results">Sonuç bulunamadı</div>
      `;
    } else {
      items.forEach((item) => {
        const div = document.createElement('div');
        div.textContent = item;
        div.classList.add('search-combobox-item');
        div.setAttribute('data-value', item);

        div.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectComboboxItem(item);
        });

        div.addEventListener('mouseover', () => {
          this.clearHighlightedItems();
          div.classList.add('highlighted');
        });

        this.productDropdown.appendChild(div);
      });
    }
  }

  navigateCombobox(step) {
    if (!this.productDropdown) return;

    const items = this.productDropdown.querySelectorAll(
      '.search-combobox-item'
    );
    if (items.length === 0) return;

    this.clearHighlightedItems();

    this.selectedComboboxIndex += step;
    if (this.selectedComboboxIndex < 0)
      this.selectedComboboxIndex = items.length - 1;
    if (this.selectedComboboxIndex >= items.length)
      this.selectedComboboxIndex = 0;

    const selectedItem = items[this.selectedComboboxIndex];
    selectedItem.classList.add('highlighted');
    selectedItem.scrollIntoView({ block: 'nearest' });
  }

  clearHighlightedItems() {
    if (!this.productDropdown) return;
    this.productDropdown.querySelectorAll('.highlighted').forEach((item) => {
      item.classList.remove('highlighted');
    });
  }

  selectHighlightedItem() {
    if (!this.productDropdown) return;
    const highlighted = this.productDropdown.querySelector('.highlighted');
    if (highlighted) {
      const value = highlighted.getAttribute('data-value');
      this.selectComboboxItem(value);
    }
  }

  selectComboboxItem(value) {
    if (this.productSearch) {
      this.productSearch.value = value;
    }
    if (this.productSelect) {
      this.productSelect.value = value;
    }
    this.closeCombobox();
    this.updateSubtypes(value);
  }

  toggleCombobox() {
    if (this.comboboxOpen) {
      this.closeCombobox();
    } else {
      this.openCombobox();
    }
  }

  openCombobox() {
    if (!this.productDropdown) return;

    if (!this.comboboxOpen) {
      this.comboboxOpen = true;
      this.productDropdown.classList.add('open');

      if (
        this.productSearch &&
        !this.productSearch.value &&
        this.allProductTypes
      ) {
        this.renderComboboxItems(this.allProductTypes);
      }
    }
  }

  closeCombobox() {
    if (!this.productDropdown) return;
    this.comboboxOpen = false;
    this.productDropdown.classList.remove('open');
    this.selectedComboboxIndex = -1;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.rectifierFlexibleApp = new RectifierFlexiblePricing();
});


