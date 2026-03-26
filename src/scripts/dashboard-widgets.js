// src/scripts/dashboard-widgets.js

/**
 * Canvas üzerindeki Chart.js instance'ını güvenli şekilde yok eder.
 * Chart.getChart() ile internal registry'i kontrol eder, global değişkeni de temizler.
 */
function destroyChartOnCanvas(canvasId, globalKey) {
  try {
    const canvas = document.getElementById(canvasId);
    if (canvas && typeof Chart !== 'undefined' && Chart.getChart) {
      const existing = Chart.getChart(canvas);
      if (existing) existing.destroy();
    }
    if (globalKey && window[globalKey]) {
      if (typeof window[globalKey].destroy === 'function') window[globalKey].destroy();
      window[globalKey] = null;
    }
  } catch (e) { /* ignore */ }
}

/** Chart.js ve overlay için tema renkleri */
function getChartThemeColors() {
  const root = document.documentElement;
  const text = getComputedStyle(root).getPropertyValue('--text-primary').trim() || '#0f172a';
  const grid = getComputedStyle(root).getPropertyValue('--border-color').trim() || '#e2e8f0';
  const overlay = 'rgba(241, 245, 249, 0.95)';
  return { text, grid, overlay };
}

// API'den verileri al veya mock veri kullan
async function fetchDashboardData() {
  try {
    // API istekleri yapmayı deneyelim, ama hata alırsak mock verilerle devam edelim
    let users = [];
    let quotes = [];

    try {
      // REST API istekleri
      const BASE = window.location.origin;
      const _wToken = localStorage.getItem('authToken');
      const _wAuthHeader = _wToken ? { Authorization: `Bearer ${_wToken}` } : {};
      const usersResponse = await fetch(`${BASE}/api/users`, { headers: { 'Content-Type': 'application/json', ..._wAuthHeader } });
      const quotesResponse = await fetch(`${BASE}/api/quotes`, { headers: { 'Content-Type': 'application/json', ..._wAuthHeader } });

      const usersData = await usersResponse.json();
      const quotesData = await quotesResponse.json();

      // API yanıt formatını kontrol et (success ve data alanları)
      if (usersData.success && usersData.data) {
        users = usersData.data;
        console.log('Kullanıcı verileri başarıyla alındı:', users.length);
      }

      if (quotesData.success && quotesData.data) {
        quotes = quotesData.data;
        console.log('Teklif verileri başarıyla alındı:', quotes.length);
      } else {
        console.warn('API yanıtı geçerli veri içermiyor:', quotesData);
      }
    } catch (err) {
      console.warn('API istekleri başarısız, mock veriler kullanılıyor:', err);

      // Mock veriler (backend yoksa)
      users = [
        {
          id: 1,
          username: 'ahmet',
          full_name: 'Ahmet Yilmaz',
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

      quotes = [
        {
          id: 12,
          number: 'TKF153',
          prepared_by: 'Kemal Sunal',
          total_price: 43576.72,
          status: 'ONAYLANDI',
          date: '2025-03-13T16:33:15',
        },
        {
          id: 4,
          number: 'QQQQQQQQQQQ',
          prepared_by: 'Kemal Sunal',
          total_price: 5208.0,
          status: 'ONAYLANDI',
          date: '2025-02-25T15:04:21',
        },
        {
          id: 13,
          number: 'koıuy7tyıuo',
          prepared_by: 'Ahmet Yilmaz',
          total_price: 2474.34,
          status: 'ONAYLANDI',
          date: '2025-03-16T23:49:36',
        },
        {
          id: 3,
          number: 'aaaaa',
          prepared_by: 'Ahmet Yilmaz',
          total_price: 9493.76,
          status: 'ONAYLANDI',
          date: '2025-02-25T14:49:43',
        },
        {
          id: 6,
          number: 'qwrokkjqnwlrşq',
          prepared_by: 'Ahmet Yilmaz',
          total_price: 13847.68,
          status: 'ONAYLANDI',
          date: '2025-02-25T15:29:04',
        },
        {
          id: 7,
          number: 'aaaaaaaaaaaaaaaaaa2',
          prepared_by: 'Ahmet Yilmaz',
          total_price: 1852.8,
          status: 'HAZIRLANDI',
          date: '2025-02-26T09:27:17',
        },
        {
          id: 5,
          number: 'qw56r23saf',
          prepared_by: 'Ahmet Yilmaz',
          total_price: 8675.6,
          status: 'REDDEDILDI',
          date: '2025-02-25T15:11:25',
        },
      ];
    }

    // Dashboard'u doldur
    populateDashboard(users, quotes);
  } catch (err) {
    console.error('Dashboard verilerini yüklerken hata oluştu:', err);
    // Hata mesajı göster
    document.querySelector('.dashboard-container').innerHTML = `
      <div class="error-message">
        <h3>Veri yüklenirken hata oluştu</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// Dashboard verilerini doldur
function populateDashboard(users, quotes) {
  try {
    // Temel istatistikleri hesapla
    const totalQuotes = quotes.length;
    const approvedQuotes = quotes.filter(
      (q) => q.status === 'ONAYLANDI'
    ).length;
    const totalValue = quotes.reduce(
      (sum, q) => sum + parseFloat(q.total_price || 0),
      0
    );
    const approvedValue = quotes
      .filter((q) => q.status === 'ONAYLANDI')
      .reduce((sum, q) => sum + parseFloat(q.total_price || 0), 0);
    const avgQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;
    const activeUsers = users.filter((u) => u.department === 'Satis').length;

    // Bu ay içindeki teklifler
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thisMonthQuotes = quotes.filter((q) => {
      const quoteDate = new Date(q.date);
      return (
        quoteDate.getMonth() === currentMonth &&
        quoteDate.getFullYear() === currentYear
      );
    }).length;

    // Özet kartlarını doldur - Her bir element için null kontrolü
    const updateElement = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) {
        element.textContent = value;
      } else {
        console.warn(`Element bulunamadı: ${selector}`);
      }
    };

    const updateElementById = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      } else {
        console.warn(`Element bulunamadı: #${id}`);
      }
    };

    // Özet bilgilerini güncelle
    updateElement('.total-quotes', totalQuotes);
    updateElement('.approved-quotes', approvedQuotes);
    updateElement('.total-value', `${totalValue.toLocaleString('en-US')} USD`);
    updateElement('.active-users', activeUsers);

    updateElementById('thisMonthQuotes', thisMonthQuotes);
    updateElementById(
      'approvalRate',
      `${Math.round((approvedQuotes / totalQuotes) * 100 || 0)}%`
    );
    updateElementById(
      'avgQuoteValue',
      `${avgQuoteValue.toLocaleString('en-US')} USD`
    );
    updateElementById('salesTeamCount', activeUsers);

    // Grafikleri oluştur
    setTimeout(() => {
      createMonthlyTrendChart(quotes);
      createStatusDistributionChart(quotes);
      createCustomerCountryDistributionChart();
    }, 100);

    // Tabloları doldur
    populateUserPerformanceTable(users, quotes);
    populateRecentQuotesTable(quotes);
  } catch (err) {
    console.error('Dashboard verilerini doldururken hata oluştu:', err);
  }
}

