/**
 * Web/Electron-dışı ortam: sepet, teklif taslağı, kuyruk, haftalık export, n8n uçları.
 */
const express = require('express');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const db = require('../../db/connection');
const logger = require('../logger');
const { authenticate, authenticateOptional, n8nApiKey } = require('../middleware/authMiddleware');
const config = require('../config');

// ─── Excel base path (env managed) ───────────────────────────────────────────
const EXCEL_BASE = config.excel.basePath;
const GENERATED_DOCS_BASE = path.join(process.cwd(), 'generated-docs');
const RECTIFIER_MAPPING_PATH = path.join(
  __dirname,
  '../../../RECTIFIER_EXCEL_MAPPING.json'
);

const { buildPricingExcelWorkbook } = require('../../scripts/excel/buildPricingExcelWorkbook');

const RECTIFIER_SOURCE_FILE = 'Rectifier.xlsx';
const RECTIFIER_SOURCE_PATH = path.join(EXCEL_BASE, RECTIFIER_SOURCE_FILE);
const RECTIFIER_COMPONENT_TYPES = [
  'Terminals',
  'CircuitBreakers',
  'CurrentReadingCards',
  'FreewheelingDiodes',
  'Thyristors',
  'DCChokes',
  'DCCapacitors',
  'Transformers',
  'CoolingComponents',
  'DiodeDroppers',
  'Relays',
  'ControlCards',
  'MeasurementInstruments',
  'CommunicationProtocols',
  'RelayAlarmOutputs',
  'Cabinets',
  'Options',
];

const RECTIFIER_COMPONENT_ALIASES = {
  terminals: 'terminals',
  circuitbreakers: 'circuitBreakers',
  currentreadingcards: 'currentReadingCards',
  freewheelingdiodes: 'freewheelingDiodes',
  thyristors: 'thyristors',
  dcchokes: 'dcComponents',
  dccapacitors: 'dcComponents',
  transformers: 'transformers',
  coolingcomponents: 'coolingComponents',
  diodedroppers: 'diodeDroppers',
  relays: 'relays',
  controlcards: 'controlCards',
  measurementinstruments: 'measurementInstruments',
  communicationprotocols: 'communicationProtocols',
  relayalarmoutputs: 'relayAlarmOutputs',
  cabinets: 'cabinets',
  options: 'options',
};

const RECTIFIER_DEFAULT_SHEETS = {
  terminals: 'Terminals',
  circuitBreakers: 'CircuitBreakers',
  currentReadingCards: 'CurrentReadingCards',
  freewheelingDiodes: 'FreewheelingDiodes',
  thyristors: 'Thyristors',
  dcComponents: 'DCComponents',
  transformers: 'Transformers',
  coolingComponents: 'CoolingComponents',
  diodeDroppers: 'DiodeDroppers',
  relays: 'Relays',
  controlCards: 'ControlCards',
  measurementInstruments: 'MeasurementInstruments',
  communicationProtocols: 'CommunicationProtocols',
  relayAlarmOutputs: 'RelayAlarmOutputs',
  cabinets: 'Cabinets',
  options: 'Options',
};

let rectifierMappingCache = null;

if (!fs.existsSync(RECTIFIER_SOURCE_PATH)) {
  logger.warn('rectifier source workbook missing on startup', {
    filePath: RECTIFIER_SOURCE_PATH,
  });
}

