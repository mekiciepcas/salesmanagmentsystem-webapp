import dbService from '../services/dbService.js';

class Reports {
  constructor() {
    this.init();
    this.updateSidebarUserInfo();
  }

  async init() {
    await this.loadReports();
    this.setupEventListeners();
  }

  async loadReports() {
    try {
      const quotes = await dbService.getAllQuotes();
      this.updateDashboard(quotes);
    } catch (error) {
      console.error('Rapor yükleme hatası:', error);
    }
  }

  setupEventListeners() {
    // Tarih filtresi için event listener
    document.getElementById('filterBtn')?.addEventListener('click', () => {
      this.loadReports();
    });

    // Hedef güncelleme için event listener
    document
      .getElementById('updateTargetBtn')
      ?.addEventListener('click', () => {
        const input = document.getElementById('yearlyTargetInput');
        const newTarget = parseFloat(input.value.replace(/,/g, ''));
        if (newTarget > 0) {
          localStorage.setItem('yearlyTarget', newTarget);
          this.loadReports();
        }
      });
  }

  updateDashboard(quotes) {
    // İstatistikleri güncelle
    this.updateStatistics(quotes);

    // Grafikleri güncelle
    this.updateCharts(quotes);
  }

  updateSidebarUserInfo() {
    const userInfo = JSON.parse(localStorage.getItem('currentUser'));
    if (userInfo) {
      document.getElementById('userName').textContent =
        userInfo.fullName || 'İsimsiz Kullanıcı';
      document.getElementById('userRole').textContent =
        userInfo.department || 'Departman Belirtilmedi';

      const avatarContainer = document.querySelector('.avatar-initials');
      if (avatarContainer) {
        const initials = (userInfo.fullName || '')
          .split(' ')
          .map((name) => name[0])
          .join('')
          .toUpperCase();
        avatarContainer.textContent = initials;
      }
    }
  }

  // Mevcut dashboard.js'deki diğer metodları buraya taşıyın
  // updateStatistics, updateCharts, updateMonthlyTrendChart,
  // updateUserPerformanceChart, updateUserMonthlyTrendChart,
  // updateTargetTrackingChart metodları aynı şekilde kullanılabilir
}

// Kullanıcı bilgilerini güncelle
function updateUserInfo() {
  const userInfo = JSON.parse(localStorage.getItem('currentUser'));
  if (userInfo) {
    document.getElementById('userName').textContent = userInfo.fullName;
    document.getElementById('userRole').textContent = userInfo.department;
  }
}

// Sayfa yüklendiğinde çağır
document.addEventListener('DOMContentLoaded', () => {
  updateUserInfo();
  new Reports();
});
