class DatabaseService {
  constructor() {
    this.dbName = 'pricingProDB';
    this.dbVersion = 4;
    this.db = null;
    this.currentUser = {
      username: 'test_user',
      fullName: 'Test User',
    };
    this.quotes = [];
    this.defaultUsers = [
      {
        username: 'ahmet',
        password: '1234',
        fullName: 'Ahmet Yılmaz',
        department: 'Satış',
      },
      {
        username: 'mehmet',
        password: '1234',
        fullName: 'Mehmet Kaya',
        department: 'Satış',
      },
    ];
    this.apiUrl = 'http://localhost:3110/api';
    this.quotesKey = 'quotes';
    console.log('DatabaseService başlatıldı'); // Debug için
    this.initDatabase(); // Database'i başlat
  }

  async initDatabase() {
    return new Promise((resolve, reject) => {
      try {
        // Önce mevcut bağlantıyı kapatalım (eğer varsa)
        if (this.db) {
          this.db.close();
          this.db = null;
        }

        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = (event) => {
          console.error('Database error:', event.target.error);

          // Versiyon hatasını kontrol edelim
          if (event.target.error.name === 'VersionError') {
            console.warn(
              'Veritabanı versiyon hatası tespit edildi, veritabanı sıfırlanacak...'
            );
            this.resetDatabase()
              .then(() => {
                // Veritabanını sıfırladıktan sonra tekrar deneyelim
                this.initDatabase().then(resolve).catch(reject);
              })
              .catch((error) => {
                console.error('Veritabanı sıfırlama hatası:', error);
                reject(error);
              });
            return;
          }

          reject(event.target.error);
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          console.log(
            'Database opened successfully, version:',
            this.db.version
          );
          this.initializeDefaultData();

          // Eğer kullanıcı giriş yapmışsa verileri senkronize et
          const currentUser = this.getCurrentUser();
          if (currentUser) {
            console.log(
              'Kullanıcı giriş yapmış, verileri senkronize ediliyor...'
            );
            this.syncDataAfterLogin()
              .then(() => {
                resolve(this.db);
              })
              .catch((error) => {
                console.error('Veri senkronizasyonu hatası:', error);
                resolve(this.db); // Hataya rağmen işleme devam et
              });
          } else {
            resolve(this.db);
          }
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          console.log('Creating/upgrading database to version:', db.version);

          try {
            // Customers store
            if (!db.objectStoreNames.contains('customers')) {
              const customersStore = db.createObjectStore('customers', {
                keyPath: 'id',
                autoIncrement: true,
              });
              customersStore.createIndex('company_name', 'company_name');
              customersStore.createIndex('category', 'category');
              customersStore.createIndex('status', 'status');
              customersStore.createIndex('created_at', 'created_at');
            }

            // Quotes store
            if (!db.objectStoreNames.contains('quotes')) {
              const quotesStore = db.createObjectStore('quotes', {
                keyPath: 'id',
                autoIncrement: true,
              });
              quotesStore.createIndex('customer_id', 'customer_id');
              quotesStore.createIndex('created_at', 'created_at');
            }

            // Customer Meetings store
            if (!db.objectStoreNames.contains('customer_meetings')) {
              const meetingsStore = db.createObjectStore('customer_meetings', {
                keyPath: 'id',
                autoIncrement: true,
              });
              meetingsStore.createIndex('customer_id', 'customer_id');
              meetingsStore.createIndex('meeting_date', 'meeting_date');
              meetingsStore.createIndex('created_by', 'created_by');
            }

            // Customer Notes store
            if (!db.objectStoreNames.contains('customer_notes')) {
              const notesStore = db.createObjectStore('customer_notes', {
                keyPath: 'id',
                autoIncrement: true,
              });
              notesStore.createIndex('customer_id', 'customer_id');
              notesStore.createIndex('user_id', 'user_id');
              notesStore.createIndex('created_at', 'created_at');
            }

            // Users store
            if (!db.objectStoreNames.contains('users')) {
              const usersStore = db.createObjectStore('users', {
                keyPath: 'id',
                autoIncrement: true,
              });
              usersStore.createIndex('username', 'username', { unique: true });
              usersStore.createIndex('created_at', 'created_at');
            }

            // Actual Costs store
            if (!db.objectStoreNames.contains('actual_costs')) {
              const actualCostsStore = db.createObjectStore('actual_costs', {
                keyPath: 'id',
                autoIncrement: true,
              });
              actualCostsStore.createIndex('quote_id', 'quote_id', {
                unique: true,
              });
              actualCostsStore.createIndex('created_at', 'created_at');
              actualCostsStore.createIndex('updated_at', 'updated_at');
            }
          } catch (error) {
            console.error('Error during database upgrade:', error);
          }
        };
      } catch (error) {
        console.error('Error initializing database:', error);
        reject(error);
      }
    });
  }

