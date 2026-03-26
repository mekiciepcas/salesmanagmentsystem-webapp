# Rectifier Pricing Sistemi için Excel Dosyaları Rehberi

Bu doküman, Rectifier Pricing sisteminin otomatik çalışması için oluşturulması gereken Excel dosyalarını ve yapılarını açıklamaktadır.

## 📋 Genel Bakış

Sistem, kullanıcı girdilerine göre otomatik olarak parçaları seçer ve Excel dosyalarından fiyatları çeker. Her parça kategorisi için ayrı bir Excel dosyası veya tek bir Excel dosyasında farklı sayfalar (sheets) kullanılabilir.

## 📁 Gerekli Excel Dosyaları

### 1. **Klemens ve Bara Fiyat Listesi** (`Terminals.xlsx` veya `Rectifier.xlsx` içinde "Terminals" sayfası)

**Amaç:** Çıkış ve giriş klemenslerinin/bara seçimi ve fiyatlandırması

**Kolon Yapısı:**
| Product Type | Product Name | Current Rating (A) | Type | Cost | Stock Code |
|--------------|--------------|-------------------|------|------|------------|
| Terminal | 2.5mm Klemens | 20 | Klemens | 15.50 | KL-2.5 |
| Terminal | 4.0mm Klemens | 25 | Klemens | 18.75 | KL-4.0 |
| Terminal | 6.0mm Klemens | 33 | Klemens | 22.00 | KL-6.0 |
| Terminal | 10.0mm Klemens | 50 | Klemens | 28.50 | KL-10.0 |
| Terminal | 16.0mm Klemens | 60 | Klemens | 35.00 | KL-16.0 |
| Terminal | 25.0mm Klemens | 85 | Klemens | 45.00 | KL-25.0 |
| Terminal | 35.0mm Klemens | 110 | Klemens | 58.00 | KL-35.0 |
| Terminal | 50.0mm Klemens | 132 | Klemens | 72.00 | KL-50.0 |
| Terminal | 15x2mm Bara | 155 | Bara | 85.00 | BR-15x2 |
| Terminal | 20x2mm Bara | 205 | Bara | 95.00 | BR-20x2 |
| Terminal | 20x3mm Bara | 245 | Bara | 110.00 | BR-20x3 |
| Terminal | 20x5mm Bara | 325 | Bara | 135.00 | BR-20x5 |
| Terminal | 30x3mm Bara | 350 | Bara | 150.00 | BR-30x3 |
| Terminal | 30x5mm Bara | 450 | Bara | 175.00 | BR-30x5 |
| Terminal | 40x3mm Bara | 460 | Bara | 190.00 | BR-40x3 |
| Terminal | 40x5mm Bara | 600 | Bara | 220.00 | BR-40x5 |
| Terminal | 40x10mm Bara | 835 | Bara | 280.00 | BR-40x10 |

**Seçim Mantığı:** Sistem, çıkış klemensi için çıkış akımına göre bir üst değeri, giriş klemensi için giriş akımına göre bir üst değeri seçer  seçer (örnek: 100A için 110A kapasiteli 35mm Klemens)

---

### 2. **MCB ve MCCB Fiyat Listesi** (`CircuitBreakers.xlsx` veya `Rectifier.xlsx` içinde "CircuitBreakers" sayfası)

**Amaç:** Giriş, çıkış ve batarya kesicilerinin seçimi ve fiyatlandırması

