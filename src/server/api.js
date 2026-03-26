require('dotenv').config({
  path: require('path').join(__dirname, '../../.env'),
});
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db/connection');
const { generateReferenceNo } = require('../utils/helpers');
const bcrypt = require('bcrypt');
const { JWT_SECRET, authenticate, requireAdmin } = require('./middleware/authMiddleware');
const webPlatform = require('./routes/webPlatform');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signAuthToken(userRow) {
  return jwt.sign(
    {
      sub: userRow.id,
      username: userRow.username,
      role: userRow.role || 'user',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

router.use(webPlatform);

// Hesaplama kaydetme endpoint'i
router.post('/calculations', async (req, res) => {
  try {
    const { customer_name, notes, items } = req.body;

    const item = items[0]; // Şimdilik tek ürün kaydediyoruz
    const reference_no = generateReferenceNo();

    const result = await db.query(
      `INSERT INTO Product_Table (
                "Ürün", 
                Maliyet, 
                Adet, 
                Toplam, 
                "Margin-1", 
                "Margin-2", 
                "Toplam-1", 
                "Toplam-2",
                customer_name,
                notes,
                reference_no
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        item.product_name,
        item.unit_price,
        item.quantity,
        item.total_price,
        item.margin_1,
        item.margin_2,
        item.margin_1_total,
        item.margin_2_total,
        customer_name,
        notes,
        reference_no,
      ]
    );

    res.json({
      success: true,
      reference_no,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Hesaplama kaydedilirken bir hata oluştu',
    });
  }
});

// Excel aktarma logları için endpoint
router.post('/export-logs', async (req, res) => {
  try {
    const {
      product_name,
      quantity,
      total_price,
      margin_1,
      margin_2,
      file_name,
      file_path,
    } = req.body;

    const reference_no = generateReferenceNo();

    const result = await db.query(
      `INSERT INTO export_logs (
                product_name,
                quantity,
                total_price,
                margin_1,
                margin_2,
                file_name,
                file_path,
                reference_no
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        product_name,
        quantity,
        total_price,
        margin_1,
        margin_2,
        file_name,
        file_path,
        reference_no,
      ]
    );

    res.json({
      success: true,
      reference_no,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Export log kayıt hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Export log kaydedilirken bir hata oluştu',
    });
  }
});

// Excel log kayıtlarını getirme endpoint'i
router.get('/export-logs', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM export_logs ORDER BY export_date DESC'
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Log kayıtları getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Log kayıtları alınırken bir hata oluştu',
    });
  }
});

// Login endpoint
router.post('/auth/login', async (req, res) => {
  console.log('Login request received:', req.body);

  const { username, password } = req.body;

  try {
    // Debug için önce basit bir yanıt döndürelim
    console.log('Processing login for:', username);

    const result = await db.query('SELECT * FROM users WHERE username = $1', [
      username,
    ]);

    console.log('Database result:', result.rows);

    if (result.rows.length === 0) {
      console.log('User not found');
      return res.status(401).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    console.log('Password validation:', validPassword);

    if (!validPassword) {
      console.log('Invalid password');
      return res.status(401).json({
        success: false,
        error: 'Geçersiz şifre',
      });
    }

    console.log('Login successful');
    const token = signAuthToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        fullName: user.full_name,
        department: user.department,
        email: user.email,
        role: user.role || 'user',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası',
    });
  }
});

router.get('/auth/me', authenticate, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT id, username, full_name, department, email, role FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (!r.rows.length) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }
    const user = r.rows[0];
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        fullName: user.full_name,
        department: user.department,
        email: user.email,
        role: user.role || 'user',
      },
    });
  } catch (error) {
    console.error('auth/me error:', error);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// Register endpoint (registrationKey: compare.md gizli kayıt — varsayılan adminadmin)
router.post('/auth/register', async (req, res) => {
  const {
    username,
    email,
    password,
    fullName,
    department,
    registrationKey,
  } = req.body;
  const expected = process.env.ADMIN_REGISTER_SECRET || 'adminadmin';
  if ((registrationKey || '') !== expected) {
    return res.status(403).json({
      success: false,
      error: 'Kayıt anahtarı geçersiz. Yetkili alandan kayıt açın.',
    });
  }

  try {
    // Email ve kullanıcı adı kontrolü
    const userCheck = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bu kullanıcı adı veya email zaten kullanımda',
      });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Yeni kullanıcı ekle
    const result = await db.query(
      `INSERT INTO users (username, email, password, full_name, department)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, username, full_name, department`,
      [username, email, hashedPassword, fullName, department]
    );

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Kayıt işlemi başarısız',
    });
  }
});

router.get('/auth/admin-check', authenticate, requireAdmin, (req, res) => {
  res.json({ success: true, role: 'admin' });
});

