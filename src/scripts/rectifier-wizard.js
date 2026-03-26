/**
 * rectifier-wizard.js
 * Adım navigasyonu + session'dan form alanı doldurma
 */
(function () {
  const TOTAL_STEPS = 9;
  let currentStep = 1;

  /* ---- Session'dan teklif bilgilerini oku ve formu doldur ---- */
  function fillFromSession() {
    try {
      const ctx = JSON.parse(sessionStorage.getItem('quoteProjectContext') || '{}');
      const draft = JSON.parse(sessionStorage.getItem('offerDraft') || '{}');

      // Sidebar bilgileri
      const quoteRef = ctx.quoteNumber || draft.quoteNumber || '';
      const customerName = ctx.customerName || '';
      const el = (id) => document.getElementById(id);

      const sidebarRef = el('sidebarQuoteRef');
      const sidebarCust = el('sidebarCustomer');
      if (sidebarRef) sidebarRef.textContent = quoteRef || '—';
      if (sidebarCust) sidebarCust.textContent = customerName || '—';

      // Form alanları — Teklif No
      if (quoteRef && el('projectQuoteRef') && !el('projectQuoteRef').value) {
        el('projectQuoteRef').value = quoteRef;
      }

      // Bugünün tarihi
      if (el('projectQuoteDate') && !el('projectQuoteDate').value) {
        el('projectQuoteDate').value = new Date().toISOString().slice(0, 10);
      }
    } catch (_) {}
  }

  /* ---- URL parametresinden lineId al (proje kalemine bağlı) ---- */
  function readLineFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const lineId = params.get('lineId');
    if (!lineId) return;
    try {
      const draft = JSON.parse(sessionStorage.getItem('offerDraft') || '{}');
      const lines = Array.isArray(draft.lines) ? draft.lines : [];
      const line = lines.find((l) => l.lineId === lineId);
      if (!line) return;
      const el = (id) => document.getElementById(id);
      if (el('projectDeviceCount') && line.quantity) {
        el('projectDeviceCount').value = line.quantity;
      }
    } catch (_) {}
  }

  /* ---- Adım güncelle ---- */
  function goToStep(n) {
    if (n < 1 || n > TOTAL_STEPS) return;
    const prev = currentStep;
    currentStep = n;

    // Panel
    document.querySelectorAll('.wizard-panel').forEach((p, i) => {
      p.classList.toggle('active', i + 1 === currentStep);
    });

    // Step bubbles & connectors
    document.querySelectorAll('.wizard-step').forEach((s, i) => {
      const step = i + 1;
      s.classList.toggle('active', step === currentStep);
      s.classList.toggle('completed', step < currentStep);
    });

    document.querySelectorAll('.step-connector').forEach((c, i) => {
      c.classList.toggle('completed', i + 1 < currentStep);
    });

    // Footer butonları
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const calcBtn = document.getElementById('calculateCostsBtn');
    const label = document.getElementById('wizardStepLabel');

    if (prevBtn) prevBtn.disabled = currentStep === 1;
    if (label) label.textContent = `Adım ${currentStep} / ${TOTAL_STEPS}`;

    const isLast = currentStep === TOTAL_STEPS;
    if (nextBtn) nextBtn.style.display = isLast ? 'none' : 'flex';
    if (calcBtn) calcBtn.style.display = isLast ? 'flex' : 'none';

    // Scroll to top
    const main = document.querySelector('.wizard-main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---- Müşteri listesini yükle ---- */
  async function loadCustomers() {
    const sel = document.getElementById('projectCustomerName');
    if (!sel) return;
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const res = await fetch('/api/customers', { headers });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.data)) return;
      data.data.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = String(c.id);
        opt.textContent = c.company_name || c.name || `#${c.id}`;
        sel.appendChild(opt);
      });

      // Session'dan seçili müşteriyi uygula
      const ctx = JSON.parse(sessionStorage.getItem('quoteProjectContext') || '{}');
      if (ctx.customerId) {
        sel.value = String(ctx.customerId);
        const sidebarCust = document.getElementById('sidebarCustomer');
        if (sidebarCust) {
          const opt = sel.selectedOptions[0];
          if (opt) sidebarCust.textContent = opt.text;
        }
      }
    } catch (_) {}
  }

  /* ---- Hazırlayan alanını doldur ---- */
  function fillPreparedBy() {
    const el = document.getElementById('projectPreparedBy');
    if (!el) return;
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      el.value = payload.name || payload.username || '';
    } catch (_) {}
  }

  /* ---- DOMContentLoaded ---- */
  document.addEventListener('DOMContentLoaded', () => {
    fillFromSession();
    readLineFromUrl();
    loadCustomers();
    fillPreparedBy();
    goToStep(1);

    document.getElementById('prevStepBtn')?.addEventListener('click', () => goToStep(currentStep - 1));
    document.getElementById('nextStepBtn')?.addEventListener('click', () => goToStep(currentStep + 1));

    // Adım bubble tıklama
    document.querySelectorAll('.wizard-step').forEach((s) => {
      s.addEventListener('click', () => {
        const n = parseInt(s.getAttribute('data-step'), 10);
        if (n) goToStep(n);
      });
    });

    // saveCalcBtn → saveCalculationBtn tetikle
    document.getElementById('saveCalcBtn')?.addEventListener('click', () => {
      document.getElementById('saveCalculationBtn')?.click();
    });

    // calculateCostsBtn → mevcut pricing JS'in handler'ını tetikle
    // (rectifier-pricing.js kendi handler'ını #calculateCostsBtn'a bağlar)
  });
})();
