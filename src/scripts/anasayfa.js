/** Ürün route anahtarı → etiket + fiyatlandırma sayfası (tek kaynak) */
const PRODUCT_ROUTE_OPTIONS = [
  { routeKey: 'rectifier', label: 'Rectifier', page: 'rectifier-pricing.html' },
  { routeKey: 'inverter', label: 'Inverter', page: 'inverter-pricing.html' },
  { routeKey: 'ups', label: 'UPS', page: 'ups-pricing.html' },
  {
    routeKey: 'vs',
    label: 'Voltage Stabilizer',
    page: 'stabilizer-pricing.html',
  },
  {
    routeKey: 'sts',
    label: 'Static Transfer Switch',
    page: 'sts-pricing.html',
  },
  { routeKey: 'fc', label: 'Frequency Converter', page: 'frequency-pricing.html' },
];

const productLabelByKey = Object.fromEntries(
  PRODUCT_ROUTE_OPTIONS.map((p) => [p.routeKey, p.label])
);

let offerLines = [];

function newLineId() {
  return `L${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getProductMeta(routeKey) {
  return PRODUCT_ROUTE_OPTIONS.find((p) => p.routeKey === routeKey);
}

function addOfferLine(routeKey, quantity, labelOverride) {
  const meta = getProductMeta(routeKey);
  if (!meta) return;
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  offerLines.push({
    lineId: newLineId(),
    routeKey,
    quantity: qty,
    label: labelOverride || meta.label,
  });
  renderOfferLinesTable();
}

function renderOfferLinesTable() {
  const tbody = document.getElementById('offerLinesBody');
  const emptyEl = document.getElementById('offerLinesEmpty');
  if (!tbody) return;

  tbody.innerHTML = '';
  offerLines.forEach((line, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(line.label)} <span class="offer-line-meta">(${line.routeKey})</span></td>
      <td><input type="number" class="offer-qty-input" min="1" value="${line.quantity}" data-index="${index}" aria-label="Adet" /></td>
      <td><button type="button" class="btn-line-remove" data-index="${index}">Kaldır</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.offer-qty-input').forEach((inp) => {
    inp.addEventListener('change', () => {
      const i = parseInt(inp.getAttribute('data-index'), 10);
      if (offerLines[i])
        offerLines[i].quantity = Math.max(1, parseInt(inp.value, 10) || 1);
    });
  });

  tbody.querySelectorAll('.btn-line-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.getAttribute('data-index'), 10);
      offerLines.splice(i, 1);
      renderOfferLinesTable();
    });
  });

  if (emptyEl) {
    emptyEl.classList.toggle('is-hidden', offerLines.length > 0);
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function populateProductSelect() {
  const sel = document.getElementById('lineProductSelect');
  if (!sel) return;
  sel.innerHTML = '';
  PRODUCT_ROUTE_OPTIONS.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.routeKey;
    opt.textContent = p.label;
    sel.appendChild(opt);
  });
}

function homeAuthHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('authToken');
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

async function loadHomeQuotes() {
  const hint = document.getElementById('homeQuotesLoginHint');
  const tbody = document.getElementById('homeQuotesBody');
  const weeklyBtn = document.getElementById('homeWeeklyExcelBtn');
  if (!tbody) return;

  const token = localStorage.getItem('authToken');
  if (!token) {
    if (hint) {
      hint.textContent =
        'Teklif geçmişinizi ve haftalık Excel indirmeyi kullanmak için giriş yapın.';
    }
    tbody.innerHTML = '';
    if (weeklyBtn) weeklyBtn.disabled = true;
    return;
  }
  if (hint) hint.textContent = '';
  if (weeklyBtn) weeklyBtn.disabled = false;

  try {
    const res = await fetch(
      `${window.location.origin}/api/user/quotes?limit=40`,
      { headers: homeAuthHeaders() }
    );
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) {
      tbody.innerHTML =
        '<tr><td colspan="7">Liste yüklenemedi. Oturumu kontrol edin.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    if (data.data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7">Henüz kayıtlı teklif yok.</td></tr>';
      return;
    }
    data.data.forEach((q) => {
      const tr = document.createElement('tr');
      const st = String(q.status || '');
      const stUp = st.toUpperCase();
      const canOrder = stUp === 'ONAYLANDI' || stUp === 'APPROVED';
      const dateStr = q.date
        ? new Date(q.date).toLocaleDateString('tr-TR')
        : q.created_at
          ? new Date(q.created_at).toLocaleDateString('tr-TR')
          : '';
      const cust =
        q.customer_name ||
        (q.customer_id != null ? `#${q.customer_id}` : '—');
      const prep =
        q.prepared_by_name ||
        (q.prepared_by != null ? String(q.prepared_by) : '—');
      const det = (q.details || '').toString().slice(0, 80);
      tr.innerHTML = `
        <td>${escapeHtml(q.number || '')}</td>
        <td>${escapeHtml(dateStr)}</td>
        <td>${escapeHtml(cust)}</td>
        <td>${escapeHtml(det)}</td>
        <td>${escapeHtml(prep)}</td>
        <td>${escapeHtml(st)}</td>
        <td class="home-quotes-order-cell"></td>
      `;
      const cell = tr.querySelector('.home-quotes-order-cell');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-home-order';
      const isOrder = stUp === 'SIPARIS';
      btn.textContent = isOrder ? 'Siparişte' : 'Sipariş';
      btn.disabled = !canOrder || isOrder;
      btn.dataset.quoteId = String(q.id);
      cell.appendChild(btn);
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('home quotes', e);
    tbody.innerHTML =
      '<tr><td colspan="7">Yükleme hatası.</td></tr>';
  }
}

