document.addEventListener('DOMContentLoaded', async () => {
  document.body.style.opacity = '1';

  const emptyState = document.getElementById('emptyState');
  const mainContent = document.getElementById('mainCostingContent');
  const summaryEl = document.getElementById('projectSummary');
  const costingGridCard = document.getElementById('costingGridCard');
  const costingGridBody = document.getElementById('costingGridBody');
  const stepsProgress = document.getElementById('stepsProgress');
  const stepsList = document.getElementById('stepsList');
  const btnNext = document.getElementById('btnNextPricing');
  const btnBack = document.getElementById('btnBackAnasayfa');
  const selectedLineIds = new Set();

  function costingStorageKey(draft) {
    const n = draft && draft.quoteNumber ? String(draft.quoteNumber) : 'anon';
    return `epcCostingGrid:${n}`;
  }

  function readCostingStore(draft) {
    try {
      return JSON.parse(sessionStorage.getItem(costingStorageKey(draft)) || '{}');
    } catch (_) {
      return {};
    }
  }

  function writeCostingStore(draft, obj) {
    try {
      sessionStorage.setItem(
        costingStorageKey(draft),
        JSON.stringify(obj)
      );
      sessionStorage.setItem('epcCostingGrid', JSON.stringify(obj));
    } catch (_) {}
  }

  function renderCostingGrid(draft) {
    if (!costingGridBody || !draft?.lines?.length) {
      if (costingGridBody) costingGridBody.innerHTML = '';
      return;
    }
    const store = readCostingStore(draft);
    costingGridBody.innerHTML = '';
    draft.lines.forEach((line) => {
      const tr = document.createElement('tr');
      const lid = line.lineId || line.routeKey;
      const cur = store[lid] || {};
      tr.innerHTML = `
        <td>${escapeHtml(line.label || line.routeKey)}</td>
        <td>${escapeHtml(line.routeKey || '')}</td>
        <td>${escapeHtml(String(line.quantity ?? 1))}</td>
        <td><input type="text" class="input-cost-note" data-line-id="${escapeHtml(lid)}" value="${escapeHtml(cur.note || '')}" placeholder="Not" /></td>
        <td><input type="number" class="input-cost-amt" data-line-id="${escapeHtml(lid)}" step="0.01" value="${escapeHtml(cur.amount != null ? String(cur.amount) : '')}" placeholder="0" /></td>
      `;
      costingGridBody.appendChild(tr);
    });

    costingGridBody.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('change', () => {
        const next = readCostingStore(draft);
        costingGridBody.querySelectorAll('input').forEach((el) => {
          const id = el.getAttribute('data-line-id');
          if (!id) return;
          if (!next[id]) next[id] = {};
          if (el.classList.contains('input-cost-note')) next[id].note = el.value;
          if (el.classList.contains('input-cost-amt'))
            next[id].amount = el.value === '' ? null : Number(el.value);
        });
        writeCostingStore(draft, next);
      });
    });
  }

  if (!window.api?.offerDraftGet || !window.api?.pricingQueueGet) {
    emptyState.style.display = 'block';
    mainContent.style.display = 'none';
    return;
  }

  async function refresh() {
    const draft = await window.api.offerDraftGet();
    const queue = await window.api.pricingQueueGet();

    if (!queue?.steps?.length || !draft) {
      emptyState.style.display = 'block';
      mainContent.style.display = 'none';
      if (costingGridCard) costingGridCard.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    mainContent.style.display = 'block';
    if (costingGridCard) costingGridCard.style.display = 'block';

    // Maliyet grid bloğu (opsiyonel) kaldırıldı; eski verilerin karışmasını engelleyelim.
    if (!costingGridCard) {
      try {
        sessionStorage.removeItem('epcCostingGrid');
      } catch (_) {}
    }
    renderCostingGrid(draft);
    if (draft.quoteProjectId) {
      try {
        sessionStorage.setItem('quoteProjectId', String(draft.quoteProjectId));
      } catch (_) {}
    }

    const customerSummary =
      draft.customerName
        ? `Müşteri: ${draft.customerName}`
        : draft.customerId != null
          ? `Müşteri ID: ${draft.customerId}`
          : 'Müşteri seçilmedi';
    summaryEl.innerHTML = `
      <div><strong>Teklif no:</strong> ${escapeHtml(draft.quoteNumber || '—')}</div>
      <div><strong>Para birimi:</strong> ${escapeHtml(draft.currency || 'USD')}</div>
      <div><strong>${escapeHtml(customerSummary)}</strong></div>
      <div><strong>Kalem sayısı (satır):</strong> ${draft.lines?.length ?? 0}</div>
    `;

    const total = queue.steps.length;
    const cur = queue.currentStep;
    const doneCount = queue.steps.filter((s) => s.done).length;

    if (cur >= total) {
      stepsProgress.textContent =
        `Tüm kalemler için sıra tamamlandı (${doneCount}/${total}). Sepete eklenen ürünlerle teklif hazırlayabilirsiniz.`;
      const quoteProjectId = sessionStorage.getItem('quoteProjectId');
      if (quoteProjectId && localStorage.getItem('authToken')) {
        fetch(`${window.location.origin}/api/user/quote-projects/${quoteProjectId}/finalize-docs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }).catch(() => {});
      }
      btnNext.textContent = 'Teklif Hazırla sayfasına git';
      btnNext.onclick = () => window.app.navigate('prepare-quote.html');
    } else {
      stepsProgress.textContent = `İlerleme: ${doneCount} tamamlandı, sıradaki adım ${cur + 1} / ${total}`;
      btnNext.textContent = 'Sıradaki kaleme git';
      btnNext.onclick = () => {
        const firstSelectedIndex = queue.steps.findIndex((s, i) =>
          selectedLineIds.has(String(s.lineId || `${s.routeKey}-${i}`)) && !s.done
        );
        if (firstSelectedIndex >= 0) {
          goToStep(firstSelectedIndex);
          return;
        }
        goToStep(cur);
      };
    }

    stepsList.innerHTML = '';
    queue.steps.forEach((step, i) => {
      const lineKey = String(step.lineId || `${step.routeKey}-${i}`);
      if (!selectedLineIds.size) selectedLineIds.add(lineKey);
      const isSelected = selectedLineIds.has(lineKey);
      const li = document.createElement('li');
      const isCurrent = i === cur && cur < total;
      const completed = step.done || i < cur;
      if (isCurrent) li.classList.add('is-current');
      if (completed && !isCurrent) li.classList.add('is-done');
      const unitNote =
        step.totalInLine > 1
          ? ` (${step.instanceIndex}/${step.totalInLine})`
          : '';
      li.innerHTML = `
        <span class="step-badge">${i + 1}</span>
        <input type="checkbox" class="step-select-checkbox" data-line-key="${escapeHtml(lineKey)}" ${isSelected ? 'checked' : ''} title="Bu kalemi maliyetlendirme sırasına dahil et" />
        <span>${escapeHtml(step.label)}${escapeHtml(unitNote)} — ${escapeHtml(step.pricingPage)}</span>
        ${
          completed && !isCurrent
            ? '<span style="margin-left:auto">Tamamlandı</span>'
            : isCurrent
              ? '<span style="margin-left:auto">Sırada</span>'
              : ''
        }
      `;
      stepsList.appendChild(li);
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => goToStep(i));
      const check = li.querySelector('.step-select-checkbox');
      if (check) {
        check.addEventListener('click', (ev) => ev.stopPropagation());
        check.addEventListener('change', () => {
          if (check.checked) selectedLineIds.add(lineKey);
          else selectedLineIds.delete(lineKey);
        });
      }
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  async function goToStep(stepIndex) {
    const queue = await window.api.pricingQueueGet();
    if (!queue?.steps?.length || stepIndex < 0 || stepIndex >= queue.steps.length)
      return;

    const step = queue.steps[stepIndex];
    let draftCustomerId = null;
    let draftCustomerName = '';
    try {
      const storedDraft = JSON.parse(sessionStorage.getItem('offerDraft') || '{}');
      draftCustomerId = storedDraft?.customerId ?? null;
      draftCustomerName = storedDraft?.customerName || '';
    } catch (_) {}
    try {
      sessionStorage.setItem(
        'pricingQueueContext',
        JSON.stringify({
          stepIndex,
          totalSteps: queue.steps.length,
          lineId: step.lineId,
          label: step.label,
          routeKey: step.routeKey,
          pricingPage: step.pricingPage,
          quoteProjectId: sessionStorage.getItem('quoteProjectId') || '',
          customerId: draftCustomerId,
          customerName: draftCustomerName,
        })
      );
    } catch (_) {}

    window.app.navigate(step.pricingPage);
  }

  btnBack?.addEventListener('click', () => {
    window.app.navigate('anasayfa.html');
  });

  await refresh();

});
