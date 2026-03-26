const { contextBridge, ipcRenderer } = require('electron');
const ExcelJS = require('exceljs');
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
    const workbook = new ExcelJS.Workbook();

    // Fiyat listesi sayfası
    const worksheet = workbook.addWorksheet(options.sheetName);

    // Şirket bilgileri ve başlık
    worksheet.mergeCells('A1:I2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'FİYAT TEKLİF FORMU';
    titleCell.font = {
      name: 'Arial Black',
      size: 16,
      color: { argb: 'FF1A2333' },
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Tarih ve belge bilgisi
    worksheet.mergeCells('A3:C3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`;
    dateCell.font = { bold: true };

    // Ana tablo başlangıç satırı
    const tableStartRow = 5;

    // Sütun genişliklerini ayarla
    worksheet.columns = [
      { width: 8 }, // No
      { width: 40 }, // Ürün
      { width: 15 }, // Maliyet
      { width: 10 }, // Adet
      { width: 15 }, // Maliyet Toplamı
      { width: 12 }, // Çarpan-1
      { width: 12 }, // Çarpan-2
      { width: 15 }, // Toplam-1
      { width: 15 }, // Toplam-2
    ];

    // Başlıkları ekle
    const headers = options.data[0];
    worksheet.getRow(tableStartRow).values = headers;

    // Verileri ekle (başlık satırını atlayarak)
    const dataRows = options.data.slice(1);
    worksheet.addRows(dataRows);

    // Tüm hücrelere temel stil
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= tableStartRow) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
          cell.font = {
            name: 'Calibri',
            size: 11,
          };
          cell.alignment = {
            vertical: 'middle',
          };
        });
        row.height = 25;
      }
    });

    // Başlık satırı stili
    const headerRow = worksheet.getRow(tableStartRow);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.style = {
        font: {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 12,
        },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1A2333' },
        },
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
        },
        border: {
          top: { style: 'medium', color: { argb: 'FF1E2A3B' } },
          left: { style: 'thin', color: { argb: 'FF1E2A3B' } },
          bottom: { style: 'medium', color: { argb: 'FF1E2A3B' } },
          right: { style: 'thin', color: { argb: 'FF1E2A3B' } },
        },
      };
    });

    // Veri satırları için alternatif renklendirme ve sayısal format
    for (let i = tableStartRow + 1; i <= worksheet.rowCount - 1; i++) {
      const row = worksheet.getRow(i);
      const fillColor = i % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';

      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };

        if ([3, 4, 5, 6, 7, 8, 9].includes(colNumber)) {
          cell.style = {
            ...cell.style,
            alignment: { horizontal: 'right', vertical: 'middle' },
            numFmt: '#,##0.00',
            font: {
              ...cell.font,
              color: { argb: 'FF2F4F4F' },
            },
          };
        }
      });
    }

    // Özet bilgiler bölümü
    const summaryStartRow = worksheet.rowCount + 2;
    worksheet.mergeCells(`A${summaryStartRow}:C${summaryStartRow}`);
    const summaryCell = worksheet.getCell(`A${summaryStartRow}`);
    summaryCell.value = 'ÖZET BİLGİLER';
    summaryCell.font = { bold: true, size: 12 };
    summaryCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' },
    };

    // Özet formüller
    worksheet.getCell(`A${summaryStartRow + 1}`).value = 'Toplam Ürün Sayısı:';
    worksheet.getCell(`B${summaryStartRow + 1}`).value = {
      formula: `COUNTA(B${tableStartRow + 1}:B${worksheet.rowCount - 1})`,
    };
    worksheet.getCell(`A${summaryStartRow + 2}`).value = 'Ortalama Çarpan-1:';
    worksheet.getCell(`B${summaryStartRow + 2}`).value = {
      formula: `AVERAGE(F${tableStartRow + 1}:F${worksheet.rowCount - 1})`,
    };
    worksheet.getCell(`A${summaryStartRow + 3}`).value = 'Ortalama Çarpan-2:';
    worksheet.getCell(`B${summaryStartRow + 3}`).value = {
      formula: `AVERAGE(G${tableStartRow + 1}:G${worksheet.rowCount - 1})`,
    };

    // Sayfa yapısı ayarları
    worksheet.pageSetup = {
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      orientation: 'landscape',
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    };

    // Yazdırma başlıkları
    worksheet.pageSetup.printTitlesRow = `${tableStartRow}:${tableStartRow}`;

    // Altbilgi
    worksheet.headerFooter.oddFooter = '&L&B' + 'Sayfa &P / &N' + '&R&D';

    // Otomatik filtre
    worksheet.autoFilter = {
      from: { row: tableStartRow, column: 1 },
      to: { row: tableStartRow, column: 9 },
    };

    // Dondurulmuş panel
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: tableStartRow }];

    // Dosyayı kaydet
    await workbook.xlsx.writeFile(filePath);
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