**Kolon Yapısı:**
| Product Type | Product Name | Poles | Current Rating (A) | Type | Cost | Stock Code |
|--------------|--------------|-------|-------------------|------|------|------------|
| Circuit Breaker | MCB 2x6A | 2 | 6 | MCB | 45.00 | MCB-2x6 |
| Circuit Breaker | MCB 2x10A | 2 | 10 | MCB | 48.00 | MCB-2x10 |
| Circuit Breaker | MCB 2x16A | 2 | 16 | MCB | 52.00 | MCB-2x16 |
| Circuit Breaker | MCB 2x20A | 2 | 20 | MCB | 55.00 | MCB-2x20 |
| Circuit Breaker | MCB 2x25A | 2 | 25 | MCB | 58.00 | MCB-2x25 |
| Circuit Breaker | MCB 2x32A | 2 | 32 | MCB | 62.00 | MCB-2x32 |
| Circuit Breaker | MCB 2x40A | 2 | 40 | MCB | 68.00 | MCB-2x40 |
| Circuit Breaker | MCB 2x50A | 2 | 50 | MCB | 75.00 | MCB-2x50 |
| Circuit Breaker | MCB 2x63A | 2 | 63 | MCB | 85.00 | MCB-2x63 |
| Circuit Breaker | MCB 2x80A | 2 | 80 | MCB | 95.00 | MCB-2x80 |
| Circuit Breaker | MCB 2x100A | 2 | 100 | MCB | 110.00 | MCB-2x100 |
| Circuit Breaker | MCB 3x6A | 3 | 6 | MCB | 65.00 | MCB-3x6 |
| Circuit Breaker | MCB 3x10A | 3 | 10 | MCB | 70.00 | MCB-3x10 |
| Circuit Breaker | MCB 3x16A | 3 | 16 | MCB | 75.00 | MCB-3x16 |
| Circuit Breaker | MCB 3x20A | 3 | 20 | MCB | 80.00 | MCB-3x20 |
| Circuit Breaker | MCB 3x25A | 3 | 25 | MCB | 85.00 | MCB-3x25 |
| Circuit Breaker | MCB 3x32A | 3 | 32 | MCB | 90.00 | MCB-3x32 |
| Circuit Breaker | MCB 3x40A | 3 | 40 | MCB | 98.00 | MCB-3x40 |
| Circuit Breaker | MCB 3x50A | 3 | 50 | MCB | 108.00 | MCB-3x50 |
| Circuit Breaker | MCB 3x63A | 3 | 63 | MCB | 120.00 | MCB-3x63 |
| Circuit Breaker | MCB 3x80A | 3 | 80 | MCB | 135.00 | MCB-3x80 |
| Circuit Breaker | MCB 3x100A | 3 | 100 | MCB | 155.00 | MCB-3x100 |
| Circuit Breaker | MCCB 3x20A | 3 | 20 | MCCB | 180.00 | MCCB-3x20 |
| Circuit Breaker | MCCB 3x25A | 3 | 25 | MCCB | 190.00 | MCCB-3x25 |
| Circuit Breaker | MCCB 3x30A | 3 | 30 | MCCB | 200.00 | MCCB-3x30 |
| Circuit Breaker | MCCB 3x40A | 3 | 40 | MCCB | 220.00 | MCCB-3x40 |
| Circuit Breaker | MCCB 3x50A | 3 | 50 | MCCB | 240.00 | MCCB-3x50 |
| Circuit Breaker | MCCB 3x60A | 3 | 60 | MCCB | 260.00 | MCCB-3x60 |
| Circuit Breaker | MCCB 3x70A | 3 | 70 | MCCB | 280.00 | MCCB-3x70 |
| Circuit Breaker | MCCB 3x80A | 3 | 80 | MCCB | 300.00 | MCCB-3x80 |
| Circuit Breaker | MCCB 3x90A | 3 | 90 | MCCB | 320.00 | MCCB-3x90 |
| Circuit Breaker | MCCB 3x100A | 3 | 100 | MCCB | 340.00 | MCCB-3x100 |
| Circuit Breaker | MCCB 3x125A | 3 | 125 | MCCB | 380.00 | MCCB-3x125 |
| Circuit Breaker | MCCB 3x160A | 3 | 160 | MCCB | 450.00 | MCCB-3x160 |
| Circuit Breaker | MCCB 3x175A | 3 | 175 | MCCB | 480.00 | MCCB-3x175 |
| Circuit Breaker | MCCB 3x200A | 3 | 200 | MCCB | 520.00 | MCCB-3x200 |
| Circuit Breaker | MCCB 3x225A | 3 | 225 | MCCB | 580.00 | MCCB-3x225 |
| Circuit Breaker | MCCB 3x250A | 3 | 250 | MCCB | 650.00 | MCCB-3x250 |
| Circuit Breaker | MCCB 3x320A | 3 | 320 | MCCB | 780.00 | MCCB-3x320 |
| Circuit Breaker | MCCB 3x400A | 3 | 400 | MCCB | 950.00 | MCCB-3x400 |
| Circuit Breaker | MCCB 3x500A | 3 | 500 | MCCB | 1200.00 | MCCB-3x500 |

