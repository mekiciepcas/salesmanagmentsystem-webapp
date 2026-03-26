const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  session,
  Menu,
} = require('electron');
const path = require('path');
const fs = require('fs-extra');
const XLSX = require('xlsx');
const { PDFDocument } = require('pdf-lib');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const credentials = require('./src/config/credentials.json');
const bcrypt = require('bcrypt');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { autoUpdater } = require('electron-updater');
const QRCode = require('qrcode'); // QRCode kütüphanesini ekle

// Express sunucusu ve server değişkeni tanımlaması
const expressApp = express();
const port = 3110;
let server = null; // Server değişkenini tanımla

// Express middleware
expressApp.use(cors());
expressApp.use(express.json());

// PostgreSQL bağlantısı
const pool = new Pool(credentials.database);

// Bağlantıyı test et
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
    console.error('Connection details:', {
      host: credentials.database.host,
      database: credentials.database.database,
      user: credentials.database.user,
      port: credentials.database.port,
      ssl: credentials.database.ssl,
    });
  } else {
    console.log('Database connected successfully:', res.rows[0]);
  }
});

// Hata olaylarını dinle
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Express sunucusunu başlatmadan önce port kontrolü yap
const checkPort = (port) => {
  return new Promise((resolve, reject) => {
    const server = expressApp
      .listen(port, () => {
        server.close(() => resolve(true));
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          reject(err);
        }
      });
  });
};

// Excel verilerini yükle
let excelData = null;

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

async function loadExcelData() {
  try {
    console.log('Loading Excel file...');
    const filePath =
      '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/Inverter.xlsx';
    console.log('Excel file path:', filePath);

    // Dosyanın varlığını kontrol et
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel dosyası bulunamadı: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
    });
    console.log('Workbook loaded');

    const sheetName = workbook.SheetNames[0];
    console.log('Sheet name:', sheetName);

    const worksheet = workbook.Sheets[sheetName];

    // Excel verilerini ham halde oku
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: null,
      header: 1, // İlk satırı başlık olarak kullan
    });

    console.log('Raw data first row:', rawData[0]);

    // Başlık satırını al
    const headers = rawData[0];

    // Veriyi işle
    excelData = rawData
      .slice(1) // İlk satırı (başlıkları) atla
      .map((row) => {
        const rowData = {};
        headers.forEach((header, index) => {
          if (header === 'Cost' && typeof row[index] === 'string') {
            // $ işaretini kaldır ve sayıya çevir
            rowData[header] = parseFloat(row[index].replace(/[^0-9.-]+/g, ''));
          } else {
            rowData[header] = row[index];
          }
        });
        return rowData;
      })
      .filter((row) => row['Product Type']); // Boş satırları filtrele

    console.log('Processed data first 3 rows:', excelData.slice(0, 3));
    console.log('Total processed rows:', excelData.length);

    return excelData;
  } catch (error) {
    console.error('Excel yükleme hatası:', error);
    console.error('Error stack:', error.stack);
    return null;
  }
}

// En üstte mainWindow tanımla
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false,
    backgroundColor: '#2e2c29',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'src/scripts/preload.js'),
      devTools: true,
    },
  });

  // Pencere yüklendiğinde göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Sağ tık menüsü
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'İncele',
      click: () => {
        win.webContents.inspectElement(contextMenuPos.x, contextMenuPos.y);
      },
    },
    { type: 'separator' },
    { role: 'cut', label: 'Kes' },
    { role: 'copy', label: 'Kopyala' },
    { role: 'paste', label: 'Yapıştır' },
  ]);

  let contextMenuPos = { x: 0, y: 0 };

  mainWindow.webContents.on('context-menu', (event, params) => {
    contextMenuPos = { x: params.x, y: params.y };
    contextMenu.popup();
  });

  // DOM hazır olduğunda - buraya taşındı
  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM is ready');
    mainWindow.webContents.send('dom-ready');
  });

  // Login sayfasını yükle
  mainWindow.loadFile('src/pages/login.html');

  // Pencere kontrollerini iyileştir
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12 veya Ctrl+Shift+I için DevTools
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key.toLowerCase() === 'i')
    ) {
      mainWindow.webContents.openDevTools();
      event.preventDefault();
    }

    // Ctrl+R için yenileme
    if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
  });

  // Pencere durumunu izle
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-change', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-change', 'normal');
  });

  // Pencere konumunu kaydet
  let windowState = {
    isMaximized: false,
    bounds: mainWindow.getBounds(),
  };

  mainWindow.on('close', () => {
    windowState.isMaximized = mainWindow.isMaximized();
    if (!windowState.isMaximized) {
      windowState.bounds = mainWindow.getBounds();
    }
  });

  // Sayfa yönlendirmelerini izle
  mainWindow.webContents.on('did-navigate', () => {
    // Yeni sayfada da pencere kontrollerinin çalışması için
    mainWindow.webContents.send('init-window-controls');
  });

  // Sayfa yeniden yüklendiğinde
  mainWindow.webContents.on('did-finish-load', () => {
    // Pencere kontrollerini yeniden başlat
    mainWindow.webContents.send('init-window-controls');
  });
}

// Express sunucusunu başlat
const startServer = async () => {
  try {
    // Mevcut portu kontrol et
    const portInUse = await checkPort(port);
    if (!portInUse) {
      console.log(
        `Port ${port} is already in use, trying to close existing server...`
      );
      // Mevcut server'ı kapat ve yeniden dene
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Express middleware
    expressApp.use(cors());
    expressApp.use(express.json());

    // API routes
    expressApp.use('/api', require('./src/server/api'));

    // Sunucuyu başlat
    server = expressApp.listen(port, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });

    // Veritabanı bağlantısını test et
    const dbResult = await pool.query('SELECT NOW()');
    console.log('Database connected:', dbResult.rows[0]);
  } catch (error) {
    console.error('Server startup error:', error);
    if (error.code === 'EADDRINUSE') {
      console.log(
        'Port is busy, please close other applications using port 3000'
      );
    }
  }
};

