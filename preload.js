const { contextBridge, ipcRenderer } = require('electron');
const { shell } = require('electron');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.invoke('minimize'),
  maximize: () => ipcRenderer.invoke('maximize'),
  close: () => ipcRenderer.invoke('close'),
  openRectifier: () => ipcRenderer.invoke('open-rectifier'),
  navigateToMain: () => ipcRenderer.invoke('navigate-to-main'),
  openIndustrialRectifier: () =>
    ipcRenderer.invoke('open-industrial-rectifier'),
  openModularRectifier: () => ipcRenderer.invoke('open-modular-rectifier'),
  openSDDatasheet: () => ipcRenderer.invoke('open-sd-datasheet'),
  openSDUserManual: () => ipcRenderer.invoke('open-sd-user-manual'),
  openSDMDatasheet: () => ipcRenderer.invoke('open-sdm-datasheet'),
  openSDMUserManual: () => ipcRenderer.invoke('open-sdm-user-manual'),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  generateQuoteDocument: (quoteData) =>
    ipcRenderer.invoke('generate-quote-document', quoteData),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateAvailable: (callback) =>
    ipcRenderer.on('update-available', () => callback()),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', () => callback()),
  onUpdateError: (callback) =>
    ipcRenderer.on('update-error', (_, error) => callback(error)),
  onDownloadProgress: (callback) =>
    ipcRenderer.on('download-progress', (_, progressObj) =>
      callback(progressObj)
    ),
  readExcel: async (type) => {
    try {
      let excelPath;
      switch (type) {
        case 'Inverter':
          excelPath =
            '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Inverter.xlsx';
          break;
        case '3 Phase UPS':
          excelPath =
            '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/3 Phase UPS.xlsx';
          break;
        case 'Rectifier':
          excelPath =
            '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Rectifier.xlsx';
          break;
        case 'Voltage Stabilizer':
          excelPath =
            '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Voltage Stabilizer.xlsx';
          break;
        case 'STS':
          excelPath =
            '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Static Transfer Switch.xlsx';
          break;
        case 'FC':
          excelPath =
            '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Frequency Converter.xlsx';
          break;
        default:
          throw new Error('Geçersiz ürün tipi');
      }

      // Excel'i oku
      const workbook = XLSX.readFile(excelPath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      return data;
    } catch (error) {
      console.error('Excel okuma hatası:', error);
      throw error;
    }
  },
  saveQuote: async (quoteData) => {
    try {
      const response = await fetch('http://localhost:3110/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(quoteData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('API hata detayı:', responseData);
        throw new Error(
          responseData.message || responseData.error || 'API hatası'
        );
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      console.error('Quote save error:', error);
      return {
        success: false,
        message: error.message || 'Bilinmeyen bir hata oluştu',
      };
    }
  },
  navigateToUPS: () => ipcRenderer.send('navigate', 'ups-pricing.html'),
  navigateToInverter: () =>
    ipcRenderer.send('navigate', 'inverter-pricing.html'),
  navigateToHome: () => ipcRenderer.send('navigate', 'anasayfa.html'),
  minimize: () => ipcRenderer.send('window-control', 'minimize'),
  close: () => ipcRenderer.send('window-control', 'close'),
  exportToExcel: async (data, productType) => {
    try {
      // Kaydetme dialog'unu göster
      const saveDialogResult = await ipcRenderer.invoke('show-save-dialog', {
        title: 'Excel Dosyasını Kaydet',
        defaultPath: `EPC_${productType}_Teklif_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '')}.xlsx`,
        filters: [{ name: 'Excel Dosyaları', extensions: ['xlsx'] }],
      });

      console.log('Save dialog result:', saveDialogResult);

      // Eğer kullanıcı iptal ettiyse
      if (!saveDialogResult || saveDialogResult.canceled) {
        console.log('Dosya kaydetme iptal edildi');
        return false;
      }

      // Dosya yolunu al (sonuç bir obje veya doğrudan string olabilir)
      const filePath = saveDialogResult.filePath || saveDialogResult;

      if (!filePath) {
        console.error('Geçerli dosya yolu bulunamadı');
        return false;
      }

      console.log('Dosya kaydedilecek: ', filePath);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`${productType} Teklifi`);

      // Sütun genişlikleri
      worksheet.columns = data.columns;

      // Başlık alanı
      worksheet.mergeCells('A1:I1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'EPC POWER CONVERSION';
      titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2B579A' },
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Alt başlık
      worksheet.mergeCells('A2:I2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `${productType.toUpperCase()} SİSTEMLERİ TEKLİF FORMU`;
      subtitleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
      subtitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2B579A' },
      };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Teklif bilgileri
      data.rows.slice(3, 6).forEach((row, index) => {
        const excelRow = worksheet.addRow(row);
        excelRow.getCell(1).font = { bold: true, color: { argb: '2B579A' } };
        excelRow.getCell(2).font = { bold: true };
      });

      // Boş satır
      worksheet.addRow([]);

      // Tablo başlıkları
      const headerRow = worksheet.addRow(data.rows[7]);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Normal satırlar
      const normalRows = data.rows
        .slice(8)
        .filter((row) => row[1] !== 'GENEL TOPLAM');
      normalRows.forEach((row, index) => {
        const dataRow = worksheet.addRow(row);
        dataRow.eachCell((cell, colNumber) => {
          // Para birimi formatı
          if ([3, 5, 8, 9].includes(colNumber)) {
            cell.numFmt = '#,##0.00 "$"';
          }

          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };

          // Zebra stili
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F8F9FA' },
            };
          }
        });
      });

      // Genel Toplam satırı
      const totalRow = data.rows.find((row) => row[1] === 'GENEL TOPLAM');
      if (totalRow) {
        worksheet.addRow([]); // Boş satır
        const excelTotalRow = worksheet.addRow(totalRow);
        excelTotalRow.eachCell((cell, colNumber) => {
          cell.font = { bold: true, size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E9EEF5' },
          };
          cell.border = {
            top: { style: 'medium' },
            bottom: { style: 'medium' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };

          if ([5, 8, 9].includes(colNumber)) {
            cell.numFmt = '#,##0.00 "$"';
          }
        });
      }

      // Notlar bölümü
      worksheet.addRow([]);
      worksheet.addRow(['NOTLAR:']).font = {
        bold: true,
        color: { argb: '2B579A' },
      };
      [
        '1. Fiyatlar USD bazındadır.',
        '2. Teslimat süresi sipariş tarihinden itibaren 6-8 haftadır.',
        '3. Teklifin geçerlilik süresi 30 gündür.',
        '4. Fiyatlara KDV dahil değildir.',
        '',
        'İLETİŞİM BİLGİLERİ',
        'EPC Enerji ve Güç Dönüşüm Sistemleri',
        'Email: sales@epcas.com.tr',
      ].forEach((note) => {
        worksheet.addRow([note]);
      });

      // Sütun genişlikleri
      worksheet.getColumn(1).width = 6; // No
      worksheet.getColumn(2).width = 40; // Ürün
      worksheet.getColumn(3).width = 12; // Maliyet
      worksheet.getColumn(4).width = 8; // Adet
      worksheet.getColumn(5).width = 16; // Maliyet Toplamı
      worksheet.getColumn(6).width = 10; // Çarpan-1
      worksheet.getColumn(7).width = 10; // Çarpan-2
      worksheet.getColumn(8).width = 16; // Toplam-1
      worksheet.getColumn(9).width = 16; // Toplam-2

      try {
        await workbook.xlsx.writeFile(filePath);
        console.log('Excel dosyası başarıyla oluşturuldu:', filePath);
        return true;
      } catch (writeError) {
        console.error('Excel dosyası yazılırken hata oluştu:', writeError);
        alert('Excel dosyası kaydedilemedi: ' + writeError.message);
        return false;
      }
    } catch (error) {
      console.error('Excel export hatası:', error);
      alert('Excel export işlemi sırasında bir hata oluştu: ' + error.message);
      return false;
    }
  },
  openFile: (path) => {
    shell.openPath(path);
  },
});

// Electron ile database işlemleri için API
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, data) => {
    // Güvenlik: sadece izin verilen kanallar için
    const validChannels = [
      'db:connect',
      'db:test',
      'db:getAllCustomers',
      'db:getCustomerDetails',
      'db:addCustomer',
      'db:updateCustomer',
      'db:deleteCustomer',
      'db:getAllMeetings',
      'db:addMeeting',
      'db:deleteMeeting',
      'db:getAllCustomerNotes',
      'db:deleteCustomerNote',
      'db:getAllQuotes',
      'db:deleteQuote',
      'db:getAllQuoteRevisions',
      'db:deleteQuoteRevision',
      'db:getAllTransactions',
      'db:deleteTransaction',
      'db:getAllUsers',
      'db:deleteUser',
    ];

    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }

    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },
});
