/**
 * Web/Electron-dışı ortam: sepet, teklif taslağı, kuyruk, haftalık export, n8n uçları.
 */
const express = require('express');
const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../../db/connection');
const logger = require('../logger');
const { authenticate, authenticateOptional, n8nApiKey } = require('../middleware/authMiddleware');

// ─── Excel ağ paylaşımı base path ────────────────────────────────────────────
const EXCEL_BASE = '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel';

// Component adı → Excel dosya adı eşlemesi
const RECTIFIER_EXCEL_MAP = {
  Terminals:                'Rectifier.xlsx',
  CircuitBreakers:          'CircuitBreakers.xlsx',
  CurrentReadingCards:      'CurrentReadingCards.xlsx',
  FreewheelingDiodes:       'FreewheelingDiodes.xlsx',
  Thyristors:               'Thyristors.xlsx',
  DCChokes:                 'DCChokes.xlsx',
  DCCapacitors:             'DCCapacitors.xlsx',
  Transformers:             'Transformers.xlsx',
  CoolingComponents:        'CoolingComponents.xlsx',
  DiodeDroppers:            'DiodeDroppers.xlsx',
  Relays:                   'Relays.xlsx',
  ControlCards:             'ControlCards.xlsx',
  MeasurementInstruments:   'MeasurementInstruments.xlsx',
  CommunicationComponents:  'CommunicationComponents.xlsx',
  CommunicationProtocols:   'CommunicationProtocols.xlsx',
  RelayAlarmOutputs:        'RelayAlarmOutputs.xlsx',
  Cabinets:                 'Cabinets.xlsx',
};

/**
 * Verilen Excel dosyasının ilk sheet'ini JSON array olarak okur.
 * @param {string} filePath  Tam dosya yolu
 * @returns {Promise<object[]>}
 */
async function readExcelSheet(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.worksheets[0];
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
};

/** @type {Map<string, object[]>} */
const cartsByUser = new Map();
/** @type {Map<string, object|null>} */
const offerDraftByUser = new Map();
/** @type {Map<string, { steps: object[], currentStep: number }|null>} */
const pricingQueueByUser = new Map();

function userKey(req) {
  return req.user && req.user.sub != null ? String(req.user.sub) : 'guest';
}

function getCart(req) {
  const k = userKey(req);
  if (!cartsByUser.has(k)) cartsByUser.set(k, []);
  return cartsByUser.get(k);
}

// ─── Excel API ───────────────────────────────────────────────────────────────

/**
 * GET /api/excel/rectifier/:componentType
 * Rectifier bileşen Excel dosyasını okuyup JSON döner.
 * componentType: Terminals | CircuitBreakers | Cabinets | vb.
 */
router.get('/excel/rectifier/:componentType', authenticate, async (req, res) => {
  const { componentType } = req.params;
  const fileName = RECTIFIER_EXCEL_MAP[componentType];

  if (!fileName) {
    return res.status(400).json({
      success: false,
      error: `Bilinmeyen component tipi: ${componentType}`,
      available: Object.keys(RECTIFIER_EXCEL_MAP),
    });
  }

  const filePath = path.join(EXCEL_BASE, fileName);
  try {
    const rows = await readExcelSheet(filePath);
    res.json({ success: true, componentType, count: rows.length, data: rows });
  } catch (err) {
    logger.error(`excel/rectifier/${componentType}:`, err.message);
    res.status(500).json({
      success: false,
      error: `Excel okunamadı: ${fileName} — ${err.message}`,
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
  offerDraftByUser.set(key, req.body && typeof req.body === 'object' ? req.body : null);
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
  const steps = [];
  draft.lines.forEach((line) => {
    const page =
      ROUTE_KEY_TO_PRICING_PAGE[line.routeKey] ||
      ROUTE_KEY_TO_PRICING_PAGE[String(line.routeKey || '').toLowerCase()];
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
  const state = { steps, currentStep: 0 };
  pricingQueueByUser.set(key, state);
  res.json({ success: true, totalSteps: steps.length });
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
      `SELECT q.*, c.company_name AS customer_name, u.full_name AS preparer_name
       FROM quotes q
       LEFT JOIN customers c ON c.id = q.customer_id
       LEFT JOIN users u ON u.id = q.prepared_by
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
        order: st === 'ONAYLANDI' || st === 'APPROVED' ? 'Sipariş için uygun' : '',
      });
    });

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
              c.company_name AS customer, u.full_name AS preparer
       FROM quotes q
       LEFT JOIN customers c ON c.id = q.customer_id
       LEFT JOIN users u ON u.id = q.prepared_by
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
      [quoteId, String(docType), String(filePath), JSON.stringify(meta || {})]
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
    res.json({ success: true, data: docs.rows });
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
      `SELECT * FROM quote_projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.sub]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('quote-projects list', e);
    res.status(500).json({ success: false, error: 'Liste alınamadı' });
  }
});

module.exports = router;