// Database işlemleri için IPC handlers
ipcMain.handle('db:connect', async () => {
  try {
    // Test query
    await pool.query('SELECT NOW()');
    return { success: true };
  } catch (error) {
    console.error('Database connection error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:test', async () => {
  try {
    await pool.query('SELECT NOW()');
    return { success: true };
  } catch (error) {
    console.error('Database test error:', error);
    return { success: false, error: error.message };
  }
});

// Müşteri işlemleri
ipcMain.handle('db:getAllCustomers', async () => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Get all customers error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:getCustomerDetails', async (event, { id }) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [
      id,
    ]);
    return {
      success: true,
      data: result.rows.length > 0 ? result.rows[0] : null,
    };
  } catch (error) {
    console.error(`Get customer details (id: ${id}) error:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:addCustomer', async (event, customerData) => {
  try {
    const {
      name,
      company_name,
      category,
      consultant_phone,
      consultant_email,
      country,
      city,
      address,
      status,
    } = customerData;

    const result = await pool.query(
      `INSERT INTO customers 
            (name, company_name, category, consultant_phone, consultant_email, country, city, address, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING id`,
      [
        name,
        company_name,
        category,
        consultant_phone,
        consultant_email,
        country,
        city,
        address,
        status,
      ]
    );

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Add customer error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:updateCustomer', async (event, { id, ...customerData }) => {
  try {
    const {
      name,
      company_name,
      category,
      consultant_phone,
      consultant_email,
      country,
      city,
      address,
      status,
    } = customerData;

    const result = await pool.query(
      `UPDATE customers 
            SET name = $1, company_name = $2, category = $3, consultant_phone = $4, 
                consultant_email = $5, country = $6, city = $7, address = $8, 
                status = $9, updated_at = NOW()
            WHERE id = $10
            RETURNING *`,
      [
        name,
        company_name,
        category,
        consultant_phone,
        consultant_email,
        country,
        city,
        address,
        status,
        id,
      ]
    );

    return {
      success: true,
      data: result.rows.length > 0 ? result.rows[0] : null,
    };
  } catch (error) {
    console.error(`Update customer (id: ${id}) error:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:deleteCustomer', async (event, { id }) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
    return { success: true };
  } catch (error) {
    console.error(`Delete customer (id: ${id}) error:`, error);
    return { success: false, error: error.message };
  }
});

// Diğer tablolar için de benzer şekilde handler'lar eklenecek
// Bu örnekte sadece en temel handler'lar eklendi

// Otomatik güncelleme için fonksiyonlar
function setupAutoUpdater() {
  // Güncellemeler için log
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';
  console.log(
    'Updater log path:',
    autoUpdater.logger.transports.file.getFile().path
  );

  autoUpdater.on('checking-for-update', () => {
    console.log('Güncellemeler kontrol ediliyor...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Güncelleme mevcut:', info);
    mainWindow.webContents.send('update-available');
    dialog.showMessageBox({
      type: 'info',
      title: 'Güncelleme Mevcut',
      message: 'Yeni bir güncelleme mevcut. İndiriliyor...',
      buttons: ['Tamam'],
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Güncelleme mevcut değil:', info);
  });

  autoUpdater.on('error', (err) => {
    console.log('Güncelleme hatası:', err);
    mainWindow.webContents.send('update-error', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download progress: ${progressObj.percent}%`);
    mainWindow.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Güncelleme indirildi:', info);
    mainWindow.webContents.send('update-downloaded');
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Güncelleme Hazır',
        message:
          'Güncelleme indirildi. Şimdi yüklemek için uygulamayı yeniden başlatmak ister misiniz?',
        buttons: ['Evet', 'Hayır'],
      })
      .then((buttonIndex) => {
        if (buttonIndex.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  // Güncellemeleri kontrol et
  autoUpdater.checkForUpdatesAndNotify();

  // Her saat başı güncelleme kontrolü
  setInterval(
    () => {
      autoUpdater.checkForUpdatesAndNotify();
    },
    60 * 60 * 1000
  );
}

// Uygulama başlatıldığında server'ı başlat
app.whenReady().then(async () => {
  await startServer();
  createWindow();

  // Otomatik güncelleyiciyi kur
  setupAutoUpdater();

  // Güncelleme handler'ları
  ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdates();
  });

  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });
});

let quoteCart = [];

// Sepete sistem paketi ekle
ipcMain.on('add-to-cart', (event, systemPackage) => {
  quoteCart.push(systemPackage);
  console.log('Sepete eklendi:', systemPackage.name);
  // Ana pencereye bildirim göndererek sepetin güncellendiğini haber ver
  mainWindow.webContents.send('cart-updated', quoteCart.length);
});

// Sepet içeriğini getir
ipcMain.handle('get-cart-contents', () => {
  return quoteCart;
});

// Sepetten tek bir öğeyi kaldır
ipcMain.on('remove-from-cart', (event, index) => {
  if (index >= 0 && index < quoteCart.length) {
    quoteCart.splice(index, 1);
    console.log(`Sepetten ${index} indexli öğe silindi.`);
  }
});

// Sepeti tamamen temizle
ipcMain.on('clear-cart', () => {
  quoteCart = [];
  console.log('Sepet temizlendi.');
});

/** Teklif projesi taslağı (anasayfa) ve sıralı maliyetlendirme kuyruğu */
let offerProjectDraft = null;

const ROUTE_KEY_TO_PRICING_PAGE = {
  rectifier: 'rectifier-pricing.html',
  inverter: 'inverter-pricing.html',
  ups: 'ups-pricing.html',
  vs: 'stabilizer-pricing.html',
  sts: 'sts-pricing.html',
  fc: 'frequency-pricing.html',
};

/** @type {{ steps: object[], currentStep: number } | null} */
let pricingQueueState = null;

ipcMain.handle('offer-draft-set', (event, draft) => {
  offerProjectDraft = draft && typeof draft === 'object' ? draft : null;
  return { success: true };
});

ipcMain.handle('offer-draft-get', () => offerProjectDraft);

ipcMain.handle('offer-draft-clear', () => {
  offerProjectDraft = null;
  return { success: true };
});

ipcMain.handle('pricing-queue-build-from-draft', () => {
  if (!offerProjectDraft || !Array.isArray(offerProjectDraft.lines)) {
    return { success: false, error: 'Taslak veya kalemler yok' };
  }
  const steps = [];
  offerProjectDraft.lines.forEach((line) => {
    const page =
      ROUTE_KEY_TO_PRICING_PAGE[line.routeKey] ||
      ROUTE_KEY_TO_PRICING_PAGE[line.routeKey?.toLowerCase?.()];
    if (!page) return;
    const qty = Math.max(1, parseInt(line.quantity, 10) || 1);
    for (let i = 1; i <= qty; i++) {
      steps.push({
        routeKey: line.routeKey,
        pricingPage: page,
        label: line.label || line.routeKey,
        lineId: line.lineId,
        instanceIndex: i,
        totalInLine: qty,
        done: false,
      });
    }
  });
  pricingQueueState = { steps, currentStep: 0 };
  return { success: true, totalSteps: steps.length };
});

ipcMain.handle('pricing-queue-get', () => pricingQueueState);

ipcMain.handle('pricing-queue-advance', () => {
  if (!pricingQueueState || !pricingQueueState.steps.length) {
    return { success: false };
  }
  const idx = pricingQueueState.currentStep;
  if (idx < pricingQueueState.steps.length && pricingQueueState.steps[idx]) {
    pricingQueueState.steps[idx].done = true;
  }
  pricingQueueState.currentStep = Math.min(
    idx + 1,
    pricingQueueState.steps.length
  );
  return { success: true, currentStep: pricingQueueState.currentStep };
});

ipcMain.handle('pricing-queue-clear', () => {
  pricingQueueState = null;
  return { success: true };
});

// Merkezi konfigürasyon dosyalarından bileşenleri bul
ipcMain.handle(
  'find-components-from-central-config',
  async (event, componentSpecs) => {
    const configPath =
      '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data\\config';
    const foundComponents = [];

    try {
      // --- Transformatör Bul ---
      const transformersPath = path.join(configPath, 'transformers.json');
      if (fs.existsSync(transformersPath)) {
        const transformers = JSON.parse(
          fs.readFileSync(transformersPath, 'utf-8')
        );
        // kVA'ya göre sırala
        transformers.sort((a, b) => a.kva - b.kva);
        const requiredKva = parseFloat(componentSpecs.transformer.kva);
        const foundTransformer = transformers.find(
          (t) =>
            t.kva >= requiredKva &&
            t.phase === componentSpecs.transformer.phase &&
            t.inputVoltage === componentSpecs.transformer.inputVoltage
        );
        if (foundTransformer) {
          foundComponents.push({
            ...foundTransformer,
            productType: 'Transformer',
          });
        }
      }

      // --- Kesicileri Bul ---
      const breakersPath = path.join(configPath, 'breakers.json');
      if (fs.existsSync(breakersPath)) {
        const breakers = JSON.parse(fs.readFileSync(breakersPath, 'utf-8'));
        breakers.sort((a, b) => a.max_current - b.max_current);

        // Giriş Kesicisi
        const requiredInputCurrent = parseFloat(
          componentSpecs.inputBreaker.current
        );
        const foundInputBreaker = breakers.find(
          (b) =>
            requiredInputCurrent >= b.min_current &&
            requiredInputCurrent <= b.max_current
        );
        if (foundInputBreaker) {
          foundComponents.push({
            ...foundInputBreaker,
            name: `Giriş Kesicisi - ${foundInputBreaker.name}`,
            productType: 'Breaker',
          });
        }

        // Batarya Kesicisi
        const requiredBatteryCurrent = parseFloat(
          componentSpecs.batteryBreaker.current
        );
        const foundBatteryBreaker = breakers.find(
          (b) =>
            requiredBatteryCurrent >= b.min_current &&
            requiredBatteryCurrent <= b.max_current
        );
        if (foundBatteryBreaker) {
          foundComponents.push({
            ...foundBatteryBreaker,
            name: `Batarya Kesicisi - ${foundBatteryBreaker.name}`,
            productType: 'Breaker',
          });
        }

        // Çıkış Kesicisi
        const requiredOutputCurrent = parseFloat(
          componentSpecs.outputBreaker.current
        );
        const foundOutputBreaker = breakers.find(
          (b) =>
            requiredOutputCurrent >= b.min_current &&
            requiredOutputCurrent <= b.max_current
        );
        if (foundOutputBreaker) {
          foundComponents.push({
            ...foundOutputBreaker,
            name: `Çıkış Kesicisi - ${foundOutputBreaker.name}`,
            productType: 'Breaker',
          });
        }
      }

      return { success: true, components: foundComponents };
    } catch (error) {
      console.error('Merkezi konfigürasyon okuma hatası:', error);
      return { success: false, error: error.message };
    }
  }
);

// Teklifi veritabanına kaydet
ipcMain.handle('save-quote-to-db', async (event, quoteData) => {
  const { number, preparedBy, total_price, date } = quoteData.quote;
  const details = `${quoteData.customer.name} - ${quoteData.customer.contact}`;
  const items_json = JSON.stringify(quoteData.cart); // Sepet içeriğini JSON olarak sakla

  // Basit bir SQL INSERT sorgusu
  const query = `
        INSERT INTO quotes (number, prepared_by, details, total_price, status, items_json, date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id;
    `;
  const values = [
    number,
    preparedBy,
    details,
    total_price,
    'HAZIRLANDI',
    items_json,
    date,
  ];

  try {
    const result = await pool.query(query, values);
    return { success: true, quoteId: result.rows[0].id };
  } catch (error) {
    console.error('Veritabanına teklif kaydetme hatası:', error);
    return { success: false, error: error.message };
  }
});

// Pencere kontrolleri için IPC dinleyicileri
ipcMain.on('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.on('close-window', () => {
  mainWindow?.close();
});

// Yeni HTML teklif penceresi oluşturma
let currentQuoteData = null; // Geçerli teklif verisini saklamak için

ipcMain.on('generate-html-quote', async (event, quoteData) => {
  // Fonksiyonu async yap
  currentQuoteData = quoteData; // Gelen veriyi sakla

  const quoteWindow = new BrowserWindow({
    width: 800,
    height: 1100,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'src/scripts/preload.js'), // PDF'e çevirme butonu için
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const htmlContent = await createQuoteHtml(quoteData); // await ekle
  quoteWindow.loadURL(
    `data:text/html;charset=UTF-8,${encodeURIComponent(htmlContent)}`
  );

  quoteWindow.once('ready-to-show', () => {
    quoteWindow.show();
  });

  quoteWindow.on('closed', () => {
    currentQuoteData = null; // Pencere kapandığında veriyi temizle
  });
});

// Yeni pencereden gelen PDF'e yazdırma isteğini işle
ipcMain.on('print-to-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  console.log('[PDF Generation] "print-to-pdf" event received.');
  console.log('[PDF Generation] Current Quote Data:', currentQuoteData);

  const password = currentQuoteData?.quote?.pdfPassword;
  console.log(
    `[PDF Generation] Password received: "${password}" (Type: ${typeof password})`
  );

  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'PDF Olarak Kaydet',
      defaultPath: `Teklif-${currentQuoteData?.quote?.number || new Date().toISOString().split('T')[0]}.pdf`,
      filters: [{ name: 'PDF Dosyaları', extensions: ['pdf'] }],
    });

    if (!canceled && filePath) {
      // Ham PDF verisini oluştur
      const pdfData = await win.webContents.printToPDF({
        marginsType: 0,
        printBackground: true,
        pageSize: 'A4',
      });

      // pdf-lib ile PDF'i yükle
      const pdfDoc = await PDFDocument.load(pdfData);

      // Şifreleme seçeneklerini hazırla (eğer şifre varsa)
      const saveOptions = {};
      if (password) {
        console.log(
          '[PDF Generation] Password is valid, preparing encryption options...'
        );
        saveOptions.encryptOptions = {
          userPassword: password,
          ownerPassword: password,
          permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
            annotating: true,
            formFilling: true,
            contentAccessibility: true,
            documentAssembly: false,
          },
        };
      } else {
        console.log(
          '[PDF Generation] No password provided, skipping encryption.'
        );
      }

      // PDF'i kaydet (gerekirse şifreleyerek)
      const finalPdfBytes = await pdfDoc.save(saveOptions);

      fs.writeFileSync(filePath, finalPdfBytes);

      // Kullanıcıya bildirim gönder
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Başarılı',
        message: `PDF dosyası başarıyla kaydedildi:\n${filePath}${password ? ' (Şifreli)' : ''}`,
      });
      win.close();
    }
  } catch (error) {
    console.error('PDF oluşturma/şifreleme hatası:', error);
    dialog.showMessageBox(win, {
      type: 'error',
      title: 'Hata',
      message: `PDF oluşturulurken bir hata oluştu: ${error.message}`,
    });
  }
});

async function createQuoteHtml(data) {
  // --- Tüm Excel Verilerini Topla (Başlangıçta bir kere) ---
  const allProductsData = {};
  const productTypesForExcel = [
    'Rectifier',
    'Inverter',
    '3 Phase UPS',
    'Voltage Stabilizer',
    'Static Transfer Switch',
    'Frequency Converter',
  ];

  try {
    // Her bir ürün tipi için Excel verisini oku ve tek bir objede topla
    for (const type of productTypesForExcel) {
      // "3 Phase UPS" gibi isimleri "UPS" anahtarı altında sakla
      const key = type.includes('UPS') ? 'UPS' : type;
      const excelFilePath = `//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/${type}.xlsx`;

      if (fs.existsSync(excelFilePath)) {
        const workbook = XLSX.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Her bir ürünü 'Model' veya 'Subtype' bazlı bir haritada sakla
        jsonData.forEach((row) => {
          const modelKey = row.Model || row.Subtype || row['Product Type'];
          if (modelKey) {
            allProductsData[modelKey.toString().trim()] = row;
          }
        });
      }
    }
  } catch (error) {
    console.error('Tüm Excel verileri okunurken hata oluştu:', error);
  }
  // --- Veri Toplama Bitiş ---

  // Logoyu base64 formatına çevir
  let logoBase64 = '';
  try {
    const logoPath = path.join(__dirname, 'src/assets/images/EPC_logo1.png');
    if (fs.existsSync(logoPath)) {
      const logoFile = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoFile.toString('base64')}`;
    }
  } catch (error) {
    console.error('Logo yüklenemedi:', error);
  }

  // --- QR Kodu Oluşturma ---
  let qrCodeBase64 = '';
  try {
    const verificationUrl = `https://epcas.com.tr/verify?quote=${data.quote.number}&customer=${encodeURIComponent(data.customer.name)}`;
    qrCodeBase64 = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR Kodu oluşturma hatası:', err);
  }
  // --- Bitiş: QR Kodu Oluşturma ---

  const lang = data.quote.language || 'TR';
  const translations = {
    TR: {
      title: 'Fiyat Teklifi',
      customerInfo: 'Müşteri Bilgileri',
      quoteInfo: 'Teklif Bilgileri',
      company: 'Firma',
      contact: 'Yetkili',
      quoteNo: 'Teklif No',
      date: 'Tarih',
      preparedBy: 'Hazırlayan',
      itemNo: 'No',
      itemDesc: 'Ürün/Sistem Açıklaması',
      itemQty: 'Adet',
      itemUnitCost: 'Birim Fiyat',
      itemTotalCost: 'Toplam Fiyat',
      itemInputVoltage: 'Giriş Voltajı',
      itemOutput: 'Çıkış',
      itemTechnology: 'Teknoloji',
      itemFeatures: 'Özellikler',
      itemDimensions: 'Boyutlar',
      grandTotal: 'Genel Toplam',
      conditionsTitle: 'Teklif Koşulları',
      incoterms: 'Teslim Şekli',
      deliveryTime: 'Teslim Süresi',
      paymentCondition: 'Ödeme Koşulları',
      validity: 'Teklif Geçerliliği',
      origin: 'Menşei',
      packing: 'Paketleme',
      footerText: (validity) =>
        `Bu teklif, belirtilen koşullar dahilinde ${validity} süreyle geçerlidir. Fiyatlara KDV dahil değildir.`,
    },
    EN: {
      title: 'Price Quotation',
      customerInfo: 'Customer Information',
      quoteInfo: 'Quote Information',
      company: 'Company',
      contact: 'Contact Person',
      quoteNo: 'Quote No',
      date: 'Date',
      preparedBy: 'Prepared By',
      itemNo: 'No',
      itemDesc: 'Product/System Description',
      itemQty: 'Qty',
      itemUnitCost: 'Unit Price',
      itemTotalCost: 'Total Price',
      itemInputVoltage: 'Input Voltage',
      itemOutput: 'Output',
      itemTechnology: 'Technology',
      itemFeatures: 'Features',
      itemDimensions: 'Dimensions',
      grandTotal: 'Grand Total',
      conditionsTitle: 'Quotation Conditions',
      incoterms: 'Incoterms',
      deliveryTime: 'Delivery Time',
      paymentCondition: 'Payment Condition',
      validity: 'Quote Validity',
      origin: 'Origin',
      packing: 'Packing',
      footerText: (validity) =>
        `This quote is valid for ${validity} under the specified conditions. Prices do not include VAT.`,
    },
  };
  const t = translations[lang];
  const locale = lang === 'TR' ? 'tr-TR' : 'en-GB';

  let itemsHtml = '';
  let grandTotal = 0;

  data.cart.forEach((system) => {
    const systemTotalMargin2 =
      system.items.reduce((sum, item) => sum + item.total2, 0) *
      system.quantity;
    grandTotal += systemTotalMargin2;

    itemsHtml += `
            <tr class="group-header">
                <td colspan="2"><strong>${system.quantity} x ${system.name.toUpperCase()}</strong></td>
                <td style="text-align: right;" colspan="3"><strong>${systemTotalMargin2.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.quote.currency}</strong></td>
            </tr>
        `;

    system.items.forEach((item) => {
      // --- Ürün Detaylarını allProductsData'dan Bul ---
      const productNameKey = (item.model || item.product_name)
        .split(' - ')
        .pop()
        .trim();
      const productDetails = allProductsData[productNameKey] || {};
      // --- Detay Bulma Bitiş ---

      const featuresHtml = productDetails.Features
        ? `<ul>${String(productDetails.Features)
            .split(';')
            .map((f) => `<li>${f.trim()}</li>`)
            .join('')}</ul>`
        : '';

      itemsHtml += `
                <tr class="item-detail-row">
                    <td style="border: none;"></td>
                    <td colspan="4" style="border-top: none; padding-left: 30px;">
                        <div class="item-description">
                            ${productDetails.MainTitle ? `<strong>${productDetails.MainTitle.toUpperCase()}</strong><br>` : ''}
                            <u>${item.quantity} x ${item.model || item.product_name}</u><br>
                            ${productDetails.Description || productDetails.description ? `<p style="margin: 4px 0;">${productDetails.Description || productDetails.description}</p>` : ''}
                            ${productDetails.InputVoltage ? `<p><strong>${t.itemInputVoltage}:</strong> ${productDetails.InputVoltage}<br></p>` : ''}
                            ${productDetails.Output ? `<p><strong>${t.itemOutput}:</strong> ${productDetails.Output}<br></p>` : ''}
                            ${productDetails.Technology ? `<p><strong>${t.itemTechnology}:</strong> ${productDetails.Technology}</p>` : ''}
                            ${featuresHtml ? `<strong>${t.itemFeatures}:</strong>${featuresHtml}` : ''}
                            ${productDetails.Dimensions ? `<p><strong>${t.itemDimensions}:</strong> ${productDetails.Dimensions}</p>` : ''}
                            ${productDetails.Includes ? `<p>${productDetails.Includes}</p>` : ''}
                        </div>
                    </td>
                </tr>
            `;
    });
  });

  const quoteDate = new Date(
    data.quote.date.split('.').reverse().join('-')
  ).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html lang="${lang.toLowerCase()}">
    <head>
        <meta charset="UTF-8">
        <title>Teklif - ${data.quote.number}</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                margin: 0; 
                padding: 0; 
                background-color: #f8f9fa;
                color: #343a40;
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
            }
            .page {
                background-color: white;
                width: 210mm;
                min-height: 297mm;
                margin: 20px auto;
                padding: 15mm;
                box-sizing: border-box;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                position: relative;
                display: flex;
                flex-direction: column;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding-bottom: 10px;
                border-bottom: 3px solid #004a99;
                gap: 20px; /* Logo, QR ve info arasında boşluk */
            }
            .header-left {
                display: flex;
                align-items: center;
                gap: 20px;
            }
            .header img.logo {
                width: 180px; /* Logoyu biraz küçült */
                height: auto;
            }
            .header img.qr-code {
                width: 80px; /* QR kod boyutu */
                height: 80px;
            }
            .header-info {
                text-align: right;
                font-size: 11px;
                flex-shrink: 0; /* Bilgi kutusunun küçülmesini engelle */
            }
            .content { flex-grow: 1; }
            h1 {
                text-align: center;
                color: #004a99;
                font-size: 24px;
                margin: 20px 0;
                font-weight: 600;
                letter-spacing: 1px;
            }
            .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
                font-size: 12px;
            }
            .details-box {
                border: 1px solid #dee2e6;
                padding: 15px;
                border-radius: 5px;
            }
            .details-box h2 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #004a99;
                border-bottom: 1px solid #e9ecef;
                padding-bottom: 5px;
            }
            .details-box p { margin: 5px 0; }
            .details-box strong { color: #495057; }
            .item-description { font-size: 11px; line-height: 1.4; }
            .item-description strong { font-weight: 600; color: #343a40; }
            .item-description u { text-decoration: underline; font-weight: bold; }
            .item-description p { margin: 4px 0; }
            .item-description ul { margin: 5px 0; padding-left: 18px; list-style-type: '• '; }
            .group-header { background-color: #e9ecef; }
            .group-header > td { border-top: 2px solid #004a99; border-bottom: 2px solid #004a99; }
            .item-detail-row > td { border: none; padding-top: 5px; padding-bottom: 15px; }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 12px;
            }
            th, td {
                border: 1px solid #dee2e6;
                padding: 10px;
                text-align: left;
            }
            thead {
                background-color: #004a99;
                color: white;
            }
            th { font-weight: 600; }
            tbody tr:nth-child(even) { background-color: #f8f9fa; }
            .totals {
                margin-top: 20px;
                width: 45%;
                margin-left: auto;
            }
            .totals table { font-size: 13px; }
            .totals td:first-child { font-weight: bold; }
            .totals td:last-child { text-align: right; font-weight: bold; }
            .conditions {
                margin-top: 30px;
                font-size: 11px;
                border: 1px solid #dee2e6;
                padding: 15px;
                border-radius: 5px;
            }
            .conditions h2 { margin-top: 0; font-size: 14px; color: #004a99; }
            .conditions ul {
                padding-left: 0;
                list-style: none;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            .footer {
                text-align: center;
                margin-top: auto;
                padding-top: 10px;
                border-top: 1px solid #e9ecef;
                font-size: 10px;
                color: #6c757d;
            }
            .no-print {
                position: fixed;
                top: 10px;
                right: 10px;
            }
            .print-button { padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
            .print-button:hover { background-color: #218838; }
            @media print {
                body { background-color: white; margin: 0; padding: 0; }
                .page { margin: 0; box-shadow: none; border: none; height: 100vh; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="no-print">
            <button class="print-button" onclick="window.api.send('print-to-pdf')">PDF'e Çevir</button>
        </div>
        <div class="page">
            <header class="header">
                <div class="header-left">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="EPC Logo" class="logo">` : '<h1>EPC Electronic</h1>'}
                    ${qrCodeBase64 ? `<img src="${qrCodeBase64}" alt="Doğrulama Kodu" class="qr-code">` : ''}
                </div>
                <div class="header-info">
                    <strong>EPC Enerji ve Güç Dönüşüm Sistemleri A.Ş.</strong><br>
                    Mareşal Fevzi Çakmak Cad, Esenşehir, Pırlanta Sokağı No:61<br>
                    Ümraniye / İstanbul / TÜRKİYE<br>
                    Tel: +90 (232) 376 75 15<br>
                    Email: sales@epcas.com.tr<br>
                    Web: www.epcas.com.tr
                </div>
            </header>
            <div class="content">
                <h1>${t.title}</h1>
                <div class="details-grid">
                    <div class="details-box">
                        <h2>${t.customerInfo}</h2>
                        <p><strong>${t.company}:</strong> ${data.customer.name}</p>
                        <p><strong>${t.contact}:</strong> ${data.customer.contact}</p>
                    </div>
                    <div class="details-box">
                        <h2>${t.quoteInfo}</h2>
                        <p><strong>${t.quoteNo}:</strong> ${data.quote.number}</p>
                        <p><strong>${t.date}:</strong> ${quoteDate}</p>
                        <p><strong>${t.preparedBy}:</strong> ${data.quote.preparedBy}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">${t.itemNo}</th>
                            <th style="width: 50%;">${t.itemDesc}</th>
                            <th style="width: 10%; text-align: center;">${t.itemQty}</th>
                            <th style="width: 17%; text-align: right;">${t.itemUnitCost}</th>
                            <th style="width: 18%; text-align: right;">${t.itemTotalCost}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div class="totals">
                    <table>
                        <tr>
                            <td>${t.grandTotal}</td>
                            <td>${grandTotal.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.quote.currency}</td>
                        </tr>
                    </table>
                </div>

                <div class="conditions">
                    <h2>${t.conditionsTitle}</h2>
                    <ul>
                        <li><strong>${t.incoterms}:</strong> ${data.quote.incoterms}</li>
                        <li><strong>${t.deliveryTime}:</strong> ${data.quote.deliveryTime}</li>
                        <li><strong>${t.paymentCondition}:</strong> ${data.quote.paymentCondition}</li>
                        <li><strong>${t.validity}:</strong> ${data.quote.validity}</li>
                        <li><strong>${t.origin}:</strong> ${data.quote.origin}</li>
                        <li><strong>${t.packing}:</strong> ${data.quote.packing}</li>
                    </ul>
                </div>
            </div>
            <footer class="footer">
                ${t.footerText(data.quote.validity)}
            </footer>
        </div>
    </body>
    </html>
    `;
}

// Uygulama kapandığında server'ı kapat
app.on('window-all-closed', () => {
  if (server) {
    server.close(() => {
      console.log('Server closed');
    });
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Login endpoint'i
expressApp.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username });

  try {
    const query = {
      text: 'SELECT * FROM users WHERE username = $1',
      values: [username],
    };
    console.log('Executing query:', query);

    const result = await pool.query(query);
    console.log('Query result:', result.rows);

    if (result.rows.length === 0) {
      console.log('User not found');
      return res.status(401).json({
        success: false,
        error: 'Kullanıcı adı veya şifre hatalı',
      });
    }

    const user = result.rows[0];

    // Bcrypt ile şifre karşılaştırma
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('Password check:', {
      id: user.id,
      username: user.username,
      password_match: passwordMatch,
    });

    if (!passwordMatch) {
      console.log('Password mismatch');
      return res.status(401).json({
        success: false,
        error: 'Kullanıcı adı veya şifre hatalı',
      });
    }

    // Başarılı giriş
    console.log('Login successful');
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Giriş işlemi sırasında bir hata oluştu',
    });
  }
});

// Register endpoint
expressApp.post('/api/auth/register', async (req, res) => {
  const { username, email, password, full_name, department } = req.body;

  try {
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, email, password, full_name, department, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, username, email, full_name, department',
      [username, email, hashedPassword, full_name, department]
    );

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Kayıt işlemi sırasında bir hata oluştu',
    });
  }
});

// macOS için
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Hata yakalama
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Rectifier sayfası için handler - Direkt pricing sayfasına yönlendir
ipcMain.handle('open-rectifier', () => {
  try {
    console.log('Handler: Opening rectifier pricing page...');
    const rectifierPath = path.join(
      __dirname,
      'src',
      'pages',
      'rectifier-pricing.html'
    );
    console.log('Loading file:', rectifierPath);

    // Sayfa yüklenirken webPreferences'ı koruyalım
    mainWindow.loadFile(rectifierPath, {
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: path.join(__dirname, 'src/scripts/preload.js'),
      },
    });

    return true;
  } catch (error) {
    console.error('Navigation error:', error);
    throw error;
  }
});

// Yönlendirme işleyicileri
ipcMain.handle('navigate-to-main', () => {
  mainWindow.loadFile(path.join(__dirname, 'src', 'pages', 'index.html'));
});

ipcMain.handle('open-industrial-rectifier', () => {
  // Industrial rectifier sayfasını aç
});

ipcMain.handle('open-modular-rectifier', () => {
  // Modular rectifier sayfasını aç
});

ipcMain.handle('open-sd-datasheet', () => {
  // SD serisi datasheet'i aç
  shell.openExternal(
    '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data\\datasheets\\SD_Series.pdf'
  );
});

ipcMain.handle('open-sd-user-manual', () => {
  // SD serisi kullanım kılavuzunu aç
  shell.openExternal(
    '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data\\user_manuals\\SD_Series.pdf'
  );
});

ipcMain.handle('open-sdm-datasheet', () => {
  // SDM serisi datasheet'i aç
  shell.openExternal(
    '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data\\datasheets\\SDM_Series.pdf'
  );
});

ipcMain.handle('open-sdm-user-manual', () => {
  // SDM serisi kullanım kılavuzunu aç
  shell.openExternal(
    '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data\\user_manuals\\SDM_Series.pdf'
  );
});

// Pencere kontrolleri ve navigasyon
ipcMain.on('window-control', (event, action) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;

  console.log(`Window control: ${action}`);

  switch (action) {
    case 'minimize':
      win.minimize();
      break;
    case 'close':
      win.close();
      break;
  }
});

// Sayfa geçişleri için
ipcMain.on('navigate', (event, page) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.loadFile(path.join(__dirname, 'src', 'pages', page));
  }
});

// Pricing sayfası için handler
ipcMain.handle('navigate-to-pricing', () => {
  try {
    console.log('Handler: Navigating to pricing...');
    const pricingPath = path.join(__dirname, 'src', 'pages', 'pricing.html');
    console.log('Loading file:', pricingPath);

    mainWindow
      .loadFile(pricingPath)
      .then(() => {
        console.log('Pricing page loaded successfully');
      })
      .catch((err) => {
        console.error('Pricing page load error:', err);
      });

    return true;
  } catch (error) {
    console.error('Navigation error:', error);
    throw error;
  }
});

// Rectifier sayfasına dönüş için handler - Pricing sayfasına yönlendir
ipcMain.handle('navigate-to-rectifier', () => {
  try {
    console.log('Handler: Navigating back to rectifier pricing...'); // Debug için
    const rectifierPath = path.join(
      __dirname,
      'src',
      'pages',
      'rectifier-pricing.html'
    );
    console.log('Loading file:', rectifierPath); // Debug için
    mainWindow.loadFile(rectifierPath);
    return true;
  } catch (error) {
    console.error('Navigation error:', error);
    throw error;
  }
});

// Kaydetme dialog'u için handler
ipcMain.handle('show-save-dialog', async (event, options) => {
  try {
    console.log('Show save dialog options:', options);
    const result = await dialog.showSaveDialog(options);
    console.log('Save dialog result:', result);
    return result; // Dialog sonucunu olduğu gibi döndür
  } catch (error) {
    console.error('Save dialog error:', error);
    return {
      canceled: true,
      error: error.message,
    };
  }
});

// Dosya seçme dialog'u için handler
ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    // Mevcut pencereyi al
    const win = BrowserWindow.fromWebContents(event.sender);
    
    // Dialog seçeneklerini hazırla
    const dialogOptions = {
      title: options.title || 'Dosya Seç',
      filters: options.filters || [
        { name: 'Tüm Dosyalar', extensions: ['*'] }
      ],
      properties: options.properties || ['openFile'],
    };
    
    // showOpenDialog çağrısı - Electron'un yeni API'sine göre
    const result = await dialog.showOpenDialog(win, dialogOptions);
    
    return result;
  } catch (error) {
    console.error('Open dialog error:', error);
    return {
      canceled: true,
      filePaths: [],
      error: error.message,
    };
  }
});