**Seçim Mantığı:** 
- çıkış kesicisi için Çıkış akımından bir üst değer, giriş kesicisi için giriş akımından bir üst değer, batarya kesicisi ise çıkış kesici ile aynı seçilir (örnek: 27A için 32A)
- Kutup sayısı: DC gerilim >48V ise 3 kutuplu, ≤48V ise 2 kutuplu
- Kullanıcı MCB veya MCCB tercihini belirtir

---

### 3. **Akım Okuma Kartları** (`CurrentReadingCards.xlsx` veya `Rectifier.xlsx` içinde "CurrentReadingCards" sayfası)

**Amaç:** Batarya ve rectifier çıkış akım okuma kartlarının seçimi

**Kolon Yapısı:**
| Product Type | Product Name | Max Current (A) | Cost | Stock Code |
|--------------|--------------|----------------|------|------------|
| Current Reading Card | L100P | 100 | 250.00 | CRC-L100P |
| Current Reading Card | L200P | 200 | 320.00 | CRC-L200P |
| Current Reading Card | L300P | 300 | 390.00 | CRC-L300P |

**Seçim Mantığı:**
- Çıkış akımı < 100A → L100P
- 100A ≤ Çıkış akımı < 200A → L200P
- 200A ≤ Çıkış akımı < 300A → L300P
- Çıkış akımı ≥ 300A → Kullanıcıya "Yetkili kişi ile görüşün" mesajı

---

### 4. **Serbest Geçiş Diyotları** (`FreewheelingDiodes.xlsx` veya `Rectifier.xlsx` içinde "FreewheelingDiodes" sayfası)

**Amaç:** Serbest geçiş diyotlarının seçimi (Çıkış akımı × 1.5)

**Kolon Yapısı:**
| Product Type | Product Name | Current Rating (A) | Voltage Rating (V) | Cost | Stock Code |
|--------------|--------------|-------------------|-------------------|------|------------|
| Freewheeling Diode | MDD56-12 | 71 | 12 | 85.00 | DIODE-MDD56-12 |
| Freewheeling Diode | MDD76-12 | 80 | 12 | 95.00 | DIODE-MDD76-12 |
| Freewheeling Diode | MDD110-12 | 120 | 12 | 125.00 | DIODE-MDD110-12 |
| Freewheeling Diode | MDD156-12 | 170 | 12 | 165.00 | DIODE-MDD156-12 |
| Freewheeling Diode | MDD215-12 | 220 | 12 | 210.00 | DIODE-MDD215-12 |

**Seçim Mantığı:** 
- Gerekli akım = Çıkış akımı × 1.5
- Bu akımdan yüksek bir üst değer seçilir (örnek: 100A × 1.5 = 150A → MDD156-12 seçilir)

---

### 5. **Faz Kontrol Tristörleri** (`Thyristors.xlsx` veya `Rectifier.xlsx` içinde "Thyristors" sayfası)

**Amaç:** Faz kontrol tristörlerinin seçimi

**Kolon Yapısı:**
| Product Type | Product Name | Current Rating (A) | Voltage Rating (V) | Cost | Stock Code |
|--------------|--------------|-------------------|-------------------|------|------------|
| Thyristor | SCR-25A | 25 | 12 | 45.00 | SCR-25A |
| Thyristor | SCR-40A | 40 | 12 | 55.00 | SCR-40A |
| Thyristor | SCR-63A | 63 | 12 | 75.00 | SCR-63A |
| Thyristor | SCR-80A | 80 | 12 | 95.00 | SCR-80A |
| Thyristor | SCR-100A | 100 | 12 | 120.00 | SCR-100A |
| Thyristor | SCR-125A | 125 | 12 | 145.00 | SCR-125A |
| Thyristor | SCR-160A | 160 | 12 | 180.00 | SCR-160A |
| Thyristor | SCR-200A | 200 | 12 | 220.00 | SCR-200A |
| Thyristor | SCR-250A | 250 | 12 | 280.00 | SCR-250A |
| Thyristor | SCR-320A | 320 | 12 | 350.00 | SCR-320A |

