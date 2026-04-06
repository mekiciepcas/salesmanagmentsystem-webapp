const PRODUCT_ROUTE_OPTIONS = [
  { routeKey: 'rectifier', label: 'Rectifier', page: 'rectifier-pricing.html' },
  { routeKey: 'inverter', label: 'Inverter', page: 'inverter-pricing.html' },
  { routeKey: 'ups', label: 'UPS', page: 'ups-pricing.html' },
  { routeKey: 'vs', label: 'Voltaj Stabilizoru', page: 'stabilizer-pricing.html' },
  { routeKey: 'sts', label: 'Static Transfer Switch', page: 'sts-pricing.html' },
  { routeKey: 'fc', label: 'Frequency Converter', page: 'frequency-pricing.html' },
  { routeKey: 'dc_distribution', label: 'DC Dagitim', page: 'project-costing.html' },
  { routeKey: 'ac_distribution', label: 'AC Dagitim', page: 'project-costing.html' },
  { routeKey: 'bypass_cabinet', label: 'Bypass Kabini', page: 'project-costing.html' },
  { routeKey: 'battery_cabinet', label: 'Aku Kabini', page: 'project-costing.html' },
];

let offerLines = [];
let quoteProjects = [];
let allCustomers = [];

function apiHeaders() {
  const token = localStorage.getItem('authToken');
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function newLineId() {
  return `L${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(s) {
  return String(s || '')
    .toLocaleLowerCase('tr-TR')
    .trim();
}

/* ─── CustomerCombobox ──────────────────────────────────────────────────────
   Tek input ile ara + seç. Seçim gizli #customerSelect'e yansır.
   ────────────────────────────────────────────────────────────────────────── */
class CustomerCombobox {
  constructor() {
    this.input    = document.getElementById('customerComboInput');
    this.list     = document.getElementById('customerComboList');
    this.hidden   = document.getElementById('customerSelect');
    this.addBtn   = document.getElementById('addCustomerBtn');
    this.wrapper  = document.getElementById('customerComboWrapper');
    this.storageIdKey = 'epcSelectedCustomerId';
    this.storageLabelKey = 'epcSelectedCustomerLabel';
    this._open    = false;
    this._active  = -1;   // klavye navigasyonu için aktif index
    if (!this.input) return;
    this._bind();

    // Önceki seçim kaybolmasın diye sayfa yüklenirken restore et.
    const savedId = sessionStorage.getItem(this.storageIdKey);
    const savedLabel = sessionStorage.getItem(this.storageLabelKey);
    if (savedId && this.hidden) this.hidden.value = String(savedId);
    if (savedLabel) this.input.value = String(savedLabel);
  }

  /* ── Public API ── */
  /** Müşteri listesi yüklenince çağrılır */
  setCustomers(customers) {
    this._render(customers);
  }

  /** Seçili müşteri id'sini döner (ya da '') */
  getValue() {
    return this.hidden ? this.hidden.value : '';
  }

  /* ── Private ── */
  _label(c) {
    const country = c.country ? ` (${c.country})` : '';
    return `${c.company_name || c.name || `#${c.id}`}${country}`;
  }

  _filtered(query) {
    if (!query) return allCustomers;
    const q = normalizeText(query);
    return allCustomers.filter((c) => {
      return normalizeText(c.company_name || c.name || '').includes(q)
          || normalizeText(c.country || '').includes(q);
    });
  }

  _render(customers) {
    const list = this.list;
    list.innerHTML = '';
    this._active = -1;

    if (customers.length === 0) {
      const li = document.createElement('li');
      li.className = 'customer-combo__empty';
      li.textContent = 'Sonuç yok — Yeni müşteri ekleyin';
      li.setAttribute('role', 'option');
      list.appendChild(li);
      this.addBtn?.classList.remove('is-hidden');
    } else {
      this.addBtn?.classList.add('is-hidden');
      customers.forEach((c, i) => {
        const li = document.createElement('li');
        li.className = 'customer-combo__item';
        li.setAttribute('role', 'option');
        li.setAttribute('data-id', String(c.id));
        li.setAttribute('data-label', this._label(c));
        li.setAttribute('data-index', i);
        li.textContent = this._label(c);
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();           // blur'ı engelle
          this._select(c);
        });
        list.appendChild(li);
      });
    }
  }

  _select(c) {
    const label = this._label(c);
    this.input.value = label;
    if (this.hidden) this.hidden.value = String(c.id);
    // Seçimi sayfada başka bölgelere tıklansa bile korumak için sakla.
    sessionStorage.setItem(this.storageIdKey, String(c.id));
    sessionStorage.setItem(this.storageLabelKey, label);
    this.input.setAttribute('aria-expanded', 'false');
    this._close();
  }

  _clear() {
    this.input.value = '';
    if (this.hidden) this.hidden.value = '';
    sessionStorage.removeItem(this.storageIdKey);
    sessionStorage.removeItem(this.storageLabelKey);
  }

  _open_() {
    this._open = true;
    this.list.classList.add('customer-combo__list--visible');
    this.input.setAttribute('aria-expanded', 'true');
  }

  _close() {
    this._open = false;
    this._active = -1;
    this.list.classList.remove('customer-combo__list--visible');
    this.input.setAttribute('aria-expanded', 'false');
    this._clearActive();
  }

  _clearActive() {
    this.list.querySelectorAll('.customer-combo__item--active').forEach((el) =>
      el.classList.remove('customer-combo__item--active')
    );
  }

  _setActive(index) {
    this._clearActive();
    const items = this.list.querySelectorAll('.customer-combo__item');
    if (index < 0 || index >= items.length) { this._active = -1; return; }
    this._active = index;
    items[index].classList.add('customer-combo__item--active');
    items[index].scrollIntoView({ block: 'nearest' });
  }

  _bind() {
    const input = this.input;

    input.addEventListener('focus', () => {
      this._render(this._filtered(input.value));
      this._open_();
    });

    input.addEventListener('input', () => {
      const filtered = this._filtered(input.value);
      this._render(filtered);
      if (input.value === '') {
        if (this.hidden) this.hidden.value = '';
      }
      if (!this._open) this._open_();
    });

    input.addEventListener('blur', () => {
      // Eğer seçim yoksa ve text yazılmışsa temizle
      setTimeout(() => {
        const savedId = sessionStorage.getItem(this.storageIdKey);
        const savedLabel = sessionStorage.getItem(this.storageLabelKey);
        // Blur anında hidden select değeri boşsa, session'dan restore et.
        if ((!this.hidden?.value || !this.hidden?.value.trim()) && savedId && savedLabel) {
          if (this.hidden) this.hidden.value = String(savedId);
          this.input.value = String(savedLabel);
          return;
        }
        if (!this.hidden?.value && input.value) this._clear();
        this._close();
      }, 150);
    });

    input.addEventListener('keydown', (e) => {
      const items = this.list.querySelectorAll('.customer-combo__item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this._open) this._open_();
        this._setActive(Math.min(this._active + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._setActive(Math.max(this._active - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this._active >= 0 && items[this._active]) {
          const id = items[this._active].getAttribute('data-id');
          const c = allCustomers.find((x) => String(x.id) === id);
          if (c) this._select(c);
        }
      } else if (e.key === 'Escape') {
        this._clear();
        this._close();
      }
    });

    // Chevron ikonuna tıklanınca toggle
    this.wrapper?.querySelector('.customer-combo__chevron')?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (this._open) { this._close(); input.blur(); }
      else { input.focus(); }
    });
  }
}

let customerComboInstance = null;

function syncHiddenCustomerSelect(customers) {
  const hidden = document.getElementById('customerSelect');
  if (!hidden) return;
  hidden.innerHTML = '<option value="">— Müşteri Seçiniz —</option>';
  (Array.isArray(customers) ? customers : []).forEach((customer) => {
    const option = document.createElement('option');
    option.value = String(customer.id);
    const country = customer.country ? ` (${customer.country})` : '';
    option.textContent = `${customer.company_name || customer.name || `#${customer.id}`}${country}`;
    hidden.appendChild(option);
  });
  const savedId = sessionStorage.getItem('epcSelectedCustomerId');
  if (savedId) hidden.value = String(savedId);
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

function addOfferLine(routeKey, quantity, description) {
  const meta = PRODUCT_ROUTE_OPTIONS.find((p) => p.routeKey === routeKey);
  if (!meta) return;
  offerLines.push({
    lineId: newLineId(),
    routeKey,
    label: meta.label,
    lineDescription: (description || '').trim(),
    quantity: Math.max(1, parseInt(quantity, 10) || 1),
    progressStatus: 'pending',
    revisionVersion: 0,
  });
  renderOfferLinesTable();
}

function renderOfferLinesTable() {
  const tbody = document.getElementById('offerLinesBody');
  const empty = document.getElementById('offerLinesEmpty');
  if (!tbody) return;
  tbody.innerHTML = '';
  offerLines.forEach((l, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(l.label)} <span class="offer-line-meta">(${esc(l.routeKey)})</span></td>
      <td>${esc(l.lineDescription || '-')}</td>
      <td><input type="number" min="1" class="offer-qty-input" data-index="${i}" value="${l.quantity}" /></td>
      <td><button type="button" class="btn-line-remove" data-index="${i}">Kaldir</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.offer-qty-input').forEach((el) => {
    el.addEventListener('change', () => {
      const i = parseInt(el.getAttribute('data-index'), 10);
      if (offerLines[i]) offerLines[i].quantity = Math.max(1, parseInt(el.value, 10) || 1);
    });
  });
  tbody.querySelectorAll('.btn-line-remove').forEach((el) => {
    el.addEventListener('click', () => {
      const i = parseInt(el.getAttribute('data-index'), 10);
      offerLines.splice(i, 1);
      renderOfferLinesTable();
    });
  });
  if (empty) empty.classList.toggle('is-hidden', offerLines.length > 0);
}

function collectDraft() {
  const quoteNumber = (document.getElementById('quoteNumberInput')?.value || '').trim();
  const customerRaw =
    document.getElementById('customerSelect')?.value ||
    sessionStorage.getItem('epcSelectedCustomerId') ||
    '';
  const customerName =
    sessionStorage.getItem('epcSelectedCustomerLabel') ||
    (document.getElementById('customerComboInput')?.value || '').trim() ||
    '';
  const currency = document.getElementById('currencySelect')?.value || 'USD';
  return {
    quoteNumber,
    customerId: customerRaw ? parseInt(customerRaw, 10) : null,
    customerName,
    currency,
    lines: offerLines.map((l) => ({ ...l })),
  };
}

async function loadCustomers() {
  try {
    const res = await fetch(`${window.location.origin}/api/customers?limit=500`, {
      headers: apiHeaders(),
    });
    const j = await res.json();
    allCustomers = (j.success && Array.isArray(j.data)) ? j.data : [];
  } catch (e) {
    console.error('Musteri yukleme hatasi', e);
    allCustomers = [];
  }
  syncHiddenCustomerSelect(allCustomers);
  customerComboInstance?.setCustomers(allCustomers);
}

function projectStatusLabel(proj) {
  const raw = String(proj?.status || '').toUpperCase();
  if (raw === 'IN_PROGRESS' || raw === 'PENDING' || raw === 'PROCESSING') return 'İşlemde';
  if (raw === 'COMPLETED' || raw === 'DONE' || raw === 'DOC_READY') return 'Tamamlandı';
  if (raw === 'REVIZE' || raw === 'REVISED' || raw === 'REVISION') return 'Devam Ediyor';
  return 'İşlemde';
}

function projectStatusClass(proj) {
  const label = projectStatusLabel(proj);
  if (label === 'Tamamlandı') return 'completed';
  if (label === 'Devam Ediyor') return 'revised';
  return 'in-progress';
}

function lineProgressStatusLabel(status) {
  const raw = String(status || '').toLowerCase();
  if (raw === 'pending' || raw === 'askıda' || raw === 'askida') return 'Beklemede';
  if (raw === 'completed' || raw === 'tamamlandı' || raw === 'tamamlandi') return 'Tamamlandı';
  if (raw === 'in_progress' || raw === 'in progress' || raw === 'işlemde' || raw === 'islemde') {
    return 'Devam Ediyor';
  }
  return String(status || 'Beklemede');
}

function lineProgressStatusClass(status) {
  const raw = String(status || '').toLowerCase();
  if (raw === 'completed' || raw === 'tamamlandı' || raw === 'tamamlandi') return 'tamamlandi';
  if (raw === 'in_progress' || raw === 'in progress' || raw === 'işlemde' || raw === 'islemde') {
    return 'islemde';
  }
  return 'beklemede';
}

function renderProjectTreeRow(proj) {
  const lines = Array.isArray(proj.lines_json) ? proj.lines_json : [];
  const projectStatus = projectStatusLabel(proj);
  const statusClass = projectStatusClass(proj);
  return `
    <tr class="home-project-row home-project-row--${statusClass}" data-project-id="${proj.id}" data-action="expand" data-id="${proj.id}" title="Kalemleri görmek için tıklayın">
      <td>${esc(proj.quote_number || '')}</td>
      <td>${esc(new Date(proj.created_at || Date.now()).toLocaleDateString('tr-TR'))}</td>
      <td>${esc(proj.customer_name || '-')}</td>
      <td>${esc(`${lines.length} kalem`)}</td>
      <td>${esc(proj.prepared_by_fullname || proj.prepared_by_name || 'Kullanici')}</td>
      <td>${esc(projectStatus)}</td>
      <td><div class="home-actions">
        <button type="button" class="btn-home-action" data-action="resume" data-id="${proj.id}">Devam Et</button>
        <button type="button" class="btn-home-action" data-action="docs" data-id="${proj.id}">Dokuman</button>
        <button type="button" class="btn-home-action btn-home-action--danger" data-action="delete" data-id="${proj.id}">Sil</button>
      </div></td>
    </tr>
    <tr class="home-project-lines" id="project-lines-${proj.id}" style="display:none">
      <td colspan="7">
        <div class="project-lines-wrap" role="table" aria-label="Kalem revizyon durumu">
          <div class="project-line-item project-line-item--head" role="row">
            <div class="project-line-main"><strong>Cihaz Açıklamaları</strong></div>
            <div class="project-line-status"><strong>Cihaz Maliyet Hazırlama Durumu</strong></div>
            <div class="project-line-qty"><strong>Adet</strong></div>
            <div class="project-line-qty"><strong>Hesaplanan Fiyat</strong></div>
            <div class="project-line-actions"><strong>Revizyon</strong></div>
          </div>
          ${(lines || [])
            .map((l) => {
              const lineId = l.lineId || '';
              const routeKey = l.routeKey || '';
              const label = l.label || routeKey;
              const qty = l.quantity ?? 1;
              const statusRaw = l.progressStatus || 'pending';
              const status = lineProgressStatusLabel(statusRaw);
              const statusKey = lineProgressStatusClass(statusRaw);
              const revV = Number.isFinite(Number(l.revisionVersion)) ? Number(l.revisionVersion) : 0;
              const calcPrice =
                Number(l.totalPrice || l.total_price || l.calculatedPrice || 0) || 0;
              const revTag = `Revize ${String(revV).padStart(2, '0')}`;
              return `
                <div class="project-line-item" role="row">
                  <div class="project-line-main">
                    <div class="project-line-title">
                      <strong>${esc(label)}</strong> (${esc(routeKey)})
                    </div>
                    <div class="project-line-sub">${esc(l.lineDescription || '')}</div>
                  </div>

                  <div class="project-line-status">
                    <span class="revision-badge revision-badge--status revision-badge--${esc(statusKey)}">${esc(status)}</span>
                  </div>

                  <div class="project-line-qty">
                    ${esc(qty)} adet
                  </div>
                  <div class="project-line-qty">
                    ${calcPrice > 0 ? esc(calcPrice.toFixed(2)) + ' ₺' : '-'}
                  </div>

                  <div class="project-line-actions">
                    <button
                      type="button"
                      class="btn-home-action btn-home-action--revise-line"
                      data-action="revise"
                      data-id="${proj.id}"
                      data-line-id="${esc(lineId)}"
                      ${lineId ? '' : 'disabled'}
                    >
                      Kalem Revize
                    </button>
                    <span class="revision-badge revision-badge--version">${esc(revTag)}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </td>
    </tr>
  `;
}

async function loadHomeProjects() {
  const tbody = document.getElementById('homeQuotesBody');
  if (!tbody) return;
  try {
    const r = await fetch(`${window.location.origin}/api/quote-projects/my`, {
      headers: apiHeaders(),
    });
    const j = await r.json();
    if (!r.ok || !j.success) throw new Error(j.error || 'Liste alinamadi');
    quoteProjects = Array.isArray(j.data) ? j.data : [];
    if (!quoteProjects.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Kayitli proje yok.</td></tr>';
      return;
    }
    tbody.innerHTML = quoteProjects.map(renderProjectTreeRow).join('');
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Yukleme hatasi.</td></tr>';
  }
}

async function startCostingFlow() {
  const draft = collectDraft();
  if (!draft.quoteNumber) return alert('Teklif no gerekli.');
  if (!draft.lines.length) return alert('En az bir kalem ekleyin.');
  try {
    const upsertRes = await fetch(`${window.location.origin}/api/quote-projects/upsert`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        quote_number: draft.quoteNumber,
        customer_id: draft.customerId,
        currency: draft.currency,
        lines_json: draft.lines,
        status: 'IN_PROGRESS',
      }),
    });
    const upsertJson = await upsertRes.json().catch(() => ({}));
    if (!upsertRes.ok || !upsertJson?.success) {
      throw new Error(upsertJson?.error || 'Teklif projesi kaydedilemedi');
    }
    const nextDraft = {
      ...draft,
      quoteProjectId: upsertJson?.data?.id || null,
    };
    await window.api.offerDraftSet(nextDraft);
    const build = await window.api.pricingQueueBuildFromDraft();
    if (!build?.success) throw new Error(build?.error || 'Kuyruk olusmadi');
    sessionStorage.setItem('offerDraft', JSON.stringify(nextDraft));
    if (nextDraft.quoteProjectId) {
      sessionStorage.setItem('quoteProjectId', String(nextDraft.quoteProjectId));
    }
    location.href = 'project-costing.html';
  } catch (e) {
    console.error(e);
    alert('Maliyet akisi baslatilamadi.');
  }
}

async function handleProjectAction(action, id, lineId = null) {
  const pid = parseInt(id, 10);
  if (!pid) return;
  if (action === 'expand') {
    const row = document.getElementById(`project-lines-${pid}`);
    if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
    return;
  }
  if (action === 'resume') {
    const res = await fetch(`${window.location.origin}/api/user/quote-projects/${pid}/resume`, {
      method: 'POST',
      headers: apiHeaders(),
    });
    const j = await res.json();
    if (!res.ok || !j.success) return alert(j.error || 'Resume basarisiz');
    sessionStorage.setItem('offerDraft', JSON.stringify(j.draft || {}));
    location.href = 'project-costing.html';
    return;
  }
  if (action === 'revise') {
    const proj = quoteProjects.find((p) => p.id === pid);
    if (!proj) return;
    const lines = Array.isArray(proj.lines_json) ? proj.lines_json : [];
    if (!lines.length) return alert('Revize edilecek kalem yok.');

    const targetLineId = lineId != null ? String(lineId) : null;
    const hasTarget = targetLineId ? lines.some((l) => String(l.lineId || '') === targetLineId) : true;
    if (!hasTarget) return alert('Seçilen kalem bulunamadi.');

    // Seçilen kalem(ler) dışında diger kalemlerin progress durumunu koru.
    const revised = lines.map((l) => {
      if (!targetLineId) return { ...l, progressStatus: 'pending' };
      if (String(l.lineId || '') !== targetLineId) return l;
      return { ...l, progressStatus: 'pending' };
    });
    const patchRes = await fetch(`${window.location.origin}/api/user/quote-projects/${pid}`, {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify({
        lines_json: revised,
        status: 'REVIZE',
        revisionNote: 'Kullanici revizyonu',
        incrementRevision: false,
        revisionTargetLineIds: targetLineId ? [targetLineId] : [],
      }),
    });
    const patchJson = await patchRes.json();
    if (!patchRes.ok || !patchJson.success) {
      return alert(patchJson.error || 'Revize kaydedilemedi');
    }
    const resumeRes = await fetch(`${window.location.origin}/api/user/quote-projects/${pid}/resume`, {
      method: 'POST',
      headers: apiHeaders(),
    });
    const resumeJson = await resumeRes.json().catch(() => ({}));
    if (!resumeRes.ok || !resumeJson.success) {
      return alert(resumeJson.error || 'Revize akisi baslatilamadi');
    }
    sessionStorage.setItem('offerDraft', JSON.stringify(resumeJson.draft || {}));
    location.href = 'project-costing.html';
    return;
  }
  if (action === 'docs') {
    const proj = quoteProjects.find((p) => p.id === pid);
    if (!proj) return;
    const q = await fetch(`${window.location.origin}/api/user/quotes?limit=100`, {
      headers: apiHeaders(),
    });
    const jq = await q.json().catch(() => ({ success: false }));
    const match = (jq.data || []).find((x) => x.number === proj.quote_number);
    if (!match) return alert('Bu projeye bagli teklif bulunamadi.');
    const r = await fetch(`${window.location.origin}/api/quote-documents?quoteId=${match.id}`, {
      headers: apiHeaders(),
    });
    const j = await r.json();
    if (!r.ok || !j.success) return alert(j.error || 'Dokuman listesi alinamadi');
    if (!j.data.length) {
      const generateNow = confirm('Kayitli dokuman yok. Dokuman paketi olusturulsun mu?');
      if (!generateNow) return;
      const fin = await fetch(`${window.location.origin}/api/user/quote-projects/${pid}/finalize-docs`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      const finJ = await fin.json().catch(() => ({}));
      if (!fin.ok || !finJ.success) return alert(finJ.error || 'Dokuman paketi olusturulamadi');
      return alert('Dokuman kayitlari olusturuldu. Tekrar Dokuman butonuna tiklayin.');
    }
    const lines = j.data.map((d) => {
      const flag = d.file_exists ? 'hazir' : 'olusturulmamis';
      return `${d.doc_type} [${flag}] -> ${d.file_path}`;
    });
    alert(lines.join('\n'));
    return;
  }
  if (action === 'delete') {
    if (!confirm('Bu proje teklifini silmek istiyor musunuz?')) return;
    const res = await fetch(`${window.location.origin}/api/user/quote-projects/${pid}`, {
      method: 'DELETE',
      headers: apiHeaders(),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) return alert(j.error || 'Silinemedi');
    await loadHomeProjects();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  populateProductSelect();
  renderOfferLinesTable();

  // Combobox'ı müşteriler yüklenmeden önce init et
  customerComboInstance = new CustomerCombobox();

  await loadCustomers();
  await loadHomeProjects();

  document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
    location.href = 'dashboard.html#customers';
  });

  document.getElementById('addLineBtn')?.addEventListener('click', () => {
    const routeKey = document.getElementById('lineProductSelect')?.value;
    const qty = document.getElementById('lineQtyInput')?.value || 1;
    const desc = document.getElementById('lineDescriptionInput')?.value || '';
    if (!routeKey) return;
    addOfferLine(routeKey, qty, desc);
    const descInput = document.getElementById('lineDescriptionInput');
    if (descInput) descInput.value = '';
    const qtyInput = document.getElementById('lineQtyInput');
    if (qtyInput) qtyInput.value = '1';
  });

  document.getElementById('startCostingBtn')?.addEventListener('click', startCostingFlow);

  document.getElementById('homeQuotesBody')?.addEventListener('click', async (e) => {
    const row = e.target.closest('tr.home-project-row');
    if (row && !e.target.closest('button[data-action]')) {
      await handleProjectAction('expand', row.getAttribute('data-project-id'));
      return;
    }
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    await handleProjectAction(
      btn.getAttribute('data-action'),
      btn.getAttribute('data-id'),
      btn.getAttribute('data-line-id')
    );
  });

  document.getElementById('homeWeeklyExcelBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('homeWeeklyExcelBtn');
    const originalText = btn ? btn.textContent : '';
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Excel hazırlanıyor...';
      }
      const res = await fetch(`${window.location.origin}/api/user/quotes-weekly`, {
        headers: apiHeaders(),
      });
      if (!res.ok) {
        let message = 'Excel indirilemedi';
        try {
          const err = await res.json();
          if (err?.error) message = err.error;
        } catch (_) {}
        throw new Error(message);
      }

      const contentType = String(res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        let message = 'Excel oluşturulamadı';
        try {
          const payload = await res.json();
          if (payload?.error) message = payload.error;
        } catch (_) {}
        throw new Error(message);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Excel boş döndü, lütfen tekrar deneyin.');
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teklifler-son7gun.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Excel indirilemedi');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText || 'Son 7 Gün Excel';
      }
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    location.href = 'login.html';
  });

  // Canlı döviz kurlarını sidebar'a yükle
  (async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/exchange-rates`);
      const j = await res.json();
      if (!j.success || !j.rates) return;
      const fmt = (n) => (n != null ? Number(n).toFixed(2) : '—');
      const usdEl = document.getElementById('rateUSD');
      const eurEl = document.getElementById('rateEUR');
      if (usdEl) usdEl.textContent = `1 USD = ${fmt(j.rates.USD_TRY)} ₺`;
      if (eurEl) eurEl.textContent = `1 EUR = ${fmt(j.rates.EUR_TRY)} ₺`;
      const pill = document.getElementById('currencyPill');
      if (pill) pill.title = `Güncel kur ${j.date || ''}`;
    } catch (_) {}
  })();
});