// Excel aktarma handler'ını güncelle
ipcMain.handle('export-excel', async (event, data) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Tüm verileri birleştir
    const allRows = [data.headers, ...data.rows];

    if (data.totals) {
      allRows.push(data.emptyRow);
      allRows.push(data.totals);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(allRows);

    // Başlık satırı için stil
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4A5568' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Toplam satırı için stil
    if (data.totals) {
      const lastRow = range.e.r;
      for (let C = range.s.c; C <= range.e.c; C++) {
        const address = XLSX.utils.encode_col(C) + lastRow;
        if (!worksheet[address]) continue;
        worksheet[address].s = {
          font: { bold: true },
          border: {
            top: { style: 'medium' },
          },
        };
      }
    }

    // Sütun genişliklerini ayarla
    worksheet['!cols'] = [
      { wch: 5 }, // No
      { wch: 40 }, // Ürün
      { wch: 12 }, // Maliyet
      { wch: 8 }, // Adet
      { wch: 15 }, // Toplam Maliyet
      { wch: 10 }, // Margin-1
      { wch: 10 }, // Margin-2
      { wch: 15 }, // Toplam M-1
      { wch: 15 }, // Toplam M-2
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fiyat Listesi');

    // Kullanıcının seçtiği konuma kaydet
    if (data.filePath) {
      XLSX.writeFile(workbook, data.filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Excel aktarma hatası:', error);
    throw error;
  }
});

// Excel verilerini almak için IPC handler
ipcMain.handle('get-excel-data', async () => {
  try {
    if (!excelData) {
      await loadExcelData();
    }
    return excelData;
  } catch (error) {
    console.error('Excel veri alma hatası:', error);
    throw error;
  }
});

ipcMain.handle('get-product-types', () => {
  try {
    if (!excelData) {
      throw new Error('Excel data is not loaded');
    }
    const productTypes = [
      ...new Set(excelData.map((row) => row['Product Type'])),
    ];
    return productTypes;
  } catch (error) {
    console.error('Error getting product types:', error);
    throw error;
  }
});

ipcMain.handle('get-subtypes', (event, productType) => {
  try {
    if (!excelData) {
      throw new Error('Excel data is not loaded');
    }
    const subtypes = excelData
      .filter(
        (row) =>
          row['Product Type'] === productType &&
          row['Subtype'] &&
          row['Subtype'] !== 'NaN'
      )
      .map((row) => ({
        subtype: row['Subtype'],
        cost: row['Cost'],
      }));

    return {
      hasSubtypes: subtypes.length > 0,
      subtypes: subtypes,
    };
  } catch (error) {
    console.error('Error getting subtypes:', error);
    throw error;
  }
});

// UPS sayfasına yönlendirme için IPC handler
ipcMain.handle('navigate-to-ups', () => {
  mainWindow.loadFile('src/pages/ups.html');
});

ipcMain.handle('open-file', (event, filePath) => {
  shell.openPath(filePath);
  return true;
});

// Word belgesi oluşturma işleyicisi
ipcMain.handle('generate-quote-document', async (event, quoteData) => {
  try {
    console.log('Generating quote document with data:', quoteData);

    // belgem.xml dosyasını oku
    const templatePath = path.join(__dirname, 'belgem.xml');
    const content = fs.readFileSync(templatePath, 'utf8');

    // Docxtemplater ile içeriği işle
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Items verilerini hazırla (en fazla 5 ürün yükle, Word şablonumuzda 5 satır var)
    const items = quoteData.items || [];

    // Template verilerini hazırla
    const templateData = {
      company_name: quoteData.company_name || '',
      company_person: quoteData.company_person || '',
      quotation_number:
        quoteData.number ||
        `TKF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      Incoterms: quoteData.incoterms || 'EXW',
      packing_type: quoteData.packing_type || 'Standart',
      estimated_delevery_time: quoteData.delivery_time || '4-6 Hafta',
      payment_condition:
        quoteData.payment_condition || '%50 Sipariş, %50 Teslimat',
      country_of_origin: quoteData.origin || 'Türkiye',
      subtotal: quoteData.total_price || '0.00',
    };

    // Her ürün için ayrı veri ekle (XML şablonundaki alanlarla eşleşecek şekilde)
    if (items.length > 0) {
      // İlk 5 ürünü ekleyelim (şablonda 5 satır var)
      const maxItems = Math.min(items.length, 5);
      for (let i = 0; i < maxItems; i++) {
        const item = items[i];
        templateData[`item${i + 1}_description`] = item.product || '';
        templateData[`item${i + 1}_price`] =
          `${item.price.toFixed(2)}$` || '0.00$';
        templateData[`item${i + 1}_quantity`] = item.quantity || 1;
        templateData[`item${i + 1}_total`] =
          `${(item.price * item.quantity).toFixed(2)}$` || '0.00$';
      }
    }

    // Template'i doldur
    doc.setData(templateData);

    // Template'i işle
    doc.render();

    // Kaydetme dialog'unu göster
    const saveOptions = {
      title: 'Teklif Belgesi Kaydet',
      defaultPath: `EPC_Teklif_${quoteData.number || new Date().toISOString().slice(0, 10)}.docx`,
      filters: [{ name: 'Word Belgeleri', extensions: ['docx'] }],
    };

    const saveResult = await dialog.showSaveDialog(saveOptions);
    if (saveResult.canceled) {
      console.log('Belge kaydetme işlemi iptal edildi');
      return { success: false, message: 'Belge kaydetme işlemi iptal edildi' };
    }

    // İşlenmiş içeriği buffer olarak al
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    // Dosyayı kaydet
    fs.writeFileSync(saveResult.filePath, buffer);

    console.log('Belge başarıyla oluşturuldu:', saveResult.filePath);
    return {
      success: true,
      filePath: saveResult.filePath,
    };
  } catch (error) {
    console.error('Word belgesi oluşturma hatası:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Excel verilerini okumak için IPC handler
ipcMain.handle('read-excel', async (event, type) => {
  let excelPath;
  const basePath =
    '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/';
  const originalType = type; // Hata mesajları için orijinal tipi sakla

  console.log(`[read-excel] Received request for type: "${type}"`);

  try {
    switch (type) {
      case 'Inverter':
        excelPath = path.join(basePath, 'Inverter.xlsx');
        break;
      case 'UPS':
      case '3 Phase UPS':
        excelPath = path.join(basePath, '3 Phase UPS.xlsx');
        break;
      case 'Rectifier':
        excelPath = path.join(basePath, 'Rectifier.xlsx');
        break;
      case 'Stabilizer':
      case 'Voltage Stabilizer':
        excelPath = path.join(basePath, 'Voltage Stabilizer.xlsx');
        break;
      case 'STS':
      case 'Static Transfer Switch':
        excelPath = path.join(basePath, 'Static Transfer Switch.xlsx');
        break;
      case 'Frequency_Converter':
      case 'FC':
        excelPath = path.join(basePath, 'Frequency Converter.xlsx');
        break;
      default:
        throw new Error(
          `Geçersiz veya tanınmayan ürün tipi: "${originalType}"`
        );
    }

    console.log(`[read-excel] Attempting to read file at path: ${excelPath}`);

    if (!fs.existsSync(excelPath)) {
      throw new Error(
        `Dosya bulunamadı: ${excelPath}. Lütfen dosya adını ve yolunu kontrol edin.`
      );
    }

    const workbook = XLSX.readFile(excelPath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
    });
    const sheetName = workbook.SheetNames[0];
    console.log(
      `[read-excel] Reading sheet: "${sheetName}" from file: "${path.basename(excelPath)}"`
    );

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(
        `"${sheetName}" adlı sayfa, "${path.basename(excelPath)}" dosyasında bulunamadı.`
      );
    }

    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: null,
    });

    // Veriyi temizle: Maliyet sütunundaki '$' işaretini kaldır ve sayıya çevir
    const cleanedData = data
      .map((row) => {
        if (row.Cost && typeof row.Cost === 'string') {
          row.Cost = parseFloat(row.Cost.replace(/[^0-9.-]/g, ''));
        }
        return row;
      })
      .filter((row) => row['Product Type']); // Boş satırları filtrele

    console.log(
      `[read-excel] Successfully read and processed ${cleanedData.length} rows for type "${originalType}".`
    );
    return cleanedData;
  } catch (error) {
    console.error(`[read-excel] Hata (${originalType}):`, error);
    // Hatayı renderer sürecine daha anlamlı bir şekilde geri gönder
    throw new Error(
      `"${originalType}" için veri okunurken hata oluştu: ${error.message}`
    );
  }
});

// Rectifier Component Excel dosyalarını okumak için IPC handler
ipcMain.handle('read-rectifier-component', async (event, componentType) => {
  const basePath =
    '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/';
  
  const fileMap = {
    'Terminals': { fileName: 'Rectifier.xlsx', sheetName: 'Terminals' },
    'CircuitBreakers': { fileName: 'Rectifier.xlsx', sheetName: 'CircuitBreakers' },
    'CurrentReadingCards': { fileName: 'Rectifier.xlsx', sheetName: 'CurrentReadingCards' },
    'FreewheelingDiodes': { fileName: 'Rectifier.xlsx', sheetName: 'FreewheelingDiodes' },
    'Thyristors': { fileName: 'Rectifier.xlsx', sheetName: 'Thyristors' },
    'DCChokes': { fileName: 'Rectifier.xlsx', sheetName: 'DCComponents' },
    'DCCapacitors': { fileName: 'Rectifier.xlsx', sheetName: 'DCComponents' },
    'Transformers': { fileName: 'Rectifier.xlsx', sheetName: 'Transformers' },
    'CoolingComponents': { fileName: 'Rectifier.xlsx', sheetName: 'CoolingComponents' },
    'DiodeDroppers': { fileName: 'Rectifier.xlsx', sheetName: 'DiodeDroppers' },
    'Relays': { fileName: 'Rectifier.xlsx', sheetName: 'Relays' },
    'ControlCards': { fileName: 'Rectifier.xlsx', sheetName: 'ControlCards' },
    'MeasurementInstruments': { fileName: 'Rectifier.xlsx', sheetName: 'MeasurementInstruments' },
    'CommunicationComponents': { fileName: 'Rectifier.xlsx', sheetName: 'CommunicationComponents' },
    'CommunicationProtocols': { fileName: 'Rectifier.xlsx', sheetName: 'CommunicationProtocols' },
    'RelayAlarmOutputs': { fileName: 'Rectifier.xlsx', sheetName: 'RelayAlarmOutputs' },
    'Cabinets': { fileName: 'Rectifier.xlsx', sheetName: 'Cabinets' },
  };

  const fileInfo = fileMap[componentType];
  if (!fileInfo) {
    throw new Error(`Geçersiz component tipi: ${componentType}`);
  }

  // fileInfo bir obje ise (fileName ve sheetName içeriyor) veya string ise (eski format - geriye dönük uyumluluk)
  const fileName = typeof fileInfo === 'object' ? fileInfo.fileName : fileInfo;
  const specifiedSheetName = typeof fileInfo === 'object' ? fileInfo.sheetName : null;

  const excelPath = path.join(basePath, fileName);

  try {
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Dosya bulunamadı: ${excelPath}`);
    }

    const workbook = XLSX.readFile(excelPath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    // Sayfa adı belirtilmişse onu kullan, değilse ilk sayfayı kullan
    const sheetName = specifiedSheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sayfa bulunamadı: ${sheetName}`);
    }

    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: null,
    });

    // Cost kolonunu temizle
    let cleanedData = data
      .map((row) => {
        if (row.Cost && typeof row.Cost === 'string') {
          row.Cost = parseFloat(row.Cost.replace(/[^0-9.-]/g, ''));
        }
        return row;
      })
      .filter((row) => row['Product Type']); // Boş satırları filtrele

    // DCComponents sayfası için özel filtreleme
    if (componentType === 'DCChokes' && sheetName === 'DCComponents') {
      cleanedData = cleanedData.filter((row) => 
        row['Product Type'] === 'DC Choke' || 
        row['Product Type'] === 'DCChoke' ||
        row['Product Type']?.includes('Choke')
      );
    } else if (componentType === 'DCCapacitors' && sheetName === 'DCComponents') {
      cleanedData = cleanedData.filter((row) => 
        row['Product Type'] === 'DC Capacitor' || 
        row['Product Type'] === 'DCCapacitor' ||
        row['Product Type']?.includes('Capacitor')
      );
    }

    console.log(
      `[read-rectifier-component] Loaded ${cleanedData.length} items from ${fileName} (Sheet: ${sheetName})`
    );
    
    // Debug: İlk satırın kolon isimlerini göster
    if (cleanedData.length > 0) {
      console.log(`[read-rectifier-component] Columns:`, Object.keys(cleanedData[0]).join(', '));
    }
    
    return cleanedData;
  } catch (error) {
    console.error(`[read-rectifier-component] Error:`, error);
    throw new Error(
      `"${componentType}" için veri okunurken hata oluştu: ${error.message}`
    );
  }
});

// Rectifier PDF oluşturma handler
ipcMain.handle('generate-rectifier-pdf', async (event, htmlContent) => {
  try {
    const { BrowserWindow } = require('electron');
    
    // Logoyu base64 formatına çevir
    let logoBase64 = '';
    try {
      // Önce custom logo yolunu kontrol et
      const customLogoPath = htmlContent.match(/<!-- Custom Logo: (.+?) -->/);
      let logoPath;
      
      // Logo container'ın olup olmadığını kontrol et (OEM modunda olmayabilir)
      const hasLogoContainer = htmlContent.includes('<div class="logo-container">');
      
      if (!hasLogoContainer) {
        // OEM modu - logo yok, container da yok
        logoBase64 = '';
      } else if (customLogoPath && customLogoPath[1]) {
        // Custom logo varsa onu kullan
        logoPath = customLogoPath[1].trim();
        if (fs.existsSync(logoPath)) {
          const logoFile = fs.readFileSync(logoPath);
          const ext = path.extname(logoPath).toLowerCase();
          const mimeType = ext === '.png' ? 'png' : ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : 'png';
          logoBase64 = `data:image/${mimeType};base64,${logoFile.toString('base64')}`;
        } else {
          console.warn('Custom logo dosyası bulunamadı:', logoPath);
          // Fallback: varsayılan EPC logosu
          logoPath = path.join(__dirname, 'src/assets/images/EPC_logo1.png');
          if (fs.existsSync(logoPath)) {
            const logoFile = fs.readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoFile.toString('base64')}`;
          }
        }
      } else {
        // Varsayılan EPC logosu (Default mod veya logo modu belirtilmemiş)
        logoPath = path.join(__dirname, 'src/assets/images/EPC_logo1.png');
        if (fs.existsSync(logoPath)) {
          const logoFile = fs.readFileSync(logoPath);
          logoBase64 = `data:image/png;base64,${logoFile.toString('base64')}`;
        }
      }
    } catch (error) {
      console.error('Logo yüklenemedi:', error);
    }

    // HTML içeriğinde logo placeholder'ları değiştir (sadece logo varsa)
    if (logoBase64 && htmlContent.includes('<div class="logo-container">')) {
      htmlContent = htmlContent.replace(
        /<!-- (Custom Logo: .+?|Logo buraya eklenecek) -->/g,
        `<img src="${logoBase64}" alt="Logo" style="height: 45px; width: auto;">`
      );
    } else if (htmlContent.includes('<div class="logo-container">') && !logoBase64) {
      // Logo container var ama logo yoksa (OEM modu), container'ı kaldır
      htmlContent = htmlContent.replace(
        /<div class="logo-container">\s*<!-- .+? -->\s*<\/div>/g,
        ''
      );
    }
    
    // Yeni bir pencere oluştur (görünmez)
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // HTML içeriğini yükle
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    // Sayfanın yüklenmesini bekle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // PDF kaydetme diyaloğu
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'PDF Olarak Kaydet',
      defaultPath: `Rectifier_Tasarim_Onay_${new Date().toISOString().split('T')[0]}.pdf`,
      filters: [
        { name: 'PDF Dosyaları', extensions: ['pdf'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] },
      ],
    });

    if (!canceled && filePath) {
      // PDF oluştur
      const pdfData = await win.webContents.printToPDF({
        marginsType: 0,
        printBackground: true,
        pageSize: 'A4',
      });

      // PDF'i kaydet
      fs.writeFileSync(filePath, pdfData);

      // Pencereyi kapat
      win.close();

      // Kullanıcıya bildirim
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Başarılı',
        message: `PDF dosyası başarıyla kaydedildi:\n${filePath}`,
      });

      return { success: true, filePath };
    }

    win.close();
    return { success: false, canceled: true };
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    throw new Error(`PDF oluşturulurken hata oluştu: ${error.message}`);
  }
});
