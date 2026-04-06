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
    // Bu sayfa her zaman URL'ye lineId ile gelmeyebilir; queue context üzerinden de bulmaya çalışıyoruz.
    const lineIdFromUrl = params.get('lineId');
    let lineId = lineIdFromUrl;
    if (!lineId) {
      try {
        const ctx = JSON.parse(sessionStorage.getItem('pricingQueueContext') || '{}');
        lineId = ctx.lineId;
      } catch (_) {}
    }
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

  /* ---- Zorunlu alan validasyonu ---- */
  function isEmptyValue(el) {
    if (!el) return true;
    const tag = String(el.tagName || '').toLowerCase();
    const type = String(el.type || '').toLowerCase();

    if (tag === 'select') return !String(el.value || '').trim();
    if (tag === 'textarea') return !String(el.value || '').trim();

    if (type === 'checkbox') return !el.checked;

    if (type === 'number') {
      const raw = String(el.value || '').trim();
      if (!raw) return true;
      const val = Number(raw);
      if (Number.isNaN(val)) return true;
      const minRaw = String(el.min || '').trim();
      if (minRaw) {
        const min = Number(minRaw);
        if (!Number.isNaN(min) && val < min) return true;
      }
      return false;
    }

    return !String(el.value || '').trim();
  }

  function isElementVisible(el) {
    if (!el) return false;
    return !!(el.offsetParent || (el.getClientRects && el.getClientRects().length));
  }

  function getMissingFieldsForStep(stepNum) {
    const miss = [];
    const addIfMissing = (id, label, conditionFn = () => true) => {
      const el = document.getElementById(id);
      if (!conditionFn()) return;
      if (isEmptyValue(el)) miss.push(label);
    };

    // 1) Proje Bilgileri
    if (stepNum === 1) {
      addIfMissing('projectCustomerName', 'Müşteri');
      addIfMissing('projectQuoteRef', 'Teklif No');
      addIfMissing('projectDeviceCount', 'Cihaz Adedi');
      addIfMissing('projectQuoteDate', 'Teklif Tarihi');
      addIfMissing('projectDeliveryWindow', 'Teslim Süresi');
      addIfMissing('projectIncoterms', 'İncoterms');
      addIfMissing('projectPackingType', 'Paketleme Türü');
      return miss;
    }

    // 2) Giriş Bilgileri
    if (stepNum === 2) {
      addIfMissing('inputVoltageNominal', 'Nominal Giriş Gerilimi');
      addIfMissing('inputVoltageTolerance', 'Giriş Toleransı');
      addIfMissing('inputPhase', 'Giriş Faz Sayısı');
      addIfMissing('inputNeutral', 'Giriş Nötr Bağlantısı');
      addIfMissing('systemFrequency', 'Giriş Frekansı');
      addIfMissing('acInputCurrentTHD', 'AC Giriş Akımı THD');
      return miss;
    }

    // 3) Çıkış Bilgileri
    if (stepNum === 3) {
      addIfMissing('outputVoltage', 'Nominal Çıkış Gerilimi');
      addIfMissing('outputCurrent', 'Nominal Çıkış Akımı');
      addIfMissing('topology', 'Topoloji');
      addIfMissing('dcRipple', 'DC Bara Dalgalılığı');
      addIfMissing('extraLoadOutput', 'Ek Yük Çıkışı');
      addIfMissing('diodeDropper', 'Diyot Dropper');
      addIfMissing('internalDistribution', 'Dahili DC Yük Dağıtımı');
      addIfMissing('batteryLVD', 'Akü LVD');
      return miss;
    }

    // 4) Akü Bilgileri
    if (stepNum === 4) {
      addIfMissing('batteryType', 'Akü Tipi');
      addIfMissing('batteryVoltage', 'Batarya Voltajı');
      addIfMissing('batteryInCabinet', 'Kutu İçinde Dahili Akü');
      addIfMissing('floatVoltagePerCell', 'Float Gerilimi');
      addIfMissing('equalizationVoltagePerCell', 'Dengeleme Gerilimi');
      addIfMissing('boostVoltagePerCell', 'Boost Gerilimi');

      const batteryInCabinetVal = document.getElementById('batteryInCabinet')?.value || '';
      const requireInternalBattery = batteryInCabinetVal === 'Var / Yes';
      addIfMissing('internalBatteryQuantity', 'Dahili Akü Adedi', () => requireInternalBattery && isElementVisible(document.getElementById('internalBatteryDetails')));
      addIfMissing('internalBatteryName', 'Dahili Akü Adı', () => requireInternalBattery && isElementVisible(document.getElementById('internalBatteryNameRow')));

      return miss;
    }

    // 5) Mekanik Bilgiler
    if (stepNum === 5) {
      addIfMissing('cabinetType', 'Kutu Tipi');
      addIfMissing('cabinetSize', 'Kutu Boyutları');
      addIfMissing('protectionClass', 'Koruma Sınıfı');
      addIfMissing('cabinetColor', 'Kutu Rengi');
      addIfMissing('cableEntry', 'Kablo Girişi');
      addIfMissing('sheetType', 'Sac Tipi');
      addIfMissing('cooling', 'Soğutma');
      addIfMissing('airflowDirection', 'Hava Akış Yönü');
      addIfMissing('operatingTemperature', 'Çalışma Sıcaklığı');

      const cabinetSizeVal = document.getElementById('cabinetSize')?.value || '';
      const requireCustomCabinet = cabinetSizeVal === 'Özel Boyutlar';
      addIfMissing('customCabinetWidth', 'Özel Genişlik', () => requireCustomCabinet && isElementVisible(document.getElementById('customCabinetSizeRow')));
      addIfMissing('customCabinetDepth', 'Özel Derinlik', () => requireCustomCabinet && isElementVisible(document.getElementById('customCabinetSizeRow')));
      addIfMissing('customCabinetHeight', 'Özel Yükseklik', () => requireCustomCabinet && isElementVisible(document.getElementById('customCabinetSizeRow')));

      return miss;
    }

    // 6) Kullanıcı Arayüzü
    if (stepNum === 6) {
      addIfMissing('frontPanel', 'Ön Panel Tipi');
      // Ölçü aletleri artık opsiyonel: bu adımda zorunlu tutulmaz.
      return miss;
    }

    // 7) Haberleşme
    if (stepNum === 7) {
      addIfMissing('communicationProtocol', 'Protokol');
      addIfMissing('relayAlarmOutputs', 'Röle Kuru Kontak Alarm Çıkışı');
      addIfMissing('parallelOperation', 'Paralel Çalışma');
      return miss;
    }

    // 8-9 opsiyonel
    return miss;
  }

  function ensureValidationMessageEl() {
    let el = document.getElementById('wizardValidationMessage');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'wizardValidationMessage';
    el.style.display = 'none';
    el.style.marginTop = '10px';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '10px';
    el.style.border = '1px solid var(--error, #ef4444)';
    el.style.background = 'rgba(239, 68, 68, 0.08)';
    el.style.color = 'var(--text-primary)';
    el.style.fontSize = '13px';
    el.style.maxWidth = '100%';
    const footer = document.querySelector('.wizard-footer');
    footer?.parentElement?.insertBefore(el, footer);
    return el;
  }

  function showValidationError(missingLabels) {
    const el = ensureValidationMessageEl();
    if (!el) return;
    el.textContent = `Bu adım için şu alanlar zorunlu: ${missingLabels.join(', ')}`;
    el.style.display = 'block';
  }

  function clearValidationError() {
    const el = document.getElementById('wizardValidationMessage');
    if (el) el.style.display = 'none';
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
      const draft = JSON.parse(sessionStorage.getItem('offerDraft') || '{}');
      if (draft.customerId) {
        sel.value = String(draft.customerId);
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

    const existing = String(el.value || '').trim();
    if (existing) return;

    // 1) localStorage.currentUser → hızlı yol
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
      const full =
        u?.full_name ||
        u?.fullName ||
        u?.name ||
        u?.username ||
        u?.email ||
        '';
      if (full) {
        el.value = String(full);
        return;
      }
    } catch (_) {}

    // 2) JWT payload → fallback
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const full =
          payload?.full_name || payload?.fullName || payload?.name || payload?.username || '';
        if (full) el.value = String(full);
      } catch (_) {}
    }

    // 3) /api/auth/me → istersen kesinleştirme
    if (!String(el.value || '').trim() && token) {
      (async () => {
        try {
          const r = await fetch(`${window.location.origin}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) return;
          const full =
            j?.data?.full_name ||
            j?.data?.fullName ||
            j?.data?.name ||
            j?.data?.username ||
            j?.full_name ||
            j?.fullName ||
            j?.name ||
            j?.username ||
            '';
          if (full) el.value = String(full);
        } catch (_) {}
      })();
    }
  }

  /* ---- Ölçüm noktası seçeneklerini tipe göre filtrele ---- */
  function updateMeasurementPointOptions() {
    const typeEl = document.getElementById('measurementInstrumentType');
    const pointEl = document.getElementById('measurementPoint');
    if (!typeEl || !pointEl) return;

    const typeVal = typeEl.value || '';
    const prevVal = pointEl.value;
    const typeLow = typeVal.toLowerCase();

    // Tüm olası seçenekler
    const allOptions = [
      { value: '', text: 'Ölçüm Noktası...' },
      // Nokta bazlı (multimetre için)
      { value: 'Yük / Load',    text: 'Yük / Load',    group: 'point' },
      { value: 'Akü / Battery', text: 'Akü / Battery', group: 'point' },
      { value: 'Giriş / Input', text: 'Giriş / Input', group: 'point' },
      // Detaylı (analog/dijital için)
      { value: 'Yük gerilimi / Load Voltage',      text: 'Yük Gerilimi',      group: 'detail' },
      { value: 'Yük akımı / Load Current',         text: 'Yük Akımı',         group: 'detail' },
      { value: 'Akü gerilimi / Battery Voltage',   text: 'Akü Gerilimi',      group: 'detail' },
      { value: 'Akü akımı / Battery Current',      text: 'Akü Akımı',         group: 'detail' },
      { value: 'Giriş gerilimler / Input Voltages',text: 'Giriş Gerilimler',  group: 'detail' },
      { value: 'Giriş akımlar / Input Currents',   text: 'Giriş Akımlar',     group: 'detail' },
    ];

    let allowed;
    if (typeLow.includes('multimetre') || typeLow.includes('multimeter')) {
      // Multimetre: yük, akü, giriş (tek alet hem akım hem voltaj ölçebildiğinden nokta bazlı)
      allowed = (o) => o.value === '' || o.group === 'point';
    } else if (typeLow.includes('enerji') || typeLow.includes('energy')) {
      // Enerji güç analizörü: sadece giriş
      allowed = (o) => o.value === '' || o.value === 'Giriş / Input';
    } else if (typeVal !== '') {
      // Analog / Dijital: gerilim–akım detaylı seçenekler
      allowed = (o) => o.value === '' || o.group === 'detail';
    } else {
      // Seçim yok → sadece placeholder
      allowed = (o) => o.value === '';
    }

    pointEl.innerHTML = '';
    allOptions.filter(allowed).forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.text;
      pointEl.appendChild(o);
    });

    // Önceki seçim hâlâ geçerliyse koru
    if ([...pointEl.options].some((o) => o.value === prevVal)) {
      pointEl.value = prevVal;
    }
  }

  /* ---- DOMContentLoaded ---- */
  document.addEventListener('DOMContentLoaded', () => {
    // Validasyon mesaj alanını hazırla
    ensureValidationMessageEl();

    fillFromSession();
    readLineFromUrl();
    loadCustomers();
    fillPreparedBy();

    // Ölçüm noktası filtresini başlat ve tipe bağla
    updateMeasurementPointOptions();
    document.getElementById('measurementInstrumentType')
      ?.addEventListener('change', updateMeasurementPointOptions);

    goToStep(1);

    document.getElementById('prevStepBtn')?.addEventListener('click', () => {
      clearValidationError();
      goToStep(currentStep - 1);
    });

    document.getElementById('nextStepBtn')?.addEventListener('click', () => {
      const next = currentStep + 1;
      const missing = getMissingFieldsForStep(currentStep);
      if (missing.length) {
        showValidationError(missing);
        return;
      }
      clearValidationError();
      goToStep(next);
    });

    // Adım bubble tıklama
    document.querySelectorAll('.wizard-step').forEach((s) => {
      s.addEventListener('click', () => {
        const n = parseInt(s.getAttribute('data-step'), 10);
        if (!n) return;
        // İleri atlamalarda sadece mevcut adım zorunluluklarını kontrol ediyoruz
        if (n > currentStep) {
          const missing = getMissingFieldsForStep(currentStep);
          if (missing.length) {
            showValidationError(missing);
            return;
          }
        }
        clearValidationError();
        goToStep(n);
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
