/**
 * EPC Web App - Standalone Server (Electron'suz)
 * Electron bağımlılığı olmadan web tarayıcısından çalışır.
 *
 * Kullanım: node server-standalone.js
 * veya: npm run web
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const XLSX = require('xlsx');
const { Pool } = require('pg');

// Config
const credentials = require('./src/config/credentials.json');
const pool = new Pool(credentials.database);
const EXCEL_BASE_PATH =
  '\\\\10.0.0.3\\c$\\Users\\epcsql\\Desktop\\masaustu_uygulama_data';
const CONFIG_PATH = path.join(EXCEL_BASE_PATH, 'config');
const EXCEL_PATH = path.join(EXCEL_BASE_PATH, 'fiyatlandırma excel');

const app = express();
const PORT = process.env.PORT || 3110;

// In-memory cart (session yerine basit bellek - production'da Redis/DB kullanın)
let quoteCart = [];

// Excel cache
let excelData = null;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'src')));

// ============ EXCEL HELPERS (main.js'den) ============
async function loadExcelData() {
  try {
    const filePath = path.join(EXCEL_PATH, 'Inverter.xlsx');
    if (!fs.existsSync(filePath)) {
      console.warn('Excel bulunamadı:', filePath);
      return [];
    }
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: null,
      header: 1,
    });
    const headers = rawData[0];
    excelData = rawData
      .slice(1)
      .map((row) => {
        const rowData = {};
        headers.forEach((header, index) => {
          if (header === 'Cost' && typeof row[index] === 'string') {
            rowData[header] = parseFloat(
              String(row[index]).replace(/[^0-9.-]+/g, '')
            );
          } else {
            rowData[header] = row[index];
          }
        });
        return rowData;
      })
      .filter((row) => row['Product Type']);
    return excelData;
  } catch (error) {
    console.error('Excel yükleme hatası:', error);
    return [];
  }
}

function readExcelByType(type) {
  const fileMap = {
    Inverter: 'Inverter.xlsx',
    '3 Phase UPS': '3 Phase UPS.xlsx',
    UPS: '3 Phase UPS.xlsx',
    Rectifier: 'Rectifier.xlsx',
    'Voltage Stabilizer': 'Voltage Stabilizer.xlsx',
    Stabilizer: 'Voltage Stabilizer.xlsx',
    'Static Transfer Switch': 'Static Transfer Switch.xlsx',
    STS: 'Static Transfer Switch.xlsx',
    'Frequency Converter': 'Frequency Converter.xlsx',
    FC: 'Frequency Converter.xlsx',
  };
  const fileName = fileMap[type] || `${type}.xlsx`;
  const filePath = path.join(EXCEL_PATH, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    cellNF: false,
    cellText: false,
  });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });
  return data
    .map((row) => {
      if (row.Cost && typeof row.Cost === 'string') {
        row.Cost = parseFloat(String(row.Cost).replace(/[^0-9.-]/g, ''));
      }
      return row;
    })
    .filter((row) => row['Product Type']);
}

// ============ API ROUTES ============

// Mevcut API router
app.use('/api', require('./src/server/api'));

// Excel API
app.get('/api/excel/data', async (req, res) => {
  try {
    if (!excelData) await loadExcelData();
    res.json(excelData || []);
  } catch (error) {
    console.error('Excel data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/excel/:type', (req, res) => {
  try {
    const data = readExcelByType(req.params.type);
    res.json(data);
  } catch (error) {
    console.error('Excel read error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Excel okunamadı',
    });
  }
});

app.get('/api/excel/product-types', async (req, res) => {
  try {
    if (!excelData) await loadExcelData();
    const types = [...new Set((excelData || []).map((r) => r['Product Type']))];
    res.json(types);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/excel/subtypes/:productType', async (req, res) => {
  try {
    if (!excelData) await loadExcelData();
    const subtypes = (excelData || [])
      .filter(
        (r) =>
          r['Product Type'] === req.params.productType &&
          r['Subtype'] &&
          r['Subtype'] !== 'NaN'
      )
      .map((r) => ({ subtype: r['Subtype'], cost: r['Cost'] }));
    res.json({ hasSubtypes: subtypes.length > 0, subtypes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rectifier component Excel
app.get('/api/excel/rectifier/:componentType', (req, res) => {
  const fileMap = {
    Terminals: { fileName: 'Rectifier.xlsx', sheetName: 'Terminals' },
    CircuitBreakers: {
      fileName: 'Rectifier.xlsx',
      sheetName: 'CircuitBreakers',
    },
    CurrentReadingCards: {
      fileName: 'Rectifier.xlsx',
      sheetName: 'CurrentReadingCards',
    },
    FreewheelingDiodes: {
      fileName: 'Rectifier.xlsx',
      sheetName: 'FreewheelingDiodes',
    },
    Thyristors: { fileName: 'Rectifier.xlsx', sheetName: 'Thyristors' },
    DCChokes: { fileName: 'Rectifier.xlsx', sheetName: 'DCComponents' },
    DCCapacitors: { fileName: 'Rectifier.xlsx', sheetName: 'DCComponents' },
    Transformers: { fileName: 'Rectifier.xlsx', sheetName: 'Transformers' },
    CoolingComponents: {
      fileName: 'Rectifier.xlsx',
      sheetName: 'CoolingComponents',
    },
    DiodeDroppers: { fileName: 'Rectifier.xlsx', sheetName: 'DiodeDroppers' },
    Relays: { fileName: 'Rectifier.xlsx', sheetName: 'Relays' },
    ControlCards: { fileName: 'Rectifier.xlsx', sheetName: 'ControlCards' },
    MeasurementInstruments: {
      fileName: 'Rectifier.xlsx',
      sheetName: 'MeasurementInstruments',
    },
    CommunicationComponents: {
      fileName: 'Rectifier.xlsx',
      sheetName: 'CommunicationComponents',
    },
    CommunicationProtocols: {
      fileName: 'Rectifier.xlsx',
      sheetName: 'CommunicationProtocols',
    },
    RelayAlarmOutputs: {
      fileName: 'Rectifier.xlsx',
      sheetName: 'RelayAlarmOutputs',
    },
    Cabinets: { fileName: 'Rectifier.xlsx', sheetName: 'Cabinets' },
  };
  const fileInfo = fileMap[req.params.componentType];
  if (!fileInfo) {
    return res
      .status(400)
      .json({ success: false, error: 'Geçersiz component tipi' });
  }
  try {
    const filePath = path.join(EXCEL_PATH, fileInfo.fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Dosya bulunamadı: ${filePath}`);
    }
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
    });
    const sheetName = fileInfo.sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Sayfa bulunamadı: ${sheetName}`);
    }
    let data = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: null,
    });
    data = data
      .map((row) => {
        if (row.Cost && typeof row.Cost === 'string') {
          row.Cost = parseFloat(String(row.Cost).replace(/[^0-9.-]/g, ''));
        }
        return row;
      })
      .filter((row) => row['Product Type']);
    if (req.params.componentType === 'DCChokes') {
      data = data.filter((r) => {
        const pt = String(r['Product Type'] || '').trim();
        const lower = pt.toLowerCase();
        return (
          pt === 'DC Choke' ||
          pt === 'DCChoke' ||
          lower.includes('choke') ||
          lower.includes('şok') ||
          lower.includes('chok')
        );
      });
    } else if (req.params.componentType === 'DCCapacitors') {
      data = data.filter(
        (r) =>
          r['Product Type']?.includes('Capacitor') ||
          r['Product Type'] === 'DCCapacitor'
      );
    }
    res.json(data);
  } catch (error) {
    console.error('Rectifier component error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cart API
app.get('/api/cart', (req, res) => {
  res.json(quoteCart);
});

app.post('/api/cart', (req, res) => {
  quoteCart.push(req.body);
  res.json({ success: true, count: quoteCart.length });
});

app.delete('/api/cart/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (index >= 0 && index < quoteCart.length) {
    quoteCart.splice(index, 1);
  }
  res.json({ success: true, count: quoteCart.length });
});

app.delete('/api/cart', (req, res) => {
  quoteCart = [];
  res.json({ success: true, count: 0 });
});

// Components find (central config)
app.post('/api/components/find', (req, res) => {
  const componentSpecs = req.body;
  const foundComponents = [];
  try {
    const transformersPath = path.join(CONFIG_PATH, 'transformers.json');
    if (fs.existsSync(transformersPath)) {
      const transformers = JSON.parse(
        fs.readFileSync(transformersPath, 'utf-8')
      );
      transformers.sort((a, b) => a.kva - b.kva);
      const requiredKva = parseFloat(componentSpecs.transformer?.kva);
      const found = transformers.find(
        (t) =>
          t.kva >= requiredKva &&
          t.phase === componentSpecs.transformer?.phase &&
          t.inputVoltage === componentSpecs.transformer?.inputVoltage
      );
      if (found) {
        foundComponents.push({ ...found, productType: 'Transformer' });
      }
    }
    const breakersPath = path.join(CONFIG_PATH, 'breakers.json');
    if (fs.existsSync(breakersPath)) {
      const breakers = JSON.parse(fs.readFileSync(breakersPath, 'utf-8'));
      breakers.sort((a, b) => a.max_current - b.max_current);
      ['inputBreaker', 'batteryBreaker', 'outputBreaker'].forEach((key, i) => {
        const names = [
          'Giriş Kesicisi',
          'Batarya Kesicisi',
          'Çıkış Kesicisi',
        ];
        const current = parseFloat(componentSpecs[key]?.current);
        const found = breakers.find(
          (b) =>
            current >= b.min_current && current <= b.max_current
        );
        if (found) {
          foundComponents.push({
            ...found,
            name: `${names[i]} - ${found.name}`,
            productType: 'Breaker',
          });
        }
      });
    }
    res.json({ success: true, components: foundComponents });
  } catch (error) {
    console.error('Components find error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Web mode flag (frontend için)
app.get('/api/web-mode', (req, res) => {
  res.json({ webMode: true });
});

// Canlı döviz kuru (cdn.jsdelivr.net/fawazahmed0 — ücretsiz, API key gerekmez)
let _ratesCache = null;
let _ratesCacheAt = 0;
const RATES_TTL_MS = 10 * 60 * 1000; // 10 dakika cache

app.get('/api/exchange-rates', async (req, res) => {
  try {
    const now = Date.now();
    if (_ratesCache && now - _ratesCacheAt < RATES_TTL_MS) {
      return res.json(_ratesCache);
    }

    const response = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
    );
    if (!response.ok) throw new Error('Kur verisi alınamadı');
    const data = await response.json();
    const usd = data.usd || {};

    const usdTry = usd.try  ?? null;
    const usdEur = usd.eur  ?? null;
    const eurTry = (usdTry && usdEur) ? +(usdTry / usdEur).toFixed(4) : null;

    const payload = {
      success: true,
      date: data.date || new Date().toISOString().slice(0, 10),
      rates: { USD_TRY: usdTry, EUR_TRY: eurTry, USD_EUR: usdEur },
    };

    _ratesCache = payload;
    _ratesCacheAt = now;
    res.json(payload);
  } catch (err) {
    console.error('Exchange rate error:', err.message);
    // Cache'den döndür (varsa)
    if (_ratesCache) return res.json({ ..._ratesCache, cached: true });
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ STATIC & SPA ============
app.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

// ============ START ============
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected');
  }
});

function startServer(port) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  EPC Web App - Standalone Server                    ║
║  http://localhost:${port}                              ║
║  Electron bağımlılığı YOK - Tarayıcıdan çalışır     ║
╚══════════════════════════════════════════════════════╝
  `);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} kullanımda, ${port + 1} deneniyor...`);
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}

startServer(PORT);
