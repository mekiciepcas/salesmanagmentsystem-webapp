/**
 * EPC Web API Client
 * Electron IPC yerine fetch() kullanır. Tarayıcıda çalışır.
 * Electron'da preload.js zaten window.api tanımlar - bu script sadece web modunda çalışır.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.api && window.app) return;
  var API_BASE = window.location.origin;
  async function parseResponsePayload(res) {
    var ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.indexOf('application/json') !== -1) {
      return await res.json();
    }
    var txt = await res.text();
    return { success: false, error: txt || res.statusText };
  }

  function authHeaders() {
    var t = localStorage.getItem('authToken');
    var h = { 'Content-Type': 'application/json' };
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }

  window.fileAPI = {
    showSaveDialog: async function () {
      return { canceled: false, filePath: null };
    },
  };

  window.excelAPI = {
    getData: async function () {
      throw new Error('Web modunda excelAPI.getData kullanılamaz.');
    },
    getExcelBuffer: async function (options) {
      var res = await fetch(API_BASE + '/api/excel/export-workbook', {
        method: 'POST',
        headers: Object.assign({}, authHeaders(), {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(options),
      });
      if (!res.ok) {
        var msg = res.statusText;
        try {
          var j = await res.json();
          if (j.error) msg = j.error;
        } catch (_) {
          try {
            msg = await res.text();
          } catch (_) {}
        }
        throw new Error(msg || 'Excel oluşturulamadı');
      }
      return new Uint8Array(await res.arrayBuffer());
    },
    createExcel: async function (filePath, options) {
      var buf = await this.getExcelBuffer(options);
      var blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var name =
        (typeof filePath === 'string' && filePath.split(/[/\\\\]/).pop()) ||
        'fiyat-listesi.xlsx';
      a.download = /\.xlsx$/i.test(name) ? name : name + '.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  };

  window.httpAPI = {
    authHeaders: authHeaders,
    get: async function (url) {
      var fullUrl = url.startsWith('http') ? url : API_BASE + url;
      var res = await fetch(fullUrl, { headers: authHeaders() });
      var payload = await parseResponsePayload(res);
      if (!res.ok) throw new Error(payload.error || res.statusText);
      return payload;
    },
    post: async function (url, data) {
      var fullUrl = url.startsWith('http') ? url : API_BASE + url;
      var res = await fetch(fullUrl, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      var result = await parseResponsePayload(res);
      if (!res.ok) throw new Error(result.error || res.statusText);
      return result;
    },
  };

  var webAPI = {
  async readExcel(type) {
    const res = await fetch(`${API_BASE}/api/excel/${encodeURIComponent(type)}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Excel okunamadı');
    return res.json();
  },

  async readRectifierComponent(componentType) {
    const res = await fetch(
      `${API_BASE}/api/excel/rectifier/${encodeURIComponent(componentType)}`
    );
    if (!res.ok) throw new Error((await res.json()).error || 'Component okunamadı');
    return res.json();
  },

  async getProductTypes() {
    const res = await fetch(`${API_BASE}/api/excel/product-types`);
    if (!res.ok) throw new Error('Ürün tipleri alınamadı');
    const data = await res.json();
    return data;
  },

  async getSubtypes(productType) {
    const res = await fetch(
      `${API_BASE}/api/excel/subtypes/${encodeURIComponent(productType)}`
    );
    if (!res.ok) throw new Error('Alt tipler alınamadı');
    return res.json();
  },

  async getCartContents() {
    const res = await fetch(`${API_BASE}/api/cart`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async addToCart(item) {
    const res = await fetch(`${API_BASE}/api/cart`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (data.success) return data.count;
    throw new Error(data.error || 'Sepete eklenemedi');
  },

  async removeFromCart(index) {
    const res = await fetch(`${API_BASE}/api/cart/${index}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    return data.count;
  },

  async clearCart() {
    const res = await fetch(`${API_BASE}/api/cart`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return (await res.json()).count;
  },

  async offerDraftSet(draft) {
    return window.httpAPI.post('/api/web/offer-draft', draft);
  },

  async offerDraftGet() {
    return window.httpAPI.get('/api/web/offer-draft');
  },

  async offerDraftClear() {
    await fetch(`${API_BASE}/api/web/offer-draft`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return { success: true };
  },

  async pricingQueueBuildFromDraft() {
    return window.httpAPI.post('/api/web/pricing-queue/build', {});
  },

  async pricingQueueGet() {
    return window.httpAPI.get('/api/web/pricing-queue');
  },

  async pricingQueueAdvance() {
    return window.httpAPI.post('/api/web/pricing-queue/advance', {});
  },

  async getExchangeRates() {
    try {
      const res = await fetch(`${API_BASE}/api/exchange-rates`);
      return await res.json();
    } catch (_) {
      return { success: false };
    }
  },

  signOut() {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('epcRegistrationUnlocked');
    } catch (_) {}
    return Promise.resolve({ success: true });
  },

  navigateToMain() {
    window.location.href = '/pages/login.html';
  },

  onUpdateAvailable() {},
  onDownloadProgress() {},
  onUpdateDownloaded() {},
  onUpdateError() {},
  quitAndInstall() {},

  async findComponentsFromConfig(specs) {
    const res = await fetch(`${API_BASE}/api/components/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(specs),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data;
  },

  showSaveDialog() {
    return Promise.resolve({ canceled: true, filePath: null });
  },

  showOpenDialog() {
    return Promise.resolve({ canceled: true, filePaths: [] });
  },

  send(channel, data) {
    if (channel === 'print-to-pdf') {
      console.warn('Web modunda PDF indirme: /api/pdf/quote endpoint kullanılmalı');
    }
  },

  invoke(channel, data) {
    const handlers = {
      'read-excel': () => this.readExcel(data),
      'read-rectifier-component': () => this.readRectifierComponent(data),
      'get-product-types': () => this.getProductTypes(),
      'get-subtypes': () => this.getSubtypes(data),
      'get-cart-contents': () => this.getCartContents(),
      'find-components-from-central-config': () =>
        this.findComponentsFromConfig(data),
      'show-save-dialog': () => this.showSaveDialog(data),
      'show-open-dialog': () => this.showOpenDialog(data),
      'db:getAllCustomers': async () => {
        const r = await fetch(`${API_BASE}/api/customers?limit=500`, {
          headers: authHeaders(),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Müşteriler alınamadı');
        return { success: true, data: j.data || j.rows || j };
      },
      'save-quote-to-db': async (quoteData) =>
        window.httpAPI.post('/api/quotes/save-prepare', quoteData),
    };
    const fn = handlers[channel];
    if (fn) return fn();
    return Promise.reject(new Error(`Bilinmeyen channel: ${channel}`));
  },

  on(channel, callback) {
    if (channel === 'cart-updated') {
      window.addEventListener('cart-updated', (e) => callback(e.detail));
    }
  },
};

  var webApp = {
  minimize: () => {},
  close: () => {},
  navigate: (page) => {
    window.location.href = `/pages/${page}`;
  },
};

  window.api = webAPI;
  window.app = webApp;
  window.WEB_MODE = true;

  if (document.body) {
    document.body.classList.add('web-mode');
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.classList.add('web-mode');
    });
  }
})();