  async initializeDefaultData() {
    // Varsayılan kullanıcıları ekle
    await this.initializeDefaultUsers();

    // Veritabanı şemasını kontrol et
    await this.checkAndMigrateSchema();

    // Varsayılan müşteri verilerini ekle
    try {
      const tx = this.db.transaction('customers', 'readonly');
      const store = tx.objectStore('customers');
      const count = await new Promise((resolve) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
      });

      if (count === 0) {
        await this.addDefaultCustomers();
      }
    } catch (error) {
      console.error('Default müşteri verisi eklenirken hata:', error);
    }
  }

  async checkAndMigrateSchema() {
    // Gerekli store'ları kontrol et
    const requiredStores = [
      'customers',
      'quotes',
      'customer_meetings',
      'customer_notes',
      'users',
      'actual_costs',
    ];
    let needsMigration = false;

    for (const store of requiredStores) {
      if (!this.db.objectStoreNames.contains(store)) {
        console.warn(
          `${store} store bulunamadı, veritabanı yükseltme gerekiyor`
        );
        needsMigration = true;
        break;
      }
    }

    if (needsMigration) {
      console.log('Veritabanı şeması güncellenecek...');
      // Mevcut bağlantıyı kapat
      this.db.close();

      // Versiyon yükselt ve yeniden aç
      const newVersion = this.db.version + 1;
      const request = indexedDB.open(this.dbName, newVersion);

      return new Promise((resolve, reject) => {
        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Customer Meetings store oluştur (yoksa)
          if (!db.objectStoreNames.contains('customer_meetings')) {
            const meetingsStore = db.createObjectStore('customer_meetings', {
              keyPath: 'id',
              autoIncrement: true,
            });
            meetingsStore.createIndex('customer_id', 'customer_id');
            meetingsStore.createIndex('meeting_date', 'meeting_date');
            meetingsStore.createIndex('created_by', 'created_by');
          }

          // Customer Notes store oluştur (yoksa)
          if (!db.objectStoreNames.contains('customer_notes')) {
            const notesStore = db.createObjectStore('customer_notes', {
              keyPath: 'id',
              autoIncrement: true,
            });
            notesStore.createIndex('customer_id', 'customer_id');
            notesStore.createIndex('user_id', 'user_id');
            notesStore.createIndex('created_at', 'created_at');
          }

          // Actual Costs store oluştur (yoksa)
          if (!db.objectStoreNames.contains('actual_costs')) {
            const actualCostsStore = db.createObjectStore('actual_costs', {
              keyPath: 'id',
              autoIncrement: true,
            });
            actualCostsStore.createIndex('quote_id', 'quote_id', {
              unique: true,
            });
            actualCostsStore.createIndex('created_at', 'created_at');
            actualCostsStore.createIndex('updated_at', 'updated_at');
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          console.log('Veritabanı şeması başarıyla güncellendi');
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.error('Veritabanı güncellenirken hata:', event.target.error);
          reject(event.target.error);
        };
      });
    }

    return Promise.resolve();
  }

  async addDefaultCustomers() {
    const defaultCustomers = [
      {
        company_name: 'ABC Şirketi',
        category: 'corporate',
        phone: '0212 555 1234',
        email: 'info@abc.com',
        status: 'Aktif',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        company_name: 'XYZ Limited',
        category: 'sme',
        phone: '0216 444 5678',
        email: 'contact@xyz.com',
        status: 'Aktif',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const tx = this.db.transaction('customers', 'readwrite');
    const store = tx.objectStore('customers');

    for (const customer of defaultCustomers) {
      await new Promise((resolve, reject) => {
        const request = store.add(customer);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Örnek kullanıcıları ekle
  async initializeDefaultUsers() {
    try {
      // Users store kontrol et ve gerekirse oluştur
      if (!this.db.objectStoreNames.contains('users')) {
        console.log('Users store bulunamadı, veri tabanı sürümü güncellenmeli');
        return;
      }

      // Mevcut kullanıcıları kontrol et
      const tx = this.db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const count = await new Promise((resolve) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0); // Hata durumunda 0 döndür
      });

      // Eğer hiç kullanıcı yoksa varsayılan kullanıcıları ekle
      if (count === 0) {
        for (const user of this.defaultUsers) {
          try {
            // Her kullanıcıyı ayrı transaction'da ekle
            const addTx = this.db.transaction('users', 'readwrite');
            const addStore = addTx.objectStore('users');

            await new Promise((resolve, reject) => {
              const request = addStore.add({
                username: user.username,
                password: user.password,
                full_name: user.fullName,
                department: user.department,
                created_at: new Date().toISOString(),
              });

              request.onsuccess = () => resolve();
              request.onerror = () => {
                console.warn(`Kullanıcı eklenemedi: ${user.username}`);
                resolve(); // Hata olsa bile devam et
              };
            });
          } catch (error) {
            console.warn(`Kullanıcı eklenirken hata: ${user.username}`, error);
            // Hatayı yok say ve devam et
          }
        }
      }
    } catch (error) {
      console.error('Varsayılan kullanıcıları başlatırken hata:', error);
      // Hata olsa bile çalışmaya devam et
    }
  }

  // Kullanıcı işlemleri
  async addUser(userData) {
    return this.addData('users', userData);
  }

  async getUser(username) {
    return this.getData('users', username);
  }

  async validateUser(username, password) {
    try {
      const response = await fetch('http://localhost:3110/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('API response:', data); // Debug için

      if (response.ok) {
        // Başarılı giriş durumunda kullanıcı bilgisini kaydet
        this.setCurrentUser({
          username: username,
          fullName: data.user.fullName,
          department: data.user.department,
        });

        // Başarılı girişten sonra verileri senkronize et
        this.syncDataAfterLogin();

        return {
          success: true,
          user: {
            fullName: data.user.fullName,
            department: data.user.department,
          },
        };
      }

      return {
        success: false,
        error: data.error,
      };
    } catch (error) {
      console.error('API hatası:', error);
      // API hatası durumunda statik kullanıcıları kontrol et
      return this.validateStaticUser(username, password);
    }
  }

  // Statik kullanıcı kontrolü (fallback)
  validateStaticUser(username, password) {
    const staticUsers = [
      {
        username: 'ahmet',
        password: '1234',
        fullName: 'Ahmet Yilmaz',
        department: 'Satis',
      },
      {
        username: 'mehmet',
        password: '1234',
        fullName: 'Mehmet Kaya',
        department: 'Teknik',
      },
    ];

    const user = staticUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      // Kullanıcı bilgisini kaydet
      this.setCurrentUser({
        username: user.username,
        fullName: user.fullName,
        department: user.department,
      });

      // Verileri senkronize et
      this.syncDataAfterLogin();

      return {
        success: true,
        user: {
          fullName: user.fullName,
          department: user.department,
        },
      };
    } else {
      return {
        success: false,
        error: 'Geçersiz kullanıcı adı veya şifre',
      };
    }
  }

  // Teklif kaydetme
  async saveQuote(quoteData) {
    try {
      // Debug için gelen veriyi logla
      console.log('saveQuote fonksiyonuna gelen veri:', quoteData);
      console.log('Aktif kullanıcı:', this.getCurrentUser());

      const response = await fetch(`${this.apiUrl}/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: quoteData.number,
          date: quoteData.date,
          details: quoteData.details,
          prepared_by: quoteData.prepared_by,
          total_price: quoteData.total_price,
          status: 'HAZIRLANDI',
          items: quoteData.items,
        }),
      });

      // API yanıtını logla
      console.log('API yanıtı:', await response.clone().json());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Teklif kaydedilemedi');
      }

      const result = await response.json();
      console.log('Teklif başarıyla kaydedildi:', result);
      return result.data;
    } catch (error) {
      console.error('Teklif kaydetme hatası:', error);
      throw error;
    }
  }

  // Get all quotes
  async getAllQuotes() {
    try {
      console.log('Getting all quotes from database...');
      // Try API first
      try {
        // Explicitly request a very large limit to ensure we get all quotes
        const response = await fetch(`${this.apiUrl}/quotes?limit=10000`);
        if (response.ok) {
          const data = await response.json();
          console.log('API quote data received:', data);
          if (data.success && Array.isArray(data.data)) {
            console.log(
              `Successfully retrieved ${data.data.length} quotes from API`
            );
            return this.normalizeQuoteData(data.data);
          }
        }
      } catch (apiError) {
        console.warn(
          'API quotes fetch failed, falling back to IndexedDB',
          apiError
        );
      }

      console.log('Falling back to IndexedDB for quotes');
      // Fallback to IndexedDB - use this.db directly instead of openDatabase
      if (!this.db) {
        await this.initDatabase();
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction(['quotes'], 'readonly');
          const store = transaction.objectStore('quotes');
          const request = store.getAll();

          request.onsuccess = (event) => {
            const quotes = event.target.result;
            console.log(`Retrieved ${quotes.length} quotes from IndexedDB`);
            resolve(this.normalizeQuoteData(quotes));
          };

          request.onerror = (event) => {
            console.error(
              'Failed to get quotes from IndexedDB',
              event.target.error
            );
            reject(new Error('Failed to get quotes from IndexedDB'));
          };
        } catch (error) {
          console.error('Error accessing quotes store', error);
          // If there's an error, return an empty array instead of rejecting
          resolve([]);
        }
      });
    } catch (error) {
      console.error('Failed to get quotes:', error);
      return [];
    }
  }

  // Helper method to normalize quote data
  normalizeQuoteData(quotes) {
    if (!quotes || !Array.isArray(quotes)) {
      console.warn('Invalid quote data received for normalization', quotes);
      return [];
    }

    console.log('Normalizing quote data, count:', quotes.length);
    return quotes.map((quote) => {
      // Ensure we have consistent data structure
      const normalizedQuote = {
        ...quote,
        id: quote.id || 0,
        number: quote.number || `Unknown-${quote.id || 0}`,
        prepared_by: quote.prepared_by || 'Unknown',
        total_price:
          typeof quote.total_price === 'number'
            ? quote.total_price
            : parseFloat(quote.total_price || 0),
        date: quote.date || quote.created_at || new Date().toISOString(),
        status: quote.status || 'UNKNOWN',
      };

      // Normalize status to uppercase
      if (normalizedQuote.status) {
        normalizedQuote.status = String(normalizedQuote.status)
          .toUpperCase()
          .trim();
      }

      return normalizedQuote;
    });
  }

  // Teklif durumunu güncelle
  async updateQuoteStatus(quoteId, newStatus) {
    try {
      console.log(`Updating quote ${quoteId} status to ${newStatus}`);

      // First try API update
      try {
        const response = await fetch(
          `${this.apiUrl}/quotes/${quoteId}/status`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
          }
        );

        if (response.ok) {
          console.log(`Status updated via API for quote ${quoteId}`);
          return true;
        } else {
          console.warn(
            `API status update failed for quote ${quoteId}, trying fallback...`
          );
        }
      } catch (apiError) {
        console.warn(`API error for status update: ${apiError.message}`);
      }

      // Fallback: Update directly in cached data and continue
      try {
        // Get existing quotes
        const quotes = await this.getAllQuotes();

        // Find the quote to update
        const quoteIndex = quotes.findIndex((q) => q.id === parseInt(quoteId));

        if (quoteIndex === -1) {
          console.warn(`Quote ${quoteId} not found in local data`);
          return false;
        }

        // Update the status
        const quote = quotes[quoteIndex];
        quote.status = newStatus;

        // Also update in this.quotes if it exists
        if (this.quotes && this.quotes.length > 0) {
          const internalIndex = this.quotes.findIndex(
            (q) => q.id === parseInt(quoteId)
          );
          if (internalIndex !== -1) {
            this.quotes[internalIndex].status = newStatus;
          }
        }

        console.log(`Status updated locally for quote ${quoteId}`);
        return true;
      } catch (localError) {
        console.error(`Local status update failed: ${localError.message}`);
        throw localError;
      }
    } catch (error) {
      console.error('Teklif durumu güncelleme hatası:', error);
      throw error;
    }
  }

  // Teklif sil
  async deleteQuote(quoteId) {
    try {
      const response = await fetch(`${this.apiUrl}/quotes/${quoteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Teklif silinemedi');
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Teklif silme hatası:', error);
      throw error;
    }
  }

  // Dashboard istatistikleri
  async addDashboardStat(statData) {
    return this.addData('dashboardStats', {
      ...statData,
      date: new Date(),
    });
  }

  async getDashboardStats() {
    return this.getAllData('dashboardStats');
  }

  // Yardımcı metodlar
  async addData(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getData(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllData(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Oturum yönetimi
  getCurrentUser() {
    try {
      const userJson = localStorage.getItem('currentUser');
      console.log("LocalStorage'dan alınan kullanıcı:", userJson);

      if (!userJson) {
        console.warn("LocalStorage'da kullanıcı bilgisi bulunamadı");
        return null;
      }

      const user = JSON.parse(userJson);
      console.log('Aktif kullanıcı:', user);
      return user;
    } catch (error) {
      console.error('Kullanıcı bilgisi alınamadı:', error);
      return null;
    }
  }

  setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearCurrentUser() {
    localStorage.removeItem('currentUser');
  }

  // Müşteri İşlemleri
  async getCustomerDetails(customerId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['customers'], 'readonly');
      const store = transaction.objectStore('customers');
      const request = store.get(Number(customerId));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateCustomer(customerId, customerData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['customers'], 'readwrite');
      const store = transaction.objectStore('customers');

      customerData.id = Number(customerId);
      customerData.updated_at = new Date().toISOString();

      const request = store.put(customerData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async addCustomer(customerData) {
    try {
      // Önce IndexedDB'ye kaydet
      const transaction = this.db.transaction(['customers'], 'readwrite');
      const store = transaction.objectStore('customers');

      // Gerekli tarih alanlarını ekle
      if (!customerData.created_at) {
        customerData.created_at = new Date().toISOString();
      }
      customerData.updated_at = new Date().toISOString();

      const request = store.add(customerData);

      const localResult = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Sonra sunucuya senkronize et
      try {
        const serverResult = await this.syncCustomerToServer(customerData);
        console.log('Müşteri sunucuya senkronize edildi:', serverResult);
      } catch (error) {
        console.warn(
          'Müşteri sunucuya senkronize edilemedi, daha sonra tekrar denenecek:',
          error
        );
      }

      return localResult;
    } catch (error) {
      console.error('Müşteri ekleme hatası:', error);
      throw error;
    }
  }

  async getCustomerQuotes(customerId) {
    try {
      const query = `
                SELECT 
                    q.*,
                    u.full_name as prepared_by_name
                FROM quotes q
                LEFT JOIN users u ON u.id = q.prepared_by
                WHERE q.customer_id = $1
                ORDER BY q.created_at DESC
            `;
      return await this.query(query, [customerId]);
    } catch (error) {
      console.error('Müşteri teklifleri alınırken hata:', error);
      throw error;
    }
  }

  async getCustomerMeetings(customerId) {
    try {
      const query = `
                SELECT 
                    m.*,
                    u.full_name as created_by_name
                FROM meetings m
                LEFT JOIN users u ON u.id = m.created_by
                WHERE m.customer_id = $1
                ORDER BY m.meeting_date DESC
            `;
      return await this.query(query, [customerId]);
    } catch (error) {
      console.error('Müşteri görüşmeleri alınırken hata:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    // IndexedDB için SQL benzeri sorgu adaptörü
    try {
      const store = sql.toLowerCase().includes('from customers')
        ? 'customers'
        : sql.toLowerCase().includes('from quotes')
          ? 'quotes'
          : sql.toLowerCase().includes('from meetings')
            ? 'meetings'
            : null;

      if (!store) {
        throw new Error('Geçersiz sorgu: Tablo bulunamadı');
      }

      const tx = this.db.transaction(store, 'readonly');
      const objectStore = tx.objectStore(store);

      return new Promise((resolve, reject) => {
        const request = objectStore.getAll();

        request.onsuccess = () => {
          let results = request.result;

          // SELECT * FROM customers ORDER BY created_at DESC
          if (sql.includes('ORDER BY')) {
            const orderField = sql.split('ORDER BY')[1].trim().split(' ')[0];
            results = results.sort((a, b) => {
              return new Date(b[orderField]) - new Date(a[orderField]);
            });
          }

          resolve(results);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Müşteri işlemleri için yeni metodlar
  async getAllCustomers() {
    try {
      // PostgreSQL API'den müşterileri çek
      const response = await fetch(`${this.apiUrl}/customers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      } else {
        console.warn('Müşteri verisi beklenen formatta değil:', result);
        return [];
      }
      } catch (error) {
      console.error('Müşteriler alınırken hata:', error);
      // Hata durumunda boş dizi döndür
      return [];
      }
  }

  // Müşteri görüşmeleri için fonksiyon
  async getAllCustomerMeetings() {
    return new Promise((resolve, reject) => {
      // Veritabanı bağlantısı kontrolü
      if (!this.db) {
        console.error('Database not initialized');
        resolve([]);
        return;
      }

      try {
        // Önce customer_meetings store var mı kontrol et
        if (!this.db.objectStoreNames.contains('customer_meetings')) {
          console.warn('Customer meetings store bulunamadı');
          // Eğer yoksa örnek veriler döndür
          resolve(this.getDefaultMeetings());
          return;
        }

        const transaction = this.db.transaction(
          ['customer_meetings'],
          'readonly'
        );
        const store = transaction.objectStore('customer_meetings');
        const request = store.getAll();

        request.onsuccess = () => {
          if (request.result && request.result.length > 0) {
            resolve(request.result);
          } else {
            // Veri yoksa örnek veriler döndür
            resolve(this.getDefaultMeetings());
          }
        };

        request.onerror = () => {
          console.error('Error getting meetings:', request.error);
          resolve(this.getDefaultMeetings());
        };
      } catch (error) {
        console.error('Error in getAllCustomerMeetings:', error);
        resolve(this.getDefaultMeetings());
      }
    });
  }

  // Müşteri notları için fonksiyon
  async getAllCustomerNotes() {
    return new Promise((resolve, reject) => {
      // Veritabanı bağlantısı kontrolü
      if (!this.db) {
        console.error('Database not initialized');
        resolve([]);
        return;
      }

      try {
        // Önce notes store var mı kontrol et
        if (!this.db.objectStoreNames.contains('customer_notes')) {
          console.warn('Customer notes store bulunamadı');
          // Eğer yoksa örnek veriler döndür
          resolve(this.getDefaultNotes());
          return;
        }

        const transaction = this.db.transaction(['customer_notes'], 'readonly');
        const store = transaction.objectStore('customer_notes');
        const request = store.getAll();

        request.onsuccess = () => {
          if (request.result && request.result.length > 0) {
            resolve(request.result);
          } else {
            // Veri yoksa örnek veriler döndür
            resolve(this.getDefaultNotes());
          }
        };

        request.onerror = () => {
          console.error('Error getting notes:', request.error);
          resolve(this.getDefaultNotes());
        };
      } catch (error) {
        console.error('Error in getAllCustomerNotes:', error);
        resolve(this.getDefaultNotes());
      }
    });
  }

  // Örnek görüşme verileri
  getDefaultMeetings() {
    return [
      {
        id: 1,
        customer_id: 1,
        meeting_date: new Date().toISOString(),
        meeting_type: 'Tanışma',
        meeting_location: 'Müşteri Ofisi',
        meeting_outcome: 'Olumlu',
        meeting_notes: 'İlk tanışma gerçekleştirildi, olumlu geçti.',
        created_by: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_name: 'ABC Şirketi', // İstemci tarafında gösterim için
        created_by_name: 'Ahmet Yılmaz', // İstemci tarafında gösterim için
      },
      {
        id: 2,
        customer_id: 2,
        meeting_date: new Date(
          Date.now() - 3 * 24 * 60 * 60 * 1000
        ).toISOString(), // 3 gün önce
        meeting_type: 'Teklif Sunumu',
        meeting_location: 'Video Konferans',
        meeting_outcome: 'Beklemede',
        meeting_notes: 'Teklif sunuldu, müşteri değerlendirme aşamasında.',
        created_by: 2,
        created_at: new Date(
          Date.now() - 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date(
          Date.now() - 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
        customer_name: 'XYZ Limited', // İstemci tarafında gösterim için
        created_by_name: 'Mehmet Kaya', // İstemci tarafında gösterim için
      },
    ];
  }

  // Örnek not verileri
  getDefaultNotes() {
    return [
      {
        id: 1,
        customer_id: 1,
        note_text:
          'Müşteri ile ilk görüşme gerçekleştirildi. Ürünlerimize ilgi gösteriyor.',
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_name: 'ABC Şirketi', // İstemci tarafında gösterim için
        user_name: 'Ahmet Yılmaz', // İstemci tarafında gösterim için
      },
      {
        id: 2,
        customer_id: 2,
        note_text:
          'Fiyat konusunda hassasiyet var. Özel indirim değerlendirilebilir.',
        user_id: 2,
        created_at: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        customer_name: 'XYZ Limited', // İstemci tarafında gösterim için
        user_name: 'Mehmet Kaya', // İstemci tarafında gösterim için
      },
    ];
  }

  // Müşteri görüşmesi ekleme
  async addCustomerMeeting(meetingData) {
    try {
      // Önce IndexedDB'ye kaydet
      const transaction = this.db.transaction(
        ['customer_meetings'],
        'readwrite'
      );
      const store = transaction.objectStore('customer_meetings');

      // Gerekli tarih alanlarını ekle
      if (!meetingData.created_at) {
        meetingData.created_at = new Date().toISOString();
      }
      meetingData.updated_at = new Date().toISOString();

      const request = store.add(meetingData);

      const localResult = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Sonra sunucuya senkronize et
      try {
        const serverResult = await this.syncMeetingToServer(meetingData);
        console.log('Görüşme sunucuya senkronize edildi:', serverResult);
      } catch (error) {
        console.warn(
          'Görüşme sunucuya senkronize edilemedi, daha sonra tekrar denenecek:',
          error
        );
      }

      return localResult;
    } catch (error) {
      console.error('Görüşme ekleme hatası:', error);
      throw error;
    }
  }

  // Müşteri görüşmesi güncelleme
  async updateCustomerMeeting(id, meetingData) {
    return new Promise((resolve, reject) => {
      if (!this.db.objectStoreNames.contains('customer_meetings')) {
        reject(new Error('Meetings store not found'));
        return;
      }

      const transaction = this.db.transaction(
        ['customer_meetings'],
        'readwrite'
      );
      const store = transaction.objectStore('customer_meetings');

      meetingData.id = Number(id);
      meetingData.updated_at = new Date().toISOString();

      const request = store.put(meetingData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Müşteri görüşmesi silme
  async deleteCustomerMeeting(id) {
    return new Promise((resolve, reject) => {
      if (!this.db.objectStoreNames.contains('customer_meetings')) {
        resolve(false); // Store yoksa silme başarısız
        return;
      }

      const transaction = this.db.transaction(
        ['customer_meetings'],
        'readwrite'
      );
      const store = transaction.objectStore('customer_meetings');
      const request = store.delete(Number(id));

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Müşteri notu ekleme
  async addCustomerNote(noteData) {
    try {
      // Önce IndexedDB'ye kaydet
      const transaction = this.db.transaction(['customer_notes'], 'readwrite');
      const store = transaction.objectStore('customer_notes');

      // Gerekli tarih alanlarını ekle
      if (!noteData.created_at) {
        noteData.created_at = new Date().toISOString();
      }
      noteData.updated_at = new Date().toISOString();

      const request = store.add(noteData);

      const localResult = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Sonra sunucuya senkronize et
      try {
        const serverResult = await this.syncNoteToServer(noteData);
        console.log('Not sunucuya senkronize edildi:', serverResult);
      } catch (error) {
        console.warn(
          'Not sunucuya senkronize edilemedi, daha sonra tekrar denenecek:',
          error
        );
      }

      return localResult;
    } catch (error) {
      console.error('Not ekleme hatası:', error);
      throw error;
    }
  }

  // Müşteri notu güncelleme
  async updateCustomerNote(id, noteData) {
    return new Promise((resolve, reject) => {
      if (!this.db.objectStoreNames.contains('customer_notes')) {
        reject(new Error('Customer notes store not found'));
        return;
      }

      const transaction = this.db.transaction(['customer_notes'], 'readwrite');
      const store = transaction.objectStore('customer_notes');

      noteData.id = Number(id);
      noteData.updated_at = new Date().toISOString();

      const request = store.put(noteData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Müşteri notu silme
  async deleteCustomerNote(id) {
    return new Promise((resolve, reject) => {
      if (!this.db.objectStoreNames.contains('customer_notes')) {
        resolve(false); // Store yoksa silme başarısız
        return;
      }

      const transaction = this.db.transaction(['customer_notes'], 'readwrite');
      const store = transaction.objectStore('customer_notes');
      const request = store.delete(Number(id));

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Eksik fonksiyonları ekleyelim

  // Tekil teklif getirme fonksiyonu
  async getQuoteById(quoteId) {
    try {
      // Try API first
      try {
        const response = await fetch(`${this.apiUrl}/quotes/${quoteId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const quote = this.normalizeQuoteData([data.data])[0];
            return quote;
          }
        }
      } catch (apiError) {
        console.warn(
          `API quote fetch for ID ${quoteId} failed, falling back to IndexedDB`,
          apiError
        );
      }

      // Fallback to IndexedDB - use this.db directly
      if (!this.db) {
        await this.initDatabase();
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction(['quotes'], 'readonly');
          const store = transaction.objectStore('quotes');
          const request = store.get(quoteId);

          request.onsuccess = (event) => {
            if (event.target.result) {
              try {
                const quote = this.normalizeQuoteData([event.target.result])[0];
                resolve(quote);
              } catch (error) {
                console.error('Error normalizing quote data:', error);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          };

          request.onerror = (event) => {
            console.error(
              `Error fetching quote ${quoteId}:`,
              event.target.error
            );
            resolve(null); // Resolve with null instead of rejecting
          };
        } catch (error) {
          console.error('Transaction error in getQuoteById:', error);
          resolve(null); // Resolve with null on any error
        }
      });
    } catch (error) {
      console.error(`Failed to get quote ${quoteId}:`, error);
      return null; // Return null instead of throwing
    }
  }

  // Teklif ekleme fonksiyonu
  async addQuote(quoteData) {
    try {
      // Önce API'ye göndermeyi deneyelim
      try {
        const response = await fetch(`${this.apiUrl}/quotes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quoteData),
        });

        if (response.ok) {
          const result = await response.json();
          return result.data;
        }
      } catch (fetchError) {
        console.error('API isteği sırasında hata:', fetchError);
      }

      // API başarısız olursa, yerel olarak yeni teklif oluştur
      const allQuotes = await this.getAllQuotes();
      const newId =
        allQuotes.length > 0 ? Math.max(...allQuotes.map((q) => q.id)) + 1 : 1;

      const newQuote = {
        id: newId,
        number: quoteData.number,
        date: new Date().toISOString(),
        details: quoteData.details,
        prepared_by: quoteData.prepared_by,
        prepared_by_name: quoteData.prepared_by,
        total_price: parseFloat(quoteData.total_price),
        status: quoteData.status || 'HAZIRLANDI',
      };

      // Demo amaçlı başarılı dön
      console.log('Yeni teklif oluşturuldu (yerel):', newQuote);
      return newQuote;
    } catch (error) {
      console.error('Teklif ekleme hatası:', error);
      throw error;
    }
  }

  // Teklif güncelleme fonksiyonu
  async updateQuote(id, quoteData) {
    try {
      // Önce API'ye göndermeyi deneyelim
      try {
        const response = await fetch(`${this.apiUrl}/quotes/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quoteData),
        });

        if (response.ok) {
          const result = await response.json();
          return result.data;
        }
      } catch (fetchError) {
        console.error('API isteği sırasında hata:', fetchError);
      }

      // API başarısız olursa, başarılı güncellemeyi simüle et
      const updatedQuote = {
        ...quoteData,
        id: parseInt(id),
      };

      console.log('Teklif güncellendi (yerel):', updatedQuote);
      return updatedQuote;
    } catch (error) {
      console.error(`Teklif güncelleme hatası (ID: ${id}):`, error);
      throw error;
    }
  }

  // Tüm kullanıcıları getirme fonksiyonu
  async getAllUsers() {
    try {
      // Önce API'den almayı deneyelim
      try {
        const response = await fetch(`${this.apiUrl}/users`);

        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            return result.data;
          }
        }
      } catch (fetchError) {
        console.error('API isteği sırasında hata:', fetchError);
      }

      // API başarısız olursa, örnek kullanıcıları dön
      return [
        {
          id: 1,
          username: 'ahmet',
          full_name: 'Ahmet Yilmaz',
          email: 'ahmet@example.com',
          department: 'Satis',
        },
        {
          id: 2,
          username: 'mehmet',
          full_name: 'Mehmet Kaya',
          email: 'mehmet@example.com',
          department: 'Teknik',
        },
        {
          id: 3,
          username: 'kemal',
          full_name: 'Kemal Sunal',
          email: 'kemal@example.com',
          department: 'Satis',
        },
      ];
    } catch (error) {
      console.error('Kullanıcıları getirme hatası:', error);
      return [];
    }
  }

  // Kullanıcı getirme fonksiyonu
  async getUserById(id) {
    try {
      const allUsers = await this.getAllUsers();
      return allUsers.find((user) => user.id === parseInt(id)) || null;
    } catch (error) {
      console.error(`Kullanıcı getirme hatası (ID: ${id}):`, error);
      return null;
    }
  }

  // Kullanıcı güncelleme fonksiyonu
  async updateUser(id, userData) {
    try {
      // Önce API'ye göndermeyi deneyelim
      try {
        const response = await fetch(`${this.apiUrl}/users/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        if (response.ok) {
          const result = await response.json();
          return result.data;
        }
      } catch (fetchError) {
        console.error('API isteği sırasında hata:', fetchError);
      }

      // API başarısız olursa, başarılı güncellemeyi simüle et
      const updatedUser = {
        ...userData,
        id: parseInt(id),
      };

      console.log('Kullanıcı güncellendi (yerel):', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error(`Kullanıcı güncelleme hatası (ID: ${id}):`, error);
      throw error;
    }
  }

  // Kullanıcı silme fonksiyonu
  async deleteUser(id) {
    try {
      // Önce API'ye göndermeyi deneyelim
      try {
        const response = await fetch(`${this.apiUrl}/users/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          return true;
        }
      } catch (fetchError) {
        console.error('API isteği sırasında hata:', fetchError);
      }

      // API başarısız olursa, başarılı silmeyi simüle et
      console.log(`Kullanıcı silindi (yerel, ID: ${id})`);
      return true;
    } catch (error) {
      console.error(`Kullanıcı silme hatası (ID: ${id}):`, error);
      throw error;
    }
  }

  // Müşteri getirme fonksiyonu
  async getCustomerById(id) {
    try {
      // Öncelikle indexedDB üzerinden müşteriyi bulmaya çalışalım
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['customers'], 'readonly');
        const store = transaction.objectStore('customers');
        const request = store.get(Number(id));

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            // IndexedDB'de bulunamadıysa, boş bir müşteri objesi döndür
            resolve({
              id: parseInt(id),
              company_name: 'Bilinmeyen Müşteri',
              name: '',
              consultant_email: '',
              consultant_phone: '',
              address: '',
              category: 'Kurumsal',
              status: 'Aktif',
            });
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Müşteri getirme hatası (ID: ${id}):`, error);
      return null;
    }
  }

  // Müşteri silme fonksiyonu
  async deleteCustomer(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['customers'], 'readwrite');
      const store = transaction.objectStore('customers');
      const request = store.delete(Number(id));

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Veritabanını tamamen sıfırlamak için yeni method
  async resetDatabase() {
    return new Promise((resolve, reject) => {
      try {
        // Önce mevcut bağlantıyı kapatalım
        if (this.db) {
          this.db.close();
          this.db = null;
        }

        console.log('Veritabanı sıfırlanıyor...');

        // Veritabanını tamamen silelim
        const deleteRequest = indexedDB.deleteDatabase(this.dbName);

        deleteRequest.onsuccess = () => {
          console.log('Veritabanı başarıyla silindi');
          resolve(true);
        };

        deleteRequest.onerror = (event) => {
          console.error('Veritabanı silme hatası:', event.target.error);
          reject(event.target.error);
        };

        deleteRequest.onblocked = () => {
          console.warn(
            'Veritabanı silme işlemi engellendi, bağlantılar kapatılmalı'
          );
          // Kullanıcıya sayfayı yenilemesi için bildirim gösterilebilir
          alert('Veritabanı sıfırlama işlemi için lütfen sayfayı yenileyin');
          reject(new Error('Database deletion blocked'));
        };
      } catch (error) {
        console.error('Veritabanı sıfırlama hatası:', error);
        reject(error);
      }
    });
  }

  // Müşteri senkronizasyonu için yeni fonksiyonlar
  async syncCustomerToServer(customerData) {
    try {
      const response = await fetch(`${this.apiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        throw new Error('Müşteri sunucuya kaydedilemedi');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Müşteri senkronizasyon hatası:', error);
      throw error;
    }
  }

  async syncMeetingToServer(meetingData) {
    try {
      const response = await fetch(`${this.apiUrl}/customer_meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        throw new Error('Görüşme sunucuya kaydedilemedi');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Görüşme senkronizasyon hatası:', error);
      throw error;
    }
  }

  async syncNoteToServer(noteData) {
    try {
      const response = await fetch(`${this.apiUrl}/customer_notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        throw new Error('Not sunucuya kaydedilemedi');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Not senkronizasyon hatası:', error);
      throw error;
    }
  }

  // Veritabanından verileri senkronize et
  async syncDataAfterLogin() {
    try {
      console.log('Veritabanından veri senkronizasyonu başlıyor...');

      // Müşterileri senkronize et
      await this.syncCustomersFromServer();

      // Müşteri görüşmelerini senkronize et
      await this.syncMeetingsFromServer();

      // Müşteri notlarını senkronize et
      await this.syncNotesFromServer();

      // Gerçekleşen maliyet verilerini senkronize et
      await this.syncActualCostsFromServer();

      console.log('Veri senkronizasyonu tamamlandı');
    } catch (error) {
      console.error('Veri senkronizasyonu hatası:', error);
    }
  }

  // Veritabanından müşterileri IndexedDB'ye senkronize et
  async syncCustomersFromServer() {
    try {
      // Veritabanından müşterileri getir
      const response = await fetch(`${this.apiUrl}/customers`);

      if (!response.ok) {
        console.warn(
          "Müşteri verileri API'den getirilemedi, yerel verileri koruyarak devam ediliyor."
        );
        return [];
      }

      const result = await response.json();

      if (!result.success || !result.data || !Array.isArray(result.data)) {
        console.warn(
          "API'den gelen müşteri verisi geçersiz, yerel verileri koruyarak devam ediliyor."
        );
        return [];
      }

      console.log(`${result.data.length} müşteri API'den alındı.`);

      // Yeni verileri ekle veya güncelle
      const tx = this.db.transaction(['customers'], 'readwrite');
      const store = tx.objectStore('customers');

      for (const customer of result.data) {
        try {
          // Önce mevcut müşteriyi kontrol et
          const existingCustomer = await new Promise((resolve) => {
            const request = store.get(customer.id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
          });

          if (existingCustomer) {
            // Güncelle
            await new Promise((resolve) => {
              const request = store.put({
                ...existingCustomer,
                ...customer,
                updated_at: new Date().toISOString(),
              });
              request.onsuccess = () => resolve();
              request.onerror = () => {
                console.warn(
                  `Müşteri güncellenirken hata (ID: ${customer.id}):`,
                  request.error
                );
                resolve(); // Hata olsa bile devam et
              };
            });
          } else {
            // Ekle
            await new Promise((resolve) => {
              const request = store.add(customer);
              request.onsuccess = () => resolve();
              request.onerror = () => {
                console.warn(
                  `Müşteri eklenirken hata (ID: ${customer.id}):`,
                  request.error
                );
                resolve(); // Hata olsa bile devam et
              };
            });
          }
        } catch (error) {
          console.warn(`Müşteri işlenirken hata (ID: ${customer.id}):`, error);
          // Hatayı yok say ve devam et
        }
      }

      console.log(`Müşteri verileri senkronize edildi`);
      return result.data;
    } catch (error) {
      console.error('Müşteri senkronizasyon hatası:', error);
      return [];
    }
  }

  // Müşteri notlarını senkronize et (stub — API endpoint eklendiğinde genişletilebilir)
  async syncNotesFromServer() {
    // Henüz uygulanmadı — sessizce atla
    return [];
  }

  // Veritabanından müşteri görüşmelerini IndexedDB'ye senkronize et
  async syncMeetingsFromServer() {
    try {
      // Veritabanından görüşmeleri getir
      const response = await fetch(`${this.apiUrl}/customer_meetings`);

      if (!response.ok) {
        console.warn(
          "Görüşme verileri API'den getirilemedi, yerel verileri koruyarak devam ediliyor."
        );
        return [];
      }

      const result = await response.json();

      if (!result.success || !result.data || !Array.isArray(result.data)) {
        console.warn(
          "API'den gelen görüşme verisi geçersiz, yerel verileri koruyarak devam ediliyor."
        );
        return [];
      }

      console.log(`${result.data.length} görüşme API'den alındı.`);

      // Yeni verileri ekle veya güncelle
      const tx = this.db.transaction(['customer_meetings'], 'readwrite');
      const store = tx.objectStore('customer_meetings');

      for (const meeting of result.data) {
        try {
          // Önce mevcut görüşmeyi kontrol et
          const existingMeeting = await new Promise((resolve) => {
            const request = store.get(meeting.id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
          });

          if (existingMeeting) {
            // Güncelle
            await new Promise((resolve) => {
              const request = store.put({
                ...existingMeeting,
                ...meeting,
                updated_at: new Date().toISOString(),
              });
              request.onsuccess = () => resolve();
              request.onerror = () => {
                console.warn(
                  `Görüşme güncellenirken hata (ID: ${meeting.id}):`,
                  request.error
                );
                resolve(); // Hata olsa bile devam et
              };
            });
          } else {
            // Ekle
            await new Promise((resolve) => {
              const request = store.add(meeting);
              request.onsuccess = () => resolve();
              request.onerror = () => {
                console.warn(
                  `Görüşme eklenirken hata (ID: ${meeting.id}):`,
                  request.error
                );
                resolve(); // Hata olsa bile devam et
              };
            });
          }
        } catch (error) {
          console.warn(`Görüşme işlenirken hata (ID: ${meeting.id}):`, error);
          // Hatayı yok say ve devam et
        }
      }

      console.log(`Görüşme verileri senkronize edildi`);
      return result.data;
    } catch (error) {
      console.error('Görüşme senkronizasyon hatası:', error);
      return [];
    }
  }

  // Veritabanından gerçekleşen maliyet verilerini getir (Without IndexedDB)
  async syncActualCostsFromServer() {
    try {
      // Directly fetch from API only
      const response = await fetch(`${this.apiUrl}/actual-costs`);

      if (!response.ok) {
        console.warn("Gerçekleşen maliyet verileri API'den getirilemedi.");
        return [];
      }

      const result = await response.json();

      if (!result.success || !result.data || !Array.isArray(result.data)) {
        console.warn("API'den gelen gerçekleşen maliyet verisi geçersiz.");
        return [];
      }

      console.log(
        `${result.data.length} gerçekleşen maliyet verisi API'den alındı.`
      );
      return this.normalizeActualCostData(result.data);
    } catch (error) {
      console.error('Gerçekleşen maliyet senkronizasyon hatası:', error);
      return [];
    }
  }

  // Gerçekleşen maliyet işlemleri - Simplified to use only API
  async addActualCost(costData) {
    try {
      if (!costData.quote_id) {
        throw new Error('Teklif ID eksik');
      }

      console.log(
        'Adding actual cost for quote ID:',
        costData.quote_id,
        costData
      );

      // Teklif ID'sine göre mevcut maliyet kaydını kontrol et
      const existingCost = await this.getActualCostByQuoteId(costData.quote_id);

      if (existingCost) {
        // Eğer varsa güncelle
        return this.updateActualCost(existingCost.id, costData);
      }

      // Tarih alanlarını ekle
      const now = new Date().toISOString();
      costData.created_at = now;
      costData.updated_at = now;

      // Only try API, no IndexedDB fallback
      const response = await fetch(`${this.apiUrl}/actual-costs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(costData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error saving actual cost:', errorData);
        throw new Error(`API error: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Actual cost saved to API', result.data);
      return result.data;
    } catch (error) {
      console.error('Gerçekleşen maliyet eklenirken hata:', error);
      throw error;
    }
  }

  async updateActualCost(id, costData) {
    try {
      if (!id) {
        throw new Error("Güncellenecek maliyet ID'si eksik");
      }

      console.log('Updating actual cost ID:', id, costData);

      // Mevcut kaydı al
      const existingCost = await this.getActualCostById(id);

      if (!existingCost) {
        throw new Error('Güncellenecek maliyet kaydı bulunamadı');
      }

      // Mevcut kayıtla yeni verileri birleştir
      const updatedCost = {
        ...existingCost,
        ...costData,
        id: existingCost.id, // ID'yi koru
        updated_at: new Date().toISOString(),
      };

      // Only use API, no IndexedDB fallback
      const response = await fetch(`${this.apiUrl}/actual-costs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCost),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error updating actual cost:', errorData);
        throw new Error(`API error: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Actual cost updated in API', result.data);
      return result.data;
    } catch (error) {
      console.error('Gerçekleşen maliyet güncellenirken hata:', error);
      throw error;
    }
  }

  async getActualCostById(id) {
    try {
      // Only use API
      const response = await fetch(`${this.apiUrl}/actual-costs/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Not found is not an error
        }
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        console.warn('Invalid data received from API for actual cost ID:', id);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error(
        `Gerçekleşen maliyet bilgisi alınırken hata (ID: ${id}):`,
        error
      );
      throw error;
    }
  }

  async getActualCostByQuoteId(quoteId) {
    try {
      // Only use API
      const response = await fetch(
        `${this.apiUrl}/actual-costs/quote/${quoteId}`
      );

      // Not found (404) is not an error for this method, just return null
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        console.warn('Invalid data received from API for quote ID:', quoteId);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error(
        `Teklif ID ${quoteId} için gerçekleşen maliyet bilgisi alınırken hata:`,
        error
      );
      return null; // Return null rather than throwing for this specific method
    }
  }

  // Get all actual costs - Simplified to only use API
  async getAllActualCosts() {
    try {
      console.log('Getting all actual costs from API...');

      const response = await fetch(`${this.apiUrl}/actual-costs`);

      if (!response.ok) {
        console.error(
          'Failed to fetch actual costs from API:',
          response.statusText
        );
        return [];
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.data)) {
        console.error('Invalid response format from API for actual costs');
        return [];
      }

      console.log(
        `Successfully retrieved ${data.data.length} actual costs from API`
      );
      return this.normalizeActualCostData(data.data);
    } catch (error) {
      console.error('Failed to get actual costs:', error);
      return [];
    }
  }

  // Helper method to normalize actual cost data
  normalizeActualCostData(costs) {
    if (!costs || !Array.isArray(costs)) {
      console.warn(
        'Invalid actual cost data received for normalization',
        costs
      );
      return [];
    }

    console.log('Normalizing actual cost data, count:', costs.length);
    return costs.map((cost) => {
      // Ensure we have consistent data structure
      return {
        ...cost,
        id: cost.id || 0,
        quote_id: cost.quote_id || 0,
        quote_amount:
          typeof cost.quote_amount === 'number'
            ? cost.quote_amount
            : parseFloat(cost.quote_amount || 0),
        actual_cost:
          typeof cost.actual_cost === 'number'
            ? cost.actual_cost
            : parseFloat(cost.actual_cost || 0),
        notes: cost.notes || '',
        created_at: cost.created_at || new Date().toISOString(),
        updated_at:
          cost.updated_at || cost.created_at || new Date().toISOString(),
      };
    });
  }
}

// Singleton instance
const dbService = new DatabaseService();
console.log('dbService oluşturuldu'); // Debug için
export default dbService;