function normalizeComponentKey(componentType) {
  return String(componentType || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function normalizeTransformerTopology(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  if (normalized.includes('supply') || normalized.includes('besleme')) return 'SUPPLY';
  if (normalized.includes('12') || normalized.includes('b12c')) return 'B12C';
  if (normalized.includes('6') || normalized.includes('b6c')) return 'B6C';
  if (
    normalized.includes('single') ||
    normalized.includes('tek faz') ||
    normalized.includes('1 faz') ||
    normalized.includes('b2h')
  ) return 'B2H';
  return normalized.toUpperCase();
}

function getRectifierMapping() {
  if (rectifierMappingCache) return rectifierMappingCache;
  try {
    if (!fs.existsSync(RECTIFIER_MAPPING_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(RECTIFIER_MAPPING_PATH, 'utf8');
    rectifierMappingCache = JSON.parse(raw);
    return rectifierMappingCache;
  } catch (e) {
    logger.warn('rectifier mapping read failed', e.message);
    return null;
  }
}

function filterDcComponentsRows(componentType, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const key = normalizeComponentKey(componentType);
  if (key === 'dcchokes') {
    return rows.filter((row) => {
      const pt = String(row['Product Type'] || '').trim();
      const lower = pt.toLowerCase();
      return (
        pt === 'DC Choke' ||
        pt === 'DCChoke' ||
        lower.includes('choke') ||
        lower.includes('şok') ||
        lower.includes('chok')
      );
    });
  }
  if (key === 'dccapacitors') {
    return rows.filter((row) => {
      const pt = String(row['Product Type'] || '').trim();
      const lower = pt.toLowerCase();
      return (
        pt === 'DC Capacitor' ||
        pt === 'DCCapacitor' ||
        lower.includes('capacitor') ||
        lower.includes('kapasit')
      );
    });
  }
  return rows;
}

function resolveRectifierExcelSource(componentType) {
  const mapping = getRectifierMapping();
  const normalized = normalizeComponentKey(componentType);
  const mappedKey = RECTIFIER_COMPONENT_ALIASES[normalized];
  const excelFiles = mapping?.excelFiles || {};
  const mappedEntry = mappedKey ? excelFiles[mappedKey] : null;
  if (mappedEntry?.fileName || mappedEntry?.sheetName) {
    const mappedFileName = mappedEntry.fileName || RECTIFIER_SOURCE_FILE;
    const mappedFilePath = path.join(EXCEL_BASE, mappedFileName);
    const fileName = fs.existsSync(mappedFilePath) ? mappedFileName : RECTIFIER_SOURCE_FILE;
    return {
      fileName,
      sheetName: mappedEntry.sheetName || RECTIFIER_DEFAULT_SHEETS[mappedKey] || componentType,
      source: 'mapping',
    };
  }
  if (RECTIFIER_COMPONENT_TYPES.includes(componentType)) {
    const fallbackSheet = mappedKey
      ? RECTIFIER_DEFAULT_SHEETS[mappedKey]
      : componentType;
    return {
      fileName: RECTIFIER_SOURCE_FILE,
      sheetName: fallbackSheet || componentType,
      source: 'component-fallback',
    };
  }
  return null;
}

/**
 * Verilen Excel dosyasını (sheet bazlı) JSON array olarak okur.
 * @param {string} filePath  Tam dosya yolu
 * @param {string=} sheetName Sheet adı (opsiyonel)
 * @returns {Promise<object[]>}
 */
async function readExcelSheet(filePath, sheetName) {
  if (!fs.existsSync(filePath)) {
    const error = new Error(`File not found: ${filePath}`);
    error.code = 'EXCEL_FILE_NOT_FOUND';
    throw error;
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  let ws = null;
  if (sheetName) {
    const target = normalizeComponentKey(sheetName);
    ws =
      workbook.getWorksheet(sheetName) ||
      workbook.worksheets.find(
        (s) =>
          String(s.name || '').toLowerCase() === String(sheetName).toLowerCase()
      );
    if (!ws && target) {
      ws = workbook.worksheets.find((s) =>
        normalizeComponentKey(String(s.name || '')).includes(target) ||
        target.includes(normalizeComponentKey(String(s.name || '')))
      );
    }
    if (!ws) {
      const error = new Error(`Sheet not found: ${sheetName}`);
      error.code = 'EXCEL_SHEET_NOT_FOUND';
      error.availableSheets = workbook.worksheets.map((s) => s.name);
      throw error;
    }
  }
  if (!ws) ws = workbook.worksheets[0];
  if (!ws) return [];

  const rows = [];
  let headers = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values.slice(1); // ExcelJS satırları 1-indexed, slice(1) ile 0-based yapar
    if (rowNumber === 1) {
      headers = values.map((v) => (v != null ? String(v).trim() : `col${rowNumber}`));
    } else {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? null; });
      rows.push(obj);
    }
  });
  return rows;
}

const router = express.Router();

const ROUTE_KEY_TO_PRICING_PAGE = {
  rectifier: 'rectifier-pricing.html',
  inverter: 'inverter-pricing.html',
  ups: 'ups-pricing.html',
  vs: 'stabilizer-pricing.html',
  sts: 'sts-pricing.html',
  fc: 'frequency-pricing.html',
  dc_distribution: 'project-costing.html',
  ac_distribution: 'project-costing.html',
  bypass_cabinet: 'project-costing.html',
  battery_cabinet: 'project-costing.html',
};

/** @type {Map<string, object[]>} */
const cartsByUser = new Map();
/** @type {Map<string, object|null>} */
const offerDraftByUser = new Map();
/** @type {Map<string, { steps: object[], currentStep: number }|null>} */
const pricingQueueByUser = new Map();

function normalizeLine(line) {
  const parsedRevision = Number(line.revisionVersion);
  return {
    lineId: line.lineId || `L-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    routeKey: String(line.routeKey || ''),
    quantity: Math.max(1, parseInt(line.quantity, 10) || 1),
    label: line.label || line.routeKey || 'Ürün',
    lineDescription: line.lineDescription || '',
    progressStatus: line.progressStatus || 'Askıda',
    revisionVersion: Number.isFinite(parsedRevision) ? parsedRevision : 0,
    needsRevisionIncrement: Boolean(line.needsRevisionIncrement),
  };
}

function buildQueueFromLines(lines) {
  const steps = [];
  (Array.isArray(lines) ? lines : []).map(normalizeLine).forEach((line) => {
    const page =
      ROUTE_KEY_TO_PRICING_PAGE[line.routeKey] ||
      ROUTE_KEY_TO_PRICING_PAGE[String(line.routeKey || '').toLowerCase()] ||
      'project-costing.html';
    for (let i = 1; i <= line.quantity; i++) {
      steps.push({
        routeKey: line.routeKey,
        pricingPage: page,
        label: line.label || line.routeKey,
        lineDescription: line.lineDescription || '',
        lineId: line.lineId,
        instanceIndex: i,
        totalInLine: line.quantity,
        done: line.progressStatus === 'completed',
      });
    }
  });
  return {
    steps,
    currentStep: Math.max(
      0,
      steps.findIndex((s) => !s.done)
    ) === -1 ? steps.length : Math.max(0, steps.findIndex((s) => !s.done)),
  };
}

async function appendAutoDocumentPack({ quoteProjectId, quoteId, userId }) {
  try {
    if (!fs.existsSync(GENERATED_DOCS_BASE)) {
      fs.mkdirSync(GENERATED_DOCS_BASE, { recursive: true });
    }
  } catch (e) {
    logger.warn('generated-docs directory create failed', e.message);
  }
  const quoteDir = path.join(GENERATED_DOCS_BASE, `quote-${quoteProjectId}`);
  try {
    if (!fs.existsSync(quoteDir)) {
      fs.mkdirSync(quoteDir, { recursive: true });
    }
  } catch (e) {
    logger.warn('quote docs directory create failed', e.message);
  }
  const pack = [
    { doc_type: 'quote_form', file_path: path.join(quoteDir, 'quote-form.pdf') },
    { doc_type: 'cost_table', file_path: path.join(quoteDir, 'cost-table.xlsx') },
    { doc_type: 'tech_report', file_path: path.join(quoteDir, 'tech-report.pdf') },
    { doc_type: 'pre_design_form', file_path: path.join(quoteDir, 'pre-design.pdf') },
  ];
  for (const doc of pack) {
    const exists = await db.query(
      `SELECT id FROM quote_documents WHERE quote_id = $1 AND doc_type = $2 LIMIT 1`,
      [quoteId, doc.doc_type]
    );
    if (exists.rows.length) continue;
    await db.query(
      `INSERT INTO quote_documents (quote_id, doc_type, file_path, meta)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        quoteId,
        doc.doc_type,
        doc.file_path,
        JSON.stringify({
          source: 'auto-pack',
          quote_project_id: quoteProjectId,
          user_id: userId,
          generated: false,
        }),
      ]
    );
  }
}

