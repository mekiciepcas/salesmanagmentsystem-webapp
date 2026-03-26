-- Teklif Takibi ve Kar Marjı Analizi için Veritabanı Güncellemeleri
-- Bu migration dosyası quotes tablosuna kar marjı alanlarını ve customer_purchases tablosunu ekler

-- 1. Quotes tablosuna yeni alanlar ekle
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(15, 2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5, 2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS profit_amount NUMERIC(15, 2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cost_notes TEXT;

-- 2. Customer Purchase History (Müşteri Satın Alım Geçmişi) Tablosu
CREATE TABLE IF NOT EXISTS customer_purchases (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
    purchase_date DATE NOT NULL,
    purchase_amount NUMERIC(15, 2) NOT NULL,
    actual_cost NUMERIC(15, 2),
    profit_amount NUMERIC(15, 2),
    profit_margin NUMERIC(5, 2),
    delivery_date DATE,
    status VARCHAR(50) DEFAULT 'TAMAMLANDI',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler (Performans için)
CREATE INDEX IF NOT EXISTS idx_customer_purchases_customer_id ON customer_purchases(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_quote_id ON customer_purchases(quote_id);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_purchase_date ON customer_purchases(purchase_date);

-- 3. Mevcut onaylanan teklifler için gerçekleşen maliyet varsa kar marjını hesapla
UPDATE quotes 
SET profit_amount = total_price - actual_cost,
    profit_margin = CASE 
        WHEN total_price > 0 THEN ROUND(((total_price - actual_cost) / total_price) * 100, 2)
        ELSE 0
    END
WHERE status = 'ONAYLANDI' 
  AND actual_cost IS NOT NULL 
  AND total_price IS NOT NULL;

-- 4. Mevcut onaylanan teklifler için customer_purchases kayıtları oluştur (eğer yoksa)
INSERT INTO customer_purchases (customer_id, quote_id, purchase_date, purchase_amount, actual_cost, profit_amount, profit_margin, delivery_date, status)
SELECT 
    q.customer_id,
    q.id,
    q.purchase_date OR q.date,
    q.total_price,
    q.actual_cost,
    q.profit_amount,
    q.profit_margin,
    q.delivery_date,
    'TAMAMLANDI'
FROM quotes q
WHERE q.status = 'ONAYLANDI'
  AND q.actual_cost IS NOT NULL
  AND q.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_purchases cp WHERE cp.quote_id = q.id
  );