/** prepare-quote.js (web) ile uyumlu teklif kaydı */
router.post('/quotes/save-prepare', authenticate, async (req, res) => {
  try {
    const quoteData = req.body;
    if (!quoteData?.quote?.number) {
      return res.status(400).json({
        success: false,
        error: 'Teklif numarası gerekli',
      });
    }
    const { number, total_price } = quoteData.quote;
    const details =
      `${quoteData.customer?.name || ''} - ${quoteData.customer?.contact || ''}`.trim() ||
      number;
    const itemsJson = JSON.stringify(quoteData.cart || []);
    const dateStr = new Date().toISOString().slice(0, 10);

    const result = await db.query(
      `INSERT INTO quotes (
          number, date, customer_id, prepared_by, status, total_price, details, items, created_at
        ) VALUES ($1, $2::date, NULL, $3, $4, $5, $6, $7::jsonb, NOW())
        RETURNING id`,
      [
        number,
        dateStr,
        req.user.sub,
        'HAZIRLANDI',
       Number(total_price) || 0,
        details,
        itemsJson,
      ]
    );

    res.json({ success: true, quoteId: result.rows[0].id });
  } catch (error) {
    console.error('save-prepare', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Teklif kaydetme endpoint'i
router.post('/quotes', async (req, res) => {
  try {
    const {
      number,
      date,
      customer_id,
      prepared_by,
      user_name,
      status,
      total_price,
      details,
      items,
    } = req.body;

    // Zorunlu alanlar
    if (!number) {
      return res.status(400).json({
        success: false,
        error: 'Teklif numarası zorunludur',
      });
    }

    // JSON verileri için
    const itemsJson = items ? JSON.stringify(items) : null;

    // prepared_by değerini kontrol et
    let preparedByValue = prepared_by;

    // Eğer prepared_by "Bilinmeyen Kullanıcı" ise ve user_name varsa, user_name'i kullan
    if (preparedByValue === 'Bilinmeyen Kullanıcı' && user_name) {
      preparedByValue = user_name;
      console.log('Kullanıcı adı ile değiştiriliyor:', preparedByValue);
    }
    // Eğer prepared_by sayısal değil veya boşsa
    else if (!preparedByValue || isNaN(parseInt(preparedByValue))) {
      // Önce sistemdeki bir kullanıcıyı bulmaya çalışalım (Varsayılan olarak Ahmet Yilmaz)
      try {
        const userCheck = await db.query(
          'SELECT id FROM users WHERE full_name = $1 OR username = $1',
          ['Ahmet Yilmaz']
        );

        if (userCheck.rows.length > 0) {
          // Ahmet Yilmaz kullanıcısını varsayılan olarak kullan
          preparedByValue = userCheck.rows[0].id;
          console.log(
            'Varsayılan kullanıcı kullanılıyor (Ahmet Yilmaz):',
            preparedByValue
          );
        } else if (
          typeof preparedByValue === 'string' &&
          preparedByValue.trim() !== ''
        ) {
          // Gelen değer varsa olduğu gibi kullan
          console.log('Gelen hazırlayan değeri kullanılıyor:', preparedByValue);
        } else {
          // Başka bir kaydedilmiş kullanıcı var mı diye kontrol et
          const anyUserCheck = await db.query(
            'SELECT id, full_name FROM users LIMIT 1'
          );

          if (anyUserCheck.rows.length > 0) {
            // İlk kullanıcıyı kullan
            preparedByValue = anyUserCheck.rows[0].id;
            console.log(
              'İlk kullanıcı kullanılıyor:',
              anyUserCheck.rows[0].full_name
            );
          } else {
            // Hiçbir kullanıcı yoksa "Ahmet Yilmaz" olarak string şeklinde kaydet
            preparedByValue = 'Ahmet Yilmaz';
            console.log(
              'Hiç kullanıcı bulunamadı, "Ahmet Yilmaz" olarak kaydediliyor'
            );
          }
        }
      } catch (userError) {
        console.error('Kullanıcı kontrolü başarısız:', userError);
        preparedByValue = 'Ahmet Yilmaz'; // Hata durumunda Ahmet Yilmaz olarak kaydet
      }
    }

    console.log('Teklif kaydediliyor, hazırlayan:', preparedByValue);

    const result = await db.query(
      `INSERT INTO quotes (
                number, 
                date, 
                customer_id, 
                prepared_by, 
                status, 
                total_price,
                details,
                items,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [
        number,
        date,
        customer_id,
        preparedByValue,
        status || 'HAZIRLANDI',
        total_price,
        details,
        itemsJson,
      ]
    );

    // Teklif kaydedildikten sonra, tam verilerle geri dön
    const fullQuoteData = await db.query(
      `
            SELECT q.*, c.company_name as customer_name, 
            CASE 
                WHEN q.prepared_by ~ E'^\\d+$' THEN u.full_name
                ELSE q.prepared_by
            END as prepared_by_name
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN users u ON 
                CASE 
                    WHEN q.prepared_by ~ E'^\\d+$' THEN q.prepared_by::integer = u.id
                    ELSE false
                END
            WHERE q.id = $1
        `,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      data: fullQuoteData.rows[0] || result.rows[0],
    });
  } catch (error) {
    console.error('Teklif ekleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif eklenirken bir hata oluştu',
    });
  }
});

router.get('/quotes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sort = req.query.sort || 'id';
    const direction = req.query.direction || 'desc';

    console.log(
      `Fetching quotes with limit: ${limit}, offset: ${offset}, search: "${search}"`
    );

    // Sorgu hazırlama - daha basit bir join kullanarak
    let queryText = `
            SELECT q.*, c.company_name as customer_name,
            c.country as customer_country,
            COALESCE(u.full_name, q.prepared_by) as prepared_by_name
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN users u ON 
                CASE 
                    WHEN q.prepared_by ~ E'^\\d+$' THEN q.prepared_by::integer = u.id
                    ELSE false
                END
        `;

    const countQueryText = `
            SELECT COUNT(*) FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
        `;

    // Arama sorgusu varsa
    if (search) {
      queryText += ` WHERE q.number ILIKE $1 OR c.company_name ILIKE $1`;
    }

    // Sıralama
    queryText += ` ORDER BY ${sort} ${direction}`;

    // Sayfalama - if limit is very large, still apply it but log a warning
    if (limit > 5000) {
      console.log(
        `Warning: Large limit requested (${limit}). This might affect performance.`
      );
    }

    queryText += ` LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`;

    // Sorguyu çalıştır
    const queryParams = search
      ? [`%${search}%`, limit, offset]
      : [limit, offset];

    console.log('Executing query with params:', queryParams);
    const result = await db.query(queryText, queryParams);

    console.log(`Query returned ${result.rows.length} quotes`);

    // Sonuçların hiç biri yoksa boş dizi dön
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Sayfalama için toplam kayıt sayısı
    const countResult = await db.query(countQueryText);
    const totalCount = parseInt(countResult.rows[0].count);

    console.log(`Total quotes in database: ${totalCount}`);

    // Kullanıcı bilgilerini yükle
    let users = [];
    try {
      const usersResult = await db.query(
        'SELECT id, username, full_name, department FROM users'
      );
      users = usersResult.rows;
      console.log(`${users.length} kullanıcı bilgisi yüklendi`);
    } catch (error) {
      console.warn('Kullanıcı bilgileri yüklenirken hata:', error);
    }

    // Teklif verileri için kullanıcı adlarını ekleyip iyileştir
    const enhancedQuotes = result.rows.map((quote) => {
      // Kullanıcı adı kontrolü
      if (quote.prepared_by && !quote.prepared_by_name) {
        // Sayısal ID mi kontrol et
        if (!isNaN(parseInt(quote.prepared_by))) {
          const userId = parseInt(quote.prepared_by);
          const user = users.find((u) => u.id === userId);
          if (user) {
            quote.prepared_by_name = user.full_name;
          }
        }
      }
      return quote;
    });

    console.log(`Enhanced quotes: ${enhancedQuotes.length}`);

    res.json({
      success: true,
      data: enhancedQuotes,
      pagination: {
        total: totalCount,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Teklifleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Teklifler alınırken bir hata oluştu',
    });
  }
});

router.put('/quotes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await db.query(
      'UPDATE quotes SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Teklif durumu güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif durumu güncellenemedi',
    });
  }
});

router.delete('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM quotes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Teklif başarıyla silindi',
    });
  } catch (error) {
    console.error('Teklif silme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif silinemedi',
    });
  }
});

// =========== Veri Yönetimi API Endpoints ===========

// Sağlık Kontrolü Endpoint'i
router.get('/health', async (req, res) => {
  try {
    // Veritabanı bağlantı kontrolü
    await db.query('SELECT 1');

    res.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      db: 'disconnected',
      error: error.message,
    });
  }
});

// ========== Kullanıcılar (Users) Endpoints ==========

// Tüm kullanıcıları getir
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sort = req.query.sort || 'id';
    const direction = req.query.direction || 'desc';

    let query =
      'SELECT id, username, full_name, email, department, created_at FROM users';
    const countQuery = 'SELECT COUNT(*) FROM users';

    // Arama sorgusu varsa
    if (search) {
      query += ` WHERE username ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1`;
    }

    // Sıralama
    query += ` ORDER BY ${sort} ${direction}`;

    // Sayfalama
    query += ` LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`;

    // Sorguyu çalıştır
    const queryParams = search
      ? [`%${search}%`, limit, offset]
      : [limit, offset];

    const result = await db.query(query, queryParams);
    const countResult = await db.query(countQuery);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    console.log(`Kullanıcılar alındı: ${result.rows.length} kayıt`);

    res.json({
      success: true,
      data: result.rows,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Kullanıcı listeleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcılar alınırken bir hata oluştu',
    });
  }
});

// Tek bir kullanıcıyı getir
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, username, full_name, email, department, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Kullanıcı getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcı alınırken bir hata oluştu',
    });
  }
});

// ========== Müşteri Endpoints ==========

// Tüm müşterileri getir
router.get('/customers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sort = req.query.sort || 'id';
    const direction = req.query.direction || 'desc';

    let query = 'SELECT * FROM customers';
    const countQuery = 'SELECT COUNT(*) FROM customers';

    // Arama sorgusu varsa
    if (search) {
      query += ` WHERE company_name ILIKE $1 OR name ILIKE $1 OR consultant_email ILIKE $1`;
    }

    // Sıralama
    query += ` ORDER BY ${sort} ${direction}`;

    // Sayfalama
    query += ` LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`;

    // Sorguyu çalıştır
    const queryParams = search
      ? [`%${search}%`, limit, offset]
      : [limit, offset];

    const result = await db.query(query, queryParams);
    const countResult = await db.query(countQuery);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: result.rows,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Müşteri listeleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteriler alınırken bir hata oluştu',
    });
  }
});

// Tek bir müşteriyi getir
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM customers WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Müşteri bulunamadı',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Müşteri getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri alınırken bir hata oluştu',
    });
  }
});

// Yeni müşteri ekle
router.post('/customers', async (req, res) => {
  try {
    const {
      company_name,
      name,
      consultant_email,
      consultant_phone,
      address,
      country,
      city,
      category,
      status,
    } = req.body;

    // Zorunlu alanlar
    if (!company_name) {
      return res.status(400).json({
        success: false,
        error: 'Firma adı zorunludur',
      });
    }

    const result = await db.query(
      `INSERT INTO customers (
                company_name, 
                name, 
                consultant_email, 
                consultant_phone, 
                address,
                country,
                city,
                category,
                status,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *`,
      [
        company_name,
        name,
        consultant_email,
        consultant_phone,
        address,
        country || 'Türkiye',
        city,
        category,
        status || 'Aktif',
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Müşteri ekleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri eklenirken bir hata oluştu',
    });
  }
});

// Müşteri güncelle
router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_name,
      name,
      consultant_email,
      consultant_phone,
      address,
      country,
      city,
      category,
      status,
    } = req.body;

    // Zorunlu alanlar
    if (!company_name) {
      return res.status(400).json({
        success: false,
        error: 'Firma adı zorunludur',
      });
    }

    const result = await db.query(
      `UPDATE customers SET 
                company_name = $1, 
                name = $2, 
                consultant_email = $3, 
                consultant_phone = $4, 
                address = $5,
                country = $6,
                city = $7,
                category = $8,
                status = $9,
                updated_at = NOW()
            WHERE id = $10 RETURNING *`,
      [
        company_name,
        name,
        consultant_email,
        consultant_phone,
        address,
        country || 'Türkiye',
        city,
        category,
        status || 'Aktif',
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Müşteri bulunamadı',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Müşteri güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri güncellenirken bir hata oluştu',
    });
  }
});

// Müşteri sil
router.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Önce ilişkili kayıtlar var mı kontrol et
    const relatedQuotes = await db.query(
      'SELECT COUNT(*) FROM quotes WHERE customer_id = $1',
      [id]
    );
    const relatedMeetings = await db.query(
      'SELECT COUNT(*) FROM customer_meetings WHERE customer_id = $1',
      [id]
    );
    const relatedNotes = await db.query(
      'SELECT COUNT(*) FROM customer_notes WHERE customer_id = $1',
      [id]
    );

    // customer_purchases tablosu varsa kontrol et
    let relatedPurchases = { rows: [{ count: '0' }] };
    try {
      relatedPurchases = await db.query(
        'SELECT COUNT(*) FROM customer_purchases WHERE customer_id = $1',
        [id]
      );
    } catch (error) {
      // Tablo henüz oluşturulmamış olabilir, devam et
      console.warn('customer_purchases tablosu kontrol edilemedi:', error);
    }

    const totalRelatedRecords =
      parseInt(relatedQuotes.rows[0].count) +
      parseInt(relatedMeetings.rows[0].count) +
      parseInt(relatedNotes.rows[0].count) +
      parseInt(relatedPurchases.rows[0].count);

    if (totalRelatedRecords > 0) {
      return res.status(400).json({
        success: false,
        error:
          'Bu müşteri ile ilişkili kayıtlar var. Önce onları silmelisiniz.',
      });
    }

    const result = await db.query(
      'DELETE FROM customers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Müşteri bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Müşteri başarıyla silindi',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Müşteri silme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Müşteri silinirken bir hata oluştu',
    });
  }
});

// ========== Müşteri Satın Alım ve Kar Marjı Analizi Endpoints ==========

// Müşteri satın alım geçmişi
router.get('/customers/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        cp.*,
        q.number as quote_number,
        q.date as quote_date
      FROM customer_purchases cp
      LEFT JOIN quotes q ON cp.quote_id = q.id
      WHERE cp.customer_id = $1
      ORDER BY cp.purchase_date DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    // Eğer tablo henüz oluşturulmamışsa boş dizi dön
    if (error.code === '42P01') {
      return res.json({
        success: true,
        data: [],
        message: 'customer_purchases tablosu henüz oluşturulmamış',
      });
    }
    console.error('Müşteri satın alım geçmişi hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Satın alım geçmişi alınırken bir hata oluştu',
    });
  }
});

// Müşteri kar marjı özeti
router.get('/customers/:id/profit-summary', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        COUNT(*) as purchase_count,
        COALESCE(SUM(purchase_amount), 0) as total_revenue,
        COALESCE(SUM(actual_cost), 0) as total_cost,
        COALESCE(SUM(profit_amount), 0) as total_profit,
        CASE 
          WHEN SUM(purchase_amount) > 0 
          THEN ROUND((SUM(profit_amount) / SUM(purchase_amount)) * 100, 2)
          ELSE 0
        END as average_margin
      FROM customer_purchases
      WHERE customer_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows[0] || {
        purchase_count: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        average_margin: 0,
      },
    });
  } catch (error) {
    // Eğer tablo henüz oluşturulmamışsa varsayılan değerler dön
    if (error.code === '42P01') {
      return res.json({
        success: true,
        data: {
          purchase_count: 0,
          total_revenue: 0,
          total_cost: 0,
          total_profit: 0,
          average_margin: 0,
        },
      });
    }
    console.error('Müşteri kar marjı özeti hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kar marjı özeti alınırken bir hata oluştu',
    });
  }
});

// Tüm müşterilerin kar marjı analizi
router.get('/customers/profit-analysis', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        c.id as customer_id,
        c.company_name as customer_name,
        COUNT(cp.id) as purchase_count,
        COALESCE(SUM(cp.purchase_amount), 0) as total_revenue,
        COALESCE(SUM(cp.profit_amount), 0) as total_profit,
        CASE 
          WHEN SUM(cp.purchase_amount) > 0 
          THEN ROUND((SUM(cp.profit_amount) / SUM(cp.purchase_amount)) * 100, 2)
          ELSE 0
        END as average_margin
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customer_id
      GROUP BY c.id, c.company_name
      HAVING COUNT(cp.id) > 0
      ORDER BY total_profit DESC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    // Eğer tablo henüz oluşturulmamışsa boş dizi dön
    if (error.code === '42P01') {
      return res.json({
        success: true,
        data: [],
        message: 'customer_purchases tablosu henüz oluşturulmamış',
      });
    }
    console.error('Kar marjı analizi hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kar marjı analizi alınırken bir hata oluştu',
    });
  }
});

// Tek bir teklifi getir
router.get('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
            SELECT q.*, c.company_name as customer_name, 
            CASE 
                WHEN q.prepared_by ~ E'^\\d+$' THEN u.full_name
                ELSE q.prepared_by
            END as prepared_by_name
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN users u ON 
                CASE 
                    WHEN q.prepared_by ~ E'^\\d+$' THEN q.prepared_by::integer = u.id
                    ELSE false
                END
            WHERE q.id = $1
        `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Teklif getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif alınırken bir hata oluştu',
    });
  }
});

// Teklif güncelle (gerçekleşen maliyet dahil)
router.put('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      number,
      date,
      customer_id,
      prepared_by,
      status,
      total_price,
      details,
      items,
      actual_cost,
      purchase_date,
      delivery_date,
      notes,
    } = req.body;

    // Zorunlu alanlar
    if (!number) {
      return res.status(400).json({
        success: false,
        error: 'Teklif numarası zorunludur',
      });
    }

    // JSON verileri için
    const itemsJson = items ? JSON.stringify(items) : null;

    // prepared_by değerini kontrol et
    let preparedByValue = prepared_by;

    // Eğer prepared_by sayısal değil veya boşsa
    if (!preparedByValue || isNaN(parseInt(preparedByValue))) {
      // Önce mevcut teklifi kontrol edelim
      const existingQuote = await db.query(
        'SELECT prepared_by FROM quotes WHERE id = $1',
        [id]
      );

      if (existingQuote.rows.length > 0 && existingQuote.rows[0].prepared_by) {
        // Mevcut değeri koru
        preparedByValue = existingQuote.rows[0].prepared_by;
        console.log('Mevcut hazırlayan bilgisi korunuyor:', preparedByValue);
      } else {
        // Varsayılan olarak Ahmet Yilmaz'ı bulmaya çalışalım
        try {
          const userCheck = await db.query(
            'SELECT id FROM users WHERE full_name = $1 OR username = $1',
            ['Ahmet Yilmaz']
          );

          if (userCheck.rows.length > 0) {
            // Ahmet Yilmaz kullanıcısını varsayılan olarak kullan
            preparedByValue = userCheck.rows[0].id;
            console.log(
              'Varsayılan kullanıcı kullanılıyor (Ahmet Yilmaz):',
              preparedByValue
            );
          } else if (
            typeof preparedByValue === 'string' &&
            preparedByValue.trim() !== ''
          ) {
            // Gelen değer varsa olduğu gibi kullan
            console.log(
              'Gelen hazırlayan değeri kullanılıyor:',
              preparedByValue
            );
          } else {
            // Başka bir kaydedilmiş kullanıcı var mı diye kontrol et
            const anyUserCheck = await db.query(
              'SELECT id, full_name FROM users LIMIT 1'
            );

            if (anyUserCheck.rows.length > 0) {
              // İlk kullanıcıyı kullan
              preparedByValue = anyUserCheck.rows[0].id;
              console.log(
                'İlk kullanıcı kullanılıyor:',
                anyUserCheck.rows[0].full_name
              );
            } else {
              // Hiçbir kullanıcı yoksa "Ahmet Yilmaz" olarak string şeklinde kaydet
              preparedByValue = 'Ahmet Yilmaz';
              console.log(
                'Hiç kullanıcı bulunamadı, "Ahmet Yilmaz" olarak kaydediliyor'
              );
            }
          }
        } catch (userError) {
          console.error('Kullanıcı kontrolü başarısız:', userError);
          preparedByValue = 'Ahmet Yilmaz'; // Hata durumunda Ahmet Yilmaz olarak kaydet
        }
      }
    }

    console.log('Teklif güncelleniyor, hazırlayan:', preparedByValue);

    // Gerçekleşen maliyet varsa kar marjını hesapla
    let profit_amount = null;
    let profit_margin = null;
    
    if (actual_cost !== undefined && actual_cost !== null && total_price) {
      profit_amount = parseFloat(total_price) - parseFloat(actual_cost);
      profit_margin = total_price > 0 
        ? ((profit_amount / parseFloat(total_price)) * 100).toFixed(2)
        : 0;
    }

    // Güncelleme sorgusu - actual_cost ve profit alanlarını ekle
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (number !== undefined) {
      updateFields.push(`number = $${paramIndex++}`);
      updateValues.push(number);
    }
    if (date !== undefined) {
      updateFields.push(`date = $${paramIndex++}`);
      updateValues.push(date);
    }
    if (customer_id !== undefined) {
      updateFields.push(`customer_id = $${paramIndex++}`);
      updateValues.push(customer_id);
    }
    if (preparedByValue !== undefined) {
      updateFields.push(`prepared_by = $${paramIndex++}`);
      updateValues.push(preparedByValue);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status || 'HAZIRLANDI');
    }
    if (total_price !== undefined) {
      updateFields.push(`total_price = $${paramIndex++}`);
      updateValues.push(total_price);
    }
    if (details !== undefined) {
      updateFields.push(`details = $${paramIndex++}`);
      updateValues.push(details);
    }
    if (items !== undefined) {
      updateFields.push(`items = $${paramIndex++}`);
      updateValues.push(itemsJson);
    }
    if (actual_cost !== undefined) {
      updateFields.push(`actual_cost = $${paramIndex++}`);
      updateValues.push(actual_cost);
    }
    if (profit_amount !== null) {
      updateFields.push(`profit_amount = $${paramIndex++}`);
      updateValues.push(profit_amount);
    }
    if (profit_margin !== null) {
      updateFields.push(`profit_margin = $${paramIndex++}`);
      updateValues.push(profit_margin);
    }
    if (purchase_date !== undefined) {
      updateFields.push(`purchase_date = $${paramIndex++}`);
      updateValues.push(purchase_date);
    }
    if (delivery_date !== undefined) {
      updateFields.push(`delivery_date = $${paramIndex++}`);
      updateValues.push(delivery_date);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await db.query(
      `UPDATE quotes SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    // Teklif güncellendikten sonra, tam verilerle geri dön
    const fullQuoteData = await db.query(
      `
            SELECT q.*, c.company_name as customer_name, 
            CASE 
                WHEN q.prepared_by ~ E'^\\d+$' THEN u.full_name
                ELSE q.prepared_by
            END as prepared_by_name
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN users u ON 
                CASE 
                    WHEN q.prepared_by ~ E'^\\d+$' THEN q.prepared_by::integer = u.id
                    ELSE false
                END
            WHERE q.id = $1
        `,
      [id]
    );

    const updatedQuote = fullQuoteData.rows[0] || result.rows[0];

    // Eğer gerçekleşen maliyet girildiyse ve müşteri varsa, customer_purchases tablosuna kayıt ekle/güncelle
    if (actual_cost !== undefined && actual_cost !== null && updatedQuote.customer_id && updatedQuote.total_price) {
      try {
        // Mevcut kayıt var mı kontrol et
        const existingPurchase = await db.query(
          'SELECT id FROM customer_purchases WHERE quote_id = $1',
          [id]
        );

        if (existingPurchase.rows.length > 0) {
          // Mevcut kaydı güncelle
          await db.query(
            `UPDATE customer_purchases SET
              purchase_amount = $1,
              actual_cost = $2,
              profit_amount = $3,
              profit_margin = $4,
              purchase_date = $5,
              delivery_date = $6,
              updated_at = NOW()
            WHERE quote_id = $7`,
            [
              updatedQuote.total_price,
              actual_cost,
              profit_amount,
              profit_margin,
              purchase_date || updatedQuote.date,
              delivery_date,
              id
            ]
          );
        } else {
          // Yeni kayıt ekle
          await db.query(
            `INSERT INTO customer_purchases (
              customer_id, quote_id, purchase_date, purchase_amount,
              actual_cost, profit_amount, profit_margin, delivery_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'TAMAMLANDI')`,
            [
              updatedQuote.customer_id,
              id,
              purchase_date || updatedQuote.date || new Date(),
              updatedQuote.total_price,
              actual_cost,
              profit_amount,
              profit_margin,
              delivery_date
            ]
          );
        }
      } catch (purchaseError) {
        console.warn('Customer purchase kaydı oluşturulurken hata (tablo henüz oluşturulmamış olabilir):', purchaseError);
        // Hata olsa bile teklif güncellemesi başarılı sayılır
      }
    }

    res.json({
      success: true,
      data: updatedQuote,
    });
  } catch (error) {
    console.error('Teklif güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif güncellenirken bir hata oluştu',
    });
  }
});

// Teklif sil
router.delete('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Önce ilişkili kayıtlar var mı kontrol et
    const relatedRevisions = await db.query(
      'SELECT COUNT(*) FROM quote_revisions WHERE quote_id = $1',
      [id]
    );

    if (parseInt(relatedRevisions.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error:
          'Bu teklif ile ilişkili revizyonlar var. Önce onları silmelisiniz.',
      });
    }

    const result = await db.query(
      'DELETE FROM quotes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teklif bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Teklif başarıyla silindi',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Teklif silme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Teklif silinirken bir hata oluştu',
    });
  }
});

// ========== Diğer tabloların CRUD endpoint'leri ==========

// Burada Transaction, Quote Revision, Customer Meeting, Customer Notes, ve Users
// tabloları için benzer CRUD endpoint'leri eklenmeli.

// Örnek olarak görüşmeler için endpoint'ler:

// Görüşmeler listesi
router.get('/customer_meetings', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sort = req.query.sort || 'meeting_date';
    const direction = req.query.direction || 'desc';

    let queryText = `
            SELECT m.*, c.company_name as customer_name, u.full_name as created_by_name
            FROM customer_meetings m
            LEFT JOIN customers c ON m.customer_id = c.id
            LEFT JOIN users u ON m.created_by = u.id
        `;

    const countQueryText = `SELECT COUNT(*) FROM customer_meetings`;

    // Arama sorgusu varsa
    if (search) {
      queryText += ` WHERE c.company_name ILIKE $1 OR m.meeting_notes ILIKE $1`;
    }

    // Sıralama
    queryText += ` ORDER BY ${sort} ${direction}`;

    // Sayfalama
    queryText += ` LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`;

    // Sorguyu çalıştır
    const queryParams = search
      ? [`%${search}%`, limit, offset]
      : [limit, offset];

    const result = await db.query(queryText, queryParams);
    const countResult = await db.query(countQueryText);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: result.rows,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Görüşme listeleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Görüşmeler alınırken bir hata oluştu',
    });
  }
});

// Görüşme kaydet
router.post('/customer_meetings', async (req, res) => {
  try {
    const {
      customer_id,
      meeting_date,
      meeting_type,
      meeting_location,
      meeting_outcome,
      meeting_notes,
      created_by,
    } = req.body;

    // Zorunlu alanlar
    if (!customer_id || !meeting_date || !created_by) {
      return res.status(400).json({
        success: false,
        error: 'Müşteri, tarih ve oluşturan alanları zorunludur',
      });
    }

    const result = await db.query(
      `INSERT INTO customer_meetings (
                customer_id, 
                meeting_date, 
                meeting_type, 
                meeting_location, 
                meeting_outcome,
                meeting_notes,
                created_by,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [
        customer_id,
        meeting_date,
        meeting_type,
        meeting_location,
        meeting_outcome || 'Beklemede',
        meeting_notes,
        created_by,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Görüşme ekleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Görüşme eklenirken bir hata oluştu',
    });
  }
});

// Müşteri notu ekle
router.post('/customer_notes', async (req, res) => {
  try {
    const { customer_id, note_text, user_id } = req.body;

    // Zorunlu alanlar
    if (!customer_id || !note_text) {
      return res.status(400).json({
        success: false,
        error: 'Müşteri ID ve not metni zorunludur',
      });
    }

    const result = await db.query(
      `INSERT INTO customer_notes (
                customer_id, 
                note_text, 
                user_id,
                created_at
            ) VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [customer_id, note_text, user_id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Not ekleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Not eklenirken bir hata oluştu',
    });
  }
});

// Müşteri notu güncelle
router.put('/customer_notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { note_text, user_id } = req.body;

    // Zorunlu alanlar
    if (!note_text) {
      return res.status(400).json({
        success: false,
        error: 'Not metni zorunludur',
      });
    }

    const result = await db.query(
      `UPDATE customer_notes SET 
                note_text = $1, 
                user_id = $2,
                updated_at = NOW()
            WHERE id = $3 RETURNING *`,
      [note_text, user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not bulunamadı',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Not güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Not güncellenirken bir hata oluştu',
    });
  }
});

// Müşteri notu sil
router.delete('/customer_notes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM customer_notes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Not başarıyla silindi',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Not silme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Not silinirken bir hata oluştu',
    });
  }
});

// Müşteri notlarını getir
router.get('/customer_notes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sort = req.query.sort || 'created_at';
    const direction = req.query.direction || 'desc';

    let queryText = `
            SELECT n.*, c.company_name as customer_name, u.full_name as user_name
            FROM customer_notes n
            LEFT JOIN customers c ON n.customer_id = c.id
            LEFT JOIN users u ON n.user_id = u.id
        `;

    const countQueryText = `SELECT COUNT(*) FROM customer_notes`;

    // Arama sorgusu varsa
    if (search) {
      queryText += ` WHERE n.note_text ILIKE $1 OR c.company_name ILIKE $1`;
    }

    // Sıralama
    queryText += ` ORDER BY ${sort} ${direction}`;

    // Sayfalama
    queryText += ` LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`;

    // Sorguyu çalıştır
    const queryParams = search
      ? [`%${search}%`, limit, offset]
      : [limit, offset];

    const result = await db.query(queryText, queryParams);
    const countResult = await db.query(countQueryText);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: result.rows,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Not listeleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Notlar alınırken bir hata oluştu',
    });
  }
});

// ========== Actual Costs Endpoints ==========

// Get all actual costs
router.get('/actual-costs', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM actual_costs ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching actual costs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve actual costs',
    });
  }
});

// Get actual cost by quote ID - IMPORTANT: More specific route must come before generic route
router.get('/actual-costs/quote/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const result = await db.query(
      'SELECT * FROM actual_costs WHERE quote_id = $1',
      [quoteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No actual cost found for this quote',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching actual cost by quote ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve actual cost',
    });
  }
});

// Get a specific actual cost by ID
router.get('/actual-costs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM actual_costs WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Actual cost not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching actual cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve actual cost',
    });
  }
});

// Create a new actual cost
router.post('/actual-costs', async (req, res) => {
  try {
    console.log('ACTUAL COST POST REQUEST RECEIVED:', req.body);
    const { quote_id, quote_amount, actual_cost, notes } = req.body;

    if (!quote_id || actual_cost === undefined) {
      console.error('VALIDATION ERROR: Missing required fields', {
        quote_id,
        actual_cost,
      });
      return res.status(400).json({
        success: false,
        error: 'Quote ID and actual cost are required',
      });
    }

    // Check if an entry already exists for this quote
    console.log('Checking for existing cost record for quote_id:', quote_id);
    const existingResult = await db.query(
      'SELECT id FROM actual_costs WHERE quote_id = $1',
      [quote_id]
    );

    if (existingResult.rows.length > 0) {
      // Update the existing record instead
      const existingId = existingResult.rows[0].id;
      console.log(
        'Found existing cost record with ID:',
        existingId,
        'Updating...'
      );
      const updateResult = await db.query(
        `UPDATE actual_costs
                 SET quote_amount = $1, 
                     actual_cost = $2, 
                     notes = $3, 
                     updated_at = NOW()
                 WHERE id = $4 
                 RETURNING *`,
        [quote_amount, actual_cost, notes, existingId]
      );

      console.log(
        'Successfully updated existing cost record:',
        updateResult.rows[0]
      );
      return res.json({
        success: true,
        data: updateResult.rows[0],
        message: 'Existing actual cost updated',
      });
    }

    // Create new record
    console.log('No existing record found. Creating new actual cost record...');
    const result = await db.query(
      `INSERT INTO actual_costs (quote_id, quote_amount, actual_cost, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [quote_id, quote_amount, actual_cost, notes]
    );

    console.log('Successfully created new actual cost record:', result.rows[0]);
    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating actual cost:', error);
    console.error('Error details:', {
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      message: error.message,
      hint: error.hint,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create actual cost',
      details: error.message,
    });
  }
});

// Update an existing actual cost
router.put('/actual-costs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quote_id, quote_amount, actual_cost, notes } = req.body;

    if (!quote_id || actual_cost === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Quote ID and actual cost are required',
      });
    }

    const result = await db.query(
      `UPDATE actual_costs
             SET quote_id = $1, 
                 quote_amount = $2, 
                 actual_cost = $3, 
                 notes = $4, 
                 updated_at = NOW()
             WHERE id = $5 
             RETURNING *`,
      [quote_id, quote_amount, actual_cost, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Actual cost not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating actual cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update actual cost',
    });
  }
});

// Delete an actual cost
router.delete('/actual-costs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM actual_costs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Actual cost not found',
      });
    }

    res.json({
      success: true,
      message: 'Actual cost deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting actual cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete actual cost',
    });
  }
});

module.exports = router;