function userKey(req) {
  return req.user && req.user.sub != null ? String(req.user.sub) : 'guest';
}

function normalizeDocumentPath(filePath, quoteId) {
  const raw = String(filePath || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('auto://')) return '';
  if (path.isAbsolute(raw)) return raw;
  const qDir = path.join(GENERATED_DOCS_BASE, `quote-${quoteId}`);
  try {
    if (!fs.existsSync(qDir)) fs.mkdirSync(qDir, { recursive: true });
  } catch (_) {}
  return path.join(qDir, raw.replace(/^[/\\]+/, ''));
}

function getCart(req) {
  const k = userKey(req);
  if (!cartsByUser.has(k)) cartsByUser.set(k, []);
  return cartsByUser.get(k);
}

// ─── Excel API ───────────────────────────────────────────────────────────────

/**
 * POST /api/excel/export-workbook
 * Web modunda tarayıcıdan ExcelJS ile aynı yapıda .xlsx üretir (body: createExcel/getExcelBuffer options).
 */
router.post('/excel/export-workbook', authenticateOptional, async (req, res) => {
  try {
    const options = req.body;
    if (!options || !Array.isArray(options.data) || options.data.length < 1) {
      return res.status(400).json({ error: 'Geçersiz tablo verisi' });
    }
    const workbook = buildPricingExcelWorkbook(options);
    const buf = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"');
    return res.send(Buffer.from(buf));
  } catch (error) {
    logger.error('excel/export-workbook', { message: error.message });
    return res.status(500).json({
      error: error.message || 'Excel oluşturulamadı',
    });
  }
});

/**
 * GET /api/excel/rectifier/:componentType
 * Rectifier bileşen Excel dosyasını okuyup JSON döner.
 * componentType: Terminals | CircuitBreakers | Cabinets | vb.
 */
router.get('/excel/rectifier/:componentType', authenticate, async (req, res) => {
  const { componentType } = req.params;
  const source = resolveRectifierExcelSource(componentType);
  const sanitizeRows = (rows) => {
    if (!Array.isArray(rows)) return [];
    if (normalizeComponentKey(componentType) !== 'transformers') return rows;
    return rows
      .map((row) => {
        const topology =
          normalizeTransformerTopology(row?.Topology || row?.Topoloji || row?.['Product Type']) ||
          '';
        return {
          ...row,
          Topology: row?.Topology || row?.Topoloji || topology || '',
          NormalizedTopology: topology,
        };
      })
      .filter((row) => {
      const productType = String(row?.['Product Type'] || '').trim();
      const power = Number(row?.['Power (kVA)'] ?? row?.['Power Rating (kVA)'] ?? row?.['Power']);
      const secondary = Number(
        row?.['Secondary Voltage'] ??
        row?.['Secondary Voltage (V)'] ??
        row?.['Output Voltage (V)'] ??
        row?.['Output Voltage']
      );
      const hasVoltageColumnPower = Object.entries(row || {}).some(([key, value]) => {
        if (!/^\s*\d+(\.\d+)?\s*v\s*$/i.test(String(key || ''))) return false;
        return Number.isFinite(Number(value));
      });
      return Boolean(productType) && (
        (Number.isFinite(power) && Number.isFinite(secondary)) ||
        hasVoltageColumnPower
      );
    });
  };

  if (!source) {
    return res.status(400).json({
      success: false,
      error: `Bilinmeyen component tipi: ${componentType}`,
      available: RECTIFIER_COMPONENT_TYPES,
    });
  }

  const filePath = path.join(EXCEL_BASE, source.fileName);
  logger.info('excel/rectifier request', {
    userId: req.user?.sub,
    componentType,
    sheetName: source.sheetName,
    resolver: source.source,
    filePath,
  });
  try {
    let rows = sanitizeRows(await readExcelSheet(filePath, source.sheetName));
    rows = filterDcComponentsRows(componentType, rows);
    if (
      rows.length === 0 &&
      source.sheetName &&
      normalizeComponentKey(source.sheetName) !== normalizeComponentKey(componentType)
    ) {
      let fallbackRows = sanitizeRows(await readExcelSheet(filePath, componentType));
      fallbackRows = filterDcComponentsRows(componentType, fallbackRows);
      return res.json({
        success: true,
        componentType,
        sheetName: componentType,
        fileName: source.fileName,
        count: fallbackRows.length,
        data: fallbackRows,
      });
    }
    res.json({
      success: true,
      componentType,
      sheetName: source.sheetName,
      fileName: source.fileName,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    logger.error(`excel/rectifier/${componentType}:`, {
      message: err.message,
      code: err.code,
      sheetName: source.sheetName,
      filePath,
    });
    if (err.code === 'EXCEL_FILE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: `Excel dosyası bulunamadı: ${RECTIFIER_SOURCE_FILE}`,
        detail: `EXCEL_BASE_PATH altında dosya yok: ${filePath}`,
      });
    }
    if (err.code === 'EXCEL_SHEET_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: `Sheet bulunamadı: ${source.sheetName}`,
        detail: `Dosya: ${source.fileName}`,
        availableSheets: err.availableSheets || [],
      });
    }
    return res.status(500).json({
      success: false,
      error: `Excel okunamadı: ${source.fileName}`,
      detail: err.message,
    });
  }
});