// Aylık teklif trendi grafiği
function createMonthlyTrendChart(quotes) {
  try {
    // Canvas elementini kontrol et
    const chartCanvas = document.getElementById('quotesTrendChart');
    if (!chartCanvas) {
      console.warn('quotesTrendChart canvas bulunamadı');
      return;
    }

    // Eğer canvas üzerinde zaten bir chart varsa onu temizle
    destroyChartOnCanvas('quotesTrendChart', 'trendChart');

    // Ay bazında teklif sayılarını hesapla
    const monthlyData = {};

    quotes.forEach((quote) => {
      const date = new Date(quote.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, approved: 0 };
      }

      monthlyData[monthKey].total++;

      if (quote.status === 'ONAYLANDI') {
        monthlyData[monthKey].approved++;
      }
    });

    // Son 6 ayı sırala ve grafiğe hazırla
    const sortedMonths = Object.keys(monthlyData).sort().slice(-6);

    const labels = sortedMonths.map((month) => {
      const [year, monthNum] = month.split('-');
      return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString(
        'tr-TR',
        { month: 'short', year: 'numeric' }
      );
    });

    const totalData = sortedMonths.map((month) => monthlyData[month].total);
    const approvedData = sortedMonths.map(
      (month) => monthlyData[month].approved
    );

    // Grafik arka plan ve çizgi renklerini ayarla
    const bgColors = {
      total: 'rgba(13, 116, 231, 0.1)',
      approved: 'rgba(76, 175, 80, 0.1)',
    };

    const borderColors = {
      total: '#0D74E7',
      approved: '#4CAF50',
    };

    // Canvas hazırsa grafiği oluştur
    try {
      const ctx = chartCanvas.getContext('2d');
      const chartColors = getChartThemeColors();

      window.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Toplam Teklif',
              data: totalData,
              borderColor: borderColors.total,
              backgroundColor: bgColors.total,
              tension: 0.4,
              fill: true,
            },
            {
              label: 'Onaylanan Teklif',
              data: approvedData,
              borderColor: borderColors.approved,
              backgroundColor: bgColors.approved,
              tension: 0.4,
              fill: true,
            },
          ],
        },
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
              mode: 'index',
              intersect: false,
            },
          },
          scales: {
            x: {
              ticks: {
                color: chartColors.text,
              },
              grid: {
                color: chartColors.grid,
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
                color: chartColors.text,
              },
              grid: {
                color: chartColors.grid,
              },
            },
          },
        },
      });
    } catch (err) {
      console.error('Teklif trend grafiği oluşturulurken hata:', err);
    }
  } catch (err) {
    console.error('Trend grafiği fonksiyonunda hata:', err);
  }
}

// Durum dağılımı grafiği
function createStatusDistributionChart(quotes) {
  try {
    // Canvas elementini kontrol et
    const chartCanvas = document.getElementById('statusDistributionChart');
    if (!chartCanvas) {
      console.warn('statusDistributionChart canvas bulunamadı');
      return;
    }

    // Eğer canvas üzerinde zaten bir chart varsa onu temizle
    destroyChartOnCanvas('statusDistributionChart', 'statusChart');

    // Durum sayılarını hesapla
    const statusCounts = {
      HAZIRLANDI: 0,
      ONAYLANDI: 0,
      REDDEDILDI: 0,
    };

    quotes.forEach((quote) => {
      if (statusCounts[quote.status] !== undefined) {
        statusCounts[quote.status]++;
      }
    });

    // Renkleri ve etiketleri tanımla
    const statusLabels = ['Hazırlanan', 'Onaylanan', 'Reddedilen'];
    const statusColors = ['#FFA500', '#4CAF50', '#FF3333'];

    // Canvas hazırsa grafiği oluştur
    try {
      const ctx = chartCanvas.getContext('2d');

      window.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [
            {
              data: [
                statusCounts['HAZIRLANDI'],
                statusCounts['ONAYLANDI'],
                statusCounts['REDDEDILDI'],
              ],
              backgroundColor: statusColors,
              borderColor: statusColors,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#FFFFFF',
                padding: 20,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total
                    ? Math.round((value / total) * 100)
                    : 0;
                  return `${label}: ${value} (${percentage}%)`;
                },
              },
            },
          },
          cutout: '70%',
        },
      });
    } catch (err) {
      console.error('Durum dağılımı grafiği oluşturulurken hata:', err);
    }
  } catch (err) {
    console.error('Durum grafiği fonksiyonunda hata:', err);
  }
}

// Global kullanıcı ID -> ad dönüşüm fonksiyonu
function getUserNameFromId(userId, users) {
  if (!userId) return 'Bilinmiyor';

  // ID bir sayı değilse doğrudan dön
  if (isNaN(parseInt(userId))) return userId;

  // Sayısal ID'yi int'e çevir
  const id = parseInt(userId);

  // users array'inde ara
  const user = users.find((u) => u.id === id);
  if (user && user.full_name) {
    return user.full_name;
  }

  // Window.app.users'da ara (varsa)
  if (window.app && Array.isArray(window.app.users)) {
    const appUser = window.app.users.find((u) => u.id === id);
    if (appUser && appUser.full_name) {
      return appUser.full_name;
    }
  }

  // Bulunamazsa ID'yi döndür
  return `Kullanıcı #${id}`;
}

