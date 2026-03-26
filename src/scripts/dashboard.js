import dbService from '../services/dbService.js';
import customerService from '../services/customerService.js';

/** Chart.js için tema renklerini al (açık/koyu tema uyumlu) */
function getChartThemeColors() {
  const root = document.documentElement;
  const text = getComputedStyle(root).getPropertyValue('--text-primary').trim() || '#0f172a';
  const grid = getComputedStyle(root).getPropertyValue('--border-color').trim() || '#e2e8f0';
  return { text, grid };
}

// CustomerDetailModal sınıfını önce tanımlayalım
class CustomerDetailModal {
  constructor() {
    this.modal = document.getElementById('customerDetailModal');
    this.currentCustomerId = null;
    this.mode = 'view';
    this.setupEventListeners();
  }

  setupEventListeners() {
    const closeButtons = this.modal.querySelectorAll(
      '.modal-close, #closeCustomerModal'
    );
    closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.closeModal());
    });

    document
      .getElementById('saveCustomerChanges')
      .addEventListener('click', () => this.saveChanges());

    // Tab değiştirme
    this.modal.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) =>
        this.switchTab(e.target.dataset.tab)
      );
    });

    // Görüşme ekleme butonu
    const addMeetingBtn = this.modal.querySelector('.add-meeting-btn');
    if (addMeetingBtn) {
      addMeetingBtn.addEventListener('click', () => this.showMeetingForm());
    }
  }

  async openModal(customerId, mode = 'view') {
    try {
      this.currentCustomerId = customerId;
      this.mode = mode;

      if (customerId) {
        const customerData = await dbService.getCustomerDetails(customerId);
        if (customerData) {
          this.populateModal(customerData);

          if (mode === 'edit') {
            this.enableFormEditing();
          } else if (mode === 'meeting') {
            this.switchTab('meetings');
            this.showMeetingForm();
          }
        }
      }

      this.modal.classList.add('active');
    } catch (error) {
      console.error('Modal açılırken hata:', error);
    }
  }

  closeModal() {
    this.modal.classList.remove('active');
  }

  switchTab(tabId) {
    this.modal.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    this.modal.querySelectorAll('.tab-content').forEach((content) => {
      content.classList.remove('active');
    });

    this.modal.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    this.modal.querySelector(`#${tabId}Tab`).classList.add('active');
  }

  populateModal(customerData) {
    // Müşteri bilgilerini forma doldur
    document.getElementById('companyName').value = customerData.company_name;
    document.getElementById('customerCategory').value = customerData.category;
    document.getElementById('phone').value = customerData.phone;
    document.getElementById('email').value = customerData.email;
    document.getElementById('address').value = customerData.address;
  }

  enableFormEditing() {
    const inputs = this.modal.querySelectorAll(
      '#infoTab input, #infoTab select, #infoTab textarea'
    );
    inputs.forEach((input) => {
      input.removeAttribute('disabled');
    });
  }

  showMeetingForm() {
    const meetingsTab = this.modal.querySelector('#meetingsTab');
    if (!meetingsTab) return;

    const form = `
            <div class="meeting-form">
                <h3>Yeni Görüşme Ekle</h3>
                <div class="form-group">
                    <label>Görüşme Tarihi</label>
                    <input type="datetime-local" id="meetingDate" class="form-input">
                </div>
                <div class="form-group">
                    <label>Görüşme Tipi</label>
                    <select id="meetingType" class="form-input">
                        <option value="Yüz Yüze">Yüz Yüze</option>
                        <option value="Telefon">Telefon</option>
                        <option value="Video">Video Konferans</option>
                        <option value="E-posta">E-posta</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Açıklama</label>
                    <textarea id="meetingNotes" class="form-input" rows="4"></textarea>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="this.cancelMeetingForm()">İptal</button>
                    <button class="btn btn-primary" onclick="this.saveMeeting()">Kaydet</button>
                </div>
            </div>
        `;

    meetingsTab.innerHTML = form;
  }

  async saveMeeting() {
    try {
      const meetingData = {
        customerId: this.currentCustomerId,
        meetingDate: document.getElementById('meetingDate').value,
        meetingType: document.getElementById('meetingType').value,
        description: document.getElementById('meetingNotes').value,
        createdBy: window.currentUser?.id || 1,
      };

      await dbService.addMeeting(meetingData);
      this.loadCustomerMeetings(this.currentCustomerId);
    } catch (error) {
      console.error('Görüşme kaydedilirken hata:', error);
    }
  }

  cancelMeetingForm() {
    this.loadCustomerMeetings(this.currentCustomerId);
  }
}

// Sonra DashboardManager sınıfını tanımlayalım
class DashboardManager {
  constructor() {
    console.log('DashboardManager başlatılıyor...');

    // Sınıf değişkenleri
    this.users = []; // Kullanıcılar
    this.userIdToNameMap = {}; // Kullanıcı ID -> Ad haritası
    this.customers = []; // Müşteriler
    this.allQuotes = []; // Tüm teklifler
    this.charts = new Map(); // Grafikler
    this.views = new Map(); // Görünümler
    this.activeModule = 'dashboard'; // Aktif modül
    this.dataManagementViewLoaded = false; // Veri Yönetimi sekmesinin yüklenme durumu

    // Filtreleme için değişkenler
    this.activeStatusFilter = 'all'; // Varsayılan olarak 'all'
    this.searchTimeout = null; // Arama zamanlayıcısı

    // Tablo yönetimi için değişkenler
    this.currentPage = 1;
    this.pageSize = 50;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.selectedRows = new Set();
    this.visibleColumns = new Set(['number', 'date', 'customer', 'details', 'prepared_by', 'total_price', 'actual_cost', 'profit_margin', 'status', 'actions']);

    // Kullanıcı bilgisini hemen al
    this.initCurrentUser();

    // Class'ı başlat
    this.initialize();
  }

  // Kullanıcı bilgisini farklı kaynaklardan alma
  initCurrentUser() {
    try {
      // 1. Global değişkenden al (öncelikli)
      if (window.currentUser) {
        this.currentUser = window.currentUser;
        console.log(
          'DashboardManager: Kullanıcı bilgisi global değişkenden alındı:',
          this.currentUser
        );
        return;
      }

      // 2. localStorage'dan al
      if (localStorage.getItem('currentUser')) {
        try {
          this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
          // localStorage'dan alınan veriyi global değişkene de ata
          window.currentUser = this.currentUser;
          console.log(
            "DashboardManager: Kullanıcı bilgisi localStorage'dan alındı:",
            this.currentUser
          );
          return;
        } catch (e) {
          console.error(
            "DashboardManager: localStorage'daki kullanıcı bilgisi ayrıştırılamadı:",
            e
          );
        }
      }

      console.warn('DashboardManager: Kullanıcı bilgisi bulunamadı!');
      this.currentUser = { fullName: 'Bilinmeyen Kullanıcı', id: null };
    } catch (error) {
      console.error(
        'DashboardManager: Kullanıcı bilgisi başlatılırken hata:',
        error
      );
      this.currentUser = { fullName: 'Bilinmeyen Kullanıcı', id: null };
    }
  }