// ─── Sepet / Teklif / Kuyruk ──────────────────────────────────────────────────

router.get('/cart', authenticateOptional, (req, res) => {
  res.json(getCart(req));
});

router.post('/cart', authenticateOptional, (req, res) => {
  const cart = getCart(req);
  cart.push(req.body);
  res.json({ success: true, count: cart.length });
});

router.delete('/cart/:index', authenticateOptional, (req, res) => {
  const cart = getCart(req);
  const index = parseInt(req.params.index, 10);
  if (index >= 0 && index < cart.length) cart.splice(index, 1);
  res.json({ success: true, count: cart.length });
});

router.delete('/cart', authenticateOptional, (req, res) => {
  const k = userKey(req);
  cartsByUser.set(k, []);
  res.json({ success: true, count: 0 });
});

router.post('/web/offer-draft', authenticate, (req, res) => {
  const key = userKey(req);
  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (body && Array.isArray(body.lines)) {
    body.lines = body.lines.map(normalizeLine);
  }
  offerDraftByUser.set(key, body);
  res.json({ success: true });
});

router.get('/web/offer-draft', authenticate, (req, res) => {
  const key = userKey(req);
  res.json(offerDraftByUser.get(key) || null);
});

router.delete('/web/offer-draft', authenticate, (req, res) => {
  const key = userKey(req);
  offerDraftByUser.delete(key);
  res.json({ success: true });
});

router.post('/web/pricing-queue/build', authenticate, (req, res) => {
  const key = userKey(req);
  const draft = offerDraftByUser.get(key);
  if (!draft || !Array.isArray(draft.lines)) {
    return res.status(400).json({ success: false, error: 'Taslak veya kalemler yok' });
  }
  const state = buildQueueFromLines(draft.lines);
  pricingQueueByUser.set(key, state);
  res.json({ success: true, totalSteps: state.steps.length });
});

router.get('/web/pricing-queue', authenticate, (req, res) => {
  res.json(pricingQueueByUser.get(userKey(req)) || null);
});

router.post('/web/pricing-queue/advance', authenticate, (req, res) => {
  const key = userKey(req);
  const pricingQueueState = pricingQueueByUser.get(key);
  if (!pricingQueueState || !pricingQueueState.steps.length) {
    return res.json({ success: false });
  }
  const idx = pricingQueueState.currentStep;
  if (idx < pricingQueueState.steps.length && pricingQueueState.steps[idx]) {
    pricingQueueState.steps[idx].done = true;
  }
  pricingQueueState.currentStep = Math.min(
    idx + 1,
    pricingQueueState.steps.length
  );
  res.json({ success: true, currentStep: pricingQueueState.currentStep });
});