**Seçim Mantığı:**
- Gerekli akım = (Çıkış akımı × 1.5) / Faz sayısı
- Bu akımdan yüksek bir üst değer seçilir Örneğin çıkış akımı 100A seçilecek tristör akımı 150Aden büyük bir üst seçenek olmalıdır.
- Adet: 3 faz 6 pulse → 3 adet, 3 faz 12 pulse → 6 adet, tek faz → 2 adet

---

### 6. **DC Şok (DC Choke)** (`DCChokes.xlsx` veya `Rectifier.xlsx` içinde "DCChokes" sayfası)

**Amaç:** DC şok seçimi (hesaplanan endüktans değerine göre)

**Kolon Yapısı:**
| Product Type | Product Name | Inductance    | Current Rating (A) | Cost | Stock Code |
|--------------|--------------|----------------|-------------------|------|------------|
| DC Choke | DC-CHOKE-0.5mH | 0.5 | 50 | 180.00 | CHK-0.5-50 |
| DC Choke | DC-CHOKE-1mH | 1.0 | 50 | 220.00 | CHK-1.0-50 |
| DC Choke | DC-CHOKE-1mH | 1.0 | 100 | 280.00 | CHK-1.0-100 |
| DC Choke | DC-CHOKE-1.5mH | 1.5 | 100 | 320.00 | CHK-1.5-100 |
| DC Choke | DC-CHOKE-2mH | 2.0 | 100 | 380.00 | CHK-2.0-100 |
| DC Choke | DC-CHOKE-1mH | 1.0 | 200 | 450.00 | CHK-1.0-200 |
| DC Choke | DC-CHOKE-2mH | 2.0 | 200 | 520.00 | CHK-2.0-200 |
| DC Choke | DC-CHOKE-3mH | 3.0 | 200 | 600.00 | CHK-3.0-200 |

**Not:** Sistem, hesaplanan endüktans değerine göre en yakın üst değeri seçer. Amaç rectifier_icin_pricing_deneme yazısında bulunan hesaplamaya göre DC bara kapasitörü ile dengeli bir şok kullanmaktır.

---

### 7. **DC Bara Kapasitörleri** (`DCCapacitors.xlsx` veya `Rectifier.xlsx` içinde "DCCapacitors" sayfası)

**Amaç:** DC bara kapasitör seçimi (4700uF veya 10000uF)

**Kolon Yapısı:**
| Product Type | Product Name | Capacitance (uF) | Voltage Rating (V) | Cost | Stock Code |
|--------------|--------------|-----------------|-------------------|------|------------|
| DC Capacitor | CAP-4700uF | 4700 | 100 | 25.00 | CAP-4700-100 |
| DC Capacitor | CAP-10000uF | 10000 | 100 | 45.00 | CAP-10000-100 |

**Not:** Sistem, kesme frekansını 33Hz'e getirmek için gerekli adet sayısını hesaplar. Tercih edilebilecek optimum şok ve optimum kapasitörün tahmin edilmesi gerekir. EKOK mantığına dayalı

---

### 8. **Giriş Trafosu** (`Transformers.xlsx` veya `Rectifier.xlsx` içinde "Transformers" sayfası)

**Amaç:** Giriş trafosu seçimi (hesaplanan güce göre)