// Kullanıcı performans tablosu
function populateUserPerformanceTable(users, quotes) {
  try {
    // Her kullanıcı için performans verileri
    const userPerformance = {};

    // Satış departmanı kullanıcıları
    const salesUsers = users.filter((user) => user.department === 'Satis');

    // Tam ad olarak bilinen kullanıcıları başlat
    salesUsers.forEach((user) => {
      userPerformance[user.full_name] = {
        name: user.full_name,
        totalQuotes: 0,
        approvedQuotes: 0,
        totalValue: 0,
        approvedValue: 0,
        successRate: 0,
      };
    });

    // Teklifleri işle
    quotes.forEach((quote) => {
      // Kullanıcı adını doğru şekilde al
      let userName;

      // Öncelik sırası: prepared_by_name -> ID'den kullanıcı adı -> prepared_by
      if (
        quote.prepared_by_name &&
        quote.prepared_by_name !== quote.prepared_by
      ) {
        userName = quote.prepared_by_name;
      } else if (quote.prepared_by) {
        // Global fonksiyonu kullanarak ID -> isim dönüşümü yap
        userName = getUserNameFromId(quote.prepared_by, users);
      } else {
        userName = 'Bilinmiyor';
      }

      // Kullanıcı yoksa ekle (performans verisi için)
      if (!userPerformance[userName]) {
        userPerformance[userName] = {
          name: userName,
          totalQuotes: 0,
          approvedQuotes: 0,
          totalValue: 0,
          approvedValue: 0,
          successRate: 0,
        };
      }

      userPerformance[userName].totalQuotes++;
      userPerformance[userName].totalValue += parseFloat(
        quote.total_price || 0
      );

      if (quote.status === 'ONAYLANDI') {
        userPerformance[userName].approvedQuotes++;
        userPerformance[userName].approvedValue += parseFloat(
          quote.total_price || 0
        );
      }
    });

    // Başarı oranlarını hesapla
    Object.values(userPerformance).forEach((user) => {
      user.successRate =
        user.totalQuotes > 0
          ? ((user.approvedQuotes / user.totalQuotes) * 100).toFixed(1)
          : 0;
    });

    // Onaylanan teklif sayısına göre sırala
    const sortedPerformance = Object.values(userPerformance).sort(
      (a, b) => b.approvedValue - a.approvedValue
    );

    // Tabloyu doldur
    const tableBody = document.getElementById('userPerformanceTable');
    if (!tableBody) {
      console.warn('userPerformanceTable tablosu bulunamadı');
      return;
    }

    tableBody.innerHTML = '';

    // Konsola ilk birkaç kullanıcının bilgilerini yaz
    console.log(
      'Kullanıcı performans verisi (ilk 3):',
      sortedPerformance.slice(0, 3)
    );

    sortedPerformance.forEach((user) => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.totalQuotes}</td>
        <td>${user.approvedQuotes}</td>
        <td>${user.totalValue.toLocaleString('en-US')} USD</td>
        <td>${user.approvedValue.toLocaleString('en-US')} USD</td>
        <td>${user.successRate}%</td>
      `;

      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error('Kullanıcı performans tablosu oluşturulurken hata:', err);
  }
}

// Son teklifler tablosu
function populateRecentQuotesTable(quotes) {
  // Bu bölüm kullanıcı isteği ile devre dışı bırakıldı
  console.log('Son teklifler tablosu devre dışı bırakıldı');
}

// Sayfa yüklendiğinde çalıştır, ama dashboard.js'nin önce yüklenmesi için kısa bir gecikme ekle
document.addEventListener('DOMContentLoaded', () => {
  // Dashboard.js'nin önce yüklenmesi için 300ms bekle
  setTimeout(fetchDashboardData, 300);
});

// Teklif detaylarını görüntüleme fonksiyonu (daha sonra eklenecek)
function viewQuoteDetails(quoteId) {
  console.log('Görüntüleniyor:', quoteId);
  // Burada teklif detaylarını gösteren bir modal açılabilir
}

// İleri düzey dashboard fonksiyonları (widgets.js)
// Bu modül, dashboard.js ile birlikte çalışacak şekilde ayarlanmıştır
// ve ana dashboard yapısını bozmadan yeni dashboard bileşenleri eklemeyi amaçlar.

/**
 * Dashboard.js ile entegre çalışan widget sistemi.
 * dashboard.js'nin yüklenmesini bekler ve ona referans alarak çalışır.
 */
class DashboardWidgets {
  constructor() {
    // Ayarlar
    this.initialized = false;
    this.charts = {};
    this.retryCount = 0;
    this.maxRetries = 10;

    // DOM'un yüklenmesini bekle
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      // DOM zaten yüklendiyse hemen başlat
      setTimeout(() => this.initialize(), 100);
    }
  }

  /**
   * Widgets'ları başlat
   */
  async initialize() {
    try {
      console.log('Dashboard Widgets başlatılıyor...');

      // Mock veri kullanıp kullanmamayı belirle
      this.useMockData();

      // Verileri getir
      await this.fetchData();

      // Dashboard'u iyileştir
      this.enhanceDashboardUI();

      // İstatistikleri güncelle
      this.updateStatistics();

      // Chart.js grafiklerini başlat
      this.initializeAdvancedCharts();

      // Kullanıcı tablosunu doldur
      this.populateUserPerformanceTable();

      // Müşteri ülke dağılımı grafiğini oluştur
      this.createCustomerCountryDistributionChart();

      // Olay dinleyicileri ekle
      this.setupEventListeners();

      // Yükleniyor animasyonunu kaldır
      document.querySelector('.loading-indicator')?.remove();

      // Otomatik yenileme başlat
      this.startAutoRefresh();

      console.log('Dashboard widgets başarıyla başlatıldı');
    } catch (error) {
      console.error('Dashboard başlatma hatası:', error);
    }
  }

  /**
   * API'den verileri al
   */
  async fetchData() {
    try {
      // REST API istekleri
      this.users = [];
      this.quotes = [];

      console.log('API verisi alınıyor...');

      try {
        // Users verisi
        try {
          const _uToken = localStorage.getItem('authToken');
          const usersResponse = await fetch(`${window.location.origin}/api/users`, {
            headers: { 'Content-Type': 'application/json', ...(_uToken ? { Authorization: `Bearer ${_uToken}` } : {}) },
          });

          if (usersResponse.ok) {
            const usersData = await usersResponse.json();

            if (usersData.success && Array.isArray(usersData.data)) {
              this.users = usersData.data;
              console.log(
                'Kullanıcı verileri başarıyla alındı:',
                this.users.length
              );
            } else {
              console.warn(
                'API kullanıcı yanıtı geçerli veri içermiyor:',
                usersData
              );
              throw new Error('API kullanıcı yanıtı geçerli veri içermiyor.');
            }
          } else {
            console.warn(
              `Kullanıcı verileri alınamadı: ${usersResponse.status}`
            );
            throw new Error(
              `Kullanıcı verileri alınamadı: ${usersResponse.status}`
            );
          }
        } catch (userError) {
          console.warn('Kullanıcı verileri alınırken hata:', userError);
          throw userError;
        }

        // Quotes verisi
        try {
          // API URL'ini window.location.origin'den al
          const apiUrl = `${window.location.origin}/api/quotes?limit=1000`;
          console.log('Kullanılan quotes API URL:', apiUrl);

          const _qToken = localStorage.getItem('authToken');
          const quotesResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              ...(_qToken ? { Authorization: `Bearer ${_qToken}` } : {}),
            },
            credentials: 'same-origin',
          });

          if (!quotesResponse.ok) {
            console.warn(`Teklif verileri alınamadı: ${quotesResponse.status}`);
            throw new Error(
              `Teklif verileri alınamadı: ${quotesResponse.status}`
            );
          }

          const quotesData = await quotesResponse.json();
          console.log('API quotes yanıtı:', quotesData);

          if (!quotesData.success || !Array.isArray(quotesData.data)) {
            console.warn(
              'API teklif yanıtı geçerli veri içermiyor:',
              quotesData
            );
            throw new Error('API teklif yanıtı geçerli veri içermiyor.');
          }

          this.quotes = quotesData.data;
          console.log('Teklif verileri başarıyla alındı:', this.quotes.length);

          // İlk birkaç veriyi logla
          if (this.quotes.length > 0) {
            console.log('İlk 3 teklif örneği:', this.quotes.slice(0, 3));
          }
        } catch (quoteError) {
          console.warn('Teklif verileri alınırken hata:', quoteError);
          throw quoteError;
        }

        // Verileri konsola yazdırarak kontrol et
        console.log('Veriler yüklendi:', {
          users: this.users.length,
          quotes: this.quotes.length,
        });

        return { success: true };
      } catch (fetchError) {
        console.error('API veri alma hatası:', fetchError);
        // Hata durumunda kullanıcıya bilgi ver
        this.showApiError('API Bağlantı Hatası', fetchError.message);
        return { success: false, error: fetchError };
      }
    } catch (error) {
      console.error('Veri alınırken hata:', error);
      this.showApiError('Veri Alma Hatası', error.message);
      return { success: false, error: error };
    }
  }

  /**
   * Mock kullanıcı verileri döndür
   */
  getSampleUsers() {
    return [
      {
        id: 1,
        username: 'ahmet',
        full_name: 'Ahmet Yilmaz',
        department: 'Satis',
      },
      {
        id: 2,
        username: 'mehmet',
        full_name: 'Mehmet Kaya',
        department: 'Teknik',
      },
      { id: 3, username: 'test', full_name: 'Test User', department: 'Satis' },
      {
        id: 6,
        username: 'kemal',
        full_name: 'Kemal Sunal',
        department: 'Satis',
      },
    ];
  }

  /**
   * Mock teklif verileri döndür
   */
  getSampleQuotes() {
    return [
      {
        id: 12,
        number: 'TKF153',
        prepared_by: 'Kemal Sunal',
        total_price: 43576.72,
        status: 'ONAYLANDI',
        date: '2025-03-13T16:33:15',
      },
      {
        id: 4,
        number: 'QQQQQQQQQQQ',
        prepared_by: 'Kemal Sunal',
        total_price: 5208.0,
        status: 'ONAYLANDI',
        date: '2025-02-25T15:04:21',
      },
      {
        id: 13,
        number: 'koıuy7tyıuo',
        prepared_by: 'Ahmet Yilmaz',
        total_price: 2474.34,
        status: 'ONAYLANDI',
        date: '2025-03-16T23:49:36',
      },
      {
        id: 3,
        number: 'aaaaa',
        prepared_by: 'Ahmet Yilmaz',
        total_price: 9493.76,
        status: 'ONAYLANDI',
        date: '2025-02-25T14:49:43',
      },
      {
        id: 6,
        number: 'qwrokkjqnwlrşq',
        prepared_by: 'Ahmet Yilmaz',
        total_price: 13847.68,
        status: 'ONAYLANDI',
        date: '2025-02-25T15:29:04',
      },
      {
        id: 7,
        number: 'aaaaaaaaaaaaaaaaaa2',
        prepared_by: 'Ahmet Yilmaz',
        total_price: 1852.8,
        status: 'HAZIRLANDI',
        date: '2025-02-26T09:27:17',
      },
      {
        id: 5,
        number: 'qw56r23saf',
        prepared_by: 'Ahmet Yilmaz',
        total_price: 8675.6,
        status: 'REDDEDILDI',
        date: '2025-02-25T15:11:25',
      },
    ];
  }

  /**
   * Dashboard UI'ını iyileştir
   */
  enhanceDashboardUI() {
    try {
      console.log('Dashboard UI iyileştiriliyor...');

      // CSS değişiklikleri
      this.addCustomStyles();

      // Event listener'lar
      this.setupEventListeners();
    } catch (error) {
      console.error('UI iyileştirmeleri uygulanırken hata:', error);
    }
  }

  /**
   * Özel CSS stilleri ekle
   */
  addCustomStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* Dashboard geliştirmeleri */
      .stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        border-color: var(--accent-color);
        transition: all 0.3s ease;
      }
      
      .chart-container {
        transition: all 0.3s ease;
      }
      
      .chart-container:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
      }
      
      /* Tablo iyileştirmeleri */
      .teklif-table tr:hover {
        background-color: rgba(13, 116, 231, 0.1);
        transform: scale(1.01);
        transition: all 0.2s ease;
      }
    `;
    document.head.appendChild(styleEl);
  }

  /**
   * Event listener'ları ayarla
   */
  setupEventListeners() {
    // Veri yenileme için yenileme butonu ekle
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.innerHTML = '<i class="material-icons">refresh</i>';
    refreshButton.style.position = 'fixed';
    refreshButton.style.bottom = '20px';
    refreshButton.style.right = '20px';
    refreshButton.style.width = '50px';
    refreshButton.style.height = '50px';
    refreshButton.style.borderRadius = '50%';
    refreshButton.style.backgroundColor = 'var(--accent-color)';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.zIndex = '1000';

    refreshButton.addEventListener('mouseover', () => {
      refreshButton.style.transform = 'scale(1.1)';
    });

    refreshButton.addEventListener('mouseout', () => {
      refreshButton.style.transform = 'scale(1)';
    });

    refreshButton.addEventListener('click', () => {
      if (
        this.dashboardManager &&
        typeof this.dashboardManager.loadData === 'function'
      ) {
        refreshButton.style.animation = 'spin 1s linear infinite';
        this.dashboardManager.loadData().then(() => {
          refreshButton.style.animation = '';
          this.updateDashboardWidgets();
        });
      }
    });

    // Animasyon tanımı
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleElement);

    document.body.appendChild(refreshButton);
  }

  /**
   * Dashboard widget'larını güncelle
   */
  updateDashboardWidgets() {
    try {
      console.log("Dashboard widget'ları güncelleniyor...");

      // Verileri yeniden yükle
      if (!this.quotes || this.quotes.length === 0) {
        console.log('Veriler yükleniyor...');
        this.fetchData().then(() => {
          this.updateDashboardWidgetsAfterDataLoad();
        });
        return;
      }

      this.updateDashboardWidgetsAfterDataLoad();
    } catch (error) {
      console.error("Dashboard widget'ları güncellenirken hata:", error);
    }
  }

  /**
   * Veriler yüklendikten sonra widget'ları güncelle
   */
  updateDashboardWidgetsAfterDataLoad() {
    try {
      // İstatistikleri güncelle
      this.updateStatistics();

      // Kullanıcı performans tablosunu güncelle
      this.populateUserPerformanceTable();

      // Eski grafikleri temizle
      destroyChartOnCanvas('quotesTrendChart', 'trendChart');
      destroyChartOnCanvas('statusDistributionChart', 'statusChart');
      if (window._customerLeafletMap) {
        window._customerLeafletMap.remove();
        window._customerLeafletMap = null;
        const mc = document.getElementById('customerCountryDistributionChart');
        if (mc) mc.innerHTML = '';
      }

      // Grafikleri yeniden oluştur
      setTimeout(() => {
        this.createMonthlyTrendChart();
        this.createStatusDistributionChart();
        this.createCustomerCountryDistributionChart();
      }, 100);

      // İleri düzey grafikler
      this.initializeAdvancedCharts();

      console.log("Dashboard widget'ları güncellendi");
    } catch (error) {
      console.error("Dashboard widget'ları güncellenirken hata:", error);
    }
  }

  /**
   * İstatistikleri güncelle
   */
  updateStatistics() {
    try {
      console.log('İstatistikler güncelleniyor:', {
        quotes: this.quotes?.length || 0,
        users: this.users?.length || 0,
      });

      // Kontrol et: quotes verileri doğru şekilde yüklendi mi?
      if (!this.quotes || this.quotes.length === 0) {
        console.warn(
          'Henüz geçerli teklif verisi yok, istatistikler güncellenemiyor'
        );

        // Kullanıcıya bilgi ver
        const totalQuotesElem = document.querySelector('.total-quotes');
        if (totalQuotesElem)
          totalQuotesElem.innerHTML =
            '<span style="color:#f97316">Veri Yükleniyor...</span>';
        return;
      }

      // Verilerin ilk birkaçını loglayarak kontrol et
      console.log('Teklif verileri örnekleri:', this.quotes.slice(0, 3));

      // Temel istatistikleri hesapla
      const totalQuotes = this.quotes.length;
      const approvedQuotes = this.quotes.filter(
        (q) => q.status === 'ONAYLANDI'
      ).length;
      const totalValue = this.quotes.reduce(
        (sum, q) => sum + parseFloat(q.total_price || 0),
        0
      );
      const approvedValue = this.quotes
        .filter((q) => q.status === 'ONAYLANDI')
        .reduce((sum, q) => sum + parseFloat(q.total_price || 0), 0);
      const avgQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;
      const activeUsers = this.users.filter(
        (u) => u.department === 'Satis'
      ).length;

      // Bu ay içindeki teklifler
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const thisMonthQuotes = this.quotes.filter((q) => {
        const quoteDate = new Date(q.date);
        return (
          quoteDate.getMonth() === currentMonth &&
          quoteDate.getFullYear() === currentYear
        );
      }).length;

      console.log('Hesaplanan istatistikler:', {
        totalQuotes,
        approvedQuotes,
        totalValue,
        approvedValue,
        avgQuoteValue,
        activeUsers,
        thisMonthQuotes,
      });

      // Özet kartlarını doldur
      // querySelector yerine doğrudan getElementById kullanarak daha kesin erişim sağlayalım
      const updateElementContent = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) {
          element.textContent = value;
          console.log(`${selector} güncellendi:`, value);
        } else {
          console.warn(`Element bulunamadı: ${selector}`);
        }
      };

      // Bu kartlar widget-cards içinde yer alıyor, bu yüzden doğrudan class ismi ile erişim daha kesin
      updateElementContent('.total-quotes', totalQuotes);
      updateElementContent('.approved-quotes', approvedQuotes);
      updateElementContent(
        '.total-value',
        `${Number(totalValue).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD`
      );
      updateElementContent('.active-users', activeUsers);

      // İkincil bilgiler için ID kullanarak erişim
      const updateElementById = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = value;
          console.log(`#${id} güncellendi:`, value);
        } else {
          console.warn(`Element bulunamadı: #${id}`);
        }
      };

      updateElementById('thisMonthQuotes', thisMonthQuotes);
      updateElementById(
        'approvalRate',
        `${Math.round((approvedQuotes / totalQuotes) * 100 || 0)}%`
      );
      updateElementById(
        'avgQuoteValue',
        `${Math.round(avgQuoteValue).toLocaleString('en-US')} USD`
      );
      updateElementById('salesTeamCount', activeUsers);

      console.log('İstatistikler güncellendi');
    } catch (error) {
      console.error('İstatistikler güncellenirken hata:', error);

      // Hata durumunda kullanıcıya bilgi ver
      const elements = document.querySelectorAll(
        '.total-quotes, .approved-quotes, .total-value, .active-users'
      );
      elements.forEach((el) => {
        el.innerHTML = '<span style="color:#ef4444">Hata!</span>';
      });
    }
  }

  /**
   * Gelişmiş grafikler
   */
  initializeAdvancedCharts() {
    try {
      // Mevcut grafikler dashboard.js tarafından yönetiliyor
      // Burada özel grafikler eklenebilir
    } catch (error) {
      console.error('Gelişmiş grafikler oluşturulurken hata:', error);
    }
  }

  /**
   * Grafikleri temizle
   */
  disposeCharts() {
    try {
      // Chart.js nesnelerini temizle
      Object.values(this.charts).forEach((chart) => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      this.charts = {};

      // Global chart nesnelerini de temizle
      if (window.customerCountryChart && typeof window.customerCountryChart.destroy === 'function') {
        window.customerCountryChart.destroy();
        window.customerCountryChart = null;
      }
      // Leaflet haritasını temizle
      if (window._customerLeafletMap) {
        window._customerLeafletMap.remove();
        window._customerLeafletMap = null;
      }
    } catch (error) {
      console.error('Grafikler temizlenirken hata:', error);
    }
  }

  /**
   * Aylık teklif trendi grafiği
   */
  createMonthlyTrendChart() {
    try {
      // Canvas elementini kontrol et
      const chartCanvas = document.getElementById('monthlyTrendChart');
      if (!chartCanvas) {
        console.warn('monthlyTrendChart canvas bulunamadı');
        return;
      }

      // Eğer canvas üzerinde zaten bir chart varsa onu temizle
      destroyChartOnCanvas('monthlyTrendChart', 'trendChart');

      // Ay bazında teklif sayılarını hesapla
      const monthlyData = {};

      this.quotes.forEach((quote) => {
        const date = new Date(quote.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, approved: 0 };
        }

        monthlyData[monthKey].total++;

        if (quote.status === 'ONAYLANDI') {
          monthlyData[monthKey].approved++;
        }
      });

      // Son 6 ayı sırala ve grafiğe hazırla
      const sortedMonths = Object.keys(monthlyData).sort().slice(-6);

      const labels = sortedMonths.map((month) => {
        const [year, monthNum] = month.split('-');
        return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString(
          'tr-TR',
          { month: 'short', year: 'numeric' }
        );
      });

      const totalData = sortedMonths.map((month) => monthlyData[month].total);
      const approvedData = sortedMonths.map(
        (month) => monthlyData[month].approved
      );

      // Grafik arka plan ve çizgi renklerini ayarla
      const bgColors = {
        total: 'rgba(13, 116, 231, 0.1)',
        approved: 'rgba(76, 175, 80, 0.1)',
      };

      const borderColors = {
        total: '#0D74E7',
        approved: '#4CAF50',
      };

      // Canvas hazırsa grafiği oluştur
      try {
        const ctx = chartCanvas.getContext('2d');
        const chartColorsTrend = getChartThemeColors();

        window.trendChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Toplam Teklif',
                data: totalData,
                borderColor: borderColors.total,
                backgroundColor: bgColors.total,
                tension: 0.4,
                fill: true,
              },
              {
                label: 'Onaylanan Teklif',
                data: approvedData,
                borderColor: borderColors.approved,
                backgroundColor: bgColors.approved,
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: chartColorsTrend.text,
                },
              },
              tooltip: {
                mode: 'index',
                intersect: false,
              },
            },
            scales: {
              x: {
                ticks: {
                  color: chartColorsTrend.text,
                },
                grid: {
                  color: chartColorsTrend.grid,
                },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0,
                  color: chartColorsTrend.text,
                },
                grid: {
                  color: chartColorsTrend.grid,
                },
              },
            },
          },
        });
      } catch (err) {
        console.error('Teklif trend grafiği oluşturulurken hata:', err);
      }
    } catch (error) {
      console.error('Teklif trendi grafiği oluşturulurken hata:', error);
    }
  }

  /**
   * Teklif durumu dağılımı grafiği
   */
  createStatusDistributionChart() {
    try {
      // Canvas elementini kontrol et
      const chartCanvas = document.getElementById('quoteStatusDistributionChart');
      if (!chartCanvas) {
        console.warn('quoteStatusDistributionChart canvas bulunamadı');
        return;
      }

      // Eğer canvas üzerinde zaten bir chart varsa onu temizle
      destroyChartOnCanvas('quoteStatusDistributionChart', 'statusChart');

      // Durum bazında teklif sayılarını hesapla
      const statusCounts = {};

      this.quotes.forEach((quote) => {
        const status = quote.status || 'Belirsiz';
        if (!statusCounts[status]) {
          statusCounts[status] = 0;
        }
        statusCounts[status]++;
      });

      // Renkleri ve etiketleri tanımla
      const statusLabels = ['Hazırlanan', 'Onaylanan', 'Reddedilen'];
      const statusColors = ['#FFA500', '#4CAF50', '#FF3333'];

      // Canvas hazırsa grafiği oluştur
      try {
        const ctx = chartCanvas.getContext('2d');

        window.statusChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: statusLabels,
            datasets: [
              {
                data: [
                  statusCounts['HAZIRLANDI'],
                  statusCounts['ONAYLANDI'],
                  statusCounts['REDDEDILDI'],
                ],
                backgroundColor: statusColors,
                borderColor: statusColors,
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#FFFFFF',
                  padding: 20,
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = total
                      ? Math.round((value / total) * 100)
                      : 0;
                    return `${label}: ${value} (${percentage}%)`;
                  },
                },
              },
            },
            cutout: '70%',
          },
        });
      } catch (err) {
        console.error('Durum dağılımı grafiği oluşturulurken hata:', err);
      }
    } catch (error) {
      console.error('Durum dağılımı grafiği oluşturulurken hata:', error);
    }
  }

  /**
   * Kullanıcı performans tablosunu doldur
   */
  populateUserPerformanceTable() {
    try {
      const tableBody = document.getElementById('userPerformanceTable');
      if (!tableBody) {
        console.warn('userPerformanceTable bulunamadı');
        return;
      }

      // Tabloyu temizle
      tableBody.innerHTML = '';

      // Her kullanıcı için performans verileri
      const userStats = {};

      // Teklif verilerini işle
      this.quotes.forEach((quote) => {
        // Kullanıcı adını doğru şekilde al
        let userName;

        // Öncelik sırası: prepared_by_name -> ID'den kullanıcı adı -> prepared_by
        if (
          quote.prepared_by_name &&
          quote.prepared_by_name !== quote.prepared_by
        ) {
          userName = quote.prepared_by_name;
        } else if (quote.prepared_by) {
          // Global fonksiyonu kullanarak ID -> isim dönüşümü yap
          userName = getUserNameFromId(quote.prepared_by, this.users);
        } else {
          userName = 'Bilinmiyor';
        }

        // Kullanıcı yoksa ekle (performans verisi için)
        if (!userStats[userName]) {
          userStats[userName] = {
            name: userName,
            totalQuotes: 0,
            approvedQuotes: 0,
            totalValue: 0,
            approvedValue: 0,
            successRate: 0,
          };
        }

        // İstatistikleri güncelle
        userStats[userName].totalQuotes++;

        const price = parseFloat(quote.total_price) || 0;
        userStats[userName].totalValue += price;

        if (quote.status === 'ONAYLANDI') {
          userStats[userName].approvedQuotes++;
          userStats[userName].approvedValue += price;
        }
      });

      // Başarı oranını hesapla
      Object.values(userStats).forEach((user) => {
        user.successRate =
          user.totalQuotes > 0
            ? ((user.approvedQuotes / user.totalQuotes) * 100).toFixed(1)
            : 0;
      });

      // Onaylanan teklif değerine göre sırala
      const sortedPerformance = Object.values(userStats).sort(
        (a, b) => b.approvedValue - a.approvedValue
      );

      // Debug bilgisi
      console.log(
        'DashboardWidgets - Kullanıcı performans verisi:',
        sortedPerformance
      );

      // Tablo satırlarını oluştur
      sortedPerformance.forEach((user) => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${user.name}</td>
          <td>${user.totalQuotes}</td>
          <td>${user.approvedQuotes}</td>
          <td>${user.totalValue.toLocaleString('en-US')} USD</td>
          <td>${user.approvedValue.toLocaleString('en-US')} USD</td>
          <td>${user.successRate}%</td>
        `;

        tableBody.appendChild(row);
      });
    } catch (err) {
      console.error('Kullanıcı performans tablosu oluşturulurken hata:', err);
    }
  }

  /**
   * Son teklifler tablosunu doldur
   */
  populateRecentQuotesTable() {
    // Bu bölüm kullanıcı isteği ile devre dışı bırakıldı
    console.log('Son teklifler tablosu devre dışı bırakıldı');
  }

  /**
   * Teklif detaylarını görüntüle
   */
  viewQuoteDetails(quoteId) {
    // Teklif detayı görüntüleme fonksiyonu
    console.log(`Teklif detayı görüntüleniyor: ${quoteId}`);
    // Burada teklif detay modalı açılabilir
  }

  /**
   * Mock veri oluştur
   */
  useMockData() {
    this.users = this.getSampleUsers();
    this.quotes = this.getSampleQuotes();
    console.log('Mock veriler oluşturuldu');
  }

  /**
   * Müşteri ülke dağılımı — Leaflet interaktif harita
   */
  async createCustomerCountryDistributionChart() {
    try {
      const mapContainer = document.getElementById(
        'customerCountryDistributionChart'
      );
      if (!mapContainer) {
        console.warn('customerCountryDistributionChart container bulunamadı');
        return;
      }

      // Önceki Leaflet haritasını temizle
      if (window._customerLeafletMap) {
        window._customerLeafletMap.remove();
        window._customerLeafletMap = null;
      }
      mapContainer.innerHTML = '';

      // Müşterileri dbService'den al
      let customers = [];
      let usedSampleData = false;

      try {
        console.log('Müşteri verileri alınıyor...');

        // IndexedDB'den müşterileri almayı dene
        if (
          window.dbService &&
          typeof window.dbService.getAllCustomers === 'function'
        ) {
          customers = await window.dbService.getAllCustomers();
          console.log(`IndexedDB'den ${customers.length} müşteri alındı`);
        }

        // Eğer IndexedDB'den veri alınamadıysa API'yi dene
        if (!customers || customers.length === 0) {
          console.log('IndexedDB verisi bulunamadı, API deneniyor...');
          try {
            const _cToken = localStorage.getItem('authToken');
            const response = await fetch(`${window.location.origin}/api/customers`, {
              headers: { 'Content-Type': 'application/json', ...(_cToken ? { Authorization: `Bearer ${_cToken}` } : {}) },
            });
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
              customers = data.data;
              console.log(`API'den ${customers.length} müşteri alındı`);
            }
          } catch (apiError) {
            console.warn("API'den müşteri verisi alınamadı:", apiError);
          }
        }

        // Eğer hala veri yoksa, örnek veri kullan
        if (!customers || customers.length === 0) {
          console.warn(
            'Gerçek müşteri verisi bulunamadı, örnek veriler kullanılıyor'
          );
          customers = this.getSampleCustomers();
          usedSampleData = true;
        }
      } catch (error) {
        console.warn('Müşteri verilerini çekerken hata:', error);
        customers = this.getSampleCustomers();
        usedSampleData = true;
      }

      // Ülkesi olmayan müşterilere varsayılan olarak Türkiye atayalım
      customers = customers.map((customer) => {
        // Eğer ülke verisi yoksa veya geçersizse, Türkiye olarak ayarla
        if (
          !customer.country ||
          customer.country === '' ||
          customer.country === 'undefined' ||
          customer.country === 'null'
        ) {
          return { ...customer, country: 'Türkiye' };
        }
        return customer;
      });

      // Konsola ilk birkaç müşteriyi yazdır (debug için)
      console.log('Müşteri örnekleri:', customers.slice(0, 3));

      // Müşterileri ülkelere göre grupla
      const countryData = {};

      customers.forEach((customer) => {
        const country = customer.country || 'Türkiye';

        if (countryData[country]) {
          countryData[country]++;
        } else {
          countryData[country] = 1;
        }
      });

      // Verileri sırala (müşteri sayısına göre azalan sırada)
      const sortedData = Object.entries(countryData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // En fazla 8 ülke göster (okunabilirlik için)

      const countries = sortedData.map((item) => item[0]);
      const counts = sortedData.map((item) => item[1]);

      if (!usedSampleData) {
        console.log('Gerçek müşteri verileri kullanılıyor, ülke dağılımı:', sortedData);
      }

      // Ülke adı → koordinat tablosu
      const countryCoords = {
        'Türkiye': [39.0, 35.0],
        'Amerika Birleşik Devletleri': [37.0, -95.7],
        'Almanya': [51.2, 10.5],
        'İngiltere': [55.4, -3.4],
        'Çin': [35.9, 104.2],
        'Japonya': [36.2, 138.3],
        'İsveç': [60.1, 18.6],
        'Fransa': [46.2, 2.2],
        'İtalya': [41.9, 12.6],
        'Kanada': [56.1, -106.3],
        'Avustralya': [-25.3, 133.8],
        'Birleşik Arap Emirlikleri': [23.4, 53.8],
        'Rusya': [61.5, 105.3],
        'Hindistan': [20.6, 78.9],
        'Brezilya': [-14.2, -51.9],
        'Güney Kore': [35.9, 127.8],
        'İspanya': [40.5, -3.7],
        'Hollanda': [52.1, 5.3],
        'Belçika': [50.5, 4.5],
        'Polonya': [51.9, 19.1],
        'Yunanistan': [39.1, 21.8],
        'Portekiz': [39.4, -8.2],
        'İsviçre': [46.8, 8.2],
        'Avusturya': [47.5, 14.6],
        'Mısır': [26.8, 30.8],
        'Suudi Arabistan': [23.9, 45.1],
        'Azerbaycan': [40.1, 47.6],
        'Ukrayna': [48.4, 31.2],
        'İran': [32.4, 53.7],
        'Irak': [33.2, 43.7],
      };

      // Leaflet yüklü değilse fallback
      if (typeof L === 'undefined') {
        mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:14px;">Harita yüklenemedi — internet bağlantısını kontrol edin</div>';
        return;
      }

      // Harita renk skalası — müşteri sayısına göre
      const maxCount = Math.max(...counts, 1);
      const getColor = (count) => {
        const ratio = count / maxCount;
        if (ratio > 0.75) return '#1B3A6B';
        if (ratio > 0.5) return '#2E7FC1';
        if (ratio > 0.25) return '#5B3A8E';
        return '#7DC242';
      };

      // Harita oluştur
      const isDark = document.body.classList.contains('dark') ||
                     getComputedStyle(document.documentElement).getPropertyValue('--background').trim().startsWith('#0') ||
                     getComputedStyle(document.documentElement).getPropertyValue('--background').trim().startsWith('#1');

      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      const map = L.map(mapContainer, {
        center: [30, 20],
        zoom: 2,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer(tileUrl, {
        maxZoom: 6,
        subdomains: 'abcd',
      }).addTo(map);

      // Her ülke için daire marker ekle
      sortedData.forEach(([country, count]) => {
        const coords = countryCoords[country];
        if (!coords) return;

        const radius = 20000 + (count / maxCount) * 280000; // metre cinsinden yarıçap
        const color = getColor(count);

        L.circle(coords, {
          color: color,
          fillColor: color,
          fillOpacity: 0.65,
          weight: 2,
          radius: radius,
        }).addTo(map).bindPopup(
          `<b>${country}</b><br/><span style="font-size:13px;">${count} müşteri</span>`
        );
      });

      window._customerLeafletMap = map;
      console.log('Müşteri ülke dağılımı haritası oluşturuldu');
    } catch (error) {
      console.error('Müşteri ülke dağılımı haritası oluşturulurken hata:', error);
      const mapContainer = document.getElementById('customerCountryDistributionChart');
      if (mapContainer) {
        mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:14px;">Harita yüklenemedi</div>';
      }
    }
  }

  /**
   * Belirtilen sayıda rastgele renk üretir
   */
  generateRandomColors(count) {
    const baseColors = [
      'rgba(255, 99, 132, 0.8)', // Kırmızı
      'rgba(54, 162, 235, 0.8)', // Mavi
      'rgba(255, 206, 86, 0.8)', // Sarı
      'rgba(75, 192, 192, 0.8)', // Turkuaz
      'rgba(153, 102, 255, 0.8)', // Mor
      'rgba(255, 159, 64, 0.8)', // Turuncu
      'rgba(76, 175, 80, 0.8)', // Yeşil
      'rgba(233, 30, 99, 0.8)', // Pembe
      'rgba(0, 188, 212, 0.8)', // Açık Mavi
      'rgba(255, 87, 34, 0.8)', // Koyu Turuncu
    ];

    // Yeterli baz renk varsa onları kullan
    if (baseColors.length >= count) {
      return baseColors.slice(0, count);
    }

    // Daha fazla renge ihtiyaç varsa rastgele renkler oluştur
    const colors = [...baseColors];

    for (let i = baseColors.length; i < count; i++) {
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      colors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
    }

    return colors;
  }

  /**
   * Örnek müşteri verilerini döndürür
   */
  getSampleCustomers() {
    return [
      {
        id: 1,
        company_name: 'ABC Şirketi',
        country: 'Türkiye',
        city: 'İstanbul',
      },
      {
        id: 2,
        company_name: 'XYZ Limited',
        country: 'Türkiye',
        city: 'Ankara',
      },
      {
        id: 3,
        company_name: 'Global Tech',
        country: 'Amerika Birleşik Devletleri',
        city: 'New York',
      },
      {
        id: 4,
        company_name: 'Euro Imports',
        country: 'Almanya',
        city: 'Berlin',
      },
      {
        id: 5,
        company_name: 'Tech Solutions',
        country: 'İngiltere',
        city: 'Londra',
      },
      {
        id: 6,
        company_name: 'Anadolu Holding',
        country: 'Türkiye',
        city: 'İzmir',
      },
      {
        id: 7,
        company_name: 'Nordic Systems',
        country: 'İsveç',
        city: 'Stockholm',
      },
      {
        id: 8,
        company_name: 'Asian Exports',
        country: 'Çin',
        city: 'Shanghai',
      },
      {
        id: 9,
        company_name: 'Middle East Trading',
        country: 'Birleşik Arap Emirlikleri',
        city: 'Dubai',
      },
      {
        id: 10,
        company_name: 'Tech Innovators',
        country: 'Amerika Birleşik Devletleri',
        city: 'San Francisco',
      },
    ];
  }

  // Teklif listesini oluştur
  populateQuoteList() {
    // Bu bölüm kullanıcı isteği ile devre dışı bırakıldı
    console.log('Teklif listesi devre dışı bırakıldı');
  }

  // API hata mesajını göster
  showApiError(title, message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'api-error-message';
    errorEl.innerHTML = `
        <div class="error-container">
            <h3>${title}</h3>
            <p>${message}</p>
            <p>API bağlantınızı kontrol edin ve sayfayı yenileyin.</p>
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

  // Add the missing startAutoRefresh method
  startAutoRefresh() {
    console.log('Auto refresh started for dashboard widgets');

    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Set up auto-refresh every 5 minutes (300000 ms)
    this.refreshInterval = setInterval(() => {
      console.log('Auto refresh triggered for dashboard widgets');
      this.fetchData()
        .then(() => {
          this.updateDashboardWidgets();
        })
        .catch((error) => {
          console.error('Auto refresh error:', error);
        });
    }, 300000);
  }

  // Add method to clean up resources
  destroy() {
    console.log('Cleaning up dashboard widgets resources');

    // Clear auto-refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    // Dispose charts
    this.disposeCharts();
  }
}

// İlk yükleme sırasında DashboardManager'ı global değişkene at
let originalDashboardManagerClass;

// Sayfa yüklendikten 5 saniye sonra çalıştır - bu, dashboard.js'nin
// tamamen yüklenmesini sağlayacak
setTimeout(() => {
  // Singleton instance oluştur
  window.dashboardWidgets = new DashboardWidgets();
}, 3000);

// Sayfa yüklendiğinde DashboardWidgets'ı başlat
document.addEventListener('DOMContentLoaded', function () {
  console.log(
    'DOMContentLoaded event tetiklendi, DashboardWidgets başlatılıyor...'
  );

  // CSS stilleri ekleyerek geçiş sırasında sayfa görünümünü iyileştir
  const style = document.createElement('style');
  style.textContent = `
    .widget-card {
      transition: opacity 0.3s ease;
      opacity: 0;
    }
    .widget-card.loaded {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  // Önce sayfa yüklenme durumunu göster
  const themeColors = getChartThemeColors();
  document.querySelectorAll('.widget-card').forEach((card) => {
    // Yükleniyor göstergesi ekle
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = `
      <div class="spinner"></div>
      <p>Veriler yükleniyor...</p>
    `;
    loadingDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: ${themeColors.overlay};
      z-index: 5;
    `;
    card.style.position = 'relative';
    card.appendChild(loadingDiv);
  });

  // Timeout ile ilk DashboardWidgets başlatma girişimini yap
  setTimeout(() => {
    try {
      window.dashboardWidgetsInstance = new DashboardWidgets();

      // 500ms sonra yükleniyor göstergelerini kaldır ve kartları görünür yap
      setTimeout(() => {
        document.querySelectorAll('.loading-indicator').forEach((indicator) => {
          indicator.style.opacity = '0';
          setTimeout(() => indicator.remove(), 300);
        });

        document.querySelectorAll('.widget-card').forEach((card) => {
          card.classList.add('loaded');
        });
      }, 500);
    } catch (error) {
      console.error('DashboardWidgets başlatma hatası:', error);
    }
  }, 100);
});

// Ana DashboardWidgets sınıfını başlatma öncesinde eski global fonksiyonların çalışmasını devre dışı bırak
const originalFetchDashboardData = window.fetchDashboardData;
const originalPopulateDashboard = window.populateDashboard;

// Fonksiyonları geçici olarak sakla
window.fetchDashboardData_original = originalFetchDashboardData;
window.populateDashboard_original = originalPopulateDashboard;

// Bu fonksiyonları yeni sınıf tabanlı uygulamamızla değiştir
window.fetchDashboardData = function () {
  console.log(
    'fetchDashboardData çağrıldı, DashboardWidgets sınıfına yönlendiriliyor...'
  );
  if (window.dashboardWidgetsInstance) {
    return window.dashboardWidgetsInstance.fetchData();
  } else {
    console.warn(
      'DashboardWidgets instance bulunamadı, yeni bir tane oluşturuluyor'
    );
    window.dashboardWidgetsInstance = new DashboardWidgets();
    return window.dashboardWidgetsInstance.fetchData();
  }
};

window.populateDashboard = function (users, quotes) {
  console.log(
    'populateDashboard çağrıldı, DashboardWidgets sınıfına yönlendiriliyor...'
  );
  if (window.dashboardWidgetsInstance) {
    window.dashboardWidgetsInstance.users =
      users || window.dashboardWidgetsInstance.users;
    window.dashboardWidgetsInstance.quotes =
      quotes || window.dashboardWidgetsInstance.quotes;
    window.dashboardWidgetsInstance.updateDashboardWidgets();
  } else {
    console.warn(
      'DashboardWidgets instance bulunamadı, yeni bir tane oluşturuluyor'
    );
    window.dashboardWidgetsInstance = new DashboardWidgets();
    window.dashboardWidgetsInstance.users = users;
    window.dashboardWidgetsInstance.quotes = quotes;
    window.dashboardWidgetsInstance.updateDashboardWidgets();
  }
};
