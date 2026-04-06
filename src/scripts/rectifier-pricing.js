class RectifierPricing {
  constructor() {
    // Excel dosya yolu base path
    this.basePath =
      '//10.0.0.3/c$/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel/';

    // Excel dosya isimleri (Seçenek 2: Ayrı dosyalar)
    this.excelFiles = {
      terminals: 'Rectifier.xlsx',
      circuitBreakers: 'CircuitBreakers.xlsx',
      currentReadingCards: 'CurrentReadingCards.xlsx',
      freewheelingDiodes: 'FreewheelingDiodes.xlsx',
      thyristors: 'Thyristors.xlsx',
      /* API/IPC: Rectifier.xlsx → DCComponents; DC şok satırları Product Type ile filtrelenir */
      dcChokes: 'Rectifier.xlsx (DCComponents)',
      dcCapacitors: 'DCCapacitors.xlsx',
      transformers: 'Transformers.xlsx',
    };

    // Excel verileri cache
    this.excelData = {
      terminals: [],
      circuitBreakers: [],
      currentReadingCards: [],
      freewheelingDiodes: [],
      thyristors: [],
      dcChokes: [],
      dcCapacitors: [],
      transformers: [],
      coolingComponents: [],
      diodeDroppers: [],
      relays: [],
      controlCards: [],
      measurementInstruments: [],
      communicationProtocols: [],
      relayAlarmOutputs: [],
      cabinets: [],
      options: [],
    };

    // Hesaplama sonuçları
    this.calculationResults = null;
    this.selectedComponents = [];

    // UI elementleri
    this.initializeUI();
    this.setupEventListeners();
    this.setupWindowControls();
    this.setupMenubar();

    // Logo ayarlarını başlat - varsayılan olarak EPC logosu kullan
    this.initializeLogoSettings();

    // Excel verilerini yükle
    this.loadAllExcelData();
  }

  // Logo ayarlarını başlat - varsayılan olarak EPC logosu
  initializeLogoSettings() {
    // Eğer logo modu set edilmemişse, varsayılan olarak 'Default' (EPC logosu) kullan
    if (!localStorage.getItem('rectifierLogoMode')) {
      localStorage.setItem('rectifierLogoMode', 'Default');
    }
  }

  initializeUI() {
    // Proje / müşteri bilgileri
    this.projectInputs = {
      customerName: document.getElementById('projectCustomerName'),
      quoteRef: document.getElementById('projectQuoteRef'),
      deviceCount: document.getElementById('projectDeviceCount'),
      quoteDate: document.getElementById('projectQuoteDate'), // Sipariş tarihi -> Teklif tarihi
      deliveryWindow: document.getElementById('projectDeliveryWindow'),
      incoterms: document.getElementById('projectIncoterms'),
      packingType: document.getElementById('projectPackingType'),
      brand: document.getElementById('projectBrand'),
      deviceLanguage: document.getElementById('projectDeviceLanguage'),
      preparedBy: document.getElementById('projectPreparedBy'),
    };

    // Cihaz Giriş Bilgileri
    this.deviceInputs = {
      inputVoltageNominal: document.getElementById('inputVoltageNominal'),
      inputVoltageTolerance: document.getElementById('inputVoltageTolerance'),
      inputPhase: document.getElementById('inputPhase'),
      inputNeutral: document.getElementById('inputNeutral'),
      systemFrequency: document.getElementById('systemFrequency'),
      acPowerFactor: document.getElementById('acPowerFactor'),
      acInputCurrentTHD: document.getElementById('acInputCurrentTHD'),
    };

    // Cihaz Çıkış Bilgileri
    this.deviceOutputs = {
      outputVoltage: document.getElementById('outputVoltage'),
      outputCurrent: document.getElementById('outputCurrent'),
      topology: document.getElementById('topology'),
      dcRipple: document.getElementById('dcRipple'),
      extraLoadOutput: document.getElementById('extraLoadOutput'),
      diodeDropper: document.getElementById('diodeDropper'),
      dropperVoltageDropV: document.getElementById('dropperVoltageDropV'),
      internalDistribution: document.getElementById('internalDistribution'),
      batteryLVD: document.getElementById('batteryLVD'),
    };

    // Akü Bilgileri
    this.batteryInputs = {
      batteryType: document.getElementById('batteryType'),
      batteryVoltage: document.getElementById('batteryVoltage'),
      batteryInCabinet: document.getElementById('batteryInCabinet'),
      internalBatteryQuantity: document.getElementById('internalBatteryQuantity'),
      internalBatteryName: document.getElementById('internalBatteryName'),
      batteryCellCount: document.getElementById('batteryCellCount'),
      batteryVoltagePerCell: document.getElementById('batteryVoltagePerCell'),
      floatVoltagePerCell: document.getElementById('floatVoltagePerCell'),
      equalizationVoltagePerCell: document.getElementById('equalizationVoltagePerCell'),
      boostVoltagePerCell: document.getElementById('boostVoltagePerCell'),
      floatVoltage: document.getElementById('floatVoltage'),
      equalizationVoltage: document.getElementById('equalizationVoltage'),
      boostVoltage: document.getElementById('boostVoltage'),
      batteryNotes: document.getElementById('batteryNotes'),
    };

    // Mekanik Bilgileri
    this.mechanicalInputs = {
      cabinetType: document.getElementById('cabinetType'),
      customCabinetDesign: document.getElementById('customCabinetDesign'),
      cabinetSize: document.getElementById('cabinetSize'),
      customCabinetWidth: document.getElementById('customCabinetWidth'),
      customCabinetDepth: document.getElementById('customCabinetDepth'),
      customCabinetHeight: document.getElementById('customCabinetHeight'),
      protectionClass: document.getElementById('protectionClass'),
      cabinetColor: document.getElementById('cabinetColor'),
      cableEntry: document.getElementById('cableEntry'),
      sheetType: document.getElementById('sheetType'),
      cooling: document.getElementById('cooling'),
      airflowDirection: document.getElementById('airflowDirection'),
      operatingTemperature: document.getElementById('operatingTemperature'),
    };

    // Kullanıcı Arayüzü
    this.uiInputs = {
      frontPanel: document.getElementById('frontPanel'),
      measurementInstrumentType: document.getElementById('measurementInstrumentType'),
      measurementPoint: document.getElementById('measurementPoint'),
      measurementInstrumentsList: document.getElementById('measurementInstrumentsList'),
      addMeasurementInstrumentBtn: document.getElementById('addMeasurementInstrumentBtn'),
    };
    
    // Ölçü aletleri listesi
    this.measurementInstruments = [];
    
    // Dahili dağıtım listesi
    this.internalDistributions = [];

    // Haberleşme Arayüzü
    this.communicationInputs = {
      communicationProtocol: document.getElementById('communicationProtocol'),
      relayAlarmOutputs: document.getElementById('relayAlarmOutputs'),
      parallelOperation: document.getElementById('parallelOperation'),
    };

    // Alarm & Koruma
    this.alarmInputs = {
      alarmLineFailure: document.getElementById('alarmLineFailure'),
      alarmDCLow: document.getElementById('alarmDCLow'),
      alarmDCHigh: document.getElementById('alarmDCHigh'),
      alarmOverTemp: document.getElementById('alarmOverTemp'),
      alarmCurrentLimit: document.getElementById('alarmCurrentLimit'),
      alarmBatteryLow: document.getElementById('alarmBatteryLow'),
      alarmBatteryTooLow: document.getElementById('alarmBatteryTooLow'),
      alarmBreakerOpen: document.getElementById('alarmBreakerOpen'),
      alarmEarthFault: document.getElementById('alarmEarthFault'),
      alarmTProbeFailure: document.getElementById('alarmTProbeFailure'),
      alarmEmergencyStop: document.getElementById('alarmEmergencyStop'),
      additionalAlarmsList: document.getElementById('additionalAlarmsList'),
      additionalAlarmInput: document.getElementById('additionalAlarmInput'),
      addAdditionalAlarmBtn: document.getElementById('addAdditionalAlarmBtn'),
    };
    
    // Ek alarmlar listesi
    this.additionalAlarms = [];

    // Ek Özellikler
    this.featureInputs = {
      featureInputSurge: document.getElementById('featureInputSurge'),
      featureOutputSurge: document.getElementById('featureOutputSurge'),
      featureRapidFuses: document.getElementById('featureRapidFuses'),
      featureCabinetLighting: document.getElementById('featureCabinetLighting'),
      featureCabinetHeater: document.getElementById('featureCabinetHeater'),
      featureInputCurrentMeas: document.getElementById('featureInputCurrentMeas'),
      featureEmergencyStopBtn: document.getElementById('featureEmergencyStopBtn'),
      featureTransducer4ch: document.getElementById('featureTransducer4ch'),
      featureTransducer8ch: document.getElementById('featureTransducer8ch'),
      featureServicePlug: document.getElementById('featureServicePlug'),
      featurePotentiometer: document.getElementById('featurePotentiometer'),
      featureModeSelector: document.getElementById('featureModeSelector'),
      featureInputRFIFilter: document.getElementById('featureInputRFIFilter'),
      featureAlarmResetBtn: document.getElementById('featureAlarmResetBtn'),
    };

    // Input elementleri (hesaplama için)
    this.inputs = {
      inputVoltage: document.getElementById('inputVoltage'),
      inputPhase: document.getElementById('inputPhase'),
      systemFrequency: document.getElementById('systemFrequency'),
      voltageTolerance: document.getElementById('voltageTolerance'),
      outputCurrent: document.getElementById('outputCurrent'),
      outputVoltage: document.getElementById('outputVoltage'),
      batteryVoltage: document.getElementById('batteryVoltage'),
      topology: document.getElementById('topology'),
      batteryType: document.getElementById('batteryType'),
      breakerType: document.getElementById('breakerType'),
      systemName: document.getElementById('systemName'),
    };

    // Butonlar
    this.calculateCostsBtn = document.getElementById('calculateCostsBtn');
    this.saveCalculationBtn = document.getElementById('saveCalculationBtn');
    this.generatePdfBtn = document.getElementById('generatePdfBtn');
    
    // Hesaplama için gerekli input alanları (gizli veya otomatik doldurulacak)
    this.inputs = {
      inputVoltage: document.getElementById('inputVoltageNominal') || { value: '400' },
      inputPhase: document.getElementById('inputPhase'),
      systemFrequency: document.getElementById('systemFrequency'),
      voltageTolerance: document.getElementById('inputVoltageTolerance') || { value: '+/-10%' },
      outputCurrent: document.getElementById('outputCurrent'),
      outputVoltage: document.getElementById('outputVoltage'),
      batteryVoltage: document.getElementById('batteryVoltage'),
      topology: document.getElementById('topology'),
      batteryType: document.getElementById('batteryType'),
      breakerType: document.getElementById('breakerType') || { value: 'MCB' },
      systemName: document.getElementById('projectQuoteRef') || { value: 'Rectifier System' },
    };
    
    // Voltage tolerance'ı sayıya çevir
    if (this.inputs.voltageTolerance && this.inputs.voltageTolerance.value) {
      const tolStr = this.inputs.voltageTolerance.value.replace(/[+%]/g, '').trim();
      if (tolStr.includes('-')) {
        const parts = tolStr.split('-');
        this.inputs.voltageTolerance.value = parseFloat(parts[1] || parts[0]) || 10;
      } else {
        this.inputs.voltageTolerance.value = parseFloat(tolStr) || 10;
      }
    }

    // Bölümler
    this.calculationSection = document.getElementById('calculationSection');
    this.componentsSection = document.getElementById('componentsSection');
    this.componentsTableBody = document.getElementById('componentsTableBody');
    this.totalCostElement = document.getElementById('totalCost');

    // Modal
    this.priceEditModal = document.getElementById('priceEditModal');

    // Kullanıcı bilgisini al ve proje formuna yansıt
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (currentUser && this.projectInputs.preparedBy) {
        this.projectInputs.preparedBy.value =
          currentUser.fullName || currentUser.full_name || currentUser.username || '';
      }
    } catch (e) {
      console.warn('currentUser okunurken hata:', e);
    }

    // Teklif tarihini bugüne ayarla (boşsa)
    if (this.projectInputs.quoteDate && !this.projectInputs.quoteDate.value) {
      const today = new Date().toISOString().split('T')[0];
      this.projectInputs.quoteDate.value = today;
    }

    // Dinamik davranışlar
    this.setupDynamicBehaviors();
    
    // Ek özellikler listesini başlat
    this.initializeFeaturesList();
    
    // Ölçü aletleri ve ek alarmlar için event listener'lar
    this.setupMeasurementInstruments();
    this.setupAdditionalAlarms();
    
    // Dahili dağıtım için event listener'lar
    this.setupInternalDistribution();
    this.setupDropperVoltageField();
    
    // Müşteri seçimi ve ekleme
    this.setupCustomerSelection();
  }
  
  // Müşteri seçimi setup
  async setupCustomerSelection() {
    // Müşterileri yükle (şimdilik localStorage'dan, sonra database'den)
    await this.loadCustomers();
    this.applyCustomerFromProjectContext();
    
    // Yeni müşteri ekle butonu
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    if (addCustomerBtn) {
      addCustomerBtn.addEventListener('click', () => {
        // Dashboard müşteri sayfasına yönlendir
        if (window.app && window.app.navigate) {
          window.app.navigate('dashboard.html');
          // CRM sekmesine geçmek için URL parametresi ekle
    setTimeout(() => {
            const crmButton = document.querySelector('[data-view="crm"]');
            if (crmButton) {
              crmButton.click();
            }
          }, 500);
        } else {
          window.location.href = 'dashboard.html';
        }
      });
    }

    // Müşteri seçildiğinde bilgileri otomatik doldur (opsiyonel)
    if (this.projectInputs.customerName) {
      this.projectInputs.customerName.addEventListener('change', async (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const customerId = selectedOption?.dataset.customerId;
        if (customerId) {
          // Müşteri detaylarını yükleyip formu doldurabiliriz (opsiyonel)
          console.log('Seçilen müşteri ID:', customerId);
        }
      });
    }
  }
  
  // Müşterileri yükle
  async loadCustomers() {
    try {
      const select = this.projectInputs.customerName;
      if (!select || select.tagName !== 'SELECT') {
        console.warn('Müşteri select elementi bulunamadı');
        return;
      }

      // Mevcut seçenekleri temizle (ilk seçenek hariç)
      while (select.options.length > 1) {
        select.remove(1);
      }

      // PostgreSQL API'den müşterileri çek
      try {
        const response = await fetch(`${window.location.origin}/api/customers?limit=500`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('authToken')
              ? { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
              : {}),
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            const customers = result.data;
            
            // Müşterileri select'e ekle
            customers.forEach((customer) => {
              const option = document.createElement('option');
              const label =
                String(
                  customer.company_name ||
                    customer.name ||
                    customer.customer_name ||
                    ''
                ).trim() || `Müşteri #${customer.id}`;
              option.value = String(customer.id);
              option.textContent = label;
              option.dataset.customerId = String(customer.id);
              select.appendChild(option);
            });

            console.log(`${customers.length} müşteri yüklendi`);
          } else {
            console.warn('Müşteri verisi beklenen formatta değil:', result);
          }
        } else {
          console.error('API hatası:', response.status);
          // Fallback: localStorage'dan yükle
          const localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
          localCustomers.forEach((customer) => {
            const option = document.createElement('option');
            const label =
              String(customer.company_name || customer.name || '').trim() ||
              `Müşteri #${customer.id}`;
            option.value = String(customer.id ?? '');
            option.textContent = label;
            option.dataset.customerId = String(customer.id ?? '');
            select.appendChild(option);
          });
        }
      } catch (apiError) {
        console.error('API bağlantı hatası:', apiError);
        // Fallback: localStorage'dan yükle
        const localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
        localCustomers.forEach((customer) => {
          const option = document.createElement('option');
          const label =
            String(customer.company_name || customer.name || '').trim() ||
            `Müşteri #${customer.id}`;
          option.value = String(customer.id ?? '');
          option.textContent = label;
          option.dataset.customerId = String(customer.id ?? '');
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Müşteri yükleme hatası:', error);
    }
  }

  applyCustomerFromProjectContext() {
    try {
      const select = this.projectInputs.customerName;
      if (!select || select.tagName !== 'SELECT' || !select.options?.length) return;

      const queueCtx = JSON.parse(sessionStorage.getItem('pricingQueueContext') || '{}');
      const offerDraft = JSON.parse(sessionStorage.getItem('offerDraft') || '{}');
      const currentProject = JSON.parse(localStorage.getItem('currentProject') || '{}');
      const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');

      const customerIdCandidates = [
        queueCtx?.customerId,
        offerDraft?.customerId,
        currentProject?.customerId,
        currentProject?.customer_id,
        selectedProject?.customerId,
        selectedProject?.customer_id,
      ]
        .map((v) => (v == null ? '' : String(v).trim()))
        .filter(Boolean);

      const customerNameCandidates = [
        queueCtx?.customerName,
        queueCtx?.customer,
        offerDraft?.customerName,
        currentProject?.customerName,
        currentProject?.customer_name,
        selectedProject?.customerName,
        selectedProject?.customer_name,
      ]
        .map((v) => (v == null ? '' : String(v).trim()))
        .filter(Boolean);

      const normalize = (value) => String(value || '').toLocaleLowerCase('tr-TR').trim();
      const idSet = new Set(customerIdCandidates.map(String));
      const nameSet = new Set(customerNameCandidates.map(normalize));

      const optionToSelect = Array.from(select.options).find((opt) => {
        const optionId = String(opt.dataset?.customerId || '').trim();
        const optionVal = normalize(opt.value);
        const optionText = normalize(opt.textContent);
        const idMatched = optionId && idSet.has(optionId);
        const nameMatched = nameSet.has(optionVal) || nameSet.has(optionText);
        return idMatched || nameMatched;
      });

      if (!optionToSelect) return;
      select.value = optionToSelect.value;
      select.dispatchEvent(new Event('change'));
    } catch (e) {
      console.warn('Müşteri otomatik seçim başarısız:', e);
    }
  }

  setupDynamicBehaviors() {
    // Özel kutu tasarımı seçildiğinde açıklama alanını göster
    if (this.mechanicalInputs.cabinetType) {
      this.mechanicalInputs.cabinetType.addEventListener('change', () => {
        const customRow = document.getElementById('customCabinetDesignRow');
        if (customRow) {
          customRow.style.display = 
            this.mechanicalInputs.cabinetType.value === 'Özel tasarım' ? 'block' : 'none';
        }
      });
    }

    // Özel boyutlar seçildiğinde özel boyut alanını göster
    if (this.mechanicalInputs.cabinetSize) {
      this.mechanicalInputs.cabinetSize.addEventListener('change', () => {
        const customSizeRow = document.getElementById('customCabinetSizeRow');
        if (customSizeRow) {
          customSizeRow.style.display = 
            this.mechanicalInputs.cabinetSize.value === 'Özel' ? 'block' : 'none';
        }
      });
    }

    // Dahili akü var ise adet ve akü adı kutucuklarını göster
    if (this.batteryInputs.batteryInCabinet) {
      this.batteryInputs.batteryInCabinet.addEventListener('change', () => {
        const detailsRow = document.getElementById('internalBatteryDetails');
        const nameRow = document.getElementById('internalBatteryNameRow');
        const isYes = this.batteryInputs.batteryInCabinet.value === 'Var / Yes';
        
        if (detailsRow) detailsRow.style.display = isYes ? 'block' : 'none';
        if (nameRow) nameRow.style.display = isYes ? 'block' : 'none';
      });
    }

    // Faz ve topolojiye göre dinamik değerleri güncelle
    const updateDynamicValues = () => {
      const phase = parseInt(this.deviceInputs.inputPhase?.value || '3');
      const topology = this.deviceOutputs.topology?.value || 'B6C';
      
      let powerFactor, currentTHD, dcRipple;
      
      if (phase === 1) {
        // Tek faz
        switch (topology) {
          case 'B2H':
            powerFactor = 0.7;
            currentTHD = 50;
            dcRipple = 5;
            break;
          case 'SNMPS':
            powerFactor = 0.95;
            currentTHD = 10;
            dcRipple = 2;
            break;
          case 'IGBT Doğrultucu':
            powerFactor = 0.99;
            currentTHD = 5;
            dcRipple = 2;
            break;
          default:
            powerFactor = 0.7;
            currentTHD = 50;
            dcRipple = 5;
        }
      } else {
        // 3 faz
        switch (topology) {
          case 'B6C':
            powerFactor = 0.8;
            currentTHD = 30;
            dcRipple = 5;
            break;
          case 'B12C':
            powerFactor = 0.85;
            currentTHD = 15;
            dcRipple = 2;
            break;
          case 'SNMPS':
            powerFactor = 0.95;
            currentTHD = 10;
            dcRipple = 10;
            break;
          case 'IGBT Doğrultucu':
            powerFactor = 0.99;
            currentTHD = 5;
            dcRipple = 2;
            break;
          default:
            powerFactor = 0.8;
            currentTHD = 30;
            dcRipple = 5;
        }
      }
      
      // Değerleri güncelle
      if (this.deviceInputs.acPowerFactor) {
        this.deviceInputs.acPowerFactor.value = powerFactor;
      }
      if (this.deviceInputs.acInputCurrentTHD) {
        this.deviceInputs.acInputCurrentTHD.value = currentTHD;
      }
      if (this.deviceOutputs.dcRipple) {
        this.deviceOutputs.dcRipple.value = dcRipple;
      }
    };

    // Faz sayısına göre topoloji seçimini kısıtla ve değerleri güncelle
    if (this.deviceInputs.inputPhase && this.deviceOutputs.topology) {
      const updateTopologyOptions = () => {
        const phase = parseInt(this.deviceInputs.inputPhase.value);
        const topologySelect = this.deviceOutputs.topology;
        
        if (phase === 1) {
          // Tek faz için: B2H, SNMPS ve IGBT Doğrultucu seçilebilir
          topologySelect.innerHTML = `
            <option value="B2H" selected>B2H</option>
            <option value="SNMPS">SNMPS</option>
            <option value="IGBT Doğrultucu">IGBT Doğrultucu / IGBT Rectifier</option>
          `;
          topologySelect.value = 'B2H';
        } else {
          // 3 faz için: B6C, B12C, SNMPS ve IGBT Doğrultucu seçilebilir
          topologySelect.innerHTML = `
            <option value="B6C" selected>B6C (6 darbe / 6 pulse)</option>
            <option value="B12C">B12C (12 darbe / 12 pulse)</option>
            <option value="SNMPS">SNMPS</option>
            <option value="IGBT Doğrultucu">IGBT Doğrultucu / IGBT Rectifier</option>
          `;
          topologySelect.value = 'B6C';
        }
        
        // Topoloji değiştiğinde değerleri güncelle
        updateDynamicValues();
      };
      
      // Faz değiştiğinde topoloji seçeneklerini ve değerleri güncelle
      this.deviceInputs.inputPhase.addEventListener('change', updateTopologyOptions);
      
      // Topoloji değiştiğinde değerleri güncelle
      this.deviceOutputs.topology.addEventListener('change', updateDynamicValues);
      
      // İlk yüklemede de ayarla
      updateTopologyOptions();
    }

    // Nominal giriş gerilimini hesaplama alanına aktar
    if (this.deviceInputs.inputVoltageNominal && this.inputs.inputVoltage) {
      this.deviceInputs.inputVoltageNominal.addEventListener('change', () => {
        if (this.deviceInputs.inputVoltageNominal.value) {
          this.inputs.inputVoltage.value = this.deviceInputs.inputVoltageNominal.value;
        }
      });
    }

    // Çıkış nominal gerilim ile batarya voltajını birbirine bağla
    // outputVoltage için event listener ekle
    if (this.deviceOutputs.outputVoltage && this.batteryInputs.batteryVoltage) {
      // Çıkış gerilimi değiştiğinde batarya voltajını otomatik olarak aynı değerle doldur
      this.deviceOutputs.outputVoltage.addEventListener('input', () => {
        const outputVoltage = parseFloat(this.deviceOutputs.outputVoltage.value);
        if (outputVoltage && !isNaN(outputVoltage)) {
          this.batteryInputs.batteryVoltage.value = outputVoltage;
          // Batarya voltajı değiştiğinde akü hesaplamalarını tetikle
          if (this.batteryInputs.batteryType) {
            const event = new Event('input', { bubbles: true });
            this.batteryInputs.batteryVoltage.dispatchEvent(event);
          }
        }
      });

      // change event'i de ekle (manuel giriş sonrası)
      this.deviceOutputs.outputVoltage.addEventListener('change', () => {
        const outputVoltage = parseFloat(this.deviceOutputs.outputVoltage.value);
        if (outputVoltage && !isNaN(outputVoltage)) {
          this.batteryInputs.batteryVoltage.value = outputVoltage;
          // Batarya voltajı değiştiğinde akü hesaplamalarını tetikle
          if (this.batteryInputs.batteryType) {
            const event = new Event('input', { bubbles: true });
            this.batteryInputs.batteryVoltage.dispatchEvent(event);
          }
        }
      });

      // İlk yüklemede senkronize et (eğer outputVoltage doluysa ve batteryVoltage boşsa)
      const outputVoltage = parseFloat(this.deviceOutputs.outputVoltage.value);
      if (outputVoltage && !isNaN(outputVoltage) && !this.batteryInputs.batteryVoltage.value) {
        this.batteryInputs.batteryVoltage.value = outputVoltage;
      }
    }

    // Eski nominalVoltage için de destek (eğer varsa)
    if (this.deviceOutputs.nominalVoltage && this.batteryInputs.batteryVoltage) {
      // Çıkış nominal gerilim değiştiğinde batarya voltajını güncelle
      this.deviceOutputs.nominalVoltage.addEventListener('change', () => {
        const outputVoltage = parseFloat(this.deviceOutputs.nominalVoltage.value);
        if (outputVoltage && !isNaN(outputVoltage)) {
          this.batteryInputs.batteryVoltage.value = outputVoltage;
          // Batarya voltajı değiştiğinde akü hesaplamalarını tetikle
          if (this.batteryInputs.batteryType) {
            const event = new Event('input', { bubbles: true });
            this.batteryInputs.batteryVoltage.dispatchEvent(event);
          }
        }
      });

      // Batarya voltajı değiştiğinde çıkış nominal gerilimi güncelle
      this.batteryInputs.batteryVoltage.addEventListener('change', () => {
        const batteryVoltage = parseFloat(this.batteryInputs.batteryVoltage.value);
        if (batteryVoltage && !isNaN(batteryVoltage)) {
          this.deviceOutputs.nominalVoltage.value = batteryVoltage;
        }
      });

      // İlk yüklemede senkronize et
      const outputVoltage = parseFloat(this.deviceOutputs.nominalVoltage.value);
      if (outputVoltage && !isNaN(outputVoltage) && !this.batteryInputs.batteryVoltage.value) {
        this.batteryInputs.batteryVoltage.value = outputVoltage;
      } else if (this.batteryInputs.batteryVoltage.value && !this.deviceOutputs.nominalVoltage.value) {
        const batteryVoltage = parseFloat(this.batteryInputs.batteryVoltage.value);
        if (batteryVoltage && !isNaN(batteryVoltage)) {
          this.deviceOutputs.nominalVoltage.value = batteryVoltage;
        }
      }
    }

    // Akü tipine göre gerilimleri otomatik hesapla (detaylı versiyon)
    if (this.batteryInputs.batteryType && this.batteryInputs.batteryVoltage) {
      const updateBatteryVoltages = () => {
        const batteryType = this.batteryInputs.batteryType.value;
        const batteryVoltage = parseFloat(this.batteryInputs.batteryVoltage.value);
        
        if (!batteryVoltage || isNaN(batteryVoltage)) return;

        let cellCount, voltagePerCell, floatVPerCell, equalVPerCell, boostVPerCell;
        
        if (batteryType === 'VRLA') {
          voltagePerCell = 2.0; // 2V per cell
          cellCount = Math.round(batteryVoltage / voltagePerCell);
          // VRLA için 6 ve katları olmalı
          cellCount = Math.round(cellCount / 6) * 6;
          if (cellCount < 6) cellCount = 6;
          
          floatVPerCell = 2.24;
          equalVPerCell = 2.40;
          boostVPerCell = 2.40;
        } else if (batteryType === 'Ni-CD') {
          voltagePerCell = 1.20; // 1.2V per cell
          cellCount = Math.round(batteryVoltage / voltagePerCell);
          // Ni-CD için 1 adet
          if (cellCount < 1) cellCount = 1;
          
          floatVPerCell = 1.42;
          equalVPerCell = 1.55;
          boostVPerCell = 1.55;
        } else if (batteryType === 'Li-ion') {
          voltagePerCell = 3.7; // 3.7V per cell
          cellCount = Math.round(batteryVoltage / voltagePerCell);
          // Li-ion için 13 ve katları olmalı
          cellCount = Math.round(cellCount / 13) * 13;
          if (cellCount < 13) cellCount = 13;
          
          // Li-ion için kullanıcı girecek, boş bırakıyoruz
          floatVPerCell = 0;
          equalVPerCell = 0;
          boostVPerCell = 0;
    } else {
          voltagePerCell = 2.0;
          cellCount = Math.round(batteryVoltage / voltagePerCell);
          floatVPerCell = 2.24;
          equalVPerCell = 2.40;
          boostVPerCell = 2.40;
        }

        // Hücre sayısı ve hücre başı gerilimleri güncelle
        if (this.batteryInputs.batteryCellCount) {
          this.batteryInputs.batteryCellCount.value = cellCount;
        }
        if (this.batteryInputs.batteryVoltagePerCell) {
          this.batteryInputs.batteryVoltagePerCell.value = voltagePerCell.toFixed(2);
        }
        if (this.batteryInputs.floatVoltagePerCell) {
          this.batteryInputs.floatVoltagePerCell.value = floatVPerCell > 0 ? floatVPerCell.toFixed(2) : '';
        }
        if (this.batteryInputs.equalizationVoltagePerCell) {
          this.batteryInputs.equalizationVoltagePerCell.value = equalVPerCell > 0 ? equalVPerCell.toFixed(2) : '';
        }
        if (this.batteryInputs.boostVoltagePerCell) {
          this.batteryInputs.boostVoltagePerCell.value = boostVPerCell > 0 ? boostVPerCell.toFixed(2) : '';
        }
        
        // Toplam gerilimleri güncelle
        this.updateTotalBatteryVoltages();
      };

      this.batteryInputs.batteryType.addEventListener('change', updateBatteryVoltages);
      this.batteryInputs.batteryVoltage.addEventListener('input', updateBatteryVoltages);
      
      // Hücre başı gerilimler değiştiğinde toplamları güncelle
      if (this.batteryInputs.floatVoltagePerCell) {
        this.batteryInputs.floatVoltagePerCell.addEventListener('input', () => this.updateTotalBatteryVoltages());
      }
      if (this.batteryInputs.equalizationVoltagePerCell) {
        this.batteryInputs.equalizationVoltagePerCell.addEventListener('input', () => this.updateTotalBatteryVoltages());
      }
      if (this.batteryInputs.boostVoltagePerCell) {
        this.batteryInputs.boostVoltagePerCell.addEventListener('input', () => this.updateTotalBatteryVoltages());
      }
      
      // İlk yüklemede de hesapla
      updateBatteryVoltages();
    }
    
    // Özel boyut kutucuklarını göster/gizle
    if (this.mechanicalInputs.cabinetSize) {
      this.mechanicalInputs.cabinetSize.addEventListener('change', () => {
        const customSizeRow = document.getElementById('customCabinetSizeRow');
        if (customSizeRow) {
          const isCustom = this.mechanicalInputs.cabinetSize.value === 'Özel' || 
                          this.mechanicalInputs.cabinetSize.value === 'Özel Boyutlar' ||
                          this.mechanicalInputs.cabinetSize.value.includes('Özel');
          customSizeRow.style.display = isCustom ? 'block' : 'none';
        }
      });
    }
  }
  
  // Toplam akü gerilimlerini güncelle
  updateTotalBatteryVoltages() {
    const cellCount = parseFloat(this.batteryInputs.batteryCellCount?.value || '0');
    const floatPerCell = parseFloat(this.batteryInputs.floatVoltagePerCell?.value || '0');
    const equalPerCell = parseFloat(this.batteryInputs.equalizationVoltagePerCell?.value || '0');
    const boostPerCell = parseFloat(this.batteryInputs.boostVoltagePerCell?.value || '0');
    
    if (this.batteryInputs.floatVoltage && cellCount > 0 && floatPerCell > 0) {
      this.batteryInputs.floatVoltage.value = (cellCount * floatPerCell).toFixed(2);
    }
    if (this.batteryInputs.equalizationVoltage && cellCount > 0 && equalPerCell > 0) {
      this.batteryInputs.equalizationVoltage.value = (cellCount * equalPerCell).toFixed(2);
    }
    if (this.batteryInputs.boostVoltage && cellCount > 0 && boostPerCell > 0) {
      this.batteryInputs.boostVoltage.value = (cellCount * boostPerCell).toFixed(2);
    }
  }
  
  // Ölçü aletleri için setup
  setupMeasurementInstruments() {
    if (this.uiInputs.addMeasurementInstrumentBtn) {
      const updateMeasurementPointOptions = () => {
        const typeVal = this.uiInputs.measurementInstrumentType?.value || '';
        const pointSel = this.uiInputs.measurementPoint;
        if (!pointSel) return;

        const typeLower = String(typeVal).toLowerCase();
        const mpPlaceholder = 'Ölçüm Noktası...';

        // Multimetre: Yük, Akü, Giriş
        if (typeLower.includes('multimetre') || typeLower.includes('multimeter')) {
          pointSel.innerHTML = `<option value="">${mpPlaceholder}</option>`;
          ['Yük', 'Akü', 'Giriş'].forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            pointSel.appendChild(opt);
          });
          // Seçili değer izinli değilse temizle
          if (pointSel.value && !['Yük', 'Akü', 'Giriş'].includes(pointSel.value)) {
            pointSel.value = '';
          }
          return;
        }

        // Enerji analizörü: sadece Giriş
        if (typeLower.includes('enerji') || typeLower.includes('energy analyzer')) {
          pointSel.innerHTML = `<option value="">${mpPlaceholder}</option>`;
          const opt = document.createElement('option');
          opt.value = 'Giriş';
          opt.textContent = 'Giriş';
          pointSel.appendChild(opt);
          if (pointSel.value && pointSel.value !== 'Giriş') pointSel.value = '';
          return;
        }
      };

      // Tip değişince ölçüm noktası seçeneklerini kural setine göre güncelle
      this.uiInputs.measurementInstrumentType?.addEventListener('change', updateMeasurementPointOptions);
      // İlk seçim varsa da uygula
      updateMeasurementPointOptions();

      this.uiInputs.addMeasurementInstrumentBtn.addEventListener('click', () => {
        const type = this.uiInputs.measurementInstrumentType?.value;
        const point = this.uiInputs.measurementPoint?.value;
        
        if (!type || !point) {
          this.showNotification('warning', 'Uyarı', 'Lütfen tip ve ölçüm noktası seçiniz.');
          return;
        }
        
        this.measurementInstruments.push({ type, point });
        this.renderMeasurementInstruments();
        
        // Inputları temizle
        if (this.uiInputs.measurementInstrumentType) this.uiInputs.measurementInstrumentType.value = '';
        if (this.uiInputs.measurementPoint) this.uiInputs.measurementPoint.value = '';
      });
    }
  }
  
  // Ölçü aletleri listesini render et
  renderMeasurementInstruments() {
    if (!this.uiInputs.measurementInstrumentsList) return;
    
    this.uiInputs.measurementInstrumentsList.innerHTML = '';
    
    this.measurementInstruments.forEach((inst, index) => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px; background: #f8f9fa; border-radius: 4px;';
      item.innerHTML = `
        <span style="flex: 1; font-size: 0.85em; color: #000000;">${inst.type} - ${inst.point}</span>
        <button type="button" class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.75em;" data-index="${index}">×</button>
      `;
      
      item.querySelector('button').addEventListener('click', () => {
        this.measurementInstruments.splice(index, 1);
        this.renderMeasurementInstruments();
      });
      
      this.uiInputs.measurementInstrumentsList.appendChild(item);
    });
  }
  
  // Ek alarmlar için setup
  setupAdditionalAlarms() {
    if (this.alarmInputs.addAdditionalAlarmBtn) {
      this.alarmInputs.addAdditionalAlarmBtn.addEventListener('click', () => {
        const alarmText = this.alarmInputs.additionalAlarmInput?.value?.trim();
        
        if (!alarmText) {
          this.showNotification('warning', 'Uyarı', 'Lütfen alarm adını giriniz.');
          return;
        }
        
        this.additionalAlarms.push(alarmText);
        this.renderAdditionalAlarms();
        
        // Inputu temizle
        if (this.alarmInputs.additionalAlarmInput) this.alarmInputs.additionalAlarmInput.value = '';
      });
      
      // Enter tuşu ile ekleme
      if (this.alarmInputs.additionalAlarmInput) {
        this.alarmInputs.additionalAlarmInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.alarmInputs.addAdditionalAlarmBtn.click();
          }
        });
      }
    }
  }
  
  // Ek alarmlar listesini render et
  renderAdditionalAlarms() {
    if (!this.alarmInputs.additionalAlarmsList) return;
    
    this.alarmInputs.additionalAlarmsList.innerHTML = '';
    
    this.additionalAlarms.forEach((alarm, index) => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px; background: #f8f9fa; border-radius: 4px;';
      item.innerHTML = `
        <span style="flex: 1; font-size: 0.85em; color: #000000;">${alarm}</span>
        <button type="button" class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.75em;" data-index="${index}">×</button>
      `;
      
      item.querySelector('button').addEventListener('click', () => {
        this.additionalAlarms.splice(index, 1);
        this.renderAdditionalAlarms();
      });
      
      this.alarmInputs.additionalAlarmsList.appendChild(item);
    });
  }
  
  // Dahili dağıtım için setup
  setupInternalDistribution() {
    const addBtn = document.getElementById('addInternalDistributionBtn');
    const quantityInput = document.getElementById('internalDistributionQuantity');
    const breakerPoleCurrentInput = document.getElementById('internalDistributionBreakerPoleCurrent');
    const listContainer = document.getElementById('internalDistributionList');
    
    // Dahili dağıtım seçildiğinde detay alanını göster
    if (this.deviceOutputs.internalDistribution) {
      this.deviceOutputs.internalDistribution.addEventListener('change', () => {
        const detailsRow = document.getElementById('internalDistributionDetails');
        const isYes = this.deviceOutputs.internalDistribution.value === 'Var / Yes';
        if (detailsRow) detailsRow.style.display = isYes ? 'block' : 'none';
        if (!isYes) {
          this.internalDistributions = [];
          this.renderInternalDistributions();
        }
      });
    }
    
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const quantity = parseInt(quantityInput?.value || '0');
        const breakerPoleCurrent = breakerPoleCurrentInput?.value?.trim() || '';
        
        if (!quantity || !breakerPoleCurrent) {
          this.showNotification('warning', 'Uyarı', 'Lütfen adet sayısı ve kutup akım bilgisi giriniz.');
          return;
        }
        
        this.internalDistributions.push({ quantity, breakerPoleCurrent });
        this.renderInternalDistributions();
        
        // Inputları temizle
        if (quantityInput) quantityInput.value = '';
        if (breakerPoleCurrentInput) breakerPoleCurrentInput.value = '';
      });
    }
  }
  
  // Dahili dağıtım listesini render et
  renderInternalDistributions() {
    const listContainer = document.getElementById('internalDistributionList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    this.internalDistributions.forEach((dist, index) => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px; background: #f8f9fa; border-radius: 4px;';
      item.innerHTML = `
        <span style="flex: 1; font-size: 0.85em; color: #000000;">Adet: ${dist.quantity}, Kesici Bilgisi: ${dist.breakerPoleCurrent}</span>
        <button type="button" class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.75em;" data-index="${index}">×</button>
      `;
      
      item.querySelector('button').addEventListener('click', () => {
        this.internalDistributions.splice(index, 1);
        this.renderInternalDistributions();
      });
      
      listContainer.appendChild(item);
    });
  }

  /** Diyot dropper kademeli seçimde manuel düşüş (V) alanını göster/gizle */
  setupDropperVoltageField() {
    const sel = this.deviceOutputs.diodeDropper;
    const sync = () => {
      const row = document.getElementById('dropperVoltageDropRow');
      if (!row) return;
      const v = sel?.value || '';
      const show =
        v &&
        !this.isDiodeDropperOff(v) &&
        !this.isDiodeDropperDcChopper(v);
      row.style.display = show ? 'block' : 'none';
    };
    if (sel) sel.addEventListener('change', sync);
    sync();
  }

  // Ek özellikler listesini başlat
  initializeFeaturesList() {
    const allFeatures = [
      'Giriş Gerilim Bastırıcı / Input Surge Suppression',
      'Çıkış Gerilim Bastırıcı / Output Surge Suppression',
      'Hızlı Yarıiletken Sigortalar / Rapid Semic. Fuses',
      'Kabin İçi Aydınlatma / Cabinet Internal Lighting',
      'Kabin İçi Isıtıcı / Cabinet Termostat Heater',
      'Giriş Akımı Ölçümü / Input Current Measurement',
      'Acil Durdurma Butonu / Emergency Stop Button',
      'Transducer 4 Kanal / Transducers 4 channels',
      'Transducer 8 Kanal / Transducers 8 channels',
      'Servis Prizi / Service Plug',
      'Potansiyometre(ler) / Potentiometer(s)',
      'Mod Seçici Anahtar / Mode Selector Switch',
      'Giriş RFI Filtre / Input RFI Filter',
      'Alarm Sıfırlama Butonu / Alarm Reset Button',
      'Şarj Mod Seçme Anahtarı / Charge Mode Selector Switch',
      'Çıkış Gerilimi ayarlama potansiyometresi / Output Voltage Adjustment Potentiometer',
      'Çıkış gerilim bastırıcı / Output Surge Suppressor',
      'Acil Stop Düğmesi / Emergency Stop Button',
      'Yedekli Fan / Redundant Fan',
      'Remote Kontrol / Remote Control',
      'Tristör Koruma Sigortası / Thyristor Protection Fuse',
      'Transformatör Termik Koruma Sigortası / Transformer Thermal Protection Fuse',
      'Transducer 2 Kanal / Transducers 2 channels',
      'Trafo gerilim seçici şalteri / Transformer Voltage Selector Switch',
      'Toprak Kaçağı test anahtarı / Earth Fault Test Switch',
      'Statik DC Bara frenleme / Static DC Bus Braking',
      'Start-Stop',
      'Sigorta atık Anahtarı / Fuse Waste Switch',
      'Servis Priz Şalteri / Service Plug Switch',
      'Rezonans / Resonance',
      'RFI filtre / RFI Filter',
      'Otamatik Akü Testi / Automatic Battery Test',
      'Oto Trafo Giriş besleme Trafosu / Auto Transformer Input Supply Transformer',
      'Led Buzzer / LED Buzzer',
      'Kesici Alarmı / Breaker Alarm',
      'Kaçak akım koruma anahtarı / Leakage Current Protection Switch',
      'Kabin içi aydınlatma / Cabinet Internal Lighting',
      'Isıtıcı / Heater',
      'Hızlı Şarj Zamanlayıcısı / Fast Charge Timer',
      'Harmonik Filtre / Harmonic Filter',
      'Giriş Kaynağı ATS Cihazı / Input Source ATS Device',
      'Giriş Gerilim Bastırıcı / Input Surge Suppressor',
      'Giriş Faz Lambaları / Input Phase Lamps',
      'Giriş RFI Filtre / Input RFI Filter',
      'Giriş EMI Filtre / Input EMI Filter',
      'Genel Alarm Rölesi / General Alarm Relay',
      'Fan Arızası algılama kartı / Fan Failure Detection Card',
      'Elektrıliz seviye kontrolü / Electrolysis Level Control',
      'Duman Dedektörü / Smoke Detector',
      'Dağıtım toprak kaçağı / Distribution Earth Fault',
      'DC Bara doldurma / DC Bus Filling',
      'Açma Kapama Anahtarı / On-Off Switch',
    ];
    
    // Tekrarları kaldır
    this.allFeatures = [...new Set(allFeatures)];
    this.selectedFeatures = new Set();
    this.renderFeaturesList();
    
    // Arama inputu için event listener
    const searchInput = document.getElementById('featureSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterFeatures(e.target.value);
      });
    }
  }
  
  // Ek özellikler listesini render et
  renderFeaturesList(filterText = '') {
    const container = document.getElementById('featuresListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const searchLower = filterText.toLowerCase();
    const filteredFeatures = this.allFeatures.filter(feature => 
      !filterText || feature.toLowerCase().includes(searchLower)
    );
    
    filteredFeatures.forEach((feature, index) => {
      const checkboxId = `feature_${index}`;
      const isChecked = this.selectedFeatures.has(feature);
      
      const item = document.createElement('label');
      item.className = `feature-item ${isChecked ? 'selected' : ''}`;
      item.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px; cursor: pointer; border-radius: 2px;';
      item.innerHTML = `
        <input type="checkbox" id="${checkboxId}" class="feature-checkbox" ${isChecked ? 'checked' : ''} data-feature="${feature.replace(/"/g, '&quot;')}">
        <span style="font-size: 0.85em;">${feature}</span>
      `;
      
      const checkbox = item.querySelector('input');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          item.classList.add('selected');
          this.selectedFeatures.add(feature);
          // Seçili öğeleri yukarı taşı
          this.reorderFeatures();
        } else {
          item.classList.remove('selected');
          this.selectedFeatures.delete(feature);
        }
      });
      
      container.appendChild(item);
    });
  }
  
  // Seçili özellikleri yukarı taşı
  reorderFeatures() {
    const container = document.getElementById('featuresListContainer');
    if (!container) return;
    
    const items = Array.from(container.querySelectorAll('.feature-item'));
    const selected = items.filter(item => item.classList.contains('selected'));
    const unselected = items.filter(item => !item.classList.contains('selected'));
    
    // Önce seçilileri, sonra seçilmeyenleri ekle
    container.innerHTML = '';
    selected.forEach(item => container.appendChild(item));
    unselected.forEach(item => container.appendChild(item));
  }
  
  // Özellikleri filtrele
  filterFeatures(searchText) {
    this.renderFeaturesList(searchText);
  }

  setupEventListeners() {
    // Logo ayarları butonu
    const logoSettingsBtn = document.getElementById('logoSettingsBtn');
    if (logoSettingsBtn) {
      logoSettingsBtn.addEventListener('click', () => {
        this.openLogoSettings();
      });
    }
    this.calculateCostsBtn?.addEventListener('click', () => this.calculateCostsAndOpen());
    this.saveCalculationBtn?.addEventListener('click', () => this.saveCalculation());
    this.generatePdfBtn?.addEventListener('click', () => this.generatePDF());

    // Modal kapatma
    document.getElementById('closePriceModal').addEventListener('click', () => {
      this.priceEditModal.style.display = 'none';
    });
    document.getElementById('cancelPriceEditBtn').addEventListener('click', () => {
      this.priceEditModal.style.display = 'none';
    });
    document.getElementById('savePricesBtn').addEventListener('click', () => {
      this.savePriceEdits();
    });
  }

  setupWindowControls() {
    const minimizeBtn = document.querySelector('.window-button.minimize');
    const closeBtn = document.querySelector('.window-button.close');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        if (window.app && window.app.minimize) {
          window.app.minimize();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (window.app && window.app.close) {
          window.app.close();
        }
      });
    }
  }

  setupMenubar() {

    // Veri yenile
    document.getElementById('refreshDataBtn')?.addEventListener('click', () => {
      this.loadAllExcelData();
    });
  }

  // Excel verilerini yükle
  async loadAllExcelData() {
    this.showLoading(true);

    // excelData key → API componentType eşlemesi
    const componentTypeMap = {
      terminals:               'Terminals',
      circuitBreakers:         'CircuitBreakers',
      currentReadingCards:     'CurrentReadingCards',
      freewheelingDiodes:      'FreewheelingDiodes',
      thyristors:              'Thyristors',
      dcChokes:                'DCChokes',
      dcCapacitors:            'DCCapacitors',
      transformers:            'Transformers',
      coolingComponents:       'CoolingComponents',
      diodeDroppers:           'DiodeDroppers',
      relays:                  'Relays',
      // ControlCards: Card Type (eski seçim) + Electronic Board + BoardScope (Standard/Opsiyon) + OptionMatch
      controlCards:            'ControlCards',
      measurementInstruments:  'MeasurementInstruments',
      communicationProtocols:  'CommunicationProtocols',
      relayAlarmOutputs:       'RelayAlarmOutputs',
      cabinets:                'Cabinets',
      options:                 'Options',
    };

    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    let loadedCount = 0;
    let failedCount = 0;
    const failedComponents = [];

    try {
      for (const [key, componentType] of Object.entries(componentTypeMap)) {
        try {
          const res = await fetch(`/api/excel/rectifier/${componentType}`, { headers });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            const err = new Error(json.error || `HTTP ${res.status}`);
            err.status = res.status;
            err.detail = json.detail || '';
            throw err;
          }
          const data = json.data || [];
          this.excelData[key] = data;
          loadedCount++;
          if (data.length > 0) {
            console.log(`✓ ${componentType}: ${data.length} adet yüklendi.`);
          } else {
            console.warn(`⚠ ${componentType}: Boş veri`);
          }
        } catch (err) {
          console.error(`✗ ${componentType} yükleme hatası:`, err);
          this.excelData[key] = [];
          failedCount++;
          const reason =
            err.status === 401
              ? '401-Oturum'
              : err.status === 404 || err.status === 503
                ? 'DosyaYok'
                : err.status === 400
                  ? 'Geçersizİstek'
                  : 'SunucuHatası';
          failedComponents.push(`${componentType}(${reason})`);
        }
      }

      if (failedCount === 0) {
        this.showNotification('success', 'Veri Yüklendi', `${loadedCount} component tipi başarıyla yüklendi.`);
      } else {
        this.showNotification('warning', 'Kısmi Yükleme',
          `${loadedCount} yüklendi, ${failedCount} yüklenemedi: ${failedComponents.join(', ')}`);
      }
    } catch (error) {
      this.showNotification('error', 'Hata', 'Excel verileri yüklenirken hata oluştu.');
      console.error('Error loading Excel data:', error);
    } finally {
      this.showLoading(false);
    }
  }

  // Form validasyonu
  validateInputs() {
    const emptyFields = [];
    
    // Nominal giriş gerilimi kontrolü
    const inputVoltageNominal = parseFloat(this.deviceInputs.inputVoltageNominal?.value || '0');
    if (!inputVoltageNominal || isNaN(inputVoltageNominal) || inputVoltageNominal <= 0) {
      emptyFields.push('Nominal Giriş Gerilimi');
      if (this.deviceInputs.inputVoltageNominal) {
        this.deviceInputs.inputVoltageNominal.classList.add('input-error');
      }
    } else if (this.deviceInputs.inputVoltageNominal) {
      this.deviceInputs.inputVoltageNominal.classList.remove('input-error');
    }

    // Çıkış gerilimi kontrolü
    const outputVoltage = parseFloat(this.deviceOutputs.outputVoltage?.value || '0');
    if (!outputVoltage || isNaN(outputVoltage) || outputVoltage <= 0) {
      emptyFields.push('Nominal Çıkış Gerilimi');
      if (this.deviceOutputs.outputVoltage) {
        this.deviceOutputs.outputVoltage.classList.add('input-error');
      }
    } else if (this.deviceOutputs.outputVoltage) {
      this.deviceOutputs.outputVoltage.classList.remove('input-error');
    }

    // Çıkış akımı kontrolü
    const outputCurrent = parseFloat(this.deviceOutputs.outputCurrent?.value || '0');
    if (!outputCurrent || isNaN(outputCurrent) || outputCurrent <= 0) {
      emptyFields.push('Nominal Çıkış Akımı');
      if (this.deviceOutputs.outputCurrent) {
        this.deviceOutputs.outputCurrent.classList.add('input-error');
      }
    } else if (this.deviceOutputs.outputCurrent) {
      this.deviceOutputs.outputCurrent.classList.remove('input-error');
    }

    // Batarya voltajı kontrolü
    const batteryVoltage = parseFloat(this.batteryInputs.batteryVoltage?.value || '0');
    if (!batteryVoltage || isNaN(batteryVoltage) || batteryVoltage <= 0) {
      emptyFields.push('Batarya Voltajı');
      if (this.batteryInputs.batteryVoltage) {
        this.batteryInputs.batteryVoltage.classList.add('input-error');
      }
    } else if (this.batteryInputs.batteryVoltage) {
      this.batteryInputs.batteryVoltage.classList.remove('input-error');
    }

    // Topoloji kontrolü
    if (!this.deviceOutputs.topology?.value || this.deviceOutputs.topology.value.trim() === '') {
      emptyFields.push('Topoloji');
      if (this.deviceOutputs.topology) {
        this.deviceOutputs.topology.classList.add('input-error');
      }
    } else if (this.deviceOutputs.topology) {
      this.deviceOutputs.topology.classList.remove('input-error');
    }

    // Batarya tipi kontrolü
    if (!this.batteryInputs.batteryType?.value || this.batteryInputs.batteryType.value.trim() === '') {
      emptyFields.push('Akü Tipi');
      if (this.batteryInputs.batteryType) {
        this.batteryInputs.batteryType.classList.add('input-error');
      }
    } else if (this.batteryInputs.batteryType) {
      this.batteryInputs.batteryType.classList.remove('input-error');
    }

    // Giriş faz sayısı kontrolü
    if (!this.deviceInputs.inputPhase?.value || this.deviceInputs.inputPhase.value.trim() === '') {
      emptyFields.push('Giriş Faz Sayısı');
      if (this.deviceInputs.inputPhase) {
        this.deviceInputs.inputPhase.classList.add('input-error');
      }
    } else if (this.deviceInputs.inputPhase) {
      this.deviceInputs.inputPhase.classList.remove('input-error');
    }

    // Sistem frekansı kontrolü
    if (!this.deviceInputs.systemFrequency?.value || this.deviceInputs.systemFrequency.value.trim() === '') {
      emptyFields.push('Giriş Frekansı');
      if (this.deviceInputs.systemFrequency) {
        this.deviceInputs.systemFrequency.classList.add('input-error');
      }
    } else if (this.deviceInputs.systemFrequency) {
      this.deviceInputs.systemFrequency.classList.remove('input-error');
    }

    // Giriş gerilim toleransı kontrolü
    if (!this.deviceInputs.inputVoltageTolerance?.value || this.deviceInputs.inputVoltageTolerance.value.trim() === '') {
      emptyFields.push('Giriş Gerilimi Tolerans Aralığı');
      if (this.deviceInputs.inputVoltageTolerance) {
        this.deviceInputs.inputVoltageTolerance.classList.add('input-error');
      }
    } else if (this.deviceInputs.inputVoltageTolerance) {
      this.deviceInputs.inputVoltageTolerance.classList.remove('input-error');
    }

    // Giriş nötr bağlantısı kontrolü
    if (!this.deviceInputs.inputNeutral?.value || this.deviceInputs.inputNeutral.value.trim() === '') {
      emptyFields.push('Giriş Nötr Bağlantısı');
      if (this.deviceInputs.inputNeutral) {
        this.deviceInputs.inputNeutral.classList.add('input-error');
      }
    } else if (this.deviceInputs.inputNeutral) {
      this.deviceInputs.inputNeutral.classList.remove('input-error');
    }

    // DC Ripple kontrolü
    const dcRipple = parseFloat(this.deviceOutputs.dcRipple?.value || '0');
    if (!dcRipple || isNaN(dcRipple) || dcRipple <= 0) {
      emptyFields.push('DC Bus Ripple');
      if (this.deviceOutputs.dcRipple) {
        this.deviceOutputs.dcRipple.classList.add('input-error');
      }
    } else if (this.deviceOutputs.dcRipple) {
      this.deviceOutputs.dcRipple.classList.remove('input-error');
    }

    // AC Power Factor kontrolü
    const acPowerFactor = parseFloat(this.deviceInputs.acPowerFactor?.value || '0');
    if (!acPowerFactor || isNaN(acPowerFactor) || acPowerFactor <= 0) {
      emptyFields.push('AC Giriş Güç Faktörü');
      if (this.deviceInputs.acPowerFactor) {
        this.deviceInputs.acPowerFactor.classList.add('input-error');
      }
    } else if (this.deviceInputs.acPowerFactor) {
      this.deviceInputs.acPowerFactor.classList.remove('input-error');
    }

    // AC Input Current THD kontrolü
    const acInputCurrentTHD = parseFloat(this.deviceInputs.acInputCurrentTHD?.value || '0');
    if (acInputCurrentTHD === null || acInputCurrentTHD === undefined || isNaN(acInputCurrentTHD)) {
      emptyFields.push('AC Giriş Akımı THD');
      if (this.deviceInputs.acInputCurrentTHD) {
        this.deviceInputs.acInputCurrentTHD.classList.add('input-error');
      }
    } else if (this.deviceInputs.acInputCurrentTHD) {
      this.deviceInputs.acInputCurrentTHD.classList.remove('input-error');
    }

    // Mekanik bilgiler kontrolü
    if (!this.mechanicalInputs.cabinetType?.value || this.mechanicalInputs.cabinetType.value.trim() === '') {
      emptyFields.push('Kabin Tipi');
      if (this.mechanicalInputs.cabinetType) {
        this.mechanicalInputs.cabinetType.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.cabinetType) {
      this.mechanicalInputs.cabinetType.classList.remove('input-error');
    }

    if (!this.mechanicalInputs.cabinetSize?.value || this.mechanicalInputs.cabinetSize.value.trim() === '') {
      emptyFields.push('Kabin Boyutu');
      if (this.mechanicalInputs.cabinetSize) {
        this.mechanicalInputs.cabinetSize.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.cabinetSize) {
      this.mechanicalInputs.cabinetSize.classList.remove('input-error');
    }

    if (!this.mechanicalInputs.protectionClass?.value || this.mechanicalInputs.protectionClass.value.trim() === '') {
      emptyFields.push('Koruma Sınıfı');
      if (this.mechanicalInputs.protectionClass) {
        this.mechanicalInputs.protectionClass.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.protectionClass) {
      this.mechanicalInputs.protectionClass.classList.remove('input-error');
    }

    if (!this.mechanicalInputs.cabinetColor?.value || this.mechanicalInputs.cabinetColor.value.trim() === '') {
      emptyFields.push('Kabin Rengi');
      if (this.mechanicalInputs.cabinetColor) {
        this.mechanicalInputs.cabinetColor.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.cabinetColor) {
      this.mechanicalInputs.cabinetColor.classList.remove('input-error');
    }

    if (!this.mechanicalInputs.cableEntry?.value || this.mechanicalInputs.cableEntry.value.trim() === '') {
      emptyFields.push('Kablo Girişi');
      if (this.mechanicalInputs.cableEntry) {
        this.mechanicalInputs.cableEntry.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.cableEntry) {
      this.mechanicalInputs.cableEntry.classList.remove('input-error');
    }

    if (!this.mechanicalInputs.sheetType?.value || this.mechanicalInputs.sheetType.value.trim() === '') {
      emptyFields.push('Sac Tipi');
      if (this.mechanicalInputs.sheetType) {
        this.mechanicalInputs.sheetType.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.sheetType) {
      this.mechanicalInputs.sheetType.classList.remove('input-error');
    }

    if (!this.mechanicalInputs.cooling?.value || this.mechanicalInputs.cooling.value.trim() === '') {
      emptyFields.push('Soğutma');
      if (this.mechanicalInputs.cooling) {
        this.mechanicalInputs.cooling.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.cooling) {
      this.mechanicalInputs.cooling.classList.remove('input-error');
    }

    if (!this.mechanicalInputs.airflowDirection?.value || this.mechanicalInputs.airflowDirection.value.trim() === '') {
      emptyFields.push('Hava Akış Yönü');
      if (this.mechanicalInputs.airflowDirection) {
        this.mechanicalInputs.airflowDirection.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.airflowDirection) {
      this.mechanicalInputs.airflowDirection.classList.remove('input-error');
    }

    if (!this.mechanicalInputs.operatingTemperature?.value || this.mechanicalInputs.operatingTemperature.value.trim() === '') {
      emptyFields.push('Çalışma Sıcaklığı');
      if (this.mechanicalInputs.operatingTemperature) {
        this.mechanicalInputs.operatingTemperature.classList.add('input-error');
      }
    } else if (this.mechanicalInputs.operatingTemperature) {
      this.mechanicalInputs.operatingTemperature.classList.remove('input-error');
    }

    // Haberleşme arayüzü kontrolü
    if (!this.communicationInputs.communicationProtocol?.value || this.communicationInputs.communicationProtocol.value.trim() === '') {
      emptyFields.push('Haberleşme Protokolü');
      if (this.communicationInputs.communicationProtocol) {
        this.communicationInputs.communicationProtocol.classList.add('input-error');
      }
    } else if (this.communicationInputs.communicationProtocol) {
      this.communicationInputs.communicationProtocol.classList.remove('input-error');
    }

    // Proje bilgileri kontrolü (opsiyonel ama kontrol edelim)
    if (!this.projectInputs.customerName?.value || this.projectInputs.customerName.value.trim() === '') {
      emptyFields.push('Müşteri Adı');
      if (this.projectInputs.customerName) {
        this.projectInputs.customerName.classList.add('input-error');
      }
    } else if (this.projectInputs.customerName) {
      this.projectInputs.customerName.classList.remove('input-error');
    }

    // Eğer boş alanlar varsa uyarı göster
    if (emptyFields.length > 0) {
      const fieldsList = emptyFields.join(', ');
      this.showNotification('error', 'Eksik Bilgiler', `Lütfen aşağıdaki alanları doldurun: ${fieldsList}`);
      return false;
    }

    return true;
  }

  // Sistem hesaplama
  async calculateSystem() {
    if (!this.validateInputs()) {
      return;
    }

    this.showLoading(true);

    try {
      // Girdileri al
      const inputs = this.getInputs();

      // Hesaplamaları yap
      const calculations = this.performCalculations(inputs);

      // Parçaları seç
      const components = await this.selectComponents(inputs, calculations);

      // Sonuçları sakla
      this.calculationResults = calculations;
      this.selectedComponents = components;

      // UI'ı güncelle
      this.updateCalculationResults(calculations);
      this.updateComponentsTable(components);

      // Esnek tabloya otomatik listeyi aktar (hibrit kullanım)
      if (
        window.rectifierFlexibleApp &&
        typeof window.rectifierFlexibleApp.addComponentsFromAuto === 'function'
      ) {
        window.rectifierFlexibleApp.addComponentsFromAuto(components);
      }

      // Bölümleri göster
      this.calculationSection.style.display = 'block';
      this.componentsSection.style.display = 'block';

      this.showNotification('success', 'Hesaplama Tamamlandı', 'Sistem başarıyla hesaplandı ve parçalar seçildi.');
    } catch (error) {
      console.error('Calculation error:', error);
      this.showNotification('error', 'Hesaplama Hatası', error.message || 'Hesaplama sırasında bir hata oluştu.');
    } finally {
      this.showLoading(false);
    }
  }

  // Girdileri al
  getInputs() {
    // Nominal giriş gerilimini al
    const inputVoltageNominal = parseFloat(this.deviceInputs.inputVoltageNominal?.value || this.inputs.inputVoltage?.value || '400');
    
    // Voltage tolerance'ı parse et
    let voltageTolerance = 10; // default
    if (this.deviceInputs.inputVoltageTolerance?.value) {
      const tolStr = this.deviceInputs.inputVoltageTolerance.value.replace(/[+%]/g, '').trim();
      if (tolStr.includes('-')) {
        const parts = tolStr.split('-');
        voltageTolerance = parseFloat(parts[1] || parts[0]) || 10;
      } else {
        voltageTolerance = parseFloat(tolStr) || 10;
      }
    }
    
    return {
      inputVoltage: inputVoltageNominal,
      inputPhase: parseInt(this.deviceInputs.inputPhase?.value || this.inputs.inputPhase?.value || '3'),
      inputNeutral: this.deviceInputs.inputNeutral?.value || '',
      systemFrequency: parseFloat(this.deviceInputs.systemFrequency?.value || this.inputs.systemFrequency?.value || '50'),
      voltageTolerance: voltageTolerance / 100,
      outputCurrent: parseFloat(this.deviceOutputs.outputCurrent?.value || this.inputs.outputCurrent?.value || '0'),
      outputVoltage: parseFloat(this.deviceOutputs.outputVoltage?.value || this.inputs.outputVoltage?.value || '0'),
      batteryVoltage: parseFloat(this.batteryInputs.batteryVoltage?.value || this.inputs.batteryVoltage?.value || '0'),
      topology: this.deviceOutputs.topology?.value || this.inputs.topology?.value || 'B6C',
      batteryType: this.batteryInputs.batteryType?.value || this.inputs.batteryType?.value || 'VRLA',
      breakerType: this.inputs.breakerType?.value || 'MCB',
      systemName: this.projectInputs.quoteRef?.value || this.inputs.systemName?.value || 'Rectifier System',
      diodeDropper: this.deviceOutputs.diodeDropper?.value || '',
      dropperVoltageDropV:
        (() => {
          const raw = this.deviceOutputs.dropperVoltageDropV?.value;
          if (raw == null || String(raw).trim() === '') return null;
          const v = parseFloat(String(raw).replace(',', '.'));
          return Number.isFinite(v) && v > 0 ? v : null;
        })(),
      batteryLVD: this.deviceOutputs.batteryLVD?.value || '',
      internalDistribution: this.deviceOutputs.internalDistribution?.value || '',
      internalDistributions: this.internalDistributions || [],
      measurementInstruments: this.measurementInstruments || [],
      parallelOperation: this.communicationInputs.parallelOperation?.value || '',
      communicationProtocol: this.communicationInputs.communicationProtocol?.value || '',
      relayAlarmOutputs: this.alarmInputs.relayAlarmOutputs?.value || '',
      cabinetSize: this.mechanicalInputs.cabinetSize?.value || '',
      protectionClass: this.mechanicalInputs.protectionClass?.value || '',
      cabinetColor: this.mechanicalInputs.cabinetColor?.value || '',
      frontPanel: this.uiInputs.frontPanel?.value || '',
      // Akü adımında hesaplanan toplam float/boost gerilimlerini direkt aktar
      precomputedFloatVoltage: parseFloat(this.batteryInputs.floatVoltage?.value || '0') || null,
      precomputedBoostVoltage: parseFloat(this.batteryInputs.boostVoltage?.value || '0') || null,
    };
  }

  /**
   * Giriş kesicisi için efektif tip (B2H → MCCB). İş kuralı: docs/rectifier-pricing-business-rules.md
   * Çıkış/batarya kesicileri doğrudan inputs.breakerType kullanır.
   */
  getEffectiveInputBreakerType(inputs) {
    const top = String(inputs?.topology || '').trim();
    if (top === 'B2H') return 'MCCB';
    const t = String(inputs?.breakerType || 'MCB').trim();
    return t || 'MCB';
  }

  // Proje / müşteri konfigürasyonunu al (tüm girdiler dahil)
  getProjectConfig() {
    const p = this.projectInputs;
    const di = this.deviceInputs;
    const do_ = this.deviceOutputs;
    const bi = this.batteryInputs;
    const mi = this.mechanicalInputs;
    const ui = this.uiInputs;
    const ci = this.communicationInputs;
    const ai = this.alarmInputs;
    const fi = this.featureInputs;

    // Standart alarmları topla
    const standardAlarms = [];
    if (ai.alarmLineFailure?.checked) standardAlarms.push('Şebeke Yok / Line Failure');
    if (ai.alarmDCLow?.checked) standardAlarms.push('DC Düşük / DC Low');
    if (ai.alarmDCHigh?.checked) standardAlarms.push('DC Yüksek / DC High');
    if (ai.alarmOverTemp?.checked) standardAlarms.push('Aşırı Sıcaklık / Over Temperature');
    if (ai.alarmCurrentLimit?.checked) standardAlarms.push('Akım Sınırlama / Current Limiting');
    if (ai.alarmBatteryLow?.checked) standardAlarms.push('Akü Düşük / Battery Low');
    if (ai.alarmBatteryTooLow?.checked) standardAlarms.push('Akü Çok Düşük / Battery Too Low');
    if (ai.alarmBreakerOpen?.checked) standardAlarms.push('Kesici Açık / Breaker Open');
    if (ai.alarmEarthFault?.checked) standardAlarms.push('Toprak Kaçağı / Earth Fault');
    if (ai.alarmTProbeFailure?.checked) standardAlarms.push('Sıcaklık Probu Yok / T. Probe Failure');
    if (ai.alarmEmergencyStop?.checked) standardAlarms.push('Acil Durdurma / Emergency Stop');

    // Ek özellikleri topla (dinamik listeden)
    const extraFeatures = Array.from(this.selectedFeatures || []);
    
    // Checkbox'lardan da kontrol et (eğer varsa)
    const featureCheckboxes = document.querySelectorAll('#featuresListContainer .feature-checkbox:checked');
    featureCheckboxes.forEach((checkbox) => {
      const feature = checkbox.getAttribute('data-feature');
      if (feature && !extraFeatures.includes(feature)) {
        extraFeatures.push(feature);
      }
    });

    const customerNameFromSelect = (() => {
      const el = p.customerName;
      if (!el) return '';
      if (el.tagName === 'SELECT' && el.selectedIndex > 0) {
        const opt = el.options[el.selectedIndex];
        const txt = (opt && opt.textContent) ? String(opt.textContent).trim() : '';
        if (txt) return txt;
      }
      return String(el.value || '').trim();
    })();

    return {
      // Proje Bilgileri
      project: {
        customerName: customerNameFromSelect,
        quoteRef: p.quoteRef?.value || '',
        deviceCount: parseInt(p.deviceCount?.value || '1', 10),
        quoteDate: p.quoteDate?.value || '', // Teklif tarihi
        deliveryWindow: p.deliveryWindow?.value || '',
        incoterms: p.incoterms?.value || '',
        packingType: p.packingType?.value || '',
        brand: p.brand?.value || '',
        deviceLanguage: p.deviceLanguage?.value || '',
        preparedBy: p.preparedBy?.value || '',
      },
      // Cihaz Giriş Bilgileri
      deviceInput: {
        nominalVoltage: di.inputVoltageNominal?.value || '',
        voltageTolerance: di.inputVoltageTolerance?.value || '',
        phase: di.inputPhase?.value || '',
        neutral: di.inputNeutral?.value || '',
        frequency: di.systemFrequency?.value || '',
        powerFactor: parseFloat(di.acPowerFactor?.value || '0.8'),
        currentTHD: parseFloat(di.acInputCurrentTHD?.value || '30'),
      },
      // Cihaz Çıkış Bilgileri
      deviceOutput: {
        nominalVoltage: parseFloat(do_.outputVoltage?.value || '0'),
        nominalCurrent: parseFloat(do_.outputCurrent?.value || '0'),
        topology: do_.topology?.value || '',
        dcRipple: parseFloat(do_.dcRipple?.value || '5'),
        extraLoadOutput: do_.extraLoadOutput?.value || '',
        diodeDropper: do_.diodeDropper?.value || '',
        dropperVoltageDropV: (() => {
          const raw = do_.dropperVoltageDropV?.value;
          if (raw == null || String(raw).trim() === '') return null;
          const v = parseFloat(String(raw).replace(',', '.'));
          return Number.isFinite(v) && v > 0 ? v : null;
        })(),
        internalDistribution: do_.internalDistribution?.value || '',
        internalDistributions: this.internalDistributions || [],
        batteryLVD: do_.batteryLVD?.value || '',
      },
      // Akü Bilgileri
      battery: {
        type: bi.batteryType?.value || '',
        voltage: parseFloat(bi.batteryVoltage?.value || '0'),
        inCabinet: bi.batteryInCabinet?.value || '',
        cellCount: parseFloat(bi.batteryCellCount?.value || '0'),
        voltagePerCell: parseFloat(bi.batteryVoltagePerCell?.value || '0'),
        floatVoltagePerCell: parseFloat(bi.floatVoltagePerCell?.value || '0'),
        equalizationVoltagePerCell: parseFloat(bi.equalizationVoltagePerCell?.value || '0'),
        boostVoltagePerCell: parseFloat(bi.boostVoltagePerCell?.value || '0'),
        floatVoltage: parseFloat(bi.floatVoltage?.value || '0'),
        equalizationVoltage: parseFloat(bi.equalizationVoltage?.value || '0'),
        boostVoltage: parseFloat(bi.boostVoltage?.value || '0'),
        notes: bi.batteryNotes?.value || '',
      },
      // Mekanik Bilgileri
      mechanical: {
        cabinetType: mi.cabinetType?.value || '',
        customCabinetDesign: mi.customCabinetDesign?.value || '',
        cabinetSize: mi.cabinetSize?.value || '',
        customCabinetWidth: parseFloat(mi.customCabinetWidth?.value || '0'),
        customCabinetDepth: parseFloat(mi.customCabinetDepth?.value || '0'),
        customCabinetHeight: parseFloat(mi.customCabinetHeight?.value || '0'),
        protectionClass: mi.protectionClass?.value || '',
        cabinetColor: mi.cabinetColor?.value || '',
        cableEntry: mi.cableEntry?.value || '',
        sheetType: mi.sheetType?.value || '',
        cooling: mi.cooling?.value || '',
        airflowDirection: mi.airflowDirection?.value || '',
        operatingTemperature: mi.operatingTemperature?.value || '',
      },
      // Kullanıcı Arayüzü
      userInterface: {
        frontPanel: ui.frontPanel?.value || '',
        measurementInstrumentType: ui.measurementInstrumentType?.value || '',
        measurementPoint: ui.measurementPoint?.value || '',
        measurementInstruments: this.measurementInstruments || [],
      },
      // Haberleşme Arayüzü
      communication: {
        protocol: ci.communicationProtocol?.value || '',
        relayAlarmOutputs: ci.relayAlarmOutputs?.value || '',
        alarmOutputCount: ci.relayAlarmOutputs?.value || '',
        parallelOperation: ci.parallelOperation?.value || '',
      },
      // Alarm & Koruma
      alarms: {
        standardAlarms: standardAlarms,
        additionalAlarms: this.additionalAlarms || [],
      },
      // Ek Özellikler
      extraFeatures: extraFeatures,
    };
  }

  // Hesaplamaları yap
  performCalculations(inputs) {
    // Verimlilik ve Power Factor
    const efficiency = inputs.inputPhase === 3 ? 0.9 : 0.8;
    const powerFactor = inputs.inputPhase === 3 ? 0.8 : 0.7;

    // Float, Equalization ve Boost gerilimleri:
    // Önce akü adımında hesaplanan hazır değerleri kullan (precomputedFloatVoltage),
    // bunlar yoksa veya 0 ise runtime'da hesapla.
    let floatVoltage, equalizationVoltage, boostVoltage;
    const preFloat = Number(inputs.precomputedFloatVoltage || 0);
    const preBoost = Number(inputs.precomputedBoostVoltage || 0);
    if (preFloat > 0) {
      floatVoltage = preFloat;
      boostVoltage = preBoost > 0 ? preBoost : preFloat;
      equalizationVoltage = boostVoltage;
    } else if (inputs.batteryType === 'VRLA') {
      const cellCount = inputs.batteryVoltage / 2; // 2V per cell
      floatVoltage = cellCount * 2.24;
      equalizationVoltage = cellCount * 2.40;
      boostVoltage = cellCount * 2.40;
    } else {
      // Diğer akü tipleri için varsayılan değerler
      floatVoltage = inputs.batteryVoltage * 1.12;
      equalizationVoltage = inputs.batteryVoltage * 1.2;
      boostVoltage = inputs.batteryVoltage * 1.2;
    }

    // Trafo gücü önce W olarak hesaplanır; seçim/gösterimde kVA kullanılır.
    const transformerPowerWatts =
      (inputs.outputCurrent * floatVoltage) /
      (efficiency * powerFactor);
    const transformerPower = transformerPowerWatts / 1000;

    // Sekonder gerilim (3 faz için float, tek faz için boost)
    const secondaryVoltage =
      inputs.inputPhase === 3 ? floatVoltage : boostVoltage;

    // Giriş akımı (tolerans dahil)
    // Not: Giriş gerilimi trafo hesaplamasında primer için nominaldir (tolerans uygulanmaz)
    // Tolerans sadece giriş akımı hesaplamasında kullanılır
    // +/-%10 tolerans için en kötü durumda minimum primer gerilimi kullanılır: 400V -> 360V
    // Formül: Giriş Akımı (A) = Trafo Gücü (W) / (Primer Minimum Gerilimi (V) × √Faz Sayısı)
    const voltageToleranceRatio = Math.min(0.99, Math.max(0, Number(inputs.voltageTolerance) || 0));
    const inputVoltageWithTolerance =
      Math.max(0.001, inputs.inputVoltage * (1 - voltageToleranceRatio));
    const inputCurrent =
      transformerPowerWatts /
      (inputVoltageWithTolerance * Math.sqrt(inputs.inputPhase));

    // DC Şok ve Kapasitör hesaplaması
    const dcCalculations = this.calculateDCComponents(
      inputs,
      transformerPowerWatts,
      secondaryVoltage
    );

    return {
      transformerPower,
      transformerPowerWatts,
      inputCurrent,
      floatVoltage,
      equalizationVoltage,
      boostVoltage,
      secondaryVoltage,
      efficiency,
      powerFactor,
      inputVoltageWithTolerance,
      ...dcCalculations,
    };
  }

  /**
   * DCComponents (dcChokes) kataloğunda, [minMh, maxMh] aralığındaki benzersiz endüktanslar (mH).
   * Sadece çıkış akımına uygun (Current Rating >= requiredCurrentA) satırlar dikkate alınır.
   */
  getDCChokeCatalogInductancesMh(minMh, maxMh, requiredCurrentA) {
    const rows = Array.isArray(this.excelData?.dcChokes) ? this.excelData.dcChokes : [];
    const min = Number(minMh);
    const max = Number(maxMh);
    const needA = Number(requiredCurrentA) || 0;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return [];
    const seen = new Set();
    const values = [];
    for (const row of rows) {
      const L = Number(
        this.getColumn(row, [
          'Inductance (mH)',
          'Inductance',
          'L (mH)',
          'L(mH)',
          'Endüktans (mH)',
          'Endüktans mH',
        ]) || 0
      );
      const iA = Number(
        this.getColumn(row, [
          'Current Rating (A)',
          'Current Rating',
          'Current (A)',
          'Rating (A)',
          'Current',
          'Akım (A)',
          'Rated Current (A)',
        ]) || 0
      );
      if (!Number.isFinite(L) || L <= 0) continue;
      if (!Number.isFinite(iA) || iA < needA) continue;
      if (L < min || L > max) continue;
      const key = Math.round(L * 1e9) / 1e9;
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(L);
    }
    values.sort((a, b) => a - b);
    return values;
  }

  getDefaultDCChokeScanValuesMh() {
    const out = [];
    for (let value = 0.25; value <= 2.0001; value += 0.01) {
      out.push(Number(value.toFixed(3)));
    }
    return out;
  }

  // DC Şok ve Kapasitör hesaplaması
  calculateDCComponents(inputs, transformerPower, secondaryVoltage) {
    // Trafo İç Endüktansı Hesaplama
    // Not: %10 değeri kullanılmasının nedeni, fiziksel dünyada trafolarımıza iç endüktans sardırılmasıdır
    // Formül: XL = (Sekonder Gerilimi / 10) / (Trafo Gücü (kVA) / (Sekonder Gerilimi × √Faz Sayısı))
    const XL = (secondaryVoltage / 10) / (transformerPower / (secondaryVoltage * Math.sqrt(inputs.inputPhase)));

    // İç Endüktans L_trafo = XL / (2 × π × Sistem Frekansı)
    const L_trafo = XL / (2 * Math.PI * inputs.systemFrequency);

    // Hedef kesim frekansı sınırı:
    // - 3 faz: 34Hz'den küçük
    // - 1 faz: 20Hz'den küçük
    const isSinglePhase = Number(inputs.inputPhase || 0) === 1 || inputs.topology === 'B2H';
    const targetFreq = isSinglePhase ? 20 : 34;

    const minCapCountRaw = Number(inputs.outputCurrent || 0) / (Math.max(1, Number(inputs.inputPhase || 1)) * 15);
    const minCapRounded = this.calculateThresholdRoundedCount(minCapCountRaw);
    const minCapCount = Math.max(2, minCapRounded);
    const capOptions = [
      { uf: 4700, f: 4700e-6 },
      { uf: 10000, f: 10000e-6 },
    ];
    const chokeValuesMh = this.getDefaultDCChokeScanValuesMh();
    const catalogToleranceMh = 0.1;
    const preferredMarginHz = 5;
    const outputCurrent = Number(inputs.outputCurrent || 0);
    const requiredChokeCurrentA = this.getRequiredDCChokeCurrentA(outputCurrent);

    const candidates = [];
    const maxExtraCaps = 8;
    for (const capOption of capOptions) {
      for (let capCount = minCapCount; capCount <= minCapCount + maxExtraCaps; capCount++) {
        for (const chokeMh of chokeValuesMh) {
          const chokeH = chokeMh / 1000;
          const totalL = L_trafo + chokeH;
          const actualFreq = 1 / (2 * Math.PI * Math.sqrt(totalL * capOption.f * capCount));
          const isValid = actualFreq < targetFreq;
          const estimatedCapCost = this.getDCCapacitorUnitCost(capOption.uf) * capCount;
          const estimatedChokeCost = this.getEstimatedDCChokeUnitCost(chokeMh, requiredChokeCurrentA, catalogToleranceMh);
          const totalEstimatedDCFilterCost = estimatedCapCost + estimatedChokeCost;
          const frequencyMargin = targetFreq - actualFreq;
          const marginPenalty = Math.abs(frequencyMargin - preferredMarginHz);
          const frequencyExcess = Math.max(0, actualFreq - targetFreq);
          candidates.push({
            capacitanceUf: capOption.uf,
            capacitanceF: capOption.f,
            capCount,
            chokeInductanceMh: chokeMh,
            totalInductanceH: totalL,
            actualFreq,
            targetFreq,
            isValid,
            estimatedCapCost,
            estimatedChokeCost,
            totalEstimatedDCFilterCost,
            frequencyMargin,
            marginPenalty,
            frequencyExcess,
          });
        }
      }
    }

    const validCandidates = candidates.filter((candidate) => candidate.isValid);
    const selectionPool = validCandidates.length ? validCandidates : candidates;
    const bestConfig = [...selectionPool].sort((a, b) => {
      if (a.capCount !== b.capCount) return a.capCount - b.capCount;
      if (a.totalEstimatedDCFilterCost !== b.totalEstimatedDCFilterCost) {
        return a.totalEstimatedDCFilterCost - b.totalEstimatedDCFilterCost;
      }
      if (!validCandidates.length && a.frequencyExcess !== b.frequencyExcess) {
        return a.frequencyExcess - b.frequencyExcess;
      }
      if (a.marginPenalty !== b.marginPenalty) return a.marginPenalty - b.marginPenalty;
      if (a.capacitanceUf !== b.capacitanceUf) return a.capacitanceUf - b.capacitanceUf;
      if (a.chokeInductanceMh !== b.chokeInductanceMh) return a.chokeInductanceMh - b.chokeInductanceMh;
      return a.actualFreq - b.actualFreq;
    })[0];

    return {
      dcChokeInductance: bestConfig.chokeInductanceMh,
      dcCapacitorCapacitance: bestConfig.capacitanceUf,
      dcCapacitorUnitCapacitance: bestConfig.capacitanceUf,
      dcCapacitorCount: bestConfig.capCount,
      dcCapacitorTotalCapacitance: bestConfig.capacitanceUf * bestConfig.capCount,
      dcCapacitorMinCountRaw: minCapCountRaw,
      dcCapacitorMinCount: minCapCount,
      dcCapacitorMinCountFromCurrent: minCapRounded,
      calculatedL: L_trafo,
      calculatedLTotal: bestConfig.totalInductanceH,
      targetFrequency: targetFreq,
      actualFrequency: bestConfig.actualFreq,
      dcOptimizationSummary: {
        selectedCapacitanceUf: bestConfig.capacitanceUf,
        selectedChokeInductanceMh: bestConfig.chokeInductanceMh,
        technicalTargetChokeInductanceMh: bestConfig.chokeInductanceMh,
        estimatedTotalCost: bestConfig.totalEstimatedDCFilterCost,
        estimatedChokeCost: bestConfig.estimatedChokeCost,
        totalEstimatedDCFilterCost: bestConfig.totalEstimatedDCFilterCost,
        usedMinimumCapCount: bestConfig.capCount === minCapCount,
        capCountFloorBeforeMinTwoRule: minCapRounded,
        appliedRedundantMinTwoCaps: minCapRounded < 2,
        requiredChokeCurrentA,
        catalogToleranceMh,
        selectedFrequencyMargin: bestConfig.frequencyMargin,
        preferredMarginHz,
        marginPenalty: bestConfig.marginPenalty,
      },
    };
  }

  normalizeSearchText(value) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildRowSearchText(row) {
    if (!row || typeof row !== 'object') return '';
    const values = [];
    Object.entries(row).forEach(([key, value]) => {
      if (value == null) return;
      const keyText = this.normalizeSearchText(key);
      if (keyText.includes('description') || keyText.includes('desc') || keyText.includes('subtype')) {
        values.push(String(value));
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        values.push(String(value));
      }
    });
    return this.normalizeSearchText(values.join(' '));
  }

  rowMatchesKeywords(row, keywords = []) {
    const haystack = this.buildRowSearchText(row);
    return keywords.every((keyword) => haystack.includes(this.normalizeSearchText(keyword)));
  }

  findFirstMatchingRow(rows, keywords = [], extraPredicate = null) {
    const list = Array.isArray(rows) ? rows : [];
    return list.find((row) => {
      const keywordMatch = this.rowMatchesKeywords(row, keywords);
      if (!keywordMatch) return false;
      if (typeof extraPredicate === 'function') return Boolean(extraPredicate(row));
      return true;
    }) || null;
  }

  createComponent(name, productName, specs, quantity, unitPrice, stockCode, excelData, category) {
    const qty = Math.max(1, Number(quantity) || 1);
    const unit = Number(unitPrice) || 0;
    return {
      name,
      productName,
      specs,
      quantity: qty,
      unitPrice: unit,
      totalPrice: unit * qty,
      stockCode: stockCode || '',
      excelData: excelData || null,
      category,
    };
  }

  getStandardSupplyTransformerName() {
    return 'Trafo 230V / 230V 20VA';
  }

  normalizeTransformerTopology(value) {
    const text = this.normalizeSearchText(value);
    if (!text) return '';
    if (text.includes('supply') || text.includes('besleme')) return 'SUPPLY';
    if (text.includes('12') || text.includes('b12c')) return 'B12C';
    if (text.includes('6') || text.includes('b6c')) return 'B6C';
    if (text.includes('single') || text.includes('tek faz') || text.includes('1 faz') || text.includes('b2h')) return 'B2H';
    return text.toUpperCase();
  }

  getTransformerTopology(row, fallback = '') {
    return this.normalizeTransformerTopology(
      this.getColumn(row, ['Topology', 'Topoloji', 'topology']) || fallback || ''
    );
  }

  getTransformerOutputVoltage(row, fallback = '') {
    return Number(this.getColumn(row, [
      'Output Voltage (V)',
      'Output Voltage',
      'Secondary Voltage',
      'Secondary Voltage (V)',
      'Secondary',
      'Voltage (V)',
    ]) || fallback || 0);
  }

  getTransformerPowerKva(row) {
    return Number(this.getColumn(row, ['Power (kVA)', 'Power Rating (kVA)', 'Power', 'kVA']) || 0);
  }

  getNearestAvailableValue(target, values) {
    const numericTarget = Number(target);
    const candidates = (Array.isArray(values) ? values : [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    if (!Number.isFinite(numericTarget) || !candidates.length) return null;
    return candidates.reduce((best, current) =>
      Math.abs(current - numericTarget) < Math.abs(best - numericTarget) ? current : best
    );
  }

  calculateThresholdRoundedCount(rawCount) {
    const value = Number(rawCount) || 0;
    const base = Math.floor(value);
    const fraction = value - base;
    if (value <= 0) return 1;
    if (fraction === 0) return Math.max(1, base);
    return Math.max(1, base + (fraction > 0.2 ? 1 : 0));
  }

  getDCCapacitanceUf(row) {
    return Number(this.getColumn(row, ['Capacitance (uF)', 'Capacitance (µF)', 'Capacitance', 'C (uF)', 'C (µF)']) || 0);
  }

  getRequiredDCChokeCurrentA(outputCurrent) {
    return Number((Math.max(0, Number(outputCurrent) || 0) * 1.1).toFixed(3));
  }

  /** BOM / açıklama: örn. "Choke 1.5mH 60A DC" (gereksiz ondalık sıfırları atar). */
  formatDCChokeSpecsLine(inductanceMh, currentA) {
    const L = Number(inductanceMh);
    const I = Number(currentA);
    const lPart = Number.isFinite(L) ? String(parseFloat(L.toFixed(3))) : '0';
    let iPart = '0';
    if (Number.isFinite(I)) {
      const r = Math.round(I * 10) / 10;
      iPart = Math.abs(r - Math.round(r)) < 1e-6 ? String(Math.round(r)) : String(parseFloat(r.toFixed(1)));
    }
    return `Choke ${lPart}mH ${iPart}A DC`;
  }

  /**
   * ±tolerans mH içinde, önce I_req'i sağlayan en küçük katalog akımı, sonra endüktans farkı, sonra maliyet.
   * Mantık: dc-choke-catalog-pick.js — findBestDCChokeCatalogRowImpl.
   * @returns {{ row: object|null, reason: 'ok'|'empty'|'no-current-or-cost'|'no-tolerance', _stats?: object }}
   */
  findBestDCChokeCatalogRow(requiredInductanceMh, requiredCurrentA, chokes, toleranceMh = 0.1) {
    const impl =
      typeof globalThis !== 'undefined' && typeof globalThis.findBestDCChokeCatalogRowImpl === 'function'
        ? globalThis.findBestDCChokeCatalogRowImpl
        : null;
    if (!impl) {
      console.error('findBestDCChokeCatalogRowImpl bulunamadı; dc-choke-catalog-pick.js sayfaya ekli olmalı.');
      return { row: null, reason: 'empty', _stats: { afterCurrentFilter: 0, inToleranceBand: 0 } };
    }
    return impl(this.getColumn.bind(this), requiredInductanceMh, requiredCurrentA, chokes, toleranceMh);
  }

  getDCCapacitorUnitCost(capacitanceUf) {
    const rows = Array.isArray(this.excelData?.dcCapacitors) ? this.excelData.dcCapacitors : [];
    const match = rows.find((row) => {
      const value = this.getDCCapacitanceUf(row);
      return Math.abs(value - Number(capacitanceUf || 0)) < 0.01;
    });
    return Number(match?.Cost || 0);
  }

  getEstimatedDCChokeUnitCost(requiredInductanceMh, current, toleranceMh = 0.1) {
    const rows = Array.isArray(this.excelData?.dcChokes) ? this.excelData.dcChokes : [];
    const { row } = this.findBestDCChokeCatalogRow(requiredInductanceMh, current, rows, toleranceMh);
    return Number(row?.Cost || 0);
  }

  isSupplyTransformerRow(row) {
    const topology = this.getTransformerTopology(row);
    if (topology === 'SUPPLY') return true;
    const haystack = this.buildRowSearchText(row);
    if (haystack.includes('supply')) return true;
    const typed = this.normalizeSearchText(
      [
        this.getColumn(row, ['Product Type', 'Ürün Tipi', 'Type', 'Tip']),
        this.getColumn(row, ['Product Name', 'Ürün Adı', 'Model', 'Description', 'Açıklama']),
        haystack,
      ]
        .filter(Boolean)
        .join(' ')
    );
    if (!typed.includes('besleme')) return false;
    return (
      typed.includes('trafo') ||
      typed.includes('transformat') ||
      typed.includes('transformator') ||
      typed.includes('transformer')
    );
  }

  buildTransformerLabel(row, fallbackPrimary = '', fallbackSecondary = '', fallbackTopology = '') {
    const power = this.getTransformerPowerKva(row);
    const primary = Number(this.getColumn(row, ['Primary Voltage', 'Primary Voltage (V)', 'Primary', 'Input Voltage (V)', 'Input Voltage']) || fallbackPrimary || 0);
    const secondary = this.getTransformerOutputVoltage(row, fallbackSecondary);
    const topology = this.getTransformerTopology(row, fallbackTopology) || 'Transformer';
    const stockCode = String(row?.['Stock Code'] || '').trim();
    const base = `${power ? power.toFixed(0) : '?'}kVA ${primary || '?'}V/${secondary || '?'}V ${topology}`.trim();
    return stockCode ? `${base} (${stockCode})` : base;
  }

  selectSupplyTransformer(transformers) {
    const list = Array.isArray(transformers) ? transformers : [];
    const supplyRows = list.filter((row) => this.isSupplyTransformerRow(row));
    if (!supplyRows.length) return null;
    const selected = supplyRows.find((row) => Number.isFinite(Number(row.Cost))) || supplyRows[0];
    return {
      ...selected,
      Topology: this.getTransformerTopology(selected, 'SUPPLY') || 'SUPPLY',
      'Product Name': this.getStandardSupplyTransformerName(),
    };
  }

  /**
   * Besleme trafosu görünen adında Hz / sabit frekans ifadesini kaldırır (şebeke frekansı projeye göre değişir).
   */
  stripSupplyTransformerFrequencyText(text) {
    const raw = String(text == null ? '' : text);
    let s = raw;
    s = s.replace(/\b\d{2}\s*\/\s*\d{2}\s*hz\b/gi, '');
    s = s.replace(/\b\d{2}\s*-\s*\d{2}\s*hz\b/gi, '');
    s = s.replace(/\b\d{2}\s*hz\b/gi, '');
    s = s.replace(/\s*hz\b/gi, '');
    s = s.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').trim();
    return s || raw.trim();
  }

  /** Excel'den gelen $50,00 / 50,00 ₺ gibi değerleri sayıya çevirir. */
  parseExcelCurrencyNumber(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    let s = String(value).replace(/[$€₺\s]/gi, '').trim();
    if (!s) return 0;
    if (s.includes(',') && !s.includes('.')) {
      s = s.replace(',', '.');
    } else if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * ControlCards Product Type eşlemesi (önceden normalizeSearchText ile küçük harfe çevrilmiş metin).
   * İngilizce: electronic + board veya electronic + card | Türkçe: elektronik + (kart veya board)
   */
  isElectronicBoardProductType(ptNormalized) {
    const pt = String(ptNormalized || '').trim();
    if (!pt) return false;
    const enBoard = pt.includes('electronic') && pt.includes('board');
    const enCard = pt.includes('electronic') && pt.includes('card');
    const trKart = pt.includes('elektronik') && (pt.includes('kart') || pt.includes('board'));
    return Boolean(enBoard || enCard || trKart);
  }

  /**
   * ControlCards (Rectifier.xlsx) — Electronic Board katalog satırları:
   * - Product Type: "Electronic Board" / "Electronic Card" / "Elektronik Kart" / "Elektronik Board" (normalizeSearchText sonrası eşleşir)
   * - Product Name, Cost, Stock Code
   * - BoardScope | Board Scope | Kategori | Scope: "Standard" / "Standart" veya "Option" / "Opsiyon"
   * - OptionMatch | Keywords: opsiyon satırları için eşleştirme (; | , ile ayrılmış)
   * - Quantity | Qty | Adet: (isteğe bağlı, varsayılan 1)
   * Varsayılan: ilgili Product Type ise satır her projede standart eklenir (BoardScope boş / Standart).
   * Yalnızca BoardScope açıkça Opsiyon/Option ise OptionMatch koşulu uygulanır. Aynı Stock Code zaten BOM'da varsa atlanır.
   *
   * Not: rectifier-flex-pricing price table bu listeyi doğrudan Excel'den okumaz; yalnızca bu sayfada
   * selectComponents çalışıp sonuç rectifierCalculatedComponents olarak localStorage'a yazıldıktan sonra flex sayfasında görünür.
   */
  appendElectronicBoardCatalogComponents(components, inputs, optionsRows, projectConfig) {
    const list = Array.isArray(this.excelData?.controlCards) ? this.excelData.controlCards : [];
    console.log(`[ControlCards] Excel satır sayısı: ${list.length}`);
    if (!list.length) return;

    let catalogBoardRowsAdded = 0;

    const usedStock = new Set(
      components.map((c) => String(c.stockCode || '').trim()).filter(Boolean)
    );

    const featureParts = [
      ...Array.from(this.selectedFeatures || []),
      ...(Array.isArray(projectConfig?.extraFeatures) ? projectConfig.extraFeatures : []),
    ].map((s) => this.normalizeSearchText(String(s)));

    const haystack = this.normalizeSearchText(featureParts.join(' '));

    const inputSignals = [];
    if (String(inputs.parallelOperation || '') === 'Aktif') {
      inputSignals.push('paralel', 'parallel');
    }
    if (inputs.batteryLVD === 'Var' || inputs.batteryLVD === 'Var / Yes') {
      inputSignals.push('lvd', 'low voltage disconnect');
    }
    const dd = String(inputs.diodeDropper || '').trim();
    if (dd && !this.isDiodeDropperOff(dd)) {
      inputSignals.push('dropper', 'diyot');
    }
    const comm = this.normalizeSearchText(inputs.communicationProtocol || '');
    if (comm) inputSignals.push(comm);
    const relay = this.normalizeSearchText(inputs.relayAlarmOutputs || '');
    if (relay) inputSignals.push(relay);

    const megaHay = this.normalizeSearchText(`${haystack} ${inputSignals.join(' ')}`);

    const optionRowsNorm = (Array.isArray(optionsRows) ? optionsRows : []).map((r) =>
      this.normalizeSearchText(
        [r['Product Name'], r['Product Type'], r['Description'], r['Açıklama']].filter(Boolean).join(' ')
      )
    );

    let forwardFillProductType = '';
    for (const row of list) {
      const rawPt = String(
        this.getColumn(row, ['Product Type', 'Ürün Tipi', 'Type', 'Tip']) || ''
      ).trim();
      if (rawPt) forwardFillProductType = rawPt;

      const pt = this.normalizeSearchText(forwardFillProductType);
      if (!this.isElectronicBoardProductType(pt)) continue;

      const explicitScopeRaw = String(
        this.getColumn(row, [
          'BoardScope',
          'Board Scope',
          'Kategori',
          'Scope',
          'boardScope',
        ]) || ''
      ).trim();

      const scopeNorm = this.normalizeSearchText(explicitScopeRaw);
      const isExplicitOption =
        scopeNorm.includes('option') || scopeNorm.includes('opsiyon');

      const treatAsOption = Boolean(isExplicitOption);
      const treatAsStandard = !treatAsOption;

      const stock = String(
        this.getColumn(row, ['Stock Code', 'Stockcode', 'Stok Kodu', 'Stock_Code']) || ''
      ).trim();
      if (stock && usedStock.has(stock)) continue;

      const matchRaw = String(
        this.getColumn(row, ['OptionMatch', 'Option Match', 'Keywords', 'optionMatch']) || ''
      ).trim();
      const tokens = matchRaw
        .split(/[;|,\n]+/)
        .map((t) => this.normalizeSearchText(t.trim()))
        .filter(Boolean);

      if (treatAsOption) {
        if (!tokens.length) continue;
        const matched = tokens.some((tok) => {
          if (!tok) return false;
          return (
            megaHay.includes(tok) ||
            featureParts.some((f) => f.includes(tok) || tok.includes(f)) ||
            optionRowsNorm.some((o) => o.includes(tok))
          );
        });
        if (!matched) continue;
      }

      const qtyRaw = Number(this.getColumn(row, ['Quantity', 'Qty', 'Adet']) || 1);
      const q = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
      const pname = String(
        this.getColumn(row, ['Product Name', 'Ürün Adı', 'Model', 'Description', 'Açıklama']) || ''
      ).trim() || 'Elektronik Kart';
      const scopeTag = treatAsOption ? 'option' : 'standard';

      const unitPrice = this.parseExcelCurrencyNumber(
        this.getColumn(row, ['Cost', 'Price', 'Fiyat', 'Birim Fiyat', 'Unit Price']) ?? row.Cost
      );

      components.push({
        name: pname,
        productName: pname,
        specs: treatAsOption ? 'Opsiyon kart' : 'Standart kart',
        quantity: q,
        unitPrice,
        totalPrice: unitPrice * q,
        stockCode: stock,
        excelData: { ...row, __boardCatalog: true, __boardScope: scopeTag },
        category: 'Kart',
      });
      catalogBoardRowsAdded += 1;
      if (stock) usedStock.add(stock);
    }

    console.log(`[ControlCards] BOM'a eklenen kart katalog satırı: ${catalogBoardRowsAdded}`);
  }

  /**
   * revizyonlar08: 1004_30 Alarm & Comm için röle sayısına göre ek adet; ≥8 rölede 1020_50 güç kartı (yoksa) ekle.
   */
  applyRelayBasedControlCardAdjustments(components, inputs) {
    const relayCount = this.parseRelayAlarmCount(inputs.relayAlarmOutputs);
    if (relayCount == null) return;

    const extraComm = this.getRelayExtraAlarmCommBoardQty(relayCount);
    if (extraComm > 0) {
      for (const c of components) {
        if (String(c.category || '') !== 'Kart' || !c.excelData?.__boardCatalog) continue;
        const sc = String(c.stockCode || '')
          .replace(/\s/g, '')
          .toUpperCase();
        if (!sc.startsWith('1004_30')) continue;
        const q0 = Number(c.quantity) || 1;
        c.quantity = q0 + extraComm;
        c.totalPrice = (Number(c.unitPrice) || 0) * c.quantity;
        if (c.excelData && typeof c.excelData === 'object') {
          c.excelData.__relayExtraAlarmCommBoards = extraComm;
        }
        break;
      }
    }

    if (relayCount < 8) return;

    const has1020 = components.some((c) =>
      String(c.stockCode || '')
        .replace(/\s/g, '')
        .toUpperCase()
        .startsWith('1020_50')
    );
    if (has1020) return;

    const list = Array.isArray(this.excelData?.controlCards) ? this.excelData.controlCards : [];
    let row = null;
    for (const r of list) {
      const sc = String(
        this.getColumn(r, ['Stock Code', 'Stockcode', 'Stok Kodu', 'Stock_Code']) || r['Stock Code'] || ''
      )
        .replace(/\s/g, '')
        .toUpperCase();
      if (sc.startsWith('1020_50')) {
        row = r;
        break;
      }
    }
    if (!row) return;

    const pname = String(
      this.getColumn(row, ['Product Name', 'Ürün Adı', 'Model', 'Description', 'Açıklama']) || ''
    ).trim() || 'Power Supply Board';
    const stock = String(
      this.getColumn(row, ['Stock Code', 'Stockcode', 'Stok Kodu', 'Stock_Code']) || ''
    ).trim();
    const unitPrice = this.parseExcelCurrencyNumber(
      this.getColumn(row, ['Cost', 'Price', 'Fiyat', 'Birim Fiyat', 'Unit Price']) ?? row.Cost
    );
    const qRaw = Number(this.getColumn(row, ['Quantity', 'Qty', 'Adet']) || 1);
    const q = Number.isFinite(qRaw) && qRaw > 0 ? qRaw : 1;
    components.push({
      name: pname,
      productName: pname,
      specs: 'Standart kart · programlanabilir röle ≥8',
      quantity: q,
      unitPrice,
      totalPrice: unitPrice * q,
      stockCode: stock,
      excelData: { ...row, __boardCatalog: true, __boardScope: 'standard', __relayConditionalPsu: true },
      category: 'Kart',
    });
  }

  addComponentIfFound(components, options) {
    const {
      rows,
      keywords,
      predicate,
      name,
      specs,
      quantity = 1,
      category,
    } = options;
    const row = this.findFirstMatchingRow(rows, keywords, predicate);
    if (!row) return null;
    const productName = row['Product Name'] || row['productName'] || name;
    const unitPrice = row.Cost || row.cost || 0;
    const stockCode = row['Stock Code'] || row.stockCode || '';
    const component = this.createComponent(
      name,
      productName,
      specs || productName,
      quantity,
      unitPrice,
      stockCode,
      row,
      category
    );
    components.push(component);
    return component;
  }

  /**
   * AS99 soğutucu uzunluğu (ürün adında 150mm / 200mm / 300mm eşlemesi).
   * I < 70 → 150mm; I < 150 → 200mm; aksi → 300mm.
   */
  getAs99Variant(outputCurrent) {
    const c = Number(outputCurrent) || 0;
    if (c < 70) return '150mm';
    if (c < 150) return '200mm';
    return '300mm';
  }

  getStandardFanQuantity(outputCurrent) {
    void outputCurrent;
    return 3;
  }

  getCurrentCardLabel(outputCurrent) {
    const current = Number(outputCurrent) || 0;
    if (current <= 100) return 'L100P';
    if (current <= 200) return 'L200P';
    if (current <= 300) return 'L300P';
    return 'Özel';
  }

  /** UI metninden programlanabilir kuru kontak sayısı (4 / 8 / 12 / 16). */
  parseRelayAlarmCount(relayAlarmOutputs) {
    if (relayAlarmOutputs == null || String(relayAlarmOutputs).trim() === '') return null;
    const m = String(relayAlarmOutputs).match(/(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
  }

  /** revizyonlar08: röle sayısına göre 2.5 mm alarm klemm adedi. */
  getAlarmTerminalCountForRelay(relayCount) {
    if (relayCount === 4) return 12;
    if (relayCount === 8) return 24;
    if (relayCount === 12) return 36;
    if (relayCount === 16) return 48;
    return 0;
  }

  /** 1004_30 Alarm & Comm kartına eklenecek ek adet (taban Excel qty üzerine). */
  getRelayExtraAlarmCommBoardQty(relayCount) {
    if (relayCount === 8) return 1;
    if (relayCount === 12) return 2;
    if (relayCount === 16) return 3;
    return 0;
  }

  /** UI değeri `Yok / No` vb. iken modül diyotu sayılmaz (parseInt NaN → 1 hatası önlenir). */
  isDiodeDropperOff(dd) {
    const s = String(dd || '').trim().toLowerCase();
    if (!s || s === '0') return true;
    if (s.startsWith('yok')) return true;
    return false;
  }

  /** DC-DC kıyıcılı seçenek (value içinde "DC-DC" geçer). */
  isDiodeDropperDcChopper(dd) {
    return /dc-dc/i.test(String(dd || ''));
  }

  /**
   * Kademe sayısı: "1 kademe / 1 Stage" → 1. Dropper kapalı veya rakam yok → 0.
   */
  parseDiodeDropperStageCount(dd) {
    if (this.isDiodeDropperOff(dd) || this.isDiodeDropperDcChopper(dd)) return 0;
    const m = String(dd || '').match(/(\d+)/);
    if (!m) return 0;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && n >= 1 ? n : 0;
  }

  /**
   * Dropper modül diyot adedi (soğutma hesabı ile dropper push aynı mantık).
   * DC-DC kıyıcılı veya dropper yok: 0.
   * dropperVoltageDropV > 0 ise: ceil(V / 1.5) (manuel düşüş, V).
   */
  computeDropperModuleDiodeCount(inputs, calculations) {
    const dd = String(inputs.diodeDropper || '').trim();
    if (this.isDiodeDropperOff(dd)) return 0;
    if (this.isDiodeDropperDcChopper(dd)) return 0;
    const dropperStageCount = this.parseDiodeDropperStageCount(dd);
    if (dropperStageCount < 1) {
      console.warn('Diyot dropper: kademe sayısı çözülemedi, diyot adedi 0:', dd);
      return 0;
    }
    const manualV = Number(inputs.dropperVoltageDropV);
    let voltageDrop = 0;
    if (Number.isFinite(manualV) && manualV > 0) {
      voltageDrop = manualV;
    } else if (dropperStageCount === 1) {
      voltageDrop = calculations.boostVoltage - calculations.floatVoltage;
    } else if (dropperStageCount >= 2) {
      voltageDrop = calculations.boostVoltage - inputs.outputVoltage * 1.1;
    }
    const diodeCount = Math.ceil(voltageDrop / 1.5);
    return Math.max(0, diodeCount);
  }

  /**
   * revizyonlar08: tristör + serbest geçiş (1) + dropper modül diyotları;
   * toplam modül N > 4 ise her ek 4 modül için +1 heatsink ve +1 fan.
   */
  computeModuleCoolingExtras(inputs, calculations, thyristorCount) {
    const dropperDiodes = this.computeDropperModuleDiodeCount(inputs, calculations);
    const moduleTotal = thyristorCount + 1 + dropperDiodes;
    const extraFromModules =
      moduleTotal > 4 ? Math.ceil((moduleTotal - 4) / 4) : 0;
    return { dropperDiodes, moduleTotal, extraFromModules };
  }

  // Parçaları seç
  async selectComponents(inputs, calculations) {
    const components = [];
    const selectionAudit = {
      branches: {},
      selectedNames: [],
    };

    try {
      // Excel verilerinin yüklenip yüklenmediğini kontrol et
      if (!this.excelData) {
        console.warn('⚠️ Excel verileri yüklenmemiş, yükleme başlatılıyor...');
        await this.loadAllExcelData();
      }

      const projectConfig = this.getProjectConfig();
      const frontPanel = String(projectConfig?.userInterface?.frontPanel || '');
      const normalizedFrontPanel = this.normalizeSearchText(frontPanel);
      const optionsRows = this.excelData.options || [];
      const coolingRows = this.excelData.coolingComponents || [];
      const terminalRows = this.excelData.terminals || [];

      // Debug: Excel verilerini kontrol et
      console.log('=== PARÇA SEÇİMİ BAŞLADI ===');
      const excelDataStatus = {
        transformers: this.excelData.transformers?.length || 0,
        dcChokes: this.excelData.dcChokes?.length || 0,
        dcCapacitors: this.excelData.dcCapacitors?.length || 0,
        thyristors: this.excelData.thyristors?.length || 0,
        freewheelingDiodes: this.excelData.freewheelingDiodes?.length || 0,
        circuitBreakers: this.excelData.circuitBreakers?.length || 0,
        terminals: this.excelData.terminals?.length || 0,
        coolingComponents: this.excelData.coolingComponents?.length || 0,
        cabinets: this.excelData.cabinets?.length || 0,
        options: this.excelData.options?.length || 0,
      };
      console.log('Excel veri durumu:', excelDataStatus);
      
      // Eksik veriler varsa notification göster
      const missingData = Object.entries(excelDataStatus)
        .filter(([key, count]) => count === 0)
        .map(([key]) => key);
      
      if (missingData.length > 0) {
        this.showNotification('warning', 'Eksik Veri', 
          `Bazı Excel verileri yüklenemedi: ${missingData.join(', ')}. Parça seçimi sınırlı olabilir.`);
      }
      
      // İlk satırların kolon isimlerini göster (debug için)
      if (this.excelData.transformers && this.excelData.transformers.length > 0) {
        console.log('Transformers kolonları:', Object.keys(this.excelData.transformers[0]).join(', '));
      }
      if (this.excelData.dcChokes && this.excelData.dcChokes.length > 0) {
        console.log('DCChokes kolonları:', Object.keys(this.excelData.dcChokes[0]).join(', '));
      }
      if (this.excelData.dcCapacitors && this.excelData.dcCapacitors.length > 0) {
        console.log('DCCapacitors kolonları:', Object.keys(this.excelData.dcCapacitors[0]).join(', '));
      }
      if (this.excelData.circuitBreakers && this.excelData.circuitBreakers.length > 0) {
        console.log('CircuitBreakers kolonları:', Object.keys(this.excelData.circuitBreakers[0]).join(', '));
      }

    // ========== BELİRTİLEN SIRAYA GÖRE PARÇA EKLEME ==========

    // 1. Giriş Trafosu (1 adet)
    const transformer = this.selectTransformer(
      calculations.transformerPower,
      inputs.inputVoltage,
      inputs.inputPhase,
      inputs.outputVoltage,
      this.excelData.transformers,
      inputs.topology
    );
    if (transformer) {
      const transformerLabel =
        String(transformer['Product Name'] || '').trim() ||
        this.buildTransformerLabel(transformer, inputs.inputVoltage, inputs.outputVoltage, inputs.topology);
      const transformerOutputVoltage = this.getColumn(
        transformer,
        ['Output Voltage (V)', 'Output Voltage', 'Secondary Voltage', 'Secondary Voltage (V)', 'Secondary']
      );
      console.log('✓ Giriş Trafosu seçildi:', transformerLabel);
      components.push({
        name: 'Giriş Trafosu',
        productName: transformerLabel,
        specs: `${transformer['Power (kVA)']}kVA, ${transformer['Primary Voltage']} / ${transformerOutputVoltage}`,
        quantity: inputs.topology === 'B12C' ? 2 : 1, // B12C için 2x trafo
        unitPrice: transformer.Cost || 0,
        totalPrice: (transformer.Cost || 0) * (inputs.topology === 'B12C' ? 2 : 1),
        stockCode: transformer['Stock Code'] || '',
        excelData: transformer,
        category: 'Giriş Trafosu',
      });
    } else {
      console.warn('✗ Giriş Trafosu seçilemedi! Trafo gücü:', calculations.transformerPower, 'kVA');
      this.showNotification('warning', 'Giriş Trafosu', 
        `Excel'de uygun Giriş Trafosu bulunamadı (İstenen: ${calculations.transformerPower.toFixed(2)}kVA)`);
    }

    // 2. Besleme Trafosu (1 adet)
    const supplyTransformer = this.selectSupplyTransformer(this.excelData.transformers);
    const supplyLabel = this.getStandardSupplyTransformerName();
    if (supplyTransformer) {
      console.log('✓ Besleme Trafosu seçildi:', supplyLabel);
      const supplyDisplayName = this.stripSupplyTransformerFrequencyText(
        supplyTransformer['Product Name'] || supplyLabel
      );
      components.push({
        name: 'Besleme Trafosu',
        productName: supplyDisplayName,
        specs: `${supplyDisplayName}${supplyTransformer['Stock Code'] ? `, Stok: ${supplyTransformer['Stock Code']}` : ''}`,
        quantity: 1,
        unitPrice: Number(supplyTransformer.Cost) || 0,
        totalPrice: Number(supplyTransformer.Cost) || 0,
        stockCode: supplyTransformer['Stock Code'] || '',
        excelData: supplyTransformer,
        category: 'Besleme Trafosu',
      });
    } else {
      console.warn('✗ Besleme Trafosu seçilemedi! Transformers listesinde besleme satırı bulunamadı.');
      this.showNotification(
        'warning',
        'Besleme Trafosu',
        'Transformers sayfasında besleme trafosu satırı bulunamadı; teknik standart bilgi amaçlı listelenir.'
      );
      components.push({
        name: 'Besleme Trafosu',
        productName: supplyLabel,
        specs: `Teknik standart: ${supplyLabel}, Akım: ${Number(inputs.outputCurrent || 0).toFixed(2)} A, Durum: Transformers sayfasında eşleşen satır yok`,
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        stockCode: '',
        excelData: { __catalogMatchMissing: true, __placeholder: true },
        category: 'Besleme Trafosu',
      });
    }

    // Standart sabit parçalar
    this.addComponentIfFound(components, {
      rows: optionsRows,
      keywords: ['ntc', '10k'],
      name: 'NTC 10K Wired',
      specs: 'Standart sıcaklık sensörü',
      quantity: 1,
      category: 'Sensör',
    });
    this.addComponentIfFound(components, {
      rows: optionsRows,
      keywords: ['fuse'],
      name: 'Fan ve Besleme Sigortası',
      specs: 'Fuse 2A 10.38 500V',
      quantity: 2,
      category: 'Sigorta',
      predicate: (row) => this.normalizeSearchText(row.Subtype || row['Subtype'] || row['Product Name'] || '').includes('2a'),
    });
    this.addComponentIfFound(components, {
      rows: optionsRows,
      keywords: ['fuse holder', '10.38'],
      name: 'Fuse Holder',
      specs: 'Fuse Holder 10.38',
      quantity: 2,
      category: 'Fuse Holder',
    });
    this.addComponentIfFound(components, {
      rows: optionsRows,
      keywords: ['yardımcı kontak'],
      name: 'Akü Kesicisi Yardımcı Kontak',
      specs: 'Batarya kesicisi yardımcı kontak',
      quantity: 1,
      category: 'Kontak',
    }) || this.addComponentIfFound(components, {
      rows: optionsRows,
      keywords: ['auxiliary contact'],
      name: 'Akü Kesicisi Yardımcı Kontak',
      specs: 'Batarya kesicisi yardımcı kontak',
      quantity: 1,
      category: 'Kontak',
    });

    // 3. Oto Trafo (Standart olmayan giriş gerilimleri için)
    const standardVoltages = [
      { phase: 3, voltage: 400 },
      { phase: 3, voltage: 380 },
      { phase: 1, voltage: 220 },
      { phase: 1, voltage: 230 },
    ];
    const isStandardVoltage = standardVoltages.some(
      (sv) => sv.phase === inputs.inputPhase && sv.voltage === inputs.inputVoltage
    );
    selectionAudit.branches.standardVoltage = isStandardVoltage;
    if (!isStandardVoltage) {
      const autoTransformerPrimer = inputs.inputVoltage / Math.sqrt(inputs.inputPhase);
      const autoTransformerSekonder = 230;
      const autoTransformer = this.excelData.transformers?.find(
        (t) => t['Product Type'] === 'Oto Trafo' && t.Cost
      );
      if (autoTransformer) {
      components.push({
          name: `Auto Transformer ${autoTransformerPrimer.toFixed(0)}V / ${autoTransformerSekonder}V`,
          productName: autoTransformer['Product Name'],
          specs: `Primer: ${autoTransformerPrimer.toFixed(0)}V, Sekonder: ${autoTransformerSekonder}V`,
        quantity: 1,
          unitPrice: autoTransformer.Cost || 0,
          totalPrice: autoTransformer.Cost || 0,
          stockCode: autoTransformer['Stock Code'] || '',
          excelData: autoTransformer,
          category: 'Oto Trafo',
        });
      }
    }

    // 4. DC Şok (B2H/B6C: 1 adet, B12C: 2 adet)
    const requiredChokeCurrentA = this.getRequiredDCChokeCurrentA(inputs.outputCurrent);
    const dcChoke = this.selectDCChoke(
      calculations.dcChokeInductance,
      requiredChokeCurrentA,
      this.excelData.dcChokes
    );
    if (dcChoke) {
      const inductance =
        this.getColumn(dcChoke, [
          'Inductance (mH)',
          'Inductance',
          'L (mH)',
          'L(mH)',
          'Endüktans (mH)',
          'Endüktans mH',
        ]) || dcChoke['Inductance (mH)'];
      const currentRating =
        this.getColumn(dcChoke, [
          'Current Rating (A)',
          'Current Rating',
          'Current (A)',
          'Rating (A)',
          'Current',
          'Akım (A)',
          'Rated Current (A)',
        ]) || dcChoke['Current Rating (A)'];
      const optimizationSummary = calculations.dcOptimizationSummary || (calculations.dcOptimizationSummary = {});
      if (dcChoke.__catalogToleranceUsedMh != null) {
        optimizationSummary.catalogToleranceMh = Number(dcChoke.__catalogToleranceUsedMh);
      }
      optimizationSummary.catalogMatchedChokeInductanceMh = Number(inductance || 0);
      optimizationSummary.catalogMatchDeltaMh = Number(dcChoke.__inductanceDeltaMh || 0);
      optimizationSummary.catalogChokeMatched = true;
      optimizationSummary.requiredChokeCurrentA = requiredChokeCurrentA;
      console.log('✓ DC Şok seçildi:', dcChoke['Product Name'], `(${inductance}mH, ${currentRating}A)`);
      const dcChokeQuantity = inputs.topology === 'B12C' ? 2 : 1;
      components.push({
        name: 'DC Şok',
        productName: dcChoke['Product Name'],
        specs: this.formatDCChokeSpecsLine(inductance, currentRating),
        quantity: dcChokeQuantity,
        unitPrice: dcChoke.Cost || 0,
        totalPrice: (dcChoke.Cost || 0) * dcChokeQuantity,
        stockCode: dcChoke['Stock Code'] || '',
        excelData: dcChoke,
        category: 'DC Şok',
      });
    } else {
      const optimizationSummary = calculations.dcOptimizationSummary || (calculations.dcOptimizationSummary = {});
      optimizationSummary.catalogChokeMatched = false;
      optimizationSummary.requiredChokeCurrentA = requiredChokeCurrentA;
      const technicalInductance = Number(optimizationSummary.technicalTargetChokeInductanceMh || calculations.dcChokeInductance || 0);
      const toleranceMh = Number(optimizationSummary.catalogToleranceMh || 0.1);
      const dcChokeQuantity = inputs.topology === 'B12C' ? 2 : 1;
      const chokeLine = this.formatDCChokeSpecsLine(technicalInductance, requiredChokeCurrentA);
      console.warn('✗ DC Şok seçilemedi! İstenen:', calculations.dcChokeInductance, 'mH, minimum', requiredChokeCurrentA, 'A');
      this.showNotification('warning', 'DC Şok', 
        `DCComponents içinde ${calculations.dcChokeInductance.toFixed(3)}mH hedefine ±100uH yakın, minimum ${Number(requiredChokeCurrentA).toFixed(1)}A uygun DC Şok bulunamadı`);
      components.push({
        name: 'DC Şok',
        productName: `Teknik Hedef DC Şok (${technicalInductance.toFixed(3)}mH)`,
        specs: `${chokeLine}, Durum: Katalog eşleşmesi yok (±${(toleranceMh * 1000).toFixed(0)}uH)`,
        quantity: dcChokeQuantity,
        unitPrice: 0,
        totalPrice: 0,
        stockCode: '',
        excelData: {
          'Inductance (mH)': technicalInductance,
          'Current Rating (A)': requiredChokeCurrentA,
          '__catalogMatchMissing': true,
        },
        category: 'DC Şok',
      });
    }

    // 5. Kabin (1 adet)
    const mech = projectConfig.mechanical;
    if (mech.cabinetType) {
      // Tip belirleme
      let cabinetTypeDisplay = mech.cabinetType;
      if (mech.cabinetType === 'Özel tasarım' || mech.cabinetType === 'Custom' || mech.cabinetType.includes('Özel')) {
        cabinetTypeDisplay = 'Özel';
      }
      
      // Boyut belirleme
      let cabinetSize = '';
      if (mech.cabinetSize && mech.cabinetSize !== 'Özel' && mech.cabinetSize !== 'Özel Boyutlar' && !mech.cabinetSize.includes('Özel')) {
        cabinetSize = mech.cabinetSize;
      } else if (mech.customCabinetWidth > 0 && mech.customCabinetDepth > 0 && mech.customCabinetHeight > 0) {
        cabinetSize = `${mech.customCabinetWidth}x${mech.customCabinetDepth}x${mech.customCabinetHeight}`;
      }
      
      // Kablo girişi formatı
      let cableEntryDisplay = mech.cableEntry || '';
      if (mech.cableEntry === 'Alt') {
        cableEntryDisplay = 'Kablo Girişi Alttan';
      }
      
      // Sac tipi ve kalınlık (sheetType içinde kalınlık bilgisi olabilir)
      const sheetTypeDisplay = mech.sheetType || '';
      
      // Kabin açıklaması oluştur
      const cabinetDescription = `Cabinet (${cabinetTypeDisplay}) ${cabinetSize}mm, ${mech.protectionClass || ''}, ${cableEntryDisplay}, ${mech.cabinetColor || ''}, ${sheetTypeDisplay}`;
      
      // Excel'den kabin fiyatı çek (eğer varsa)
      const cabinet = this.excelData.cabinets?.find(
        (c) => c['Cabinet Type'] === mech.cabinetType && c.Cost
      );
      
      components.push({
        name: 'Kabin',
        productName: cabinet ? cabinet['Product Name'] : cabinetDescription,
        specs: cabinetDescription,
        quantity: 1,
        unitPrice: cabinet ? (cabinet.Cost || 0) : 0,
        totalPrice: cabinet ? (cabinet.Cost || 0) : 0,
        stockCode: cabinet ? (cabinet['Stock Code'] || '') : '',
        excelData: cabinet || null,
        category: 'Kabin',
      });
    }

    // 6. Soğutucu ve Fanlar (Tristörlerden sonra eklenecek, şimdilik placeholder)

    // 7. Faz Kontrol Tristörleri (B2H: 2, B6C: 3, B12C: 6 adet)
    const requiredThyristorCurrent = (inputs.outputCurrent * 1.5) / inputs.inputPhase;
    const thyristorCount = inputs.topology === 'B12C' ? 6 : inputs.topology === 'B6C' ? 3 : 2;
    const { moduleTotal, extraFromModules, dropperDiodes } = this.computeModuleCoolingExtras(
      inputs,
      calculations,
      thyristorCount
    );
    const thyristor = this.selectThyristor(requiredThyristorCurrent, this.excelData.thyristors);
    if (thyristor) {
      console.log('✓ Faz Kontrol Tristörü seçildi:', thyristor['Product Name'], `(${thyristor['Current Rating (A)']}A, ${thyristorCount} adet)`);
      components.push({
        name: `Modül Tristör + Tristör ${thyristor['Current Rating (A)']}A`,
        productName: thyristor['Product Name'],
        specs: `${thyristor['Current Rating (A)']}A`,
        quantity: thyristorCount,
        unitPrice: thyristor.Cost || 0,
        totalPrice: (thyristor.Cost || 0) * thyristorCount,
        stockCode: thyristor['Stock Code'] || '',
        excelData: thyristor,
        category: 'Tristör',
      });

      // 6. Soğutucu (CoolingComponents, AS99 + modül paketi revizyonlar08)
      const outI = Number(inputs.outputCurrent) || 0;
      const baseHeatsinkCount =
        Math.max(Math.ceil(thyristorCount / 4), 1) + (outI > 200 ? 1 : 0);
      const heatsinkCount = baseHeatsinkCount + extraFromModules;
      const heatsinkSize = this.getAs99Variant(outI);
      const vinNum = Number(inputs.inputVoltage) || 0;
      const fanQty = 3 + extraFromModules;
      const coolingSelectionBreakdown = {
        topology: inputs.topology,
        thyristorCount,
        dropperDiodes,
        moduleTotal,
        extraFromModules,
        baseHeatsinkCount,
        heatsinkCount,
        heatsinkSize,
        outputCurrent: outI,
        inputVoltage: vinNum,
        fanQuantity: fanQty,
      };
      const coolingSpecNote =
        extraFromModules > 0
          ? `Modül ${moduleTotal} (tristör+serbest geçiş+dropper); +${extraFromModules} soğutma paketi`
          : `Modül ${moduleTotal}`;
      const norm = (s) => this.normalizeSearchText(s);
      const matchAs99 = (sizeMm) =>
        this.findFirstMatchingRow(
          coolingRows,
          ['as99'],
          (row) => norm(row['Product Name'] || '').includes(norm(sizeMm))
        );
      const heatsink =
        matchAs99(heatsinkSize) ||
        (heatsinkSize === '300mm' ? matchAs99('250mm') : null) ||
        this.findFirstMatchingRow(coolingRows, ['as99']) ||
        this.selectCoolingComponent('Heatsink', coolingRows);
      if (heatsink && heatsinkCount > 0) {
        console.log('✓ Soğutucu seçildi:', heatsink['Product Name'], `(${heatsinkCount} adet)`);
        components.push({
          name: 'Soğutucu',
          productName: heatsink['Product Name'],
          specs: `AS99 ${heatsinkSize} · ${coolingSpecNote}`,
          quantity: heatsinkCount,
          unitPrice: heatsink.Cost || 0,
          totalPrice: (heatsink.Cost || 0) * heatsinkCount,
          stockCode: heatsink['Stock Code'] || '',
          excelData: heatsink,
          category: 'Soğutucu',
          coolingSelectionBreakdown,
        });
      } else {
        console.warn('✗ Soğutucu seçilemedi! Component Type: Heatsink');
      }

      // 7. Fanlar: taban 3 (2 kabin + 1 heatsink) + modül paketi (revizyonlar08; akıma göre ek yok)
      const vin = Number(inputs.inputVoltage) || 0;
      const fan =
        (vin > 0 && vin <= 150
          ? this.findFirstMatchingRow(coolingRows, ['fan', '110v', '115v', '120v']) ||
            this.findFirstMatchingRow(coolingRows, ['fan', '115', '110'])
          : null) ||
        this.findFirstMatchingRow(coolingRows, ['fan', '230v', '120']) ||
        this.selectCoolingComponent('Fan', coolingRows);
      const fanQuantity = fanQty;
      if (fan && fanQuantity > 0) {
        console.log('✓ Fan seçildi:', fan['Product Name'], `(${fanQuantity} adet)`);
        components.push({
          name: 'Fan',
          productName: fan['Product Name'],
          specs: `Fan · taban 3 (2 kabin + 1 heatsink) + modül paketi ${extraFromModules}`,
          quantity: fanQuantity,
          unitPrice: fan.Cost || 0,
          totalPrice: (fan.Cost || 0) * fanQuantity,
          stockCode: fan['Stock Code'] || '',
          excelData: fan,
          category: 'Fan',
          coolingSelectionBreakdown,
        });
      } else {
        console.warn('✗ Fan seçilemedi! Component Type: Fan');
      }
      this.addComponentIfFound(components, {
        rows: optionsRows,
        keywords: ['termostat'],
        name: 'Termostat 90C Normally Closed',
        specs: 'Soğutucu koruması',
        quantity: heatsinkCount,
        category: 'Termostat',
      }) || this.addComponentIfFound(components, {
        rows: optionsRows,
        keywords: ['thermostat', '90c'],
        name: 'Termostat 90C Normally Closed',
        specs: 'Soğutucu koruması',
        quantity: heatsinkCount,
        category: 'Termostat',
      });
    } else {
      console.warn('✗ Faz Kontrol Tristörü seçilemedi! İstenen:', requiredThyristorCurrent, 'A');
      this.showNotification('warning', 'Faz Kontrol Tristörü', 
        `Excel'de uygun tristör bulunamadı (İstenen: ${requiredThyristorCurrent.toFixed(2)}A)`);
    }

    // 8. Serbest Geçiş Diyotu (1 adet)
    const requiredDiodeCurrent = inputs.outputCurrent * 1.5;
    const freewheelingDiode = this.selectFreewheelingDiode(requiredDiodeCurrent, this.excelData.freewheelingDiodes);
    if (freewheelingDiode) {
      console.log('✓ Serbest Geçiş Diyotu seçildi:', freewheelingDiode['Product Name'], `(${freewheelingDiode['Current Rating (A)']}A)`);
      components.push({
        name: `Modül Diyot + Diyot ${freewheelingDiode['Current Rating (A)']}A`,
        productName: freewheelingDiode['Product Name'],
        specs: `${freewheelingDiode['Current Rating (A)']}A`,
        quantity: 1,
        unitPrice: freewheelingDiode.Cost || 0,
        totalPrice: freewheelingDiode.Cost || 0,
        stockCode: freewheelingDiode['Stock Code'] || '',
        excelData: freewheelingDiode,
        category: 'Diyot',
      });
    } else {
      console.warn('✗ Serbest Geçiş Diyotu seçilemedi! İstenen:', requiredDiodeCurrent, 'A');
      this.showNotification('warning', 'Serbest Geçiş Diyotu', 
        `Excel'de uygun diyot bulunamadı (İstenen: ${requiredDiodeCurrent.toFixed(2)}A)`);
    }

    // 9. Dropper Diyotu (Hesaplanan adet kadar)
    // Koşullu parçalar bölümünde işlenecek

    // 10. DC Kapasitör (Hesaplanan adet kadar)
    const dcCapacitor = this.selectDCCapacitor(calculations.dcCapacitorCapacitance, this.excelData.dcCapacitors);
    if (dcCapacitor) {
      const capacitorValueUf = this.getDCCapacitanceUf(dcCapacitor);
      const capacitorLabel = capacitorValueUf > 0 ? `${capacitorValueUf}uF` : 'Bilinmeyen';
      console.log('✓ DC Kapasitör seçildi:', dcCapacitor['Product Name'], `(${capacitorLabel}, ${calculations.dcCapacitorCount} adet)`);
      components.push({
        name: capacitorValueUf > 0 ? `Kapasitör ${capacitorValueUf}uF` : 'Kapasitör',
        productName: dcCapacitor['Product Name'],
        specs: capacitorLabel,
        quantity: calculations.dcCapacitorCount,
        unitPrice: dcCapacitor.Cost || 0,
        totalPrice: (dcCapacitor.Cost || 0) * calculations.dcCapacitorCount,
        stockCode: dcCapacitor['Stock Code'] || '',
        excelData: dcCapacitor,
        category: 'Kapasitör',
      });
    } else {
      console.warn('✗ DC Kapasitör seçilemedi! İstenen:', calculations.dcCapacitorCapacitance, 'uF');
      this.showNotification('warning', 'DC Kapasitör', 
        `Excel'de uygun kapasitör bulunamadı (İstenen: ${calculations.dcCapacitorCapacitance.toFixed(0)}uF)`);
    }

    // 11. Elektronik kartlar: ControlCards (Electronic Board) + koşullu Kart satırları — appendElectronicBoardCatalogComponents (seçim sonunda)

    // 12. Giriş Kesicisi (1 adet) — B2H: MCCB (docs/rectifier-pricing-business-rules.md)
    const inputBreakerType = this.getEffectiveInputBreakerType(inputs);
    const inputBreaker = this.selectBreaker(
      calculations.inputCurrent,
      inputs.inputPhase,
      inputBreakerType,
      this.excelData.circuitBreakers
    );
    if (inputBreaker) {
      console.log('✓ Giriş Kesicisi seçildi:', inputBreaker['Product Name'], `(${inputBreaker.Poles}x${inputBreaker['Current Rating (A)']}A ${inputBreaker.Type})`);
      components.push({
        name: 'Giriş Kesicisi',
        productName: inputBreaker['Product Name'],
        specs: `${inputBreaker.Poles}x${inputBreaker['Current Rating (A)']}A ${inputBreaker.Type}`,
        quantity: 1,
        unitPrice: inputBreaker.Cost || 0,
        totalPrice: inputBreaker.Cost || 0,
        stockCode: inputBreaker['Stock Code'] || '',
        excelData: inputBreaker,
        category: 'Kesici',
      });
    } else {
      console.warn(
        '✗ Giriş Kesicisi seçilemedi! İstenen:',
        calculations.inputCurrent,
        'A,',
        inputs.inputPhase,
        'poles,',
        inputBreakerType
      );
      const b2hNote =
        String(inputs.topology || '').trim() === 'B2H'
          ? ' B2H topolojisinde giriş için MCCB zorunludur.'
          : '';
      this.showNotification(
        'warning',
        'Giriş Kesicisi',
        `Excel'de uygun kesici bulunamadı (İstenen: ${calculations.inputCurrent.toFixed(2)}A, ${inputs.inputPhase} kutuplu, ${inputBreakerType}).${b2hNote}`
      );
    }

    // 13. Çıkış Kesicisi (1 adet)
    // Kutup sayısı: DC gerilim > 48V → 3 kutuplu, ≤ 48V → 2 kutuplu
    const poles = inputs.outputVoltage > 48 ? 3 : 2;
    console.log(`=== Çıkış Kesicisi Seçimi Başlıyor ===`);
    console.log(`Parametreler: outputCurrent=${inputs.outputCurrent}A, outputVoltage=${inputs.outputVoltage}V, poles=${poles}, breakerType=${inputs.breakerType}`);
    console.log(`Excel verisi: circuitBreakers.length=${this.excelData.circuitBreakers?.length || 0}`);
    
    // Excel verilerini kontrol et
    if (!this.excelData.circuitBreakers || this.excelData.circuitBreakers.length === 0) {
      console.error('Çıkış Kesicisi: Excel\'de kesici verisi yüklenmemiş!');
      this.showNotification('error', 'Çıkış Kesicisi', 'Excel\'de kesici verisi yüklenmemiş!');
    }
    
    let outputBreaker = null;
    try {
      console.log(`Çıkış Kesicisi: selectBreaker çağrılıyor - current=${inputs.outputCurrent}, poles=${poles}, type=${inputs.breakerType}`);
      outputBreaker = this.selectBreaker(
        inputs.outputCurrent,
        poles,
        inputs.breakerType,
        this.excelData.circuitBreakers
      );
      console.log(`Çıkış Kesicisi selectBreaker sonucu:`, outputBreaker ? 'BAŞARILI' : 'NULL');
      if (outputBreaker) {
        console.log(`Çıkış Kesicisi seçildi - Detaylar:`, {
          productName: outputBreaker['Product Name'],
          poles: outputBreaker.Poles,
          type: outputBreaker.Type,
          currentRating: outputBreaker['Current Rating (A)'],
          cost: outputBreaker.Cost
        });
      } else {
        console.warn(`Çıkış Kesicisi seçilemedi! İstenen: ${inputs.outputCurrent}A, ${poles} kutuplu, ${inputs.breakerType}`);
        this.showNotification('error', 'Çıkış Kesicisi', 
          `Çıkış kesicisi seçilemedi! İstenen: ${inputs.outputCurrent}A, ${poles} kutuplu, ${inputs.breakerType}. Lütfen Excel dosyasını kontrol edin.`);
      }
    } catch (error) {
      console.error('Çıkış Kesicisi seçiminde hata:', error);
      console.error('Hata detayları:', error.stack);
      this.showNotification('error', 'Çıkış Kesicisi', `Kesici seçiminde hata oluştu: ${error.message}`);
    }
    
    if (outputBreaker) {
      try {
        // Güvenli erişim ile değerleri al
        const breakerPoles = outputBreaker.Poles || this.getColumn(outputBreaker, ['Poles', 'Pole', 'Pole Count', 'PoleCount']) || poles;
        const breakerType = outputBreaker.Type || this.getColumn(outputBreaker, ['Type', 'Breaker Type', 'BreakerType']) || inputs.breakerType;
        const breakerCurrent = outputBreaker['Current Rating (A)'] || this.getColumn(outputBreaker, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || inputs.outputCurrent;
        const breakerProductName = outputBreaker['Product Name'] || 'Bilinmeyen Kesici';
        const breakerCost = outputBreaker.Cost || 0;
        const breakerStockCode = outputBreaker['Stock Code'] || '';
        
        console.log('✓ Çıkış Kesicisi seçildi:', breakerProductName, `(${breakerPoles}x${breakerCurrent}A ${breakerType})`);
        console.log(`Çıkış Kesicisi detayları:`, {
          poles: breakerPoles,
          type: breakerType,
          current: breakerCurrent,
          cost: breakerCost,
          stockCode: breakerStockCode
        });
        
      components.push({
          name: 'Çıkış Kesicisi',
          productName: breakerProductName,
          specs: `${breakerPoles}x${breakerCurrent}A ${breakerType}`,
        quantity: 1,
          unitPrice: breakerCost,
          totalPrice: breakerCost,
          stockCode: breakerStockCode,
          excelData: outputBreaker,
          category: 'Kesici',
        });
        console.log('✓ Çıkış Kesicisi listeye eklendi');
      } catch (error) {
        console.error('Çıkış Kesicisi listeye eklenirken hata:', error);
        this.showNotification('error', 'Çıkış Kesicisi', `Kesici listeye eklenirken hata oluştu: ${error.message}`);
      }
    } else {
      console.warn('✗ Çıkış Kesicisi seçilemedi! İstenen:', inputs.outputCurrent, 'A,', poles, 'poles,', inputs.breakerType);
      console.warn('Çıkış Kesicisi seçilemedi - detaylı bilgi için selectBreaker loglarına bakın');
      // Notification zaten selectBreaker içinde gösterildi, burada tekrar gösterme
    }

    // 14. Batarya Kesicisi (1 adet)
    console.log(`=== Batarya Kesicisi Seçimi Başlıyor ===`);
    let batteryBreaker = outputBreaker;
    
    // Eğer çıkış kesicisi seçilemediyse, batarya kesicisi için ayrı bir seçim yap
    if (!batteryBreaker) {
      console.warn('Çıkış kesicisi seçilemedi, batarya kesicisi için ayrı seçim yapılıyor...');
      console.log(`Batarya Kesicisi: selectBreaker çağrılıyor - current=${inputs.outputCurrent}, poles=${poles}, type=${inputs.breakerType}`);
      console.log(`Batarya Kesicisi: Excel verisi mevcut mu? ${this.excelData.circuitBreakers?.length > 0 ? 'EVET' : 'HAYIR'}`);
      
      try {
        batteryBreaker = this.selectBreaker(
          inputs.outputCurrent,
          poles,
          inputs.breakerType,
          this.excelData.circuitBreakers
        );
        console.log(`Batarya Kesicisi selectBreaker sonucu:`, batteryBreaker ? 'BAŞARILI' : 'NULL');
        if (batteryBreaker) {
          console.log(`Batarya Kesicisi seçildi - Detaylar:`, {
            productName: batteryBreaker['Product Name'],
            poles: batteryBreaker.Poles,
            type: batteryBreaker.Type,
            currentRating: batteryBreaker['Current Rating (A)'],
            cost: batteryBreaker.Cost
          });
        } else {
          console.warn(`Batarya Kesicisi seçilemedi! İstenen: ${inputs.outputCurrent}A, ${poles} kutuplu, ${inputs.breakerType}`);
          this.showNotification('error', 'Batarya Kesicisi', 
            `Batarya kesicisi seçilemedi! İstenen: ${inputs.outputCurrent}A, ${poles} kutuplu, ${inputs.breakerType}. Lütfen Excel dosyasını kontrol edin.`);
        }
      } catch (error) {
        console.error('Batarya Kesicisi seçiminde hata:', error);
        console.error('Hata detayları:', error.stack);
        this.showNotification('error', 'Batarya Kesicisi', `Kesici seçiminde hata oluştu: ${error.message}`);
      }
    } else {
      console.log(`Batarya Kesicisi: Çıkış kesicisi kullanılıyor (aynı kesici)`);
    }
    
    // Eğer her iki kesici de seçilemezse, kullanıcıya daha açıklayıcı bir hata mesajı göster
    if (!outputBreaker && !batteryBreaker) {
      console.error('=== KRİTİK: Hem çıkış hem batarya kesicisi seçilemedi! ===');
      console.error(`İstenen kriterler: ${inputs.outputCurrent}A, ${poles} kutuplu, ${inputs.breakerType}`);
      console.error(`Excel'deki kesici sayısı: ${this.excelData.circuitBreakers?.length || 0}`);
      this.showNotification('error', 'Kesici Seçimi', 
        `Hem çıkış hem batarya kesicisi seçilemedi! İstenen: ${inputs.outputCurrent}A, ${poles} kutuplu, ${inputs.breakerType}. ` +
        `Lütfen Excel dosyasında uygun kesicilerin bulunduğundan emin olun.`);
    }
    
    if (batteryBreaker) {
      try {
        // Güvenli erişim ile değerleri al
        const breakerPoles = batteryBreaker.Poles || this.getColumn(batteryBreaker, ['Poles', 'Pole', 'Pole Count', 'PoleCount']) || poles;
        const breakerType = batteryBreaker.Type || this.getColumn(batteryBreaker, ['Type', 'Breaker Type', 'BreakerType']) || inputs.breakerType;
        const breakerCurrent = batteryBreaker['Current Rating (A)'] || this.getColumn(batteryBreaker, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || inputs.outputCurrent;
        const breakerProductName = batteryBreaker['Product Name'] || 'Bilinmeyen Kesici';
        const breakerCost = batteryBreaker.Cost || 0;
        const breakerStockCode = batteryBreaker['Stock Code'] || '';
        
        console.log('✓ Batarya Kesicisi seçildi:', breakerProductName, `(${breakerPoles}x${breakerCurrent}A ${breakerType})`);
        console.log(`Batarya Kesicisi detayları:`, {
          poles: breakerPoles,
          type: breakerType,
          current: breakerCurrent,
          cost: breakerCost,
          stockCode: breakerStockCode
        });
        
      components.push({
          name: 'Batarya Kesicisi',
          productName: breakerProductName,
          specs: `${breakerPoles}x${breakerCurrent}A ${breakerType}`,
        quantity: 1,
          unitPrice: breakerCost,
          totalPrice: breakerCost,
          stockCode: breakerStockCode,
          excelData: batteryBreaker,
          category: 'Kesici',
        });
        console.log('✓ Batarya Kesicisi listeye eklendi');
      } catch (error) {
        console.error('Batarya Kesicisi listeye eklenirken hata:', error);
        this.showNotification('error', 'Batarya Kesicisi', `Kesici listeye eklenirken hata oluştu: ${error.message}`);
      }
    } else {
      console.warn('✗ Batarya Kesicisi eklenemedi (Çıkış Kesicisi seçilemedi ve ayrı seçim de başarısız)');
      // Notification zaten selectBreaker içinde gösterildi, burada tekrar gösterme
    }

    // 15. Giriş Terminali Gri (Faz sayısı kadar)
    const inputTerminalGrey = this.selectTerminal(calculations.inputCurrent, this.excelData.terminals);
    if (inputTerminalGrey) {
      const terminalSize = inputTerminalGrey['Product Name'].match(/(\d+(?:\.\d+)?)mm/) || 
                          inputTerminalGrey['Product Name'].match(/(\d+(?:\.\d+)?)/);
      const sizeDisplay = terminalSize ? terminalSize[1] : '';
      const terminalName = inputTerminalGrey['Product Type'] === 'Bara' || inputTerminalGrey['Product Type'] === 'Busbar' 
                          ? `Busbar ${sizeDisplay}mm` 
                          : `Terminal ${sizeDisplay}mm`;
      components.push({
        name: `Giriş Terminali Gri ${sizeDisplay}mm`,
        productName: inputTerminalGrey['Product Name'],
        specs: `${inputTerminalGrey['Current Rating (A)']}A`,
        quantity: inputs.inputPhase,
        unitPrice: inputTerminalGrey.Cost || 0,
        totalPrice: (inputTerminalGrey.Cost || 0) * inputs.inputPhase,
        stockCode: inputTerminalGrey['Stock Code'] || '',
        excelData: inputTerminalGrey,
        category: 'Terminal',
      });
    }

    // 16. Giriş Terminali Mavi (Nötr varsa 1 adet)
    if (inputs.inputNeutral === 'Var' || inputs.inputNeutral === 'Var / Yes') {
      const inputTerminalBlue = this.selectTerminal(calculations.inputCurrent, this.excelData.terminals);
      if (inputTerminalBlue) {
        const terminalSize = inputTerminalBlue['Product Name'].match(/(\d+(?:\.\d+)?)mm/) || 
                            inputTerminalBlue['Product Name'].match(/(\d+(?:\.\d+)?)/);
        const sizeDisplay = terminalSize ? terminalSize[1] : '';
        components.push({
          name: `Giriş Terminali Mavi ${sizeDisplay}mm`,
          productName: inputTerminalBlue['Product Name'],
          specs: `${inputTerminalBlue['Current Rating (A)']}A`,
        quantity: 1,
          unitPrice: inputTerminalBlue.Cost || 0,
          totalPrice: inputTerminalBlue.Cost || 0,
          stockCode: inputTerminalBlue['Stock Code'] || '',
          excelData: inputTerminalBlue,
          category: 'Terminal',
      });
      }
    }

    // 17. Giriş Terminali Sarı Yeşil (1 adet)
    const inputTerminalYellowGreen = this.selectTerminal(calculations.inputCurrent, this.excelData.terminals);
    if (inputTerminalYellowGreen) {
      const terminalSize = inputTerminalYellowGreen['Product Name'].match(/(\d+(?:\.\d+)?)mm/) || 
                          inputTerminalYellowGreen['Product Name'].match(/(\d+(?:\.\d+)?)/);
      const sizeDisplay = terminalSize ? terminalSize[1] : '';
      components.push({
        name: `Giriş Terminali Sarı Yeşil ${sizeDisplay}mm`,
        productName: inputTerminalYellowGreen['Product Name'],
        specs: `${inputTerminalYellowGreen['Current Rating (A)']}A`,
        quantity: 1,
        unitPrice: inputTerminalYellowGreen.Cost || 0,
        totalPrice: inputTerminalYellowGreen.Cost || 0,
        stockCode: inputTerminalYellowGreen['Stock Code'] || '',
        excelData: inputTerminalYellowGreen,
        category: 'Terminal',
      });
    }

    // 18. Çıkış Terminali Kırmızı (1 adet)
    const outputTerminalRed = this.selectTerminal(inputs.outputCurrent, this.excelData.terminals);
    if (outputTerminalRed) {
      const terminalSize = outputTerminalRed['Product Name'].match(/(\d+(?:\.\d+)?)mm/) || 
                          outputTerminalRed['Product Name'].match(/(\d+(?:\.\d+)?)/);
      const sizeDisplay = terminalSize ? terminalSize[1] : '';
      const terminalName = outputTerminalRed['Product Type'] === 'Bara' || outputTerminalRed['Product Type'] === 'Busbar' 
                          ? `Busbar ${sizeDisplay}mm` 
                          : `Terminal ${sizeDisplay}mm`;
      components.push({
        name: `Çıkış Terminali Kırmızı ${sizeDisplay}mm`,
        productName: outputTerminalRed['Product Name'],
        specs: `${outputTerminalRed['Current Rating (A)']}A`,
        quantity: 1,
        unitPrice: outputTerminalRed.Cost || 0,
        totalPrice: outputTerminalRed.Cost || 0,
        stockCode: outputTerminalRed['Stock Code'] || '',
        excelData: outputTerminalRed,
        category: 'Terminal',
      });
    }

    // 19. Çıkış Terminali Siyah (1 adet)
    const outputTerminalBlack = this.selectTerminal(inputs.outputCurrent, this.excelData.terminals);
    if (outputTerminalBlack) {
      const terminalSize = outputTerminalBlack['Product Name'].match(/(\d+(?:\.\d+)?)mm/) || 
                          outputTerminalBlack['Product Name'].match(/(\d+(?:\.\d+)?)/);
      const sizeDisplay = terminalSize ? terminalSize[1] : '';
      const terminalName = outputTerminalBlack['Product Type'] === 'Bara' || outputTerminalBlack['Product Type'] === 'Busbar' 
                          ? `Busbar ${sizeDisplay}mm` 
                          : `Terminal ${sizeDisplay}mm`;
      components.push({
        name: `Çıkış Terminali Siyah ${sizeDisplay}mm`,
        productName: outputTerminalBlack['Product Name'],
        specs: `${outputTerminalBlack['Current Rating (A)']}A`,
        quantity: 1,
        unitPrice: outputTerminalBlack.Cost || 0,
        totalPrice: outputTerminalBlack.Cost || 0,
        stockCode: outputTerminalBlack['Stock Code'] || '',
        excelData: outputTerminalBlack,
        category: 'Terminal',
      });
    }

    // Akü terminali (çıkış terminali ile aynı mantık)
    if (outputTerminalRed) {
      components.push({
        name: 'Akü Terminali Kırmızı',
        productName: outputTerminalRed['Product Name'],
        specs: `${outputTerminalRed['Current Rating (A)']}A`,
        quantity: 1,
        unitPrice: outputTerminalRed.Cost || 0,
        totalPrice: outputTerminalRed.Cost || 0,
        stockCode: outputTerminalRed['Stock Code'] || '',
        excelData: outputTerminalRed,
        category: 'Terminal',
      });
    }
    if (outputTerminalBlack) {
      components.push({
        name: 'Akü Terminali Siyah',
        productName: outputTerminalBlack['Product Name'],
        specs: `${outputTerminalBlack['Current Rating (A)']}A`,
        quantity: 1,
        unitPrice: outputTerminalBlack.Cost || 0,
        totalPrice: outputTerminalBlack.Cost || 0,
        stockCode: outputTerminalBlack['Stock Code'] || '',
        excelData: outputTerminalBlack,
        category: 'Terminal',
      });
    }
    const earthBar = this.findFirstMatchingRow(
      terminalRows,
      ['bara'],
      (row) => Number(this.getColumn(row, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0) >= Number(calculations.inputCurrent || 0)
    ) || this.findFirstMatchingRow(terminalRows, ['busbar']);
    if (earthBar) {
      components.push({
        name: 'Toprak Barası',
        productName: earthBar['Product Name'],
        specs: `${this.getColumn(earthBar, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || '-'}A`,
        quantity: 1,
        unitPrice: earthBar.Cost || 0,
        totalPrice: earthBar.Cost || 0,
        stockCode: earthBar['Stock Code'] || '',
        excelData: earthBar,
        category: 'Terminal',
      });
    }

    // 20. Alarm Terminalleri (2.5mm, röle sayısı: 4→12, 8→24, 12→36, 16→48)
    const relayCountForTerminals = this.parseRelayAlarmCount(inputs.relayAlarmOutputs);
    if (relayCountForTerminals != null) {
      const alarmTerminalCount = this.getAlarmTerminalCountForRelay(relayCountForTerminals);
      if (alarmTerminalCount > 0) {
          // 2.5mm terminal seçimi
          const alarmTerminal = this.excelData.terminals?.find(
            (t) => (t['Product Name']?.includes('2.5') || t['Product Name']?.includes('2,5')) && 
                   t['Current Rating (A)'] && t.Cost
          );
          if (alarmTerminal) {
            components.push({
              name: 'Alarm Terminali 2.5mm',
              productName: alarmTerminal['Product Name'],
              specs: '2.5mm',
              quantity: alarmTerminalCount,
              unitPrice: alarmTerminal.Cost || 0,
              totalPrice: (alarmTerminal.Cost || 0) * alarmTerminalCount,
              stockCode: alarmTerminal['Stock Code'] || '',
              excelData: alarmTerminal,
              category: 'Terminal',
            });
          }
      }
    }

    // ========== KOŞULLU PARÇALAR ==========

    // 9. Dropper Diyotu (Hesaplanan adet kadar)
    if (inputs.diodeDropper && String(inputs.diodeDropper).trim() !== '' && !this.isDiodeDropperOff(inputs.diodeDropper)) {
      selectionAudit.branches.diodeDropper = inputs.diodeDropper;
      const isDCChopper = this.isDiodeDropperDcChopper(inputs.diodeDropper);
      
      if (isDCChopper) {
        // DC-DC Kıyıcılı: Sadece fiyat alınır, soğutucu eklenmez
        const dcChopperModule = this.excelData.diodeDroppers?.find(
          (d) => d['Product Type'] === 'DC-DC Chopper' || d['Product Name']?.includes('DC-DC')
        );
        if (dcChopperModule) {
          components.push({
            name: 'DC-DC Kıyıcılı Dropper',
            productName: dcChopperModule['Product Name'],
            specs: `Akım: ${inputs.outputCurrent * 1.2}A`,
            quantity: 1,
            unitPrice: dcChopperModule.Cost || 0,
            totalPrice: dcChopperModule.Cost || 0,
            stockCode: dcChopperModule['Stock Code'] || '',
            excelData: dcChopperModule,
            category: 'Diyot',
      });
    }
      } else {
        // Normal Diyot Dropper
        const dropperStageCount = this.parseDiodeDropperStageCount(inputs.diodeDropper);
        if (dropperStageCount >= 1) {
          const diodeCount = this.computeDropperModuleDiodeCount(inputs, calculations);
          const requiredDiodeCurrent = inputs.outputCurrent * 1.5;

          // Diyot seçimi
          const dropperDiode = this.excelData.diodeDroppers?.find(
            (d) => d['Product Type'] === 'Dropper Diode' &&
              d['Current Rating (A)'] >= requiredDiodeCurrent
          );
          if (dropperDiode) {
            components.push({
              name: `Modül Diyot + Diyot ${dropperDiode['Current Rating (A)']}A`,
              productName: dropperDiode['Product Name'],
              specs: `${dropperDiode['Current Rating (A)']}A`,
              quantity: diodeCount,
              unitPrice: dropperDiode.Cost || 0,
              totalPrice: (dropperDiode.Cost || 0) * diodeCount,
              stockCode: dropperDiode['Stock Code'] || '',
              excelData: dropperDiode,
              category: 'Diyot',
            });
          }

          // Röle seçimi (her kademe için)
          const relayCurrent = inputs.outputCurrent;
          const dropperRelay = this.selectRelay(relayCurrent, this.excelData.relays);
          if (dropperRelay) {
            components.push({
              name: 'Diyot Dropper Rölesi',
              productName: dropperRelay['Product Name'],
              specs: `${dropperRelay['Current Rating (A)']}A`,
              quantity: dropperStageCount,
              unitPrice: dropperRelay.Cost || 0,
              totalPrice: (dropperRelay.Cost || 0) * dropperStageCount,
              stockCode: dropperRelay['Stock Code'] || '',
              excelData: dropperRelay,
              category: 'Röle',
            });
          }

          // Röle kontrol kartı (her kademe için)
          const relayControlCard = this.excelData.controlCards?.find(
            (c) => c['Card Type'] === 'Relay Control'
          );
          if (relayControlCard) {
            components.push({
              name: 'Diyot Dropper Röle Kontrol Kartı',
              productName: relayControlCard['Product Name'],
              specs: 'Röle kontrol',
              quantity: dropperStageCount,
              unitPrice: relayControlCard.Cost || 0,
              totalPrice: (relayControlCard.Cost || 0) * dropperStageCount,
              stockCode: relayControlCard['Stock Code'] || '',
              excelData: relayControlCard,
              category: 'Kart',
            });
          }
        }

        // Dropper modül diyotları için AS99 + fan adedi tristör bloğunda
        // computeModuleCoolingExtras (moduleTotal) ile verilir; burada tekrar eklenmez (çift sayım önlenir).
      }
    }

    // Koşullu Parçalar (LVD, Dahili Dağıtım, Ölçü Aletleri, Paralel Çalışma, Haberleşme, Röle Alarm)

    // Akü LVD (Low Voltage Disconnect)
    if (inputs.batteryLVD === 'Var' || inputs.batteryLVD === 'Var / Yes') {
      selectionAudit.branches.batteryLvdEnabled = true;
      // LVD Röle Kontrol Kartı
      const lvdControlCard = this.excelData.controlCards?.find(
        (c) => c['Card Type'] === 'LVD Control'
      );
      if (lvdControlCard) {
        components.push({
          name: 'LVD Röle Kontrol Kartı',
          productName: lvdControlCard['Product Name'],
          specs: 'LVD kontrol',
        quantity: 1,
          unitPrice: lvdControlCard.Cost || 0,
          totalPrice: lvdControlCard.Cost || 0,
          stockCode: lvdControlCard['Stock Code'] || '',
          excelData: lvdControlCard,
          category: 'Kart',
      });
    }

      // LVD Rölesi
      const lvdRelayCurrent = inputs.outputCurrent * 1.2;
      const lvdRelay = this.selectRelay(lvdRelayCurrent, this.excelData.relays);
      if (lvdRelay) {
        components.push({
          name: 'LVD Rölesi',
          productName: lvdRelay['Product Name'],
          specs: `${lvdRelay['Current Rating (A)']}A`,
          quantity: 1,
          unitPrice: lvdRelay.Cost || 0,
          totalPrice: lvdRelay.Cost || 0,
          stockCode: lvdRelay['Stock Code'] || '',
          excelData: lvdRelay,
          category: 'Röle',
        });
      }
    }

    // Dahili Dağıtım Kesicileri
    if (inputs.internalDistribution === 'Var' || inputs.internalDistribution === 'Var / Yes') {
      selectionAudit.branches.internalDistributionEnabled = Array.isArray(inputs.internalDistributions) ? inputs.internalDistributions.length : 0;
      if (inputs.internalDistributions && Array.isArray(inputs.internalDistributions)) {
        inputs.internalDistributions.forEach((dist) => {
          if (dist.breakerPoleCurrent) {
            // "3x15A" formatını parse et
            const match = dist.breakerPoleCurrent.match(/(\d+)x(\d+)A/);
            if (match) {
              const poles = parseInt(match[1]);
              const current = parseInt(match[2]);
              const breaker = this.selectBreaker(current, poles, 'MCB', this.excelData.circuitBreakers);
              if (breaker) {
                components.push({
                  name: 'Dahili Dağıtım Kesicisi',
                  productName: breaker['Product Name'],
                  specs: `${breaker.Poles}x${breaker['Current Rating (A)']}A ${breaker.Type}`,
                  quantity: dist.quantity || 1,
                  unitPrice: breaker.Cost || 0,
                  totalPrice: (breaker.Cost || 0) * (dist.quantity || 1),
                  stockCode: breaker['Stock Code'] || '',
                  excelData: breaker,
                  category: 'Kesici',
                });
              }
            }
          }
        });
      }
    }

    // 17. Ölçü Aletleri
    if (inputs.measurementInstruments && Array.isArray(inputs.measurementInstruments) && inputs.measurementInstruments.length > 0) {
      selectionAudit.branches.measurementInstruments = inputs.measurementInstruments.length;
      inputs.measurementInstruments.forEach((instrument) => {
        const instrumentType = instrument.type;

          // UI artık token değerleri döndürüyor: Yük / Akü / Giriş
          // (Excel'de ise daha uzun metinler olabildiği için eşleştirmeyi toleranslı yapıyoruz.)
          const measurementPoint = instrument.point;
          const mpToken = (() => {
            const mp = String(measurementPoint || '').toLowerCase();
            if (mp.includes('giriş') || mp.includes('input')) return 'Giriş';
            if (mp.includes('akü') || mp.includes('battery')) return 'Akü';
            if (mp.includes('yük') || mp.includes('çıkış') || mp.includes('load')) return 'Yük';
            return String(measurementPoint || '').trim();
          })();

          // Voltaj değeri belirleme
          let voltageValue = 0;
          if (mpToken === 'Giriş') {
            voltageValue = inputs.inputVoltage;
          } else if (mpToken === 'Yük') {
            voltageValue = inputs.outputVoltage;
          } else if (mpToken === 'Akü') {
            voltageValue = inputs.batteryVoltage;
          }
        
        const voltageRange = voltageValue * 1.2;
        
        // Ölçü aleti seçimi
          const measurementInstrument = this.excelData.measurementInstruments?.find((m) => {
            const cellPoint = String(m['Measurement Point'] || '');
            const cellLower = cellPoint.toLowerCase();
            const instOk = m['Instrument Type'] === instrumentType;
            const pointOk =
              (mpToken === 'Giriş' && (cellLower.includes('giriş') || cellLower.includes('input'))) ||
              (mpToken === 'Akü' && (cellLower.includes('akü') || cellLower.includes('battery'))) ||
              (mpToken === 'Yük' && (cellLower.includes('yük') || cellLower.includes('çıkış') || cellLower.includes('load')));
            const voltageOk = Number(m['Voltage Range (V)'] || 0) >= voltageRange;
            return instOk && pointOk && voltageOk;
          });
        
        if (measurementInstrument) {
      components.push({
            name: `Ölçü Aleti - ${instrumentType} (${measurementPoint})`,
            productName: measurementInstrument['Product Name'],
            specs: `${measurementInstrument['Voltage Range (V)']}V`,
            quantity: 1,
            unitPrice: measurementInstrument.Cost || 0,
            totalPrice: measurementInstrument.Cost || 0,
            stockCode: measurementInstrument['Stock Code'] || '',
            excelData: measurementInstrument,
            category: 'Ölçü Aleti',
          });
        }
      });
    }

    // 18. Paralel Çalışma
    if (inputs.parallelOperation === 'Aktif') {
      selectionAudit.branches.parallelOperation = true;
      // Paralelleme Kartı
      const parallelCard =
        this.findFirstMatchingRow(optionsRows, ['parallel kit']) ||
        this.excelData.controlCards?.find(
          (c) => c['Card Type'] === 'Parallel Operation'
        );
      if (parallelCard) {
      components.push({
          name: 'Paralelleme Kartı',
          productName: parallelCard['Product Name'],
          specs: 'Paralel çalışma',
        quantity: 1,
          unitPrice: parallelCard.Cost || 0,
          totalPrice: parallelCard.Cost || 0,
          stockCode: parallelCard['Stock Code'] || '',
          excelData: parallelCard,
          category: 'Kart',
      });
    }

      // CommunicationComponents ayrı bir sheet değil; protocol/options verisini kullan.
      const rj45Port =
        this.findFirstMatchingRow(optionsRows, ['communication', 'rs232']) ||
        this.findFirstMatchingRow(optionsRows, ['communication', 'rs485']);
      if (rj45Port) {
      components.push({
          name: 'RJ45 Portu',
          productName: rj45Port['Product Name'],
          specs: 'Haberleşme portu',
          quantity: 1,
          unitPrice: rj45Port.Cost || 0,
          totalPrice: rj45Port.Cost || 0,
          stockCode: rj45Port['Stock Code'] || '',
          excelData: rj45Port,
          category: 'Haberleşme',
      });
      }
    }

    // 19. Haberleşme Protokolü
    if (inputs.communicationProtocol && inputs.communicationProtocol !== '') {
      selectionAudit.branches.communicationProtocol = inputs.communicationProtocol;
      const commProtocol = this.excelData.communicationProtocols?.find(
        (p) => p['Product Name'] === inputs.communicationProtocol
    );
      if (commProtocol) {
      components.push({
          name: 'Haberleşme Protokolü',
          productName: commProtocol['Product Name'],
          specs: 'Haberleşme modülü',
          quantity: 1,
          unitPrice: commProtocol.Cost || 0,
          totalPrice: commProtocol.Cost || 0,
          stockCode: commProtocol['Stock Code'] || '',
          excelData: commProtocol,
          category: 'Haberleşme',
      });
      }
    }

    // Panel seçimleri
    if (normalizedFrontPanel.includes('led')) {
      this.addComponentIfFound(components, {
        rows: optionsRows,
        keywords: ['led panel'],
        name: 'Led Panel',
        specs: 'Ön panel seçimine bağlı',
        quantity: 1,
        category: 'Panel',
      });
    }
    if (normalizedFrontPanel.includes('touch') || normalizedFrontPanel.includes('dokunmatik')) {
      this.addComponentIfFound(components, {
        rows: optionsRows,
        keywords: ['touch panel'],
        name: 'Touch Panel',
        specs: 'Ön panel seçimine bağlı',
        quantity: 1,
        category: 'Panel',
      }) || this.addComponentIfFound(components, {
        rows: optionsRows,
        keywords: ['dokunmatik'],
        name: 'Touch Panel',
        specs: 'Ön panel seçimine bağlı',
        quantity: 1,
        category: 'Panel',
      });
      this.addComponentIfFound(components, {
        rows: optionsRows,
        keywords: ['power supply', 'touch'],
        name: 'Touch Panel Power Supply',
        specs: 'Touch panel beslemesi',
        quantity: 1,
        category: 'Power Supply',
      }) || this.addComponentIfFound(components, {
        rows: optionsRows,
        keywords: ['touch power supply'],
        name: 'Touch Panel Power Supply',
        specs: 'Touch panel beslemesi',
        quantity: 1,
        category: 'Power Supply',
      });
      if (supplyTransformer) {
        const btName = this.stripSupplyTransformerFrequencyText(
          supplyTransformer['Product Name'] || 'Besleme Trafosu'
        );
        components.push({
          name: 'Besleme Trafosu 2',
          productName: btName,
          specs: '20VA 230V / 2x18V izole',
          quantity: 1,
          unitPrice: supplyTransformer.Cost || 0,
          totalPrice: supplyTransformer.Cost || 0,
          stockCode: supplyTransformer['Stock Code'] || '',
          excelData: supplyTransformer,
          category: 'Besleme Trafosu',
        });
      }
    }

    // 20. Röle Kuru Kontak Alarm Çıkışları
    if (inputs.relayAlarmOutputs && inputs.relayAlarmOutputs !== '') {
      selectionAudit.branches.relayAlarmOutputs = inputs.relayAlarmOutputs;
      const relayCount = this.parseRelayAlarmCount(inputs.relayAlarmOutputs);
      if (relayCount != null) {
        const relayAlarmModule = this.excelData.relayAlarmOutputs?.find(
          (r) => r['Relay Count'] === relayCount
        );
        if (relayAlarmModule) {
    components.push({
            name: 'Röle Kuru Kontak Alarm Çıkışları',
            productName: relayAlarmModule['Product Name'],
            specs: `${relayAlarmModule['Relay Count']} kontak`,
      quantity: 1,
            unitPrice: relayAlarmModule.Cost || 0,
            totalPrice: relayAlarmModule.Cost || 0,
            stockCode: relayAlarmModule['Stock Code'] || '',
            excelData: relayAlarmModule,
            category: 'Röle',
    });
        }
      }
    }

    this.appendElectronicBoardCatalogComponents(components, inputs, optionsRows, projectConfig);
    this.applyRelayBasedControlCardAdjustments(components, inputs);

    const kartKalemSayisi = components.filter(
      (c) => String(c.category || '').toLowerCase() === 'kart'
    ).length;
    const controlCardsRows = Array.isArray(this.excelData?.controlCards)
      ? this.excelData.controlCards
      : [];
    if (kartKalemSayisi === 0 && controlCardsRows.length === 0) {
      console.warn(
        '⚠️ ControlCards sayfası boş ve BOM’da Kart kalemi yok; elektronik kart maliyeti eksik olabilir.'
      );
    }

    console.log('=== PARÇA SEÇİMİ TAMAMLANDI ===');
    console.log('Toplam', components.length, 'parça seçildi');
    console.log('Seçilen parçalar:', components.map(c => c.name).join(', '));
    selectionAudit.selectedNames = components.map((c) => c.name);
    return components.map((component) => ({
      ...component,
      selectionLogic: this.buildSelectionLogicForComponent(component, inputs, calculations),
    }));
    } catch (error) {
      console.error('✗ selectComponents hatası:', error);
      console.error('Error stack:', error.stack);
      console.error('Hata sırasında seçilen parça sayısı:', components.length);
      
      // Hata olsa bile mümkün olduğunca parça eklemeye devam et
      // En azından bazı parçalar seçildiyse onları döndür
      if (components.length > 0) {
        console.warn('⚠️ Hata oluştu ancak', components.length, 'parça seçildi, bunlar döndürülüyor');
    return components.map((component) => ({
      ...component,
      selectionLogic: this.buildSelectionLogicForComponent(component, inputs, calculations),
    }));
      }
      
      // Hiç parça seçilemediyse boş array döndür
      console.error('✗ Hiçbir parça seçilemedi, boş array döndürülüyor');
      return [];
    }
  }

  buildSelectionLogicForComponent(component, inputs, calculations) {
    try {
      const name = String(component?.name || '').toLocaleLowerCase('tr-TR');
      const category = String(component?.category || '').toLocaleLowerCase('tr-TR');
      const productName = String(component?.productName || '');
      const excel = component?.excelData || {};
      const logic = [];

      if (category === 'terminal' && (name.includes('çıkış') || name.includes('kırmızı') || name.includes('siyah'))) {
        const required = Number(inputs.outputCurrent || 0);
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        logic.push(
          { key: 'Gerekli Akım', formula: `Çıkış akımı = ${required.toFixed(2)} A`, value: `${required.toFixed(2)} A` },
          { key: 'Seçim Kriteri', formula: `Terminal/Bara akımı >= ${required.toFixed(2)} A`, value: `${selected.toFixed(2)} A >= ${required.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName} (${component.specs || `${selected.toFixed(2)} A`})` }
        );
      } else if (category === 'terminal' && (name.includes('giriş') || name.includes('gri') || name.includes('mavi') || name.includes('sarı'))) {
        const required = Number(calculations.inputCurrent || 0);
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        logic.push(
          { key: 'Gerekli Akım', formula: `Giriş akımı = ${required.toFixed(2)} A`, value: `${required.toFixed(2)} A` },
          { key: 'Seçim Kriteri', formula: `Terminal/Bara akımı >= ${required.toFixed(2)} A`, value: `${selected.toFixed(2)} A >= ${required.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName} (${component.specs || `${selected.toFixed(2)} A`})` }
        );
      } else if (category === 'terminal') {
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        logic.push(
          { key: 'Terminal Tipi', formula: `Renk/nokta bazlı terminal seçimi`, value: `${component.name}` },
          { key: 'Akım Kapasitesi', formula: `Seçilen terminal akımı`, value: `${selected.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('giriş kesicisi')) {
        const required = Number(calculations.inputCurrent || 0);
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        const poles = Number(excel.Poles || inputs.inputPhase || 0);
        const criteriaType = this.getEffectiveInputBreakerType(inputs);
        const displayType = excel.Type || criteriaType || '-';
        logic.push(
          { key: 'Gerekli Akım', formula: `I_giriş = ${required.toFixed(2)} A`, value: `${required.toFixed(2)} A` },
          {
            key: 'Seçim Kriteri',
            formula: `${criteriaType} tip, ${poles} kutup, akım >= ${required.toFixed(2)} A`,
            value: `${selected.toFixed(2)} A`,
          },
          {
            key: 'Seçilen Ürün',
            formula: '',
            value: `${productName} (${poles}P ${displayType} ${selected.toFixed(0)}A)`,
          }
        );
      } else if (name.includes('çıkış kesicisi')) {
        const required = Number(inputs.outputCurrent || 0);
        const poles = inputs.outputVoltage > 48 ? 3 : 2;
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        const breakerType = excel.Type || inputs.breakerType || '-';
        logic.push(
          { key: 'Gerekli Akım', formula: `I_çıkış = ${required.toFixed(2)} A`, value: `${required.toFixed(2)} A` },
          { key: 'Seçim Kriteri', formula: `Kutup = ${poles}, tip = ${breakerType}, akım >= ${required.toFixed(2)} A`, value: `${selected.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName} (${poles}P ${breakerType} ${selected.toFixed(0)}A)` }
        );
      } else if (name.includes('tristör')) {
        const required = (Number(inputs.outputCurrent || 0) * 1.5) / Number(inputs.inputPhase || 1);
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        const count = Number(component.quantity || 1);
        logic.push(
          { key: 'Gerekli Akım', formula: `(Çıkış Akımı × 1.5) / Faz = (${Number(inputs.outputCurrent || 0).toFixed(2)} × 1.5) / ${Number(inputs.inputPhase || 1)}`, value: `${required.toFixed(2)} A` },
          { key: 'Seçim Kriteri', formula: `Tristör akımı >= ${required.toFixed(2)} A`, value: `${selected.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName} (${count} adet)` }
        );
      } else if (name.includes('diyot')) {
        const required = Number(inputs.outputCurrent || 0) * 1.5;
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        logic.push(
          { key: 'Gerekli Akım', formula: `Çıkış Akımı × 1.5 = ${Number(inputs.outputCurrent || 0).toFixed(2)} × 1.5`, value: `${required.toFixed(2)} A` },
          { key: 'Seçim Kriteri', formula: `Diyot akımı >= ${required.toFixed(2)} A`, value: `${selected.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('dc şok') || name.includes('dc chok')) {
        const requiredL = Number(calculations.dcChokeInductance || 0);
        const selectedL = Number(this.getColumn(excel, ['Inductance (mH)', 'Inductance', 'L (mH)']) || 0);
        const optimizationSummary = calculations.dcOptimizationSummary || {};
        const requiredI = Number(optimizationSummary.requiredChokeCurrentA || this.getRequiredDCChokeCurrentA(inputs.outputCurrent));
        const selectedI = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        const technicalTargetL = Number(optimizationSummary.technicalTargetChokeInductanceMh || requiredL);
        const toleranceMh = Number(optimizationSummary.catalogToleranceMh || 0.1);
        const matchDeltaMh = Number(optimizationSummary.catalogMatchDeltaMh || Math.abs(selectedL - technicalTargetL));
        const catalogMatched = optimizationSummary.catalogChokeMatched !== false && !excel.__catalogMatchMissing;
        const technicalLabel = String(Number(technicalTargetL.toFixed(3)));
        const requiredILabel = String(Number(requiredI.toFixed(1)));
        const selectedChokeLine = this.formatDCChokeSpecsLine(selectedL, selectedI);
        const technicalChokeLine = this.formatDCChokeSpecsLine(technicalTargetL, requiredI);
        const preferredMarginHz = Number(optimizationSummary.preferredMarginHz || 5);
        logic.push(
          {
            key: 'Aşama 1 — Teknik DC filtre (L, C, f_cut)',
            formula:
              'Şok endüktansı 0.25–2.00 mH aralığında taranır. Önce en düşük kapasitör adedi (N ≥ N_min), sonra tahmini toplam DC filtre maliyeti, ardından kesme frekansı marjının hedefe yakınlığı değerlendirilir (3 faz: f_cut < 34 Hz; 1 faz: f_cut < 20 Hz). Bu aşama akım kademesini seçmez; yalnızca L_teknik üretir.',
            value: `L_teknik = ${technicalLabel} mH; hedef marj ≈ ${preferredMarginHz.toFixed(1)} Hz`,
          },
          {
            key: 'Aşama 2a — Katalog: gerekli akım',
            formula: `I_req = I_çıkış × 1.1 = ${Number(inputs.outputCurrent || 0).toFixed(2)} × 1.1`,
            value: `${requiredILabel} A (yalnız I_katalog ≥ I_req satırlar dikkate alınır)`,
          },
          {
            key: 'Aşama 2b — Katalog: L toleransı',
            formula: `|L_katalog − L_teknik| ≤ ${toleranceMh.toFixed(3)} mH`,
            value: catalogMatched
              ? `Eşleşti; ΔL = ${matchDeltaMh.toFixed(3)} mH`
              : `Eşleşme yok; ±${(toleranceMh * 1000).toFixed(0)} µH bandında uygun satır yok`,
          },
          {
            key: 'Aşama 2c — Katalog: satır seçim sırası',
            formula:
              'Aynı tolerans bandındaki adaylar: (1) en küçük yeterli I_katalog, (2) en küçük |L_katalog − L_teknik|, (3) düşük maliyet, (4) L eşitliği.',
            value: catalogMatched ? selectedChokeLine : technicalChokeLine,
          },
          {
            key: 'Seçilen Ürün',
            formula: catalogMatched ? 'Excel satırı + BOM açıklama satırı' : 'Katalog yoksa yalnızca teknik hedef bilgi amaçlı',
            value: catalogMatched ? `${productName} (${selectedChokeLine})` : technicalChokeLine,
          }
        );
      } else if (name.includes('kapasitör')) {
        const requiredCap = Number(calculations.dcCapacitorUnitCapacitance || calculations.dcCapacitorCapacitance || 0);
        const selectedCap = this.getDCCapacitanceUf(excel);
        const count = Number(calculations.dcCapacitorCount || component.quantity || 1);
        const minRaw = Number(calculations.dcCapacitorMinCountRaw || 0);
        const minRounded = Number(calculations.dcCapacitorMinCount || count);
        const totalCap = Number(calculations.dcCapacitorTotalCapacitance || (requiredCap * count));
        const optimizationSummary = calculations.dcOptimizationSummary || {};
        logic.push(
          { key: 'Minimum Adet (Ham)', formula: `I_çıkış / (Faz × 15)`, value: `${minRaw.toFixed(3)}` },
          { key: 'Minimum Adet (Yuvarlanmış)', formula: `Kesir > 0.2 ise bir üst tam sayıya çıkılır`, value: `${minRounded} adet` },
          { key: 'Seçilen Kapasitör', formula: `Sadece 4700uF veya 10000uF seçeneklerinden seçilir`, value: `${selectedCap.toFixed(0)} µF` },
          { key: 'Toplam Kapasite', formula: `Ünite değer × adet`, value: `${totalCap.toFixed(0)} µF` },
          { key: 'Optimizasyon', formula: `Düşük adet ve düşük maliyet birlikte değerlendirilir`, value: optimizationSummary.usedMinimumCapCount ? 'Minimum adet korundu' : 'Ek adet kullanıldı' }
        );
      } else if (name.includes('besleme trafosu')) {
        const supplyTopology = this.getTransformerTopology(excel, 'SUPPLY') || 'SUPPLY';
        logic.push(
          { key: 'Topology', formula: `Besleme trafosu topology=supply etiketi ile seçilir`, value: supplyTopology },
          { key: 'Standart Parça', formula: `Tüm projelerde sabit besleme trafosu kullanılır`, value: this.getStandardSupplyTransformerName() },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (category === 'giriş trafosu' || name.includes('giriş trafosu')) {
        const selectedPower = Number(this.getColumn(excel, ['Power (kVA)', 'Power Rating (kVA)', 'Power', 'kVA']) || 0);
        const selectedOutput = Number(this.getColumn(excel, ['Output Voltage (V)', 'Output Voltage', 'Secondary Voltage', 'Secondary Voltage (V)', 'Secondary']) || 0);
        const requestedOutput = Number(inputs.outputVoltage || 0);
        const roundedOutput = Number(excel.__roundedOutputVoltage || selectedOutput || requestedOutput);
        const selectedTopology = this.getTransformerTopology(excel, inputs.topology) || this.normalizeTransformerTopology(inputs.topology);
        logic.push(
          { key: 'Topology', formula: `Ana trafolar önce topology havuzuna ayrılır`, value: `${this.normalizeTransformerTopology(inputs.topology) || inputs.topology} -> ${selectedTopology}` },
          { key: 'Trafo Gücü', formula: `(I_çıkış × V_float) / (η × PF) / 1000`, value: `${Number(calculations.transformerPower || 0).toFixed(2)} kVA` },
          { key: 'Çıkış Voltaj Eşleşmesi', formula: `Trafo listesinde çıkış voltajı en yakın değere yuvarlanır`, value: `${requestedOutput.toFixed(2)} V -> ${roundedOutput.toFixed(2)} V` },
          { key: 'Seçim Kriteri', formula: `Yuvarlanan çıkış voltajı + topoloji içinde güç >= hedef`, value: `${selectedPower ? `${selectedPower.toFixed(2)} kVA` : productName}` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('akım okuma kartı') || name.includes('akim okuma karti')) {
        const current = Number(inputs.outputCurrent || 0);
        logic.push(
          { key: 'Çıkış Akımı', formula: `I_çıkış = ${current.toFixed(2)} A`, value: `${current.toFixed(2)} A` },
          { key: 'Kart Aralığı', formula: `Akım aralığına uygun model seçilir`, value: `${productName}` }
        );
      } else if (category === 'kart') {
        logic.push(
          { key: 'Kart Tipi', formula: `Fonksiyon bazlı kart seçimi`, value: `${component.name}` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (
        component.coolingSelectionBreakdown &&
        (category === 'soğutucu' || category === 'fan')
      ) {
        const b = component.coolingSelectionBreakdown;
        const nT = b.thyristorCount;
        const nD = b.dropperDiodes;
        const nTot = b.moduleTotal;
        const extra = b.extraFromModules;
        const iOut = Number(b.outputCurrent) || 0;
        const vIn = Number(b.inputVoltage) || 0;
        logic.push(
          {
            key: 'Topoloji',
            formula: 'B2H / B6C / B12C → faz tristör adedi',
            value: `${b.topology || '-'} → ${nT} tristör`,
          },
          {
            key: 'Modül toplamı (N)',
            formula: 'N = tristör + 1 (serbest geçiş) + dropper modül diyot (revizyonlar08)',
            value: `${nT} + 1 + ${nD} = ${nTot}`,
          },
          {
            key: 'Modül paketi',
            formula: 'N > 4 ise ceil((N − 4) / 4) → her paket +1 soğutucu ve +1 fan',
            value: `+${extra} paket`,
          }
        );
        if (category === 'soğutucu') {
          const highCurrentExtra = iOut > 200 ? 1 : 0;
          logic.push(
            {
              key: 'Taban soğutucu',
              formula: 'max(ceil(n_tristör / 4), 1) + (I_çıkış > 200 A ? 1 : 0)',
              value: `${b.baseHeatsinkCount} adet (I_çıkış = ${iOut.toFixed(2)} A${highCurrentExtra ? `; >200 A için +${highCurrentExtra}` : ''})`,
            },
            {
              key: 'Toplam soğutucu',
              formula: 'taban + modül paketi',
              value: `${b.baseHeatsinkCount} + ${extra} = ${b.heatsinkCount} adet`,
            },
            {
              key: 'AS99 boyu',
              formula: 'I < 70 → 150 mm; I < 150 → 200 mm; I ≥ 150 → 300 mm (katalogda yoksa 250 mm yedek)',
              value: `${b.heatsinkSize}`,
            }
          );
        } else {
          const fanVHint =
            vIn > 0 && vIn <= 150
              ? `V_giriş = ${vIn.toFixed(2)} V → önce 110V/115V/120V fan satırları`
              : `V_giriş = ${vIn.toFixed(2)} V → 230V + 120 mm eşlemesi`;
          logic.push(
            {
              key: 'Taban fan',
              formula: 'Sabit 3 adet (2 kabin + 1 heatsink); çıkış akımına göre ek fan yok',
              value: '3 adet',
            },
            {
              key: 'Toplam fan',
              formula: '3 + modül paketi',
              value: `3 + ${extra} = ${b.fanQuantity} adet`,
            },
            {
              key: 'Fan gerilimi / katalog',
              formula: 'CoolingComponents içinde anahtar kelime eşlemesi',
              value: fanVHint,
            }
          );
        }
        logic.push({
          key: 'Seçilen Ürün',
          formula: 'Soğutma bileşeni tipi + ürün adı eşlemesi',
          value: `${productName}`,
        });
      } else if (name.includes('fan') || name.includes('soğutucu') || name.includes('sogutucu')) {
        const current = Number(inputs.outputCurrent || 0);
        logic.push(
          { key: 'Soğutma Kuralı', formula: `Tristör adedi ve çıkış akımı baz alınır`, value: `${current.toFixed(2)} A çıkış akımı` },
          { key: 'Seçilen Ürün', formula: `Soğutma bileşeni tipi eşleşmesi`, value: `${productName}` }
        );
      } else if (name.includes('kabin')) {
        logic.push(
          { key: 'Kabin Boyutu', formula: `Seçilen mekanik boyut = ${inputs.cabinetSize || '-'}`, value: `${inputs.cabinetSize || '-'}` },
          { key: 'Koruma Sınıfı', formula: `IP ve renk tercihi dikkate alınır`, value: `${inputs.protectionClass || '-'} / ${inputs.cabinetColor || '-'}` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('ölçü aleti') || name.includes('olcu aleti')) {
        logic.push(
          { key: 'Ölçüm Tipi', formula: `Kullanıcı arayüzünde seçilen tip`, value: `${productName}` },
          { key: 'Ölçüm Noktası', formula: `Giriş / Çıkış / Akü noktasına göre filtre`, value: `${component.name}` }
        );
      } else if (category === 'haberleşme' || name.includes('haberleşme') || name.includes('rj45')) {
        logic.push(
          { key: 'Haberleşme Tercihi', formula: `Protokol veya paralel çalışma seçimi`, value: `${inputs.communicationProtocol || inputs.parallelOperation || '-'}` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('röle')) {
        const isLvd = name.includes('lvd');
        const required = isLvd
          ? Number(inputs.outputCurrent || 0) * 1.2
          : Number(inputs.outputCurrent || 0);
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        logic.push(
          { key: 'Gerekli Akım', formula: isLvd ? `I_gerekli = I_çıkış × 1.2` : `I_gerekli = I_çıkış`, value: `${required.toFixed(2)} A` },
          { key: 'Seçim Kriteri', formula: `Röle akımı >= ${required.toFixed(2)} A`, value: `${selected.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (category === 'kesici') {
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        logic.push(
          { key: 'Kesici Tipi', formula: `MCB/MCCB ve kutup sayısı filtrelenir`, value: `${component.specs || '-'}` },
          { key: 'Akım Kapasitesi', formula: `Kesici akımı seçilen değere yuvarlanır`, value: `${selected.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('ntc')) {
        logic.push(
          { key: 'Standart Sensör', formula: `Her projede 1 adet standart eklenir`, value: 'NTC 10K Wired' },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('termostat')) {
        logic.push(
          { key: 'Adet Kuralı', formula: `Termostat adedi = soğutucu adedi`, value: `${component.quantity || 1} adet` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('sigort')) {
        logic.push(
          { key: 'Standart Koruma', formula: `Fan ve besleme koruması için sabit 2 adet`, value: `${component.quantity || 2} adet` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('fuse holder')) {
        logic.push(
          { key: 'Taşıyıcı Adedi', formula: `Sigorta adedi ile aynı`, value: `${component.quantity || 2} adet` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('akü terminali') || name.includes('aku terminali')) {
        const selected = Number(this.getColumn(excel, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0);
        logic.push(
          { key: 'Seçim Kriteri', formula: `Akü terminali, çıkış terminali ile aynı akım kuralını kullanır`, value: `${selected.toFixed(2)} A` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('toprak barası') || name.includes('toprak barasi')) {
        logic.push(
          { key: 'Seçim Kriteri', formula: `Toprak barası için busbar/terminal içinden uygun akım kapasitesi seçilir`, value: `${component.specs || '-'}` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('led panel')) {
        logic.push(
          { key: 'Ön Panel Kuralı', formula: `Front panel seçimi LED içerdiği için eklenir`, value: `${inputs.frontPanel || 'LED panel seçimi'}` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      } else if (name.includes('touch panel')) {
        logic.push(
          { key: 'Ön Panel Kuralı', formula: `Dokunmatik panel seçildiğinde eklenir`, value: `${inputs.frontPanel || 'Touch panel seçimi'}` },
          { key: 'Seçilen Ürün', formula: '', value: `${productName}` }
        );
      }

      if (!logic.length) return null;
      return {
        title: component?.name || 'Parça',
        steps: logic,
      };
    } catch (error) {
      console.warn('selectionLogic üretilemedi:', error);
      return null;
    }
  }

  // Yardımcı fonksiyonlar - Kolon isimlerini normalize etme
  getColumn(row, possibleNames) {
    if (!row || !possibleNames || possibleNames.length === 0) {
      return undefined;
    }

    for (const name of possibleNames) {
      if (
        Object.prototype.hasOwnProperty.call(row, name) &&
        row[name] !== null &&
        row[name] !== undefined
      ) {
        return row[name];
      }
    }

    const norm = (s) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    const targets = new Set(possibleNames.map((n) => norm(n)));
    for (const key of Object.keys(row)) {
      if (targets.has(norm(key))) {
        const v = row[key];
        if (v !== null && v !== undefined) return v;
      }
    }

    return undefined;
  }

  getColumnName(row, possibleNames) {
    // Verilen kolon isimlerinden ilk bulunan kolon adını döndür
    if (!row || !possibleNames || possibleNames.length === 0) {
      return null;
    }
    
    for (const name of possibleNames) {
      if (row.hasOwnProperty(name)) {
        return name;
      }
    }
    
    return null;
  }

  // Yardımcı seçim fonksiyonları
  selectTerminal(current, terminals) {
    if (!terminals || terminals.length === 0) {
      console.warn('Terminal listesi boş veya tanımsız');
      return null;
    }
    
    const sorted = terminals
      .filter((t) => {
        const currentRating = this.getColumn(t, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        return currentRating && t.Cost;
      })
      .sort((a, b) => {
        const aCurrent = this.getColumn(a, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        const bCurrent = this.getColumn(b, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        return aCurrent - bCurrent;
      });
    
    if (sorted.length === 0) {
      console.warn('Uygun terminal bulunamadı (Current Rating veya Cost eksik)');
      return null;
    }
    
    const selected = sorted.find((t) => {
      const tCurrent = this.getColumn(t, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
      return tCurrent >= current;
    }) || sorted[sorted.length - 1];
    
    console.log(`Terminal seçildi: ${selected['Product Name']} - ${this.getColumn(selected, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current'])}A (İstenen: ${current}A)`);
    
    // Normalize edilmiş kolon isimleriyle döndür
    const normalizedSelected = { ...selected };
    normalizedSelected['Current Rating (A)'] = this.getColumn(selected, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
    
    return normalizedSelected;
  }

  // Standart kesici akım değerleri (A) - IEC standartlarına göre
  findNextStandardBreakerCurrent(calculatedCurrent) {
    const STANDARD_BREAKER_CURRENTS = [
      16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000
    ];
    
    // Hesaplanan akımdan büyük veya eşit en yakın standart değeri bul
    const standardCurrent = STANDARD_BREAKER_CURRENTS.find(current => current >= calculatedCurrent);
    
    // Eğer hesaplanan akım tüm standart değerlerden büyükse, en büyük standart değeri döndür
    return standardCurrent || STANDARD_BREAKER_CURRENTS[STANDARD_BREAKER_CURRENTS.length - 1];
  }

  selectBreaker(current, poles, type, breakers) {
    console.log(`=== selectBreaker BAŞLADI ===`);
    console.log(`Parametreler: current=${current}A, poles=${poles}, type=${type}, breakers.length=${breakers?.length || 0}`);
    
    if (!breakers || breakers.length === 0) {
      console.warn('selectBreaker: Circuit Breakers listesi boş');
      this.showNotification('error', 'Kesici Seçimi', 'Excel\'de kesici verisi bulunamadı!');
      return null;
    }
    
    // Yardımcı fonksiyonlar - Değerleri normalize et
    const getCurrentRatingAsNumber = (breaker) => {
      const rating = this.getColumn(breaker, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
      if (rating === null || rating === undefined) return null;
      
      // String olarak gelen değerleri sayıya çevir - "32", "32.0", "32A", "32 A" gibi formatları kabul et
      let ratingStr = String(rating).trim();
      // "A" veya " A" gibi birimleri kaldır
      ratingStr = ratingStr.replace(/[Aa]\s*$/, '').trim();
      const numRating = parseFloat(ratingStr);
      return isNaN(numRating) ? null : numRating;
    };
    
    const getPolesAsNumber = (breaker) => {
      const polesValue = this.getColumn(breaker, ['Poles', 'Pole', 'Pole Count', 'PoleCount']);
      if (polesValue === null || polesValue === undefined) return null;
      
      // String olarak gelen değerleri sayıya çevir - "2", "2.0", "2 poles", "2P" gibi formatları kabul et
      let polesStr = String(polesValue).trim();
      // "poles", "pole", "P" gibi birimleri kaldır
      polesStr = polesStr.replace(/\s*(poles?|P)\s*$/i, '').trim();
      const numPoles = parseInt(polesStr);
      return isNaN(numPoles) ? null : numPoles;
    };
    
    const normalizeType = (typeValue) => {
      if (!typeValue) return null;
      return String(typeValue).trim().toUpperCase();
    };
    
    // Type eşleştirmesini daha esnek yap - kısmi eşleşme de kabul et
    const typeMatches = (breakerType, requestedType) => {
      if (!breakerType || !requestedType) return false;
      const normalizedBreakerType = normalizeType(breakerType);
      const normalizedRequestedType = normalizeType(requestedType);

      // MCCB: MCB ile karışmasın (ör. "MCCB".includes("MCB") true olurdu)
      if (normalizedRequestedType === 'MCCB') {
        if (normalizedBreakerType === 'MCCB') return true;
        return Boolean(
          normalizedBreakerType && /\bMCCB\b/.test(String(breakerType).toUpperCase())
        );
      }

      // Tam eşleşme
      if (normalizedBreakerType === normalizedRequestedType) return true;

      // Kısmi eşleşme - örneğin "MCB" ile "MC" içerenleri kabul et
      if (normalizedRequestedType.length >= 2) {
        if (
          normalizedBreakerType.includes(normalizedRequestedType) ||
          normalizedRequestedType.includes(normalizedBreakerType)
        ) {
          return true;
        }
      }

      return false;
    };
    
    // Parametreleri normalize et
    const normalizedPoles = parseInt(poles);
    const normalizedType = normalizeType(type);
    
    console.log(`selectBreaker: İstenen: ${normalizedPoles} kutuplu, ${normalizedType}, ${current.toFixed(2)}A`);
    console.log(`selectBreaker: Toplam kesici sayısı: ${breakers.length}`);
    
    // Debug: İlk 10 kesicinin tüm özelliklerini detaylı göster
    if (breakers.length > 0) {
      console.log('selectBreaker: İlk 10 kesici örneği (detaylı):');
      breakers.slice(0, 10).forEach((b, idx) => {
        const bPoles = getPolesAsNumber(b);
        const bType = normalizeType(this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']));
        const bCurrent = getCurrentRatingAsNumber(b);
        const bCost = b.Cost || 0;
        const bProductName = b['Product Name'] || 'Bilinmeyen';
        const bStockCode = b['Stock Code'] || '';
        console.log(`  [${idx + 1}] Product Name: "${bProductName}", Poles: ${bPoles}, Type: "${bType}", Current Rating: ${bCurrent}A, Cost: ${bCost}, Stock Code: ${bStockCode}`);
      });
    }
    
    // İYİLEŞTİRİLMİŞ YAKLAŞIM: Esnek eşleştirme ve fallback mekanizması
    // Adım 1: Tam eşleşme (Poles, Type tam eşleşme, Current Rating >= current)
    let filtered = breakers.filter((b) => {
      const breakerPoles = getPolesAsNumber(b);
      const breakerTypeRaw = this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']);
      const breakerType = normalizeType(breakerTypeRaw);
      const currentRating = getCurrentRatingAsNumber(b);
      const costValue = b.Cost ? parseFloat(b.Cost) : 0;
      const hasCost = costValue > 0;
      
      // Cost kontrolü esnetildi - 0 veya null ise uyarı ver ama filtreleme
      if (!hasCost) {
        console.warn(`⚠ Kesici Cost değeri yok veya 0: ${b['Product Name'] || 'Bilinmeyen'} - Cost: ${b.Cost}`);
      }
      
      // Poles ve Type tam eşleşmeli, Current Rating >= current olmalı
      const matches = breakerPoles === normalizedPoles &&
                     breakerType === normalizedType &&
                     currentRating !== null &&
                     currentRating >= current;
      
      if (matches) {
        console.log(`✓ Eşleşen kesici: ${b['Product Name']} - ${breakerPoles} kutuplu, ${breakerType}, ${currentRating}A, Cost: ${costValue}`);
      }
      
      return matches;
    });
    
    console.log(`selectBreaker: Adım 1 (Tam eşleşme) sonucu: ${filtered.length} kesici bulundu`);
    
    // Fallback mekanizması: Eğer tam eşleşme bulunamazsa, kriterleri esnet
    if (filtered.length === 0) {
      console.warn(`selectBreaker: Tam eşleşme bulunamadı, fallback mekanizması devreye giriyor...`);
      
      // Adım 2: Type'ı esnet (örneğin: "MCB" yerine "MC" içerenleri kabul et)
      filtered = breakers.filter((b) => {
        const breakerPoles = getPolesAsNumber(b);
        const breakerTypeRaw = this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']);
        const currentRating = getCurrentRatingAsNumber(b);
        
        // Poles eşleşmeli, Type esnetilmiş eşleşme, Current Rating >= current
        return breakerPoles === normalizedPoles &&
               typeMatches(breakerTypeRaw, normalizedType) &&
               currentRating !== null &&
               currentRating >= current;
      });
      
      console.log(`selectBreaker: Adım 2 (Type esnetilmiş) sonucu: ${filtered.length} kesici bulundu`);
      
      // Adım 3: Poles'i esnet (±1 tolerans)
      if (filtered.length === 0) {
        filtered = breakers.filter((b) => {
          const breakerPoles = getPolesAsNumber(b);
          const breakerTypeRaw = this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']);
          const currentRating = getCurrentRatingAsNumber(b);
          
          // Poles ±1 tolerans, Type esnetilmiş eşleşme, Current Rating >= current
          return breakerPoles !== null &&
                 Math.abs(breakerPoles - normalizedPoles) <= 1 &&
                 typeMatches(breakerTypeRaw, normalizedType) &&
                 currentRating !== null &&
                 currentRating >= current;
        });
        
        console.log(`selectBreaker: Adım 3 (Poles ±1 tolerans) sonucu: ${filtered.length} kesici bulundu`);
      }
      
      // Adım 4: Sadece Current Rating >= current olanları kabul et
      if (filtered.length === 0) {
        filtered = breakers.filter((b) => {
          const breakerTypeRaw = this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']);
          const currentRating = getCurrentRatingAsNumber(b);
          
          // Sadece Type esnetilmiş eşleşme ve Current Rating >= current
          return typeMatches(breakerTypeRaw, normalizedType) &&
                 currentRating !== null &&
                 currentRating >= current;
        });
        
        console.log(`selectBreaker: Adım 4 (Sadece Current Rating) sonucu: ${filtered.length} kesici bulundu`);
      }
      
      // Hala eşleşme bulunamadıysa detaylı bilgi göster
      if (filtered.length === 0) {
        console.warn(`selectBreaker: Fallback mekanizması ile de uygun kesici bulunamadı - İstenen: ${normalizedPoles} kutuplu, ${normalizedType}, ${current.toFixed(2)}A`);
        
        // Tüm kesicilerin özetini göster
        const allBreakers = breakers.map(b => ({
          poles: getPolesAsNumber(b),
          type: normalizeType(this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType'])),
          current: getCurrentRatingAsNumber(b),
          cost: b.Cost || 0,
          productName: b['Product Name'] || 'Bilinmeyen'
        }));
        
        console.log(`selectBreaker: Tüm kesiciler (${allBreakers.length} adet):`, allBreakers);
        
        // Her filtreleme adımında kaç kesici kaldığını göster
        const step1Count = breakers.filter(b => {
          const bp = getPolesAsNumber(b);
          const bt = normalizeType(this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']));
          const cr = getCurrentRatingAsNumber(b);
          return bp === normalizedPoles && bt === normalizedType && cr !== null && cr >= current;
        }).length;
        
        const step2Count = breakers.filter(b => {
          const bp = getPolesAsNumber(b);
          const bt = this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']);
          const cr = getCurrentRatingAsNumber(b);
          return bp === normalizedPoles && typeMatches(bt, normalizedType) && cr !== null && cr >= current;
        }).length;
        
        const step3Count = breakers.filter(b => {
          const bp = getPolesAsNumber(b);
          const bt = this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']);
          const cr = getCurrentRatingAsNumber(b);
          return bp !== null && Math.abs(bp - normalizedPoles) <= 1 && typeMatches(bt, normalizedType) && cr !== null && cr >= current;
        }).length;
        
        const step4Count = breakers.filter(b => {
          const bt = this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']);
          const cr = getCurrentRatingAsNumber(b);
          return typeMatches(bt, normalizedType) && cr !== null && cr >= current;
        }).length;
        
        console.log(`selectBreaker: Filtreleme adımları - Adım 1: ${step1Count}, Adım 2: ${step2Count}, Adım 3: ${step3Count}, Adım 4: ${step4Count}`);
        
        // İstenen kriterlere yakın olanları bul (sadece debug için)
        const similarPoles = breakers.filter(b => getPolesAsNumber(b) === normalizedPoles);
        const similarType = breakers.filter(b => {
          const bt = this.getColumn(b, ['Type', 'Breaker Type', 'BreakerType']);
          return typeMatches(bt, normalizedType);
        });
        console.log(`selectBreaker: Aynı kutup sayısına sahip: ${similarPoles.length}, Aynı tipe sahip (esnetilmiş): ${similarType.length}`);
        
        // Notification'da örnek göster
        const sampleDetails = allBreakers.slice(0, 3).map(b => 
          `${b.poles} kutuplu/${b.type}/${b.current}A`
        ).join(', ');
        this.showNotification('error', 'Kesici Seçimi', 
          `Kesici bulunamadı! İstenen: ${normalizedPoles} kutuplu, ${normalizedType}, ${current.toFixed(2)}A. Excel örnekleri: ${sampleDetails}`);
        
        return null;
      } else {
        console.log(`selectBreaker: Fallback mekanizması ile ${filtered.length} kesici bulundu`);
      }
    }
    
    // En küçük Current Rating'e sahip kesiciyi seç (bir üst değer mantığı)
    filtered.sort((a, b) => {
      const aCurrent = getCurrentRatingAsNumber(a);
      const bCurrent = getCurrentRatingAsNumber(b);
      return aCurrent - bCurrent;
    });
    
    const selected = filtered[0];
    const selectedCurrent = getCurrentRatingAsNumber(selected);
    const selectedPoles = getPolesAsNumber(selected);
    const selectedType = normalizeType(this.getColumn(selected, ['Type', 'Breaker Type', 'BreakerType']));
    
    console.log(`✓ selectBreaker: Kesici seçildi: ${selected['Product Name']} - ${selectedPoles} kutuplu, ${selectedType}, ${selectedCurrent}A`);
    
    // Normalize edilmiş kolon isimleriyle döndür
    const normalizedSelected = { ...selected };
    normalizedSelected.Poles = selectedPoles !== null ? selectedPoles : this.getColumn(selected, ['Poles', 'Pole', 'Pole Count', 'PoleCount']);
    normalizedSelected.Type = selectedType !== null ? selectedType : this.getColumn(selected, ['Type', 'Breaker Type', 'BreakerType']);
    
    const rating = this.getColumn(selected, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
    const currentRatingNum = parseFloat(rating);
    normalizedSelected['Current Rating (A)'] = !isNaN(currentRatingNum) ? currentRatingNum : rating;
    
    console.log(`=== selectBreaker SONUÇ: BAŞARILI ===`);
    console.log(`Seçilen kesici:`, {
      productName: normalizedSelected['Product Name'],
      poles: normalizedSelected.Poles,
      type: normalizedSelected.Type,
      currentRating: normalizedSelected['Current Rating (A)'],
      cost: normalizedSelected.Cost
    });
    
    return normalizedSelected;
  }

  selectCurrentReadingCard(current, cards) {
    if (current < 100) {
      return cards.find((c) => c['Product Name'] === 'L100P');
    } else if (current < 200) {
      return cards.find((c) => c['Product Name'] === 'L200P');
    } else if (current < 300) {
      return cards.find((c) => c['Product Name'] === 'L300P');
    }
    return null; // 300A'den büyük için null döner (kullanıcıya bildirim gösterilir)
  }

  selectFreewheelingDiode(requiredCurrent, diodes) {
    if (!diodes || diodes.length === 0) {
      console.warn('selectFreewheelingDiode: Freewheeling Diodes listesi boş');
      this.showNotification('warning', 'Serbest Geçiş Diyotu', 'Excel\'de diyot verisi bulunamadı');
      return null;
    }
    
    const sorted = diodes
      .filter((d) => {
        const currentRating = this.getColumn(d, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        return currentRating && d.Cost;
      })
      .sort((a, b) => {
        const aCurrent = this.getColumn(a, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        const bCurrent = this.getColumn(b, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        return aCurrent - bCurrent;
      });
    
    if (sorted.length === 0) {
      console.warn(`selectFreewheelingDiode: Uygun diyot bulunamadı - İstenen: ${requiredCurrent}A`);
      this.showNotification('warning', 'Serbest Geçiş Diyotu', `Excel'de uygun diyot bulunamadı (İstenen: ${requiredCurrent}A)`);
      return null;
    }
    
    const selected = sorted.find((d) => {
      const dCurrent = this.getColumn(d, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
      return dCurrent >= requiredCurrent;
    }) || sorted[sorted.length - 1];
    
    // Normalize edilmiş kolon isimleriyle döndür
    const normalizedSelected = { ...selected };
    normalizedSelected['Current Rating (A)'] = this.getColumn(selected, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
    
    return normalizedSelected;
  }

  selectThyristor(requiredCurrent, thyristors) {
    if (!thyristors || thyristors.length === 0) {
      console.warn('selectThyristor: Thyristors listesi boş');
      this.showNotification('warning', 'Faz Kontrol Tristörü', 'Excel\'de tristör verisi bulunamadı');
      return null;
    }

    const req = Number(requiredCurrent);
    if (Number.isFinite(req) && req < 60) {
      const mcc = thyristors.find((t) => {
        const code = String(
          this.getColumn(t, ['Stock Code', 'Stockcode', 'Stok Kodu', 'Stock_Code']) || t['Stock Code'] || ''
        ).toUpperCase();
        const name = String(t['Product Name'] || '').toUpperCase();
        return (
          code.includes('MCC56-12') ||
          code.includes('MCC56_12') ||
          name.includes('MCC56-12') ||
          name.includes('MCC56 12')
        );
      });
      if (mcc) {
        const normalizedSelected = { ...mcc };
        normalizedSelected['Current Rating (A)'] = this.getColumn(mcc, [
          'Current Rating (A)',
          'Current Rating',
          'Current (A)',
          'Rating (A)',
          'Current',
        ]);
        return normalizedSelected;
      }
      console.warn('selectThyristor: <60A için MCC56-12 satırı bulunamadı, akım sıralı seçim kullanılıyor');
    }

    const sorted = thyristors
      .filter((t) => {
        const currentRating = this.getColumn(t, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        return currentRating && t.Cost;
      })
      .sort((a, b) => {
        const aCurrent = this.getColumn(a, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        const bCurrent = this.getColumn(b, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        return aCurrent - bCurrent;
      });
    
    if (sorted.length === 0) {
      console.warn(`selectThyristor: Uygun tristör bulunamadı - İstenen: ${requiredCurrent}A`);
      this.showNotification('warning', 'Faz Kontrol Tristörü', `Excel'de uygun tristör bulunamadı (İstenen: ${requiredCurrent}A)`);
      return null;
    }
    
    const selected = sorted.find((t) => {
      const tCurrent = this.getColumn(t, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
      return tCurrent >= requiredCurrent;
    }) || sorted[sorted.length - 1];
    
    // Normalize edilmiş kolon isimleriyle döndür
    const normalizedSelected = { ...selected };
    normalizedSelected['Current Rating (A)'] = this.getColumn(selected, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
    
    return normalizedSelected;
  }

  selectDCChoke(requiredInductance, current, chokes) {
    const toleranceStepsMh = [0.1, 0.25, 0.5, 1.0, 2.0];
    const requiredCurrent = Number(current || 0);
    if (!chokes || chokes.length === 0) {
      console.warn('selectDCChoke: DC Chokes listesi boş');
      this.showNotification('warning', 'DC Şok Seçimi', 'Excel\'de DC Şok verisi bulunamadı');
      return null;
    }

    if (chokes.length > 0) {
      const firstRow = chokes[0];
      const availableColumns = Object.keys(firstRow);
      console.log('selectDCChoke: Mevcut kolonlar:', availableColumns.join(', '));
    }

    let pickResult = null;
    let usedToleranceMh = toleranceStepsMh[0];
    for (const toleranceMh of toleranceStepsMh) {
      pickResult = this.findBestDCChokeCatalogRow(
        requiredInductance,
        requiredCurrent,
        chokes,
        toleranceMh
      );
      if (pickResult.reason === 'no-current-or-cost') {
        break;
      }
      if (pickResult.row && pickResult.reason === 'ok') {
        usedToleranceMh = toleranceMh;
        if (toleranceMh > 0.1) {
          console.warn(
            `selectDCChoke: Katalog eşlemesi ±${toleranceMh}mH tolerans ile yapıldı (±0.1mH yetersizdi)`
          );
        }
        break;
      }
    }

    const { row: selected, reason, _stats } = pickResult || {
      row: null,
      reason: 'empty',
      _stats: {},
    };

    if (reason === 'no-current-or-cost') {
      console.warn(`selectDCChoke: Uygun DC Şok bulunamadı - İstenen: ${requiredInductance}mH, minimum ${current}A`);
      this.showNotification('warning', 'DC Şok Seçimi', `Excel'de uygun DC Şok bulunamadı (İstenen: ${requiredInductance}mH, minimum ${requiredCurrent.toFixed(1)}A)`);
      return null;
    }
    if (reason === 'no-tolerance' || !selected) {
      const lastTol = toleranceStepsMh[toleranceStepsMh.length - 1];
      console.warn(
        `selectDCChoke: ±${(lastTol * 1000).toFixed(0)}µH…±${lastTol}mH aralığında DC Şok bulunamadı - İstenen: ${requiredInductance}mH, minimum ${current}A`
      );
      this.showNotification(
        'warning',
        'DC Şok Seçimi',
        `DCComponents içinde ${Number(requiredInductance || 0).toFixed(3)}mH hedefine uygun (genişletilmiş toleransla bile) minimum ${requiredCurrent.toFixed(1)}A şok bulunamadı`
      );
      return null;
    }

    const normalizedSelected = { ...selected };
    normalizedSelected['Inductance (mH)'] = this.getColumn(selected, [
      'Inductance (mH)',
      'Inductance',
      'L (mH)',
      'L(mH)',
      'Endüktans (mH)',
      'Endüktans mH',
    ]);
    normalizedSelected['Current Rating (A)'] = this.getColumn(selected, [
      'Current Rating (A)',
      'Current Rating',
      'Current (A)',
      'Rating (A)',
      'Current',
      'Akım (A)',
      'Rated Current (A)',
    ]);
    normalizedSelected.__inductanceDeltaMh = Math.abs(Number(normalizedSelected['Inductance (mH)'] || 0) - Number(requiredInductance || 0));
    normalizedSelected.__targetInductanceMh = Number(requiredInductance || 0);
    normalizedSelected.__catalogToleranceUsedMh = usedToleranceMh;

    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('debugDcChoke') === '1') {
        const iCat = Number(
          this.getColumn(selected, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']) || 0
        );
        console.log('[DC Şok seçim]', {
          L_teknik_mH: Number(requiredInductance || 0),
          I_req_A: requiredCurrent,
          I_katalog_A: iCat,
          ürün: selected['Product Name'],
          aday_I_ve_Cost_sonrasi: _stats?.afterCurrentFilter,
          tolerans_bandındaki_aday: _stats?.inToleranceBand,
        });
      }
    } catch (_) {
      /* localStorage yok veya erişim yok */
    }

    return normalizedSelected;
  }

  selectDCCapacitor(requiredCapacitance, capacitors) {
    // Hesaplanan kapasitans değerine göre seçim yapılır
    // 4700µF veya 10000µF seçeneklerinden hesaplanan değere en yakın olanı seçilir
    if (!capacitors || capacitors.length === 0) {
      console.warn('selectDCCapacitor: DC Capacitors listesi boş');
      this.showNotification('warning', 'DC Kapasitör Seçimi', 'Excel\'de DC Kapasitör verisi bulunamadı');
      return null;
    }
    
    // İlk satırın kolon isimlerini kontrol et
    if (capacitors.length > 0) {
      const firstRow = capacitors[0];
      const availableColumns = Object.keys(firstRow);
      console.log('selectDCCapacitor: Mevcut kolonlar:', availableColumns.join(', '));
    }
    
    // Kolon isimlerini normalize et - hem uF hem µF kontrol et
    const cap4700 = capacitors.find((c) => {
      const cap = this.getDCCapacitanceUf(c);
      return cap === 4700;
    });
    
    const cap10000 = capacitors.find((c) => {
      const cap = this.getDCCapacitanceUf(c);
      return cap === 10000;
    });
    
    if (!cap4700 && !cap10000) {
      console.warn('selectDCCapacitor: 4700µF veya 10000µF kapasitör bulunamadı');
      this.showNotification('warning', 'DC Kapasitör Seçimi', 'Excel\'de 4700µF veya 10000µF kapasitör bulunamadı');
      const firstValid = capacitors.find((row) => this.getDCCapacitanceUf(row) > 0);
      if (!firstValid) return null;
      const normalizedFallback = { ...firstValid };
      normalizedFallback['Capacitance (uF)'] = this.getDCCapacitanceUf(firstValid);
      return normalizedFallback;
    }
    
    // Hesaplanan ünite değerine göre birebir seçim yap; yoksa en yakın olanı seç
    const cap4700Value = cap4700 ? this.getDCCapacitanceUf(cap4700) : Infinity;
    const cap10000Value = cap10000 ? this.getDCCapacitanceUf(cap10000) : Infinity;

    let selected = null;
    if (Math.abs(Number(requiredCapacitance || 0) - 4700) < 0.01 && cap4700) {
      selected = cap4700;
    } else if (Math.abs(Number(requiredCapacitance || 0) - 10000) < 0.01 && cap10000) {
      selected = cap10000;
    } else {
      const diff4700 = Math.abs(cap4700Value - requiredCapacitance);
      const diff10000 = Math.abs(cap10000Value - requiredCapacitance);
      selected = diff4700 <= diff10000 ? cap4700 : cap10000;
    }
    
    // Normalize edilmiş kolon isimleriyle döndür
    if (!selected) return null;
    const normalizedSelected = { ...selected };
    normalizedSelected['Capacitance (uF)'] = this.getDCCapacitanceUf(selected);
    
    return normalizedSelected;
  }

  selectCoolingComponent(componentType, coolingComponents) {
    // Component Type'a göre Heatsink veya Fan seçimi
    if (!coolingComponents || coolingComponents.length === 0) {
      return null;
    }
    const filtered = coolingComponents.filter(
      (c) => c['Component Type'] === componentType && c.Cost
    );
    const selected = filtered.length > 0 ? filtered[0] : null;
    if (!selected) {
    }
    return selected;
  }

  selectRelay(requiredCurrent, relays) {
    // Röle seçimi sadece akıma göre yapılır, gerilim kriteri kullanılmaz
    if (!relays || relays.length === 0) {
      console.warn('selectRelay: Relays listesi boş');
      this.showNotification('warning', 'Röle Seçimi', 'Excel\'de röle verisi bulunamadı');
      return null;
    }
    
    const sorted = relays
      .filter((r) => {
        const currentRating = this.getColumn(r, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        return currentRating && r.Cost;
      })
      .sort((a, b) => {
        const aCurrent = this.getColumn(a, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        const bCurrent = this.getColumn(b, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
        return aCurrent - bCurrent;
      });
    
    if (sorted.length === 0) {
      console.warn(`selectRelay: Uygun röle bulunamadı - İstenen: ${requiredCurrent}A`);
      this.showNotification('warning', 'Röle Seçimi', `Excel'de uygun röle bulunamadı (İstenen: ${requiredCurrent}A)`);
      return null;
    }
    
    const selected = sorted.find((r) => {
      const rCurrent = this.getColumn(r, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
      return rCurrent >= requiredCurrent;
    }) || sorted[sorted.length - 1];
    
    // Normalize edilmiş kolon isimleriyle döndür
    const normalizedSelected = { ...selected };
    normalizedSelected['Current Rating (A)'] = this.getColumn(selected, ['Current Rating (A)', 'Current Rating', 'Current (A)', 'Rating (A)', 'Current']);
    
    return normalizedSelected;
  }

  selectTransformer(power, primaryVoltage, phase, outputVoltage, transformers, topology = '') {
    // Trafo Gücü Seçim Kriteri:
    // Hesaplanan trafo gücüne göre Excel'den uygun trafo seçilir
    // Eğer hesaplanan güce tam uygun bir trafo yoksa, bir üst standart güç değeri seçilir
    // Girişte bir güç bulunduğunda marj eklendiği için, bir üst değer seçimi güvenli bir yaklaşımdır
    if (!transformers || transformers.length === 0) {
      console.warn('selectTransformer: Transformers listesi boş');
      this.showNotification('warning', 'Trafo Seçimi', 'Excel\'de trafo verisi bulunamadı');
      return null;
    }
    
    // İlk satırın kolon isimlerini kontrol et (debug için)
    if (transformers.length > 0) {
      const firstRow = transformers[0];
      const availableColumns = Object.keys(firstRow);
      console.log('selectTransformer: Mevcut kolonlar:', availableColumns.join(', '));
    }
    
    const num = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    const requestedTopology = this.normalizeTransformerTopology(topology) || String(topology || '');
    const requestedOutput = num(outputVoltage);
    const basePool = (Array.isArray(transformers) ? transformers : []).filter((row) => {
      if (this.isSupplyTransformerRow(row)) return false;
      const powerValue = num(this.getTransformerPowerKva(row));
      const rowOutput = num(this.getTransformerOutputVoltage(row));
      return powerValue !== null && rowOutput !== null;
    });
    
    if (basePool.length === 0) {
      console.warn('selectTransformer: Uygun Giriş Trafosu bulunamadı');
      this.showNotification('warning', 'Trafo Seçimi', 'Excel\'de uygun Giriş Trafosu bulunamadı. Kolon isimlerini kontrol edin.');
      return null;
    }

    const topologyPool = requestedTopology
      ? basePool.filter((row) => this.getTransformerTopology(row) === requestedTopology)
      : basePool;
    if (requestedTopology && !topologyPool.length) {
      console.warn(`selectTransformer: ${requestedTopology} topology için uygun trafo bulunamadı`);
      this.showNotification('warning', 'Trafo Seçimi', `${requestedTopology} topology için uygun trafo bulunamadı.`);
      return null;
    }

    const sorted = [...(topologyPool.length ? topologyPool : basePool)].sort(
      (a, b) =>
        num(this.getTransformerPowerKva(a)) -
        num(this.getTransformerPowerKva(b))
    );

    const availableOutputs = Array.from(new Set(
      sorted.map((row) => num(this.getTransformerOutputVoltage(row))).filter((v) => v !== null)
    )).sort((a, b) => a - b);
    const roundedOutputVoltage = this.getNearestAvailableValue(requestedOutput, availableOutputs);

    const withOutputVoltageMatch =
      roundedOutputVoltage === null
        ? sorted
        : sorted.filter((t) => {
            const v = num(this.getTransformerOutputVoltage(t));
            return v !== null && Math.abs(v - roundedOutputVoltage) < 0.01;
          });

    const primaryTolerance = 20;
    const withPrimaryMatch = (withOutputVoltageMatch.length ? withOutputVoltageMatch : sorted).filter((t) => {
      const p = num(this.getColumn(t, ['Primary Voltage', 'Primary Voltage (V)', 'Primary', 'Input Voltage (V)', 'Input Voltage']));
      return p === null || Math.abs(p - Number(primaryVoltage || 0)) <= primaryTolerance;
    });
    const candidatePool = withPrimaryMatch.length
      ? withPrimaryMatch
      : withOutputVoltageMatch.length
        ? withOutputVoltageMatch
        : sorted;

    // Hesaplanan güçten büyük veya eşit en küçük trafo seçilir (bir üst değer)
    const selected = candidatePool.find((t) => {
      const tPower = num(this.getTransformerPowerKva(t));
      return tPower !== null && tPower >= Number(power || 0);
    }) || candidatePool[candidatePool.length - 1];

    // Seçilen trafoyu normalize edilmiş kolon isimleriyle kullan
    const selectedPower = num(this.getTransformerPowerKva(selected));
    const selectedPrimary = num(this.getColumn(selected, ['Primary Voltage', 'Primary Voltage (V)', 'Primary', 'Input Voltage (V)', 'Input Voltage']));
    const selectedOutput = num(this.getTransformerOutputVoltage(selected));
    
    // Seçilen trafoyu normalize edilmiş kolon isimleriyle döndür (geçici olarak ekle)
    const normalizedSelected = { ...selected };
    normalizedSelected['Power (kVA)'] = selectedPower;
    normalizedSelected['Primary Voltage'] = selectedPrimary ?? primaryVoltage;
    normalizedSelected['Secondary Voltage'] = selectedOutput ?? outputVoltage;
    normalizedSelected['Output Voltage (V)'] = selectedOutput ?? outputVoltage;
    normalizedSelected.Topology = this.getTransformerTopology(selected, requestedTopology);
    normalizedSelected.__roundedOutputVoltage = roundedOutputVoltage ?? selectedOutput ?? outputVoltage;
    normalizedSelected['Product Name'] =
      String(selected['Product Name'] || '').trim() ||
      this.buildTransformerLabel(selected, primaryVoltage, outputVoltage, requestedTopology);
    
    return normalizedSelected;
  }

  // UI güncelleme fonksiyonları
  updateCalculationResults(calculations) {
    document.getElementById('transformerPower').textContent =
      calculations.transformerPower.toFixed(2);
    document.getElementById('inputCurrent').textContent =
      calculations.inputCurrent.toFixed(2);
    document.getElementById('floatVoltage').textContent =
      calculations.floatVoltage.toFixed(2);
    document.getElementById('boostVoltage').textContent =
      calculations.boostVoltage.toFixed(2);
    document.getElementById('dcChokeInductance').textContent =
      calculations.dcChokeInductance.toFixed(2);
    document.getElementById('dcCapacitorCount').textContent =
      calculations.dcCapacitorCount;
  }

  updateComponentsTable(components) {
    this.componentsTableBody.innerHTML = '';
    let total = 0;

    components.forEach((comp, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${comp.name}</td>
        <td>${comp.productName}</td>
        <td>${comp.specs}</td>
        <td>${comp.quantity}</td>
        <td>${comp.unitPrice.toFixed(2)}</td>
        <td>${comp.totalPrice.toFixed(2)}</td>
        <td>${comp.stockCode}</td>
      `;
      this.componentsTableBody.appendChild(row);
      total += comp.totalPrice;
    });

    this.totalCostElement.textContent = `${total.toFixed(2)} TL`;
  }

  // Fiyat düzenleme modal
  openPriceEditModal() {
    const form = document.getElementById('priceEditForm');
    form.innerHTML = '';

    this.selectedComponents.forEach((comp, index) => {
      const item = document.createElement('div');
      item.className = 'price-edit-item';
      item.innerHTML = `
        <label>${comp.name}:</label>
        <input type="number" 
               step="0.01" 
               value="${comp.unitPrice.toFixed(2)}" 
               data-index="${index}"
               class="price-input">
      `;
      form.appendChild(item);
    });

    this.priceEditModal.style.display = 'flex';
  }

  savePriceEdits() {
    const inputs = document.querySelectorAll('.price-input');
    inputs.forEach((input) => {
      const index = parseInt(input.dataset.index);
      const newPrice = parseFloat(input.value);
      if (!isNaN(newPrice) && newPrice >= 0) {
        this.selectedComponents[index].unitPrice = newPrice;
        this.selectedComponents[index].totalPrice =
          newPrice * this.selectedComponents[index].quantity;
      }
    });

    this.updateComponentsTable(this.selectedComponents);
    this.priceEditModal.style.display = 'none';
    this.showNotification('success', 'Fiyatlar Güncellendi', 'Fiyatlar başarıyla güncellendi.');
  }

  // Maliyetleri hesapla ve maliyet sayfasını aç
  async calculateCostsAndOpen() {
    // Önce sistemi hesapla
    if (!this.validateInputs()) {
      return;
    }

    this.showLoading(true);

    try {
      // Excel verilerinin yüklenip yüklenmediğini kontrol et
      const hasExcelData = this.excelData && 
        (this.excelData.transformers?.length > 0 || 
         this.excelData.dcChokes?.length > 0 || 
         this.excelData.thyristors?.length > 0);
      
      if (!hasExcelData) {
        console.warn('Excel verileri yüklenmemiş, yükleme başlatılıyor...');
        await this.loadAllExcelData();
      }

      // Girdileri al
      const inputs = this.getInputs();

      // Hesaplamaları yap
      const calculations = this.performCalculations(inputs);

      // Parçaları seç
      const components = await this.selectComponents(inputs, calculations);

      // Components array kontrolü
      if (!Array.isArray(components)) {
        throw new Error('Parça seçimi başarısız: Geçersiz veri formatı');
      }

      if (components.length === 0) {
        this.showNotification('warning', 'Uyarı', 'Hiçbir parça seçilemedi. Excel verilerini kontrol edin.');
        console.warn('⚠️ UYARI: Hiçbir parça seçilemedi!');
        console.warn('Excel verileri:', {
          transformers: this.excelData.transformers?.length || 0,
          dcChokes: this.excelData.dcChokes?.length || 0,
          thyristors: this.excelData.thyristors?.length || 0,
          capacitors: this.excelData.dcCapacitors?.length || 0,
          diodes: this.excelData.freewheelingDiodes?.length || 0,
          breakers: this.excelData.circuitBreakers?.length || 0
        });
        this.showLoading(false);
        return;
      }

      // Sonuçları sakla
      this.calculationResults = calculations;
      this.selectedComponents = components;

      // Proje konfigürasyonunu localStorage'a kaydet (maliyet sayfası için)
      const projectConfig = this.getProjectConfig();
      
      // Debug: localStorage'a kaydetmeden önce kontrol
      console.log('=== LOCALSTORAGE KAYDETME BAŞLADI ===');
      console.log('Parça sayısı:', components.length);
      console.log('Parça isimleri:', components.map(c => c.name).join(', '));
      
      try {
      localStorage.setItem('rectifierProjectConfig', JSON.stringify(projectConfig));
      localStorage.setItem('rectifierCalculatedComponents', JSON.stringify(components));
      localStorage.setItem('rectifierCalculationResults', JSON.stringify(calculations));
      localStorage.setItem('rectifierInputs', JSON.stringify(inputs));
        
        // localStorage'a yazıldığını doğrula
        const verifyComponents = localStorage.getItem('rectifierCalculatedComponents');
        if (!verifyComponents) {
          throw new Error('localStorage kayıt başarısız: Veri yazılamadı');
        }
        
        const parsedVerify = JSON.parse(verifyComponents);
        if (!Array.isArray(parsedVerify) || parsedVerify.length !== components.length) {
          throw new Error(`localStorage doğrulama hatası: Beklenen ${components.length} parça, bulunan ${parsedVerify.length}`);
        }
        
        console.log('✓ localStorage başarıyla kaydedildi ve doğrulandı');
        console.log('Kaydedilen parça sayısı:', parsedVerify.length);
      } catch (storageError) {
        console.error('localStorage kayıt hatası:', storageError);
        throw new Error(`Veri kaydetme hatası: ${storageError.message}`);
      }

      // Maliyet sayfasını aç
      console.log('Sayfa yönlendiriliyor...');
      if (window.app && window.app.navigate) {
        window.app.navigate('rectifier-flex-pricing.html');
      } else {
        window.location.href = 'rectifier-flex-pricing.html';
      }
    } catch (error) {
      console.error('Calculation error:', error);
      console.error('Error stack:', error.stack);
      this.showNotification('error', 'Hesaplama Hatası', error.message || 'Hesaplama sırasında bir hata oluştu.');
    } finally {
      this.showLoading(false);
    }
  }

  // PDF oluştur
  async generatePDF() {
    // Önce sistemi hesapla (eğer hesaplanmamışsa)
    if (!this.calculationResults || !this.selectedComponents.length) {
      if (!this.validateInputs()) {
        return;
      }

      this.showLoading(true);
      try {
        const inputs = this.getInputs();
        const calculations = this.performCalculations(inputs);
        const components = await this.selectComponents(inputs, calculations);
        this.calculationResults = calculations;
        this.selectedComponents = components;
      } catch (error) {
        console.error('Calculation error:', error);
        this.showNotification('error', 'Hesaplama Hatası', error.message || 'Hesaplama sırasında bir hata oluştu.');
        this.showLoading(false);
        return;
      } finally {
        this.showLoading(false);
      }
    }

    // PDF oluştur
    await this.exportToPDF();
  }

  // Hesaplamayı kaydet
  saveCalculation() {
    if (!this.calculationResults || !this.selectedComponents.length) {
      this.showNotification('warning', 'Uyarı', 'Kaydedilecek hesaplama bulunamadı.');
      return;
    }

    const data = {
      inputs: this.getInputs(),
      projectConfig: this.getProjectConfig(), // Tüm proje konfigürasyonu
      calculations: this.calculationResults,
      components: this.selectedComponents,
      timestamp: new Date().toISOString(),
    };

    // LocalStorage'a kaydet
    const savedCalculations =
      JSON.parse(localStorage.getItem('rectifierCalculations') || '[]');
    savedCalculations.push(data);
    localStorage.setItem(
      'rectifierCalculations',
      JSON.stringify(savedCalculations)
    );

    this.showNotification('success', 'Kaydedildi', 'Hesaplama başarıyla kaydedildi.');
  }

  // Teklife (sepete) ekle
  addToQuoteCart() {
    if (!this.calculationResults || !this.selectedComponents.length) {
      this.showNotification(
        'warning',
        'Uyarı',
        'Önce sistemi hesaplayın, ardından teklife ekleyin.'
      );
      return;
    }

    const inputs = this.getInputs();
    const projectConfig = this.getProjectConfig(); // Tüm proje konfigürasyonu

    // Quote sistemi için beklenen item formatına dönüştür
    const items = this.selectedComponents.map((comp) => {
      const unitPrice = Number(comp.unitPrice) || 0;
      const quantity = Number(comp.quantity) || 1;
      const totalPrice = unitPrice * quantity;

      // Rectifier için şimdilik Margin-2 = 1.0 kabul edelim
      const margin2 = 1.0;
      const total2 = totalPrice * margin2;

      return {
        product_name: comp.productName || comp.name,
        unit_price: unitPrice,
        quantity,
        total_price: totalPrice,
        margin2,
        total2,
        // Teklif PDF'inde açıklama alanları için
        mainTitle: comp.name,
        model: comp.productName || comp.name,
        description: comp.specs || '',
        inputVoltage: `${inputs.inputVoltage} V`,
        output: `${inputs.outputVoltage} V / ${inputs.outputCurrent} A`,
        technology: `Rectifier - ${inputs.topology}`,
        features: '',
        dimensions: '',
        includes: '',
      };
    });

    const systemPackage = {
      name: inputs.systemName || 'Rectifier System',
      quantity: 1,
      items,
      productType: 'Rectifier',
      rectifierConfig_json: projectConfig, // Tüm proje konfigürasyonunu ekle
    };

    try {
      window.api.send('add-to-cart', systemPackage);
      if (typeof window.onAddToCartProjectQueueHook === 'function') {
        void window.onAddToCartProjectQueueHook();
      }
      this.showNotification(
        'success',
        'Teklife Eklendi',
        `'${systemPackage.name}' sistemi teklif sepetine eklendi.`
      );
    } catch (error) {
      console.error('Sepete ekleme hatası:', error);
      this.showNotification(
        'error',
        'Hata',
        'Teklif sepetine eklenirken bir hata oluştu.'
      );
    }
  }

  // HTML Export
  async exportToHTML() {
    if (!this.calculationResults || !this.selectedComponents.length) {
      this.showNotification('warning', 'Uyarı', 'Export edilecek veri bulunamadı.');
      return;
    }

    const html = this.generateReportHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rectifier_Rapor_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('success', 'HTML Export', 'HTML raporu başarıyla oluşturuldu.');
  }

  // PDF Export
  async exportToPDF() {
    if (!this.calculationResults || !this.selectedComponents.length) {
      this.showNotification('warning', 'Uyarı', 'Export edilecek veri bulunamadı.');
      return;
    }

    try {
      const html = this.generateReportHTML();
      await window.api.generateRectifierPDF(html);
      this.showNotification('success', 'PDF Export', 'PDF raporu başarıyla oluşturuldu.');
    } catch (error) {
      console.error('PDF export error:', error);
      this.showNotification('error', 'PDF Hatası', 'PDF oluşturulurken hata oluştu.');
    }
  }

  // Excel Export
  exportToExcel() {
    if (!this.selectedComponents.length) {
      this.showNotification('warning', 'Uyarı', 'Export edilecek veri bulunamadı.');
      return;
    }

    // CSV formatında export
    let csv = 'Parça Adı,Ürün Adı,Özellikler,Adet,Birim Fiyat (TL),Toplam Fiyat (TL),Stok Kodu\n';
    this.selectedComponents.forEach((comp) => {
      csv += `"${comp.name}","${comp.productName}","${comp.specs}",${comp.quantity},${comp.unitPrice.toFixed(2)},${comp.totalPrice.toFixed(2)},"${comp.stockCode}"\n`;
    });

    const total = this.selectedComponents.reduce(
      (sum, comp) => sum + comp.totalPrice,
      0
    );
    csv += `\nTOPLAM MALİYET,,,${total.toFixed(2)} TL\n`;

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rectifier_Maliyet_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('success', 'Excel Export', 'CSV dosyası başarıyla oluşturuldu.');
  }

  // Rapor HTML oluştur (Tüm girdileri içeren kapsamlı PDF) - Görsellerdeki yapıya göre
  generateReportHTML() {
    const inputs = this.getInputs();
    const config = this.getProjectConfig();
    const total = this.selectedComponents.reduce(
      (sum, comp) => sum + comp.totalPrice,
      0
    );

    // Tarih formatı (DD.MM.YYYY)
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    // Değer formatı
    const formatValue = (val) => {
      if (val === null || val === undefined || val === '') return '-';
      if (typeof val === 'number') {
        // Sayısal değerleri formatla
        if (val % 1 === 0) return val.toString();
        return val.toFixed(2);
      }
      return val;
    };

    // 5'in katına yuvarlama fonksiyonu (yukarı)
    const roundUpToMultipleOf5 = (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) return 0;
      return Math.ceil(num / 5) * 5;
    };

    // 5'in katına yuvarlama fonksiyonu (en yakın)
    const roundToMultipleOf5 = (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) return 0;
      return Math.round(num / 5) * 5;
    };

    // Şarj gerilim aralığı formatla
    // Min değer: Nominal çıkış gerilimi (yuvarlama yapılmaz, direkt nominal değer)
    // Max değer: Float, equalize ve boost şarj gerilim değerlerinden bulunan en yüksek değerin bir üst 5'in katlarına yuvarlanır
    // Tüm üçü için (Float, Equalize, Boost) aynı min ve max değer kullanılır
    const formatChargeVoltageRangeMinMax = (floatVoltage, equalizationVoltage, boostVoltage, nominalVoltage) => {
      try {
        const float = parseFloat(floatVoltage) || 0;
        const equal = parseFloat(equalizationVoltage) || 0;
        const boost = parseFloat(boostVoltage) || 0;
        const nominal = parseFloat(nominalVoltage) || 0;
        
        if (nominal === 0 || isNaN(nominal)) return { min: '-', max: '-' };
        
        // Min = Nominal çıkış gerilimi (yuvarlama yapılmaz)
        const minValue = nominal;
        
        // Max = Float, equalize ve boost'un en yüksek değerinin bir üst 5'in katına yuvarlanmış hali
        const maxVoltage = Math.max(float, equal, boost);
        let maxValue;
        if (maxVoltage > 0 && !isNaN(maxVoltage)) {
          maxValue = roundUpToMultipleOf5(maxVoltage);
        } else {
          // Eğer float/equalize/boost değerleri yoksa, nominal değerin bir üst 5'in katını kullan
          maxValue = roundUpToMultipleOf5(nominal);
        }
        
        if (isNaN(minValue) || isNaN(maxValue) || maxValue === 0) return { min: '-', max: '-' };
        
        // Tüm üçü için aynı min ve max değer
        return { min: `${minValue}V`, max: `${maxValue}V` };
      } catch (error) {
        console.error('formatChargeVoltageRangeMinMax error:', error);
        return { min: '-', max: '-' };
      }
    };

    // Float, Equalize ve Boost charge voltage için min/max aralık hesaplama fonksiyonu
    // Her biri için minimum genellikle çıkış veya batarya voltajı (parametre ile), 
    // maksimum ise float/equalize/boost arasındaki en yüksek değerin bir üst 5'in katına yuvarlanmış halidir.
    // Tüm değerler V cinsindendir, ve hem min hem max V eklenerek dönülür.
    const formatChargeVoltageRanges = ({floatV, boostV, equalizeV, baseVoltage}) => {
      try {
        // Base: çıkış veya batarya voltajı (girilmesi gerekir)
        const base = parseFloat(baseVoltage) || 0;
        const floatVal = parseFloat(floatV) || 0;
        const boostVal = parseFloat(boostV) || 0;
        const eqVal = parseFloat(equalizeV) || 0;
        if (base === 0) {
          return {
            float: { min: '-', max: '-' },
            boost: { min: '-', max: '-' },
            equalize: { min: '-', max: '-' }
          };
        }

        // Maksimum aralık ortak olarak bul (float/boost/equalize arasındaki en büyük değer)
        const maxSet = [floatVal, boostVal, eqVal].filter(v => v > 0);
        const maxRaw = maxSet.length > 0 ? Math.max(...maxSet) : 0;
        const maxRounded = roundUpToMultipleOf5(maxRaw);

        // Her biri için min: baseVoltage (V)
        const minStr = `${roundToMultipleOf5(base)}V`;
        const maxStr = maxRounded > 0 ? `${maxRounded}V` : '-';

        // Her biri için hem min hem max bu şekilde gösterilecek
        return {
          float: {
            min: minStr,
            max: maxStr
          },
          boost: {
            min: minStr,
            max: maxStr
          },
          equalize: {
            min: minStr,
            max: maxStr
          }
        };

      } catch (error) {
        console.error('formatChargeVoltageRanges error:', error);
        return {
          float: { min: '-', max: '-' },
          boost: { min: '-', max: '-' },
          equalize: { min: '-', max: '-' }
        };
      }
    };


    // DC Yüksek gerilim aralığı formatla - min ve max değerlerini ayrı döndür
    // Range minimumu nominal çıkış gerilimine eşittir (yuvarlama yapılmaz)
    // Range maximumu nominal çıkış geriliminin 1.4 katıdır (5'in katı değilse 5'in katlarına yuvarlanır)
    const formatDCHighRangeMinMax = (nominalVoltage) => {
      try {
        const voltage = parseFloat(nominalVoltage) || 0;
        if (voltage === 0 || isNaN(voltage)) return { min: '-', max: '-' };
        
        // Min = nominal çıkış gerilimi (yuvarlama yapılmaz, direkt nominal değer)
        const min = voltage;
        // Max = nominal çıkış gerilimi * 1.4 (5'in katı değilse 5'in katlarına yuvarlanır)
        const max = roundToMultipleOf5(voltage * 1.4);
        
        if (isNaN(min) || isNaN(max)) return { min: '-', max: '-' };
        
        return { min: `${min}V`, max: `${max}V` };
      } catch (error) {
        console.error('formatDCHighRangeMinMax error:', error);
        return { min: '-', max: '-' };
      }
    };

    // DC Düşük gerilim aralığı formatla - min ve max değerlerini ayrı döndür
    // Range minimumu nominal çıkış geriliminin 1.2'ye bölünmüş halidir (bir üst 5'in katlarına yuvarlanır)
    // Range maximumu nominal çıkış gerilimine eşittir (yuvarlama yapılmaz, direkt nominal değer)
    const formatDCLowRangeMinMax = (nominalVoltage) => {
      try {
        const voltage = parseFloat(nominalVoltage) || 0;
        if (voltage === 0 || isNaN(voltage)) return { min: '-', max: '-' };
        
        // Min = nominal çıkış gerilimi / 1.2 (bir üst 5'in katına yuvarlanır)
        const min = roundUpToMultipleOf5(voltage / 1.2);
        // Max = nominal çıkış gerilimi (yuvarlama yapılmaz, direkt nominal değer)
        const max = voltage;
        
        if (isNaN(min) || isNaN(max)) return { min: '-', max: '-' };
        
        return { min: `${min}V`, max: `${max}V` };
      } catch (error) {
        console.error('formatDCLowRangeMinMax error:', error);
        return { min: '-', max: '-' };
      }
    };

    // Ölçü aletleri listesi
    const measurementInstrumentsHtml = this.measurementInstruments.length > 0
      ? this.measurementInstruments.map(inst => `<li>${inst.type} - ${inst.point}</li>`).join('')
      : '<li>-</li>';

    // Ek alarmlar listesi
    const additionalAlarmsHtml = this.additionalAlarms.length > 0
      ? this.additionalAlarms.map(alarm => `<li>${alarm}</li>`).join('')
      : '<li>-</li>';

    // Ek özellikler listesi
    const extraFeaturesHtml = Array.from(this.selectedFeatures || []).length > 0
      ? Array.from(this.selectedFeatures).map(feature => `<li>${feature}</li>`).join('')
      : '<li>-</li>';

    // Logo için - localStorage'dan logo modunu kontrol et
    let logoHtml = '';
    const logoMode = localStorage.getItem('rectifierLogoMode') || 'Default';
    const customLogoPath = localStorage.getItem('rectifierCustomLogoPath');
    
    if (logoMode === 'OEM') {
      // OEM seçildiğinde logo tamamen kaldırılır - logo container da olmayacak
      logoHtml = '';
    } else if (logoMode === 'Custom' && customLogoPath) {
      // Custom logo varsa placeholder olarak bırak (main.js'te işlenecek)
      logoHtml = '<!-- Custom Logo: ' + customLogoPath + ' -->';
    } else {
      // Varsayılan EPC logosu (Default veya başka bir değer)
      logoHtml = '<!-- Logo buraya eklenecek -->';
    }

    // Dahili akü bilgileri
    const internalBatteryQty = this.batteryInputs.internalBatteryQuantity?.value || '';
    const internalBatteryName = this.batteryInputs.internalBatteryName?.value || '';

    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>TEKLİF ÖN ONAY FORMU - ${formatValue(config.project.quoteRef)}</title>
    <style>
        :root { --surface-light: #f1f5f9; }
        @page {
            size: A4;
            margin: 5mm;
            @bottom-center {
                content: "Sayfa " counter(page) " / " counter(pages);
                font-size: 8pt;
                font-family: Calibri, Arial, sans-serif;
                border-top: 2px solid #000;
                padding-top: 2px;
                margin-top: 3mm;
            }
        }
        @media print {
            .page-break { 
                page-break-before: always; 
            }
            body {
                border: 2px solid #000;
            }
        }
        body {
            font-family: Calibri, Arial, sans-serif;
            margin: 5mm;
            color: #000;
            font-size: 9pt;
            line-height: 1.0;
            border: 2px solid #000;
            padding: 4mm;
            padding-bottom: 12mm; /* Sayfa numarası için alan */
            box-sizing: border-box;
            position: relative;
        }
        .document-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
        }
        .logo-container {
            flex: 0 0 auto;
        }
        .logo-container img {
            height: 45px;
            width: auto;
        }
        .header-text {
            flex: 1;
            text-align: right;
        }
        .header-text h1 {
            font-size: 11pt;
            font-weight: bold;
            margin: 0;
            padding: 0;
            line-height: 1.1;
        }
        .header-text h2 {
            font-size: 10pt;
            font-weight: bold;
            margin: 2px 0 0 0;
            padding: 0;
            line-height: 1.1;
        }
        .header-text .version {
            font-size: 8pt;
            margin-top: 2px;
        }
        .section {
            margin-bottom: 6px;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #f1f5f9;
            padding: 3px 6px;
            font-weight: bold;
            font-size: 9pt;
            border: 1px solid #000;
            margin-bottom: 3px;
            line-height: 1.2;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 2px;
            font-size: 9pt;
            border-spacing: 0;
        }
        table th, table td {
            border: 1px solid #000;
            padding: 0;
            text-align: left;
            height: 12px;
            line-height: 12px;
        }
        table th {
            background-color: #f1f5f9;
            font-weight: bold;
            text-align: center;
            font-size: 9pt;
        }
        table td {
            vertical-align: middle;
            font-size: 9pt;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
        }
        .info-table th {
            background-color: #d0d0d0;
            font-weight: bold;
            padding: 0;
            text-align: center;
            border: 1px solid #000;
            font-size: 9pt;
            height: 12px;
            line-height: 12px;
        }
        .info-table td {
            border: 1px solid #000;
            padding: 0 2px;
            vertical-align: middle;
            font-size: 9pt;
            height: 12px;
            line-height: 12px;
        }
        /* Tüm tablolarda ortak sütun genişlikleri - sayfa başından sonuna kadar hizalı */
        .info-table td.col-turkish,
        .info-table th.col-turkish {
            width: 26%;
        }
        .info-table td.col-english,
        .info-table th.col-english {
            width: 26%;
        }
        .info-table td.col-symbol,
        .info-table th.col-symbol {
            width: 12%;
            text-align: center;
        }
        .info-table td.col-turkish {
            font-weight: bold;
            background-color: #f5f5f5;
        }
        .info-table td.col-english {
            background-color: #f9f9f9;
        }
        .info-table td.col-symbol {
            background-color: #f5f5f5;
        }
        /* Normal tablolar için tek değer sütunu (4 sütunlu tablolar) */
        .info-table:not(.range-table) td.col-value,
        .info-table:not(.range-table) th.col-value {
            width: 36%;
            text-align: center;
        }
        /* Range Information tablosu için Min ve Max sütunları (5 sütunlu tablo) */
        .info-table.range-table td.col-value,
        .info-table.range-table th.col-value {
            width: 18%;
            text-align: center;
        }
        .total-row {
            font-weight: bold;
            background-color: #d0d0d0;
        }
        ul {
            margin: 2px 0;
            padding-left: 15px;
        }
        li {
            margin: 0.5px 0;
            font-size: 9pt;
            line-height: 1.1;
        }
        .notes {
            font-style: italic;
            color: #666;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10pt;
            color: #666;
        }
    </style>
</head>
<body>
    <!-- Document Header with Logo -->
    <div class="document-header">
        ${logoHtml !== '' ? `<div class="logo-container">
            ${logoHtml}
        </div>` : ''}
        <div class="header-text">
            <h1>SD SERİSİ DOĞRULTUCU / SD SERIES RECTIFIER</h1>
            <h2>TEKLİF ÖN ONAY FORMU / QUOTATAION PRE-APPROVAL FORM</h2>
            <div class="version">Application Ver1.0 Rev0</div>
        </div>
    </div>

    <!-- PROJE BİLGİLERİ / PROJECT INFORMATION -->
    <div class="section">
        <div class="section-title">PROJE BİLGİLERİ / PROJECT INFORMATION</div>
        <table class="info-table">
            <tbody>
            <tr>
                <td class="col-turkish">Müşteri</td>
                <td class="col-english">Customer</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.customerName)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Teklif Numarası</td>
                <td class="col-english">Quotation Number</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.quoteRef)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Cihaz Adedi</td>
                <td class="col-english">Device Quantity</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${config.project.deviceCount}</td>
            </tr>
            <tr>
                <td class="col-turkish">Teklif Tarihi</td>
                <td class="col-english">Quotation Date</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatDate(config.project.quoteDate)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Teklif Geçerlilik Tarihi</td>
                <td class="col-english">Quotation Validity Date</td>
                <td class="col-symbol">-</td>
                <td class="col-value">30 Gün / 30 Days</td>
            </tr>
            <tr>
                <td class="col-turkish">Beklenen Teslim Tarihi</td>
                <td class="col-english">Expected Delivery Date</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.deliveryWindow)} hafta/weeks</td>
            </tr>
            <tr>
                <td class="col-turkish">Teslim Yeri</td>
                <td class="col-english">Delivery Destination</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.incoterms)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Marka</td>
                <td class="col-english">Brand</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.brand)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Cihaz Dili</td>
                <td class="col-english">Device Language</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.deviceLanguage)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Teklif Sorumlusu</td>
                <td class="col-english">Quotation Responsible Person</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.preparedBy)}</td>
            </tr>
            </tbody>
        </table>
    </div>

    <!-- CİHAZ PARAMETRELERİ / DEVICE PARAMETERS -->
    <div class="section">
        <div class="section-title">CİHAZ PARAMETRELERİ / DEVICE PARAMETERS</div>
        <table class="info-table">
            <tbody>
            <tr>
                <td class="col-turkish">Nominal Çıkış Gerilimi (DC)</td>
                <td class="col-english">Nominal Output Voltage (DC)</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${formatValue(config.deviceOutput.nominalVoltage)}V</td>
            </tr>
            <tr>
                <td class="col-turkish">Nominal Çıkış Akımı (DC)</td>
                <td class="col-english">Nominal Output Current (DC)</td>
                <td class="col-symbol">A</td>
                <td class="col-value">${formatValue(config.deviceOutput.nominalCurrent)}A</td>
            </tr>
            <tr>
                <td class="col-turkish">Nominal Giriş Gerilimi (AC)</td>
                <td class="col-english">Nominal Input Voltage (AC)</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${formatValue(config.deviceInput.nominalVoltage)}V, Faz-Faz / Ph.-Ph.</td>
            </tr>
            <tr>
                <td class="col-turkish">Giriş Faz Sayısı</td>
                <td class="col-english">Input Phase Count</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.deviceInput.phase)} Faz / ${formatValue(config.deviceInput.phase)} phases</td>
            </tr>
            <tr>
                <td class="col-turkish">Giriş Nötr Bağlantısı</td>
                <td class="col-english">Input Neutral Connection</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.deviceInput.neutral)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Giriş Frekansı</td>
                <td class="col-english">Input Frequency</td>
                <td class="col-symbol">Hz</td>
                <td class="col-value">${formatValue(config.deviceInput.frequency)}Hz</td>
            </tr>
            <tr>
                <td class="col-turkish">Topoloji (Devre Yapısı)</td>
                <td class="col-english">Topology (Circuit Configuration)</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.deviceOutput.topology)}</td>
            </tr>
            <tr>
                <td class="col-turkish">DC Bara Dalgalılığı (Aküsüz)</td>
                <td class="col-english">DC Bus Ripple (without Battery)</td>
                <td class="col-symbol">%</td>
                <td class="col-value">&lt;${formatValue(config.deviceOutput.dcRipple)}%</td>
            </tr>
            <tr>
                <td class="col-turkish">AC Giriş Güç Faktörü (Nominal Yükte)</td>
                <td class="col-english">AC Input Power Factor (@Nominal Load)</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${config.deviceInput.powerFactor}</td>
            </tr>
            <tr>
                <td class="col-turkish">AC Giriş Akım THD (Nominal Yükte)</td>
                <td class="col-english">AC Input Current THD (@Nominal Load)</td>
                <td class="col-symbol">%</td>
                <td class="col-value">&lt;${config.deviceInput.currentTHD}%</td>
            </tr>
            </tbody>
        </table>
    </div>

    <!-- KABİN / CABINET -->
    <div class="section">
        <div class="section-title">KABİN / CABINET</div>
        <table class="info-table">
            <tbody>
            <tr>
                <td class="col-turkish">Kutu Tipi</td>
                <td class="col-english">Cabinet Type</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.mechanical.cabinetType)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Kablo Girişi</td>
                <td class="col-english">Cable Entry</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.mechanical.cableEntry)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Koruma Sınıfı</td>
                <td class="col-english">Protection Class</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.mechanical.protectionClass)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Kutu Rengi</td>
                <td class="col-english">Cabinet Color</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.mechanical.cabinetColor)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Sac Tipi</td>
                <td class="col-english">Cabinet Material</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.mechanical.sheetType)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Soğutma</td>
                <td class="col-english">Cooling</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.mechanical.cooling)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Hava akış yönü</td>
                <td class="col-english">Air Flow Direction</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.mechanical.airflowDirection)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Çalışma Sıcaklığı</td>
                <td class="col-english">Operation Temperature</td>
                <td class="col-symbol">°C</td>
                <td class="col-value">${formatValue(config.mechanical.operatingTemperature)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Kutu Boyutları (G x D x Y)</td>
                <td class="col-english">Cabinet Dimensions (W x D x H)</td>
                <td class="col-symbol">mm</td>
                <td class="col-value">
                    ${config.mechanical.cabinetSize && config.mechanical.cabinetSize !== 'Özel Boyutlar' 
                      ? formatValue(config.mechanical.cabinetSize)
                      : config.mechanical.customCabinetWidth > 0
                        ? `${config.mechanical.customCabinetWidth} x ${config.mechanical.customCabinetDepth} x ${config.mechanical.customCabinetHeight}`
                        : '-'}
                </td>
            </tr>
            </tbody>
        </table>
    </div>

    <!-- DİL VE PROTOKOL / LANGUAGE AND PROTOCOL -->
    <div class="section">
        <div class="section-title">DİL VE PROTOKOL / LANGUAGE AND PROTOCOL</div>
        <table class="info-table">
            <tbody>
            <tr>
                <td class="col-turkish">Marka</td>
                <td class="col-english">Brand</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.brand) || 'EPC'}</td>
            </tr>
            <tr>
                <td class="col-turkish">Dil</td>
                <td class="col-english">Language</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.project.deviceLanguage)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Gösterge</td>
                <td class="col-english">Display</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.userInterface.frontPanel)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Haberleşme Protokolü</td>
                <td class="col-english">Communication Protocol</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.communication.protocol)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Röle Kuru Kontak Çıkışları</td>
                <td class="col-english">Relay Dry Contact Outputs</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.communication.relayAlarmOutputs)}</td>
            </tr>

            </tbody>
        </table>
    </div>

    <!-- AKÜ BİLGİLERİ / BATTERY INFORMATION -->
    <div class="section">
        <div class="section-title">AKÜ BİLGİLERİ / BATTERY INFORMATION</div>
        <table class="info-table">
            <tbody>
            <tr>
                <td class="col-turkish">Akü Tipi</td>
                <td class="col-english">Battery Type</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.battery.type)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Kutu içinde Dahili Akü</td>
                <td class="col-english">Internal Battery in Box</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.battery.inCabinet)}${config.battery.inCabinet === 'Var / Yes' && internalBatteryQty ? ` (${internalBatteryQty} adet - ${internalBatteryName})` : ''}</td>
            </tr>
            <tr>
                <td class="col-turkish">Toplam Hücre Sayısı</td>
                <td class="col-english">Total Cell Count</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.battery.cellCount)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Hücre Başı NominalGerilim</td>
                <td class="col-english">Nominal Voltage per Cell</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${formatValue(config.battery.voltagePerCell)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Hücre Başı Yüzdürme Gerilimi Şarj</td>
                <td class="col-english">Float Voltage Charge per Cell</td>
                <td class="col-symbol">V/Hücre</td>
                <td class="col-value">${formatValue(config.battery.floatVoltagePerCell)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Hücre Başı Dengeleme Gerilimi Şarj</td>
                <td class="col-english">Equalization Voltage Charge per Cell</td>
                <td class="col-symbol">V/Hücre</td>
                <td class="col-value">${formatValue(config.battery.equalizationVoltagePerCell)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Hücre Başı Kalkınma Şarj Gerilimi</td>
                <td class="col-english">Boost Voltage Charge per Cell</td>
                <td class="col-symbol">V/Hücre</td>
                <td class="col-value">${formatValue(config.battery.boostVoltagePerCell)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Cihaz Yüzdürme Gerilimi</td>
                <td class="col-english">Device Float Voltage</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${(() => {
                  // Form'daki input değerlerini kullan (kullanıcının girdiği ve form'da gösterilen değerler)
                  const floatV = parseFloat(config.battery.floatVoltage) || 0;
                  if (floatV > 0) return floatV.toFixed(1);
                  // Fallback: calculationResults'tan al
                  return (this.calculationResults && typeof this.calculationResults.floatVoltage === 'number') ? this.calculationResults.floatVoltage.toFixed(1) : formatValue(config.battery.floatVoltage);
                })()}</td>
            </tr>
            <tr>
                <td class="col-turkish">Cihaz Dengeleme Gerilimi</td>
                <td class="col-english">Device Equalization Voltage</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${(() => {
                  // Form'daki input değerlerini kullan (kullanıcının girdiği ve form'da gösterilen değerler)
                  const equalV = parseFloat(config.battery.equalizationVoltage) || 0;
                  if (equalV > 0) return equalV.toFixed(1);
                  // Fallback: calculationResults'tan al
                  return (this.calculationResults && typeof this.calculationResults.equalizationVoltage === 'number') ? this.calculationResults.equalizationVoltage.toFixed(1) : formatValue(config.battery.equalizationVoltage);
                })()}</td>
            </tr>
            <tr>
                <td class="col-turkish">Cihaz Kalkınma Şarj Gerilimi</td>
                <td class="col-english">Device Boost Voltage</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${(() => {
                  // Form'daki input değerlerini kullan (kullanıcının girdiği ve form'da gösterilen değerler)
                  const boostV = parseFloat(config.battery.boostVoltage) || 0;
                  if (boostV > 0) return boostV.toFixed(1);
                  // Fallback: calculationResults'tan al
                  return (this.calculationResults && typeof this.calculationResults.boostVoltage === 'number') ? this.calculationResults.boostVoltage.toFixed(1) : formatValue(config.battery.boostVoltage);
                })()}</td>
            </tr>
            <tr>
                <td class="col-turkish">Ek Notlar</td>
                <td class="col-english">Additional Notes</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.battery.notes)}</td>
            </tr>
            </tbody>
        </table>
    </div>                  
    <!-- MENZİL BİLGİSİ / RANGE INFORMATION -->
    <div class="section">
        <div class="section-title">MENZİL BİLGİSİ / RANGE INFORMATION</div>
        <table class="info-table range-table">
            <tbody>
            ${(() => {
              // Nominal çıkış gerilimi (tüm range'ler için gerekli)
              const nominalV = (config && config.deviceOutput && config.deviceOutput.nominalVoltage) ? parseFloat(config.deviceOutput.nominalVoltage) : 0;
              
              // Cihaz gerilimleri (şarj gerilimleri) - Form input'larından al (kullanıcının girdiği değerler)
              const floatV = (config && config.battery && config.battery.floatVoltage) ? parseFloat(config.battery.floatVoltage) : ((this.calculationResults && typeof this.calculationResults.floatVoltage === 'number') ? this.calculationResults.floatVoltage : 0);
              const equalV = (config && config.battery && config.battery.equalizationVoltage) ? parseFloat(config.battery.equalizationVoltage) : ((this.calculationResults && typeof this.calculationResults.equalizationVoltage === 'number') ? this.calculationResults.equalizationVoltage : 0);
              const boostV = (config && config.battery && config.battery.boostVoltage) ? parseFloat(config.battery.boostVoltage) : ((this.calculationResults && typeof this.calculationResults.boostVoltage === 'number') ? this.calculationResults.boostVoltage : 0);
              
              // Şarj gerilim range'i: 
              // Min = Nominal çıkış gerilimi (yuvarlama yapılmaz)
              // Max = Float, equalize ve boost'un en yüksek değerinin bir üst 5'in katına yuvarlanmış hali
              // Tüm üçü için (Float, Equalize, Boost) aynı range değeri kullanılır
              const chargeRange = formatChargeVoltageRangeMinMax(floatV, equalV, boostV, nominalV);
              const dcHighRange = formatDCHighRangeMinMax(nominalV);
              const dcLowRange = formatDCLowRangeMinMax(nominalV);
              
              return `
            <tr>
                <td class="col-turkish">Yüzdürme Gerilim Aralığı</td>
                <td class="col-english">Float Voltage Range</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${chargeRange.min}</td>
                <td class="col-value">${chargeRange.max}</td>
            </tr>
            <tr>
                <td class="col-turkish">Dengeleme Gerilim Aralığı</td>
                <td class="col-english">Equalize Voltage Range</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${chargeRange.min}</td>
                <td class="col-value">${chargeRange.max}</td>
            </tr>
            <tr>
                <td class="col-turkish">Hızlı Şarj Gerilim Aralığı</td>
                <td class="col-english">Boost Voltage Range</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${chargeRange.min}</td>
                <td class="col-value">${chargeRange.max}</td>
            </tr>
            <tr>
                <td class="col-turkish">DC Yüksek Uyarısı Gerilim Aralığı</td>
                <td class="col-english">DC High Alarm Range</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${dcHighRange.min}</td>
                <td class="col-value">${dcHighRange.max}</td>
            </tr>
            <tr>
                <td class="col-turkish">DC Düşük Uyarı Gerilim Aralığı</td>
                <td class="col-english">DC Low Alarm Range</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${dcLowRange.min}</td>
                <td class="col-value">${dcLowRange.max}</td>
            </tr>
              `;
            })()}
            </tbody>
        </table>
    </div>

    <!-- CİHAZ ÖZELLİKLERİ / DEVICE FEATURES -->
    <div class="section">
        <div class="section-title">CİHAZ ÖZELLİKLERİ / DEVICE FEATURES</div>
        <table class="info-table">
            <tbody>
            <tr>
                <td class="col-turkish">Giriş (AC) Kesicisi ve Değeri</td>
                <td class="col-english">Input (AC) Breaker & Value</td>
                <td class="col-symbol">A</td>
                <td class="col-value">${(() => {
                    const breaker = this.selectedComponents.find(c => c.name === 'Giriş Kesicisi');
                    if (!breaker) return '-';
                    const specs = breaker.specs || '';
                    // MCB/MCCB kısmını kaldır, sadece fazxAkım göster (örn: "3x32A MCB" -> "3x32A")
                    return specs.replace(/\s*(MCB|MCCB)\s*/gi, '').trim() || breaker.productName || '-';
                })()}</td>
            </tr>
            <tr>
                <td class="col-turkish">Çıkış (Akü) Kesicisi ve Değeri</td>
                <td class="col-english">Output (Battery) Breaker & Value</td>
                <td class="col-symbol">A</td>
                <td class="col-value">${(() => {
                    const breaker = this.selectedComponents.find(c => c.name === 'Çıkış Kesicisi');
                    if (!breaker) return '-';
                    const specs = breaker.specs || '';
                    // MCB/MCCB kısmını kaldır, sadece fazxAkım göster (örn: "3x32A MCB" -> "3x32A")
                    return specs.replace(/\s*(MCB|MCCB)\s*/gi, '').trim() || breaker.productName || '-';
                })()}</td>
            </tr>
            <tr>
                <td class="col-turkish">Paralel Çalışma</td>
                <td class="col-english">Parallel Operation</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.communication.parallelOperation)}</td>
            </tr>
            <tr>
                <td class="col-turkish">DC Besleme</td>
                <td class="col-english">DC Powering</td>
                <td class="col-symbol">-</td>
                <td class="col-value">Var / Yes</td>
            </tr>
            <tr>
                <td class="col-turkish">Akü LVD</td>
                <td class="col-english">Battery LVD</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.deviceOutput.batteryLVD)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Diyot Dropper</td>
                <td class="col-english">Diode Dropper</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.deviceOutput.diodeDropper)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Dropper düşürülecek gerilim</td>
                <td class="col-english">Dropper voltage drop (V)</td>
                <td class="col-symbol">V</td>
                <td class="col-value">${config.deviceOutput.dropperVoltageDropV != null ? formatValue(config.deviceOutput.dropperVoltageDropV) : '— (otomatik)'}</td>
            </tr>
            <tr>
                <td class="col-turkish">Ek Yük Çıkışı</td>
                <td class="col-english">Seperate Load Output</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.deviceOutput.extraLoadOutput)}</td>
            </tr>
            <tr>
                <td class="col-turkish">Dahili DC Yük Dağıtımı</td>
                <td class="col-english">Internal DC Load Distribution</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${formatValue(config.deviceOutput.internalDistribution)}${config.deviceOutput.internalDistributions && config.deviceOutput.internalDistributions.length > 0 ? ' (' + config.deviceOutput.internalDistributions.map(d => `${d.quantity} adet, ${d.breakerPoleCurrent}`).join('; ') + ')' : ''}</td>
            </tr>
            <tr>
                <td class="col-turkish">Kutu içinde Dahili Akü</td>
                <td class="col-english">Internal Batteries</td>
                <td class="col-symbol">-</td>
                <td class="col-value">${config.battery.inCabinet === 'Var / Yes' && internalBatteryQty ? `${internalBatteryQty} adet - ${internalBatteryName}` : formatValue(config.battery.inCabinet)}</td>
            </tr>
            </tbody>
        </table>
    </div>

    <!-- ALARM LİSTESİ / ALARM LIST -->
    <div class="section">
        <div class="section-title">ALARM LİSTESİ / ALARM LIST</div>
        <table class="info-table">
            <thead>
                <tr>
                    <th colspan="4" style="text-align: left; background-color: var(--surface-light);">Alarm & Koruma / Alarm & Protection</th>
                </tr>
            </thead>
            <tbody>
            <tr>
                <td class="col-turkish" colspan="2" style="width: 50%;">Standart Alarmlar / Standard Alarms</td>
                <td class="col-symbol" colspan="2" style="width: 50%;">
                    <ul style="margin: 0; padding-left: 20px;">
                        ${config.alarms.standardAlarms.map(alarm => `<li>${alarm}</li>`).join('')}
                    </ul>
                </td>
            </tr>
            <tr>
                <td class="col-turkish" colspan="2">Ek Alarmlar / Additional Alarms</td>
                <td class="col-symbol" colspan="2">
                    <ul style="margin: 0; padding-left: 20px;">
                        ${additionalAlarmsHtml}
                    </ul>
                </td>
            </tr>
            </tbody>
        </table>
    </div>

    <!-- EK ÖZELLİKLER / ADDITIONAL FEATURES -->
    <div class="section">
        <div class="section-title">EK ÖZELLİKLER / ADDITIONAL FEATURES</div>
        <table class="info-table">
            <thead>
                <tr>
                    <th colspan="4" style="text-align: left; background-color: var(--surface-light);">Ek Özellikler / Additional Features</th>
                </tr>
            </thead>
            <tbody>
            <tr>
                <td class="col-turkish" colspan="4">
                    <ul style="margin: 0; padding-left: 20px;">
                        ${extraFeaturesHtml}
                    </ul>
                </td>
            </tr>
            </tbody>
        </table>
    </div>
</body>
</html>
    `;
  }

  // Logo ayarları modal
  async openLogoSettings() {
    // Modal oluştur
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    const root = document.documentElement;
    const cardBg = getComputedStyle(root).getPropertyValue('--card-bg').trim() || '#ffffff';
    const textPrimary = getComputedStyle(root).getPropertyValue('--text-primary').trim() || '#0f172a';
    const surfaceLight = getComputedStyle(root).getPropertyValue('--surface-light').trim() || '#f1f5f9';
    const textSecondary = getComputedStyle(root).getPropertyValue('--text-secondary').trim() || '#64748b';
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#2563eb';
    modalContent.style.cssText = `
      background: ${cardBg};
      padding: 24px;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      color: ${textPrimary};
    `;
    
    // Mevcut logo modunu kontrol et
    const currentLogoMode = localStorage.getItem('rectifierLogoMode') || 'Default';
    
    modalContent.innerHTML = `
      <h2 style="margin-top: 0; color: ${accent};">Logo Ayarları</h2>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="logoDefaultBtn" style="padding: 12px; background: ${currentLogoMode === 'Default' ? accent : surfaceLight}; border: none; border-radius: 4px; color: ${currentLogoMode === 'Default' ? 'white' : textPrimary}; cursor: pointer; font-size: 14px;">
          Varsayılan EPC Logosu
        </button>
        <button id="logoOEMBtn" style="padding: 12px; background: ${currentLogoMode === 'OEM' ? accent : surfaceLight}; border: none; border-radius: 4px; color: ${currentLogoMode === 'OEM' ? 'white' : textPrimary}; cursor: pointer; font-size: 14px;">
          OEM (Logo Kaldır)
        </button>
        <button id="logoAddBtn" style="padding: 12px; background: ${currentLogoMode === 'Custom' ? accent : surfaceLight}; border: none; border-radius: 4px; color: ${currentLogoMode === 'Custom' ? 'white' : textPrimary}; cursor: pointer; font-size: 14px;">
          Logo Ekle (Dosya Seç)
        </button>
        <button id="logoCancelBtn" style="padding: 12px; background: ${textSecondary}; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 14px;">
          İptal
        </button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Event listener'lar
    // Varsayılan EPC logosu butonu
    document.getElementById('logoDefaultBtn').addEventListener('click', async () => {
      localStorage.removeItem('rectifierCustomLogoPath');
      localStorage.setItem('rectifierLogoMode', 'Default');
      this.showNotification('success', 'Logo Ayarları', 'Varsayılan EPC logosu kullanılacak.');
      modal.remove();
    });
    
    // OEM butonu (logo kaldır)
    document.getElementById('logoOEMBtn').addEventListener('click', async () => {
      localStorage.removeItem('rectifierCustomLogoPath');
      localStorage.setItem('rectifierLogoMode', 'OEM');
      this.showNotification('success', 'Logo Ayarları', 'Logo PDF\'ten kaldırılacak.');
      modal.remove();
    });
    
    document.getElementById('logoAddBtn').addEventListener('click', async () => {
      try {
        // window.api kontrolü
        if (!window.api) {
          console.error('window.api mevcut değil');
          this.showNotification('error', 'Hata', 'Sistem API\'sine erişilemiyor. Lütfen sayfayı yenileyin.');
          return;
        }

        if (!window.api.showOpenDialog) {
          console.error('window.api.showOpenDialog mevcut değil');
          this.showNotification('error', 'Hata', 'Dosya seçme özelliği mevcut değil. Lütfen uygulamayı yeniden başlatın.');
          return;
        }

        console.log('Logo dosyası seçme dialog\'u açılıyor...');
        
        const result = await window.api.showOpenDialog({
          title: 'Logo Dosyası Seç',
          filters: [
            { name: 'Görsel Dosyaları', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] },
            { name: 'Tüm Dosyalar', extensions: ['*'] },
          ],
          properties: ['openFile'],
        });
        
        console.log('Dialog result:', result);
        
        // Sonuç kontrolü - Electron'un döndürdüğü format
        if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
          const logoPath = result.filePaths[0];
          console.log('Seçilen logo yolu:', logoPath);
          
          localStorage.setItem('rectifierCustomLogoPath', logoPath);
          localStorage.setItem('rectifierLogoMode', 'Custom');
          this.showNotification('success', 'Logo Ayarları', 'Logo dosyası seçildi. PDF oluşturulduğunda kullanılacak.');
          modal.remove();
        } else if (result && result.canceled) {
          // Kullanıcı iptal etti
          console.log('Logo seçimi iptal edildi');
          // Modal açık kalır, kullanıcı başka seçenek seçebilir
        } else {
          console.warn('Beklenmeyen dialog sonucu:', result);
          this.showNotification('error', 'Hata', 'Logo seçilirken beklenmeyen bir sonuç alındı. Lütfen tekrar deneyin.');
        }
      } catch (error) {
        console.error('Logo seçme hatası:', error);
        this.showNotification('error', 'Hata', 'Logo seçilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
        // Hata durumunda modal açık kalır, kullanıcı tekrar deneyebilir
      }
    });
    
    document.getElementById('logoCancelBtn').addEventListener('click', () => {
      modal.remove();
    });
    
    // Modal dışına tıklanınca kapat
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Yardımcı fonksiyonlar
  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  showNotification(type, title, message) {
    // Basit alert sistemi (ileride daha gelişmiş bir notification sistemi eklenebilir)
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 15px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 3000;
      max-width: 400px;
    `;
    notification.innerHTML = `
      <strong>${title}</strong><br>
      ${message}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
  window.rectifierPricing = new RectifierPricing();
});