async function downloadHomeWeeklyExcel() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Önce giriş yapın.');
    return;
  }
  try {
    const res = await fetch(
      `${window.location.origin}/api/user/quotes-weekly`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Excel indirilemedi.');
      return;
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const m = cd.match(/filename="([^"]+)"/);
    const name = m ? m[1] : 'teklifler-haftalik.xlsx';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert('İndirme başarısız.');
  }
}

async function loadCustomers() {
  const sel = document.getElementById('customerSelect');
  if (!sel) return;
  try {
    const token = localStorage.getItem('authToken');
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const res = await fetch(`${window.location.origin}/api/customers`, { headers });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return;
    const first = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    if (first) sel.appendChild(first);
    else {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = '— Müşteri Seçiniz —';
      sel.appendChild(o);
    }
    data.data.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = String(c.id);
      opt.textContent = c.company_name || c.name || `#${c.id}`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Müşteriler yüklenemedi:', e);
  }
}

function collectDraftFromForm() {
  const quoteNumber = document
    .getElementById('quoteNumberInput')
    ?.value.trim();
  const customerIdRaw = document.getElementById('customerSelect')?.value;
  const currency = document.getElementById('currencySelect')?.value || 'USD';
  return {
    quoteNumber,
    customerId:
      customerIdRaw === '' || customerIdRaw === undefined
        ? null
        : parseInt(customerIdRaw, 10),
    currency,
    lines: offerLines.map((l) => ({
      lineId: l.lineId,
      routeKey: l.routeKey,
      quantity: l.quantity,
      label: l.label,
    })),
  };
}

function syncSessionQuoteContext(draft) {
  const sel = document.getElementById('customerSelect');
  const selectedOpt = sel?.selectedOptions?.[0];
  try {
    sessionStorage.setItem(
      'quoteProjectContext',
      JSON.stringify({
        quoteNumber: draft.quoteNumber,
        currency: draft.currency,
        customerId: draft.customerId,
        customerName: selectedOpt && draft.customerId ? selectedOpt.text : '',
      })
    );
  } catch (_) {}
}

function syncCurrencyPill() {
  const cur = document.getElementById('currencySelect')?.value || 'USD';
  const pill = document.getElementById('currencyPill');
  if (pill) pill.textContent = cur;
}

document.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    img.loading = 'lazy';
    img.decoding = 'async';
  });

  populateProductSelect();
  loadCustomers();
  loadHomeQuotes();
  renderOfferLinesTable();

  document.getElementById('homeWeeklyExcelBtn')?.addEventListener('click', () => {
    downloadHomeWeeklyExcel();
  });

  document.getElementById('homeQuotesBody')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-home-order');
    if (!btn || btn.disabled) return;
    const id = btn.getAttribute('data-quote-id');
    if (!id) return;
    if (!confirm('Bu teklifi sipariş durumuna almak istiyor musunuz?')) return;
    try {
      const res = await fetch(
        `${window.location.origin}/api/user/quotes/${id}/order`,
        {
          method: 'PATCH',
          headers: homeAuthHeaders(),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) {
        alert(j.error || 'Güncellenemedi.');
        return;
      }
      await loadHomeQuotes();
    } catch (err) {
      console.error(err);
      alert('İstek başarısız.');
    }
  });

  document.getElementById('currencySelect')?.addEventListener('change', syncCurrencyPill);
  syncCurrencyPill();

  document.getElementById('addLineBtn')?.addEventListener('click', () => {
    const sel = document.getElementById('lineProductSelect');
    const qtyInput = document.getElementById('lineQtyInput');
    const routeKey = sel?.value;
    if (!routeKey) return;
    const meta = getProductMeta(routeKey);
    addOfferLine(routeKey, qtyInput?.value || 1, meta?.label);
    if (qtyInput) qtyInput.value = '1';
  });

  document.getElementById('startCostingBtn')?.addEventListener('click', async () => {
    const draft = collectDraftFromForm();
    if (!draft.quoteNumber) {
      alert('Lütfen teklif numarasını girin.');
      return;
    }
    if (!draft.lines.length) {
      alert('En az bir proje kalemi ekleyin.');
      return;
    }
    syncSessionQuoteContext(draft);
    sessionStorage.setItem('offerDraft', JSON.stringify(draft));

    // İlk ürünün pricing sayfasına yönlendir
    const firstLine = draft.lines[0];
    const meta = getProductMeta(firstLine.routeKey);
    if (meta) {
      location.href = meta.page + '?lineId=' + encodeURIComponent(firstLine.lineId);
    } else {
      location.href = 'project-costing.html';
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    location.href = 'login.html';
  });

  refreshCartBadge();

  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
});

async function refreshCartBadge() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const res = await fetch(`${window.location.origin}/api/cart`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await res.json().catch(() => ({}));
    const n = Array.isArray(data.data) ? data.data.length : 0;
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = String(n);
      badge.style.display = n > 0 ? 'inline-flex' : 'none';
    }
  } catch (_) {}
}

