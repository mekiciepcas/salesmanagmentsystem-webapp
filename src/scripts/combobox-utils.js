/**
 * Combobox-Utils.js
 * Bu dosya, tüm pricing sayfalarında kullanılabilecek aranabilir combobox
 * işlevselliğini içerir.
 */

// Combobox kurulumu için ana fonksiyon
function setupSearchCombobox(instance) {
  // UI elementleri referansları
  const productSelect = document.getElementById('productSelect');
  const productSearch = document.getElementById('productSearch');
  const productCombobox = document.getElementById('productCombobox');
  const productDropdown = productCombobox.querySelector(
    '.search-combobox-dropdown'
  );

  // Combobox durumu için gerekli özellikler
  instance.comboboxOpen = false;
  instance.selectedComboboxIndex = -1;
  instance.productSelect = productSelect;
  instance.productSearch = productSearch;
  instance.productCombobox = productCombobox;
  instance.productDropdown = productDropdown;

  // Input ve toggle butonuna olay dinleyicileri ekle
  productSearch.addEventListener('input', () => filterCombobox(instance));
  productSearch.addEventListener('focus', () => openCombobox(instance));
  productCombobox
    .querySelector('.search-combobox-toggle')
    .addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCombobox(instance);
    });

  // Dışarı tıklama durumunda combobox'ı kapat
  document.addEventListener('click', (e) => {
    if (!productCombobox.contains(e.target)) {
      closeCombobox(instance);
    }
  });

  // Klavye navigasyonu ekle
  productSearch.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        navigateCombobox(instance, 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateCombobox(instance, -1);
        break;
      case 'Enter':
        e.preventDefault();
        selectHighlightedItem(instance);
        break;
      case 'Escape':
        e.preventDefault();
        closeCombobox(instance);
        break;
    }
  });

  // Orijinal updateProductList fonksiyonunun çağrısında bu satırları ekleyin
  // this.allProductTypes = productTypes;
}

// Filtre fonksiyonu
function filterCombobox(instance) {
  if (!instance.allProductTypes) return;

  const searchValue = instance.productSearch.value.toLowerCase();
  const filteredItems = instance.allProductTypes.filter(
    (item) => item && item.toLowerCase().includes(searchValue)
  );

  renderComboboxItems(instance, filteredItems);
  openCombobox(instance);
  instance.selectedComboboxIndex = -1;
}

// Combobox öğelerini render etme
function renderComboboxItems(instance, items) {
  if (items.length === 0) {
    instance.productDropdown.innerHTML = `
            <div class="search-combobox-no-results">Sonuç bulunamadı</div>
        `;
  } else {
    instance.productDropdown.innerHTML = items
      .map(
        (item) => `
            <div class="search-combobox-item" data-value="${item}">${item}</div>
        `
      )
      .join('');

    // Tıklama olaylarını ekle
    instance.productDropdown
      .querySelectorAll('.search-combobox-item')
      .forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const value = item.getAttribute('data-value');
          selectComboboxItem(instance, value);
        });

        item.addEventListener('mouseover', () => {
          clearHighlightedItems(instance);
          item.classList.add('highlighted');
        });
      });
  }
}

// Klavye navigasyonu
function navigateCombobox(instance, step) {
  const items = instance.productDropdown.querySelectorAll(
    '.search-combobox-item'
  );
  if (items.length === 0) return;

  // Mevcut vurgulanmış öğeyi temizle
  clearHighlightedItems(instance);

  // Yeni indeksi hesapla (sınırlar içinde)
  instance.selectedComboboxIndex += step;
  if (instance.selectedComboboxIndex < 0)
    instance.selectedComboboxIndex = items.length - 1;
  if (instance.selectedComboboxIndex >= items.length)
    instance.selectedComboboxIndex = 0;

  // Yeni öğeyi vurgula ve görünür yap
  const selectedItem = items[instance.selectedComboboxIndex];
  selectedItem.classList.add('highlighted');
  selectedItem.scrollIntoView({ block: 'nearest' });
}

// Vurgulanmış öğeleri temizleme
function clearHighlightedItems(instance) {
  instance.productDropdown
    .querySelectorAll('.search-combobox-item.highlighted')
    .forEach((item) => {
      item.classList.remove('highlighted');
    });
}

// Vurgulanmış öğeyi seçme
function selectHighlightedItem(instance) {
  const highlightedItem = instance.productDropdown.querySelector(
    '.search-combobox-item.highlighted'
  );
  if (highlightedItem) {
    const value = highlightedItem.getAttribute('data-value');
    selectComboboxItem(instance, value);
  } else if (
    instance.productDropdown.querySelectorAll('.search-combobox-item')
      .length === 1
  ) {
    // Eğer sadece bir seçenek varsa, onu seç
    const onlyItem = instance.productDropdown.querySelector(
      '.search-combobox-item'
    );
    const value = onlyItem.getAttribute('data-value');
    selectComboboxItem(instance, value);
  }
}

// Belirli bir öğeyi seçme
function selectComboboxItem(instance, value) {
  instance.productSearch.value = value;
  instance.productSelect.value = value;
  closeCombobox(instance);

  // Alt tipleri güncelle - sınıfa özgü metodu çağır
  instance.updateSubtypes(value);

  // Input'un focus'unu kaybetmesini sağla
  instance.productSearch.blur();
}

// Combobox'ı aç/kapa
function toggleCombobox(instance) {
  if (instance.comboboxOpen) {
    closeCombobox(instance);
  } else {
    openCombobox(instance);
  }
}

// Combobox'ı açma
function openCombobox(instance) {
  if (!instance.comboboxOpen) {
    instance.comboboxOpen = true;
    instance.productDropdown.classList.add('open');

    // Eğer input boşsa ve ürün tipleri yüklendiyse, tüm listeyi göster
    if (!instance.productSearch.value && instance.allProductTypes) {
      renderComboboxItems(instance, instance.allProductTypes);
    }
  }
}

// Combobox'ı kapatma
function closeCombobox(instance) {
  instance.comboboxOpen = false;
  instance.productDropdown.classList.remove('open');
  instance.selectedComboboxIndex = -1;
}

// Dışa aktar
window.comboboxUtils = {
  setupSearchCombobox,
  filterCombobox,
  renderComboboxItems,
  navigateCombobox,
  clearHighlightedItems,
  selectHighlightedItem,
  selectComboboxItem,
  toggleCombobox,
  openCombobox,
  closeCombobox,
};