**Kolon Yapısı:**
| Product Type | Product Name | Power (kVA) | Primary Voltage | Secondary Voltage | Efficiency | Cost | Stock Code |
|--------------|--------------|-------------|----------------|------------------|------------|------|------------|
| Transformer | TRF-1kVA | 1 | 3x400V | 3xFloat | 0.9 | 450.00 | TRF-1 |
| Transformer | TRF-2kVA | 2 | 3x400V | 3xFloat | 0.9 | 680.00 | TRF-2 |
| Transformer | TRF-3kVA | 3 | 3x400V | 3xFloat | 0.9 | 850.00 | TRF-3 |
| Transformer | TRF-5kVA | 5 | 3x400V | 3xFloat | 0.9 | 1200.00 | TRF-5 |
| Transformer | TRF-10kVA | 10 | 3x400V | 3xFloat | 0.9 | 2200.00 | TRF-10 |
| Transformer | TRF-15kVA | 15 | 3x400V | 3xFloat | 0.9 | 3200.00 | TRF-15 |
| Transformer | TRF-20kVA | 20 | 3x400V | 3xFloat | 0.9 | 4200.00 | TRF-20 |
| Transformer | TRF-1kVA-1PH | 1 | 1x230V | 1xBoost | 0.8 | 380.00 | TRF-1-1PH |
| Transformer | TRF-2kVA-1PH | 2 | 1x230V | 1xBoost | 0.8 | 580.00 | TRF-2-1PH |
| Transformer | TRF-3kVA-1PH | 3 | 1x230V | 1xBoost | 0.8 | 750.00 | TRF-3-1PH |

**Hesaplama Formülü:**
- Trafo Gücü (kVA) = (Çıkış Akımı × Çıkış Gerilimi) / (Verimlilik × Power Factor)
- Verimlilik: 3 faz → 0.9, tek faz → 0.8
- Power Factor: 3 faz → 0.8, tek faz → 0.7
- Primer: Giriş gerilimi ve faz sayısı
- Sekonder: 3 faz → Float gerilimi, tek faz → Boost gerilimi

**Seçim Mantığı:** Hesaplanan güçten yüksek bir üst standart değer seçilir.

### 9. **Elektronik kartlar** Default 500 dolar olarak belirlenebilir.

---

## 📊 Excel Dosya Yapısı Önerisi


###  Ayrı Dosyalar
Her komponent kategorisi için ayrı Excel dosyası:
- `Terminals.xlsx`
- `CircuitBreakers.xlsx`
- `CurrentReadingCards.xlsx`
- `FreewheelingDiodes.xlsx`
- `Thyristors.xlsx`
- `DCChokes.xlsx`
- `DCCapacitors.xlsx`
- `Transformers.xlsx`

---

## 🔧 Sistem Entegrasyonu

Sistem şu şekilde çalışacak:

1. **Kullanıcı Girdileri:**
   - Giriş voltajı, faz sayısı, frekans, tolerans
   - Çıkış akımı, çıkış voltajı
   - Topoloji (B2C, 6 pulse, 12 pulse)
   - Akü tipi (VRLA Nicad vb.)
   - MCB/MCCB tercihi

2. **Otomatik Hesaplamalar:**
   - Trafo gücü
   - Giriş akımı
   - Float/Boost gerilimleri
   - DC şok ve kapasitör değerleri

3. **Parça Seçimi:**
   - Her parça için Excel'den uygun değer bulunur
   - Fiyat eşleştirmesi yapılır
   - Liste oluşturulur

4. **Düzenlenebilir Fiyatlar:**
   - Sistem otomatik seçilen fiyatları gösterir
   - Kullanıcı fiyatları düzenleyebilir
   - Toplam maliyet hesaplanır

---

## 📝 Önemli Notlar

1. **Kolon İsimleri:** Sistem kodunda kullanılan kolon isimleri ile Excel'deki kolon isimleri tam olarak eşleşmelidir.
   - **Zorunlu Kolonlar:** `Product Type`, `Cost`
   - Diğer kolonlar (Product Name, Current Rating, vb.) sistem mantığına göre kullanılır

2. **Veri Formatı:**
   - Sayısal değerler sayı olarak girilmeli (metin değil)
   - **Cost kolonu:** Sayı olarar girilmeli sistem '$' işaretini otomatik temizler
   - Akım değerleri Amper (A) cinsinden ancak excelde sayı olarak girilebilir.
   - **ÖNEMLİ:** Kolon adı mutlaka "Cost" olmalı (Price değil!)

3. **Boş Hücreler:** Boş hücreler sistem tarafından atlanır, ancak kritik alanlar doldurulmalıdır.

4. **Güncelleme:** Excel dosyaları güncellendiğinde, uygulama yeniden başlatıldığında veya "Veri Yenile" butonuna basıldığında yeni veriler yüklenir.

