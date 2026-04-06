/**
 * Proje maliyetlendirme kuyruğu: pricing sayfasında sepete eklendikten sonra
 * kuyruğu ilerletir ve maliyetlendirme özetine döner.
 */
(function () {
  window.onAddToCartProjectQueueHook = async function onAddToCartProjectQueueHook() {
    try {
      const raw = sessionStorage.getItem('pricingQueueContext');
      if (!raw || !window.api?.pricingQueueAdvance) return;
      const ctx = JSON.parse(raw);
      await window.api.pricingQueueAdvance();
      try {
        const token = localStorage.getItem('authToken');
        if (token && ctx?.lineId) {
          await fetch(`${window.location.origin}/api/web/pricing-queue/complete-line`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              lineId: ctx.lineId,
              quoteProjectId: ctx.quoteProjectId || null,
            }),
          });
        }
      } catch (_) {}
      sessionStorage.removeItem('pricingQueueContext');
      if (window.app?.navigate) {
        window.app.navigate('project-costing.html');
      }
    } catch (e) {
      console.warn('Proje kuyruğu ilerletilemedi:', e);
    }
  };
})();