  initialize() {
    this.currentView = 'overview';
    this.views = new Map();
    this.charts = new Map();
    this.initializeUI();
    this.allQuotes = [];
    this.users = []; // Kullanıcı verilerini saklamak için
    this.loadData();
    this.bindEvents();
    this.initializeCharts();
    this.updateUserPerformance();
    this.updateSidebarUserInfo();
    this.initializeTabs();
    this.initializeSidebarNavigation();
    this.updateView(this.currentView);

    // Filtre butonlarını oluştur
    this.createFilterButtons();

    // Global fonksiyonları this context'i ile bind et
    window.handleApprove = this.handleApprove.bind(this);
    window.handleReject = this.handleReject.bind(this);
    this.handleRevert = this.handleRevert.bind(this);
    window.handleDelete = this.handleDelete.bind(this);

    this.setupWindowControls();
    this.loadUserInfo();
    this.loadCalculations();
    this.initializeCRM();
    document.querySelectorAll('.filter-btn[data-status]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document
          .querySelectorAll('.filter-btn')
          .forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeStatusFilter = e.target.dataset.status || '';
        this.applyFilters();
      });
    });

    document.getElementById('clearFilters')?.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('startDate').value = '';
      document.getElementById('endDate').value = '';
      document
        .querySelectorAll('.filter-btn')
        .forEach((b) => b.classList.remove('active'));
      this.activeStatusFilter = '';
      this.applyFilters();
    });

    // Otomatik yenileme için zamanlayıcı ekle (60 saniyede bir)
   

    // Refresh butonunu sayfaya ekle - doğru konumu bulmak için birkaç alternatif dene
    let container;

    // İlk olarak, overview sayfasında kendimiz bir header oluşturalım
    const overviewView = document.getElementById('overview');
    if (overviewView) {
      // Header elementini kontrol et, yoksa oluştur
      container = overviewView.querySelector('.view-header');
      if (!container) {
        container = document.createElement('div');
        container.className = 'view-header';
        // İlk child elementinin önüne ekle
        if (overviewView.firstChild) {
          overviewView.insertBefore(container, overviewView.firstChild);
        } else {
          overviewView.appendChild(container);
        }
      }

      // Header'a başlık ve refresh butonu ekle
      const title = document.createElement('h2');
      title.textContent = 'Genel Bakış';
      container.appendChild(title);
      container.appendChild(refreshButton);

      // Header için stil ekle
      container.style.display = 'flex';
      container.style.justifyContent = 'space-between';
      container.style.alignItems = 'center';
      container.style.marginBottom = '20px';
    }
    // Alternatif: dashboard-header içine ekle
    else {
      container = document.querySelector('.dashboard-header');
      if (container) {
        container.appendChild(refreshButton);
      }
      // Son seçenek: content-header
      else {
        container = document.querySelector('.content-header');
        if (container) {
          container.appendChild(refreshButton);
        }
      }
    }
  }

  setupWindowControls() {
    const minimizeBtn = document.querySelector('.titlebar-button.minimize');
    const closeBtn = document.querySelector('.titlebar-button.close');

    if (minimizeBtn) {
      minimizeBtn.onclick = () => window.app.minimize();
    }

    if (closeBtn) {
      closeBtn.onclick = () => window.app.close();
    }
  }

  initializeUI() {
    console.log('UI başlatılıyor...');

    // View elemanlarını önbelleğe al
    document
      .getElementById('searchInput')
      ?.addEventListener('input', () => this.debounceSearch());
    document
      .getElementById('startDate')
      ?.addEventListener('change', () => this.handleDateChange());
    document
      .getElementById('endDate')
      ?.addEventListener('change', () => this.handleDateChange());
    document.querySelectorAll('.view').forEach((view) => {
      this.views.set(view.id, view);
    });

    // Ana navigasyon event listener'ları ekle
    document.querySelectorAll('.nav-button').forEach((button) => {
      button.addEventListener('click', () => {
        const viewId = button.dataset.view;
        this.switchView(viewId);

        if (viewId === 'crm') {
          this.loadCRMData();
        }
      });
    });
    document.querySelectorAll('.filter-btn[data-status]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        // Aktif butonu güncelle
        document
          .querySelectorAll('.filter-btn')
          .forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeStatusFilter = e.target.dataset.status || '';
        this.applyFilters();
      });
    });
    document.getElementById('clearFilters')?.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('startDate').value = '';
      document.getElementById('endDate').value = '';
      document
        .querySelectorAll('.filter-btn')
        .forEach((b) => b.classList.remove('active'));
      this.activeStatusFilter = '';
      this.applyFilters();
    });

    // Filtreleme butonlarını oluştur (ya da varsa yükle)
    this.createFilterButtons();
    this.activeStatusFilter = '';

    // Elementleri seç ve null kontrolü yap
    this.quoteTable = document.querySelector('#quotesList');
    console.log(
      'Teklif tablosu aranıyor...',
      this.quoteTable ? 'BULUNDU' : 'BULUNAMADI'
    );

    // Eğer quotes view'ında isek ve teklif tablosu bulunmadıysa, DOM yüklenmiş olabilir, tekrar deneyelim
    if (!this.quoteTable && this.views.has('quotes')) {
      const quotesView = this.views.get('quotes');
      this.quoteTable = quotesView.querySelector('#quotesList');
      console.log(
        'Teklif tablosu quotes view içinde aranıyor...',
        this.quoteTable ? 'BULUNDU' : 'BULUNAMADI'
      );

      // Hala bulunamadıysa diğer potansiyel seçicileri deneyelim
      if (!this.quoteTable) {
        // Tüm olası teklif tablosu seçicilerini kontrol et
        const potentialTables = [
          document.querySelector('.teklif-table tbody'),
          document.querySelector('.quotes-table tbody'),
          document.querySelector('#quotes table tbody'),
        ];

        // İlk geçerli tabloyu kullan
        for (const table of potentialTables) {
          if (table) {
            this.quoteTable = table;
            console.log('Alternatif teklif tablosu bulundu:', table);
            break;
          }
        }
      }
    }
    this.activeStatusFilter = ''; // sadece 1 kez constructor'da tanımlansın

    console.log('UI başlatma tamamlandı');
  }

  // Gerekli olan getLastNMonths fonksiyonunu ekle
  getLastNMonths(n) {
    const months = [];
    const currentDate = new Date();

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      months.push(d.toLocaleString('tr-TR', { month: 'short' }));
    }

    return months;
  }

  switchView(viewId) {
    // Önceki view'ı gizle
    if (this.views.get(this.currentView)) {
      this.views.get(this.currentView).classList.remove('active');
    }

    // Yeni view'ı göster
    const newView = this.views.get(viewId);
    if (newView) {
      newView.classList.add('active');

      // Navigasyon butonlarını güncelle
      document.querySelector('.nav-button.active')?.classList.remove('active');
      document
        .querySelector(`[data-view="${viewId}"]`)
        ?.classList.add('active');

      this.currentView = viewId;

      // Chart.js resize tetikle — view görünür olunca grafikler yeniden ölçeklensin
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        // Leaflet haritası varsa boyutunu güncelle
        if (window._customerLeafletMap) {
          window._customerLeafletMap.invalidateSize();
        }
      });

      // Veri Yönetimi görünümüne geçildiğinde, içeriği dinamik olarak yükle
      if (viewId === 'data-management' && !this.dataManagementViewLoaded) {
        this.loadDataManagementView();
      }

      // Teklif görünümüne geçildiyse, filtre butonlarını oluştur ve teklifleri göster
      if (viewId === 'quotes') {
        console.log(
          'Teklifler görünümüne geçildi - filtre butonları ayarlanıyor'
        );
        setTimeout(() => {
          this.attachFilterEventListeners(); // BU YENİ METODU AŞAĞIDA YAZIYORUZ
        }, 100); // DOM'un tamamen yüklenmesi için küçük gecikme

        // Tüm tekliflerin yüklü olduğundan emin ol
        if (!this.allQuotes || this.allQuotes.length === 0) {
          console.log('Teklifler henüz yüklenmemiş, yükleniyor...');
          this.loadData().then(() => {
            this.fixFilterButtons();
          });
        } else {
          this.fixFilterButtons();
        }
      }

      // CRM görünümüne geçildiğinde, CRM'i başlat
      if (viewId === 'crm') {
        console.log('CRM görünümüne geçildi - CRM başlatılıyor');
        this.initializeCRM().catch((error) => {
          console.error('CRM başlatılırken hata:', error);
        });
      }

      // Genel bakış sayfasına geçildiğinde, grafiklerin doğru yüklenmesini sağla
      if (viewId === 'overview') {
        // View görünür hale geldiğinde çalışması için kısa gecikme ver
        setTimeout(() => {
          // Tüm eski grafik nesnelerini temizle
          this.destroyAllCharts();

          // Grafikler için HTML öğelerini hazırla (canvas'lar varsa)
          this.prepareChartCanvases();

          // Grafik oluşturma fonksiyonlarını çağır
          this.initializeCharts();

          // Teklif verisi hazırsa grafikleri verilerle güncelle
          this.updateCharts(this.allQuotes);

          // Dashboard widgets'ı da yeniden başlat
          if (window.dashboardWidgetsInstance) {
            console.log('Dashboard widgets yeniden başlatılıyor...');
            window.dashboardWidgetsInstance.updateDashboardWidgets();
          } else if (window.DashboardWidgets) {
            console.log('Yeni DashboardWidgets instance oluşturuluyor...');
            window.dashboardWidgetsInstance = new window.DashboardWidgets();
          }
        }, 200); // Canvas'ların görünür olması için biraz daha fazla gecikme
      }

      // Kar zarar analizi sekmesine geçildiğinde, grafikleri yeniden başlat
      if (viewId === 'profit-loss') {
        setTimeout(() => {
          console.log('Kar zarar analizi sekmesi açılıyor, grafikler yeniden başlatılıyor...');
          
          // ProfitLossManager'ı yeniden initialize et
          if (window.profitLossManager) {
            console.log('ProfitLossManager yeniden başlatılıyor...');
            // Mevcut grafikleri temizle
            if (window.profitLossManager.charts) {
              Object.values(window.profitLossManager.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                  try {
                    chart.destroy();
                  } catch (e) {
                    console.warn('Grafik temizlenirken hata:', e);
                  }
                }
              });
              window.profitLossManager.charts = {
                profitLossDistribution: null,
                marginDistribution: null,
                monthlyProfitTrend: null,
              };
            }
            // Verileri yeniden yükle ve grafikleri oluştur
            window.profitLossManager.loadData().then(() => {
              console.log('Veriler yüklendi, grafikler oluşturuluyor...');
              window.profitLossManager.renderApprovedQuotes();
              window.profitLossManager.updateSummaryCards();
              
              // Canvas'ların görünür olduğundan emin olmak için biraz bekle
              setTimeout(() => {
                window.profitLossManager.initializeCharts();
                // Grafikler oluşturulduktan sonra verilerle güncelle
                setTimeout(() => {
                  window.profitLossManager.updateCharts();
                }, 100);
              }, 200);
            }).catch(error => {
              console.error('ProfitLossManager yeniden başlatılırken hata:', error);
            });
          } else {
            // ProfitLossManager henüz oluşturulmamışsa oluştur
            console.log('ProfitLossManager oluşturuluyor...');
            import('../scripts/profit-loss-manager.js').then(module => {
              window.profitLossManager = new module.default();
            }).catch(error => {
              console.error('ProfitLossManager yüklenirken hata:', error);
            });
          }
        }, 300);
      }

      this.updateView(viewId);
    }
  }

  async loadDataManagementView() {
    try {
      const response = await fetch('data-entry.html');
      if (!response.ok) {
        throw new Error('data-entry.html yüklenemedi.');
      }
      const html = await response.text();
      const dataManagementView = this.views.get('data-management');
      
      // Parser kullanarak sadece body içeriğini alalım
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const bodyContent = doc.body.innerHTML;

      if (dataManagementView) {
        dataManagementView.innerHTML = bodyContent;
        this.dataManagementViewLoaded = true;

        // Script'leri çalıştırmak için yeniden ekleyelim
        const scripts = doc.head.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            if (script.src) {
                newScript.src = script.src;
                newScript.type = 'module'; // Gerekirse module tipini koru
            } else {
                newScript.textContent = script.textContent;
            }
            dataManagementView.appendChild(newScript);
        });
      }
    } catch (error) {
      console.error('Veri Yönetimi sekmesi yüklenirken hata:', error);
    }
  }

  attachFilterEventListeners() {
    const filterButtons = document.querySelectorAll('.filter-btn[data-status]');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document
          .querySelectorAll('.filter-btn')
          .forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeStatusFilter = e.target.dataset.status || '';
        this.applyFilters();
      });
    });

    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document
          .querySelectorAll('.filter-btn')
          .forEach((b) => b.classList.remove('active'));
        this.activeStatusFilter = '';
        this.applyFilters();
      });
    }
  }

  // YENİ EKLENEN: Filtre Butonlarını Doğrudan Düzelt - Artık prepareFilteringSystem'i çağırıyor
  fixFilterButtons() {
    console.log('Filtre butonları optimize ediliyor...');

    // Yeni modern filtreleme sistemini kullan
    this.prepareFilteringSystem();

    // Tüm teklifleri yükle
    this.renderQuotesList(this.allQuotes);

    console.log('Filtre butonları optimize edildi');
  }

  // Arama girdisi işleyicisi - Geliştirilmiş ve optimize edilmiş
  handleSearchInput(searchValue) {
    console.log(`Arama işleniyor: "${searchValue}"`);

    // Debounce uygulaması: Kullanıcı kısa süre içinde birden fazla karakter yazarsa
    // sadece son yazım işleminden belirli bir süre sonra filtrelemeyi başlat
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Zamanlayıcı ayarla - 300ms bekleme süresi
    this.searchTimeout = setTimeout(() => {
      console.log(`Zamanlayıcı tamamlandı, arama yapılıyor: "${searchValue}"`);
      this.applyFilters(); // Tüm filtreleri uygula
    }, 300);
  }

  // Yardımcı fonksiyon: Debounce işlemi - debounceSearch artık handleSearchInput'u çağırıyor
  debounceSearch() {
    // DOM'dan arama girdisini al
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      // HandleSearchInput fonksiyonuna yönlendir
      this.handleSearchInput(searchInput.value);
    } else {
      console.warn('searchInput elementi bulunamadı');
    }
  }

  // Tarih değişim işleyicisi - Geliştirilmiş ve optimize edilmiş
  handleDateChange() {
    console.log('Tarih filtreleri değiştirildi');

    // Tarih değerleri kontrol et
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    const startValue = startDate ? startDate.value : '';
    const endValue = endDate ? endDate.value : '';

    if (startValue && endValue) {
      if (new Date(startValue) > new Date(endValue)) {
        console.warn('Başlangıç tarihi bitiş tarihinden sonra olamaz');
        // Kullanıcıya uyarı göster - alert kullanmak yerine daha kullanıcı dostu bir yöntem
        const dateError = document.createElement('div');
        dateError.className = 'date-error';
        dateError.textContent =
          'Başlangıç tarihi bitiş tarihinden sonra olamaz';
        dateError.style.color = 'red';
        dateError.style.fontSize = '12px';
        dateError.style.marginTop = '5px';

        // Eğer zaten hata mesajı varsa, tekrar ekleme
        const existingError = document.querySelector('.date-error');
        if (existingError) {
          existingError.remove();
        }

        // Hata mesajını ekle
        if (endDate && endDate.parentNode) {
          endDate.parentNode.appendChild(dateError);

          // 3 saniye sonra hata mesajını kaldır
          setTimeout(() => {
            dateError.remove();
          }, 3000);
        }

        return;
      }
    }

    // Tarihlerde sorun yoksa filtreleri uygula
    // Aktif durum filtresini koru
    console.log(
      `Tarih filtresi, aktif durum ile filtreleniyor: ${this.activeStatusFilter}`
    );
    this.applyFilters(this.activeStatusFilter);
  }

  // Filtreleri sıfırlama işlevi - yeni filtreleme yapısına uyumlu
  resetFilters() {
    console.log('Filtreleri sıfırlama başlatıldı...');

    try {
      // 1. Arama kutusunu temizle
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = '';
      }

      // 2. Tarih filtrelerini temizle
      const startDate = document.getElementById('startDate');
      const endDate = document.getElementById('endDate');
      if (startDate) startDate.value = '';
      if (endDate) endDate.value = '';

      // 3. Tüm butonlardan active sınıfını kaldır
      document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.classList.remove('active');
      });

      // 4. "Tümü" butonunu aktif et
      const btnAll = document.getElementById('btnAll');
      if (btnAll) {
        btnAll.classList.add('active');

        // Global filtre türünü güncelle
        this.activeStatusFilter = 'all';
        console.log(
          `Filtreler sıfırlandı. Aktif durum: ${this.activeStatusFilter}`
        );
      }

      // 5. Filtreleri uygulamak yerine doğrudan tüm teklifleri göster
      // Bu performansı artırır çünkü applyFilters fonksiyonunu çağırmaya gerek kalmaz
      this.renderQuotesList(this.allQuotes);

      console.log('Filtreler başarıyla sıfırlandı, tüm teklifler gösteriliyor');
    } catch (error) {
      console.error('Filtreleri sıfırlarken hata:', error);
      // Hata durumunda en azından teklifleri göstermeyi dene
      this.renderQuotesList(this.allQuotes);
    }
  }

  updateView(viewId) {
    switch (viewId) {
      case 'overview':
        // Before updating charts, make sure they're properly destroyed
        this.destroyAllCharts();

        // Short timeout to ensure DOM is ready before recreating charts
        setTimeout(() => {
          this.updateStatistics();
          this.initializeCharts();
          this.updateCharts();
        }, 50);
        break;
      case 'reports':
        if (this.charts.has('salesPerformance')) {
          this.charts.get('salesPerformance').update();
        }
        if (this.charts.has('userAnalysis')) {
          this.charts.get('userAnalysis').update();
        }
        break;
      case 'quotes':
        this.renderQuotesList(this.allQuotes);
        break;
      case 'crm':
        this.loadCRMData();
        break;
    }
  }

  // Add a method to properly destroy all charts before recreating them
  destroyAllCharts() {
    // Chart.js tarafından oluşturulan tüm grafikleri temizle
    console.log('Tüm grafikler temizleniyor...');

    // Destroy metodu olan tüm grafik nesnelerini temizle
    const chartProperties = [
      'monthlyTrendChart',
      'userPerformanceChart',
      'customerCountryDistributionChart',
    ];

    chartProperties.forEach((prop) => {
      if (this[prop]) {
        try {
          console.log(`${prop} yok ediliyor`);
          this[prop].destroy();
          this[prop] = null;
        } catch (error) {
          console.warn(`${prop} yok edilirken hata:`, error);
        }
      }
    });

    // Canvas elementlerini temizle ve yeniden ayarla
    const canvasElements = document.querySelectorAll('canvas');
    canvasElements.forEach((canvas) => {
      // Canvas içeriğini temizle
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Canvas boyutlarını sıfırla - yeniden çizim için hazırla
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    });

    console.log('Tüm grafikler ve canvas elementleri başarıyla temizlendi');
  }

  updateOverview() {
    // Genel bakış verilerini güncelle
    this.updateStatistics();
    this.updateCharts();
  }

  updateReports() {
    // Raporlar verilerini güncelle
    this.updateReportCharts();
  }

  updateQuotes() {
    // Teklif listesini güncelle
    this.updateQuotesList();
  }

  async loadData() {
    console.log('loadData çağrıldı: Teklifleri yükleme işlemi başlıyor...');

    try {
      // Önce users tablosundaki kullanıcıları yükle
      await this.loadUsers();

      // API'den teklif verilerini getir - API URL'sini kontrol et
      const apiEndpoint = `${window.location.origin}/api/quotes?limit=1000`;
      console.log('API endpointi:', apiEndpoint);

      let apiQuotes = [];
      let apiSuccess = false;

      try {
        // Fetch API ile verileri getir
        console.log('API çağrısı başlatılıyor...');
        const token = localStorage.getItem('authToken');
        const response = await fetch(apiEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'same-origin',
        });

        // Sunucu cevabını işle
        if (!response.ok) {
          console.warn(
            `API yanıtı başarısız: ${response.status} ${response.statusText}`
          );
          throw new Error(
            `API yanıtı başarısız: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log(
          'API yanıtı alındı:',
          data.success,
          'veri sayısı:',
          data.data?.length
        );

        if (data.success) {
          apiQuotes = data.data || [];
          apiSuccess = true;
          console.log(`API'den ${apiQuotes.length} teklif alındı.`);
        } else {
          console.warn('API başarı durumu false:', data);
        }
      } catch (apiError) {
        console.warn(
          'API çağrısı başarısız, alternatif veri kullanılacak:',
          apiError
        );
      }

      // API'den veri alınamadıysa elle oluşturulmuş örnek veriler kullan
      if (!apiSuccess || apiQuotes.length === 0) {
        console.log(
          'UYARI: API verisi alınamadı veya boş, alternatif veriler kullanılacak'
        );
        apiQuotes = this.createDummyQuotes();
        console.log(
          'Alternatif veri oluşturuldu, teklif sayısı:',
          apiQuotes.length
        );
      }

      // Boş veri kontrolü
      if (apiQuotes.length === 0) {
        console.warn(
          "Teklif verisi yok - hem API'den hem alternatif kaynaktan veri alınamadı"
        );
        this.allQuotes = [];
        return [];
      }

      // Verileri işle ve allQuotes'a ata
      console.log('Alınan ham veriler (ilk 2 teklif):', apiQuotes.slice(0, 2));
      this.allQuotes = apiQuotes;

      // STATUS DEĞERLERİNİ STANDARTLAŞTIR
      this.allQuotes = this.allQuotes
        .map((quote) => {
          if (!quote) return null;

          // Status değerini standartlaştır (eğer varsa)
          if (quote.status !== undefined) {
            // String'e dönüştür
            const statusStr = String(quote.status).trim();

            // Status mapping (standardize et)
            const statusUpper = statusStr.toUpperCase();

            if (statusUpper.includes('ONAY') || statusUpper.includes('CHECK')) {
              quote.status = 'ONAYLANDI';
            } else if (
              statusUpper.includes('RED') ||
              statusUpper.includes('CANC') ||
              statusUpper.includes('IPTAL')
            ) {
              quote.status = 'REDDEDILDI';
            } else {
              // Varsayılan olarak HAZIRLANDI
              quote.status = 'HAZIRLANDI';
            }

            console.log(
              `Teklif #${quote.id} durumu standartlaştırıldı: "${statusStr}" -> "${quote.status}"`
            );
          } else {
            // Eğer status yoksa varsayılan olarak HAZIRLANDI
            quote.status = 'HAZIRLANDI';
            console.log(
              `Teklif #${quote.id || 'ID yok'} için eksik durum varsayılan olarak ayarlandı: "HAZIRLANDI"`
            );
          }

          // Kullanıcı adlarını düzelt - prepared_by numaraları yerine tam adları kullan
          if (quote.prepared_by && !isNaN(parseInt(quote.prepared_by))) {
            const userId = parseInt(quote.prepared_by);
            const userName = this.getUserNameById(userId);
            quote.prepared_by_name = userName;
          } else if (!quote.prepared_by_name && quote.prepared_by) {
            // Eğer prepared_by_name yoksa ama prepared_by varsa, onu kullan
            quote.prepared_by_name = quote.prepared_by;
          } else if (!quote.prepared_by && !quote.prepared_by_name) {
            // Her ikisi de yoksa, varsayılan değer ata
            quote.prepared_by = 'Ahmet Yilmaz';
            quote.prepared_by_name = 'Ahmet Yilmaz';
          }

          return quote;
        })
        .filter(Boolean); // null değerleri filtrele

      console.log('İşlem sonrası teklif sayısı:', this.allQuotes.length);
      console.log(
        'İşlenmiş veriler (ilk 2 teklif):',
        this.allQuotes.slice(0, 2)
      );

      // Log ile status değerlerini kontrol et
      const uniqueStatuses = [...new Set(this.allQuotes.map((q) => q.status))];
      console.log('TÜM TEKLİFLERDE MEVCUT DURUM DEĞERLERİ:', uniqueStatuses);

      // Teklif verilerini işle
      const processedQuotes = this.processQuotes(this.allQuotes);

      // Durum sayılarını güncelle
      const statusCounts = {};
      processedQuotes.forEach((quote) => {
        const status = String(quote.status || 'Belirsiz').toUpperCase();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('Durum sayıları:', statusCounts);

      // Dashboard ve istatistikleri güncelle
      if (this.currentView === 'overview') {
        this.updateDashboard(processedQuotes);
      }

      // Quotes görünümündeyse, teklif listesini güncelle
      if (this.currentView === 'quotes') {
        console.log(
          'Quotes görünümünde olduğumuz için filtreleme yapılıyor...'
        );
        if (this.activeStatusFilter && this.activeStatusFilter !== 'all') {
          console.log(
            `Aktif filtre (${this.activeStatusFilter}) ile filtreleme yapılıyor`
          );
          this.applyFilters(this.activeStatusFilter);
        } else {
          console.log('Tüm teklifler gösteriliyor (filtre yok)');
          this.renderQuotesList(this.allQuotes);
        }
      }

      console.log('Teklif verileri başarıyla yüklendi:', this.allQuotes.length);
      return processedQuotes;
    } catch (error) {
      console.error('Veri yükleme işlemi başarısız:', error);

      // Hata mesajını göster
      this.showErrorMessage('Veri yükleme hatası', error.message);

      // Alternatif dummy verileri yükle - UI tamamen boş kalmasın
      console.log('Alternatif dummy veriler yükleniyor...');
      this.allQuotes = this.createDummyQuotes();

      if (this.currentView === 'quotes') {
        // Quotes görünümündeyse yeni verileri göster
        console.log('Quotes görünümünde alternatif veriler gösteriliyor...');
        this.renderQuotesList(this.allQuotes);
      }

      return this.allQuotes;
    }
  }

  // Hata mesajını göstermek için yardımcı fonksiyon
  showErrorMessage(title, message) {
    // Hata mesajı gösterecek bir element oluştur ve ekrana ekle
    const errorEl = document.createElement('div');
    errorEl.className = 'api-error-message';
    errorEl.innerHTML = `
            <div class="error-container">
                <h3>${title}</h3>
                <p>${message}</p>
                <p>Sunucu bağlantınızı kontrol edin ve sayfayı yenileyin.</p>
                <button onclick="location.reload()">Sayfayı Yenile</button>
            </div>
        `;
    errorEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 400px;
        `;
    document.body.appendChild(errorEl);

    // 10 saniye sonra mesajı kaldır
    setTimeout(() => {
      errorEl.style.opacity = '0';
      errorEl.style.transition = 'opacity 0.5s ease';
      setTimeout(() => errorEl.remove(), 500);
    }, 10000);
  }

  // Test ve fallback için dummy teklif verileri oluştur
  createDummyQuotes() {
    console.log('Dummy teklif verileri oluşturuluyor...');

    const currentDate = new Date();
    const formatDate = (date) => {
      return date.toLocaleDateString('tr-TR');
    };

    // Farklı durumlar için ön tanımlı teklifler
    const dummyQuotes = [
      {
        id: 1,
        number: 'TKF-2023-001',
        date: formatDate(currentDate),
        details: 'Test Teklifi 1',
        prepared_by: 'Ahmet Yilmaz',
        prepared_by_name: 'Ahmet Yilmaz',
        total_price: 9891.2,
        totalPrice: '9891.20 USD',
        status: 'HAZIRLANDI',
        customer_country: 'Türkiye',
      },
      {
        id: 2,
        number: 'TKF-2023-002',
        date: formatDate(new Date(currentDate.getTime() - 86400000)), // 1 gün önce
        details: 'Önemli Müşteri Teklifi',
        prepared_by: 'Kemal Sunal',
        prepared_by_name: 'Kemal Sunal',
        total_price: 5566.0,
        totalPrice: '5566.00 USD',
        status: 'ONAYLANDI',
        customer_country: 'Almanya',
      },
      {
        id: 3,
        number: 'TKF-2023-003',
        date: formatDate(new Date(currentDate.getTime() - 86400000 * 2)), // 2 gün önce
        details: 'Acil Teklif',
        prepared_by: 'Ahmet Yilmaz',
        prepared_by_name: 'Ahmet Yilmaz',
        total_price: 8675.6,
        totalPrice: '8675.60 USD',
        status: 'REDDEDILDI',
        customer_country: 'Türkiye',
      },
      {
        id: 4,
        number: 'TKF-2023-004',
        date: formatDate(new Date(currentDate.getTime() - 86400000 * 3)), // 3 gün önce
        details: 'Revize Edilecek Teklif',
        prepared_by: 'Mücahit EKİCİ',
        prepared_by_name: 'Mücahit EKİCİ',
        total_price: 7410.35,
        totalPrice: '7410.35 USD',
        status: 'HAZIRLANDI',
        customer_country: 'Fransa',
      },
      {
        id: 5,
        number: 'TKF-2023-005',
        date: formatDate(new Date(currentDate.getTime() - 86400000 * 5)), // 5 gün önce
        details: 'Standart Teklif',
        prepared_by: 'Ahmet Yilmaz',
        prepared_by_name: 'Ahmet Yilmaz',
        total_price: 12450.75,
        totalPrice: '12450.75 USD',
        status: 'ONAYLANDI',
      },
      {
        id: 6,
        number: 'TKF-2023-006',
        date: formatDate(new Date(currentDate.getTime() - 86400000 * 7)), // 7 gün önce
        details: 'Acil Sipariş',
        prepared_by: 'Mehmet Kaya',
        prepared_by_name: 'Mehmet Kaya',
        total_price: 6789.45,
        totalPrice: '6789.45 USD',
        status: 'HAZIRLANDI',
      },
      {
        id: 7,
        number: 'TKF-2023-007',
        date: formatDate(new Date(currentDate.getTime() - 86400000 * 9)), // 9 gün önce
        details: 'Büyük Müşteri Siparişi',
        prepared_by: 'Kemal Sunal',
        prepared_by_name: 'Kemal Sunal',
        total_price: 19875.25,
        totalPrice: '19875.25 USD',
        status: 'ONAYLANDI',
      },
      {
        id: 8,
        number: 'TKF-2023-008',
        date: formatDate(new Date(currentDate.getTime() - 86400000 * 10)), // 10 gün önce
        details: 'İptali İstenen Sipariş',
        prepared_by: 'Ahmet Yilmaz',
        prepared_by_name: 'Ahmet Yilmaz',
        total_price: 3245.8,
        totalPrice: '3245.80 USD',
        status: 'REDDEDILDI',
      },
      {
        id: 9,
        number: 'TKF-2023-009',
        date: formatDate(new Date(currentDate.getTime() - 86400000 * 12)), // 12 gün önce
        details: 'Kampanya Teklifi',
        prepared_by: 'Kemal Sunal',
        prepared_by_name: 'Kemal Sunal',
        total_price: 8542.65,
        totalPrice: '8542.65 USD',
        status: 'ONAYLANDI',
      },
      {
        id: 10,
        number: 'TKF-2023-010',
        date: formatDate(new Date(currentDate.getTime() - 86400000 * 15)), // 15 gün önce
        details: 'Yeni Proje',
        prepared_by: 'Mücahit EKİCİ',
        prepared_by_name: 'Mücahit EKİCİ',
        total_price: 10942.5,
        totalPrice: '10942.50 USD',
        status: 'HAZIRLANDI',
      },
    ];

    console.log(`${dummyQuotes.length} adet örnek teklif oluşturuldu`);
    return dummyQuotes;
  }

  updateDashboard(quotes) {
    if (quotes && quotes.length > 0) {
      this.updateStatistics(quotes);
      this.updateQuoteTable(quotes);
      this.updateCharts(quotes);
      this.updateUserPerformance(quotes);
    } else {
      console.log('Henüz teklif bulunmuyor');
      if (this.quoteTable) {
        this.quoteTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="no-data">
                            Henüz teklif bulunmamaktadır.
                        </td>
                    </tr>
                `;
      }
    }
  }

  updateStatistics(quotes) {
    // Veri kontrolü - quotes null/undefined ise fonksiyonu sonlandır
    if (!quotes || !Array.isArray(quotes)) {
      console.warn('updateStatistics: Geçersiz veya boş teklif verisi');
      return;
    }

    try {
      // İstatistik değerlerini hesapla
      const totalQuotes = quotes.length;
      const approvedQuotes = quotes.filter(
        (quote) => quote && quote.status === 'ONAYLANDI'
      ).length;

      // Aylık teklif sayısını hesapla
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const monthlyQuotes = quotes.filter((quote) => {
        try {
          if (!quote || !quote.date) return false;

          const quoteDate = new Date(quote.date);
          return (
            !isNaN(quoteDate.getTime()) &&
            quoteDate.getMonth() === currentMonth &&
            quoteDate.getFullYear() === currentYear
          );
        } catch (error) {
          console.warn('Hatalı tarih formatı:', quote?.date);
          return false;
        }
      }).length;

      const totalValue = quotes.reduce((sum, quote) => {
        if (!quote) return sum;
        try {
          const price = quote.totalPrice || quote.total_price || '0';
          return (
            sum + (parseFloat(price.toString().replace(/[^0-9.-]+/g, '')) || 0)
          );
        } catch (error) {
          console.warn(
            'Hatalı fiyat formatı:',
            quote?.totalPrice || quote?.total_price
          );
          return sum;
        }
      }, 0);

      const approvedValue = quotes
        .filter((quote) => quote && quote.status === 'ONAYLANDI')
        .reduce((sum, quote) => {
          try {
            const price = quote.totalPrice || quote.total_price || '0';
            return (
              sum +
              (parseFloat(price.toString().replace(/[^0-9.-]+/g, '')) || 0)
            );
          } catch (error) {
            console.warn(
              'Hatalı fiyat formatı:',
              quote?.totalPrice || quote?.total_price
            );
            return sum;
          }
        }, 0);

      const pendingValue = totalValue - approvedValue;
      const successRate =
        totalQuotes > 0 ? ((approvedQuotes / totalQuotes) * 100).toFixed(1) : 0;
      const averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

      // Elementleri kontrol et ve varsa güncelle
      this.updateElementContent('.toplam-teklif', totalQuotes);
      this.updateElementContent('.onaylanan', approvedQuotes);
      this.updateElementContent('.aylik-teklif', monthlyQuotes);
      this.updateElementContent(
        '.toplam-deger',
        `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      );
      this.updateElementContent(
        '.onaylanan-deger',
        `$${approvedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      );
      this.updateElementContent(
        '.bekleyen-deger',
        `$${pendingValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      );
      this.updateElementContent('.basari-orani', `${successRate}%`);
      this.updateElementContent(
        '.ort-teklif',
        `$${averageValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      );

      // Dashboard widget istatistiklerini güncelle
      this.updateElementContent('.total-quotes', totalQuotes);
      this.updateElementContent('.approved-quotes', approvedQuotes);
      this.updateElementContent(
        '.total-value',
        `${totalValue.toLocaleString('en-US')} USD`
      );
      this.updateElementById('thisMonthQuotes', monthlyQuotes);
      this.updateElementById(
        'approvalRate',
        `${Math.round((approvedQuotes / totalQuotes) * 100 || 0)}%`
      );
      this.updateElementById(
        'avgQuoteValue',
        `${averageValue.toLocaleString('en-US')} USD`
      );

      // Debug için
      console.log('İstatistikler güncellendi:', {
        toplamTeklif: totalQuotes,
        aylikTeklif: monthlyQuotes,
        toplamDeger: totalValue,
        onaylananDeger: approvedValue,
      });
    } catch (error) {
      console.error('İstatistikler güncellenirken hata:', error);
    }
  }

  // Element içeriğini güvenli bir şekilde güncelleme
  updateElementContent(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    } else {
      console.warn(`Element bulunamadı: ${selector}`);
    }
  }

  // Element ID'sine göre içerik güncelleme
  updateElementById(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    } else {
      console.warn(`Element bulunamadı: #${id}`);
    }
  }

  updateQuoteTable(quotes) {
    if (!this.quoteTable) {
      console.error('Quote table element not found');
      return;
    }

    console.log('Tablo güncelleniyor:', quotes); // Debug için

    this.quoteTable.innerHTML = quotes
      .map(
        (quote) => `
            <tr>
                <td>${quote.number || '-'}</td>
                <td>${quote.date || '-'}</td>
                <td>${quote.details || '-'}</td>
                <td>${quote.preparedBy || '-'}</td>
                <td>${quote.totalPrice || '-'}</td>
                <td>
                    <span class="status-badge ${quote.status?.toLowerCase()}">
                        ${quote.status || 'HAZIRLANDI'}
                    </span>
                </td>
                <td>
                    ${this.getActionButtons(quote)}
                </td>
            </tr>
        `
      )
      .join('');
  }

  getActionButtons(quote) {
    if (!quote || !quote.id) {
      return '<span class="no-actions">İşlem yok</span>';
    }

    const status = quote.status?.toUpperCase() || 'HAZIRLANDI';
    let buttons = '';

    if (status === 'HAZIRLANDI' || status === 'EDIT') {
      buttons += `
                
                <button class="action-button approve" data-action="approve" data-id="${quote.id}" data-tooltip="Onayla">
                    <i class="material-icons">check_circle</i>
                    <span>Onayla</span>
                </button>
                <button class="action-button reject" data-action="reject" data-id="${quote.id}" data-tooltip="Reddet">
                    <i class="material-icons">cancel</i>
                    <span>Reddet</span>
                </button>
                <button class="action-button delete" data-action="delete" data-id="${quote.id}" data-tooltip="Sil">
                    <i class="material-icons">delete</i>
                    <span>Sil</span>
                </button>
            `;
    } else if (
      status === 'ONAYLANDI' ||
      status === 'CHECK CIRCLE'
    ) {
      buttons += `
                <button class="action-button edit-cost" data-action="edit-cost" data-id="${quote.id}" data-tooltip="Gerçekleşen Maliyet Gir">
                    <i class="material-icons">attach_money</i>
                    <span>Maliyet</span>
                </button>
                <button class="action-button revert" data-action="revert" data-id="${quote.id}" data-tooltip="Geri Al">
                    <i class="material-icons">replay</i>
                    <span>Geri Al</span>
                </button>
                <button class="action-button delete" data-action="delete" data-id="${quote.id}" data-tooltip="Sil">
                    <i class="material-icons">delete</i>
                    <span>Sil</span>
                </button>
            `;
    } else if (
      status === 'REDDEDILDI' ||
      status === 'CANCEL'
    ) {
      buttons += `
                <button class="action-button revert" data-action="revert" data-id="${quote.id}" data-tooltip="Geri Al">
                    <i class="material-icons">replay</i>
                    <span>Geri Al</span>
                </button>
                <button class="action-button delete" data-action="delete" data-id="${quote.id}" data-tooltip="Sil">
                    <i class="material-icons">delete</i>
                    <span>Sil</span>
                </button>
            `;
    } else {
      // Bilinmeyen durum için varsayılan butonlar
      buttons += `
                <button class="action-button delete" data-action="delete" data-id="${quote.id}" data-tooltip="Sil">
                    <i class="material-icons">delete</i>
                    <span>Sil</span>
                </button>
            `;
    }

    return buttons || '<span class="no-actions">İşlem yok</span>';
  }

  updateCharts(quotes) {
    this.checkCanvasElements();
    this.updateMonthlyTrendChart(quotes);
    this.updateUserPerformanceChart(quotes);
    this.updateUserMonthlyTrendChart(quotes);
    this.updateTargetTrackingChart(quotes);
    // Yeni grafikler
    this.updateQuoteStatusDistributionChart(quotes);
    this.updateUserPerformanceRadarChart(quotes);
    this.updateMonthlyComparisonChart(quotes);
    this.updateCustomerCountryDistributionChart(quotes);
  }

  // Canvas element varlığını kontrol etme metodu
  checkCanvasElements() {
    const requiredCanvases = [
      'monthlyTrendChart',
      'userPerformanceChart',
      'quoteStatusDistributionChart',
      'userPerformanceRadarChart',
      'monthlyComparisonChart',
      'userMonthlyTrendChart',
      'targetTrackingChart',
      'customerCountryDistributionChart',
      // Alternatif ID'ler
      'quotesTrendChart',
      'statusDistributionChart',
    ];

    console.log('Canvas element kontrolleri:');
    requiredCanvases.forEach((id) => {
      const element = document.getElementById(id);
      console.log(`${id}: ${element ? 'MEVCUT ✅' : 'EKSIK ❌'}`);
    });
  }

  // Teklif durumlarının dağılımını gösteren pasta grafiği
  updateQuoteStatusDistributionChart(quotes) {
    // İki olası ID'yi de kontrol et
    let ctx = document.getElementById('quoteStatusDistributionChart');
    if (!ctx) {
      ctx = document.getElementById('statusDistributionChart');
      if (!ctx) {
        console.warn('Teklif durum dağılımı grafiği için canvas bulunamadı');
        return;
      }
    }

    // Canvas'ta kayıtlı önceki chart'ı temizle (Chart.js internal registry)
    const _existingStatus = Chart.getChart ? Chart.getChart(ctx) : null;
    if (_existingStatus) _existingStatus.destroy();
    if (this.quoteStatusDistributionChart) {
      try { this.quoteStatusDistributionChart.destroy(); } catch(e){}
      this.quoteStatusDistributionChart = null;
    }

    // Her durum için teklif sayılarını hesapla
    const statusCounts = {
      HAZIRLANDI: 0,
      ONAYLANDI: 0,
      REDDEDILDI: 0,
    };

    // Her durum için toplam değerleri hesapla
    const statusValues = {
      HAZIRLANDI: 0,
      ONAYLANDI: 0,
      REDDEDILDI: 0,
    };

    quotes.forEach((quote) => {
      const status = quote.status || 'HAZIRLANDI';

      // Teklif sayısını artır
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }

      // Toplam değeri hesapla
      const price =
        parseFloat(quote.totalPrice?.toString().replace(/[^0-9.-]+/g, '')) || 0;
      if (statusValues[status] !== undefined) {
        statusValues[status] += price;
      }
    });

    // Grafik verilerini hazırla
    const chartData = {
      labels: ['Hazırlandı', 'Onaylandı', 'Reddedildi'],
      datasets: [
        {
          label: 'Teklif Sayısı',
          data: [
            statusCounts['HAZIRLANDI'],
            statusCounts['ONAYLANDI'],
            statusCounts['REDDEDILDI'],
          ],
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(255, 99, 132, 0.7)',
          ],
          borderColor: [
            'rgb(54, 162, 235)',
            'rgb(75, 192, 192)',
            'rgb(255, 99, 132)',
          ],
          borderWidth: 1,
        },
      ],
    };

    // Pasta grafiği oluştur
    const chartColors = getChartThemeColors();
    this.quoteStatusDistributionChart = new Chart(ctx, {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: chartColors.text,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);

                const status = ['HAZIRLANDI', 'ONAYLANDI', 'REDDEDILDI'][
                  context.dataIndex
                ];
                const monetaryValue = statusValues[status].toLocaleString(
                  'en-US',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                );

                return [
                  `${context.label}: ${value} adet (%${percentage})`,
                  `Toplam Değer: $${monetaryValue}`,
                ];
              },
            },
          },
          title: {
            display: true,
            text: 'Teklif Durumu Dağılımı',
            color: chartColors.text,
            font: {
              size: 16,
            },
          },
        },
      },
    });
  }

  // Kullanıcı performansını çok boyutlu olarak gösteren radar grafiği
  updateUserPerformanceRadarChart(quotes) {
    const ctx = document.getElementById('userPerformanceRadarChart');
    if (!ctx) {
      console.warn('Kullanıcı performans radar grafiği için canvas bulunamadı');
      return;
    }

    if (this.userPerformanceRadarChart) {
      this.userPerformanceRadarChart.destroy();
    }

    // Kullanıcıları ve ilgili metrikleri hazırla
    const userMetrics = {};
    quotes.forEach((quote) => {
      // Kullanıcı adını doğru şekilde al
      let userName;

      // Öncelik sırası: prepared_by_name -> Kullanıcı adı çözümleme -> prepared_by
      if (quote.prepared_by_name) {
        userName = quote.prepared_by_name;
      } else if (quote.prepared_by && !isNaN(parseInt(quote.prepared_by))) {
        // prepared_by bir ID ise, kullanıcı adını getir
        const userId = parseInt(quote.prepared_by);
        userName = this.getUserNameById(userId);
      } else {
        userName = quote.prepared_by || 'Bilinmiyor';
      }

      if (!userMetrics[userName]) {
        userMetrics[userName] = {
          totalQuotes: 0,
          approvedQuotes: 0,
          totalValue: 0,
          approvalRate: 0,
          avgValue: 0,
        };
      }

      userMetrics[userName].totalQuotes++;
      userMetrics[userName].totalValue +=
        parseFloat(quote.totalPrice?.toString().replace(/[^0-9.-]+/g, '')) || 0;

      if (quote.status === 'ONAYLANDI') {
        userMetrics[userName].approvedQuotes++;
        userMetrics[userName].approvedValue +=
          parseFloat(quote.totalPrice?.toString().replace(/[^0-9.-]+/g, '')) ||
          0;
      }
    });

    // Hesaplamaları tamamla
    Object.keys(userMetrics).forEach((user) => {
      const data = userMetrics[user];
      data.avgValue = data.totalValue / data.totalQuotes;
      data.approvalRate = (data.approvedQuotes / data.totalQuotes) * 100;
    });

    // En iyi 5 kullanıcıyı seç (onaylanan teklif değerine göre)
    const topUsers = Object.entries(userMetrics)
      .sort((a, b) => b[1].approvedValue - a[1].approvedValue)
      .slice(0, 5)
      .map(([user]) => user);

    // Radar grafiği için veri hazırla
    const labels = [
      'Toplam Teklif Sayısı',
      'Onaylanan Teklif Sayısı',
      'Toplam Teklif Değeri ($)',
      'Onay Oranı (%)',
      'Ortalama Teklif Değeri ($)',
    ];

    // Her kullanıcı için verileri hazırla
    const datasets = topUsers.map((user, index) => {
      // Renk paleti
      const colors = [
        { main: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.2)' }, // Kırmızı
        { main: 'rgb(255, 206, 86)', bg: 'rgba(255, 206, 86, 0.2)' }, // Sarı
        { main: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.2)' }, // Mavi
        { main: 'rgb(75, 192, 192)', bg: 'rgba(75, 192, 192, 0.2)' }, // Turkuaz
        { main: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.2)' }, // Mor
      ];

      const color = colors[index % colors.length];
      const userData = userMetrics[user];

      // Normalize etme fonksiyonu
      const normalize = (value, max) => Math.min(100, (value / max) * 100);

      // Maksimum değerleri hesapla (en büyük değer 100% olacak)
      const maxValues = {
        totalQuotes: Math.max(
          ...Object.values(userMetrics).map((d) => d.totalQuotes)
        ),
        approvedQuotes: Math.max(
          ...Object.values(userMetrics).map((d) => d.approvedQuotes)
        ),
        totalValue: Math.max(
          ...Object.values(userMetrics).map((d) => d.totalValue)
        ),
        approvalRate: 100, // Zaten yüzde
        avgValue: Math.max(
          ...Object.values(userMetrics).map((d) => d.avgValue)
        ),
      };

      // Normalize edilmiş değerler
      const normalizedData = [
        normalize(userData.totalQuotes, maxValues.totalQuotes),
        normalize(userData.approvedQuotes, maxValues.approvedQuotes),
        normalize(userData.totalValue, maxValues.totalValue),
        normalize(userData.approvalRate, maxValues.approvalRate),
        normalize(userData.avgValue, maxValues.avgValue),
      ];

      return {
        label: user,
        data: normalizedData,
        fill: true,
        backgroundColor: color.bg,
        borderColor: color.main,
        pointBackgroundColor: color.main,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: color.main,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    // Radar grafiği oluştur
    const chartColorsRadar = getChartThemeColors();
    this.userPerformanceRadarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            min: 0,
            max: 100,
            ticks: {
              display: false,
              stepSize: 20,
            },
            pointLabels: {
              color: chartColorsRadar.text,
              font: {
                size: 12,
              },
            },
            grid: {
              color: chartColorsRadar.grid,
            },
            angleLines: {
              color: chartColorsRadar.grid,
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: chartColorsRadar.text,
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function (context) {
                const metricName = context.chart.data.labels[context.dataIndex];
                const userName = context.dataset.label;
                const userData = userMetrics[userName];
                let value;

                switch (context.dataIndex) {
                  case 0: // Toplam Teklif Sayısı
                    value = userData.totalQuotes;
                    return `${metricName}: ${value}`;
                  case 1: // Onaylanan Teklif Sayısı
                    value = userData.approvedQuotes;
                    return `${metricName}: ${value}`;
                  case 2: // Toplam Teklif Değeri
                    value = userData.totalValue.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    return `${metricName}: ${value}`;
                  case 3: // Onay Oranı
                    value = `${userData.approvalRate.toFixed(1)}%`;
                    return `${metricName}: ${value}`;
                  case 4: // Ortalama Teklif Değeri
                    value = userData.avgValue.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    return `${metricName}: ${value}`;
                  default:
                    return '';
                }
              },
            },
          },
        },
      },
    });
  }

  // Aylık performans karşılaştırma grafiği
  updateMonthlyComparisonChart(quotes) {
    const ctx = document.getElementById('monthlyComparisonChart');
    if (!ctx) {
      console.warn(
        'Aylık performans karşılaştırma grafiği için canvas bulunamadı'
      );
      return;
    }

    if (this.monthlyComparisonChart) {
      this.monthlyComparisonChart.destroy();
    }

    // Son 6 ayı al
    const currentDate = new Date();
    const months = [];
    const monthlyData = {
      totalQuotes: [],
      approvedQuotes: [],
      rejectedQuotes: [],
      totalValue: [],
      approvedValue: [],
      avgValue: [],
    };

    // Son 6 ay için veri hazırla
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthName = targetDate.toLocaleString('en-US', { month: 'short' });
      months.push(monthName);

      // Bu ay için teklifleri filtrele
      const monthlyQuotes = quotes.filter((quote) => {
        const dateParts = quote.date.split(/[-\.]/);
        let quoteDate =
          dateParts[0].length === 4
            ? new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              )
            : new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0])
              );

        return (
          quoteDate.getMonth() === targetDate.getMonth() &&
          quoteDate.getFullYear() === targetDate.getFullYear()
        );
      });

      // Bu ay için metrikleri hesapla
      const approvedQuotes = monthlyQuotes.filter(
        (q) => q.status === 'ONAYLANDI'
      );
      const rejectedQuotes = monthlyQuotes.filter(
        (q) => q.status === 'REDDEDILDI'
      );

      const totalAmount = monthlyQuotes.reduce((sum, q) => {
        const price =
          parseFloat(q.totalPrice?.toString().replace(/[^0-9.-]+/g, '')) || 0;
        return sum + price;
      }, 0);

      const approvedAmount = approvedQuotes.reduce((sum, q) => {
        const price =
          parseFloat(q.totalPrice?.toString().replace(/[^0-9.-]+/g, '')) || 0;
        return sum + price;
      }, 0);

      const avgAmount =
        monthlyQuotes.length > 0 ? totalAmount / monthlyQuotes.length : 0;

      // Metrikleri ekle
      monthlyData.totalQuotes.push(monthlyQuotes.length);
      monthlyData.approvedQuotes.push(approvedQuotes.length);
      monthlyData.rejectedQuotes.push(rejectedQuotes.length);
      monthlyData.totalValue.push(totalAmount);
      monthlyData.approvedValue.push(approvedAmount);
      monthlyData.avgValue.push(avgAmount);
    }

    // Çoklu bar grafik oluştur
    const chartColorsBar = getChartThemeColors();
    this.monthlyComparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Toplam Teklif',
            data: monthlyData.totalQuotes,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
            order: 1,
          },
          {
            label: 'Onaylanan Teklif',
            data: monthlyData.approvedQuotes,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1,
            order: 2,
          },
          {
            label: 'Reddedilen Teklif',
            data: monthlyData.rejectedQuotes,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1,
            order: 3,
          },
          {
            label: 'Ortalama Teklif Değeri',
            data: monthlyData.avgValue,
            type: 'line',
            borderColor: 'rgb(255, 159, 64)',
            backgroundColor: 'rgba(255, 159, 64, 0.5)',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: 'rgb(255, 159, 64)',
            yAxisID: 'y1',
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Teklif Sayısı',
              color: chartColorsBar.text,
            },
            ticks: {
              precision: 0,
              color: chartColorsBar.text,
            },
            grid: {
              color: chartColorsBar.grid,
            },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Ortalama Değer ($)',
              color: chartColorsBar.text,
            },
            ticks: {
              callback: (value) =>
                `$${value.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`,
              color: chartColorsBar.text,
            },
            grid: {
              display: false,
            },
          },
          x: {
            ticks: {
              color: chartColorsBar.text,
            },
            grid: {
              color: chartColorsBar.grid,
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: chartColorsBar.text,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label;
                const value = context.raw;

                if (label === 'Ortalama Teklif Değeri') {
                  return `${label}: $${value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                }

                return `${label}: ${value}`;
              },
            },
          },
          title: {
            display: true,
            text: 'Aylık Teklif Performansı',
            color: chartColorsBar.text,
            font: {
              size: 16,
            },
          },
        },
      },
    });
  }

  /** Müşteri ülkesine göre teklif tutarı — Leaflet haritasına taşındı, bu fonksiyon atlanıyor */
  updateCustomerCountryDistributionChart(quotes) {
    // Bu grafik dashboard-widgets.js içinde Leaflet haritası olarak render ediliyor
    // Canvas yerine <div id="customerCountryDistributionChart"> kullanılıyor
    return;

    const byCountry = {};
    quotes.forEach((quote) => {
      const raw =
        quote.customer_country ||
        quote.customerCountry ||
        (quote.customer && quote.customer.country);
      const country = (raw && String(raw).trim()) || 'Belirtilmedi';
      const price =
        parseFloat(
          String(quote.total_price ?? quote.totalPrice ?? 0).replace(
            /[^0-9.-]+/g,
            ''
          )
        ) || 0;
      if (!byCountry[country]) byCountry[country] = { count: 0, value: 0 };
      byCountry[country].count += 1;
      byCountry[country].value += price;
    });

    const entries = Object.entries(byCountry).sort((a, b) => b[1].value - a[1].value);
    const labels = entries.map(([c]) => c);
    const data = entries.map(([, v]) => v.value);
    const chartColors = getChartThemeColors();

    this.customerCountryDistributionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Teklif tutarı (birim: para)',
            data,
            backgroundColor: entries.map(
              (_, i) => `hsl(${(i * 47) % 360}, 55%, 48%)`
            ),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            ticks: { color: chartColors.text },
            grid: { color: chartColors.grid },
          },
          y: {
            ticks: { color: chartColors.text },
            grid: { color: chartColors.grid },
          },
        },
        plugins: {
          legend: {
            labels: { color: chartColors.text },
          },
          tooltip: {
            callbacks: {
              afterLabel: (item) => {
                const c = entries[item.dataIndex][0];
                const { count } = byCountry[c];
                return `Teklif adedi: ${count}`;
              },
            },
          },
        },
      },
    });
  }

  updateMonthlyTrendChart(quotes) {
    // İki olası ID'yi de kontrol et
    let ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) {
      ctx = document.getElementById('quotesTrendChart');
      if (!ctx) {
        console.warn('Aylık teklif trendi grafiği için canvas bulunamadı');
        return;
      }
    }

    // Eğer canvas görünür değilse, onu görünür yap
    ctx.style.display = 'block';

    // Canvas boyutlarını düzgün ayarla
    const container = ctx.parentElement;
    if (container) {
      ctx.width = container.clientWidth;
      ctx.height = container.clientHeight || 300;
    }

    if (this.monthlyTrendChart) {
      try {
        this.monthlyTrendChart.destroy();
        this.monthlyTrendChart = null;
      } catch (error) {
        console.error('Chart destroy hatası:', error);
      }
    }

    // Son 6 ayın verilerini hazırla
    const monthlyData = [];
    const currentDate = new Date();

    // Debug için tüm tarihleri kontrol et
    console.log(
      'Tarih Kontrolü:',
      quotes.map((q) => ({
        teklifNo: q.number,
        hamTarih: q.date,
        işlenenTarih: new Date(q.date),
        ay: new Date(q.date).getMonth() + 1,
        yıl: new Date(q.date).getFullYear(),
      }))
    );

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthName = targetDate.toLocaleString('tr-TR', { month: 'long' });

      const monthlyQuotes = quotes.filter((quote) => {
        try {
          // Tarih string'ini parçalara ayır (format: YYYY-MM-DD veya DD.MM.YYYY)
          const dateParts = quote.date.split(/[-\.]/);
          let quoteDate;

          // Tarih formatını kontrol et ve uygun şekilde parse et
          if (dateParts[0].length === 4) {
            // YYYY-MM-DD formatı
            quoteDate = new Date(
              parseInt(dateParts[0]), // Yıl
              parseInt(dateParts[1]) - 1, // Ay (0-11)
              parseInt(dateParts[2]) // Gün
            );
          } else {
            // DD.MM.YYYY formatı
            quoteDate = new Date(
              parseInt(dateParts[2]), // Yıl
              parseInt(dateParts[1]) - 1, // Ay (0-11)
              parseInt(dateParts[0]) // Gün
            );
          }

          return (
            quoteDate.getMonth() === targetDate.getMonth() &&
            quoteDate.getFullYear() === targetDate.getFullYear()
          );
        } catch (error) {
          console.warn('Tarih parse hatası:', quote.date, error);
          return false;
        }
      });

      const totalAmount = monthlyQuotes.reduce((sum, quote) => {
        const price = quote.totalPrice
          ? parseFloat(quote.totalPrice.toString().replace(/[^0-9.-]+/g, ''))
          : 0;
        return sum + price;
      }, 0);

      const approvedAmount = monthlyQuotes
        .filter((quote) => quote.status === 'ONAYLANDI')
        .reduce((sum, quote) => {
          const price = quote.totalPrice
            ? parseFloat(quote.totalPrice.toString().replace(/[^0-9.-]+/g, ''))
            : 0;
          return sum + price;
        }, 0);

      monthlyData.push({
        month: monthName,
        quoteCount: monthlyQuotes.length,
        totalAmount: totalAmount,
        approvedAmount: approvedAmount,
        quotes: monthlyQuotes.map((q) => q.number), // Debug için teklif numaralarını ekle
      });
    }

    // Debug için aylık verileri göster
    console.log('Aylık Veriler:', monthlyData);

    try {
      const chartColorsTrend = getChartThemeColors();
      // Yeni grafiği oluştur
      this.monthlyTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthlyData.map((data) => data.month),
          datasets: [
            {
              label: 'Toplam Teklif Tutarı',
              data: monthlyData.map((data) => data.totalAmount),
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
              yAxisID: 'y1',
            },
            {
              label: 'Onaylanan Tutar',
              data: monthlyData.map((data) => data.approvedAmount),
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
              yAxisID: 'y1',
            },
            {
              label: 'Teklif Sayısı',
              data: monthlyData.map((data) => data.quoteCount),
              type: 'line',
              borderColor: 'rgba(255, 159, 64, 1)',
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
              borderWidth: 2,
              fill: false,
              yAxisID: 'y2',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            y1: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Tutar ($)',
                color: chartColorsTrend.text,
              },
              ticks: {
                callback: (value) =>
                  `$${value.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}`,
                color: chartColorsTrend.text,
              },
              grid: {
                color: chartColorsTrend.grid,
              },
            },
            y2: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Teklif Sayısı',
                color: chartColorsTrend.text,
              },
              ticks: {
                stepSize: 1,
                color: chartColorsTrend.text,
              },
              grid: {
                display: false,
              },
            },
            x: {
              ticks: {
                color: chartColorsTrend.text,
              },
              grid: {
                color: chartColorsTrend.grid,
              },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: chartColorsTrend.text,
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  if (context.dataset.yAxisID === 'y1') {
                    const value = context.raw.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    return `${context.dataset.label}: $${value}`;
                  } else {
                    return `${context.dataset.label}: ${context.raw}`;
                  }
                },
              },
            },
          },
        },
      });

      console.log('Aylık teklif trendi grafiği başarıyla oluşturuldu');
    } catch (error) {
      console.error('Grafik oluşturma hatası:', error);
    }
  }

  updateUserPerformanceChart(quotes) {
    const ctx = document.getElementById('userPerformanceChart');
    if (!ctx) {
      console.warn('Kullanıcı performansı grafiği için canvas bulunamadı');
      return;
    }

    // Mevcut grafiği temizle
    if (this.userPerformanceChart) {
      this.userPerformanceChart.destroy();
    }

    // Kullanıcı bazında verileri hazırla
    const userStats = {};
    quotes.forEach((quote) => {
      // Kullanıcı adını doğru şekilde al
      let userName;

      // Öncelik sırası: prepared_by_name -> Kullanıcı adı çözümleme -> prepared_by
      if (quote.prepared_by_name) {
        userName = quote.prepared_by_name;
      } else if (quote.prepared_by && !isNaN(parseInt(quote.prepared_by))) {
        // prepared_by bir ID ise, kullanıcı adını getir
        const userId = parseInt(quote.prepared_by);
        userName = this.getUserNameById(userId);
      } else {
        userName = quote.prepared_by || 'Bilinmiyor';
      }

      const price = parseFloat(
        quote.totalPrice?.toString().replace(/[^0-9.-]+/g, '') || 0
      );

      if (!userStats[userName]) {
        userStats[userName] = {
          totalAmount: 0,
          approvedAmount: 0,
          pendingAmount: 0,
        };
      }

      userStats[userName].totalAmount += price;
      if (quote.status === 'ONAYLANDI') {
        userStats[userName].approvedAmount += price;
      } else {
        userStats[userName].pendingAmount += price;
      }
    });

    // Kullanıcıları performansa göre sırala
    const sortedUsers = Object.entries(userStats)
      .sort((a, b) => b[1].approvedAmount - a[1].approvedAmount)
      .map(([user]) => user);

    const data = {
      labels: sortedUsers,
      datasets: [
        {
          label: 'Toplam Teklif Tutarı',
          data: sortedUsers.map((user) => userStats[user].totalAmount),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Onaylanan Tutar',
          data: sortedUsers.map((user) => userStats[user].approvedAmount),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Bekleyen Tutar',
          data: sortedUsers.map((user) => userStats[user].pendingAmount),
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        },
      ],
    };

    // Yeni grafiği oluştur
    const chartColorsPerf = getChartThemeColors();
    this.userPerformanceChart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) =>
                `$${value.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
              color: chartColorsPerf.text,
            },
            grid: {
              color: chartColorsPerf.grid,
            },
          },
          x: {
            ticks: {
              color: chartColorsPerf.text,
            },
            grid: {
              color: chartColorsPerf.grid,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: chartColorsPerf.text,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                return `${context.dataset.label}: $${value}`;
              },
            },
          },
        },
      },
    });
  }

  updateUserMonthlyTrendChart(quotes) {
    const ctx = document.getElementById('userMonthlyTrendChart');
    if (!ctx) {
      console.warn('Kullanıcı aylık trend grafiği için canvas bulunamadı');
      return;
    }

    if (this.userMonthlyTrendChart) {
      this.userMonthlyTrendChart.destroy();
    }

    // Son 6 ayın verilerini hazırla
    const currentDate = new Date();
    const months = [];
    const userStats = {};

    // Renk paleti tanımla (her kullanıcı için bir ana renk)
    const colorPalette = [
      { main: 'rgb(53, 162, 235)', light: 'rgba(53, 162, 235, 0.2)' }, // Mavi
      { main: 'rgb(75, 192, 192)', light: 'rgba(75, 192, 192, 0.2)' }, // Turkuaz
      { main: 'rgb(255, 159, 64)', light: 'rgba(255, 159, 64, 0.2)' }, // Turuncu
      { main: 'rgb(153, 102, 255)', light: 'rgba(153, 102, 255, 0.2)' }, // Mor
      { main: 'rgb(255, 99, 132)', light: 'rgba(255, 99, 132, 0.2)' }, // Pembe
    ];

    // Son 6 ay için ayları hazırla
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthName = targetDate.toLocaleString('tr-TR', { month: 'short' });
      months.push(monthName);

      // Her kullanıcının verilerini topla
      quotes.forEach((quote) => {
        // Kullanıcı adını doğru şekilde al
        let userName;

        // Öncelik sırası: prepared_by_name -> Kullanıcı adı çözümleme -> prepared_by
        if (quote.prepared_by_name) {
          userName = quote.prepared_by_name;
        } else if (quote.prepared_by && !isNaN(parseInt(quote.prepared_by))) {
          // prepared_by bir ID ise, kullanıcı adını getir
          const userId = parseInt(quote.prepared_by);
          userName = this.getUserNameById(userId);
        } else {
          userName = quote.prepared_by || 'Bilinmiyor';
        }

        if (!userStats[userName]) {
          userStats[userName] = {
            total: Array(6).fill(0),
            approved: Array(6).fill(0),
            sum: 0,
          };
        }

        // Tarihi kontrol et
        const dateParts = quote.date.split(/[-\.]/);
        let quoteDate =
          dateParts[0].length === 4
            ? new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              )
            : new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0])
              );

        if (
          quoteDate.getMonth() === targetDate.getMonth() &&
          quoteDate.getFullYear() === targetDate.getFullYear()
        ) {
          const amount =
            parseFloat(
              quote.totalPrice?.toString().replace(/[^0-9.-]+/g, '')
            ) || 0;
          userStats[userName].total[5 - i] += amount;
          userStats[userName].sum += amount;

          if (quote.status === 'ONAYLANDI') {
            userStats[userName].approved[5 - i] += amount;
          }
        }
      });
    }

    // En iyi 5 kullanıcıyı seç
    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1].sum - a[1].sum)
      .slice(0, 5)
      .map(([user]) => user);

    // Grafik verilerini oluştur
    const datasets = topUsers.map((user, index) => ({
      label: user,
      data: userStats[user].total,
      borderColor: colorPalette[index].main,
      backgroundColor: colorPalette[index].light,
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      approvedData: userStats[user].approved,
      pointRadius: 4, // Nokta boyutunu ayarla
      pointHoverRadius: 6, // Hover durumunda nokta boyutu
      pointBackgroundColor: '#fff', // Nokta iç rengi
    }));

    // Grafiği oluştur
    const chartColorsUserTrend = getChartThemeColors();
    this.userMonthlyTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Teklif Tutarı ($)',
              color: chartColorsUserTrend.text,
            },
            ticks: {
              callback: (value) => `$${value.toLocaleString('en-US')}`,
              color: chartColorsUserTrend.text,
            },
            grid: {
              color: chartColorsUserTrend.grid,
            },
          },
          x: {
            ticks: { color: chartColorsUserTrend.text },
            grid: { color: chartColorsUserTrend.grid },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: chartColorsUserTrend.text },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.raw.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const approved = context.dataset.approvedData[
                  context.dataIndex
                ].toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                return [
                  `${context.dataset.label}`,
                  `Toplam: $${total}`,
                  `Onaylanan: $${approved}`,
                ];
              },
            },
          },
        },
      },
    });
  }

  updateUserPerformance(quotes) {
    const tbody = document.getElementById('userPerformanceBody');
    if (!tbody || !quotes) return;

    tbody.innerHTML = '';
    const userStats = {};

    quotes.forEach((quote) => {
      // Kullanıcı adını doğru şekilde al
      let userName;

      // Öncelik sırası: prepared_by_name -> Kullanıcı adı çözümleme -> prepared_by
      if (quote.prepared_by_name) {
        userName = quote.prepared_by_name;
      } else if (quote.prepared_by && !isNaN(parseInt(quote.prepared_by))) {
        // prepared_by bir ID ise, kullanıcı adını getir
        const userId = parseInt(quote.prepared_by);
        userName = this.getUserNameById(userId);
      } else {
        userName = quote.prepared_by || 'Bilinmiyor';
      }

      if (!userStats[userName]) {
        userStats[userName] = {
          total: 0,
          approved: 0,
          pending: 0,
          totalValue: 0,
          approvedValue: 0,
          pendingValue: 0,
        };
      }

      userStats[userName].total++;

      // Toplam değeri hesapla
      const price = quote.totalPrice || quote.total_price || '0';
      const value = parseFloat(price.toString().replace(/[^0-9.-]+/g, ''));

      if (quote.status === 'ONAYLANDI') {
        userStats[userName].approved++;
        userStats[userName].approvedValue += value || 0;
      } else {
        userStats[userName].pending++;
        userStats[userName].pendingValue += value || 0;
      }

      userStats[userName].totalValue += value || 0;
    });

    // Her kullanıcı için satır oluştur
    Object.entries(userStats).forEach(([userName, stats]) => {
      const row = document.createElement('tr');
      const successRate = ((stats.approved / stats.total) * 100).toFixed(1);

      row.innerHTML = `
                <td>${userName}</td>
                <td>${stats.total}</td>
                <td>${stats.approved}</td>
                <td>${stats.pending}</td>
                <td>${successRate}%</td>
                <td>
                    <div class="value-details">
                        <span class="total-value">$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <div class="value-breakdown">
                            <span class="approved-value">Onaylanan: $${stats.approvedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span class="pending-value">Bekleyen: $${stats.pendingValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </td>
            `;

      tbody.appendChild(row);
    });

    // Debug için toplam istatistikleri göster
    console.log('Kullanıcı İstatistikleri:', userStats);
  }

  updateTargetTrackingChart(quotes) {
    const ctx = document.getElementById('targetTrackingChart');
    if (!ctx) {
      console.warn('Hedef takibi grafiği için canvas bulunamadı');
      return;
    }

    // Canvas konteynerini iyileştir
    const chartContainer = ctx.parentElement;
    if (chartContainer) {
      chartContainer.style.minHeight = '400px';
      chartContainer.style.height = '400px';
      chartContainer.style.marginBottom = '20px';
    }

    // Canvas özelliklerini ayarla
    ctx.height = 300;
    ctx.style.maxHeight = '100%';

    if (this.targetTrackingChart) {
      this.targetTrackingChart.destroy();
    }

    // Yıllık hedefi localStorage'dan al veya varsayılan değer kullan
    let yearlyTarget =
      parseFloat(localStorage.getItem('yearlyTarget')) || 1000000;
    const monthlyTarget = yearlyTarget / 12;

    // Aylık verileri hesapla
    const currentDate = new Date();
    const monthlyData = [];
    let yearlyTotal = 0;
    let cumulativeTarget = 0; // Kümülatif hedef
    let cumulativeAmount = 0; // Kümülatif gerçekleşen

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(currentDate.getFullYear(), i, 1);
      const monthName = targetDate.toLocaleString('tr-TR', { month: 'long' });

      // Kümülatif hedefi artır
      cumulativeTarget += monthlyTarget;

      const monthlyQuotes = quotes.filter((quote) => {
        const dateParts = quote.date.split(/[-\.]/);
        let quoteDate =
          dateParts[0].length === 4
            ? new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              )
            : new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0])
              );

        return (
          quoteDate.getMonth() <= i && // Kümülatif için <= kullanıyoruz
          quoteDate.getFullYear() === currentDate.getFullYear() &&
          quote.status === 'ONAYLANDI'
        );
      });

      const monthlyAmount = monthlyQuotes.reduce((sum, quote) => {
        const price =
          parseFloat(quote.totalPrice?.toString().replace(/[^0-9.-]+/g, '')) ||
          0;
        return sum + price;
      }, 0);

      yearlyTotal = monthlyAmount; // Toplam gerçekleşen

      monthlyData.push({
        month: monthName,
        amount: yearlyTotal, // Kümülatif gerçekleşen
        target: cumulativeTarget, // Kümülatif hedef
      });
    }

    // Yıllık hedef durumu
    const yearProgress = (yearlyTotal / yearlyTarget) * 100;

    // Grafiği oluştur
    const chartColorsTarget = getChartThemeColors();
    this.targetTrackingChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthlyData.map((d) => d.month),
        datasets: [
          {
            label: 'Kümülatif Gerçekleşen',
            data: monthlyData.map((d) => d.amount),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          },
          {
            label: 'Kümülatif Hedef',
            data: monthlyData.map((d) => d.target),
            borderColor: 'rgba(255, 99, 132, 0.8)',
            borderDash: [5, 5],
            fill: false,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Kümülatif Tutar ($)',
              color: chartColorsTarget.text,
              padding: { top: 10, bottom: 10 },
            },
            ticks: {
              callback: (value) => `$${value.toLocaleString('en-US')}`,
              color: chartColorsTarget.text,
              padding: 5,
            },
            grid: {
              color: chartColorsTarget.grid,
            },
          },
          x: {
            ticks: {
              color: chartColorsTarget.text,
              maxRotation: 45,
              minRotation: 45,
            },
            grid: { color: chartColorsTarget.grid },
          },
        },
        layout: {
          padding: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: chartColorsTarget.text,
              padding: 10,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const monthIndex = context.dataIndex;
                const monthlyTargetValue = monthlyTarget.toLocaleString(
                  'en-US',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                );

                if (context.dataset.label === 'Kümülatif Hedef') {
                  return [
                    `${context.dataset.label}: $${value}`,
                    `Aylık Hedef: $${monthlyTargetValue}`,
                  ];
                }
                return `${context.dataset.label}: $${value}`;
              },
            },
          },
        },
      },
    });

    // Hedef bilgilerini göster
    const headerDiv = document.createElement('div');
    headerDiv.className = 'target-info';
    headerDiv.innerHTML = `
            <div class="target-stat">
                <span>Yıllık Hedef:</span>
                <strong>$${yearlyTarget.toLocaleString('en-US')}</strong>
            </div>
            <div class="target-stat">
                <span>Aylık Hedef:</span>
                <strong>$${monthlyTarget.toLocaleString('en-US')}</strong>
            </div>
            <div class="target-stat">
                <span>Gerçekleşen:</span>
                <strong>$${yearlyTotal.toLocaleString('en-US')} (%${yearProgress.toFixed(1)})</strong>
            </div>
        `;

    // Mevcut hedef bilgisi div'ini temizle ve yenisini ekle
    const existingInfo = document.querySelector('.target-info');
    if (existingInfo) {
      existingInfo.remove();
    }

    // Chart header'ı bul ve yoksa oluştur
    let chartHeader = document.querySelector('.chart-header');
    if (!chartHeader) {
      chartHeader = document.createElement('div');
      chartHeader.className = 'chart-header';
      chartHeader.innerHTML = '<h3>Hedef Takibi</h3>';
      if (chartContainer && chartContainer.parentElement) {
        chartContainer.parentElement.insertBefore(chartHeader, chartContainer);
      }
    }

    chartHeader.after(headerDiv);

    // Input'a mevcut hedefi yaz
    const input = document.getElementById('yearlyTargetInput');
    if (input) {
      input.value = yearlyTarget.toLocaleString('en-US', {
        maximumFractionDigits: 0,
      });
    }

    // Hedef güncelleme olayını dinle
    const updateButton = document.getElementById('updateTargetBtn');
    if (updateButton) {
      updateButton.replaceWith(updateButton.cloneNode(true));
      document
        .getElementById('updateTargetBtn')
        .addEventListener('click', () => {
          const input = document.getElementById('yearlyTargetInput');
          const newTarget = parseFloat(input.value.replace(/,/g, ''));
          if (newTarget > 0) {
            localStorage.setItem('yearlyTarget', newTarget);
            this.updateTargetTrackingChart(quotes);
          } else {
            alert('Lütfen geçerli bir hedef tutarı girin');
          }
        });
    }
  }

  bindEvents() {
    console.log('Event listeners ekleniyor...');

    // Filter-specific event handlers
    this.setupFilterEventHandlers();

    // Main tab navigation event listeners - tekrar eklemeyi önle
    if (!this.tabEventsAttached) {
      console.log('Tab event listeners ekleniyor...');
      document.querySelectorAll('.tab-button').forEach((button) => {
        button.addEventListener('click', () => {
          const tabId = button.getAttribute('data-tab');
          document
            .querySelectorAll('.tab-button')
            .forEach((b) => b.classList.remove('active'));
          button.classList.add('active');
          document
            .querySelectorAll('.tab-content')
            .forEach((content) => content.classList.remove('active'));
          document.getElementById(`${tabId}-content`)?.classList.add('active');
        });
      });
      this.tabEventsAttached = true;
    }

    // Teklif sayfasındaki butonlar için global click handler ekle
    document.addEventListener('click', (event) => {
      const target = event.target;

      // Button or parent of icon is button
      const button = target.closest('[data-action]');
      if (!button) return;

      const action = button.dataset.action;
      const quoteId = parseInt(button.dataset.id);

      if (!quoteId || isNaN(quoteId)) {
        console.warn('Geçersiz teklif ID:', button.dataset.id);
        return;
      }

      console.log(`Teklif işlemi: ${action}, ID: ${quoteId}`);

      switch (action) {
        case 'approve':
          this.handleApprove(quoteId);
          break;
        case 'reject':
          this.handleReject(quoteId);
          break;
        case 'revert':
          this.handleRevert(quoteId);
          break;
        case 'delete':
          this.handleDelete(quoteId);
          break;
        case 'revise':
          const quote = this.allQuotes.find((q) => q.id === quoteId);
          if (quote) this.showRevisionModal(quote);
          break;
        case 'edit-cost':
          const quoteForCost = this.allQuotes.find((q) => q.id === quoteId);
          if (quoteForCost) this.showCostEditModal(quoteForCost);
          break;
        default:
          console.warn('Bilinmeyen işlem:', action);
      }
    });

    console.log('Olay dinleyicileri eklendi');
  }

  // Aylık trend grafiği
  initializeCharts() {
    // Tüm chart canvaslerini güvenli bir şekilde kontrol et
    console.log('Grafikler başlatılıyor...');

    // monthlyTrendChart
    const monthlyTrendCanvas =
      document.getElementById('monthlyTrendChart') ||
      document.getElementById('quotesTrendChart');
    if (monthlyTrendCanvas) {
      this.monthlyTrendChart = new Chart(monthlyTrendCanvas, {
        type: 'line',
        data: {
          labels: this.getLastNMonths(6),
          datasets: [
            {
              label: 'Aylık Teklif Toplamı',
              data: [0, 0, 0, 0, 0, 0], // Başlangıç için boş veriler
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Aylık Teklif Trendi',
            },
          },
        },
      });
      console.log('monthlyTrendChart başarıyla oluşturuldu');
    } else {
      console.warn('monthlyTrendChart canvas bulunamadı');
    }

    // userPerformanceChart
    const userPerformanceCanvas = document.getElementById(
      'userPerformanceChart'
    );
    if (userPerformanceCanvas) {
      this.userPerformanceChart = new Chart(userPerformanceCanvas, {
        type: 'bar',
        data: {
          labels: ['Kullanıcılar'],
          datasets: [
            {
              label: 'Onaylanan Teklifler',
              data: [0],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Kullanıcı Performansları',
            },
          },
        },
      });
      console.log('userPerformanceChart başarıyla oluşturuldu');
    } else {
      console.warn('userPerformanceChart canvas bulunamadı');
    }

    // Diğer grafikleri kontrol et ve oluştur
    this.initializeQuoteStatusChart();
    this.initializeUserPerformanceRadarChart();
    this.initializeMonthlyComparisonChart();
    this.initializeUserMonthlyTrendChart();
    this.initializeTargetTrackingChart();
  }

  // Status dağılım grafiği
  initializeQuoteStatusChart() {
    const statusCanvas =
      document.getElementById('quoteStatusDistributionChart') ||
      document.getElementById('statusDistributionChart');
    if (!statusCanvas) {
      console.warn('quoteStatusDistributionChart canvas bulunamadı');
      return;
    }

    // Check for existing chart on this canvas and destroy it
    const existingChart = Chart.getChart(statusCanvas);
    if (existingChart) {
      console.log('Destroying existing status distribution chart');
      existingChart.destroy();
    }

    this.quoteStatusDistributionChart = new Chart(statusCanvas, {
      type: 'pie',
      data: {
        labels: ['Hazırlandı', 'Onaylandı', 'Reddedildi'],
        datasets: [
          {
            label: 'Teklif Sayısı',
            data: [0, 0, 0],
            backgroundColor: [
              'rgba(54, 162, 235, 0.7)',
              'rgba(75, 192, 192, 0.7)',
              'rgba(255, 99, 132, 0.7)',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Teklif Durumu Dağılımı',
          },
        },
      },
    });
    console.log('quoteStatusDistributionChart başarıyla oluşturuldu');
  }

  // Kullanıcı performans radar grafiği
  initializeUserPerformanceRadarChart() {
    const radarCanvas = document.getElementById('userPerformanceRadarChart');
    if (radarCanvas) {
      this.userPerformanceRadarChart = new Chart(radarCanvas, {
        type: 'radar',
        data: {
          labels: [
            'Toplam Teklif Sayısı',
            'Onaylanan Teklif Sayısı',
            'Ortalama Teklif Değeri ($)',
            'Onay Oranı (%)',
            'Toplam Teklif Değeri ($)',
          ],
          datasets: [
            {
              label: 'Örnek Kullanıcı',
              data: [0, 0, 0, 0, 0],
              fill: true,
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgb(54, 162, 235)',
              pointBackgroundColor: 'rgb(54, 162, 235)',
              pointBorderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Kullanıcı Performans Karşılaştırması',
            },
          },
        },
      });
      console.log('userPerformanceRadarChart başarıyla oluşturuldu');
    } else {
      console.warn('userPerformanceRadarChart canvas bulunamadı');
    }
  }

  // Aylık karşılaştırma grafiği
  initializeMonthlyComparisonChart() {
    const comparisonCanvas = document.getElementById('monthlyComparisonChart');
    if (comparisonCanvas) {
      this.monthlyComparisonChart = new Chart(comparisonCanvas, {
        type: 'bar',
        data: {
          labels: this.getLastNMonths(6),
          datasets: [
            {
              label: 'Toplam Teklif',
              data: [0, 0, 0, 0, 0, 0],
              backgroundColor: 'rgba(54, 162, 235, 0.7)',
              order: 1,
            },
            {
              label: 'Ortalama Değer',
              data: [0, 0, 0, 0, 0, 0],
              type: 'line',
              borderColor: 'rgb(255, 159, 64)',
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
              fill: false,
              order: 0,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Aylık Teklif Performansı',
            },
          },
        },
      });
      console.log('monthlyComparisonChart başarıyla oluşturuldu');
    } else {
      console.warn('monthlyComparisonChart canvas bulunamadı');
    }
  }

  // Kullanıcı aylık trend grafiği
  initializeUserMonthlyTrendChart() {
    const trendCanvas = document.getElementById('userMonthlyTrendChart');
    if (trendCanvas) {
      this.userMonthlyTrendChart = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: this.getLastNMonths(6),
          datasets: [
            {
              label: 'Örnek Kullanıcı',
              data: [0, 0, 0, 0, 0, 0],
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Kullanıcı Aylık Trendleri',
            },
          },
        },
      });
      console.log('userMonthlyTrendChart başarıyla oluşturuldu');
    } else {
      console.warn('userMonthlyTrendChart canvas bulunamadı');
    }
  }

  // Hedef takip grafiği
  initializeTargetTrackingChart() {
    const targetCanvas = document.getElementById('targetTrackingChart');
    if (targetCanvas) {
      // Canvas ve container yüksekliğini ayarla
      targetCanvas.height = 300;
      const container = targetCanvas.parentElement;
      if (container) {
        container.style.minHeight = '400px';
        container.style.height = '400px';
      }

      this.targetTrackingChart = new Chart(targetCanvas, {
        type: 'line',
        data: {
          labels: this.getLastNMonths(12),
          datasets: [
            {
              label: 'Gerçekleşen',
              data: Array(12).fill(0),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: true,
            },
            {
              label: 'Hedef',
              data: Array(12).fill(0),
              borderColor: 'rgba(255, 99, 132, 0.8)',
              borderDash: [5, 5],
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Hedef Takibi',
            },
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10,
            },
          },
        },
      });
      console.log('targetTrackingChart başarıyla oluşturuldu');
    } else {
      console.warn('targetTrackingChart canvas bulunamadı');
    }
  }

  // Tüm filtreleri uygula - Birleştirilmiş filtre mekanizması
  applyFilters(statusParam) {
    console.log('Geliştirilmiş filtreleme mekanizması çalışıyor...');
    console.log('Status parametre değeri:', statusParam);

    // 1. Veri kontrolü
    if (!this.allQuotes || this.allQuotes.length === 0) {
      console.log('Filtrelenecek teklif yok');
      this.renderQuotesList([]);
      return;
    }

    const quoteCount = this.allQuotes.length;
    console.log(`Toplam ${quoteCount} teklif filtreleniyor...`);

    // HAM VERİ KONTROLÜ - SORUN TESPITI IÇIN DETAYLI LOGLAMA
    console.log('HAM TEKLIF VERILERI (İLK 5 TEKLIF):');
    for (let i = 0; i < Math.min(5, this.allQuotes.length); i++) {
      const q = this.allQuotes[i];
      console.log(
        `Teklif #${q.id || 'ID yok'} - Status: "${q.status || 'YOK'}" (${typeof q.status})`
      );
    }

    // Orijinal teklif listesini kopyala
    let filteredQuotes = [...this.allQuotes];

    try {
      // 2. DURUM FİLTRESİ UYGULAMA
      // Parametre varsa onu kullan, yoksa aktif butonu veya sınıf değişkenini kontrol et
      let activeStatus = statusParam;

      if (!activeStatus) {
        // Önce sınıf değişkenine bak
        if (this.activeStatusFilter && this.activeStatusFilter !== 'all') {
          activeStatus = this.activeStatusFilter;
          console.log(
            `Sınıf değişkeninden alınan filtre durumu: ${activeStatus}`
          );
        } else {
          // Yoksa DOM'dan aktif filtre butonunu bul
          const activeFilterBtn = document.querySelector('.filter-btn.active');
          activeStatus = activeFilterBtn
            ? activeFilterBtn.dataset.filter || activeFilterBtn.id
            : 'btnAll';
          console.log(`DOM'dan alınan filtre durumu: ${activeStatus}`);
        }
      } else {
        console.log(`Parametre olarak gelen filtre durumu: ${activeStatus}`);
      }

      // Durum filtrelemesi - btnAll/all dışındaki durumlarda
      if (activeStatus !== 'btnAll' && activeStatus !== 'all') {
        console.log(`${activeStatus} filtresi uygulanıyor`);

        // STANDART DURUM DEĞERLERİNE EŞLEŞTİRME
        let filterStatus = '';

        // Button/filtre değerinden aranacak durum değerini belirle
        if (activeStatus === 'btnPending' || activeStatus === 'pending') {
          filterStatus = 'HAZIRLANDI';
        } else if (
          activeStatus === 'btnApproved' ||
          activeStatus === 'approved'
        ) {
          filterStatus = 'ONAYLANDI';
        } else if (
          activeStatus === 'btnRejected' ||
          activeStatus === 'rejected'
        ) {
          filterStatus = 'REDDEDILDI';
        }

        console.log(
          `Aktif filtre (${activeStatus}) için aranacak durum: ${filterStatus}`
        );

        const beforeCount = filteredQuotes.length;

        // DURUM FİLTRELEMESİ - BASİTLEŞTİRİLMİŞ VE DAHA GÜRBÜZ YAKLAŞIM
        // Statü değerleri daha önce standartlaştırıldığı için doğrudan eşleştirme yapabiliriz
        filteredQuotes = filteredQuotes.filter((quote) => {
          // Quote ve status kontrolü
          if (!quote || !quote.status) return false;

          // Basit string karşılaştırması
          const isMatch = quote.status === filterStatus;

          if (isMatch) {
            console.log(
              `✓ Eşleşme: Teklif #${quote.id}, Durum="${quote.status}"`
            );
          }

          return isMatch;
        });

        console.log(
          `${activeStatus} filtresi sonucu: ${filteredQuotes.length}/${beforeCount} teklif kaldı`
        );
      } else {
        console.log('Tüm teklifler gösteriliyor (all/btnAll filtresi)');
      }

      // 3. ARAMA FİLTRESİ UYGULAMA
      // DOM'dan doğrudan arama değerini al
      const searchInput = document.getElementById('searchInput');
      const searchValue = searchInput
        ? searchInput.value.trim().toLowerCase()
        : '';

      if (searchValue) {
        console.log(`Arama filtreleniyor: "${searchValue}"`);

        const beforeCount = filteredQuotes.length;
        filteredQuotes = filteredQuotes.filter((quote) => {
          if (!quote) return false;

          // Aranabilecek tüm alanları birleştir
          const searchableFields = [
            quote.number,
            quote.details,
            quote.prepared_by || quote.preparedBy,
            quote.prepared_by_name,
            quote.totalPrice || quote.total_price,
            quote.status,
            quote.date,
          ];

          // Herhangi bir alan arama terimiyle eşleşiyorsa true döndür
          return searchableFields.some(
            (field) =>
              field && String(field).toLowerCase().includes(searchValue)
          );
        });

        console.log(
          `Arama filtresi sonrası: ${filteredQuotes.length}/${beforeCount} teklif`
        );
      }

      // 4. TARİH FİLTRESİ UYGULAMA
      // DOM'dan doğrudan tarih değerlerini al
      const startDateInput = document.getElementById('startDate');
      const endDateInput = document.getElementById('endDate');

      const startDateValue = startDateInput ? startDateInput.value : '';
      const endDateValue = endDateInput ? endDateInput.value : '';

      if (startDateValue && endDateValue) {
        console.log(`Tarih filtreleniyor: ${startDateValue} - ${endDateValue}`);

        // Tarih nesnelerini oluştur
        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);

        // Bitiş tarihini günün sonuna ayarla
        endDate.setHours(23, 59, 59, 999);

        const beforeCount = filteredQuotes.length;
        filteredQuotes = filteredQuotes.filter((quote) => {
          if (!quote || !quote.date) return false;

          try {
            // Farklı tarih formatlarını destekle
            let quoteDate;
            const dateStr = String(quote.date);

            if (dateStr.includes('-')) {
              // YYYY-MM-DD formatı
              quoteDate = new Date(dateStr);
            } else if (dateStr.includes('.')) {
              // DD.MM.YYYY formatı
              const parts = dateStr.split('.');
              quoteDate = new Date(
                parseInt(parts[2]), // yıl
                parseInt(parts[1]) - 1, // ay (0-11)
                parseInt(parts[0]) // gün
              );
            } else {
              // Diğer formatlar
              quoteDate = new Date(dateStr);
            }

            // Tarih geçerli mi kontrol et
            if (isNaN(quoteDate.getTime())) {
              console.warn(`Geçersiz tarih: ${dateStr}`);
              return false;
            }

            return quoteDate >= startDate && quoteDate <= endDate;
          } catch (error) {
            console.error(`Tarih dönüşüm hatası: ${quote.date}`, error);
            return false;
          }
        });

        console.log(
          `Tarih filtresi sonrası: ${filteredQuotes.length}/${beforeCount} teklif`
        );
      }

      // 5. FİLTRELENMİŞ LİSTEYİ GÖSTER
      console.log(
        `Filtreleme tamamlandı. Toplam ${filteredQuotes.length}/${quoteCount} teklif görüntülenecek.`
      );

      // Filtreleme sonucunda kalan teklifleri göster
      if (filteredQuotes.length > 0) {
        console.log(
          'Filtrelenmiş teklifler (ilk 3):',
          filteredQuotes
            .slice(0, 3)
            .map((q) => ({ id: q.id, status: q.status }))
        );
      } else {
        console.warn('⚠️ Filtreleme sonucunda hiç teklif kalmadı!');
      }

      // Filtrelenen teklifleri göster
      this.renderQuotesList(filteredQuotes);
    } catch (error) {
      console.error('Filtreleme sırasında hata oluştu:', error);
      this.renderQuotesList(this.allQuotes); // Hata durumunda tüm teklifleri göster
    }
  }

  // Filtre butonlarına tıklama olayı - applyFilters fonksiyonuna yönlendirir
  handleFilterClick(filterType, buttonElement) {
    console.log(`Filtre tıklandı: ${filterType}`);

    // Tüm butonlardan active sınıfını kaldır
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.remove('active');
    });

    // Tıklanan butona active sınıfı ekle
    buttonElement.classList.add('active');

    // Filtrelemeyi başlat - statusParam olarak filterType'ı geçir
    this.applyFilters(filterType);
  }

  // NOT: Eski filterQuotesByStatus fonksiyonu kaldırıldı
  // ve işlevselliği applyFilters fonksiyonuna taşındı

  createFilterButtons() {
    console.log('Filtre butonları oluşturuluyor...');

    // 1. quotes view bul
    const quotesView = document.getElementById('quotes');
    if (!quotesView) {
      console.error(
        'quotes view bulunamadı - filtre butonları oluşturulamıyor'
      );
      return;
    }

    // 2. Eski filtre bölümünü kaldır
    const oldFilterSection = quotesView.querySelector('.filter-section');
    if (oldFilterSection) {
      oldFilterSection.remove();
    }

    // 3. Yeni bir filtre bölümü oluştur - Daha temiz ve modern HTML
    const newFilterSection = document.createElement('div');
    newFilterSection.className = 'filter-section';

    // 4. Daha temiz bir HTML yapısı - onclick özelliği kullanmadan, event dinleyicileri kullanarak
    newFilterSection.innerHTML = `
                <div class="search-box">
                <i class="search-icon"></i>
                    <input type="text" id="searchInput" placeholder="Teklif ara (no, detay, hazırlayan...)">
                </div>
                
                <div class="filter-buttons">
                        <button class="filter-btn active" data-status="">Tümü</button>
                        <button class="filter-btn" data-status="HAZIRLANDI">✏️ Hazırlanan</button>
                        <button class="filter-btn" data-status="ONAYLANDI">✔️ Onaylanan</button>
                        <button class="filter-btn" data-status="REDDEDILDI">❌ Reddedilen</button>
                </div>
                
                <div class="date-filter">
                    <label>Başlangıç:</label>
                    <input type="date" id="startDate" class="date-input">
                    <label>Bitiş:</label>
                    <input type="date" id="endDate" class="date-input">
                </div>
                
                <button id="clearFilters" class="clear-filters">
                    <i class="material-icons">filter_alt_off</i>Filtreleri Temizle
                </button>
            `;

    // 5. Yeni filtre bölümünü ekle
    if (quotesView.firstChild) {
      quotesView.insertBefore(newFilterSection, quotesView.firstChild);
    } else {
      quotesView.appendChild(newFilterSection);
    }

    console.log('Filtre butonları oluşturuldu');

    // 6. Filter elements referanslarını sakla - Bir kez bul, birçok kez kullan
    this.filterElements = {
      // Butonlar
      btnAll: document.getElementById('btnAll'),
      btnPending: document.getElementById('btnPending'),
      btnApproved: document.getElementById('btnApproved'),
      btnRejected: document.getElementById('btnRejected'),
      clearFilters: document.getElementById('clearFilters'),

      // Input alanları
      searchInput: document.getElementById('searchInput'),
      startDate: document.getElementById('startDate'),
      endDate: document.getElementById('endDate'),
    };

    // 7. Referansları kontrol et
    const missingElements = Object.entries(this.filterElements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      console.warn(`Eksik filtre elemanları: ${missingElements.join(', ')}`);
    } else {
      console.log('Tüm filtre elemanları başarıyla bulundu');
    }
  }

  // Tüm filtre elemanlarına olay dinleyicileri ekle
  setupFilterEventListeners() {
    if (!this.filterElements) {
      console.error(
        'Filtre elemanları bulunamadı - filterElements objesi tanımlanmamış'
      );
      return;
    }

    console.log('Filtre elemanlarına olay dinleyicileri ekleniyor...');

    // Tüm butonlar için olay dinleyicileri
    Object.entries(this.filterElements).forEach(([key, element]) => {
      if (!element) return;

      // Önce klonlama ile tüm olay dinleyicilerini temizle
      const newElement = element.cloneNode(true);
      element.parentNode.replaceChild(newElement, element);

      // Elemanı güncelle
      this.filterElements[key] = newElement;

      // Eleman türüne göre olay dinleyicisi ekle
      if (key.startsWith('btn')) {
        // Filtre butonları
        newElement.addEventListener('click', (e) => {
          console.log(`Filtre butonu tıklandı: ${key}`);

          // Butonun data-filter özelliğini al
          const filterType = newElement.dataset.filter;
          console.log(`Buton data-filter değeri: ${filterType}`);

          // Tüm butonlardan active sınıfını kaldır
          document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.classList.remove('active');
          });

          // Tıklanan butona active sınıfı ekle
          newElement.classList.add('active');

          // Bu filtre türünü global olarak sakla
          this.activeStatusFilter = filterType;
          console.log(
            `Active status filter set to: ${this.activeStatusFilter}`
          );

          // Filtrelemeyi başlat - data-filter özelliğini kullan
          this.applyFilters(filterType);
        });
      } else if (key === 'clearFilters') {
        // Temizle butonu
        newElement.addEventListener('click', () => {
          console.log('Temizle butonuna tıklandı');
          this.resetFilters();
        });
      } else if (key === 'searchInput') {
        // Arama kutusu
        newElement.addEventListener('input', () => {
          this.handleSearchInput(newElement.value);
        });

        // Enter tuşu için ekstra dinleyici
        newElement.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            console.log('Enter tuşuna basıldı, filtreleme başlatılıyor');
            this.applyFilters(this.activeStatusFilter); // Aktif filtre ile çağır
          }
        });
      } else if (key === 'startDate' || key === 'endDate') {
        // Tarih girdileri
        newElement.addEventListener('change', () => {
          console.log(`Tarih değişti: ${key}`);
          this.handleDateChange();
        });
      }
    });

    console.log('Tüm filtre elemanlarına olay dinleyicileri eklendi');
  }

  // Ana sayfa yüklendiğinde, Teklif sayfasına özel hazırlık işlevi
  prepareFilteringSystem() {
    console.log('Modern filtreleme sistemi hazırlanıyor...');

    try {
      // 1. Filtre bölümünü yeniden oluştur - Eskiyi kaldırıp yenisini ekler
      this.createFilterButtons();

      // 2. Global değişkene atama - Dışarıdan erişilebilir olması için
      window._dashboardManagerInstance = this;

      // 3. Tüm butonlara doğrudan event dinleyicileri ekle - Klonlama önceki dinleyicileri siler
      this.setupFilterEventListeners();

      // 4. "Tümü" filtresini varsayılan olarak seç
      if (this.filterElements && this.filterElements.btnAll) {
        document.querySelectorAll('.filter-btn').forEach((btn) => {
          btn.classList.remove('active');
        });
        this.filterElements.btnAll.classList.add('active');
      }

      // 5. İlk yükleme için tüm teklifleri görüntüle
      console.log('İlk görüntüleme için tüm teklifler yükleniyor...');
      this.renderQuotesList(this.allQuotes);

      console.log('Modern filtreleme sistemi başarıyla hazırlandı');
    } catch (error) {
      console.error('Filtreleme sistemi hazırlanırken hata:', error);
      // Hata durumunda en azından temel görüntülemeyi yap
      this.renderQuotesList(this.allQuotes);
    }
  }

  // Tarih formatını düzenle (tablo gösterimi için)
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  // Kullanıcı bilgilerini güncelle
  updateSidebarUserInfo() {
    try {
      // Kullanıcı bilgisini tekrar kontrol et (eğer başka bir yerden güncellenmiş olabilir)
      this.initCurrentUser();

      // Kullanıcı adı ve departman bilgisini güncelle
      const userNameEl = document.getElementById('userName');
      const userRoleEl = document.getElementById('userRole');

      if (userNameEl) {
        userNameEl.textContent =
          this.currentUser.fullName ||
          this.currentUser.full_name ||
          'İsimsiz Kullanıcı';
      }

      if (userRoleEl) {
        userRoleEl.textContent =
          this.currentUser.department || 'Departman Belirtilmedi';
      }

      // Avatar için kullanıcının baş harflerini kullan
      const avatarContainer = document.querySelector('.avatar-initials');
      if (avatarContainer) {
        const fullName =
          this.currentUser.fullName || this.currentUser.full_name || '';
        const initials = fullName
          .split(' ')
          .map((name) => name[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
        avatarContainer.textContent = initials;
      }

      // Diğer DOM elementlerini de güncelle
      document.querySelectorAll('.prepared-by').forEach((element) => {
        if (element.textContent === 'Bilinmeyen Kullanıcı') {
          element.textContent =
            this.currentUser.fullName ||
            this.currentUser.full_name ||
            'Bilinmeyen Kullanıcı';
        }
      });
    } catch (error) {
      console.error('Kullanıcı bilgisi güncellenirken hata:', error);
    }
  }

  initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        // Aktif tab'ı değiştir
        tabButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');

        // İlgili içeriği göster
        const tabId = button.dataset.tab;
        tabPanes.forEach((pane) => {
          pane.classList.remove('active');
          if (pane.id === tabId) {
            pane.classList.add('active');
          }
        });

        // Tab değiştiğinde grafikleri güncelle
        if (tabId === 'reports') {
          this.updateReportCharts();
        }
      });
    });
  }

  updateReportCharts() {
    if (this.charts.has('salesPerformance')) {
      this.charts.get('salesPerformance').update();
    }
    if (this.charts.has('userAnalysis')) {
      this.charts.get('userAnalysis').update();
    }
  }

  initializeSidebarNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');

    // Menü tıklamalarını yönet
    menuItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        // Aktif menü stilini güncelle
        menuItems.forEach((mi) => mi.classList.remove('active'));
        item.classList.add('active');

        // İlgili bölüme smooth scroll yap
        const sectionId = item.getAttribute('href');
        const section = document.querySelector(sectionId);
        if (section) {
          section.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      });
    });

    // Scroll pozisyonuna göre aktif menüyü güncelle
    window.addEventListener('scroll', () => {
      const sections = document.querySelectorAll('.section');
      let currentSection = '';

      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - 200) {
          currentSection = '#' + section.id;
        }
      });

      menuItems.forEach((item) => {
        item.classList.remove('active');
        if (item.getAttribute('href') === currentSection) {
          item.classList.add('active');
        }
      });
    });
  }

  // Teklif işleme fonksiyonları
  async handleApprove(quoteId) {
    try {
      await dbService.updateQuoteStatus(quoteId, 'ONAYLANDI');
      await this.loadData();
      this.renderQuotesList(this.allQuotes);
    } catch (error) {
      console.error('Onaylama hatası:', error);
    }
  }

  async handleReject(quoteId) {
    try {
      await dbService.updateQuoteStatus(quoteId, 'REDDEDILDI');
      await this.loadData();
      this.renderQuotesList(this.allQuotes);
    } catch (error) {
      console.error('Reddetme hatası:', error);
    }
  }

  async handleRevert(quoteId) {
    try {
      await dbService.updateQuoteStatus(quoteId, 'HAZIRLANDI');
      await this.loadData();
      this.renderQuotesList(this.allQuotes);
    } catch (error) {
      console.error('Geri alma hatası:', error);
    }
  }

  async handleDelete(quoteId) {
    if (confirm('Bu teklifi silmek istediğinizden emin misiniz?')) {
      try {
        await dbService.deleteQuote(quoteId);
        await this.loadData();
        this.renderQuotesList(this.allQuotes);
      } catch (error) {
        console.error('Silme hatası:', error);
      }
    }
  }

  showCostEditModal(quote) {
    const modal = document.createElement('div');
    modal.className = 'modal cost-edit-modal';
    modal.innerHTML = `
      <div class="modal-content cost-edit-modal-content">
        <div class="modal-header cost-edit-modal-header">
          <h3>Gerçekleşen Maliyet Girişi - ${quote.number}</h3>
          <button class="modal-close cost-edit-modal-close" type="button">&times;</button>
        </div>
        <div class="modal-body">
          <form id="costEditForm">
            <div class="form-group">
              <label>Teklif No</label>
              <input type="text" id="costEditQuoteNumber" class="form-control" value="${quote.number || ''}" readonly>
            </div>
            <div class="form-group">
              <label>Teklif Tutarı</label>
              <input type="text" id="costEditQuoteAmount" class="form-control" value="${this.formatCurrency(quote.total_price || 0)}" readonly>
            </div>
            <div class="form-group">
              <label>Gerçekleşen Maliyet *</label>
              <div class="input-with-icon">
                <i class="material-icons">attach_money</i>
                <input type="number" id="costEditActualCost" class="cost-input form-input" 
                  placeholder="Gerçekleşen maliyeti girin" step="0.01" 
                  value="${quote.actual_cost || ''}" required>
              </div>
            </div>
            <div class="form-group">
              <label>Satın Alım Tarihi</label>
              <input type="date" id="costEditPurchaseDate" class="form-input" 
                value="${quote.purchase_date || ''}">
            </div>
            <div class="form-group">
              <label>Teslimat Tarihi</label>
              <input type="date" id="costEditDeliveryDate" class="form-input" 
                value="${quote.delivery_date || ''}">
            </div>
            <div class="form-group">
              <label>Maliyet Notları</label>
              <textarea id="costEditNotes" class="form-input" rows="3" 
                placeholder="Maliyet ile ilgili açıklamalar...">${quote.cost_notes || ''}</textarea>
            </div>
            <div class="modal-footer cost-form-actions">
              <button type="button" class="btn btn-secondary" id="cancelCostEdit">İptal</button>
              <button type="submit" class="btn btn-primary">
                <i class="material-icons" style="font-size: 18px; margin-right: 6px;">save</i>
                Kaydet
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
    modal.style.display = 'flex';

    // Kapatma event listener'ları
    modal.querySelector('.cost-edit-modal-close')?.addEventListener('click', () => this.closeCostEditModal(modal));
    modal.querySelector('#cancelCostEdit')?.addEventListener('click', () => this.closeCostEditModal(modal));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeCostEditModal(modal);
      }
    });

    // Form submit handler
    const form = modal.querySelector('#costEditForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveActualCost(quote.id, modal);
      });
    }

    // Gerçekleşen maliyet girildiğinde kar marjını otomatik hesapla ve göster
    const actualCostInput = modal.querySelector('#costEditActualCost');
    const quoteAmount = parseFloat(quote.total_price) || 0;
    
    if (actualCostInput) {
      actualCostInput.addEventListener('input', (e) => {
        const actualCost = parseFloat(e.target.value) || 0;
        if (actualCost > 0 && quoteAmount > 0) {
          const profit = quoteAmount - actualCost;
          const margin = (profit / quoteAmount) * 100;
          
          // Kar marjı bilgisini göster (opsiyonel - bir bilgi kutusu olarak)
          let marginInfo = modal.querySelector('.margin-preview');
          if (!marginInfo) {
            marginInfo = document.createElement('div');
            marginInfo.className = 'margin-preview';
            marginInfo.style.cssText = 'margin-top: 8px; padding: 8px; border-radius: 4px; font-size: 13px;';
            actualCostInput.parentElement.appendChild(marginInfo);
          }
          
          marginInfo.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Kar Tutarı: <strong style="color: ${profit >= 0 ? '#10b981' : '#ef4444'}">${this.formatCurrency(profit)}</strong></span>
              <span>Kar Marjı: <strong style="color: ${margin >= 0 ? '#10b981' : '#ef4444'}">${margin.toFixed(2)}%</strong></span>
            </div>
          `;
        } else if (actualCostInput.parentElement.querySelector('.margin-preview')) {
          actualCostInput.parentElement.querySelector('.margin-preview').remove();
        }
      });
    }
  }

  closeCostEditModal(modal) {
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      setTimeout(() => modal.remove(), 300);
    }
  }

  async saveActualCost(quoteId, modal) {
    try {
      const actualCost = parseFloat(modal.querySelector('#costEditActualCost').value);
      const purchaseDate = modal.querySelector('#costEditPurchaseDate').value;
      const deliveryDate = modal.querySelector('#costEditDeliveryDate').value;
      const notes = modal.querySelector('#costEditNotes').value;

      if (!actualCost || actualCost <= 0) {
        alert('Lütfen geçerli bir gerçekleşen maliyet girin.');
        return;
      }

      // Teklifi bul
      const quote = this.allQuotes.find((q) => q.id === quoteId);
      if (!quote) {
        throw new Error('Teklif bulunamadı');
      }

      // API'ye gönder
      const response = await fetch(`${window.location.origin}/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: quote.number,
          date: quote.date,
          customer_id: quote.customer_id,
          prepared_by: quote.prepared_by,
          status: quote.status,
          total_price: quote.total_price,
          details: quote.details,
          items: quote.items,
          actual_cost: actualCost,
          purchase_date: purchaseDate || null,
          delivery_date: deliveryDate || null,
          notes: notes || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification('success', 'Başarılı', 'Gerçekleşen maliyet başarıyla kaydedildi!');
        this.closeCostEditModal(modal);
        
        // Teklif listesini yenile
        await this.loadData();
        this.renderQuotesList(this.allQuotes);
      } else {
        throw new Error(result.error || 'Maliyet kaydedilirken hata oluştu');
      }
    } catch (error) {
      console.error('Gerçekleşen maliyet kaydetme hatası:', error);
      this.showNotification('error', 'Hata', 'Maliyet kaydedilirken bir hata oluştu: ' + error.message);
    }
  }

  renderQuotesList(quotes) {
    console.log('renderQuotesList çağrıldı', {
      quotesLength: quotes?.length || 0,
    });

    // Önce quotes view'ı bul
    const quotesView = document.getElementById('quotes');
    if (!quotesView) {
      console.error('Quotes view bulunamadı!');
      return;
    }

    // Teklif listesi konteynerini bul veya oluştur
    let teklifListesi = quotesView.querySelector('.teklif-listesi');
    if (!teklifListesi) {
      console.log('teklif-listesi bulunamadı, oluşturuluyor...');
      teklifListesi = document.createElement('div');
      teklifListesi.className = 'teklif-listesi';
      quotesView.appendChild(teklifListesi);
    }

    // Teklif tablosunu tamamen yeniden oluştur (DOM'da var olsa bile yeniden yarat)
    teklifListesi.innerHTML = `
            <table class="teklif-table" id="quotesTable">
                <thead>
                    <tr>
                        <th class="sortable" data-column="number">Teklif No</th>
                        <th class="sortable" data-column="date">Tarih</th>
                        <th class="sortable" data-column="customer">Müşteri</th>
                        <th data-column="details">Detay</th>
                        <th class="sortable" data-column="prepared_by">Hazırlayan</th>
                        <th class="sortable" data-column="total_price">Toplam Tutar</th>
                        <th class="sortable" data-column="status">Durum</th>
                        <th data-column="actions">İşlemler</th>
                    </tr>
                </thead>
                <tbody id="quotesList">
                    <!-- Teklifler buraya eklenecek -->
                </tbody>
            </table>
        `;

    // Tablo body elementini seç
    const tbody = teklifListesi.querySelector('#quotesList');
    if (!tbody) {
      console.error('Teklif tablosu body elementi bulunamadı!');
      return;
    }

    // Referansı güncelle
    this.quoteTable = tbody;

    console.log('Teklifler işleniyor, toplam:', quotes?.length || 0);

      // Sayfalama uygula
      const totalItems = quotes.length;
      const totalPages = Math.ceil(totalItems / this.pageSize);
      this.totalPages = totalPages;
      
      if (this.currentPage > totalPages && totalPages > 0) {
        this.currentPage = totalPages;
      }

      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      const paginatedQuotes = quotes.slice(startIndex, endIndex);

    // Teklifleri tabloya ekle
    try {
      if (!quotes || quotes.length === 0) {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="no-data" style="text-align: center; padding: 40px 20px; color: var(--disabled-color);">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                                <i class="material-icons" style="font-size: 48px; opacity: 0.5;">inbox</i>
                                <div style="font-size: 16px; font-weight: 500;">Filtreye uygun teklif bulunamadı</div>
                                <div style="font-size: 14px; opacity: 0.7;">Filtreleri değiştirerek tekrar deneyin</div>
                            </div>
                        </td>
                    </tr>
                `;
        this.updatePagination();
        return;
      }

        // Sayfalanmış verileri kullan
        const quotesToRender = paginatedQuotes;

      // Her teklif için bir satır oluştur - debug için her adımı kontrol et
      const rows = quotesToRender.map((quote) => {
        // Teklif null/undefined kontrolü
        if (!quote) {
          console.warn('Geçersiz teklif verisi (null/undefined)');
          return '';
        }

        try {
          // Durum belirleme - daha esnek bir yaklaşım
          let statusText = 'Bekliyor'; // Varsayılan durum
          let statusClass = 'status-bekliyor';

          if (quote.status) {
            // Durum değerini standartlaştır ve kontrol et
            const statusUpperCase = String(quote.status).toUpperCase().trim();

            // Onaylandı durumu kontrolü
            if (
              statusUpperCase === 'ONAYLANDI' ||
              statusUpperCase.includes('ONAY') ||
              statusUpperCase === 'CHECK' ||
              statusUpperCase === 'CHECK CIRCLE'
            ) {
              statusText = 'Onaylandı';
              statusClass = 'status-onaylandi';
            }
            // Reddedildi durumu kontrolü
            else if (
              statusUpperCase === 'REDDEDILDI' ||
              statusUpperCase.includes('RED') ||
              statusUpperCase === 'CANCEL' ||
              statusUpperCase === 'IPTAL'
            ) {
              statusText = 'Reddedildi';
              statusClass = 'status-reddedildi';
            }
            // Hazırlandı durumu
            else if (
              statusUpperCase === 'HAZIRLANDI' ||
              statusUpperCase.includes('HAZIR')
            ) {
              statusText = 'Bekliyor';
              statusClass = 'status-bekliyor';
            }
            // Diğer durumlarda Bekliyor olarak varsay
          }

          // Debug: Durum değerlerini logla
          console.log(
            `Teklif ${quote.id || quote.number} durumu: ${quote.status} -> ${statusText}`
          );

          // Her alanı güvenli bir şekilde göster
          const number = quote.number || '-';
          const date = quote.date ? this.formatDate(quote.date) : (quote.created_at ? this.formatDate(quote.created_at) : '-');
          const details = quote.details || '-';
          const customerName = quote.customer_name || '-';

          // Kullanıcı adını doğru şekilde al
          let preparedBy;
          if (quote.prepared_by_name) {
            preparedBy = quote.prepared_by_name;
          } else if (quote.prepared_by && !isNaN(parseInt(quote.prepared_by))) {
            // prepared_by bir ID ise, kullanıcı adını getir
            const userId = parseInt(quote.prepared_by);
            preparedBy = this.getUserNameById(userId);
          } else {
            preparedBy = quote.preparedBy || quote.prepared_by || '-';
          }

          // Tutar bilgisi - formatı kontrol et
          let totalPrice = '-';
          if (quote.totalPrice) {
            totalPrice = this.formatCurrency(quote.totalPrice);
          } else if (quote.total_price !== undefined && quote.total_price !== null) {
            totalPrice = this.formatCurrency(quote.total_price);
          }

          // Gerçekleşen maliyet ve kar marjı kaldırıldı - ayrı sekmede gösteriliyor

          // İşlem butonları
          let actionButtons = '';
          try {
            actionButtons = this.getActionButtons(quote);
          } catch (btnError) {
            console.error('İşlem butonları oluşturulurken hata:', btnError);
            actionButtons = `<button class="action-button">Hata</button>`;
          }

          // Revizyon geçmişi
          let revisionHistory = '';
          try {
            revisionHistory = this.renderRevisionHistory(quote.revisions);
          } catch (revError) {
            console.error('Revizyon geçmişi oluşturulurken hata:', revError);
            revisionHistory = '';
          }

          // Row ID ekle
          const rowId = quote.id || `row-${Date.now()}-${Math.random()}`;

          return `
                <tr data-row-id="${rowId}" data-quote-id="${quote.id || ''}" data-year="${this.getYearFromDate(quote.date || quote.created_at)}">
                    <td data-label="Teklif No">${number}</td>
                    <td data-label="Tarih">${date}</td>
                    <td data-label="Müşteri">${customerName}</td>
                    <td data-label="Detay">${details}</td>
                    <td data-label="Hazırlayan">${preparedBy}</td>
                    <td data-label="Toplam Tutar">
                        <div class="price-history">
                            <div class="current-price">${totalPrice}</div>
                            ${revisionHistory}
                        </div>
                    </td>
                    <td data-label="Durum">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td data-label="İşlemler" class="actions-cell">${actionButtons}</td>
                </tr>
            `;
        } catch (rowError) {
          console.error('Teklif satırı oluşturulurken hata:', rowError, quote);
          return `
                        <tr>
                            <td colspan="8" class="error">Teklif verisi işlenirken hata oluştu</td>
                        </tr>
                    `;
        }
      });

      // Tüm satırları birleştir ve tabloya ekle
      tbody.innerHTML = rows.join('');

      // Satır seçimi için event listener'ları ekle
      tbody.querySelectorAll('tr[data-row-id]').forEach((row) => {
        row.addEventListener('click', (e) => {
          // Eğer tıklama action butonlarına ise seçimi değiştirme
          if (e.target.closest('.actions-cell')) {
            return;
          }
          
          const rowId = row.getAttribute('data-row-id');
          if (this.selectedRows.has(rowId)) {
            this.selectedRows.delete(rowId);
            row.classList.remove('selected');
          } else {
            this.selectedRows.add(rowId);
            row.classList.add('selected');
          }
        });
      });

      // Sıralama için event listener'ları ekle
      const table = teklifListesi.querySelector('.teklif-table');
      if (table) {
        table.querySelectorAll('th.sortable').forEach((th) => {
          th.addEventListener('click', () => {
            const column = th.getAttribute('data-column');
            this.sortTable(column);
          });
        });
      }

      // Event listener'ları ekle (maliyet girişi butonları için)
      tbody.querySelectorAll('[data-action="edit-cost"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const quoteId = parseInt(e.currentTarget.dataset.id);
          const quote = quotes.find((q) => q.id === quoteId);
          if (quote) {
            this.showCostEditModal(quote);
          }
        });
      });

      // Yıl filtrelerini doldur
      this.populateYearFilter(quotes);

      // Tablo bilgilerini güncelle
      this.updateTableInfo(totalItems);
      
      // Sayfalama bilgilerini güncelle
      this.updatePagination();

      console.log('Teklifler başarıyla tabloya eklendi');
    } catch (error) {
      console.error('Teklifler işlenirken hata oluştu:', error);
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="error">Teklifler yüklenirken bir hata oluştu! Hata: ${error.message}</td>
                </tr>
            `;
    }
  }

  // Tarihten yıl çıkar
  getYearFromDate(dateString) {
    if (!dateString) return new Date().getFullYear();
    try {
      const date = new Date(dateString);
      return date.getFullYear();
    } catch (error) {
      return new Date().getFullYear();
    }
  }

  // Yıl filtrelerini doldur
  populateYearFilter(quotes) {
    const yearFilter = document.getElementById('yearFilter');
    if (!yearFilter) return;

    // Mevcut seçimi sakla
    const currentValue = yearFilter.value;

    // Tüm yılları topla
    const years = new Set();
    quotes.forEach(quote => {
      const year = this.getYearFromDate(quote.date || quote.created_at);
      years.add(year);
    });

    // Yılları sırala (büyükten küçüğe)
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    // Select'i temizle ve yeniden doldur
    yearFilter.innerHTML = '<option value="">Tüm Yıllar</option>';
    sortedYears.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearFilter.appendChild(option);
    });

    // Önceki seçimi geri yükle
    if (currentValue) {
      yearFilter.value = currentValue;
    }
  }

  renderRevisionHistory(revisions) {
    // Revisions null/undefined kontrolü
    if (!revisions || !Array.isArray(revisions) || revisions.length === 0) {
      return '';
    }

    try {
      return `
            <div class="revision-history">
                <div class="revision-toggle" data-action="toggle-revisions">
                    <i class="material-icons">history</i>
                    <span>${revisions.length} revizyon</span>
                </div>
                <div class="revision-details">
                        ${revisions
                          .map((rev, index) => {
                            // Her revizyon için null check
                            if (!rev) return '';

                            const revPrice = rev.price || '-';
                            const revDate = rev.date || '-';

                            return `
                        <div class="revision-item">
                            <span class="revision-number">Rev.${index + 1}</span>
                                    <span class="revision-price">${revPrice}</span>
                                    <span class="revision-date">${revDate}</span>
                        </div>
                            `;
                          })
                          .join('')}
                </div>
            </div>
        `;
    } catch (error) {
      console.error('Revizyon geçmişi işlenirken hata:', error);
      return '';
    }
  }

  showRevisionModal(quote) {
    console.log('Modal açılıyor:', quote); // Debug için
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Teklif Revizyonu - ${quote.number}</h3>
                    <button class="modal-close" data-action="close-modal">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="revision-info">
                        <div class="form-group">
                            <label>Mevcut Tutar</label>
                            <div class="current-amount">${quote.totalPrice} USD</div>
                        </div>
                        <div class="form-group">
                            <label>Yeni Tutar (USD)</label>
                            <input type="number" id="newPrice" value="${quote.totalPrice}" step="0.01" class="form-input">
                        </div>
                        <div class="form-group">
                            <label>Revizyon Sebebi</label>
                            <select id="revisionReason" class="form-input">
                                <option value="">Sebep Seçiniz</option>
                                <option value="Müşteri İndirimi">Müşteri İndirimi</option>
                                <option value="Maliyet Düzeltmesi">Maliyet Düzeltmesi</option>
                                <option value="Kur Farkı">Kur Farkı</option>
                                <option value="Rekabet Düzenlemesi">Rekabet Düzenlemesi</option>
                                <option value="Diğer">Diğer</option>
                            </select>
                        </div>
                        <div class="form-group" id="otherReasonGroup" style="display: none;">
                            <label>Diğer Sebep</label>
                            <input type="text" id="otherReason" class="form-input" placeholder="Revizyon sebebini belirtiniz...">
                        </div>
                        <div class="form-group">
                            <label>Açıklama</label>
                            <textarea id="revisionNote" class="form-input" rows="3" 
                                placeholder="Revizyon detaylarını belirtiniz..."></textarea>
                        </div>
                    </div>
                    
                    <div class="revision-history">
                        <h4>Revizyon Geçmişi</h4>
                        ${this.renderRevisionHistoryTable(quote.revisions)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="action-button cancel" data-action="close-modal">İptal</button>
                    <button class="action-button save" data-action="save-revision" data-id="${quote.id}">Kaydet</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Event Listeners
    const reasonSelect = modal.querySelector('#revisionReason');
    const otherReasonGroup = modal.querySelector('#otherReasonGroup');

    reasonSelect.addEventListener('change', (e) => {
      otherReasonGroup.style.display =
        e.target.value === 'Diğer' ? 'block' : 'none';
    });

    modal
      .querySelector('[data-action="close-modal"]')
      .addEventListener('click', () => {
        modal.remove();
      });

    modal
      .querySelector('[data-action="save-revision"]')
      .addEventListener('click', async () => {
        const newPrice = parseFloat(modal.querySelector('#newPrice').value);
        const reason =
          reasonSelect.value === 'Diğer'
            ? modal.querySelector('#otherReason').value
            : reasonSelect.value;
        const note = modal.querySelector('#revisionNote').value;

        if (!reason) {
          alert('Lütfen revizyon sebebi seçiniz.');
          return;
        }

        if (newPrice === quote.totalPrice) {
          alert('Tutar değişikliği yapmadınız.');
          return;
        }

        await this.handleRevise(quote.id, newPrice, reason, note);
        modal.remove();
      });
  }

  async handleRevise(quoteId, newPrice, reason, note) {
    try {
      const quote = this.allQuotes.find((q) => q.id === quoteId);
      if (!quote) return;

      const revision = {
        price: quote.totalPrice,
        newPrice: newPrice,
        date: new Date().toLocaleDateString(),
        reason: reason,
        note: note,
        user: 'Aktif Kullanıcı', // Gerçek kullanıcı bilgisi eklenebilir
        changePercentage: (
          ((newPrice - quote.totalPrice) / quote.totalPrice) *
          100
        ).toFixed(2),
      };

      quote.revisions = quote.revisions || [];
      quote.revisions.push(revision);
      quote.totalPrice = newPrice;
      quote.lastRevisionDate = new Date().toISOString();

      await dbService.updateQuote(quote);
      await this.loadData();
      this.renderQuotesList(this.allQuotes);
    } catch (error) {
      console.error('Revizyon hatası:', error);
      alert('Revizyon kaydedilirken bir hata oluştu.');
    }
  }

  renderRevisionHistoryTable(revisions) {
    if (!revisions || revisions.length === 0) {
      return '<p class="no-revisions">Henüz revizyon yapılmamış.</p>';
    }

    return `
            <table class="revision-table">
                <thead>
                    <tr>
                        <th>Tarih</th>
                        <th>Eski Tutar</th>
                        <th>Yeni Tutar</th>
                        <th>Değişim</th>
                        <th>Sebep</th>
                        <th>Not</th>
                    </tr>
                </thead>
                <tbody>
                    ${revisions
                      .map(
                        (rev) => `
                        <tr>
                            <td>${rev.date}</td>
                            <td>${rev.price} USD</td>
                            <td>${rev.newPrice} USD</td>
                            <td class="${rev.changePercentage > 0 ? 'increase' : 'decrease'}">
                                ${rev.changePercentage}%
                            </td>
                            <td>${rev.reason}</td>
                            <td>${rev.note || '-'}</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        `;
  }

  loadUserInfo() {
    try {
      // Kullanıcı bilgisini tekrar kontrol et (eğer başka bir yerden güncellenmiş olabilir)
      this.initCurrentUser();

      // DOM elementlerini güncelle
      if (this.currentUser) {
        document.querySelectorAll('.prepared-by').forEach((element) => {
          if (element.textContent === 'Bilinmeyen Kullanıcı') {
            element.textContent =
              this.currentUser.fullName ||
              this.currentUser.full_name ||
              'Bilinmeyen Kullanıcı';
          }
        });
      }
    } catch (error) {
      console.error('Kullanıcı bilgisini yüklerken hata:', error);
    }
  }

  async loadCalculations() {
    try {
      const response = await fetch('/api/calculations');
      const data = await response.json();

      data.forEach((calculation) => {
        // Hazırlayan bilgisini göster
        const preparedBy =
          calculation.prepared_by ||
          (calculation.user_id === this.currentUser?.id
            ? this.currentUser.fullName
            : 'Bilinmeyen Kullanıcı');

        // Teklif satırını oluştur
        this.addCalculationRow(calculation, preparedBy);
      });
    } catch (error) {
      console.error('Hesaplamalar yüklenirken hata:', error);
    }
  }

  async initializeCRM() {
    try {
      // Veritabanı bağlantısını bekle
      await dbService.initDatabase();
      console.log('Veritabanı bağlantısı kuruldu');

      // Event listener'ları ekle
      const addCustomerBtn = document.getElementById('addCustomerBtn');
      if (addCustomerBtn) {
        console.log('Yeni müşteri butonu bulundu');
        // Önceki listener'ları temizle
        const newBtn = addCustomerBtn.cloneNode(true);
        addCustomerBtn.parentNode.replaceChild(newBtn, addCustomerBtn);
        newBtn.addEventListener('click', () => {
          console.log('Yeni müşteri butonuna tıklandı');
          this.showNewCustomerModal();
        });
      }

      // Müşteri arama
      const customerSearch = document.getElementById('customerSearch');
      if (customerSearch) {
        customerSearch.addEventListener('input', (e) => {
          this.filterCustomers(e.target.value);
        });
      }

      // Durum filtreleri kaldırıldı - basit tasarım için

      // İlk verileri yükle
      await this.loadCRMData();
      console.log('CRM verileri yüklendi');
      
      // updateCRMStats çağrısını kaldırdık - basit tasarım için gerekli değil
    } catch (error) {
      console.error('CRM başlatılırken hata:', error);
    }
  }

  filterCustomers(searchTerm = '') {
    const rows = document.querySelectorAll('#customerTableBody tr[data-customer-id]');

    rows.forEach((row) => {
      const customerName = row.querySelector('.customer-name-simple')?.textContent.toLowerCase() || '';
      const contactPerson = row.cells[1]?.textContent.toLowerCase() || '';
      const phone = row.cells[2]?.textContent.toLowerCase() || '';
      const email = row.cells[3]?.textContent.toLowerCase() || '';
      
      const matchesSearch = !searchTerm || 
        customerName.includes(searchTerm.toLowerCase()) ||
        contactPerson.includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase());

      row.style.display = matchesSearch ? '' : 'none';
    });
  }

  async loadCRMData() {
    try {
      console.log('CRM verileri yükleniyor...');
      const customers = await dbService.getAllCustomers();
      console.log('Müşteriler alındı:', customers);

      this.renderCustomerTable(customers);
      await this.updateCRMStats();
    } catch (error) {
      console.error('CRM verisi yüklenirken hata:', error);
    }
  }

  renderCustomerTable(customers) {
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return;

    tbody.innerHTML =
      customers
        .map(
          (customer) => `
            <tr data-customer-id="${customer.id}">
                <td>
                    <div class="customer-name-simple">${customer.company_name || '-'}</div>
                </td>
                <td>${customer.name || '-'}</td>
                <td>${customer.consultant_phone || customer.phone || '-'}</td>
                <td>${customer.consultant_email || customer.email || '-'}</td>
                <td>
                    <span class="status-badge-simple ${(customer.status || 'Aktif').toLowerCase()}">${customer.status || 'Aktif'}</span>
                </td>
                <td>
                    <div class="action-buttons-simple">
                        <button class="btn-icon-simple view-customer-details" title="Detaylar ve Kar Analizi" data-customer-id="${customer.id}">
                            <i class="material-icons">analytics</i>
                        </button>
                        <button class="btn-icon-simple delete-customer" title="Sil" data-customer-id="${customer.id}">
                            <i class="material-icons">delete</i>
                        </button>
                    </div>
                </td>
            </tr>
        `
        )
        .join('') ||
      '<tr><td colspan="6" class="no-data">Müşteri bulunamadı</td></tr>';

    // Event listener'ları ekle
    tbody.querySelectorAll('.delete-customer').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const customerId = e.currentTarget.dataset.customerId;
        await this.deleteCustomer(customerId);
      });
    });

    tbody.querySelectorAll('.view-customer-details').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const customerId = e.currentTarget.dataset.customerId;
        await this.showCustomerProfitAnalysis(customerId);
      });
    });
  }

  async showCustomerProfitAnalysis(customerId) {
    try {
      // Müşteri bilgilerini al
      const customerResponse = await fetch(`${window.location.origin}/api/customers/${customerId}`);
      const customerResult = await customerResponse.json();
      
      if (!customerResult.success) {
        throw new Error('Müşteri bilgileri alınamadı');
      }

      const customer = customerResult.data;

      // Satın alım geçmişini ve kar marjı analizini al
      let profitSummary = null;
      let purchases = [];

      try {
        const profitResponse = await fetch(`${window.location.origin}/api/customers/${customerId}/profit-summary`);
        if (profitResponse.ok) {
          const profitResult = await profitResponse.json();
          if (profitResult.success) {
            profitSummary = profitResult.data;
          }
        }

        const purchasesResponse = await fetch(`${window.location.origin}/api/customers/${customerId}/purchases`);
        if (purchasesResponse.ok) {
          const purchasesResult = await purchasesResponse.json();
          if (purchasesResult.success) {
            purchases = purchasesResult.data;
          }
        }
      } catch (error) {
        console.warn('Kar marjı analizi henüz backend\'de implement edilmemiş:', error);
      }

      // Modal içeriğini oluştur
      const modalContent = `
        <div class="customer-profit-modal">
          <div class="modal-header">
            <h2>${customer.company_name} - Satın Alım ve Kar Analizi</h2>
            <button class="modal-close" type="button">&times;</button>
          </div>
          <div class="modal-body">
            ${profitSummary ? `
              <div class="profit-summary-cards">
                <div class="profit-card">
                  <div class="profit-card-label">Toplam Satın Alım</div>
                  <div class="profit-card-value">${this.formatCurrency(profitSummary.total_revenue || 0)}</div>
                </div>
                <div class="profit-card">
                  <div class="profit-card-label">Toplam Kar</div>
                  <div class="profit-card-value profit-positive">${this.formatCurrency(profitSummary.total_profit || 0)}</div>
                </div>
                <div class="profit-card">
                  <div class="profit-card-label">Ortalama Kar Marjı</div>
                  <div class="profit-card-value">${(profitSummary.average_margin || 0).toFixed(2)}%</div>
                </div>
                <div class="profit-card">
                  <div class="profit-card-label">Satın Alım Sayısı</div>
                  <div class="profit-card-value">${profitSummary.purchase_count || 0}</div>
                </div>
              </div>
            ` : `
              <div class="info-message">
                <i class="material-icons">info</i>
                <p>Kar marjı analizi için backend API endpoint'leri henüz implement edilmemiş. 
                <br>Lütfen <code>TEKLIF_TAKIBI_VE_KAR_MARJI_REHBERI.md</code> dosyasına bakın.</p>
              </div>
            `}
            
            <h3 style="margin-top: 24px; margin-bottom: 12px;">Satın Alım Geçmişi</h3>
            ${purchases.length > 0 ? `
              <table class="purchases-table">
                <thead>
                  <tr>
                    <th>Teklif No</th>
                    <th>Tarih</th>
                    <th>Tutar</th>
                    <th>Maliyet</th>
                    <th>Kar</th>
                    <th>Marj %</th>
                  </tr>
                </thead>
                <tbody>
                  ${purchases.map(p => `
                    <tr>
                      <td>${p.quote_number || '-'}</td>
                      <td>${this.formatDate(p.purchase_date)}</td>
                      <td>${this.formatCurrency(p.purchase_amount)}</td>
                      <td>${this.formatCurrency(p.actual_cost)}</td>
                      <td class="${p.profit_amount >= 0 ? 'profit-positive' : 'profit-negative'}">${this.formatCurrency(p.profit_amount)}</td>
                      <td>${(p.profit_margin || 0).toFixed(2)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="no-data-message">
                <p>Henüz satın alım kaydı bulunmamaktadır.</p>
                <p class="info-text">Satın alım kaydı oluşturmak için teklifler sekmesinden onaylanan tekliflere gerçekleşen maliyet girişi yapın.</p>
              </div>
            `}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary close-profit-modal">Kapat</button>
          </div>
        </div>
      `;

      // Modal oluştur ve göster
      let modal = document.getElementById('customerProfitModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customerProfitModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
      }

      modal.innerHTML = modalContent;
      modal.classList.add('active');
      modal.style.display = 'flex';

      // Kapatma event listener'ları
      modal.querySelector('.modal-close')?.addEventListener('click', () => this.closeProfitModal());
      modal.querySelector('.close-profit-modal')?.addEventListener('click', () => this.closeProfitModal());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeProfitModal();
        }
      });
    } catch (error) {
      console.error('Müşteri kar analizi gösterilirken hata:', error);
      alert('Hata: ' + error.message);
    }
  }

  closeProfitModal() {
    const modal = document.getElementById('customerProfitModal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  getInitials(name) {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return '-';
    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount;
    if (isNaN(numAmount)) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    try {
      // ISO formatından parse et
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      // DD.MM.YYYY HH:mm formatına çevir
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error('Tarih formatlama hatası:', error);
      return '-';
    }
  }

  // Tablo sıralama
  sortTable(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // Sıralama göstergelerini güncelle
    const table = document.querySelector('#quotesTable');
    if (table) {
      table.querySelectorAll('th.sortable').forEach((th) => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('data-column') === column) {
          th.classList.add(`sort-${this.sortDirection}`);
        }
      });
    }

    // Verileri sırala ve yeniden render et
    this.applySorting();
  }

  // Verileri sırala
  applySorting() {
    if (!this.sortColumn) return;

    this.allQuotes.sort((a, b) => {
      let aVal = a[this.sortColumn] || a[this.getColumnKey(this.sortColumn)] || '';
      let bVal = b[this.sortColumn] || b[this.getColumnKey(this.sortColumn)] || '';

      // Sayısal değerler için özel işlem
      if (this.sortColumn === 'total_price' || this.sortColumn === 'actual_cost' || this.sortColumn === 'profit_margin') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // Tarih için özel işlem
      if (this.sortColumn === 'date') {
        aVal = new Date(aVal || a.created_at || 0);
        bVal = new Date(bVal || b.created_at || 0);
      }

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.renderQuotesList(this.allQuotes);
  }

  // Kolon anahtarı eşleştirme
  getColumnKey(column) {
    const mapping = {
      'number': 'number',
      'date': 'date',
      'customer': 'customer_name',
      'details': 'details',
      'prepared_by': 'prepared_by_name',
      'total_price': 'total_price',
      'actual_cost': 'actual_cost',
      'profit_margin': 'profit_margin',
      'status': 'status'
    };
    return mapping[column] || column;
  }

  // Tablo bilgilerini güncelle
  updateTableInfo(total) {
    const infoElement = document.getElementById('tableInfo');
    if (infoElement) {
      infoElement.textContent = `Toplam: ${total} kayıt`;
    }
  }

  // Sayfalama
  goToPage(page) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.renderQuotesList(this.allQuotes);
    this.updatePagination();
  }

  updatePagination() {
    const totalItems = this.allQuotes.length;
    this.totalPages = Math.ceil(totalItems / this.pageSize);
    
    const paginationElement = document.getElementById('tablePagination');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (this.totalPages <= 1) {
      if (paginationElement) paginationElement.style.display = 'none';
      return;
    }

    if (paginationElement) paginationElement.style.display = 'flex';
    if (paginationInfo) {
      paginationInfo.textContent = `Sayfa ${this.currentPage} / ${this.totalPages}`;
    }

    // Sayfa numaralarını göster - satır düzeninde
    const pageNumbers = document.getElementById('pageNumbers');
    if (pageNumbers) {
      pageNumbers.innerHTML = '';
      const maxVisible = 7;
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
      let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
      
      if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }

      // İlk sayfa gösteriliyorsa ve başlangıç 1'den büyükse "..." göster
      if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'pagination-btn';
        firstBtn.textContent = '1';
        firstBtn.addEventListener('click', () => this.goToPage(1));
        pageNumbers.appendChild(firstBtn);
        
        if (startPage > 2) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'pagination-ellipsis';
          ellipsis.textContent = '...';
          ellipsis.style.cssText = 'padding: 0 8px; color: var(--text-tertiary);';
          pageNumbers.appendChild(ellipsis);
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${i === this.currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => this.goToPage(i));
        pageNumbers.appendChild(btn);
      }

      // Son sayfa gösteriliyorsa ve bitiş toplam sayfadan küçükse "..." göster
      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'pagination-ellipsis';
          ellipsis.textContent = '...';
          ellipsis.style.cssText = 'padding: 0 8px; color: var(--text-tertiary);';
          pageNumbers.appendChild(ellipsis);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.className = 'pagination-btn';
        lastBtn.textContent = this.totalPages;
        lastBtn.addEventListener('click', () => this.goToPage(this.totalPages));
        pageNumbers.appendChild(lastBtn);
      }
    }

    // Buton durumlarını güncelle
    document.getElementById('firstPage').disabled = this.currentPage === 1;
    document.getElementById('prevPage').disabled = this.currentPage === 1;
    document.getElementById('nextPage').disabled = this.currentPage === this.totalPages;
    document.getElementById('lastPage').disabled = this.currentPage === this.totalPages;
  }

  // Excel export
  exportToExcel() {
    // Seçili yıl filtresini kontrol et
    const yearFilter = document.getElementById('yearFilter');
    const selectedYear = yearFilter?.value || '';
    
    let quotesToExport = this.allQuotes;
    if (selectedYear) {
      quotesToExport = this.allQuotes.filter(quote => {
        const quoteYear = this.getYearFromDate(quote.date || quote.created_at);
        return quoteYear.toString() === selectedYear;
      });
    }

    // Basit CSV export (Excel için)
    const headers = ['Teklif No', 'Tarih', 'Müşteri', 'Detay', 'Hazırlayan', 'Toplam Tutar', 'Durum'];
    const rows = quotesToExport.map(quote => [
      quote.number || '-',
      quote.date ? this.formatDate(quote.date) : '-',
      quote.customer_name || '-',
      quote.details || '-',
      quote.prepared_by_name || '-',
      quote.total_price ? this.formatCurrency(quote.total_price) : '-',
      quote.status || '-'
    ]);

    // Dosya adına yıl ekle
    const fileName = selectedYear 
      ? `teklifler_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`
      : `teklifler_${new Date().toISOString().split('T')[0]}.csv`;

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  }

  // PDF export (basit implementasyon)
  exportToPDF() {
    alert('PDF export özelliği yakında eklenecek. Şimdilik Excel export kullanabilirsiniz.');
    // PDF export için bir kütüphane gerekli (ör: jsPDF)
  }

  // Yıl filtresini uygula
  applyYearFilter(year) {
    if (!year) {
      // Tüm yılları göster
      this.renderQuotesList(this.allQuotes);
      return;
    }

    // Seçilen yıla göre filtrele
    const filteredQuotes = this.allQuotes.filter(quote => {
      const quoteYear = this.getYearFromDate(quote.date || quote.created_at);
      return quoteYear.toString() === year;
    });

    this.renderQuotesList(filteredQuotes);
  }

  async updateCRMStats() {
    // Basit tasarım için istatistikler kaldırıldı
    // Gerekirse burada istatistik güncellemeleri yapılabilir
  }

  async showCustomerDetails(customerId) {
    if (!this.customerModal) {
      this.customerModal = new CustomerDetailModal();
    }
    await this.customerModal.openModal(customerId, 'view');
  }

  async editCustomer(customerId) {
    if (!this.customerModal) {
      this.customerModal = new CustomerDetailModal();
    }
    await this.customerModal.openModal(customerId, 'edit');
  }

  async addMeeting(customerId) {
    if (!this.customerModal) {
      this.customerModal = new CustomerDetailModal();
    }
    await this.customerModal.openModal(customerId, 'meeting');
  }


  applyFilters() {
    const searchText =
      document.getElementById('searchInput')?.value.toLowerCase() || '';
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const status = this.activeStatusFilter;

    const filtered = this.allQuotes.filter((quote) => {
      const quoteDate = new Date(quote.date);
      if (startDate && new Date(startDate) > quoteDate) return false;
      if (endDate && new Date(endDate) < quoteDate) return false;
      if (status && quote.status !== status) return false;
      if (searchText) {
        const combined = (
          quote.number +
          quote.preparedBy +
          quote.prepared_by_name
        ).toLowerCase();
        if (!combined.includes(searchText)) return false;
      }
      return true;
    });

    this.renderQuotesList(filtered);
  }

  showNewCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (!modal) {
      console.error('Modal bulunamadı: addCustomerModal');
      return;
    }

    // Modal'ı göster
    modal.classList.add('active');
    modal.style.display = 'flex';

    // Form'u temizle
    const form = document.getElementById('addCustomerForm');
    if (form) {
      form.reset();
      // Varsayılan değerleri ayarla
      document.getElementById('customerCountry').value = 'Türkiye';
      document.getElementById('customerStatus').value = 'Aktif';
    }

    // Kapatma butonu için event listener
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeCustomerModal();
    }

    // İptal butonu için event listener
    const cancelBtn = document.getElementById('cancelCustomerBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => this.closeCustomerModal();
    }

    // Form submit handler
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await this.saveCustomer();
      };
    }

    // Modal dışına tıklanınca kapat
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closeCustomerModal();
      }
    };
  }

  closeCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) {
      modal.classList.remove('active');
        modal.style.display = 'none';
    }
  }

  async saveCustomer() {
    try {
      const form = document.getElementById('addCustomerForm');
      if (!form) {
        throw new Error('Form bulunamadı');
      }

      const formData = new FormData(form);
      const customerData = {
        company_name: formData.get('company_name'),
        name: formData.get('name') || null,
        consultant_email: formData.get('consultant_email') || null,
        consultant_phone: formData.get('consultant_phone') || null,
        address: formData.get('address') || null,
        country: formData.get('country') || 'Türkiye',
        city: formData.get('city') || null,
        category: formData.get('category') || null,
        status: formData.get('status') || 'Aktif',
      };

      // API'ye gönder
      const response = await fetch('${window.location.origin}/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const result = await response.json();

      if (result.success) {
        // Başarılı
        this.showNotification('success', 'Başarılı', 'Müşteri başarıyla eklendi!');
        this.closeCustomerModal();
        form.reset();
        
        // Müşteri listesini yenile
        await this.loadCRMData();
      } else {
        throw new Error(result.error || 'Müşteri eklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Müşteri kaydetme hatası:', error);
      this.showNotification('error', 'Hata', 'Müşteri eklenirken bir hata oluştu: ' + error.message);
    }
  }

  showNotification(type, title, message) {
    // Basit bildirim gösterimi
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  async deleteCustomer(customerId) {
    if (!customerId) return;

    // Onay iste
    const confirmed = confirm('Bu müşteriyi silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${window.location.origin}/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        alert('Müşteri başarıyla silindi!');
        // Müşteri listesini yenile
        await this.loadCRMData();
      } else {
        throw new Error(result.error || 'Müşteri silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Müşteri silme hatası:', error);
      alert('Hata: ' + error.message);
    }
  }

  // Yeni metod: Destructor
  destroy() {
    // Otomatik yenileme zamanlayıcısını temizle
    if (this.refreshInterval) {
      console.log('Otomatik yenileme zamanlayıcısı temizleniyor...');
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    // Event listener'ları temizle, grafikleri yok et vb.
    // ...
  }

  // Programatik olarak filtre butonunu seçme yardımcı fonksiyonu
  selectFilterStatus(status) {
    // Status parametresi: 'all', 'prepared', 'approved', 'rejected'
    const statusMap = {
      all: 'btnAll',
      prepared: 'btnPrepared',
      approved: 'btnApproved',
      rejected: 'btnRejected',
    };

    const buttonId = statusMap[status] || 'btnAll';
    console.log(`Programatik olarak ${buttonId} filtresi seçiliyor...`);

    // Tüm butonlardan aktif sınıfını kaldır
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.remove('active');
    });

    // İlgili butonu seç ve aktif yap
    const targetButton = document.getElementById(buttonId);
    if (targetButton) {
      targetButton.classList.add('active');
      console.log(`${buttonId} filtresi aktif edildi`);

      // Filtreleri uygula
      this.applyFilters();
      return true;
    } else {
      console.warn(`${buttonId} butonu bulunamadı!`);
      return false;
    }
  }

  // Teklif verilerini işle
  processQuotes(quotes) {
    if (!quotes || !Array.isArray(quotes)) {
      console.error('Geçersiz teklif verisi:', quotes);
      return [];
    }

    return quotes
      .map((quote) => {
        // Teklif null kontrolü
        if (!quote) return null;

        // Kendi datasını koruma
        const processedQuote = { ...quote };

        // Eksik alanları doldur
        if (!processedQuote.preparedBy && processedQuote.prepared_by) {
          // prepared_by alanı numeric ise kullanıcı adına dönüştür
          if (
            typeof processedQuote.prepared_by === 'number' ||
            /^\d+$/.test(processedQuote.prepared_by)
          ) {
            const userId = parseInt(processedQuote.prepared_by);
            // Mevcut kullanıcıları kontrol et
            const user = window.app?.users?.find((u) => u.id === userId);
            if (user) {
              processedQuote.preparedBy = user.full_name;
            } else {
              processedQuote.preparedBy = 'Kullanıcı #' + userId;
            }
          } else {
            processedQuote.preparedBy = processedQuote.prepared_by;
          }
        }

        // Fiyat formatını düzelt
        if (processedQuote.total_price && !processedQuote.totalPrice) {
          processedQuote.totalPrice =
            typeof processedQuote.total_price === 'number'
              ? `${processedQuote.total_price.toFixed(2)} USD`
              : processedQuote.total_price;
        }

        return processedQuote;
      })
      .filter(Boolean); // null veya undefined değerleri filtrele
  }

  // Kullanıcı verilerini yükle
  async loadUsers() {
    try {
      console.log('Kullanıcı verileri yükleniyor...');
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${window.location.origin}/api/users`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        this.users = data.data;
        console.log(`${this.users.length} kullanıcı başarıyla yüklendi`);

        // Create local app data object instead of assigning to window.app
        try {
          if (!window.appData) {
            window.appData = {};
          }
          window.appData.users = this.users;
        } catch (windowError) {
          console.warn('Window property could not be set:', windowError);
          // Continue without setting the global property
        }

        // Kullanıcı ID -> Adı dönüşüm tablosu oluştur
        this.userIdToNameMap = {};
        this.users.forEach((user) => {
          // ID hem string hem number olarak kaydet
          this.userIdToNameMap[user.id] = user.full_name;
          this.userIdToNameMap[String(user.id)] = user.full_name;
        });

        console.log(
          'Kullanıcı ID -> Ad eşleştirme tablosu oluşturuldu:',
          Object.keys(this.userIdToNameMap).length + ' kayıt'
        );

        // İlk birkaç kaydı göster
        const preview = Object.entries(this.userIdToNameMap).slice(0, 3);
        console.log('Örnek kullanıcı ID-ad eşleştirmeleri:', preview);
      } else {
        console.warn('Kullanıcı verileri alınamadı:', data);
        // Varsayılan bazı kullanıcılar tanımla (hata durumu için)
        this.users = [
          {
            id: 1,
            username: 'ahmet',
            full_name: 'Ahmet Yılmaz',
            department: 'Satis',
          },
          {
            id: 2,
            username: 'mehmet',
            full_name: 'Mehmet Kaya',
            department: 'Teknik',
          },
          {
            id: 3,
            username: 'test',
            full_name: 'Test User',
            department: 'Satis',
          },
          {
            id: 6,
            username: 'kemal',
            full_name: 'Kemal Sunal',
            department: 'Satis',
          },
        ];

        // Varsayılan kullanıcılarla eşleştirme tablosu oluştur
        this.userIdToNameMap = {};
        this.users.forEach((user) => {
          this.userIdToNameMap[user.id] = user.full_name;
          this.userIdToNameMap[String(user.id)] = user.full_name;
        });
      }

      return this.users;
    } catch (error) {
      console.error('Kullanıcı verileri yüklenirken hata:', error);
      return [];
    }
  }

  // Kullanıcı ID'sinden tam adı getir - daha güvenilir hale getirildi
  getUserNameById(userId) {
    if (!userId) return 'Kullanıcı bilinmiyor';

    // userId'yi string olarak da kontrol et
    const userIdStr = String(userId).trim();

    // Debug: Ne tür bir userId alındı?
    console.log(
      `getUserNameById çağrıldı. userId: ${userId}, type: ${typeof userId}`
    );

    // 1. Önce userIdToNameMap'te direkt kontrol
    if (this.userIdToNameMap && this.userIdToNameMap[userId]) {
      console.log(
        `${userId} -> ${this.userIdToNameMap[userId]} (direkt eşleşme)`
      );
      return this.userIdToNameMap[userId];
    }

    // 2. String versiyonunda kontrol
    if (this.userIdToNameMap && this.userIdToNameMap[userIdStr]) {
      console.log(
        `${userId} -> ${this.userIdToNameMap[userIdStr]} (string eşleşme)`
      );
      return this.userIdToNameMap[userIdStr];
    }

    // 3. Eğer map'te yoksa, users array'inde ara
    if (Array.isArray(this.users)) {
      // Önce tam eşleşme ara
      const exactMatch = this.users.find(
        (u) => u.id === userId || String(u.id) === userIdStr
      );
      if (exactMatch && exactMatch.full_name) {
        console.log(
          `${userId} -> ${exactMatch.full_name} (users array eşleşme)`
        );
        // Eşleştirme tablosuna ekle (gelecekteki kullanımlar için)
        this.userIdToNameMap = this.userIdToNameMap || {};
        this.userIdToNameMap[userId] = exactMatch.full_name;
        this.userIdToNameMap[userIdStr] = exactMatch.full_name;
        return exactMatch.full_name;
      }
    }

    // 4. ID sayısal değil ve kullanıcı adı gibi görünüyorsa direkt döndür
    if (isNaN(userId) && typeof userId === 'string' && userId.length > 2) {
      console.log(
        `${userId} bir kullanıcı adı olabilir, olduğu gibi döndürülüyor`
      );
      return userId;
    }

    // 5. Hiçbir şekilde bulunamazsa ID'yi döndür
    console.warn(`${userId} için kullanıcı adı bulunamadı`);
    return `Kullanıcı #${userId}`;
  }

  // Filtre butonlarına doğrudan olay dinleyicileri ekle
  setupFilterEventHandlers() {
    console.log('Filtreleme sistemi yeniden yapılandırılıyor...');

    // Tüm filtre butonlarını bul
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      // Önce mevcut olay dinleyicilerini temizle (klonlama ile)
      const newBtn = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }

      // Her bir butona doğrudan tıklama olayı ekle
      newBtn.addEventListener('click', (e) => {
        console.log(`Filtre butonu tıklandı: ${newBtn.id}`);

        // Tüm butonların "active" sınıfını kaldır
        document.querySelectorAll('.filter-btn').forEach((b) => {
          b.classList.remove('active');
        });

        // Tıklanan butona "active" sınıfı ekle
        newBtn.classList.add('active');

        // Hemen filtreleme işlemini başlat
        this.applyFilters();
      });
    });

    // Arama kutusuna event listener ekle
    if (this.searchInput) {
      console.log('Arama kutusu için olay dinleyici ekleniyor');

      const newSearchInput = this.searchInput.cloneNode(true);
      if (this.searchInput.parentNode) {
        this.searchInput.parentNode.replaceChild(
          newSearchInput,
          this.searchInput
        );
        this.searchInput = newSearchInput;
      }

      this.searchInput.addEventListener('input', () => {
        console.log('Arama kutusu değişti:', this.searchInput.value);
        this.debounceSearch();
      });

      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          console.log('Enter tuşuna basıldı, filtreleniyor');
          setTimeout(() => this.applyFilters(), 0); // Async yap
        }
      });
    }

    // Tarih filtrelerine event listener ekle
    if (this.startDate) {
      console.log('Başlangıç tarihi için olay dinleyici ekleniyor');

      const newStartDate = this.startDate.cloneNode(true);
      if (this.startDate.parentNode) {
        this.startDate.parentNode.replaceChild(newStartDate, this.startDate);
        this.startDate = newStartDate;
      }

      this.startDate.addEventListener('change', () => {
        console.log('Başlangıç tarihi değişti:', this.startDate.value);
        setTimeout(() => this.applyFilters(), 0); // Async yap
      });
    }

    if (this.endDate) {
      console.log('Bitiş tarihi için olay dinleyici ekleniyor');

      const newEndDate = this.endDate.cloneNode(true);
      if (this.endDate.parentNode) {
        this.endDate.parentNode.replaceChild(newEndDate, this.endDate);
        this.endDate = newEndDate;
      }

      this.endDate.addEventListener('change', () => {
        console.log('Bitiş tarihi değişti:', this.endDate.value);
        setTimeout(() => this.applyFilters(), 0); // Async yap
      });
    }

    // Temizle butonuna event listener ekle
    if (this.clearFiltersBtn) {
      console.log('Temizle butonu için olay dinleyici ekleniyor');

      const newClearBtn = this.clearFiltersBtn.cloneNode(true);
      if (this.clearFiltersBtn.parentNode) {
        this.clearFiltersBtn.parentNode.replaceChild(
          newClearBtn,
          this.clearFiltersBtn
        );
        this.clearFiltersBtn = newClearBtn;
      }

      this.clearFiltersBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Filtreleri temizle butonuna tıklandı');
        setTimeout(() => this.resetFilters(), 0); // Async yap
      });
    }

    console.log('Tüm filtre olay dinleyicileri eklendi');
  }

  // Filtre türü seçme fonksiyonu
  selectFilterStatus(status) {
    console.log(`Filtre durumu seçildi: ${status}`);

    // Tüm filtre butonlarını bul
    const buttons = document.querySelectorAll('.filter-btn');

    // Tüm butonlardan active sınıfını kaldır
    buttons.forEach((btn) => btn.classList.remove('active'));

    // Seçilen duruma göre ilgili butonu aktifleştir
    let selectedBtn;
    switch (status) {
      case 'pending':
        selectedBtn = document.getElementById('btnPending');
        break;
      case 'approved':
        selectedBtn = document.getElementById('btnApproved');
        break;
      case 'rejected':
        selectedBtn = document.getElementById('btnRejected');
        break;
      case 'all':
      default:
        selectedBtn = document.getElementById('btnAll');
        break;
    }

    if (selectedBtn) {
      selectedBtn.classList.add('active');
    }

    // Filtreleri uygula
    this.applyFilters();
  }

  // Canvas elementlerini hazırlama metodu
  prepareChartCanvases() {
    // Canvas elementlerinin hazır ve düzgün boyutta olduğundan emin ol
    const chartCanvases = [
      'monthlyTrendChart',
      'quotesTrendChart',
      'userPerformanceChart',
      'quoteStatusDistributionChart',
      'statusDistributionChart',
      'userPerformanceRadarChart',
      'monthlyComparisonChart',
      'userMonthlyTrendChart',
      'targetTrackingChart',
      'customerCountryDistributionChart',
    ];

    console.log('Grafik canvas elementleri hazırlanıyor...');

    chartCanvases.forEach((canvasId) => {
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        // Canvas'ı sıfırla ve hazırla
        const container = canvas.parentElement;

        // Canvas'ı doğru boyuta ayarla
        if (container) {
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight || 300;

          // Canvas boyutlarını ayarla
          canvas.width = containerWidth;
          canvas.height = containerHeight;

          console.log(
            `Canvas ${canvasId} hazırlandı: ${containerWidth}x${containerHeight}`
          );
        }
      }
    });
  }

  // Tek bir event binding fonksiyonu oluştur
  bindFilterEvents() {
    // Tüm filtre butonları için tek bir olay dinleyicisi
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', this.handleFilterButtonClick.bind(this));
    });

    // Arama kutusu
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounceSearch.bind(this));
    }

    // Tarih filtreleri
    document
      .getElementById('startDate')
      ?.addEventListener('change', this.applyFilters.bind(this));
    document
      .getElementById('endDate')
      ?.addEventListener('change', this.applyFilters.bind(this));

    // Export butonları
    document.getElementById('exportExcel')?.addEventListener('click', () => this.exportToExcel());
    document.getElementById('exportPDF')?.addEventListener('click', () => this.exportToPDF());

    // Yıl filtresi
    document.getElementById('yearFilter')?.addEventListener('change', (e) => {
      this.applyYearFilter(e.target.value);
    });

    // Pagination butonları
    document.getElementById('firstPage')?.addEventListener('click', () => this.goToPage(1));
    document.getElementById('prevPage')?.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    document.getElementById('nextPage')?.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    document.getElementById('lastPage')?.addEventListener('click', () => this.goToPage(this.totalPages));
  }

  // Debounce işlevi
  debounceSearch(event) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }
}

// Ana uygulamayı başlat
let dashboardManager;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  // Window kontrolleri
  const minimizeBtn = document.querySelector('.window-button.minimize');
  const maximizeBtn = document.querySelector('.window-button.maximize');
  const closeBtn = document.querySelector('.window-button.close');

  if (minimizeBtn) {
    minimizeBtn.onclick = () => window.app.minimize();
  }

  if (maximizeBtn) {
    maximizeBtn.onclick = () => window.app.maximize();
  }

  if (closeBtn) {
    closeBtn.onclick = () => window.app.close();
  }

  // Dashboard manager'ı başlat (yalnızca bir kez)
  dashboardManager = new DashboardManager();

  // Global değişkene ata (widget'lar için)
  window._dashboardManagerInstance = dashboardManager;
});
