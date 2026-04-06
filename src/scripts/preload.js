const { contextBridge, ipcRenderer } = require('electron');
const { buildPricingExcelWorkbook } = require('./excel/buildPricingExcelWorkbook');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs-extra');
const { shell } = require('electron');

// Debug için
console.log('Preload script starting...');

// Pencere kontrolleri ve navigasyon için API
contextBridge.exposeInMainWorld('app', {
  minimize: () => ipcRenderer.send('minimize-window'),
  close: () => ipcRenderer.send('close-window'),
  navigate: (page) => ipcRenderer.send('navigate', page),
});

// HTTP API
contextBridge.exposeInMainWorld('httpAPI', {
  post: async (url, data) => {
    try {
      // Base URL'yi ekleyelim
      const baseUrl = 'http://localhost:3110';
      const fullUrl = `${baseUrl}${url}`;

      console.log('Making POST request to:', fullUrl, 'with data:', data);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Response:', result);
      return result;
    } catch (error) {
      console.error('HTTP Error:', error);
      throw error;
    }
  },
});

// Excel API
contextBridge.exposeInMainWorld('excelAPI', {
  getData: async (excelPath) => {
    try {
      console.log('Requested Excel path:', excelPath); // Debug için

      if (!excelPath) {
        throw new Error('Excel dosya yolu belirtilmemiş');
      }

      // Yol kontrolü
      if (!fs.existsSync(excelPath)) {
        console.error('Excel path not found:', excelPath);
        throw new Error(`Excel dosyası bulunamadı: ${excelPath}`);
      }

      const workbook = XLSX.readFile(excelPath, {
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Excel verilerini ham halde oku
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: null,
        header: 1,
      });

      // Başlık satırını al
      const headers = rawData[0];

      // Veriyi işle
      return rawData
        .slice(1)
        .map((row) => {
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });
          return rowData;
        })
        .filter((row) => row['Product Type']);
    } catch (error) {
      console.error('Excel okuma hatası:', error);
      throw error;
    }
  },
  createExcel: async (filePath, options) => {
    const workbook = buildPricingExcelWorkbook(options);
    await workbook.xlsx.writeFile(filePath);
  },

  getExcelBuffer: async (options) => {
    const workbook = buildPricingExcelWorkbook(options);
    const buf = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buf);
  },
});

// Excel API'sini tanımla
contextBridge.exposeInMainWorld('api', {
  readExcel: (type) => ipcRenderer.invoke('read-excel', type),
  readRectifierComponent: (componentType) =>
    ipcRenderer.invoke('read-rectifier-component', componentType),
  generateRectifierPDF: (htmlContent) =>
    ipcRenderer.invoke('generate-rectifier-pdf', htmlContent),
  offerDraftSet: (draft) => ipcRenderer.invoke('offer-draft-set', draft),
  offerDraftGet: () => ipcRenderer.invoke('offer-draft-get'),
  offerDraftClear: () => ipcRenderer.invoke('offer-draft-clear'),
  pricingQueueBuildFromDraft: () =>
    ipcRenderer.invoke('pricing-queue-build-from-draft'),
  pricingQueueGet: () => ipcRenderer.invoke('pricing-queue-get'),
  pricingQueueAdvance: () => ipcRenderer.invoke('pricing-queue-advance'),
  pricingQueueClear: () => ipcRenderer.invoke('pricing-queue-clear'),
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  generateQuoteDocument: (data) =>
    ipcRenderer.invoke('generate-quote-document', data),
});

// Pricing API
contextBridge.exposeInMainWorld('pricingAPI', {
  navigateToPricing: () => ipcRenderer.invoke('navigate-to-pricing'),
  getProductTypes: () => ipcRenderer.invoke('get-product-types'),
  getSubtypes: (productType) => ipcRenderer.invoke('get-subtypes', productType),
  calculatePrice: (data) => ipcRenderer.invoke('calculate-price', data),
  exportToExcel: (data) => ipcRenderer.invoke('export-excel', data),
});

contextBridge.exposeInMainWorld('fileAPI', {
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
});

console.log('APIs exposed successfully');

const excelPaths = {
  rectifier:
    '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Rectifier.xlsx',
  inverter:
    '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Inverter.xlsx',
};
