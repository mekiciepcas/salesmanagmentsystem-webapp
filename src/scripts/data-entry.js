// Data Entry Page JavaScript
// Sayfanın tamamen yüklendiğini doğrulamak için iki farklı olay handler ekleyelim
window.addEventListener('load', function () {
  console.log('Window LOAD event tetiklendi - sayfa tamamen yüklendi');
  updateUserFromGlobal();
});

document.addEventListener('DOMContentLoaded', function () {
  console.log('DOMContentLoaded event tetiklendi');
  // Sayfa yüklendikten hemen sonra kullanıcı bilgisini güncelle
  updateUserFromGlobal();

  // ======== Değişkenler ve Sabitler ========
  const API_BASE_URL = 'http://localhost:3110/api'; // Backend API URL

  // Mevcut kullanıcı bilgisi
  let currentUser = null;

  // UI elementleri
  let userNameEl, userRoleEl, userAvatarEl;

  // Table Configurations
  const tableConfigs = {
    customers: {
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'company_name', label: 'Firma Adı', sortable: true },
        { key: 'name', label: 'İletişim Kişisi', sortable: true },
        { key: 'consultant_email', label: 'E-posta', sortable: false },
        { key: 'consultant_phone', label: 'Telefon', sortable: false },
        {
          key: 'status',
          label: 'Durum',
          sortable: true,
          renderer: renderStatus,
        },
        {
          key: 'actions',
          label: 'İşlemler',
          sortable: false,
          renderer: renderActions,
        },
      ],
      endpoint: '/customers',
      modalId: 'customerModal',
    },
    quotes: {
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'number', label: 'Teklif No', sortable: true },
        { key: 'customer_name', label: 'Müşteri', sortable: true },
        { key: 'date', label: 'Tarih', sortable: true, renderer: renderDate },
        {
          key: 'total_price',
          label: 'Toplam (USD)',
          sortable: true,
          renderer: renderCurrency,
        },
        {
          key: 'status',
          label: 'Durum',
          sortable: true,
          renderer: renderStatus,
        },
        {
          key: 'actions',
          label: 'İşlemler',
          sortable: false,
          renderer: renderActions,
        },
      ],
      endpoint: '/quotes',
      modalId: 'quoteModal',
    },
    quote_revisions: {
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'quote_number', label: 'Teklif No', sortable: true },
        { key: 'date', label: 'Tarih', sortable: true, renderer: renderDate },
        {
          key: 'old_price',
          label: 'Eski Fiyat',
          sortable: true,
          renderer: renderCurrency,
        },
        {
          key: 'new_price',
          label: 'Yeni Fiyat',
          sortable: true,
          renderer: renderCurrency,
        },
        { key: 'reason', label: 'Neden', sortable: true },
        {
          key: 'actions',
          label: 'İşlemler',
          sortable: false,
          renderer: renderActions,
        },
      ],
      endpoint: '/quote_revisions',
      modalId: 'revisionModal',
    },
    transactions: {
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'action', label: 'İşlem Tipi', sortable: true },
        { key: 'customer_name', label: 'Müşteri', sortable: true },
        { key: 'quote_number', label: 'Teklif No', sortable: true },
        { key: 'user_name', label: 'Kullanıcı', sortable: true },
        {
          key: 'created_at',
          label: 'Tarih',
          sortable: true,
          renderer: renderDate,
        },
        {
          key: 'actions',
          label: 'İşlemler',
          sortable: false,
          renderer: renderActions,
        },
      ],
      endpoint: '/transactions',
      modalId: 'transactionModal',
    },
    customer_meetings: {
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'customer_name', label: 'Müşteri', sortable: true },
        {
          key: 'meeting_date',
          label: 'Tarih',
          sortable: true,
          renderer: renderDateTime,
        },
        { key: 'meeting_type', label: 'Görüşme Tipi', sortable: true },
        {
          key: 'meeting_outcome',
          label: 'Sonuç',
          sortable: true,
          renderer: renderStatus,
        },
        { key: 'created_by_name', label: 'Oluşturan', sortable: true },
        {
          key: 'actions',
          label: 'İşlemler',
          sortable: false,
          renderer: renderActions,
        },
      ],
      endpoint: '/customer_meetings',
      modalId: 'meetingModal',
    },
    customer_notes: {
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'customer_name', label: 'Müşteri', sortable: true },
        {
          key: 'note_text',
          label: 'Not',
          sortable: false,
          renderer: renderTruncatedText,
        },
        {
          key: 'created_at',
          label: 'Tarih',
          sortable: true,
          renderer: renderDateTime,
        },
        { key: 'user_name', label: 'Kullanıcı', sortable: true },
        {
          key: 'actions',
          label: 'İşlemler',
          sortable: false,
          renderer: renderActions,
        },
      ],
      endpoint: '/customer_notes',
      modalId: 'noteModal',
    },
    users: {
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'username', label: 'Kullanıcı Adı', sortable: true },
        { key: 'full_name', label: 'Ad Soyad', sortable: true },
        { key: 'email', label: 'E-posta', sortable: true },
        { key: 'department', label: 'Departman', sortable: true },
        {
          key: 'created_at',
          label: 'Oluşturulma',
          sortable: true,
          renderer: renderDate,
        },
        {
          key: 'actions',
          label: 'İşlemler',
          sortable: false,
          renderer: renderActions,
        },
      ],
      endpoint: '/users',
      modalId: 'userModal',
    },
  };

  // State
  let currentTable = 'customers';
  let currentPage = 1;
  let totalPages = 1;
  let pageSize = 20;
  let currentData = [];
  let searchQuery = '';
  let sortColumn = 'id';
  let sortDirection = 'desc';
  let dropdownData = {
    customers: [],
    quotes: [],
    users: [],
  };
  let dbConnected = false;

  // Elementler
  const tableTitle = document.getElementById('tableTitle');
  const dataTable = document.getElementById('dataTable');
  const tableBody = dataTable.querySelector('tbody');
  const tableHead = dataTable.querySelector('thead');
  const searchInput = document.getElementById('searchInput');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  const addNewButton = document.getElementById('addNewButton');
  const dbStatusButton = document.getElementById('dbStatusButton');
  const backButton = document.getElementById('backButton');

  // ======== İlklendirme ========
  initApp();

  // ======== Olay Dinleyicileri ========

  // Sidebar tablo değiştirme
  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.addEventListener('click', function () {
      const table = this.getAttribute('data-table');
      changeTable(table);
    });
  });

  // Arama işlevi
  searchInput.addEventListener(
    'input',
    debounce(function () {
      searchQuery = this.value;
      currentPage = 1;
      loadTableData();
    }, 500)
  );

  // Geri butonu
  backButton.addEventListener('click', function () {
    window.location.href = './dashboard.html';
  });

  // Sayfalama
  prevPageBtn.addEventListener('click', function () {
    if (currentPage > 1) {
      currentPage--;
      loadTableData();
    }
  });

  nextPageBtn.addEventListener('click', function () {
    if (currentPage < totalPages) {
      currentPage++;
      loadTableData();
    }
  });

  // Yeni kayıt ekleme
  addNewButton.addEventListener('click', function () {
    openNewRecordModal();
  });

  // DB durumu
  dbStatusButton.addEventListener('click', function () {
    checkDbConnection(true);
  });

  // Pencere kontrolleri
  document
    .querySelector('.titlebar-button.minimize')
    .addEventListener('click', () => {
      window.api.send('window:minimize');
    });

  document
    .querySelector('.titlebar-button.maximize')
    .addEventListener('click', () => {
      window.api.send('window:maximize');
    });

  document
    .querySelector('.titlebar-button.close')
    .addEventListener('click', () => {
      window.api.send('window:close');
    });

  // Modalları Kapat
  document.querySelectorAll('.modal-close').forEach((button) => {
    button.addEventListener('click', function () {
      const modal = this.closest('.modal');
      closeModal(modal);
    });
  });

  // Form modallari için kaydetme işlemleri
  setupModalFormHandlers();

  // ======== Fonksiyonlar ========

  // Uygulamayı başlat
  function initApp() {
    console.log('initApp çalıştırılıyor...');

    // DOM elementlerini seç
    userNameEl = document.getElementById('userName');
    userRoleEl = document.getElementById('userRole');
    userAvatarEl = document.querySelector('.avatar-initials');

    console.log('DOM elementleri seçildi:', {
      userName: userNameEl,
      userRole: userRoleEl,
      userAvatar: userAvatarEl,
    });

    // Kullanıcı bilgisini yükle ve UI'ı güncelle
    loadCurrentUser();

    // Veritabanı bağlantısını kontrol et
    checkDbConnection();

    // Dropdown verilerini yükle
    loadDropdownData();

    // İlk tabloyu yükle
    changeTable('customers');

    // Kullanıcı bilgisini bir kez daha güncelle
    setTimeout(updateUserFromGlobal, 300);
  }

  // Tablo değiştirme
  function changeTable(tableName) {
    // Sidebar aktif durumunu güncelle
    document.querySelectorAll('.sidebar-item').forEach((item) => {
      item.classList.remove('active');
    });
    document
      .querySelector(`.sidebar-item[data-table="${tableName}"]`)
      .classList.add('active');

    // Tablo durumunu güncelle
    currentTable = tableName;
    currentPage = 1;
    sortColumn = 'id';
    sortDirection = 'desc';
    searchQuery = '';
    searchInput.value = '';

    // Başlığı güncelle
    tableTitle.textContent = document.querySelector(
      `.sidebar-item[data-table="${tableName}"] span`
    ).textContent;

    // Tabloyu yükle
    setupTableHeader();
    loadTableData();
  }

  // Tablo başlıklarını oluştur
  function setupTableHeader() {
    const config = tableConfigs[currentTable];
    let headerHtml = '<tr>';

    config.columns.forEach((column) => {
      const sortableClass = column.sortable ? 'sortable' : '';
      const sortClass =
        column.key === sortColumn ? `sorted-${sortDirection}` : '';

      headerHtml += `<th class="${sortableClass} ${sortClass}" data-column="${column.key}">
                ${column.label}
                ${column.sortable ? '<span class="sort-icon"></span>' : ''}
            </th>`;
    });

    headerHtml += '</tr>';
    tableHead.innerHTML = headerHtml;

    // Sıralama olayları
    tableHead.querySelectorAll('th.sortable').forEach((th) => {
      th.addEventListener('click', function () {
        const column = this.getAttribute('data-column');

        if (column === sortColumn) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          sortColumn = column;
          sortDirection = 'asc';
        }

        setupTableHeader(); // Başlıkları güncelle
        loadTableData(); // Verileri yeniden yükle
      });
    });
  }

  // Tablo verilerini yükle
  async function loadTableData() {
    try {
      const config = tableConfigs[currentTable];
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: pageSize,
        sort: sortColumn,
        direction: sortDirection,
        search: searchQuery,
      });

      const response = await fetch(
        `${API_BASE_URL}${config.endpoint}?${queryParams}`
      );

      if (!response.ok) {
        throw new Error('Veri yüklenirken bir hata oluştu');
      }

      const result = await response.json();

      currentData = result.data;
      totalPages = result.totalPages || 1;

      renderTable();
      updatePagination();
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      showError(
        'Veri yüklenirken bir hata oluştu. Lütfen bağlantınızı kontrol edin.'
      );

      // Hata durumunda boş tablo göster
      currentData = [];
      totalPages = 1;
      renderTable();
      updatePagination();
    }
  }

  // Tabloyu render et
  function renderTable() {
    const config = tableConfigs[currentTable];
    let tbodyHtml = '';

    if (currentData.length === 0) {
      const colCount = config.columns.length;
      tbodyHtml = `<tr><td colspan="${colCount}" class="no-data">Veri bulunamadı</td></tr>`;
    } else {
      currentData.forEach((item) => {
        tbodyHtml += '<tr>';

        config.columns.forEach((column) => {
          if (column.renderer) {
            tbodyHtml += `<td>${column.renderer(item, column.key)}</td>`;
          } else {
            tbodyHtml += `<td>${item[column.key] || ''}</td>`;
          }
        });

        tbodyHtml += '</tr>';
      });
    }

    tableBody.innerHTML = tbodyHtml;

    // Düzenle/Sil işlemleri için event listeners
    tableBody.querySelectorAll('.row-action.edit').forEach((button) => {
      button.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        openEditModal(id);
      });
    });

    tableBody.querySelectorAll('.row-action.delete').forEach((button) => {
      button.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        openDeleteConfirmation(id);
      });
    });
  }

  // Sayfalama bilgisini güncelle
  function updatePagination() {
    pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  // DB bağlantısını kontrol et
  async function checkDbConnection(showStatus = false) {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);

      if (response.ok) {
        const data = await response.json();
        dbConnected = data.db === 'connected';

        // Buton rengini güncelle
        if (dbConnected) {
          dbStatusButton.classList.add('connected');
          dbStatusButton.innerHTML =
            '<i class="material-icons">check_circle</i><span>Bağlantı Kuruldu</span>';
        } else {
          dbStatusButton.classList.remove('connected');
          dbStatusButton.innerHTML =
            '<i class="material-icons">error</i><span>Bağlantı Hatası</span>';
        }

        if (showStatus) {
          if (dbConnected) {
            showInfo('Veritabanı bağlantısı başarılı.');
          } else {
            showError('Veritabanı bağlantısı kurulamadı.');
          }
        }
      } else {
        throw new Error('Database connection check failed');
      }
    } catch (error) {
      console.error('DB connection error:', error);
      dbConnected = false;
      dbStatusButton.classList.remove('connected');
      dbStatusButton.innerHTML =
        '<i class="material-icons">error</i><span>Bağlantı Hatası</span>';

      if (showStatus) {
        showError('Sunucu bağlantısı kurulamadı.');
      }
    }
  }

  // Dropdown verilerini yükle (müşteriler, kullanıcılar, vb.)
  async function loadDropdownData() {
    try {
      // Müşteri verisi
      const customersResponse = await fetch(
        `${API_BASE_URL}/customers?limit=1000`
      );
      if (customersResponse.ok) {
        const result = await customersResponse.json();
        dropdownData.customers = result.data || [];
      }

      // Kullanıcı verisi
      const usersResponse = await fetch(`${API_BASE_URL}/users?limit=1000`);
      if (usersResponse.ok) {
        const result = await usersResponse.json();
        dropdownData.users = result.data || [];
      }

      // Teklif verisi
      const quotesResponse = await fetch(`${API_BASE_URL}/quotes?limit=1000`);
      if (quotesResponse.ok) {
        const result = await quotesResponse.json();
        dropdownData.quotes = result.data || [];
      }
    } catch (error) {
      console.error('Dropdown veri yükleme hatası:', error);
    }
  }

  // Düzenleme modali açma
  function openEditModal(id) {
    const record = currentData.find((item) => item.id == id);
    if (!record) return;

    const modalId = tableConfigs[currentTable].modalId;
    const modal = document.getElementById(modalId);
    const form = modal.querySelector('form');
    const titleElement = modal.querySelector('.modal-header h3');

    // Form başlığını güncelle
    titleElement.textContent = 'Düzenle';

    // Formu doldur
    fillFormWithData(form, record);

    // Modali göster
    openModal(modal);
  }

  // Yeni kayıt modalı açma
  function openNewRecordModal() {
    const modalId = tableConfigs[currentTable].modalId;
    const modal = document.getElementById(modalId);
    const form = modal.querySelector('form');
    const titleElement = modal.querySelector('.modal-header h3');

    // Form başlığını güncelle
    titleElement.textContent = 'Yeni ' + tableTitle.textContent.slice(0, -1);

    // Formu sıfırla
    form.reset();
    // ID alanını temizle
    const idField = form.querySelector('[name="id"]');
    if (idField) idField.value = '';

    // Select alanlarını doldur
    populateSelectOptions(form);

    // Modali göster
    openModal(modal);
  }

  // Silme onayı modalı açma
  function openDeleteConfirmation(id) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmButton = document.getElementById('confirmButton');

    confirmButton.setAttribute('data-id', id);
    confirmButton.setAttribute('data-table', currentTable);

    // Silme onaylandığında
    const onConfirm = function () {
      const id = this.getAttribute('data-id');
      const table = this.getAttribute('data-table');

      deleteRecord(table, id);
      closeModal(confirmModal);

      // Event listener'ı temizle
      confirmButton.removeEventListener('click', onConfirm);
    };

    // Önceki event listener'ları temizle
    confirmButton.removeEventListener('click', onConfirm);
    // Yeni event listener ekle
    confirmButton.addEventListener('click', onConfirm);

    openModal(confirmModal);
  }

  // Kayıt silme
  async function deleteRecord(table, id) {
    try {
      const config = tableConfigs[table];
      const response = await fetch(`${API_BASE_URL}${config.endpoint}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Silme işlemi başarısız');
      }

      // Başarı mesajı göster
      showInfo('Kayıt başarıyla silindi');

      // Tabloyu yeniden yükle
      loadTableData();
    } catch (error) {
      console.error('Silme hatası:', error);
      showError('Kayıt silinirken bir hata oluştu');
    }
  }

  // Formu veri ile doldurma
  function fillFormWithData(form, data) {
    // Form elemanlarını döngüyle doldur
    Array.from(form.elements).forEach((element) => {
      if (element.name && element.name in data) {
        if (element.type === 'checkbox') {
          element.checked = Boolean(data[element.name]);
        } else if (element.tagName === 'SELECT') {
          element.value = data[element.name] || '';

          // Eğer değer bulunamadıysa ve doldurulması gereken bir select ise
          if (element.value === '' && element.options.length === 0) {
            populateSelectOptions(form);
          }
        } else if (
          element.tagName === 'TEXTAREA' &&
          element.classList.contains('code-area')
        ) {
          // JSON verisi ise
          if (typeof data[element.name] === 'object') {
            element.value = JSON.stringify(data[element.name], null, 2);
          } else {
            element.value = data[element.name] || '';
          }
        } else {
          element.value = data[element.name] || '';
        }
      }
    });

    // Özel durumlar - teklif kalemleri gibi
    handleSpecialFormCases(form, data);
  }

  // Modal ve form işleyicilerini ayarla
  function setupModalFormHandlers() {
    // Müşteri formu
    setupFormHandler('customerForm', 'customerModal', '/customers');

    // Teklif formu
    setupFormHandler('quoteForm', 'quoteModal', '/quotes');

    // Teklif Revizyonu formu
    setupFormHandler('revisionForm', 'revisionModal', '/quote_revisions');

    // İşlem formu
    setupFormHandler('transactionForm', 'transactionModal', '/transactions');

    // Görüşme formu
    setupFormHandler('meetingForm', 'meetingModal', '/customer_meetings');

    // Not formu
    setupFormHandler('noteForm', 'noteModal', '/customer_notes');

    // Kullanıcı formu
    setupFormHandler('userForm', 'userModal', '/users');

    // Şifre göster/gizle butonu
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
      togglePassword.addEventListener('click', function () {
        const passwordInput = document.getElementById('userPassword');
        const type =
          passwordInput.getAttribute('type') === 'password'
            ? 'text'
            : 'password';
        passwordInput.setAttribute('type', type);

        const icon = this.querySelector('i');
        icon.textContent =
          type === 'password' ? 'visibility' : 'visibility_off';
      });
    }

    // Teklif kalemi ekleme butonu
    const addItemButton = document.getElementById('addItemButton');
    if (addItemButton) {
      addItemButton.addEventListener('click', function () {
        addQuoteItemRow();
      });
    }
  }

  // Form submitlama işlemi
  function setupFormHandler(formId, modalId, endpoint) {
    const form = document.getElementById(formId);
    const modal = document.getElementById(modalId);
    const saveButton = modal.querySelector('[id^="save"]');
    const cancelButton = modal.querySelector('[id^="cancel"]');

    // Kaydet butonu
    saveButton.addEventListener('click', async function () {
      if (!validateForm(form)) {
        return;
      }

      const formData = new FormData(form);
      const data = {};

      // FormData'yı object'e dönüştür
      for (let [key, value] of formData.entries()) {
        // JSON alanları için parse işlemi
        if (key === 'details' && value) {
          try {
            data[key] = JSON.parse(value);
          } catch (e) {
            showError('JSON formatı geçersiz. Lütfen kontrol ediniz.');
            return;
          }
        } else {
          data[key] = value;
        }
      }

      // Özel durumlar - teklif kalemleri gibi
      processSpecialFormData(form, data);

      // Form içerisinde kullanıcı ID'si yoksa ve işlem ekleme ise, mevcut kullanıcı ID'sini ekle
      if ((!data.user_id || !data.created_by) && !data.id) {
        data.user_id = data.user_id || currentUser?.id;
        data.created_by = data.created_by || currentUser?.id;
      }

      try {
        const id = data.id;
        const isUpdate = id && id !== '';
        const url = isUpdate
          ? `${API_BASE_URL}${endpoint}/${id}`
          : `${API_BASE_URL}${endpoint}`;
        const method = isUpdate ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        showInfo(`Kayıt başarıyla ${isUpdate ? 'güncellendi' : 'eklendi'}`);
        closeModal(modal);
        loadTableData();

        // Dropdown verilerini yeniden yükle
        if (['customers', 'quotes', 'users'].includes(currentTable)) {
          loadDropdownData();
        }
      } catch (error) {
        console.error('Form gönderme hatası:', error);
        showError('Kayıt işlemi sırasında bir hata oluştu.');
      }
    });

    // İptal butonu
    cancelButton.addEventListener('click', function () {
      closeModal(modal);
    });
  }

  // Form validasyonu
  function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach((field) => {
      if (!field.value) {
        field.classList.add('invalid');
        isValid = false;
      } else {
        field.classList.remove('invalid');
      }
    });

    if (!isValid) {
      showError('Lütfen tüm zorunlu alanları doldurun.');
    }

    return isValid;
  }

  // Dropdown select'lerini veritabanı verisiyle doldur
  function populateSelectOptions(form) {
    // Müşteri select
    const customerSelects = form.querySelectorAll('[name$="customer_id"]');
    customerSelects.forEach((select) => {
      // İlk option'ı koru
      const firstOption = select.options[0];
      select.innerHTML = '';
      if (firstOption) {
        select.appendChild(firstOption);
      }

      // Müşteri verilerini ekle
      dropdownData.customers.forEach((customer) => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.company_name || customer.name;
        select.appendChild(option);
      });
    });

    // Kullanıcı select
    const userSelects = form.querySelectorAll(
      '[name$="user_id"], [name="prepared_by"], [name="created_by"]'
    );
    userSelects.forEach((select) => {
      // İlk option'ı koru
      const firstOption = select.options[0];
      select.innerHTML = '';
      if (firstOption) {
        select.appendChild(firstOption);
      }

      // Kullanıcı verilerini ekle
      dropdownData.users.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.full_name || user.username;
        select.appendChild(option);

        // Mevcut kullanıcıyı varsayılan olarak seç (yeni kayıt durumunda)
        if (currentUser && user.id == currentUser.id) {
          option.selected = true;
        }
      });
    });

    // Teklif select
    const quoteSelects = form.querySelectorAll('[name="quote_id"]');
    quoteSelects.forEach((select) => {
      // İlk option'ı koru
      const firstOption = select.options[0];
      select.innerHTML = '';
      if (firstOption) {
        select.appendChild(firstOption);
      }

      // Teklif verilerini ekle
      dropdownData.quotes.forEach((quote) => {
        const option = document.createElement('option');
        option.value = quote.id;
        option.textContent = `${quote.number} - ${quote.customer_name || ''}`;
        select.appendChild(option);
      });
    });
  }

  // Teklif kalemi satırı ekle
  function addQuoteItemRow(item = null) {
    const container = document.getElementById('quoteItemsContainer');
    const index = container.children.length;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
            <div class="form-group">
                <label for="item_name_${index}">Ürün/Hizmet</label>
                <input type="text" id="item_name_${index}" name="item_name_${index}" class="form-input" value="${item?.name || ''}">
            </div>
            <div class="form-group" style="flex: 0 0 80px;">
                <label for="item_quantity_${index}">Adet</label>
                <input type="number" id="item_quantity_${index}" name="item_quantity_${index}" class="form-input" min="1" value="${item?.quantity || 1}">
            </div>
            <div class="form-group">
                <label for="item_price_${index}">Birim Fiyat</label>
                <input type="number" id="item_price_${index}" name="item_price_${index}" class="form-input" step="0.01" value="${item?.price || ''}">
            </div>
            <button type="button" class="item-remove">
                <i class="material-icons">delete</i>
            </button>
        `;

    container.appendChild(row);

    // Satır silme butonunu etkinleştir
    row.querySelector('.item-remove').addEventListener('click', function () {
      container.removeChild(row);
    });
  }

  // Özel form durumlarını kontrol et
  function handleSpecialFormCases(form, data) {
    // Teklif kalemleri
    if (form.id === 'quoteForm' && data.items && Array.isArray(data.items)) {
      const container = document.getElementById('quoteItemsContainer');
      container.innerHTML = '';

      data.items.forEach((item) => {
        addQuoteItemRow(item);
      });
    }
  }

  // Özel form verilerini işle
  function processSpecialFormData(form, data) {
    // Teklif kalemleri
    if (form.id === 'quoteForm') {
      const container = document.getElementById('quoteItemsContainer');
      const rows = container.querySelectorAll('.item-row');

      const items = [];
      rows.forEach((row, index) => {
        const name = row.querySelector(`[name="item_name_${index}"]`).value;
        const quantity =
          parseInt(
            row.querySelector(`[name="item_quantity_${index}"]`).value
          ) || 1;
        const price =
          parseFloat(row.querySelector(`[name="item_price_${index}"]`).value) ||
          0;

        if (name && price) {
          items.push({
            name,
            quantity,
            price,
            total: quantity * price,
          });
        }
      });

      data.items = items;
    }
  }

  // ======== Yardımcı İşlevler ========

  // Status hücresini render et
  function renderStatus(item, key) {
    const status = item[key];
    if (!status) return '';

    let statusClass = '';
    if (['Aktif', 'Tamamlandı', 'Onaylandı', 'ONAYLANDI'].includes(status)) {
      statusClass = 'status-active';
    } else if (
      ['Pasif', 'İptal Edildi', 'Reddedildi', 'REDDEDILDI'].includes(status)
    ) {
      statusClass = 'status-passive';
    } else {
      statusClass = 'status-potential';
    }

    return `<span class="status-badge ${statusClass}">${status}</span>`;
  }

  // Tarih hücresi
  function renderDate(item, key) {
    const date = item[key];
    if (!date) return '';

    // ISO formatında veya Unix timestamp
    let dateObj;
    if (typeof date === 'number') {
      dateObj = new Date(date * 1000);
    } else {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) return date;

    return dateObj.toLocaleDateString('tr-TR');
  }

  // Tarih ve saat
  function renderDateTime(item, key) {
    const date = item[key];
    if (!date) return '';

    let dateObj;
    if (typeof date === 'number') {
      dateObj = new Date(date * 1000);
    } else {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) return date;

    return dateObj.toLocaleString('tr-TR');
  }

  // Para birimi
  function renderCurrency(item, key) {
    const value = parseFloat(item[key]);
    if (isNaN(value)) return '';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  // Kısaltılmış metin
  function renderTruncatedText(item, key) {
    const text = item[key];
    if (!text) return '';

    const maxLength = 50;
    if (text.length <= maxLength) return text;

    return text.substring(0, maxLength) + '...';
  }

  // İşlem butonları
  function renderActions(item) {
    return `
            <div class="actions-cell">
                <button class="row-action edit" data-id="${item.id}">
                    <i class="material-icons">edit</i>
                </button>
                <button class="row-action delete" data-id="${item.id}">
                    <i class="material-icons">delete</i>
                </button>
            </div>
        `;
  }

  // Modal açma
  function openModal(modal) {
    modal.classList.add('active');
  }

  // Modal kapatma
  function closeModal(modal) {
    modal.classList.remove('active');
  }

  // Bilgi mesajı göster
  function showInfo(message) {
    const modal = document.getElementById('infoModal');
    const text = document.getElementById('infoModalText');

    text.textContent = message;
    openModal(modal);
  }

  // Hata mesajı göster
  function showError(message) {
    const modal = document.getElementById('errorModal');
    const text = document.getElementById('errorModalText');

    text.textContent = message;
    openModal(modal);
  }

  // Debounce fonksiyonu
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Mevcut kullanıcı bilgisini yükle
  function loadCurrentUser() {
    try {
      console.log('Kullanıcı bilgisi yükleniyor...');

      // 1. Global değişkenden almayı dene
      if (window.currentUser) {
        currentUser = window.currentUser;
        console.log(
          'Kullanıcı bilgisi global değişkenden alındı:',
          currentUser
        );
      }
      // 2. localStorage'dan almayı dene
      else if (localStorage.getItem('currentUser')) {
        try {
          currentUser = JSON.parse(localStorage.getItem('currentUser'));
          // localStorage'dan alınan bilgiyi global değişkene de aktar
          window.currentUser = currentUser;
          console.log(
            "Kullanıcı bilgisi localStorage'dan alındı:",
            currentUser
          );
        } catch (e) {
          console.error(
            "localStorage'daki kullanıcı bilgisi ayrıştırılamadı:",
            e
          );
          currentUser = { fullName: 'Bilinmeyen Kullanıcı', id: null };
        }
      } else {
        // Kullanıcı bilgisi bulunamadı
        console.warn('Kullanıcı bilgisi bulunamadı!');
        currentUser = { fullName: 'Bilinmeyen Kullanıcı', id: null };
      }

      // UI'ı güncelle
      updateUserInfo();
    } catch (error) {
      console.error('Kullanıcı bilgisi yüklenirken hata:', error);
      currentUser = { fullName: 'Bilinmeyen Kullanıcı', id: null };
      updateUserInfo();
    }
  }

  // UI'daki kullanıcı bilgilerini güncelle
  function updateUserInfo() {
    console.log("Kullanıcı bilgileri UI'da güncelleniyor...", currentUser);

    // Header'daki kullanıcı bilgilerini güncelle
    if (userNameEl) {
      userNameEl.textContent =
        currentUser?.fullName ||
        currentUser?.full_name ||
        'Bilinmeyen Kullanıcı';
      console.log('userName güncellendi:', userNameEl.textContent);
    } else {
      console.warn('userName elementi bulunamadı');
    }

    if (userRoleEl) {
      userRoleEl.textContent =
        currentUser?.department || 'Departman Belirtilmedi';
      console.log('userRole güncellendi:', userRoleEl.textContent);
    } else {
      console.warn('userRole elementi bulunamadı');
    }

    if (userAvatarEl) {
      const fullName = currentUser?.fullName || currentUser?.full_name || '';
      const initials = fullName
        .split(' ')
        .map((name) => name?.[0] || '')
        .join('')
        .substring(0, 2)
        .toUpperCase();
      userAvatarEl.textContent = initials || '--';
      console.log('userAvatar güncellendi:', userAvatarEl.textContent);
    } else {
      console.warn('userAvatar elementi bulunamadı');
    }

    // Diğer form select elementlerini de güncelle
    // setTimeout kullanarak DOM tam yüklendikten sonra çalışmasını sağlıyoruz
    setTimeout(() => {
      const userSelects = document.querySelectorAll(
        '[name$="user_id"], [name="prepared_by"], [name="created_by"]'
      );
      userSelects.forEach((select) => {
        if (currentUser && currentUser.id) {
          select.value = currentUser.id;
        }
      });
    }, 500);
  }
});

// Global değişken olarak erişilebilir basit bir fonksiyon
function updateUserFromGlobal() {
  console.log('updateUserFromGlobal çağrıldı');

  try {
    // DOM elementlerini bul
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const avatarEl = document.querySelector('.avatar-initials');

    console.log('DOM elementleri bulundu:', {
      userNameEl: !!userNameEl,
      userRoleEl: !!userRoleEl,
      avatarEl: !!avatarEl,
    });

    // window.currentUser global değişkeninde kullanıcı bilgisi var mı?
    if (window.currentUser) {
      console.log('Global kullanıcı bilgisi bulundu:', window.currentUser);

      // Kullanıcı adını güncelle
      if (userNameEl) {
        userNameEl.textContent =
          window.currentUser.fullName ||
          window.currentUser.full_name ||
          'Ahmet Yılmaz';
      }

      // Kullanıcı rolünü güncelle
      if (userRoleEl) {
        userRoleEl.textContent = window.currentUser.department || 'Satış';
      }

      // Avatar baş harflerini güncelle
      if (avatarEl) {
        const fullName =
          window.currentUser.fullName || window.currentUser.full_name || 'AY';
        const initials = fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
        avatarEl.textContent = initials;
      }
    } else {
      console.log(
        'Global kullanıcı bilgisi bulunamadı, localStorage kontrol ediliyor'
      );

      // localStorage'da kullanıcı bilgisi var mı?
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log('localStorage kullanıcı bilgisi bulundu:', user);

          // Global değişkene kaydet
          window.currentUser = user;

          // Recursive olarak bu fonksiyonu tekrar çağır
          updateUserFromGlobal();
          return;
        }
      } catch (e) {
        console.error('localStorage okuma hatası:', e);
      }

      console.log('Kullanıcı bilgisi bulunamadı, var olan değerler korunuyor');
    }
  } catch (error) {
    console.error('Kullanıcı bilgisi güncelleme hatası:', error);
  }
}
