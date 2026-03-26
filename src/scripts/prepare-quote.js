// Bu dosya, "Teklif Sepetini" yönetir.
class QuoteCart {
  constructor() {
    this.cartTable = document.getElementById('cartTable');
    this.emptyState = document.getElementById('emptyState');
    this.cartContent = document.getElementById('cartContent');
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.cartItems = [];
    this.modalOverlay = document.getElementById('quoteDetailsModalOverlay');
    this.modal = document.getElementById('quoteDetailsModal');
    this.setupEventListeners();
    this.setupWindowControls();
    this.initializeNotifications();
    this.loadCart();
  }

  initializeNotifications() {
    if (!document.querySelector('.notification-container')) {
      const container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
  }

  showNotification(type, title, message = '', duration = 5000) {
    const container = document.querySelector('.notification-container');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
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
    const hide = () => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 400);
    };
    closeBtn.onclick = hide;
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    if (duration > 0) {
      const progressBar = notification.querySelector('.notification-progress');
      progressBar.style.transitionDuration = `${duration}ms`;
      setTimeout(() => (progressBar.style.width = '0%'), 200);
      setTimeout(hide, duration);
    }
    return { hide };
  }

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

  setupEventListeners() {
    document
      .getElementById('clearCartBtn')
      .addEventListener('click', () => this.clearCart());
    document
      .getElementById('generateHtmlQuoteBtn')
      .addEventListener('click', () => this.openQuoteDetailsModal());

    // Modal kapatma olayları
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) {
          this.closeQuoteDetailsModal();
        }
      });
    }
    document
      .getElementById('modalCloseBtn')
      ?.addEventListener('click', () => this.closeQuoteDetailsModal());
    document
      .getElementById('modalCancelBtn')
      ?.addEventListener('click', () => this.closeQuoteDetailsModal());
    document
      .getElementById('modalSubmitBtn')
      ?.addEventListener('click', () => this.submitAndGenerateHtmlQuote());
  }

  setupWindowControls() {
    const minimizeBtn = document.querySelector('.window-button.minimize');
    const closeBtn = document.querySelector('.window-button.close');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        window.api.send('minimize-window');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.api.send('close-window');
      });
    }
  }

  async loadCart() {
    try {
      this.cartItems = await window.api.invoke('get-cart-contents');
      this.renderCart();
    } catch (error) {
      console.error('Sepet yüklenirken hata:', error);
      this.cartItems = [];
      this.renderCart();
    }
  }

  renderCart() {
    // Sepet boşsa empty state göster
    if (!this.cartItems || this.cartItems.length === 0) {
      this.emptyState.style.display = 'block';
      this.cartTable.style.display = 'none';
      return;
    }

    // Sepet doluysa tabloyu göster
    this.emptyState.style.display = 'none';
    this.cartTable.style.display = 'table';

    // Tablo içeriğini temizle
    const tbody = this.cartTable.querySelector('tbody');
    tbody.innerHTML = '';

    // Her sistem için satır oluştur
    this.cartItems.forEach((system, index) => {
      const totalMargin2 = system.items.reduce(
        (sum, item) => sum + item.total2,
        0
      );
      const systemTotal = totalMargin2 * system.quantity;

      const row = tbody.insertRow();
      row.innerHTML = `
                <td style="text-align: center; font-weight: 600;">${system.quantity}</td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <strong style="color: var(--text); font-size: 14px;">${system.name}</strong>
                        <small style="color: var(--text-secondary); font-size: 12px;">
                            ${system.items.length} adet bileşen
                        </small>
                    </div>
                </td>
                <td style="text-align: right; font-weight: 600; color: var(--blue-accent);">
                    ${systemTotal.toFixed(2)} $
                </td>
                <td style="text-align: center;">
                    <button class="delete-item-btn" data-index="${index}" 
                            style="background: #dc3545; color: white; border: none; 
                                   padding: 6px 12px; border-radius: 4px; cursor: pointer;
                                   font-size: 12px; transition: all 0.2s ease;"
                            title="Sistemi Sil">
                        🗑️ Sil
                    </button>
                </td>
            `;

      // Hover efekti ekle
      row.style.transition = 'background-color 0.2s ease';
      row.addEventListener('mouseenter', () => {
        row.style.backgroundColor = 'var(--bg-tertiary)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.backgroundColor = '';
      });
    });

    // Toplam satırı ekle
    this.addTotalRow(tbody);

    // Silme butonlarına event listener ekle
    document.querySelectorAll('.delete-item-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeCartItem(parseInt(e.target.dataset.index));
      });

      // Buton hover efekti
      btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = '#c82333';
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = '#dc3545';
        btn.style.transform = 'scale(1)';
      });
    });
  }

  addTotalRow(tbody) {
    const grandTotal = this.cartItems.reduce((sum, system) => {
      const systemTotal = system.items.reduce(
        (itemSum, item) => itemSum + item.total2,
        0
      );
      return sum + systemTotal * system.quantity;
    }, 0);

    const totalRow = tbody.insertRow();
    totalRow.style.backgroundColor = 'var(--bg-tertiary)';
    totalRow.style.borderTop = '2px solid var(--border)';
    totalRow.innerHTML = `
            <td style="font-weight: bold; color: var(--text);">${this.cartItems.length}</td>
            <td style="font-weight: bold; color: var(--text);">
                TOPLAM (${this.cartItems.reduce((sum, system) => sum + system.quantity, 0)} sistem)
            </td>
            <td style="text-align: right; font-weight: bold; color: var(--blue-accent); font-size: 16px;">
                ${grandTotal.toFixed(2)} $
            </td>
            <td></td>
        `;
  }

  async removeCartItem(index) {
    // Confirm yerine daha modern bir custom modal kullanılabilir, şimdilik alert kalabilir
    if (confirm('Bu sistemi sepetten çıkarmak istediğinizden emin misiniz?')) {
      try {
        await window.api.send('remove-from-cart', index);
        this.showSuccess('Başarılı', 'Sistem sepetten kaldırıldı.');
        this.loadCart(); // Sepeti yeniden yükle ve render et
      } catch (error) {
        console.error('Sistem silinirken hata:', error);
        this.showError('Hata', 'Sistem silinirken bir hata oluştu.');
      }
    }
  }

  async clearCart(confirmAction = true) {
    let confirmed = !confirmAction;
    if (confirmAction) {
      confirmed = confirm(
        'Tüm teklif sepetini temizlemek istediğinizden emin misiniz?'
      );
    }

    if (confirmed) {
      try {
        await window.api.send('clear-cart');
        this.showSuccess('Başarılı', 'Teklif sepeti temizlendi.');
        this.loadCart();
      } catch (error) {
        console.error('Sepet temizlenirken hata:', error);
        this.showError('Hata', 'Sepet temizlenirken bir hata oluştu.');
      }
    }
  }

  openQuoteDetailsModal() {
    if (this.cartItems.length === 0) {
      this.showWarning(
        'Sepet Boş',
        'Lütfen teklif oluşturmak için önce sepete ürün ekleyin.'
      );
      return;
    }

    const date = new Date();
    let quoteNumber = `EPC-Q-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`;
    try {
      const ctx = JSON.parse(
        sessionStorage.getItem('quoteProjectContext') || 'null'
      );
      if (ctx?.quoteNumber) quoteNumber = ctx.quoteNumber;
      if (ctx?.customerName) {
        document.getElementById('customerNameInput').value = ctx.customerName;
      }
      const cur = ctx?.currency;
      if (cur === 'USD') document.getElementById('currencyInput').value = '$';
      if (cur === 'EUR') document.getElementById('currencyInput').value = '€';
      if (cur === 'TRY') document.getElementById('currencyInput').value = '₺';
    } catch (_) {}
    document.getElementById('quoteNumberInput').value = quoteNumber;
    document.getElementById('quoteDateInput').valueAsDate = date;
    document.getElementById('preparedByInput').value =
      this.currentUser?.fullName || 'Bilinmiyor';

    if (this.modalOverlay && this.modal) {
      this.modalOverlay.style.display = 'flex';
      setTimeout(() => {
        this.modalOverlay.classList.add('active');
        this.modal.classList.add('active');
      }, 10);
    }
  }

  closeQuoteDetailsModal() {
    if (this.modalOverlay && this.modal) {
      this.modalOverlay.classList.remove('active');
      this.modal.classList.remove('active');
      setTimeout(() => {
        this.modalOverlay.style.display = 'none';
      }, 300); // Transition süresiyle eşleşmeli
    }
  }

  async submitAndGenerateHtmlQuote() {
    const grandTotal = this.cartItems.reduce((sum, system) => {
      const systemTotal = system.items.reduce(
        (itemSum, item) => itemSum + item.total2,
        0
      );
      return sum + systemTotal * system.quantity;
    }, 0);

    const quoteData = {
      cart: this.cartItems,
      customer: {
        name: document.getElementById('customerNameInput').value.trim(),
        contact: document.getElementById('contactPersonInput').value.trim(),
      },
      quote: {
        number: document.getElementById('quoteNumberInput').value,
        date: new Date(
          document.getElementById('quoteDateInput').value
        ).toLocaleDateString('tr-TR'),
        preparedBy: this.currentUser?.fullName || 'Bilinmiyor',
        currency: document.getElementById('currencyInput').value,
        language: document.getElementById('languageInput').value,
        incoterms: document.getElementById('incotermsInput').value,
        deliveryTime: document.getElementById('deliveryTimeInput').value,
        paymentCondition: document.getElementById('paymentConditionInput')
          .value,
        validity: document.getElementById('validityPeriodInput').value,
        origin: document.getElementById('originInput').value,
        packing: document.getElementById('packingTypeInput').value,
        total_price: grandTotal,
        pdfPassword: document.getElementById('pdfPasswordInput').value, // Yeni şifre alanı
      },
    };

    const customerNameInput = document.getElementById('customerNameInput');
    if (!quoteData.customer.name) {
      this.showError('Giriş Eksik', 'Lütfen Müşteri Firma Adı giriniz.');
      customerNameInput.focus();
      customerNameInput.style.borderColor = 'red';
      setTimeout(() => (customerNameInput.style.borderColor = ''), 3000);
      return;
    }

    try {
      this.showInfo('İşleniyor...', 'Teklif kaydediliyor ve oluşturuluyor...');
      // 1. Teklifi veritabanına kaydet
      const saveResult = await window.api.invoke('save-quote-to-db', quoteData);

      if (saveResult.success) {
        console.log(
          'Teklif başarıyla veritabanına kaydedildi. ID:',
          saveResult.quoteId
        );

        if (
          window.WEB_MODE &&
          saveResult.quoteId &&
          window.httpAPI &&
          typeof window.httpAPI.post === 'function'
        ) {
          try {
            let costingMeta = {};
            try {
              costingMeta = JSON.parse(
                sessionStorage.getItem('epcCostingGrid') || '{}'
              );
            } catch (_) {}
            await window.httpAPI.post('/api/quote-documents', {
              quoteId: saveResult.quoteId,
              docType: 'pre_approval_prepare',
              filePath: `web:prepare-quote/${saveResult.quoteId}`,
              meta: {
                quoteNumber: quoteData.quote?.number,
                costingGrid: costingMeta,
                savedAt: new Date().toISOString(),
              },
            });
          } catch (docErr) {
            console.warn('Belge meta kaydı atlandı:', docErr);
          }
        }

        if (!window.WEB_MODE && window.api?.send) {
          await window.api.send('generate-html-quote', quoteData);
        }
        this.closeQuoteDetailsModal();

        try {
          sessionStorage.removeItem('quoteProjectContext');
        } catch (_) {}

        // 3. Sepeti temizle
        await this.clearCart(false); // Kullanıcıya sormadan temizle

        this.showSuccess(
          'Başarılı!',
          'Teklif kaydedildi ve yeni pencerede açıldı.'
        );
      } else {
        throw new Error(
          saveResult.error || 'Bilinmeyen bir veritabanı hatası oluştu.'
        );
      }
    } catch (error) {
      console.error('Teklif kaydetme veya oluşturma hatası:', error);
      this.showError('Hata Oluştu', `Bir hata oluştu: ${error.message}`);
    }
  }
}

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
  new QuoteCart();
});
