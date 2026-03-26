import dbService from '../services/dbService.js';

/** Chart tooltip için tema uyumlu arka plan rengi */
function getChartTooltipBg() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#ffffff';
  return bg;
}

class ProfitLossManager {
  constructor() {
    this.approvedQuotes = [];
    this.actualCosts = [];
    this.currentEditQuote = null;

    // Initialize charts
    this.charts = {
      profitLossDistribution: null,
      marginDistribution: null,
      monthlyProfitTrend: null,
    };

    this.initialize();
  }

  async initialize() {
    this.setupEventListeners();

    // Fetch data from the server API
    try {
      console.log('Initializing - Loading actual costs from server...');
      // No need to sync, just load directly
      await this.loadData();
      console.log('Data loaded from server successfully');
    } catch (loadError) {
      console.warn('Failed to load data from server:', loadError);
      // Continue even if loading fails
    }

    this.renderApprovedQuotes();
    this.updateSummaryCards();
    
    // Canvas elementlerinin görünür olması için bekle
    this.initializeChartsWithDelay();
  }

  initializeChartsWithDelay() {
    // Profit-loss view'ının görünür olması için bekle
    const profitLossView = document.getElementById('profit-loss');
    if (!profitLossView || !profitLossView.classList.contains('active')) {
      console.log('Profit-loss view görünür değil, grafikler daha sonra başlatılacak');
      // View görünür olduğunda başlatmak için observer kullan
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.classList.contains('active')) {
              console.log('Profit-loss view görünür oldu, grafikler başlatılıyor...');
              observer.disconnect();
              setTimeout(() => {
                this.initializeCharts();
                this.updateCharts();
              }, 300);
            }
          }
        });
      });
      
      if (profitLossView) {
        observer.observe(profitLossView, { attributes: true });
      }
      return;
    }

    // View görünürse hemen başlat
    setTimeout(() => {
      this.initializeCharts();
      this.updateCharts();
    }, 300);
  }

  setupEventListeners() {
    // Refresh button
    document
      .getElementById('refreshProfitLossBtn')
      ?.addEventListener('click', async () => {
        try {
          console.log('Refresh clicked - Loading fresh data from API...');
          await this.loadData();
          console.log('Fresh data loaded successfully');
        } catch (loadError) {
          console.warn('Failed to refresh data from API:', loadError);
          // Continue even if refresh fails
        }

        this.renderApprovedQuotes();
        this.updateSummaryCards();
        this.updateCharts();
      });

    // Search input
    document
      .getElementById('profitLossSearch')
      ?.addEventListener('input', (e) => {
        this.filterQuotes(e.target.value);
      });

    // Cost edit modal close
    document
      .querySelector('.cost-edit-modal-close')
      ?.addEventListener('click', () => {
        this.closeCostEditModal();
      });

    // Cancel button
    document.getElementById('cancelCostEdit')?.addEventListener('click', () => {
      this.closeCostEditModal();
    });

    // Save button
    document
      .getElementById('saveCostEdit')
      ?.addEventListener('click', async () => {
        await this.saveActualCost();
      });

    // Chart type controls
    document.querySelectorAll('.chart-control-btn')?.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const chartType = e.currentTarget.getAttribute('data-chart-view');
        this.switchChartType(chartType);

        // Update active state
        document
          .querySelectorAll('.chart-control-btn')
          .forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });

    // Period filter for monthly trend chart
    document.querySelectorAll('.period-btn')?.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const period = e.currentTarget.getAttribute('data-period');
        this.filterChartByPeriod(period);

        // Update active state
        document
          .querySelectorAll('.period-btn')
          .forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });

    // Export buttons
    document
      .getElementById('exportProfitLossXLS')
      ?.addEventListener('click', () => {
        this.exportTableToExcel();
      });

    document
      .getElementById('exportProfitLossPDF')
      ?.addEventListener('click', () => {
        this.exportTableToPDF();
      });
  }

  async loadData() {
    try {
      console.log('Loading data for profit/loss analysis...');
      // Load all quotes
      const quotes = await dbService.getAllQuotes();
      console.log('All quotes loaded:', quotes.length);

      // Get all users first for ID to name mapping
      const users = await this.fetchUserData();
      const userMap = {};
      if (users && Array.isArray(users)) {
        users.forEach((user) => {
          if (user && user.id) {
            userMap[user.id] = user.full_name;
          }
        });
      }
      console.log('User map created for ID resolution:', userMap);

      // Filter only approved quotes - handling different status formats
      this.approvedQuotes = quotes.filter((quote) => {
        if (!quote || !quote.status) return false;

        // Normalize status for comparison
        const status = String(quote.status).toUpperCase().trim();

        // Log all quotes status for debugging
        console.log(
          `Quote #${quote.id} (${quote.number}), Status: "${status}"`
        );

        // Match any variation of "ONAYLANDI", "APPROVED", "ONAY", etc.
        return (
          status === 'ONAYLANDI' ||
          status.includes('ONAY') ||
          status === 'APPROVED' ||
          status.includes('CHECK')
        );
      });

      console.log('Filtered approved quotes:', this.approvedQuotes.length);
      console.log(
        'Approved quotes details:',
        this.approvedQuotes.map((q) => ({
          id: q.id,
          number: q.number,
          status: q.status,
        }))
      );

      // Fix and normalize data in approved quotes
      this.approvedQuotes = this.approvedQuotes.map((quote) => {
        // Get the prepared_by value as a user name instead of ID
        let preparedByName =
          quote.prepared_by_name || quote.prepared_by || 'Bilinmiyor';

        // If prepared_by is a number (user ID), try to resolve it to a name
        if (!isNaN(parseInt(quote.prepared_by)) && userMap[quote.prepared_by]) {
          preparedByName = userMap[quote.prepared_by];
        }

        // Ensure quote has all required fields with proper formatting
        const normalizedQuote = {
          ...quote,
          id: quote.id,
          // Normalize date - use date, created_at, or current date as fallback
          date: quote.date || quote.created_at || new Date().toISOString(),
          // Store both the original ID and the resolved name
          prepared_by_id: quote.prepared_by,
          prepared_by: preparedByName,
          prepared_by_name: preparedByName,
          // Normalize number - use number or id as fallback
          number: quote.number || `TEKLIF-${quote.id}`,
          // Ensure total_price is a valid number
          total_price: this.parseNumericValue(quote.total_price),
        };

        // Only log select fields to keep console clean
        console.log(`Normalized quote #${normalizedQuote.id}:`, {
          number: normalizedQuote.number,
          date: normalizedQuote.date,
          prepared_by: normalizedQuote.prepared_by,
          prepared_by_id: normalizedQuote.prepared_by_id,
          total_price: normalizedQuote.total_price,
        });

        return normalizedQuote;
      });

      // Load actual costs
      this.actualCosts = await dbService.getAllActualCosts();
      console.log('Loaded actual costs:', this.actualCosts.length);

      return { quotes: this.approvedQuotes, costs: this.actualCosts };
    } catch (error) {
      console.error('Failed to load profit/loss data:', error);
      return { quotes: [], costs: [] };
    }
  }

  // Helper method to parse numeric values
  parseNumericValue(value) {
    if (value === undefined || value === null) return 0;

    // If it's already a number, return it
    if (typeof value === 'number') return value;

    // If it's a string, try to extract numeric value
    if (typeof value === 'string') {
      // Remove currency symbols, thousand separators and other non-numeric characters
      const cleanedValue = value.replace(/[^0-9.-]+/g, '');
      const parsed = parseFloat(cleanedValue);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  renderApprovedQuotes() {
    const tableBody = document.getElementById('profitLossTableBody');
    if (!tableBody) return;

    console.log('Rendering approved quotes table...');
    tableBody.innerHTML = '';

    if (!this.approvedQuotes || this.approvedQuotes.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Onaylanmış teklif bulunamadı.</td>
                </tr>
            `;
      console.log('No approved quotes found to render');
      return;
    }

    console.log(`Rendering ${this.approvedQuotes.length} approved quotes`);

    // Ensure actualCosts is initialized as an array
    if (!this.actualCosts || !Array.isArray(this.actualCosts)) {
      console.warn(
        'actualCosts is not properly initialized, setting to empty array'
      );
      this.actualCosts = [];
    }

    // Get all users to map IDs to names
    this.fetchUserData()
      .then((users) => {
        // For better performance with large datasets, build the HTML in chunks
        const chunkSize = 50;
        const fragments = [];
        let currentFragment = document.createDocumentFragment();
        let currentCount = 0;

        this.approvedQuotes.forEach((quote, index) => {
          if (!quote || !quote.id) {
            console.warn('Invalid quote object found:', quote);
            return; // Skip this quote
          }

          // Find actual cost for this quote
          const costData = this.actualCosts.find(
            (cost) => cost && cost.quote_id === quote.id
          );
          const actualCost = costData
            ? this.parseNumericValue(costData.actual_cost)
            : null;
          const quoteAmount = this.parseNumericValue(quote.total_price);

          // Calculate profit and margin if actual cost exists
          let profit = null;
          let marginPercent = null;

          if (actualCost !== null) {
            profit = quoteAmount - actualCost;
            marginPercent =
              quoteAmount > 0
                ? ((quoteAmount / actualCost) * 100 - 100).toFixed(2)
                : 0;
          }

          // Safe date formatting with validation
          let formattedDate = '-';
          try {
            if (quote.date) {
              const date = new Date(quote.date);
              if (!isNaN(date.getTime())) {
                // Check if valid date
                formattedDate = date.toLocaleDateString('tr-TR');
              } else {
                formattedDate = 'Geçersiz Tarih';
              }
            }
          } catch (e) {
            console.error('Date formatting error:', e);
            formattedDate = 'Geçersiz Tarih';
          }

          // Get the prepared_by value in a user-friendly format
          let preparedBy = quote.prepared_by || '-';

          // If prepared_by is a number (user ID), try to find the corresponding user's full name
          if (!isNaN(parseInt(preparedBy)) && users) {
            const userId = parseInt(preparedBy);
            const user = users.find((u) => u.id === userId);
            if (user && user.full_name) {
              preparedBy = user.full_name;
            }
          }

          // If we have prepared_by_name directly in the quote, use that
          if (quote.prepared_by_name) {
            preparedBy = quote.prepared_by_name;
          }

          // Create table row
          const row = document.createElement('tr');
          row.innerHTML = `
                    <td>${quote.number || '-'}</td>
                    <td>${formattedDate}</td>
                    <td>${preparedBy}</td>
                    <td>${this.formatCurrency(quoteAmount)}</td>
                    <td>${actualCost !== null ? this.formatCurrency(actualCost) : '-'}</td>
                    <td class="${profit !== null ? (profit >= 0 ? 'profit' : 'loss') : ''}">${profit !== null ? this.formatCurrency(profit) : '-'}</td>
                    <td>${marginPercent !== null ? `%${marginPercent}` : '-'}</td>
                    <td>
                        <button class="btn-edit-cost" data-quote-id="${quote.id}">
                            <i class="material-icons">edit</i>
                        </button>
                    </td>
                `;

          // Add event listener to edit cost button
          row.querySelector('.btn-edit-cost').addEventListener('click', () => {
            this.openCostEditModal(quote);
          });

          currentFragment.appendChild(row);
          currentCount++;

          // If we've reached the chunk size or it's the last item, add to fragments and reset
          if (
            currentCount >= chunkSize ||
            index === this.approvedQuotes.length - 1
          ) {
            fragments.push(currentFragment);
            currentFragment = document.createDocumentFragment();
            currentCount = 0;
          }
        });

        // Avoid layout thrashing by appending all fragments at once
        if (fragments.length > 0) {
          // Use requestAnimationFrame for better visual rendering
          requestAnimationFrame(() => {
            fragments.forEach((fragment) => {
              tableBody.appendChild(fragment);
            });
            console.log(
              `Rendered ${this.approvedQuotes.length} quotes in ${fragments.length} chunks`
            );
          });
        } else {
          console.log('No fragments to render');
        }
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
      });
  }

  // New method to fetch user data
  async fetchUserData() {
    try {
      // Try to get users from the database service
      const users = await dbService.getAllUsers();
      console.log(`Fetched ${users.length} users for prepared_by mapping`);
      return users;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Return a default fallback with known users
      return [
        { id: 1, full_name: 'Ahmet Yilmaz' },
        { id: 2, full_name: 'Mehmet Kaya' },
        { id: 3, full_name: 'Test User' },
        { id: 6, full_name: 'Kemal Sunal' },
        { id: 25, full_name: 'Mücahit EKİCİ' },
      ];
    }
  }

  updateSummaryCards() {
    // Total approved quotes count
    document.getElementById('totalApprovedCount').textContent = this
      .approvedQuotes
      ? this.approvedQuotes.length
      : 0;

    // Calculate total profit and average margin
    let totalProfit = 0;
    let totalMargin = 0;
    let quotesWithCost = 0;

    // Ensure actualCosts is initialized as an array
    if (!this.actualCosts || !Array.isArray(this.actualCosts)) {
      console.warn(
        'actualCosts is not properly initialized, setting to empty array'
      );
      this.actualCosts = [];
    }

    if (this.approvedQuotes && Array.isArray(this.approvedQuotes)) {
      this.approvedQuotes.forEach((quote) => {
        if (!quote || !quote.id) return; // Skip invalid quotes

        const costData = this.actualCosts.find(
          (cost) => cost && cost.quote_id === quote.id
        );
        if (costData) {
          const quoteAmount = parseFloat(quote.total_price) || 0;
          const actualCost = parseFloat(costData.actual_cost) || 0;
          const profit = quoteAmount - actualCost;

          totalProfit += profit;
          totalMargin += quoteAmount > 0 ? (profit / quoteAmount) * 100 : 0;
          quotesWithCost++;
        }
      });
    }

    // Update the DOM
    document.getElementById('totalProfitAmount').textContent =
      this.formatCurrency(totalProfit);
    document.getElementById('averageProfitMargin').textContent =
      quotesWithCost > 0
        ? `%${(totalMargin / quotesWithCost).toFixed(2)}`
        : '%0';

    // Update staff performance metrics
    this.updateStaffPerformanceMetrics();
  }

  // New method to analyze and display staff performance metrics
  updateStaffPerformanceMetrics() {
    // Get the container for staff metrics
    let staffMetricsContainer = document.getElementById(
      'staffPerformanceMetrics'
    );
    
    // Eğer container yoksa ve widget zaten oluşturulmuşsa, sadece içeriği güncelle
    if (!staffMetricsContainer) {
      const existingWidget = document.querySelector('.staff-performance-widget');
      if (existingWidget) {
        staffMetricsContainer = existingWidget.querySelector('#staffPerformanceMetrics');
        if (staffMetricsContainer) {
          // Container bulundu, sadece içeriği güncelle
          const tableBody = staffMetricsContainer.querySelector('#staffPerformanceTableBody');
          if (tableBody) {
            this.calculateAndRenderStaffPerformance(tableBody);
          }
          return;
        }
      }
    }
    
    if (!staffMetricsContainer) {
      console.warn(
        'Staff performance metrics container not found, creating it dynamically'
      );

      // Create container if it doesn't exist
      const profitLossContent = document.querySelector('.profit-loss-content');
      if (!profitLossContent) {
        console.error('Profit loss content container not found');
        return;
      }

      // Create and insert the staff metrics section before the charts
      // HTML'de .chart-section kullanılıyor, .charts-container değil
      const chartSection = profitLossContent.querySelector('.chart-section');

      const metricsSection = document.createElement('div');
      metricsSection.className = 'widget staff-performance-widget';
      metricsSection.innerHTML = `
                <div class="widget-header">
                    <h3>Personel Performans Metrikleri</h3>
                    <div class="widget-actions">
                        <button class="btn-toggle-expand">
                            <i class="material-icons">expand_more</i>
                        </button>
                    </div>
                </div>
                <div class="widget-content">
                    <div id="staffPerformanceMetrics" class="staff-performance-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Hazırlayan</th>
                                    <th>Teklif Sayısı</th>
                                    <th>Ortalama Teklif Tutarı</th>
                                    <th>Ortalama Maliyet</th>
                                    <th>Ortalama Kâr/Zarar</th>
                                    <th>Ortalama Marj (%)</th>
                                    <th>Performans</th>
                                </tr>
                            </thead>
                            <tbody id="staffPerformanceTableBody">
                                <tr>
                                    <td colspan="7" class="text-center">Veri yükleniyor...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

      // chartSection'ın profitLossContent'in child'ı olduğundan emin ol
      if (chartSection && chartSection.parentNode === profitLossContent) {
        try {
          profitLossContent.insertBefore(metricsSection, chartSection);
        } catch (error) {
          console.warn('insertBefore hatası, appendChild kullanılıyor:', error);
          profitLossContent.appendChild(metricsSection);
        }
      } else {
        // Eğer chart-section bulunamazsa veya parent değilse, sona ekle
        profitLossContent.appendChild(metricsSection);
      }

      // Add event listener for toggle expand
      const toggleButton = metricsSection.querySelector('.btn-toggle-expand');
      if (toggleButton) {
        toggleButton.addEventListener('click', () => {
          const widgetContent = metricsSection.querySelector('.widget-content');
          if (widgetContent) {
            widgetContent.classList.toggle('collapsed');
            toggleButton.querySelector('i').textContent =
              widgetContent.classList.contains('collapsed')
                ? 'expand_more'
                : 'expand_less';
          }
        });
      }
      
      // Container oluşturulduktan sonra tabloyu render et
      staffMetricsContainer = document.getElementById('staffPerformanceMetrics');
    }
    
    // Eğer container varsa ama henüz render edilmemişse, render et
    if (staffMetricsContainer) {
      const tableBody = staffMetricsContainer.querySelector('#staffPerformanceTableBody');
      if (tableBody) {
        // Staff performance verilerini hesapla ve render et
        this.calculateAndRenderStaffPerformance(tableBody);
      }
    }
  }

  // Calculate staff performance and render table
  calculateAndRenderStaffPerformance(tableBody) {
    // Calculate metrics for each staff member
    const staffMetrics = {};

    if (this.approvedQuotes && Array.isArray(this.approvedQuotes)) {
      this.approvedQuotes.forEach((quote) => {
        if (!quote || !quote.id || !quote.prepared_by) return; // Skip invalid quotes

        const preparer = quote.prepared_by;

        // Initialize staff entry if not exists
        if (!staffMetrics[preparer]) {
          staffMetrics[preparer] = {
            name: preparer,
            quoteCount: 0,
            totalAmount: 0,
            totalCost: 0,
            totalProfit: 0,
            quotesWithCost: 0,
          };
        }

        const quoteAmount = this.parseNumericValue(quote.total_price);
        staffMetrics[preparer].quoteCount++;
        staffMetrics[preparer].totalAmount += quoteAmount;

        // Check if we have actual cost data for this quote
        const costData = this.actualCosts.find(
          (cost) => cost && cost.quote_id === quote.id
        );
        if (costData) {
          const actualCost = this.parseNumericValue(costData.actual_cost);
          const profit = quoteAmount - actualCost;

          staffMetrics[preparer].totalCost += actualCost;
          staffMetrics[preparer].totalProfit += profit;
          staffMetrics[preparer].quotesWithCost++;
        }
      });
    }

    // Convert to array and calculate averages
    const staffPerformance = Object.values(staffMetrics).map((staff) => {
      // Calculate averages
      const avgAmount =
        staff.quoteCount > 0 ? staff.totalAmount / staff.quoteCount : 0;
      const avgCost =
        staff.quotesWithCost > 0 ? staff.totalCost / staff.quotesWithCost : 0;
      const avgProfit =
        staff.quotesWithCost > 0 ? staff.totalProfit / staff.quotesWithCost : 0;
      const avgMargin =
        avgAmount > 0 && staff.quotesWithCost > 0
          ? (avgProfit / avgAmount) * 100
          : 0;

      // Calculate performance score (0-100)
      let performanceScore = 0;
      if (staff.quotesWithCost > 0) {
        const marginScore = Math.min(40, Math.max(0, avgMargin * 1.33));
        const maxAvgProfit = Math.max(
          ...Object.values(staffMetrics)
            .filter((s) => s.quotesWithCost > 0)
            .map((s) => s.totalProfit / s.quotesWithCost)
        );
        const profitScore =
          maxAvgProfit > 0
            ? Math.min(40, Math.max(0, (avgProfit / maxAvgProfit) * 40))
            : 0;
        const maxCount = Math.max(
          ...Object.values(staffMetrics).map((s) => s.quoteCount)
        );
        const volumeScore =
          maxCount > 0
            ? Math.min(20, Math.max(0, (staff.quoteCount / maxCount) * 20))
            : 0;
        performanceScore = Math.round(marginScore + profitScore + volumeScore);
      }

      return {
        name: staff.name,
        quoteCount: staff.quoteCount,
        avgAmount,
        avgCost,
        avgProfit,
        avgMargin,
        performanceScore,
        quotesWithCost: staff.quotesWithCost,
      };
    });

    // Sort by performance score (descending)
    staffPerformance.sort((a, b) => b.performanceScore - a.performanceScore);

    // Render the table
    this.renderStaffPerformanceTable(tableBody, staffPerformance);
  }

  // Render staff performance table
  renderStaffPerformanceTable(tableBody, staffPerformance) {
    if (!tableBody) {
      console.warn('Table body not found for staff performance');
      return;
    }

    tableBody.innerHTML = '';

    if (!staffPerformance || staffPerformance.length === 0) {
      tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">Personel performans verisi bulunamadı.</td>
                    </tr>
                `;
      return;
    }

    staffPerformance.forEach((staff) => {
      // Skip entries with no cost data if they have no quotes with costs
      if (staff.quotesWithCost === 0 && staff.quoteCount === 0) return;

      // Create performance indicator
      let performanceClass = '';
      let performanceLabel = '';

      if (staff.quotesWithCost === 0) {
        performanceClass = 'neutral';
        performanceLabel = 'Değerlendirilemiyor';
      } else if (staff.performanceScore >= 80) {
        performanceClass = 'excellent';
        performanceLabel = 'Mükemmel';
      } else if (staff.performanceScore >= 60) {
        performanceClass = 'good';
        performanceLabel = 'İyi';
      } else if (staff.performanceScore >= 40) {
        performanceClass = 'average';
        performanceLabel = 'Orta';
      } else {
        performanceClass = 'needs-improvement';
        performanceLabel = 'Geliştirilmeli';
      }

      const row = document.createElement('tr');
      row.innerHTML = `
                    <td>${staff.name}</td>
                    <td>${staff.quoteCount}</td>
                    <td>${this.formatCurrency(staff.avgAmount)}</td>
                    <td>${staff.quotesWithCost > 0 ? this.formatCurrency(staff.avgCost) : '-'}</td>
                    <td class="${staff.avgProfit >= 0 ? 'profit' : 'loss'}">${staff.quotesWithCost > 0 ? this.formatCurrency(staff.avgProfit) : '-'}</td>
                    <td>${staff.quotesWithCost > 0 ? `%${staff.avgMargin.toFixed(2)}` : '-'}</td>
                    <td>
                        <div class="performance-indicator ${performanceClass}">
                            <div class="performance-bar" style="width: ${staff.performanceScore}%"></div>
                            <span class="performance-label">${performanceLabel} (${staff.performanceScore})</span>
                        </div>
                    </td>
                `;

      tableBody.appendChild(row);
    });
  }

  openCostEditModal(quote) {
    this.currentEditQuote = quote;
    const modal = document.getElementById('costEditModal');
    if (!modal) return;

    // Find any existing cost data
    const costData = this.actualCosts.find(
      (cost) => cost.quote_id === quote.id
    );

    // Populate the form
    document.getElementById('costEditQuoteNumber').value = quote.number;
    document.getElementById('costEditQuoteAmount').value = this.formatCurrency(
      parseFloat(quote.total_price)
    );
    document.getElementById('costEditActualCost').value = costData
      ? costData.actual_cost
      : '';
    document.getElementById('costEditNotes').value = costData
      ? costData.notes || ''
      : '';

    // Show the modal
    modal.style.display = 'block';
  }

  closeCostEditModal() {
    document.getElementById('costEditModal').style.display = 'none';
    this.currentEditQuote = null;
  }

  async saveActualCost() {
    // Add additional logging for debugging
    console.log(
      'saveActualCost called, currentEditQuote:',
      this.currentEditQuote
    );

    if (!this.currentEditQuote) {
      console.error('No quote selected for cost update');
      alert('Teklif seçilmedi.');
      return;
    }

    if (!this.currentEditQuote.id) {
      console.error('Selected quote has no ID:', this.currentEditQuote);
      alert("Seçilen teklifin ID'si yok.");
      return;
    }

    const actualCostElement = document.getElementById('costEditActualCost');
    if (!actualCostElement) {
      console.error('Cost edit input element not found');
      return;
    }

    const actualCost = actualCostElement.value;
    if (!actualCost || isNaN(parseFloat(actualCost))) {
      alert('Lütfen geçerli bir maliyet değeri girin.');
      return;
    }

    const notesElement = document.getElementById('costEditNotes');
    const notes = notesElement ? notesElement.value : '';

    try {
      const costData = {
        quote_id: this.currentEditQuote.id,
        quote_amount: parseFloat(this.currentEditQuote.total_price || 0),
        actual_cost: parseFloat(actualCost),
        notes: notes,
        updated_at: new Date().toISOString(),
      };

      console.log('Prepared cost data:', costData);

      // Ensure actualCosts is initialized as an array
      if (!this.actualCosts || !Array.isArray(this.actualCosts)) {
        console.warn(
          'actualCosts is not properly initialized, setting to empty array'
        );
        this.actualCosts = [];
      }

      // Find any existing cost data
      const existingCost = this.actualCosts.find(
        (cost) => cost && cost.quote_id === this.currentEditQuote.id
      );

      let result;
      let retryCount = 0;
      const maxRetries = 2;

      const saveWithRetry = async () => {
        try {
          if (existingCost) {
            console.log('Updating existing cost data:', existingCost);
            return await dbService.updateActualCost(existingCost.id, costData);
          } else {
            console.log('Adding new cost data');
            return await dbService.addActualCost(costData);
          }
        } catch (saveError) {
          console.warn(`Save attempt ${retryCount + 1} failed:`, saveError);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying... (${retryCount}/${maxRetries})`);
            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 500));
            return saveWithRetry();
          }
          throw saveError; // Rethrow if all retries fail
        }
      };

      // Attempt to save with retry
      result = await saveWithRetry();

      console.log('Save result:', result);

      if (result) {
        // Update the local array for immediate display
        if (existingCost) {
          const index = this.actualCosts.findIndex(
            (cost) => cost && cost.id === existingCost.id
          );
          if (index !== -1) {
            this.actualCosts[index] = result;
          }
        } else {
          this.actualCosts.push(result);
        }

        // Reload data from the server to ensure we have the latest data
        try {
          console.log('Reloading data after save...');
          await this.loadData();
        } catch (loadError) {
          console.warn('Failed to reload data after save:', loadError);
          // Continue even if refresh fails, we still have local data
        }
      }

      // Close the modal
      this.closeCostEditModal();

      // Refresh the table and charts
      this.renderApprovedQuotes();
      this.updateSummaryCards();
      this.updateCharts();
    } catch (error) {
      console.error('Failed to save actual cost:', error);
      alert('Maliyet kaydedilemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  }

  filterQuotes(searchText) {
    if (!searchText) {
      this.renderApprovedQuotes();
      return;
    }

    if (!this.approvedQuotes || !Array.isArray(this.approvedQuotes)) {
      console.warn('approvedQuotes is not properly initialized');
      return;
    }

    const filteredQuotes = this.approvedQuotes.filter((quote) => {
      if (!quote) return false;
      return (
        (quote.number &&
          quote.number.toLowerCase().includes(searchText.toLowerCase())) ||
        (quote.prepared_by &&
          quote.prepared_by.toLowerCase().includes(searchText.toLowerCase())) ||
        (quote.prepared_by_name &&
          quote.prepared_by_name
            .toLowerCase()
            .includes(searchText.toLowerCase()))
      );
    });

    const tableBody = document.getElementById('profitLossTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (filteredQuotes.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Eşleşen teklif bulunamadı.</td>
                </tr>
            `;
      return;
    }

    // Ensure actualCosts is initialized as an array
    if (!this.actualCosts || !Array.isArray(this.actualCosts)) {
      console.warn(
        'actualCosts is not properly initialized, setting to empty array'
      );
      this.actualCosts = [];
    }

    // Get all users to map IDs to names
    this.fetchUserData()
      .then((users) => {
        // Re-render with filtered quotes (reusing code structure from renderApprovedQuotes)
        filteredQuotes.forEach((quote) => {
          if (!quote || !quote.id) {
            console.warn('Invalid quote object found:', quote);
            return; // Skip this quote
          }

          const costData = this.actualCosts.find(
            (cost) => cost && cost.quote_id === quote.id
          );
          const actualCost = costData ? parseFloat(costData.actual_cost) : null;
          const quoteAmount = parseFloat(quote.total_price || 0);

          let profit = null;
          let marginPercent = null;

          if (actualCost !== null) {
            profit = quoteAmount - actualCost;
            marginPercent =
              quoteAmount > 0 ? ((profit / quoteAmount) * 100).toFixed(2) : 0;
          }

          const formattedDate = this.formatDate(quote.date || quote.created_at);

          // Get the prepared_by value in a user-friendly format
          let preparedBy = quote.prepared_by || '-';

          // If prepared_by is a number (user ID), try to find the corresponding user's full name
          if (!isNaN(parseInt(preparedBy)) && users) {
            const userId = parseInt(preparedBy);
            const user = users.find((u) => u.id === userId);
            if (user && user.full_name) {
              preparedBy = user.full_name;
            }
          }

          // If we have prepared_by_name directly in the quote, use that
          if (quote.prepared_by_name) {
            preparedBy = quote.prepared_by_name;
          }

          const row = document.createElement('tr');
          row.innerHTML = `
                    <td>${quote.number || '-'}</td>
                    <td>${formattedDate || '-'}</td>
                    <td>${preparedBy}</td>
                    <td>${this.formatCurrency(quoteAmount)}</td>
                    <td>${actualCost !== null ? this.formatCurrency(actualCost) : '-'}</td>
                    <td class="${profit !== null ? (profit >= 0 ? 'profit' : 'loss') : ''}">${profit !== null ? this.formatCurrency(profit) : '-'}</td>
                    <td>${marginPercent !== null ? `%${marginPercent}` : '-'}</td>
                    <td>
                        <button class="btn-edit-cost" data-quote-id="${quote.id}">
                            <i class="material-icons">edit</i>
                        </button>
                    </td>
                `;

          row.querySelector('.btn-edit-cost').addEventListener('click', () => {
            this.openCostEditModal(quote);
          });

          tableBody.appendChild(row);
        });
      })
      .catch((error) => {
        console.error('Error fetching user data for filtering:', error);
      });
  }

  initializeCharts() {
    console.log('Kar zarar analizi grafikleri başlatılıyor...');
    console.log('Onaylanan teklif sayısı:', this.approvedQuotes?.length || 0);
    console.log('Maliyet kayıt sayısı:', this.actualCosts?.length || 0);
    
    // Canvas elementlerinin görünür olduğundan emin ol
    const profitLossView = document.getElementById('profit-loss');
    if (!profitLossView || !profitLossView.classList.contains('active')) {
      console.warn('Profit-loss view görünür değil, grafikler başlatılamıyor');
      return;
    }

    // Canvas elementlerini kontrol et
    const canvas1 = document.getElementById('profitLossDistChart');
    const canvas2 = document.getElementById('marginDistChart');
    const canvas3 = document.getElementById('monthlyProfitTrendChart');
    
    if (!canvas1 || !canvas2 || !canvas3) {
      console.warn('Canvas elementleri bulunamadı:', {
        profitLossDistChart: !!canvas1,
        marginDistChart: !!canvas2,
        monthlyProfitTrendChart: !!canvas3
      });
      return;
    }

    console.log('Tüm canvas elementleri bulundu, grafikler oluşturuluyor...');
    
    this.initializeProfitLossDistChart();
    this.initializeMarginDistChart();
    this.initializeMonthlyProfitTrendChart();
    
    // Veriler yüklüyse grafikleri güncelle
    if (this.approvedQuotes && this.approvedQuotes.length > 0) {
      this.updateCharts();
    }
  }

  initializeProfitLossDistChart() {
    const ctx = document.getElementById('profitLossDistChart');
    if (!ctx) {
      console.warn('profitLossDistChart canvas bulunamadı');
      return;
    }

    // Destroy existing chart if any
    if (this.charts.profitLossDistribution) {
      try {
        this.charts.profitLossDistribution.destroy();
      } catch (e) {
        console.warn('Eski grafik temizlenirken hata:', e);
      }
    }

    // Create gradient for positive values
    const ctxCanvas = ctx.getContext('2d');

    // Create more vibrant gradient for profit bars
    const positiveGradient = ctxCanvas.createLinearGradient(0, 0, 0, 400);
    positiveGradient.addColorStop(0, 'rgba(38, 222, 129, 1.0)');
    positiveGradient.addColorStop(0.5, 'rgba(46, 213, 115, 0.85)');
    positiveGradient.addColorStop(1, 'rgba(46, 204, 113, 0.7)');

    // Create more vibrant gradient for loss bars
    const negativeGradient = ctxCanvas.createLinearGradient(0, 0, 0, 400);
    negativeGradient.addColorStop(0, 'rgba(255, 71, 87, 1.0)');
    negativeGradient.addColorStop(0.5, 'rgba(231, 76, 60, 0.85)');
    negativeGradient.addColorStop(1, 'rgba(235, 59, 90, 0.7)');

    this.charts.profitLossDistribution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Kâr/Zarar ($)',
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 0,
            borderRadius: 6,
            hoverBorderWidth: 2,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 2, // Sharper rendering
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              lineWidth: 0.5,
              drawBorder: false,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                weight: '500',
                family: "'Inter', 'Segoe UI', sans-serif",
              },
              padding: 10,
              maxTicksLimit: 8,
              callback: function (value) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(value);
              },
            },
          },
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                weight: '500',
                family: "'Inter', 'Segoe UI', sans-serif",
              },
              padding: 10,
              maxRotation: 30,
              minRotation: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: getChartTooltipBg(),
            titleFont: {
              size: 15,
              weight: 'bold',
              family: "'Inter', 'Segoe UI', sans-serif",
            },
            bodyFont: {
              size: 14,
              family: "'Inter', 'Segoe UI', sans-serif",
            },
            padding: 14,
            cornerRadius: 8,
            displayColors: false,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function (context) {
                const value = context.raw;
                const formattedValue = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(value);

                if (value >= 0) {
                  return `📈 Kâr: ${formattedValue}`;
                } else {
                  return `📉 Zarar: ${formattedValue}`;
                }
              },
            },
          },
        },
      },
    });
  }

  initializeMarginDistChart() {
    const ctx = document.getElementById('marginDistChart');
    if (!ctx) {
      console.warn('marginDistChart canvas bulunamadı');
      return;
    }

    // Destroy existing chart if any
    if (this.charts.marginDistribution) {
      try {
        this.charts.marginDistribution.destroy();
      } catch (e) {
        console.warn('Eski grafik temizlenirken hata:', e);
      }
    }

    this.charts.marginDistribution = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [
          'Yüksek Kâr (>%30)',
          'Orta Kâr (%15-%30)',
          'Düşük Kâr (%0-%15)',
          'Zarar (<%0)',
        ],
        datasets: [
          {
            data: [0, 0, 0, 0],
            backgroundColor: [
              'rgba(38, 222, 129, 0.9)', // Yüksek Kâr - Parlak Yeşil
              'rgba(54, 162, 235, 0.9)', // Orta Kâr - Canlı Mavi
              'rgba(255, 207, 51, 0.9)', // Düşük Kâr - Canlı Sarı
              'rgba(255, 71, 87, 0.9)', // Zarar - Canlı Kırmızı
            ],
            borderWidth: 0,
            hoverBorderWidth: 4,
            hoverBorderColor: '#fff',
            hoverOffset: 12,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 2, // Sharper rendering
        cutout: '65%',
        radius: '90%',
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1500,
          easing: 'easeOutQuart',
        },
        layout: {
          padding: {
            top: 20,
            bottom: 20,
            left: 10,
            right: 10,
          },
        },
        plugins: {
          legend: {
            position: 'right',
            align: 'center',
            labels: {
              color: 'rgba(255, 255, 255, 0.9)',
              boxWidth: 18,
              boxHeight: 18,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: {
                size: 13,
                weight: '500',
                family: "'Inter', 'Segoe UI', sans-serif",
              },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: getChartTooltipBg(),
            titleFont: {
              size: 15,
              weight: 'bold',
              family: "'Inter', 'Segoe UI', sans-serif",
            },
            bodyFont: {
              size: 14,
              family: "'Inter', 'Segoe UI', sans-serif",
            },
            padding: 15,
            cornerRadius: 8,
            displayColors: true,
            boxPadding: 8,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.chart.data.datasets[0].data.reduce(
                  (sum, val) => sum + val,
                  0
                );
                const percentage =
                  total > 0 ? Math.round((value / total) * 100) : 0;

                let icon = '';
                if (context.dataIndex === 0) icon = '🟢';
                else if (context.dataIndex === 1) icon = '🔵';
                else if (context.dataIndex === 2) icon = '🟡';
                else if (context.dataIndex === 3) icon = '🔴';

                return `${icon} ${label}: ${value} teklif (${percentage}%)`;
              },
            },
          },
        },
        elements: {
          arc: {
            borderColor: '#0f172a', // Match background for seamless look
            borderWidth: 2,
          },
        },
      },
    });
  }

  initializeMonthlyProfitTrendChart() {
    const ctx = document.getElementById('monthlyProfitTrendChart');
    if (!ctx) {
      console.warn('monthlyProfitTrendChart canvas bulunamadı');
      return;
    }

    // Destroy existing chart if any
    if (this.charts.monthlyProfitTrend) {
      try {
        this.charts.monthlyProfitTrend.destroy();
      } catch (e) {
        console.warn('Eski grafik temizlenirken hata:', e);
      }
    }

    // Create gradients for the datasets
    const ctxCanvas = ctx.getContext('2d');

    // Quote amount gradient (blue)
    const amountGradient = ctxCanvas.createLinearGradient(0, 0, 0, 350);
    amountGradient.addColorStop(0, 'rgba(54, 162, 235, 0.6)');
    amountGradient.addColorStop(0.5, 'rgba(54, 162, 235, 0.3)');
    amountGradient.addColorStop(1, 'rgba(54, 162, 235, 0.05)');

    // Cost gradient (red)
    const costGradient = ctxCanvas.createLinearGradient(0, 0, 0, 350);
    costGradient.addColorStop(0, 'rgba(255, 71, 87, 0.6)');
    costGradient.addColorStop(0.5, 'rgba(255, 71, 87, 0.3)');
    costGradient.addColorStop(1, 'rgba(255, 71, 87, 0.05)');

    // Profit gradient (green)
    const profitGradient = ctxCanvas.createLinearGradient(0, 0, 0, 350);
    profitGradient.addColorStop(0, 'rgba(38, 222, 129, 0.6)');
    profitGradient.addColorStop(0.5, 'rgba(38, 222, 129, 0.3)');
    profitGradient.addColorStop(1, 'rgba(38, 222, 129, 0.05)');

    this.charts.monthlyProfitTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Teklif Tutarı',
            data: [],
            backgroundColor: amountGradient,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
            pointHoverBorderWidth: 3,
            order: 3,
            spanGaps: true,
          },
          {
            label: 'Gerçekleşen Maliyet',
            data: [],
            backgroundColor: costGradient,
            borderColor: 'rgba(255, 71, 87, 1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: 'rgba(255, 71, 87, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(255, 71, 87, 1)',
            pointHoverBorderWidth: 3,
            order: 2,
            spanGaps: true,
          },
          {
            label: 'Kâr/Zarar',
            data: [],
            backgroundColor: profitGradient,
            borderColor: 'rgba(38, 222, 129, 1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: 'rgba(38, 222, 129, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(38, 222, 129, 1)',
            pointHoverBorderWidth: 3,
            order: 1,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 2, // Sharper rendering
        interaction: {
          mode: 'index',
          intersect: false,
        },
        animations: {
          tension: {
            duration: 1000,
            easing: 'easeOutQuad',
            from: 0.4,
            to: 0.3,
            loop: false,
          },
        },
        scales: {
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false,
              lineWidth: 0.5,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                weight: '500',
                family: "'Inter', 'Segoe UI', sans-serif",
              },
              padding: 10,
              maxTicksLimit: 8,
              callback: function (value) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(value);
              },
            },
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false,
              lineWidth: 0.5,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                weight: '500',
                family: "'Inter', 'Segoe UI', sans-serif",
              },
              padding: 10,
              maxRotation: 0,
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                weight: '500',
                size: 13,
                family: "'Inter', 'Segoe UI', sans-serif",
              },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: getChartTooltipBg(),
            titleFont: {
              size: 15,
              weight: 'bold',
              family: "'Inter', 'Segoe UI', sans-serif",
            },
            bodyFont: {
              size: 14,
              family: "'Inter', 'Segoe UI', sans-serif",
            },
            padding: 14,
            cornerRadius: 8,
            xAlign: 'center',
            yAlign: 'center',
            position: 'nearest',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function (context) {
                let icon = '';
                if (context.datasetIndex === 0) icon = '🔵';
                else if (context.datasetIndex === 1) icon = '🔴';
                else if (context.datasetIndex === 2) icon = '🟢';

                const label = context.dataset.label;
                const value = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(context.raw);

                return `${icon} ${label}: ${value}`;
              },
            },
          },
        },
      },
    });

    // Store the complete data for filtering
    this.fullMonthlyTrendData = {
      labels: [],
      amounts: [],
      costs: [],
      profits: [],
    };
  }

  updateCharts() {
    console.log('Tüm kar zarar analizi grafikleri güncelleniyor...');
    
    try {
      this.updateProfitLossDistChart();
      console.log('✓ Kâr/Zarar dağılım grafiği güncellendi');
    } catch (error) {
      console.error('Kâr/Zarar dağılım grafiği güncellenirken hata:', error);
    }
    
    try {
      this.updateMarginDistChart();
      console.log('✓ Kâr marjı dağılım grafiği güncellendi');
    } catch (error) {
      console.error('Kâr marjı dağılım grafiği güncellenirken hata:', error);
    }
    
    try {
      this.updateMonthlyProfitTrendChart();
      console.log('✓ Aylık kâr/zarar trendi grafiği güncellendi');
    } catch (error) {
      console.error('Aylık kâr/zarar trendi grafiği güncellenirken hata:', error);
    }
    
    console.log('Tüm grafikler güncellendi');
  }

  updateProfitLossDistChart() {
    if (!this.charts.profitLossDistribution) {
      console.warn('profitLossDistribution chart not initialized');
      return;
    }

    // Ensure arrays are properly initialized
    if (
      !this.approvedQuotes ||
      !Array.isArray(this.approvedQuotes) ||
      !this.actualCosts ||
      !Array.isArray(this.actualCosts)
    ) {
      console.warn('Required data arrays not properly initialized', {
        approvedQuotes: this.approvedQuotes?.length || 0,
        actualCosts: this.actualCosts?.length || 0
      });
      // Reset chart to empty state
      this.charts.profitLossDistribution.data.labels = [];
      this.charts.profitLossDistribution.data.datasets[0].data = [];
      this.charts.profitLossDistribution.data.datasets[0].backgroundColor = [];
      this.charts.profitLossDistribution.data.datasets[0].borderColor = [];
      this.charts.profitLossDistribution.update();
      return;
    }

    console.log('Kâr/Zarar dağılım grafiği güncelleniyor...', {
      approvedQuotes: this.approvedQuotes.length,
      actualCosts: this.actualCosts.length
    });

    // Get quotes with cost data
    const quotesWithCost = this.approvedQuotes.filter((quote) => {
      if (!quote || !quote.id) return false;
      const hasCost = this.actualCosts.some(
        (cost) => cost && cost.quote_id === quote.id
      );
      return hasCost;
    });

    console.log('Maliyet verisi olan teklif sayısı:', quotesWithCost.length);

    if (quotesWithCost.length === 0) {
      console.warn('Maliyet verisi olan teklif bulunamadı');
      // Reset chart to empty state
      this.charts.profitLossDistribution.data.labels = [];
      this.charts.profitLossDistribution.data.datasets[0].data = [];
      this.charts.profitLossDistribution.data.datasets[0].backgroundColor = [];
      this.charts.profitLossDistribution.data.datasets[0].borderColor = [];
      this.charts.profitLossDistribution.update();
      return;
    }

    // Prepare data for chart
    const labels = quotesWithCost.map(
      (quote) => quote.number || `Teklif #${quote.id}`
    );
    const data = quotesWithCost.map((quote) => {
      const costData = this.actualCosts.find(
        (cost) => cost && cost.quote_id === quote.id
      );
      if (!costData) {
        console.warn(`Teklif #${quote.id} için maliyet verisi bulunamadı`);
        return 0;
      }

      const quoteAmount = this.parseNumericValue(quote.total_price);
      const actualCost = this.parseNumericValue(costData.actual_cost);
      const profit = quoteAmount - actualCost;
      
      console.log(`Teklif #${quote.id}: Tutar=${quoteAmount}, Maliyet=${actualCost}, Kâr/Zarar=${profit}`);
      
      return profit;
    });

    console.log('Grafik verileri hazırlandı:', {
      labels: labels.length,
      dataPoints: data.length,
      sampleData: data.slice(0, 3)
    });

    // Get canvas context for gradients
    const canvas = document.getElementById('profitLossDistChart');
    if (!canvas) {
      console.error('profitLossDistChart canvas bulunamadı');
      return;
    }
    const ctx = canvas.getContext('2d');

    // Create gradients
    const positiveGradient = ctx.createLinearGradient(0, 0, 0, 400);
    positiveGradient.addColorStop(0, 'rgba(38, 222, 129, 1.0)');
    positiveGradient.addColorStop(0.5, 'rgba(46, 213, 115, 0.85)');
    positiveGradient.addColorStop(1, 'rgba(46, 204, 113, 0.7)');

    const negativeGradient = ctx.createLinearGradient(0, 0, 0, 400);
    negativeGradient.addColorStop(0, 'rgba(255, 71, 87, 1.0)');
    negativeGradient.addColorStop(0.5, 'rgba(231, 76, 60, 0.85)');
    negativeGradient.addColorStop(1, 'rgba(235, 59, 90, 0.7)');

    // Colors based on profit/loss with gradients
    const backgroundColors = data.map((value) =>
      value >= 0 ? positiveGradient : negativeGradient
    );
    const borderColors = data.map((value) =>
      value >= 0 ? 'rgba(38, 222, 129, 1.0)' : 'rgba(255, 71, 87, 1.0)'
    );

    // Update chart
    this.charts.profitLossDistribution.data.labels = labels;
    this.charts.profitLossDistribution.data.datasets[0].data = data;
    this.charts.profitLossDistribution.data.datasets[0].backgroundColor =
      backgroundColors;
    this.charts.profitLossDistribution.data.datasets[0].borderColor =
      borderColors;
    this.charts.profitLossDistribution.update();
  }

  updateMarginDistChart() {
    if (!this.charts.marginDistribution) {
      console.warn('marginDistribution chart not initialized');
      return;
    }

    // Ensure arrays are properly initialized
    if (
      !this.approvedQuotes ||
      !Array.isArray(this.approvedQuotes) ||
      !this.actualCosts ||
      !Array.isArray(this.actualCosts)
    ) {
      console.warn('Required data arrays not properly initialized');
      // Reset chart to empty state
      this.charts.marginDistribution.data.datasets[0].data = [0, 0, 0, 0];
      this.charts.marginDistribution.update();
      return;
    }

    // Calculate margin distribution
    let highMargin = 0; // >30%
    let mediumMargin = 0; // 15-30%
    let lowMargin = 0; // 0-15%
    let loss = 0; // <0%

    // Get quotes with cost data
    this.approvedQuotes.forEach((quote) => {
      if (!quote || !quote.id) return; // Skip invalid quotes

      const costData = this.actualCosts.find(
        (cost) => cost && cost.quote_id === quote.id
      );
      if (costData) {
        const quoteAmount = this.parseNumericValue(quote.total_price);
        const actualCost = this.parseNumericValue(costData.actual_cost);

        if (quoteAmount <= 0) return; // Skip quotes with zero or negative amount

        const profit = quoteAmount - actualCost;
        const marginPercent = (profit / quoteAmount) * 100;

        if (marginPercent < 0) {
          loss++;
        } else if (marginPercent < 15) {
          lowMargin++;
        } else if (marginPercent < 30) {
          mediumMargin++;
        } else {
          highMargin++;
        }
      }
    });

    console.log('Kâr marjı dağılımı:', {
      highMargin,
      mediumMargin,
      lowMargin,
      loss
    });

    // Update chart
    this.charts.marginDistribution.data.datasets[0].data = [
      highMargin,
      mediumMargin,
      lowMargin,
      loss,
    ];
    this.charts.marginDistribution.update();
  }

  updateMonthlyProfitTrendChart() {
    if (!this.charts.monthlyProfitTrend) {
      console.warn('monthlyProfitTrend chart not initialized');
      return;
    }

    // Ensure arrays are properly initialized
    if (
      !this.approvedQuotes ||
      !Array.isArray(this.approvedQuotes) ||
      !this.actualCosts ||
      !Array.isArray(this.actualCosts)
    ) {
      console.warn('Required data arrays not properly initialized');
      // Reset chart to empty state
      this.charts.monthlyProfitTrend.data.labels = [];
      this.charts.monthlyProfitTrend.data.datasets[0].data = [];
      this.charts.monthlyProfitTrend.data.datasets[1].data = [];
      this.charts.monthlyProfitTrend.data.datasets[2].data = [];
      this.charts.monthlyProfitTrend.update();
      return;
    }

    // Get quotes with cost data
    const quotesWithCost = this.approvedQuotes.filter((quote) => {
      if (!quote || !quote.id) return false;
      return this.actualCosts.some(
        (cost) => cost && cost.quote_id === quote.id
      );
    });

    if (quotesWithCost.length === 0) {
      // No data to display
      this.charts.monthlyProfitTrend.data.labels = [];
      this.charts.monthlyProfitTrend.data.datasets[0].data = [];
      this.charts.monthlyProfitTrend.data.datasets[1].data = [];
      this.charts.monthlyProfitTrend.data.datasets[2].data = [];
      this.charts.monthlyProfitTrend.update();
      return;
    }

    // Group quotes by month
    const monthlyData = {};

    quotesWithCost.forEach((quote) => {
      try {
        if (!quote || (!quote.date && !quote.created_at)) {
          console.warn('Quote missing date information:', quote);
          return; // Skip this quote
        }

        const date = new Date(quote.date || quote.created_at);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date for quote:', quote);
          return; // Skip this quote
        }

        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const costData = this.actualCosts.find(
          (cost) => cost && cost.quote_id === quote.id
        );

        if (!costData) {
          console.warn('No cost data found for quote:', quote);
          return; // Skip this quote
        }

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: this.getMonthName(date.getMonth()),
            year: date.getFullYear(),
            totalAmount: 0,
            totalCost: 0,
            totalProfit: 0,
          };
        }

        const quoteAmount = this.parseNumericValue(quote.total_price);
        const actualCost = this.parseNumericValue(costData.actual_cost);
        const profit = quoteAmount - actualCost;

        monthlyData[monthKey].totalAmount += quoteAmount;
        monthlyData[monthKey].totalCost += actualCost;
        monthlyData[monthKey].totalProfit += profit;
      } catch (error) {
        console.error(
          'Error processing quote for monthly chart:',
          error,
          quote
        );
        // Continue with the next quote
      }
    });

    // Safety check if no valid data was processed
    if (Object.keys(monthlyData).length === 0) {
      this.charts.monthlyProfitTrend.data.labels = [];
      this.charts.monthlyProfitTrend.data.datasets[0].data = [];
      this.charts.monthlyProfitTrend.data.datasets[1].data = [];
      this.charts.monthlyProfitTrend.data.datasets[2].data = [];
      this.charts.monthlyProfitTrend.update();
      return;
    }

    // Sort by date
    const sortedMonths = Object.values(monthlyData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return this.getMonthIndex(a.month) - this.getMonthIndex(b.month);
    });

    // Prepare data for chart
    const labels = sortedMonths.map((data) => `${data.month} ${data.year}`);
    const amounts = sortedMonths.map((data) => data.totalAmount);
    const costs = sortedMonths.map((data) => data.totalCost);
    const profits = sortedMonths.map((data) => data.totalProfit);

    // Store full data for filtering
    this.fullMonthlyTrendData = {
      labels,
      amounts,
      costs,
      profits,
    };

    console.log('Aylık kâr/zarar trendi verileri hazırlandı:', {
      labels: labels.length,
      amounts: amounts.length,
      costs: costs.length,
      profits: profits.length,
      sampleLabels: labels.slice(0, 3),
      sampleProfits: profits.slice(0, 3)
    });

    // Update chart
    this.charts.monthlyProfitTrend.data.labels = labels;
    this.charts.monthlyProfitTrend.data.datasets[0].data = amounts;
    this.charts.monthlyProfitTrend.data.datasets[1].data = costs;
    this.charts.monthlyProfitTrend.data.datasets[2].data = profits;
    this.charts.monthlyProfitTrend.update();
  }

  // Helper functions
  formatCurrency(value) {
    if (value === null || value === undefined) return '-';

    try {
      // Handle non-numeric values
      const numValue =
        typeof value === 'number'
          ? value
          : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

      // Check if parsing resulted in a valid number
      if (isNaN(numValue)) return '-';

      // Format with Turkish locale and USD currency
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue);
    } catch (error) {
      console.error('Currency formatting error:', error, value);
      return '$0.00';
    }
  }

  formatDate(dateString) {
    if (!dateString) return '-';

    try {
      // Try parsing as ISO date first
      let date = new Date(dateString);

      // If invalid, try different formats
      if (isNaN(date.getTime())) {
        // Try DD.MM.YYYY format
        if (dateString.includes('.')) {
          const parts = dateString.split('.');
          if (parts.length === 3) {
            date = new Date(
              parseInt(parts[2]), // year
              parseInt(parts[1]) - 1, // month (0-11)
              parseInt(parts[0]) // day
            );
          }
        }

        // Still invalid
        if (isNaN(date.getTime())) {
          return 'Geçersiz Tarih';
        }
      }

      // Format date using Turkish locale
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return 'Geçersiz Tarih';
    }
  }

  getMonthName(monthIndex) {
    const months = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ];
    return months[monthIndex];
  }

  getMonthIndex(monthName) {
    const months = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ];
    return months.indexOf(monthName);
  }

  // New methods for enhanced functionality

  // Switch chart type (bar/line) for profit loss distribution
  switchChartType(chartType) {
    if (!this.charts.profitLossDistribution) {
      console.warn('profitLossDistribution chart not initialized');
      return;
    }

    // Store current data
    const currentData = {
      labels: this.charts.profitLossDistribution.data.labels,
      data: this.charts.profitLossDistribution.data.datasets[0].data,
    };

    // Destroy current chart
    this.charts.profitLossDistribution.destroy();

    // Create new chart with specified type
    const ctx = document.getElementById('profitLossDistChart');
    if (!ctx) return;

    // Create canvas context for gradients
    const ctxCanvas = ctx.getContext('2d');

    // Create vibrant gradients
    const positiveGradient = ctxCanvas.createLinearGradient(0, 0, 0, 400);
    positiveGradient.addColorStop(0, 'rgba(38, 222, 129, 1.0)');
    positiveGradient.addColorStop(0.5, 'rgba(46, 213, 115, 0.85)');
    positiveGradient.addColorStop(1, 'rgba(46, 204, 113, 0.7)');

    const negativeGradient = ctxCanvas.createLinearGradient(0, 0, 0, 400);
    negativeGradient.addColorStop(0, 'rgba(255, 71, 87, 1.0)');
    negativeGradient.addColorStop(0.5, 'rgba(231, 76, 60, 0.85)');
    negativeGradient.addColorStop(1, 'rgba(235, 59, 90, 0.7)');

    // Prepare background and border colors based on values
    const backgroundColors = currentData.data.map((value) =>
      value >= 0 ? positiveGradient : negativeGradient
    );
    const borderColors = currentData.data.map((value) =>
      value >= 0 ? 'rgba(38, 222, 129, 1.0)' : 'rgba(255, 71, 87, 1.0)'
    );

    // Default dataset configuration
    const datasetConfig = {
      label: 'Kâr/Zarar ($)',
      data: currentData.data,
      borderWidth: chartType === 'line' ? 3 : 0,
      hoverBorderWidth: chartType === 'line' ? 4 : 2,
    };

    // Add chart-type specific configurations
    if (chartType === 'line') {
      Object.assign(datasetConfig, {
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        borderColor: currentData.data.map((value) =>
          value >= 0 ? 'rgba(38, 222, 129, 1.0)' : 'rgba(255, 71, 87, 1.0)'
        ),
        fill: true,
        tension: 0.3,
        pointRadius: 6,
        pointBackgroundColor: currentData.data.map((value) =>
          value >= 0 ? 'rgba(38, 222, 129, 1.0)' : 'rgba(255, 71, 87, 1.0)'
        ),
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: currentData.data.map((value) =>
          value >= 0 ? 'rgba(38, 222, 129, 1.0)' : 'rgba(255, 71, 87, 1.0)'
        ),
        pointHoverBorderWidth: 3,
      });
    } else {
      // bar chart
      Object.assign(datasetConfig, {
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderRadius: 6,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      });
    }

    this.charts.profitLossDistribution = new Chart(ctx, {
      type: chartType,
      data: {
        labels: currentData.labels,
        datasets: [datasetConfig],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 2, // Sharper rendering
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              lineWidth: 0.5,
              drawBorder: false,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                weight: '500',
                family: "'Inter', 'Segoe UI', sans-serif",
              },
              padding: 10,
              maxTicksLimit: 8,
              callback: function (value) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(value);
              },
            },
          },
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: {
                weight: '500',
                family: "'Inter', 'Segoe UI', sans-serif",
              },
              padding: 10,
              maxRotation: 30,
              minRotation: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: getChartTooltipBg(),
            titleFont: {
              size: 15,
              weight: 'bold',
              family: "'Inter', 'Segoe UI', sans-serif",
            },
            bodyFont: {
              size: 14,
              family: "'Inter', 'Segoe UI', sans-serif",
            },
            padding: 14,
            cornerRadius: 8,
            displayColors: false,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function (context) {
                const value = context.raw;
                const formattedValue = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(value);

                if (value >= 0) {
                  return `📈 Kâr: ${formattedValue}`;
                } else {
                  return `📉 Zarar: ${formattedValue}`;
                }
              },
            },
          },
        },
      },
    });
  }

  // Filter monthly trend chart by period
  filterChartByPeriod(period) {
    if (!this.charts.monthlyProfitTrend || !this.fullMonthlyTrendData) {
      console.warn('Monthly profit trend chart or data not initialized');
      return;
    }

    let filteredLabels = [];
    let filteredAmounts = [];
    let filteredCosts = [];
    let filteredProfits = [];

    if (period === 'all') {
      // Use all data
      filteredLabels = [...this.fullMonthlyTrendData.labels];
      filteredAmounts = [...this.fullMonthlyTrendData.amounts];
      filteredCosts = [...this.fullMonthlyTrendData.costs];
      filteredProfits = [...this.fullMonthlyTrendData.profits];
    } else {
      // Filter by period
      const monthsToShow = parseInt(period);

      if (isNaN(monthsToShow) || monthsToShow <= 0) {
        console.warn('Invalid period:', period);
        return;
      }

      const totalMonths = this.fullMonthlyTrendData.labels.length;
      const startIndex = Math.max(0, totalMonths - monthsToShow);

      filteredLabels = this.fullMonthlyTrendData.labels.slice(startIndex);
      filteredAmounts = this.fullMonthlyTrendData.amounts.slice(startIndex);
      filteredCosts = this.fullMonthlyTrendData.costs.slice(startIndex);
      filteredProfits = this.fullMonthlyTrendData.profits.slice(startIndex);
    }

    // Update chart with filtered data
    this.charts.monthlyProfitTrend.data.labels = filteredLabels;
    this.charts.monthlyProfitTrend.data.datasets[0].data = filteredAmounts;
    this.charts.monthlyProfitTrend.data.datasets[1].data = filteredCosts;
    this.charts.monthlyProfitTrend.data.datasets[2].data = filteredProfits;
    this.charts.monthlyProfitTrend.update();
  }

  // Export table to Excel with modern design
  exportTableToExcel() {
    try {
      const table = document.getElementById('profit-loss-table');
      if (!table) {
        console.warn('Table not found for export');
        return;
      }

      // Create a workbook
      const wb = XLSX.utils.book_new();
      wb.Props = {
        Title: 'Kâr-Zarar Analiz Raporu',
        Subject: 'Onaylanan Teklifler',
        Author: 'SAVE POINT',
        CreatedDate: new Date(),
      };

      // Get data from table
      const data = [];

      // Get headers
      const headers = [];
      const headerCells = table.querySelectorAll('thead th');
      headerCells.forEach((cell) => {
        if (cell.cellIndex < headerCells.length - 1) {
          // Skip "İşlemler" column
          headers.push(cell.textContent);
        }
      });
      data.push(headers);

      // Get table data
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row) => {
        const rowData = [];
        const cells = row.querySelectorAll('td');
        cells.forEach((cell) => {
          if (cell.cellIndex < cells.length - 1) {
            // Skip "İşlemler" column
            // Clean up data (remove currency symbols for better Excel formatting)
            let value = cell.textContent.trim();
            if (value.startsWith('$')) {
              // Parse currency values for proper Excel formatting
              value = parseFloat(value.replace(/[$,]/g, ''));
            } else if (value.startsWith('%')) {
              // Parse percentage values
              value = parseFloat(value.replace('%', '')) / 100;
            }
            rowData.push(value);
          }
        });
        data.push(rowData);
      });

      // Get summary data for the report
      const totalProfit =
        document.getElementById('totalProfitAmount')?.textContent || '$0';
      const totalApproved =
        document.getElementById('totalApprovedCount')?.textContent || '0';
      const averageMargin =
        document.getElementById('averageProfitMargin')?.textContent || '%0';

      // Add summary worksheet
      const summaryData = [
        ['KÂR-ZARAR ANALİZ RAPORU - ÖZET'],
        [''],
        ['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')],
        ['Toplam Onaylanan Teklif:', totalApproved],
        ['Toplam Kâr:', totalProfit],
        ['Ortalama Kâr Marjı:', averageMargin],
        [''],
        [
          'Bu rapor SAVE POINT Yönetim Sistemi tarafından otomatik olarak oluşturulmuştur.',
        ],
      ];

      // Create a summary worksheet
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

      // Add column width and styling information to summary
      summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];

      // Add to workbook
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Özet');

      // Create the main data worksheet with column formats
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Teklif No
        { wch: 12 }, // Tarih
        { wch: 20 }, // Hazırlayan
        { wch: 15 }, // Teklif Tutarı
        { wch: 15 }, // Gerçekleşen Maliyet
        { wch: 15 }, // Kâr/Zarar
        { wch: 12 }, // Kâr Marjı (%)
      ];

      // Apply special formatting to currency and percentage columns
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = 1; R <= range.e.r; ++R) {
        // Skip header row
        // Format currency columns (3, 4, 5)
        for (let C = 3; C <= 5; ++C) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (cell && typeof cell.v === 'number') {
            cell.z = '$#,##0.00';
            cell.t = 'n';
          }
        }

        // Format percentage column (6)
        const marginCell = ws[XLSX.utils.encode_cell({ r: R, c: 6 })];
        if (marginCell && typeof marginCell.v === 'number') {
          marginCell.z = '0.00%';
          marginCell.t = 'n';
        }
      }

      // Add the data worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Kâr-Zarar Analizi');

      // Save as Excel file
      const fileName = `Kar-Zarar-Analizi-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      console.log(
        'Table exported to Excel with enhanced formatting:',
        fileName
      );
    } catch (error) {
      console.error('Failed to export table to Excel:', error);
      alert(
        'Excel dosyası oluşturulamadı. SheetJS kütüphanesi yüklü değil veya bir hata oluştu.'
      );
    }
  }

  // Export table to PDF with modern design
  exportTableToPDF() {
    try {
      const table = document.getElementById('profit-loss-table');
      if (!table) {
        console.warn('Table not found for export');
        return;
      }

      // Get total profit amount for report
      const totalProfit =
        document.getElementById('totalProfitAmount')?.textContent || '$0';
      const totalApproved =
        document.getElementById('totalApprovedCount')?.textContent || '0';
      const averageMargin =
        document.getElementById('averageProfitMargin')?.textContent || '%0';
      const currentDate = new Date().toLocaleDateString('tr-TR');

      // Configure PDF document (landscape A4)
      const fileName = `Kar-Zarar-Analizi-${new Date().toISOString().split('T')[0]}.pdf`;

      // Create PDF document with improved styling
      // Using try-catch blocks around critical sections
      let doc;
      try {
        doc = new jsPDF.jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: 'a4',
          compress: true,
        });
      } catch (jsPdfError) {
        console.error('Failed to initialize jsPDF:', jsPdfError);
        alert('PDF oluşturulamadı. jsPDF kütüphanesi yüklenirken hata oluştu.');
        return;
      }

      // Document dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;

      // Add custom header with logo - with error handling
      const addHeader = () => {
        try {
          // Background rectangle for header
          doc.setFillColor(42, 58, 80);
          doc.rect(0, 0, pageWidth, 70, 'F');

          // Title text
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(22);
          doc.text('SAVE POINT YÖNETİM SİSTEMİ', margin, 30);

          // Subtitle text
          doc.setFontSize(16);
          doc.text('Kâr/Zarar Analiz Raporu', margin, 55);

          // Date info in top right
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Oluşturma Tarihi: ${currentDate}`,
            pageWidth - margin - 150,
            30
          );
        } catch (headerError) {
          console.error('Error adding PDF header:', headerError);
          // Continue without header if there's an error
        }
      };

      // Add footer with page numbers - with error handling
      const addFooter = (pageNum, totalPages) => {
        try {
          const footerY = pageHeight - 25;

          // Background rectangle for footer
          doc.setFillColor(240, 240, 240);
          doc.rect(0, footerY - 15, pageWidth, 40, 'F');

          // Page numbers
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Sayfa ${pageNum} / ${totalPages}`, pageWidth / 2, footerY, {
            align: 'center',
          });

          // Company info
          doc.text('© SAVE POINT Yönetim Sistemi', margin, footerY);

          // Current date
          doc.text(currentDate, pageWidth - margin, footerY, {
            align: 'right',
          });
        } catch (footerError) {
          console.error('Error adding PDF footer:', footerError);
          // Continue without footer if there's an error
        }
      };

      // Add header to first page
      try {
        addHeader();

        // Add summary box
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(margin, 90, pageWidth - margin * 2, 100, 5, 5, 'FD');

        // Add summary content
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RAPOR ÖZETİ', margin + 20, 115);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        // Left column
        doc.text('Toplam Onaylanan Teklif:', margin + 20, 145);
        doc.text('Toplam Kâr:', margin + 20, 170);

        // Right column
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');

        // Values
        doc.text(totalApproved, margin + 170, 145);

        // Color the profit value based on amount
        // Safely parse the profit value
        let profitValue = 0;
        try {
          profitValue = parseFloat(totalProfit.replace(/[$,]/g, '')) || 0;
        } catch (parseError) {
          console.warn('Failed to parse profit value:', parseError);
          profitValue = 0;
        }

        if (profitValue >= 0) {
          doc.setTextColor(46, 204, 113); // Green for profit
        } else {
          doc.setTextColor(231, 76, 60); // Red for loss
        }
        doc.text(totalProfit, margin + 170, 170);

        // Reset text color
        doc.setTextColor(50, 50, 50);

        // Add table title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Onaylanan Teklifler ve Maliyet Analizi', margin, 220);
      } catch (contentError) {
        console.error('Error adding content to PDF:', contentError);
        // Continue to table if possible
      }

      // Add table
      const headers = [];
      const data = [];

      // Get headers
      try {
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach((cell) => {
          if (cell.cellIndex < headerCells.length - 1) {
            // Skip "İşlemler" column
            // Clean header text for PDF (remove any HTML)
            const headerText = cell.textContent.trim();
            headers.push(headerText);
          }
        });
      } catch (headerError) {
        console.error('Error processing table headers:', headerError);
        headers.push(
          'Teklif No',
          'Tarih',
          'Hazırlayan',
          'Teklif Tutarı',
          'Gerçekleşen Maliyet',
          'Kâr/Zarar',
          'Kâr Marjı (%)'
        );
      }

      // Get data rows
      try {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row) => {
          const rowData = [];
          const cells = row.querySelectorAll('td');
          cells.forEach((cell) => {
            if (cell.cellIndex < cells.length - 1) {
              // Skip "İşlemler" column
              // Clean cell text for PDF (handle special characters)
              const cellText = cell.textContent.trim() || '-';
              rowData.push(cellText);
            }
          });

          if (rowData.length > 0) {
            data.push(rowData);
          }
        });
      } catch (dataError) {
        console.error('Error processing table data:', dataError);
        data.push(['Veri işlenirken hata oluştu']);
      }

      // Style options for the table
      const tableOptions = {
        head: [headers],
        body: data,
        startY: 230,
        styles: {
          fontSize: 10,
          cellPadding: 5,
          lineColor: [200, 200, 200],
          lineWidth: 0.5,
          font: 'helvetica', // Use standard font to avoid errors
        },
        headStyles: {
          fillColor: [42, 65, 95],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { halign: 'left' }, // Teklif No
          1: { halign: 'left' }, // Tarih
          2: { halign: 'left' }, // Hazırlayan
          3: { halign: 'right' }, // Teklif Tutarı
          4: { halign: 'right' }, // Gerçekleşen Maliyet
          5: { halign: 'right' }, // Kâr/Zarar
          6: { halign: 'center' }, // Kâr Marjı (%)
        },
        didDrawPage: function (data) {
          try {
            // Add header and footer except on first page
            if (data.pageNumber > 1) {
              addHeader();
            }
            // Add footer to every page
            addFooter(data.pageNumber, data.pageCount);
          } catch (pageError) {
            console.error('Error in didDrawPage:', pageError);
          }
        },
        willDrawCell: function (data) {
          try {
            // Handle empty cells
            if (
              data.cell.text === undefined ||
              data.cell.text === null ||
              data.cell.text === ''
            ) {
              data.cell.text = '-';
            }
          } catch (cellError) {
            console.error('Error in willDrawCell:', cellError);
          }
        },
        didParseCell: function (data) {
          try {
            // Apply special styling for profit/loss column
            if (data.section === 'body' && data.column.index === 5) {
              const value = data.cell.raw;
              if (value !== '-') {
                // Extract numeric value with better error handling
                try {
                  const numValue = parseFloat(value.replace(/[$,]/g, '')) || 0;
                  if (numValue >= 0) {
                    data.cell.styles.textColor = [46, 204, 113]; // Green for profit
                  } else {
                    data.cell.styles.textColor = [231, 76, 60]; // Red for loss
                  }
                  data.cell.styles.fontStyle = 'bold';
                } catch (parseError) {
                  console.warn('Error parsing profit value:', parseError);
                }
              }
            }

            // Apply styling for margin column
            if (data.section === 'body' && data.column.index === 6) {
              const value = data.cell.raw;
              if (value !== '-') {
                // Extract numeric value with better error handling
                try {
                  const numValue = parseFloat(value.replace('%', '')) || 0;
                  if (numValue >= 30) {
                    data.cell.styles.textColor = [46, 204, 113]; // Green for high margin
                  } else if (numValue >= 15) {
                    data.cell.styles.textColor = [52, 152, 219]; // Blue for medium margin
                  } else if (numValue >= 0) {
                    data.cell.styles.textColor = [230, 126, 34]; // Orange for low margin
                  } else {
                    data.cell.styles.textColor = [231, 76, 60]; // Red for negative margin
                  }
                } catch (parseError) {
                  console.warn('Error parsing margin value:', parseError);
                }
              }
            }
          } catch (parseError) {
            console.error('Error in didParseCell:', parseError);
          }
        },
      };

      try {
        // Add table to the PDF
        doc.autoTable(tableOptions);

        // Save the PDF
        doc.save(fileName);

        console.log('Table exported to PDF with enhanced design:', fileName);
      } catch (finalError) {
        console.error('Error generating final PDF:', finalError);
        alert('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Failed to export table to PDF:', error);
      alert(
        'PDF dosyası oluşturulamadı. jsPDF kütüphanesi yüklü değil veya bir hata oluştu: ' +
          error.message
      );
    }
  }

  // Format currency with symbols and colors for display
  formatCurrencyWithColor(value) {
    if (value === null || value === undefined) return '-';

    try {
      // Handle non-numeric values
      const numValue =
        typeof value === 'number'
          ? value
          : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

      // Check if parsing resulted in a valid number
      if (isNaN(numValue)) return '-';

      // Format with Turkish locale and USD currency
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue);

      // Add color based on positive/negative
      const color = numValue >= 0 ? 'var(--success)' : 'var(--error)';
      return `<span style="color: ${color};">${formatted}</span>`;
    } catch (error) {
      console.error('Currency formatting error:', error, value);
      return '$0.00';
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the dashboard page with profit/loss tab
  if (document.getElementById('profit-loss')) {
    window.profitLossManager = new ProfitLossManager();
  }
});

export default ProfitLossManager;
