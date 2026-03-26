/**
 * Proje maliyetlendirme kuyruğu: pricing sayfasında sepete eklendikten sonra
 * kuyruğu ilerletir ve maliyetlendirme özetine döner.
 */
(function () {
  window.onAddToCartProjectQueueHook = async function onAddToCartProjectQueueHook() {
    try {
      const raw = sessionStorage.getItem('pricingQueueContext');
      if (!raw || !window.api?.pricingQueueAdvance) return;
      await window.api.pricingQueueAdvance();
      sessionStorage.removeItem('pricingQueueContext');
      if (window.app?.navigate) {
        window.app.navigate('project-costing.html');
      }
    } catch (e) {
      console.warn('Proje kuyruğu ilerletilemedi:', e);
    }
  };
})();