5. **Yedekleme:** Excel dosyaları düzenli olarak yedeklenmelidir.

---

## 🚀 Sonraki Adımlar

1. Excel dosyalarını oluşturun (yukarıdaki yapıya göre)
2. Gerçek fiyat verilerini girin
3. Sistem kodunda Excel okuma fonksiyonlarını güncelleyin
4. Test edin ve doğrulayın

---

## 💡 İpuçları

- Excel dosyalarını network path'te tutun: `\\10.0.0.2\epc_data\...`
- Her parça için stok kodu ekleyin (takip için)
- Fiyat güncellemelerini kolaylaştırmak için tarih kolonu ekleyebilirsiniz
- Üretici bilgisi kolonu ekleyebilirsiniz (opsiyonel)

---

## 📊 Hızlı Başvuru Tablosu

| # | Excel Dosyası/Sayfası | Ana Seçim Kriteri | Zorunlu Kolonlar |
|---|----------------------|-------------------|------------------|
| 1 | Terminals | Current Rating (A) | Product Type, Product Name, Current Rating (A), Cost |
| 2 | CircuitBreakers | Current Rating (A), Poles, Type (MCB/MCCB) | Product Type, Product Name, Poles, Current Rating (A), Type, Cost |
| 3 | CurrentReadingCards | Max Current (A) | Product Type, Product Name, Max Current (A), Cost |
| 4 | FreewheelingDiodes | Current Rating (A) = Çıkış Akımı × 1.5 | Product Type, Product Name, Current Rating (A), Cost |
| 5 | Thyristors | Current Rating (A) = (Çıkış Akımı × 1.5) / Faz Sayısı | Product Type, Product Name, Current Rating (A), Cost |
| 6 | DCChokes | Inductance (mH) - Hesaplanan değer | Product Type, Product Name, Inductance (mH), Current Rating (A), Cost |
| 7 | DCCapacitors | Capacitance (uF) - 4700 veya 10000 | Product Type, Product Name, Capacitance (uF), Cost |
| 8 | Transformers | Power (kVA) - Hesaplanan değer | Product Type, Product Name, Power (kVA), Primary Voltage, Secondary Voltage, Cost |

**Tüm dosyalarda ortak zorunlu kolonlar:**
- `Product Type` (mutlaka dolu olmalı, boş satırlar filtrelenir)
- `Cost` (fiyat, TL cinsinden)

---

## 🔍 Seçim Algoritması Özeti

1. **Klemens/Bara:** Çıkış akımına göre bir üst değer seçilir
2. **Kesiciler (MCB/MCCB):** Çıkış akımına göre bir üst değer, kutup sayısı gerilime göre (≤48V → 2, >48V → 3)
3. **Akım Okuma Kartları:** Aralık bazlı seçim (<100A, 100-200A, 200-300A)
4. **Serbest Geçiş Diyotu:** Çıkış akımı × 1.5'in bir üst değeri
5. **Faz Kontrol Tristörü:** (Çıkış akımı × 1.5) / Faz sayısı'nın bir üst değeri, adet topolojiye göre
6. **DC Şok:** Hesaplanan endüktans değerine göre en yakın üst değer
7. **DC Kapasitör:** 4700uF veya 10000uF, adet hesaplanır
8. **Trafo:** Hesaplanan güce göre bir üst standart değer

---

## ✅ Kontrol Listesi

Excel dosyalarını oluştururken şunları kontrol edin:

- [ ] Tüm dosyalarda `Product Type` kolonu var ve dolu
- [ ] Tüm dosyalarda `Cost` kolonu var (Price değil!)
- [ ] Sayısal değerler sayı formatında (metin değil)
- [ ] Akım değerleri doğru sıralanmış (küçükten büyüğe)
- [ ] Stok kodları benzersiz
- [ ] Network path doğru: `\\10.0.0.2\epc_data\SATIS VE PAZARLAMA\FIYATLAR\masaustu_uygulama_data\fiyatlandırma excel\`
- [ ] Dosya adları doğru (büyük/küçük harf duyarlı olabilir)
