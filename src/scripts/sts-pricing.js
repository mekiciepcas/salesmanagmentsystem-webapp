class StsPricing {
  constructor() {
    // Excel yolu
    this.excelPath =
      '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/STS.xlsx';

    // UI elementleri
    this.productSelect = document.getElementById('productSelect');
    this.subtypeSelect = document.getElementById('subtypeSelect');
    this.quantityInput = document.getElementById('quantityInput');
    this.priceTable = document.getElementById('priceTable');

    // Event listener'ları ekle
    this.setupEventListeners();
    this.setupMenubar();
    this.setupWindowControls();

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
  }

  // =================== MODERN NOTIFICATION SYSTEM ===================

  initializeNotifications() {
    // Notification container oluştur
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

    // Icon mapping
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    // Notification element oluştur
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

    // Close button event
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    // Container'a ekle
    container.appendChild(notification);

    // Show animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Progress bar animation
    if (duration > 0) {
      const progressBar = notification.querySelector('.notification-progress');
      progressBar.style.width = '100%';
      progressBar.style.transitionDuration = `${duration}ms`;

      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 200);

      // Auto hide
      setTimeout(() => {
        this.hideNotification(notification);
      }, duration);
    }

    return notification;
  }

  hideNotification(notification) {
    notification.classList.add('hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 400);
  }

  // Modern alert replacement
  showAlert(type, title, message = '') {
    return this.showNotification(type, title, message, 0); // No auto hide
  }

  // Specific notification types
  showSuccess(title, message = '') {
    return this.showNotification('success', title, message);
  }

  showError(title, message = '') {
    return this.showNotification('error', title, message, 8000);
  }

  showWarning(title, message = '') {
    return this.showNotification('warning', title, message, 6000);
  }

  showInfo(title, message = '') {
    return this.showNotification('info', title, message);
  }

  // Form validation with visual feedback
  validateInput(input, isValid, errorMessage = '') {
    if (isValid) {
      input.classList.remove('input-error');
      input.classList.add('input-success');
    } else {
      input.classList.remove('input-success');
      input.classList.add('input-error');
      if (errorMessage) {
        this.showError('Girdi Hatası', errorMessage);
      }
    }

    // Clear validation classes after a delay
    setTimeout(() => {
      input.classList.remove('input-error', 'input-success');
    }, 3000);
  }

  // =================== MODIFIED METHODS ===================

  setupEventListeners() {
    document
      .getElementById('addButton')
      .addEventListener('click', () => this.addProductToTable());
    document
      .getElementById('addToQuoteBtn')
      .addEventListener('click', () => this.addToQuote());

    // Diğer butonlar
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

    // Panel butonları
    document
      .getElementById('batteryCalcBtn')
      .addEventListener('click', () => this.openPanel('batteryCalcPanel'));

    // Panel kapatma butonları
    document.querySelectorAll('.panel-close-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.calculator-panel').classList.remove('active');
      });
    });

    // Product select için event listener
    if (this.productSelect) {
      this.productSelect.addEventListener('change', (e) => {
        this.updateSubtypes(e.target.value);
      });
    }
  }

  openPanel(panelId) {
    document
      .querySelectorAll('.calculator-panel')
      .forEach((p) => p.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    this.closeAllMenus();
  }

  // =================== CALCULATOR FUNCTIONS ===================

  initializeCalculators() {
    // Panel fonksiyonlarını kapat
    const closeAllPanels = () => {
      document.querySelectorAll('.calculator-panel').forEach((panel) => {
        panel.classList.remove('active');
      });
    };

    // Panel kapatma butonları
    document.querySelectorAll('.panel-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.calculator-panel');
        if (panel) {
          panel.classList.remove('active');
        }
      });
    });

    // ESC tuşuna basıldığında açık paneli kapat
    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        document.querySelector('.calculator-panel.active')
      ) {
        closeAllPanels();
      }
    });

    // Batarya hesaplama
    const batteryCalcBtn = document.getElementById('calculateBattery');
    if (batteryCalcBtn) {
      batteryCalcBtn.addEventListener('click', () => {
        const inputs = {
          power: parseFloat(document.getElementById('powerInput').value),
          batteryCount: parseFloat(
            document.getElementById('batteryCount').value
          ),
          cellCount: parseFloat(document.getElementById('cellCount').value),
          stringCount: parseFloat(document.getElementById('stringCount').value),
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

    // Excel butonları
    const excelBtn = document.getElementById('openExcelPath');
    if (excelBtn) {
      excelBtn.addEventListener('click', () => {
        const excelPath =
          '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data\\Hesaplamalar\\Dropper Calculation_draft_rev01.xlsx';
        window.api.openFile(excelPath);
      });
    }

    const batteryExcelBtn = document.getElementById('openBatteryExcelPath');
    if (batteryExcelBtn) {
      batteryExcelBtn.addEventListener('click', () => {
        const excelPath =
          '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data\\Hesaplamalar\\Battery Selection Guide.xlsx';
        window.api.openFile(excelPath);
      });
    }
  }

  calculateBattery(inputs) {
    // Tüm değerlerin var olduğunu kontrol et
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

    // Hesaplama
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

    // Sonuçları kontrol et
    if (isNaN(wBlock) || isNaN(wCell)) {
      throw new Error('Geçersiz hesaplama sonucu');
    }

    return {
      wBlock,
      wCell,
    };
  }

  async loadExcelData() {
    try {
      this.showInfo('Veri Yükleniyor', 'Excel verileri yükleniyor...');

      const data = await window.api.readExcel('STS');
      if (!data || data.length === 0)
        throw new Error('STS için Excel verisi boş veya hatalı.');

      this.currentProductData = data;
      this.allProductTypes = [
        ...new Set(data.map((row) => row['Product Type'])),
      ].filter(Boolean);

      // Combobox varsa kullan, yoksa normal select'i güncelle
      if (this.productDropdown) {
        this.renderComboboxItems(this.allProductTypes);
      } else if (this.productSelect) {
        // Normal select için seçenekleri güncelle
        this.productSelect.innerHTML =
          '<option value="">Ürün Seçin</option>' +
          this.allProductTypes
            .map((type) => `<option value="${type}">${type}</option>`)
            .join('');
      }

      this.showSuccess(
        'Veri Yüklendi',
        `${data.length} adet ürün verisi başarıyla yüklendi.`
      );
    } catch (error) {
      console.error('Excel yükleme hatası:', error);
      this.showError('Veri Yükleme Hatası', error.message);
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
    const subtypeSelect = document.getElementById('subtypeSelect');

    if (subtypes.length > 0) {
      subtypeSelect.innerHTML = `<option value="">Alt Tip Seçin</option>${subtypes.map((sub) => `<option value="${sub.subtype}" data-cost="${sub.cost}">${sub.subtype}</option>`).join('')}`;
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

  addProductToTable() {
    const selectedProduct = document.getElementById('productSelect').value;
    if (!selectedProduct) {
      this.showWarning('Ürün Seçimi', 'Lütfen bir ürün seçin.');
      return;
    }

    const hasSubtypes = !document.getElementById('subtypeSelect').disabled;
    const selectedSubtype = document.getElementById('subtypeSelect').value;
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

    const quantity =
      parseInt(document.getElementById('quantityInput').value) || 1;
    const cost = this.currentCost;
    if (!cost || isNaN(cost)) {
      this.showError('Fiyat Hatası', 'Ürün fiyatı belirlenemedi.');
      return;
    }

    const totalCost = cost * quantity;
    const margin2Total = totalCost * 1.6;
    const row = this.priceTable.insertRow();

    row.dataset.mainTitle = productData.MainTitle || '';
    row.dataset.model = productData.Model || selectedSubtype || selectedProduct;
    row.dataset.description =
      productData.Description || productData.description || ''; // Büyük/küçük harf duyarlılığını gider
    row.dataset.inputVoltage = productData.InputVoltage || '';
    row.dataset.output = productData.Output || '';
    row.dataset.technology = productData.Technology || '';
    row.dataset.features = productData.Features || '';
    row.dataset.dimensions = productData.Dimensions || '';
    row.dataset.includes = productData.Includes || '';

    row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td><td>${this.priceTable.rows.length}</td>
            <td>${selectedProduct}${hasSubtypes ? ` - ${selectedSubtype}` : ''}</td>
            <td>${cost.toFixed(2)}$</td><td>${quantity}</td><td>${totalCost.toFixed(2)}$</td>
            <td class="margin-cell" data-value="1.6">1.6</td>
            <td>${margin2Total.toFixed(2)}$</td>
        `;

    const checkbox = row.querySelector('.row-checkbox');
    // Checkbox'a direkt tıklanırsa, olayın satıra yayılmasını engelle
    checkbox.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    // Checkbox durumu değiştiğinde satırın stilini güncelle
    checkbox.addEventListener('change', () => {
      row.classList.toggle('row-selected', checkbox.checked);
    });

    // Satırın herhangi bir yerine tıklandığında checkbox'ı tetikle
    row.addEventListener('click', () => {
      checkbox.click();
    });

    this.setupMarginCellListeners(row.cells[6]);
    this.updateTotals();
  }

  addToQuote() {
    const items = this.getLocalItems();
    if (items.length === 0) {
      this.showWarning(
        'Liste Boş',
        'Teklife eklemek için önce ürün listesi oluşturun.'
      );
      return;
    }

    const systemName =
      document.getElementById('systemNameInput').value || 'STS System';
    const systemQuantity =
      parseInt(document.getElementById('systemQuantityInput').value) || 1;
    const systemPackage = {
      name: systemName,
      quantity: systemQuantity,
      items: items,
      productType: 'STS',
    };

    window.api.send('add-to-cart', systemPackage);
    if (typeof window.onAddToCartProjectQueueHook === 'function') {
      void window.onAddToCartProjectQueueHook();
    }
    this.showSuccess(
      'Teklife Eklendi!',
      `'${systemName}' (x${systemQuantity}) başarıyla teklife eklendi!`
    );

    this.priceTable.innerHTML = '';
    this.updateTotals();
  }

  getLocalItems() {
    return Array.from(this.priceTable.rows)
      .filter((row) => !row.classList.contains('total-row'))
      .map((row) => {
        const cells = row.cells;
        return {
          product_name: cells[2].textContent.trim(),
          unit_price: parseFloat(cells[3].textContent.replace(/[^\d.-]/g, '')),
          quantity: parseInt(cells[4].textContent),
          total_price: parseFloat(cells[5].textContent.replace(/[^\d.-]/g, '')),
          margin2: parseFloat(cells[6].textContent),
          total2: parseFloat(cells[7].textContent.replace(/[^\d.-]/g, '')),
          mainTitle: row.dataset.mainTitle || '',
          model: row.dataset.model || '',
          description: row.dataset.description || '', // Öncelikli olarak data-description'ı kullan
          inputVoltage: row.dataset.inputVoltage || '',
          output: row.dataset.output || '',
          technology: row.dataset.technology || '',
          features: row.dataset.features || '',
          dimensions: row.dataset.dimensions || '',
          includes: row.dataset.includes || '',
        };
      });
  }

  // --- Helper Functions (Combobox, Table, UI) ---
  setupMenubar() {
    const setupMenu = (btnId, menuId) => {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      if (btn)
        btn.onclick = (e) => {
          e.stopPropagation();
          this.toggleMenu(menu);
        };
    };
    setupMenu('fileMenuBtn', 'fileMenu');
    setupMenu('toolsMenuBtn', 'toolsMenu');
    document.addEventListener('click', () => this.closeAllMenus());
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
    document.querySelector('.window-button.minimize').onclick = () =>
      window.app.minimize();
    document.querySelector('.window-button.close').onclick = () =>
      window.app.close();
  }

  // =================== COMBOBOX FUNCTIONS ===================

  setupCombobox() {
    // Combobox elementlerini kontrol et
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

    // Event listeners
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

    // Klavye navigasyonu
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

    // Dışarı tıklama
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

      // Eğer input boşsa ve ürün tipleri yüklendiyse, tüm listeyi göster
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

  // =================== UTILITY FUNCTIONS ===================

  addManualRow() {
    const row = this.priceTable.insertRow();
    row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox"></td><td>${this.priceTable.rows.length}</td>
            <td class="editable-cell" contenteditable="true">Manuel Ürün</td>
            <td class="editable-cell" contenteditable="true">0.00</td>
            <td class="editable-cell" contenteditable="true">1</td><td>0.00</td>
            <td class="margin-cell" data-value="1.6">1.6</td>
            <td>0.00</td>
        `;

    const checkbox = row.querySelector('.row-checkbox');
    checkbox.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    checkbox.addEventListener('change', () => {
      row.classList.toggle('row-selected', checkbox.checked);
    });

    row.addEventListener('click', () => {
      checkbox.click();
    });

    const cells = row.cells;
    [2, 3, 4].forEach((cellIndex) => {
      cells[cellIndex].addEventListener('blur', () =>
        this.calculateRowTotals(row)
      );
    });
    this.setupMarginCellListeners(row.cells[6]);
    this.calculateRowTotals(row);
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
    const cost = parseFloat(cells[3].textContent.replace(/[^\d.-]/g, '')) || 0;
    const quantity = parseInt(cells[4].textContent) || 1;
    const margin2 = parseFloat(cells[6].getAttribute('data-value')) || 1.6;
    const total = cost * quantity;
    cells[5].textContent = total.toFixed(2) + '$';
    cells[7].textContent = (total * margin2).toFixed(2) + '$';
    this.updateTotals();
  }

  updateTotals() {
    if (!this.showingTotals) return;
    let totalCost = 0,
      totalMargin2 = 0;
    Array.from(this.priceTable.rows)
      .filter((row) => !row.classList.contains('total-row'))
      .forEach((row) => {
        totalCost += parseFloat(
          row.cells[5]?.textContent?.replace('$', '') || 0
        );
        totalMargin2 += parseFloat(
          row.cells[7]?.textContent?.replace('$', '') || 0
        );
      });
    let totalRow = this.priceTable.querySelector('.total-row');
    if (!totalRow) {
      totalRow = this.priceTable.insertRow();
      totalRow.className = 'total-row';
    }
    totalRow.innerHTML = `
            <td></td><td colspan="4"><strong>TOPLAM</strong></td><td><strong>${totalCost.toFixed(2)}$</strong></td>
            <td></td><td><strong>${totalMargin2.toFixed(2)}$</strong></td>
        `;
  }

  deleteSelectedRows() {
    this.priceTable
      .querySelectorAll('input[type="checkbox"]:checked')
      .forEach((cb) => cb.closest('tr').remove());
    this.updateTotals();
    this.renumberRows();
  }

  renumberRows() {
    Array.from(this.priceTable.rows).forEach((row, index) => {
      if (!row.classList.contains('total-row'))
        row.cells[1].textContent = index + 1;
    });
  }

  toggleTotals() {
    this.showingTotals = !this.showingTotals;
    const totalRow = this.priceTable.querySelector('.total-row');
    if (totalRow) totalRow.remove();
    if (this.showingTotals) this.updateTotals();
  }
}

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
  window.stsApp = new StsPricing();
});