router.post('/web/pricing-queue/complete-line', authenticate, async (req, res) => {
  const key = userKey(req);
  const { lineId, quoteProjectId } = req.body || {};
  if (!lineId) {
    return res.status(400).json({ success: false, error: 'lineId gerekli' });
  }
  const queue = pricingQueueByUser.get(key);
  if (queue && Array.isArray(queue.steps)) {
    queue.steps.forEach((s) => {
      if (s.lineId === lineId) s.done = true;
    });
    const nextIdx = queue.steps.findIndex((s) => !s.done);
    queue.currentStep = nextIdx === -1 ? queue.steps.length : nextIdx;
  }
  try {
    if (quoteProjectId) {
      const current = await db.query(
        `SELECT id, lines_json, quote_number FROM quote_projects WHERE id = $1 AND user_id = $2`,
        [quoteProjectId, req.user.sub]
      );
      if (current.rows.length) {
        const row = current.rows[0];
        const lines = Array.isArray(row.lines_json) ? row.lines_json : [];
        const updated = lines.map((l) => {
          if (String(l.lineId) !== String(lineId)) return l;
          const oldRev = Number.isFinite(Number(l.revisionVersion))
            ? Number(l.revisionVersion)
            : 0;
          const shouldIncrement = Boolean(l.needsRevisionIncrement);
          return {
            ...l,
            progressStatus: 'completed',
            revisionVersion: shouldIncrement ? oldRev + 1 : oldRev,
            needsRevisionIncrement: false,
          };
        });
        const allDone = updated.length > 0 && updated.every((l) => l.progressStatus === 'completed');
        await db.query(
          `UPDATE quote_projects
           SET lines_json = $1::jsonb,
               status = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [JSON.stringify(updated), allDone ? 'COMPLETED' : 'IN_PROGRESS', row.id]
        );
        if (allDone) {
          const q = await db.query(
            `SELECT id FROM quotes WHERE number = $1 AND prepared_by = $2 ORDER BY id DESC LIMIT 1`,
            [row.quote_number, req.user.sub]
          );
          if (q.rows.length) {
            await appendAutoDocumentPack({
              quoteProjectId: row.id,
              quoteId: q.rows[0].id,
              userId: req.user.sub,
            });
          }
        }
      }
    }
  } catch (e) {
    logger.error('complete-line', e);
  }
  res.json({ success: true, queue });
});

router.delete('/web/pricing-queue', authenticate, (req, res) => {
  pricingQueueByUser.delete(userKey(req));
  res.json({ success: true });
});

/** Kullanıcının teklifleri (anasayfa geçmişi) — /quotes/:id ile çakışmaması için /user/quotes */
router.get('/user/quotes', authenticate, async (req, res) => {
  const userId = req.user.sub;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  try {
    const result = await db.query(
      `SELECT q.*, c.company_name AS customer_name
       FROM quotes q
       LEFT JOIN customers c ON c.id = q.customer_id
       WHERE q.prepared_by = $1
       ORDER BY q.created_at DESC NULLS LAST, q.id DESC
       LIMIT $2`,
      [userId, limit]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) {
    logger.error('user/quotes', e);
    res.status(500).json({ success: false, error: 'Liste alınamadı' });
  }
});

/** Siparişe geçiş (onaylı teklif) */
router.patch('/user/quotes/:id/order', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const cur = await db.query(
      `SELECT id, status, prepared_by FROM quotes WHERE id = $1`,
      [id]
    );
    if (!cur.rows.length) {
      return res.status(404).json({ success: false, error: 'Teklif bulunamadı' });
    }
    const row = cur.rows[0];
    if (row.prepared_by !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Yetkisiz' });
    }
    const st = String(row.status || '').toUpperCase();
    if (st !== 'ONAYLANDI' && st !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Sadece onaylanmış teklifler siparişe çevrilebilir',
      });
    }
    await db.query(
      `UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2`,
      ['SIPARIS', id]
    );
    res.json({ success: true });
  } catch (e) {
    logger.error('order', e);
    res.status(500).json({ success: false, error: 'Güncellenemedi' });
  }
});

/** Haftalık teklif Excel (compare.md sütunları) */
router.get('/user/quotes-weekly', authenticate, async (req, res) => {
  const userId = req.user.sub;
  // Son 7 gün: bugün dahil geriye 7 gün
  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  try {
    const result = await db.query(
      `SELECT q.*, c.company_name AS customer_name, u.full_name AS preparer_name,
              qp.status AS project_status, qp.lines_json AS project_lines
       FROM quotes q
       LEFT JOIN customers c ON c.id = q.customer_id
       LEFT JOIN users u ON u.id = q.prepared_by
       LEFT JOIN LATERAL (
         SELECT status, lines_json
         FROM quote_projects
         WHERE quote_number = q.number AND user_id = q.prepared_by
         ORDER BY id DESC
         LIMIT 1
       ) qp ON TRUE
       WHERE q.prepared_by = $1
         AND (q.created_at >= $2 AND q.created_at < $3 OR q.date >= $2::date AND q.date < $3::date)
       ORDER BY q.created_at ASC`,
      [userId, weekStart, weekEnd]
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('HaftalikTeklifler');
    ws.columns = [
      { header: 'Teklif No', key: 'number', width: 18 },
      { header: 'Tarih', key: 'date', width: 14 },
      { header: 'Müşteri', key: 'customer', width: 28 },
      { header: 'Durum', key: 'status', width: 14 },
      { header: 'Proje Durumu', key: 'projectStatus', width: 18 },
      { header: 'Toplam Fiyat', key: 'totalPrice', width: 16 },
      { header: 'Kalem Özeti', key: 'details', width: 44 },
      { header: 'Toplam Adet', key: 'totalQty', width: 12 },
      { header: 'Revize Sayısı', key: 'revisionCount', width: 14 },
      { header: 'Kalem Fiyatları', key: 'linePrices', width: 16 },
      { header: 'Hazırlayan', key: 'prepared', width: 22 },
      { header: 'Sipariş / Not', key: 'order', width: 20 },
    ];

    result.rows.forEach((r) => {
      const d = r.date
        ? new Date(r.date).toLocaleDateString('tr-TR')
        : r.created_at
          ? new Date(r.created_at).toLocaleDateString('tr-TR')
          : '';
      const st = String(r.status || '');
      const lines = Array.isArray(r.project_lines) ? r.project_lines : [];
      const totalQty = lines.reduce((sum, line) => sum + (Number(line?.quantity || 0) || 0), 0);
      const revisionCount = lines.reduce(
        (sum, line) => sum + (Number(line?.revisionVersion || 0) || 0),
        0
      );
      const linePrices = lines.reduce(
        (sum, line) =>
          sum + (Number(line?.totalPrice || line?.total_price || line?.calculatedPrice || 0) || 0),
        0
      );
      const lineSummary = lines.length
        ? lines
            .map((line) => {
              const qty = Number(line?.quantity || 1) || 1;
              const label = String(line?.label || line?.routeKey || 'Kalem');
              return `${label} x${qty}`;
            })
            .join(' | ')
        : (r.details || '').toString().slice(0, 500);
      ws.addRow({
        number: r.number,
        date: d,
        customer: r.customer_name || '',
        status: st,
        projectStatus: r.project_status || '',
        totalPrice: Number(r.total_price || 0) || 0,
        details: lineSummary,
        totalQty,
        revisionCount,
        linePrices,
        prepared: r.preparer_name || '',
        order: st === 'ONAYLANDI' || st === 'APPROVED' ? 'Sipariş için uygun' : '',
      });
    });

    if (!result.rows.length) {
      ws.addRow({
        number: '-',
        date: new Date().toLocaleDateString('tr-TR'),
        customer: '-',
        status: 'BİLGİ',
        projectStatus: '',
        totalPrice: '',
        details: 'Son 7 gün içinde kayıtlı teklif bulunamadı.',
        totalQty: '',
        revisionCount: '',
        linePrices: '',
        prepared: '',
        order: '',
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="teklifler-son7gun-${userId}-${weekStart.toISOString().slice(0, 10)}.xlsx"`
    );
    res.send(Buffer.from(buf));
  } catch (e) {
    logger.error('weekly export', e);
    res.status(500).json({ success: false, error: 'Excel oluşturulamadı' });
  }
});

/** n8n: özet JSON */
router.get('/n8n/quotes-summary', n8nApiKey, async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 7 * 864e5).toISOString();
  const to = req.query.to || new Date().toISOString();
  try {
    const result = await db.query(
      `SELECT q.id, q.number, q.status, q.total_price, q.created_at, q.date,
              c.company_name AS customer, u.full_name AS preparer,
              qp.status AS project_status,
              qp.lines_json AS project_lines
       FROM quotes q
       LEFT JOIN customers c ON c.id = q.customer_id
       LEFT JOIN users u ON u.id = q.prepared_by
       LEFT JOIN LATERAL (
         SELECT status, lines_json
         FROM quote_projects
         WHERE quote_number = q.number
         ORDER BY id DESC
         LIMIT 1
       ) qp ON TRUE
       WHERE COALESCE(q.created_at, q.date::timestamp) >= $1::timestamptz
         AND COALESCE(q.created_at, q.date::timestamp) < $2::timestamptz
       ORDER BY q.id DESC
       LIMIT 5000`,
      [from, to]
    );
    res.json({
      success: true,
      from,
      to,
      count: result.rows.length,
      rows: result.rows,
    });
  } catch (e) {
    logger.error('n8n summary', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** n8n: haftalık teklif Excel (tüm kullanıcılar, compare sütunları) */
router.get('/n8n/export-weekly.xlsx', n8nApiKey, async (req, res) => {
  let weekStart = req.query.weekStart
    ? new Date(req.query.weekStart)
    : new Date();
  if (Number.isNaN(weekStart.getTime())) weekStart = new Date();
  const day = weekStart.getDay();
  const diff = (day + 6) % 7;
  weekStart.setDate(weekStart.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  try {
    const result = await db.query(
      `SELECT q.*, c.company_name AS customer_name,
              COALESCE(u.full_name, q.prepared_by::text) AS preparer_name
       FROM quotes q
       LEFT JOIN customers c ON c.id = q.customer_id
       LEFT JOIN users u ON
         CASE
           WHEN q.prepared_by ~ E'^\\d+$' THEN q.prepared_by::integer = u.id
           ELSE false
         END
       WHERE q.created_at >= $1 AND q.created_at < $2
          OR q.date >= $1::date AND q.date < $2::date
       ORDER BY q.created_at ASC`,
      [weekStart, weekEnd]
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('HaftalikTeklifler');
    ws.columns = [
      { header: 'Teklif No', key: 'number', width: 18 },
      { header: 'Tarih', key: 'date', width: 14 },
      { header: 'Müşteri', key: 'customer', width: 28 },
      { header: 'Teklif Detayı', key: 'details', width: 40 },
      { header: 'Hazırlayan', key: 'prepared', width: 22 },
      { header: 'Durum', key: 'status', width: 14 },
      { header: 'Sipariş / Not', key: 'order', width: 20 },
    ];

    result.rows.forEach((r) => {
      const d = r.date
        ? new Date(r.date).toLocaleDateString('tr-TR')
        : r.created_at
          ? new Date(r.created_at).toLocaleDateString('tr-TR')
          : '';
      const st = String(r.status || '');
      ws.addRow({
        number: r.number,
        date: d,
        customer: r.customer_name || '',
        details: (r.details || '').toString().slice(0, 500),
        prepared: r.preparer_name || '',
        status: st,
        order:
          st === 'ONAYLANDI' || st === 'APPROVED' ? 'Sipariş için uygun' : '',
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="n8n-teklifler-haftalik-${weekStart.toISOString().slice(0, 10)}.xlsx"`
    );
    res.send(Buffer.from(buf));
  } catch (e) {
    logger.error('n8n weekly xlsx', e);
    res.status(500).json({ success: false, error: 'Excel oluşturulamadı' });
  }
});

/** Teklif belge yolu kaydı (PDF/HTML) */
router.post('/quote-documents', authenticate, async (req, res) => {
  const quoteId = parseInt(req.body?.quoteId, 10);
  const { docType, filePath, meta } = req.body || {};
  if (!quoteId || !docType || !filePath) {
    return res
      .status(400)
      .json({ success: false, error: 'quoteId, docType ve filePath gerekli' });
  }
  const normalizedFilePath = normalizeDocumentPath(filePath, quoteId);
  if (!normalizedFilePath) {
    return res.status(400).json({
      success: false,
      error: 'Geçerli bir dosya yolu gerekli (auto:// kabul edilmez)',
    });
  }
  try {
    const own = await db.query(
      `SELECT id, prepared_by FROM quotes WHERE id = $1`,
      [quoteId]
    );
    if (!own.rows.length) {
      return res.status(404).json({ success: false, error: 'Teklif yok' });
    }
    if (
      own.rows[0].prepared_by !== req.user.sub &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, error: 'Yetkisiz' });
    }
    await db.query(
      `INSERT INTO quote_documents (quote_id, doc_type, file_path, meta)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [quoteId, String(docType), normalizedFilePath, JSON.stringify(meta || {})]
    );
    res.json({ success: true });
  } catch (e) {
    logger.error('document save', e);
    res.status(500).json({ success: false, error: 'Kaydedilemedi' });
  }
});

router.get('/quote-documents', authenticate, async (req, res) => {
  const quoteId = parseInt(req.query.quoteId, 10);
  if (!quoteId) {
    return res.status(400).json({ success: false, error: 'quoteId gerekli' });
  }
  try {
    const own = await db.query(
      `SELECT id, prepared_by FROM quotes WHERE id = $1`,
      [quoteId]
    );
    if (!own.rows.length) {
      return res.status(404).json({ success: false, error: 'Teklif yok' });
    }
    if (
      own.rows[0].prepared_by !== req.user.sub &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, error: 'Yetkisiz' });
    }
    const docs = await db.query(
      `SELECT id, doc_type, file_path, meta, created_at
       FROM quote_documents WHERE quote_id = $1 ORDER BY id DESC`,
      [quoteId]
    );
    const rows = docs.rows.map((d) => ({
      ...d,
      file_exists: /^https?:\/\//i.test(String(d.file_path || ''))
        ? true
        : fs.existsSync(String(d.file_path || '')),
    }));
    res.json({ success: true, data: rows });
  } catch (e) {
    logger.error('documents list', e);
    res.status(500).json({ success: false, error: 'Listelenemedi' });
  }
});

/** Proje taslağı DB */
router.post('/quote-projects', authenticate, async (req, res) => {
  const {
    quote_number,
    customer_id,
    currency,
    lines_json,
    status,
  } = req.body || {};
  if (!quote_number) {
    return res.status(400).json({ success: false, error: 'quote_number gerekli' });
  }
  try {
    const result = await db.query(
      `INSERT INTO quote_projects (user_id, quote_number, customer_id, currency, lines_json, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id, created_at`,
      [
        req.user.sub,
        quote_number,
        customer_id || null,
        currency || 'USD',
        JSON.stringify(lines_json || []),
        status || 'TASLAK',
      ]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    logger.error('quote-projects insert', e);
    res.status(500).json({ success: false, error: 'Kayıt başarısız' });
  }
});

router.get('/quote-projects/my', authenticate, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT qp.*, c.company_name AS customer_name, c.country AS customer_country,
              u.full_name AS prepared_by_fullname
       FROM quote_projects qp
       LEFT JOIN customers c ON c.id = qp.customer_id
       LEFT JOIN users u ON u.id = qp.user_id
       WHERE qp.user_id = $1
       ORDER BY qp.created_at DESC`,
      [req.user.sub]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('quote-projects list', e);
    res.status(500).json({ success: false, error: 'Liste alınamadı' });
  }
});

router.post('/quote-projects/upsert', authenticate, async (req, res) => {
  const { quote_number, customer_id, currency, lines_json, status } = req.body || {};
  if (!quote_number) {
    return res.status(400).json({ success: false, error: 'quote_number gerekli' });
  }
  try {
    const existing = await db.query(
      `SELECT id FROM quote_projects WHERE user_id = $1 AND quote_number = $2 ORDER BY id DESC LIMIT 1`,
      [req.user.sub, quote_number]
    );
    if (!existing.rows.length) {
      const ins = await db.query(
        `INSERT INTO quote_projects (user_id, quote_number, customer_id, currency, lines_json, status)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         RETURNING id, created_at`,
        [
          req.user.sub,
          quote_number,
          customer_id || null,
          currency || 'USD',
          JSON.stringify((lines_json || []).map(normalizeLine)),
          status || 'TASLAK',
        ]
      );
      return res.json({ success: true, data: ins.rows[0], mode: 'insert' });
    }
    const upd = await db.query(
      `UPDATE quote_projects
       SET customer_id = $1, currency = $2, lines_json = $3::jsonb, status = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, updated_at`,
      [
        customer_id || null,
        currency || 'USD',
        JSON.stringify((lines_json || []).map(normalizeLine)),
        status || 'TASLAK',
        existing.rows[0].id,
      ]
    );
    return res.json({ success: true, data: upd.rows[0], mode: 'update' });
  } catch (e) {
    logger.error('quote-projects upsert', e);
    return res.status(500).json({ success: false, error: 'Upsert başarısız' });
  }
});

router.get('/user/quote-projects/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const r = await db.query(
      `SELECT qp.*, c.company_name AS customer_name
       FROM quote_projects qp
       LEFT JOIN customers c ON c.id = qp.customer_id
       WHERE qp.id = $1 AND qp.user_id = $2`,
      [id, req.user.sub]
    );
    if (!r.rows.length) {
      return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
    }
    return res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('quote-project detail', e);
    return res.status(500).json({ success: false, error: 'Detay alınamadı' });
  }
});

router.patch('/user/quote-projects/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { lines_json, status, revisionNote, revisionTargetLineIds, incrementRevision } = req.body || {};
  try {
    const curr = await db.query(
      `SELECT id, lines_json, status FROM quote_projects WHERE id = $1 AND user_id = $2`,
      [id, req.user.sub]
    );
    if (!curr.rows.length) {
      return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
    }
    const oldLines = Array.isArray(curr.rows[0].lines_json) ? curr.rows[0].lines_json : [];

    // Eğer client satır bazlı revize hedefliyorsa, sadece o satır(lar) revize döngüsüne alınır.
    const targetLineIds = Array.isArray(revisionTargetLineIds)
      ? revisionTargetLineIds.map(String).filter(Boolean)
      : [];
    const hasTarget = targetLineIds.length > 0;
    const targetSet = hasTarget ? new Set(targetLineIds) : null;

    const nextLines = Array.isArray(lines_json) ? lines_json.map(normalizeLine) : oldLines.map(normalizeLine);

    let enriched = [];
    let maxRevisionVersion = oldLines.length
      ? Math.max(...oldLines.map((l) => Number(l?.revisionVersion || 0)), 0)
      : 0;

    if (hasTarget) {
      const oldById = new Map(oldLines.map((l) => [String(l.lineId || ''), l]));
      enriched = nextLines.map((l) => {
        const lid = String(l.lineId || '');
        const old = oldById.get(lid);

        const oldRev = Number.isFinite(Number(old?.revisionVersion))
          ? Number(old.revisionVersion)
          : (Number.isFinite(Number(l.revisionVersion)) ? Number(l.revisionVersion) : 0);
        const isTarget = targetSet.has(lid);

        return {
          ...l,
          // Satır revizyon sayacı yalnızca yeniden tamamlandığında artar.
          revisionVersion: oldRev,
          // Target satırlar revize döngüsüne alınır.
          progressStatus: isTarget ? 'pending' : (old?.progressStatus || l.progressStatus || 'Askıda'),
          needsRevisionIncrement: isTarget ? true : Boolean(old?.needsRevisionIncrement || l.needsRevisionIncrement),
        };
      });
      maxRevisionVersion = Math.max(...enriched.map((l) => Number(l.revisionVersion || 0)), 0);
    } else {
      const oldById = new Map(oldLines.map((l) => [String(l.lineId || ''), l]));
      enriched = nextLines.map((l) => {
        const old = oldById.get(String(l.lineId || ''));
        const revisionVersion = Number.isFinite(Number(old?.revisionVersion))
          ? Number(old.revisionVersion)
          : (Number.isFinite(Number(l.revisionVersion)) ? Number(l.revisionVersion) : 0);
        return {
          ...l,
          revisionVersion,
          needsRevisionIncrement: Boolean(old?.needsRevisionIncrement || l.needsRevisionIncrement),
        };
      });
      maxRevisionVersion = Math.max(...enriched.map((l) => Number(l.revisionVersion || 0)), 0);
    }
    const currentStatus = String(curr.rows[0].status || '').toUpperCase();
    const requestedStatus = String(status || '').toUpperCase();
    const nextStatus =
      currentStatus === 'COMPLETED' || requestedStatus === 'REVIZE'
        ? 'REVIZE'
        : (status || 'REVIZE');
    const upd = await db.query(
      `UPDATE quote_projects
       SET lines_json = $1::jsonb, status = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, updated_at`,
      [JSON.stringify(enriched), nextStatus, id]
    );
    return res.json({
      success: true,
      data: upd.rows[0],
      revisionVersion: maxRevisionVersion,
      revisionNote: revisionNote || '',
    });
  } catch (e) {
    logger.error('quote-project patch', e);
    return res.status(500).json({ success: false, error: 'Revizyon kaydedilemedi' });
  }
});

router.delete('/user/quote-projects/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await db.query(`DELETE FROM quote_projects WHERE id = $1 AND user_id = $2`, [id, req.user.sub]);
    return res.json({ success: true });
  } catch (e) {
    logger.error('quote-project delete', e);
    return res.status(500).json({ success: false, error: 'Silinemedi' });
  }
});

router.post('/user/quote-projects/:id/resume', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const r = await db.query(
      `SELECT qp.*, c.company_name AS customer_name
       FROM quote_projects qp
       LEFT JOIN customers c ON c.id = qp.customer_id
       WHERE qp.id = $1 AND qp.user_id = $2`,
      [id, req.user.sub]
    );
    if (!r.rows.length) {
      return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
    }
    const row = r.rows[0];
    const lines = Array.isArray(row.lines_json) ? row.lines_json.map(normalizeLine) : [];
    const draft = {
      quoteNumber: row.quote_number,
      customerId: row.customer_id,
      customerName: row.customer_name || '',
      currency: row.currency || 'USD',
      quoteProjectId: row.id,
      lines,
    };
    offerDraftByUser.set(userKey(req), draft);
    const queue = buildQueueFromLines(lines);
    pricingQueueByUser.set(userKey(req), queue);
    return res.json({ success: true, draft, queue });
  } catch (e) {
    logger.error('quote-project resume', e);
    return res.status(500).json({ success: false, error: 'Resume başarısız' });
  }
});

router.post('/user/quote-projects/:id/finalize-docs', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const p = await db.query(
      `SELECT * FROM quote_projects WHERE id = $1 AND user_id = $2`,
      [id, req.user.sub]
    );
    if (!p.rows.length) {
      return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
    }
    const row = p.rows[0];
    const q = await db.query(
      `SELECT id FROM quotes WHERE number = $1 AND prepared_by = $2 ORDER BY id DESC LIMIT 1`,
      [row.quote_number, req.user.sub]
    );
    if (!q.rows.length) {
      return res.status(404).json({ success: false, error: 'Teklif kaydı bulunamadı' });
    }
    await appendAutoDocumentPack({
      quoteProjectId: row.id,
      quoteId: q.rows[0].id,
      userId: req.user.sub,
    });
    await db.query(
      `UPDATE quote_projects SET status = 'DOC_READY', updated_at = NOW() WHERE id = $1`,
      [row.id]
    );
    return res.json({ success: true });
  } catch (e) {
    logger.error('finalize-docs', e);
    return res.status(500).json({ success: false, error: 'Dokuman paketi olusturulamadi' });
  }
});

module.exports = router;
