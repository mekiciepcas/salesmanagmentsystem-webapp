# Rectifier Pricing - Excel Dosya Yapısı Referans Dokümanı

Bu doküman, `Rectifier.xlsx` dosyası içindeki tüm sayfaların sütun yapısını, veri tiplerini ve örnek verilerini içermektedir.

---

## Genel Bilgiler

- **Dosya Adı:** `Rectifier.xlsx`
- **Toplam Sayfa Sayısı:** 20 sayfa
- **Konum:** `\\10.0.0.2\epc_data\SATIS VE PAZARLAMA\FIYATLAR\masaustu_uygulama_data\fiyatlandırma excel\`

### Önemli Notlar:
- Tüm sayfalarda ilk satır başlık satırıdır
- Boş satırlar otomatik olarak filtrelenir
- `Cost` kolonu string formatında olabilir (örn: "1.250,50 TL"), sistem otomatik olarak sayıya çevirir
- `Product Type` kolonu boş olan satırlar filtrelenir
- Sütun başlıkları tam olarak belirtilen şekilde olmalıdır (büyük/küçük harf duyarlı)

---

## 1. Terminals (Klemens ve Bara)

**Sayfa Adı:** `Terminals`

**Açıklama:** Çıkış ve giriş klemensleri ile baralar için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi (Klemens/Bara) | "Klemens" |
| Product Name | String | Metin | Ürün adı | "35mm Klemens" |
| Current Rating (A) | Number | Sayı | Akım kapasitesi (Amper) | 110 |
| Type | String | Metin | Tip bilgisi (opsiyonel) | "Screw" |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 1250.50 veya "1.250,50 TL" |
| Stock Code | String | Metin | Stok kodu | "TER-35MM-110A" |

### Örnek Satırlar:

```
Product Type | Product Name | Current Rating (A) | Type | Cost | Stock Code
Klemens | 25mm Klemens | 85 | Screw | 850.00 | TER-25MM-85A
Klemens | 35mm Klemens | 110 | Screw | 1250.50 | TER-35MM-110A
Bara | 20x3mm Bara | 245 | Copper | 3200.00 | BAR-20X3-245A
```

### Seçim Kriterleri:
- Çıkış klemensi: Çıkış akımına göre bir üst değer seçilir
- Giriş klemensi: Hesaplanan giriş akımına göre bir üst değer seçilir

---

## 2. CircuitBreakers (MCB ve MCCB)

**Sayfa Adı:** `CircuitBreakers`

**Açıklama:** MCB ve MCCB kesiciler için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "MCB" veya "MCCB" |
| Product Name | String | Metin | Ürün adı | "MCB 2x32A" |
| Poles | Number | Sayı | Kutup sayısı (2 veya 3) | 2 |
| Current Rating (A) | Number | Sayı | Akım değeri (Amper) | 32 |
| Type | String | Metin | Tip (MCB/MCCB) | "MCB" |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 450.00 |
| Stock Code | String | Metin | Stok kodu | "MCB-2P-32A" |

### Örnek Satırlar:

```
Product Type | Product Name | Poles | Current Rating (A) | Type | Cost | Stock Code
MCB | MCB 2x16A | 2 | 16 | MCB | 280.00 | MCB-2P-16A
MCB | MCB 2x32A | 2 | 32 | MCB | 450.00 | MCB-2P-32A
MCB | MCB 3x32A | 3 | 32 | MCB | 520.00 | MCB-3P-32A
MCCB | MCCB 3x100A | 3 | 100 | MCCB | 1250.00 | MCCB-3P-100A
```

### Seçim Kriterleri:
- Çıkış kesicisi: Çıkış akımından bir üst değer, kutup sayısı gerilime göre (≤48V: 2 kutup, >48V: 3 kutup)
- Batarya kesicisi: Çıkış kesicisi ile aynı
- Giriş kesicisi: Hesaplanan giriş akımından bir üst değer, kutup sayısı faz sayısına göre (1 faz: 2 kutup, 3 faz: 3 kutup)
- Dahili dağıtım kesicisi: Kullanıcı girişine göre (örn: "3x15A" formatında)

---

## 3. CurrentReadingCards (Akım Okuma Kartları)

**Sayfa Adı:** `CurrentReadingCards`

**Açıklama:** Akım okuma kartları için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Current Reading Card" |
| Product Name | String | Metin | Ürün adı | "L100P" |
| Max Current (A) | Number | Sayı | Maksimum akım değeri (Amper) | 100 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 850.00 |
| Stock Code | String | Metin | Stok kodu | "CRC-L100P" |

### Örnek Satırlar:

```
Product Type | Product Name | Max Current (A) | Cost | Stock Code
Current Reading Card | L100P | 100 | 850.00 | CRC-L100P
Current Reading Card | L200P | 200 | 1200.00 | CRC-L200P
Current Reading Card | L300P | 300 | 1650.00 | CRC-L300P
```

### Seçim Kriterleri:
- < 100A → L100P
- 100A ≤ akım < 200A → L200P
- 200A ≤ akım < 300A → L300P
- ≥ 300A → Kullanıcıya bildirim

---

## 4. FreewheelingDiodes (Serbest Geçiş Diyotları)

**Sayfa Adı:** `FreewheelingDiodes`

**Açıklama:** Serbest geçiş diyotları için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Freewheeling Diode" |
| Product Name | String | Metin | Ürün adı | "FR307" |
| Current Rating (A) | Number | Sayı | Akım değeri (Amper) | 150 |
| Voltage Rating (V) | Number | Sayı | Gerilim değeri (Volt) | 1000 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 25.50 |
| Stock Code | String | Metin | Stok kodu | "FWD-FR307" |

### Örnek Satırlar:

```
Product Type | Product Name | Current Rating (A) | Voltage Rating (V) | Cost | Stock Code
Freewheeling Diode | FR307 | 150 | 1000 | 25.50 | FWD-FR307
Freewheeling Diode | FR607 | 200 | 1000 | 32.00 | FWD-FR607
```

### Seçim Kriterleri:
- Çıkış akımı × 1.5 değerine göre bir üst değer seçilir

---

## 5. Thyristors (Faz Kontrol Tristörleri)

**Sayfa Adı:** `Thyristors`

**Açıklama:** Faz kontrol tristörleri için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Thyristor" |
| Product Name | String | Metin | Ürün adı | "T1225" |
| Current Rating (A) | Number | Sayı | Akım değeri (Amper) | 25 |
| Voltage Rating (V) | Number | Sayı | Gerilim değeri (Volt) | 1200 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 45.00 |
| Stock Code | String | Metin | Stok kodu | "THY-T1225" |

### Örnek Satırlar:

```
Product Type | Product Name | Current Rating (A) | Voltage Rating (V) | Cost | Stock Code
Thyristor | T1225 | 25 | 1200 | 45.00 | THY-T1225
Thyristor | T1630 | 30 | 1600 | 55.00 | THY-T1630
```

### Seçim Kriterleri:
- Hesaplama: (Çıkış akımı × 1.5) / Faz sayısı
- Adet: B6C → 3 adet, B12C → 6 adet, B2H → 2 adet, SNMPS/IGBT → 0 adet

---

## 6. Transformers (Giriş Trafoları)

**Sayfa Adı:** `Transformers`

**Açıklama:** Giriş trafoları için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Transformer" |
| Product Name | String | Metin | Ürün adı | "TRF-3P-400V-54V-6P" |
| Power Rating (kVA) | Number | Sayı | Güç değeri (kVA) | 7.5 |
| Primary Voltage (V) | Number | Sayı | Primer gerilim (Volt) | 400 |
| Primary Phase | Number | Sayı | Primer faz sayısı | 3 |
| Secondary Voltage (V) | Number | Sayı | Sekonder gerilim (Volt) | 54 |
| Secondary Phase | Number | Sayı | Sekonder faz sayısı | 3 |
| Topology | String | Metin | Topoloji tipi | "6 Pulse" |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 8500.00 |
| Stock Code | String | Metin | Stok kodu | "TRF-7.5KVA-6P" |

### Örnek Satırlar:

```
Product Type | Product Name | Power Rating (kVA) | Primary Voltage (V) | Primary Phase | Secondary Voltage (V) | Secondary Phase | Topology | Cost | Stock Code
Transformer | TRF-3P-400V-54V-6P | 7.5 | 400 | 3 | 54 | 3 | 6 Pulse | 8500.00 | TRF-7.5KVA-6P
Transformer | TRF-3P-400V-54V-12P | 10.0 | 400 | 3 | 54 | 3 | 12 Pulse | 12000.00 | TRF-10KVA-12P
Transformer | TRF-1P-230V-60V-SP | 5.0 | 230 | 1 | 60 | 1 | Single Phase | 6500.00 | TRF-5KVA-SP
```

### Önemli Notlar:
- **Trafogücünde çıkış gerilimi ile değil Float voltajı ile hesaplama yapılır**
- Trafo gücü: (Çıkış Akımı × Float Gerilimi) / (Verim × Güç Faktörü)
- 3 faz için: Verim = 0.9, Güç Faktörü = 0.8
- 1 faz için: Verim = 0.8, Güç Faktörü = 0.7
- Sekonder gerilim: 3 faz için Float gerilimi, 1 faz için Boost gerilimi
- Topoloji mapping: B6C → "6 Pulse", B12C → "12 Pulse", B2H → "Single Phase", SNMPS → "SNMPS", IGBT → "IGBT"
- Eşleştirme: Güç, primer gerilim, primer faz, sekonder gerilim ve topoloji eşleşmeli
- Güç toleransı: %10
- Maliyet tablosuna aktarılırken Excel'den seçilen trafo bilgileri değil, otomatik hesaplama ile bulunan trafonun açıklaması yazılır
- Açıklama formatı: "(Giriş Faz Sayısı)x Giriş gerilim değeri / (Giriş Faz Sayısı) x (Sistemin Float gerilimi)"

---

## 7. DCComponents (DC Şok ve DC Bara Kapasitörleri)

**Sayfa Adı:** `DCComponents`

**Açıklama:** DC Şok (indüktör) ve DC Bara kapasitörleri için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "DC Choke" veya "DC Capacitor" |
| Product Name | String | Metin | Ürün adı | "DC-Choke-5mH" |
| Inductance (mH) | Number | Sayı | İndüktans değeri (miliHenry) | 5.0 |
| Capacitance (µF) | Number | Sayı | Kapasitans değeri (mikroFarad) | 4700 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 450.00 |
| Stock Code | String | Metin | Stok kodu | "DC-CHK-5MH" |

### Örnek Satırlar:

```
Product Type | Product Name | Inductance (mH) | Capacitance (µF) | Cost | Stock Code
DC Choke | DC-Choke-2mH | 2.0 | | 350.00 | DC-CHK-2MH
DC Choke | DC-Choke-5mH | 5.0 | | 450.00 | DC-CHK-5MH
DC Capacitor | DC-Cap-4700uF | | 4700 | 125.00 | DC-CAP-4700UF
DC Capacitor | DC-Cap-10000uF | | 10000 | 180.00 | DC-CAP-10000UF
```

### Notlar:
- DC Choke için sadece Inductance doldurulur, Capacitance boş bırakılır
- DC Capacitor için sadece Capacitance doldurulur, Inductance boş bırakılır
- Seçim: Kesim frekansı hesaplamasına göre optimize edilir
- Formül: fkesme = 1 / (2 × π × √(L × C × kapasitör sayısı))

---

## 8. MeasurementInstruments (Ölçü Aletleri)

**Sayfa Adı:** `MeasurementInstruments`

**Açıklama:** Voltmetre, multimetre ve enerji analizörü için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Voltmeter" |
| Product Name | String | Metin | Ürün adı | "Analog Voltmetre 0-500V" |
| Instrument Type | String | Metin | Alet tipi | "Analog", "Dijital", "Multimetre", "Enerji analizörü" |
| Measurement Point | String | Metin | Ölçüm noktası | "Giriş", "Çıkış", "Akü" |
| Voltage Range (V) | Number | Sayı | Gerilim aralığı (Volt) | 500 |
| Current Range (A) | Number | Sayı | Akım aralığı (Amper) | 200 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 350.00 |
| Stock Code | String | Metin | Stok kodu | "VM-ANLG-500V" |

### Örnek Satırlar:

```
Product Type | Product Name | Instrument Type | Measurement Point | Voltage Range (V) | Current Range (A) | Cost | Stock Code
Voltmeter | Analog Voltmetre 0-400V | Analog | Giriş | 400 | | 280.00 | VM-ANLG-400V-GIRIS
Voltmeter | Analog Voltmetre 0-60V | Analog | Çıkış | 60 | | 250.00 | VM-ANLG-60V-CIKIS
Multimeter | Dijital Multimetre | Multimetre | Giriş | 500 | 200 | 450.00 | MM-DIG-GIRIS
Enerji Analizörü | Enerji Analizörü 3 Faz | Enerji analizörü | Giriş | 400 | 200 | 2500.00 | EA-3F-400V
```

### Seçim Kriterleri:
- Voltmetre: Gerilim × 1.2 değerine göre bir üst aralık seçilir
- Multimetre: Kullanıcı seçimine göre
- Enerji analizörü: Sadece giriş için kullanılır

---

## 9. CommunicationProtocols (Haberleşme Protokolleri)

**Sayfa Adı:** `CommunicationProtocols`

**Açıklama:** Haberleşme protokol modülleri için fiyat listesi

### Sütun Yapısı:

| Sütun Adı      | Veri Tipi      | Format         | Açıklama                      | Örnek Değer                                    |
|----------------|---------------|----------------|-------------------------------|------------------------------------------------|
| Product Type   | String        | Metin          | Ürün tipi                     | "Communication Module"                         |
| Product Name   | String        | Metin          | Haberleşme protokolü/kombinasyonu, otomatik hesap tablosundan kullanıcı seçimiyle birebir eşleştirilecek şekilde | "Modbus RTU RS232" <br> "Modbus RTU RS485"<br>"Modbus RTU RS232 + Modbus RTU RS485"<br>"Modbus RTU RS485 + Modbus TCP / IP"<br>"Modbus TCP / IP"<br>"IEC61850"<br>"Modbus RTU RS485 + IEC61850"<br>"Profinet"<br>"Profibus" |
| Cost          | Number/String | Sayı veya Para formatı | Birim fiyat                    | 850.00                                         |
| Stock Code    | String        | Metin          | Stok kodu                      | "COMM-MODBUS-RTU"                              |

### Seçilebilecek Product Name Değerleri:
- Modbus RTU RS232
- Modbus RTU RS485
- Modbus RTU RS232 + Modbus RTU RS485
- Modbus RTU RS485 + Modbus TCP / IP
- Modbus TCP / IP
- IEC61850
- Modbus RTU RS485 + IEC61850
- Profinet
- Profibus

> **Not:** "Product Name" alanı, otomatik hesaplama sayfasında seçilen haberleşme kombinasyonu ile *birebir eşleşir* ve burada tanımlı Product Name’lerden biriyle eşleştirilir. Ayriyeten ayrı bir `Protocol` sütununa gerek yoktur.

### Notlar:
- Bütün güçlerde ve durumlarda aynı ürünler kullanılıyor
- Protokol adı tam eşleşme ile seçilir

---

## 10. RelayAlarmOutputs (Röle Kuru Kontak Alarm Çıkışları)

**Sayfa Adı:** `RelayAlarmOutputs`

**Açıklama:** Röle modülleri için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Relay Module" |
| Product Name | String | Metin | Ürün adı | "Röle Modülü 4 Kontak" |
| Relay Count | Number | Sayı | Röle sayısı | 4 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 450.00 |
| Stock Code | String | Metin | Stok kodu | "RLY-MOD-4CH" |

### Örnek Satırlar:

```
Product Type | Product Name | Relay Count | Cost | Stock Code
Relay Module | Programlanabilir Kuru Kontak Alarm Çıkışı 4 Adet / Programmable Dry Contact Alarm Outputs | 4 | 280.00 | RLY-MOD-2CH

```

### Notlar:
- Röle sayısı tam eşleşme ile seçilir
- Kullanıcı girişinden röle sayısı parse edilir (örn: "4 adet" → 4)

---

## 11. ControlCards (Kontrol Kartları)

**Sayfa Adı:** `ControlCards`

**Açıklama:** LVD, Paralelleme ve Röle kontrol kartları için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Control Card" |
| Product Name | String | Metin | Ürün adı | "LVD Control Card" |
| Card Type | String | Metin | Kart tipi | "LVD Control", "Parallel Operation", "Relay Control" |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 650.00 |
| Stock Code | String | Metin | Stok kodu | "CTRL-LVD" |

### Örnek Satırlar:

```
Product Type | Product Name | Card Type | Cost | Stock Code
Control Card | LVD Control Card | LVD Control | 650.00 | CTRL-LVD
Control Card | Parallel Operation Card | Parallel Operation | 1200.00 | CTRL-PAR
Control Card | Relay Control Card | Relay Control | 450.00 | CTRL-RELAY
```

### Seçim Kriterleri:
- LVD Control: Batarya LVD = "Var" ise seçilir
- Parallel Operation: Paralel çalışma = "Aktif" ise seçilir
- Relay Control: Diyot Dropper seçilmişse ve "DC-DC kıyıcılı" değilse, kademe sayısı kadar seçilir

---

## 12. Relays (Röleler)

**Sayfa Adı:** `Relays`

**Açıklama:** Röleler için fiyat listesi (LVD ve Dropper için ortak kullanılır)

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Relay" |
| Product Name | String | Metin | Ürün adı | "Relay 100A" |
| Current Rating (A) | Number | Sayı | Akım değeri (Amper) | 100 |
| Voltage Rating (V) | Number | Sayı | Gerilim değeri (Volt) | 48 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 180.00 |
| Stock Code | String | Metin | Stok kodu | "RLY-100A" |

### Örnek Satırlar:

```
Product Type | Product Name | Current Rating (A) | Voltage Rating (V) | Cost | Stock Code
Relay | Relay 50A | 50 | 48 | 120.00 | RLY-50A
Relay | Relay 100A | 100 | 48 | 180.00 | RLY-100A
Relay | Relay 125A | 125 | 48 | 220.00 | RLY-125A
Relay | Relay 150A | 150 | 48 | 280.00 | RLY-150A
```

### Seçim Kriterleri:
- **LVD Rölesi:** Çıkış akımı × 1.2 değerine göre bir üst değer seçilir (batteryLVD = "Var" ise)
- **Dropper Rölesi:** Çıkış akımına tam eşleşme, kademe sayısı kadar adet (diodeDropper seçilmişse ve "DC-DC kıyıcılı" değilse)
- **Önemli Not:** Excel'de LVD/Dropper ayrımı yoktur. Tüm röleler akım değerine göre listelenir. Sistem mantığında hangi rölenin LVD için hangisinin Dropper için kullanılacağına karar verilir.
- **Voltage Rating Kolonu:** Excel'de `Voltage Rating (V)` kolonu bulunur ancak **seçim kriteri olarak kullanılmaz**. Röle seçimi sadece akım değerine (`Current Rating (A)`) göre yapılır. Gerilim kriteri kullanılmaz (voltajdan bağımsız seçim).

---

## 13. DiodeDroppers (Diyot Dropper Modülleri)

**Sayfa Adı:** `DiodeDroppers`

**Açıklama:** Diyot Dropper modülleri ve diyotlar için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Dropper Module" veya "Dropper Diode" |
| Product Name | String | Metin | Ürün adı | "Dropper Module 1.5V" |
| Module Type | String | Metin | Modül tipi (sadece modül için) | "Standard" |
| Voltage Drop (V) | Number | Sayı | Gerilim düşümü (Volt) | 1.5 |
| Current Rating (A) | Number | Sayı | Akım değeri (Amper) | 100 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 45.00 |
| Stock Code | String | Metin | Stok kodu | "DRP-MOD-1.5V" |

### Örnek Satırlar:

```
Product Type | Product Name | Module Type | Voltage Drop (V) | Current Rating (A) | Cost | Stock Code
Dropper Module | Dropper Module 1.5V | Standard | 1.5 | | 45.00 | DRP-MOD-1.5V
Dropper Diode | Dropper Diode 100A | | | 100 | 25.00 | DRP-DIO-100A
```

### Notlar:
- Modül için Voltage Drop doldurulur, Current Rating boş bırakılır
- Diyot için Current Rating doldurulur, Voltage Drop boş bırakılır
- Modül sayısı: Gerilim düşümü / 1.5 formülü ile hesaplanır
- Diyot akımı: Çıkış akımı × 1.5

---

## 14. CoolingComponents (Soğutucu ve Fanlar)

**Sayfa Adı:** `CoolingComponents`

**Açıklama:** Soğutucu ve fanlar için fiyat listesi (Faz kontrol tristörleri ve Diyot Dropper için ortak kullanılır)

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Cooling Component" |
| Product Name | String | Metin | Ürün adı | "Heatsink" |
| Component Type | String | Metin | Bileşen tipi | "Heatsink", "Fan" |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 120.00 |
| Stock Code | String | Metin | Stok kodu | "COOL-HS" |

### Örnek Satırlar:

```
Product Type | Product Name | Component Type | Cost | Stock Code
Cooling Component | Heatsink | Heatsink | 120.00 | COOL-HS
Cooling Component | Fan | Fan | 85.00 | COOL-FAN
```

### Seçim Kriterleri:

#### Faz Kontrol Tristörleri İçin Soğutucular:
- **B6C (6 Pulse):** 1 adet Heatsink + 1 adet Fan (3 adet tristör için)
- **B12C (12 Pulse):** 2 adet Heatsink + 2 adet Fan (6 adet tristör için)
- **B2H ve Diğerleri:** 1 adet Heatsink + 1 adet Fan
- **Not:** Faz kontrol tristörleri soğutucuları her zaman eklenir (topolojiye göre)

#### Diyot Dropper İçin Soğutucular:
- **Koşul:** Diyot Dropper seçilmişse ve "DC-DC kıyıcılı" değilse
- **Hesaplama:** Dropper'da kullanılacak diyot sayısına göre
- **Kural:** Her 4 adet diyot için 1 adet Heatsink + 1 adet Fan
- **Örnek:** 
  - 4 diyot → 1 Heatsink + 1 Fan
  - 8 diyot → 2 Heatsink + 2 Fan
  - 12 diyot → 3 Heatsink + 3 Fan
- **Önemli Not:** Dropper soğutucuları, faz kontrol tristörleri soğutucularından **ayrı** olarak eklenir. Yani her ikisi de ayrı ayrı hesaplanır ve eklenir.

---

## 15. Cabinets (Kabinler)

**Sayfa Adı:** `Cabinets`

**Açıklama:** Kabinler için boyut bazlı fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Cabinet" |
| Product Name | String | Metin | Ürün adı | "SR1 Cabinet" |
| Width (mm) | Number | Sayı | Genişlik (milimetre) | 450 |
| Depth (mm) | Number | Sayı | Derinlik (milimetre) | 500 |
| Height (mm) | Number | Sayı | Yükseklik (milimetre) | 1000 |
| Cabinet Size | String | Metin | Kabin boyutu | "SR1", "SR2", "SR3", "Özel Boyutlar" |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 3500.00 |
| Stock Code | String | Metin | Stok kodu | "CAB-SR1" |

### Örnek Satırlar:

```
Product Type | Product Name | Width (mm) | Depth (mm) | Height (mm) | Cabinet Size | Cost | Stock Code
Cabinet | SR1 Cabinet | 450 | 500 | 1000 | SR1 | 3500.00 | CAB-SR1
Cabinet | SR2 Cabinet | 600 | 600 | 1300 | SR2 | 4800.00 | CAB-SR2
Cabinet | SR3 Cabinet | 750 | 700 | 1600 | SR3 | 6500.00 | CAB-SR3
Cabinet | Custom Cabinet 800x600x1400 | 800 | 600 | 1400 | Özel Boyutlar | 7200.00 | CAB-CUSTOM-800X600X1400
```

### Standart Boyutlar:
- SR1: 450×500×1000 mm
- SR2: 600×600×1300 mm
- SR3: 750×700×1600 mm
- Özel Boyutlar: Kullanıcı girişine göre, ±10mm tolerans ile eşleştirme

---

## 16. IPProtectionClasses (IP Koruma Sınıfı Ek Maliyetleri)

**Sayfa Adı:** `IPProtectionClasses`

**Açıklama:** IP koruma sınıfı değişikliği için ek maliyetler

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Protection Class | String | Metin | IP sınıfı | "IP20", "IP54", "IP65" |
| Additional Cost | Number/String | Sayı veya Para formatı | Ek maliyet | 500.00 |
| Description | String | Metin | Açıklama | "IP54 için ek maliyet" |

### Örnek Satırlar:

```
Protection Class | Additional Cost | Description
IP20 | 0.00 | Standart IP sınıfı (ek maliyet yok)
IP54 | 500.00 | IP54 için ek maliyet
IP65 | 1200.00 | IP65 için ek maliyet
```

### Notlar:
- Standart IP sınıfı: IP20 (ek maliyet yok)
- Farklı IP sınıfı seçilirse ek maliyet eklenir

---

## 17. CabinetColors (Kabin Renk Değişimi Ücretleri)

**Sayfa Adı:** `CabinetColors`

**Açıklama:** Standart renkten farklı renk seçimi için ek ücretler

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Color Code | String | Metin | Renk kodu | "RAL7035", "RAL9005" |
| Color Name | String | Metin | Renk adı | "Açık Gri", "Siyah" |
| Additional Cost | Number/String | Sayı veya Para formatı | Ek maliyet | 0.00 |
| Is Standard | Boolean/String | Evet/Hayır | Standart renk mi? | "Yes" veya "No" |

### Örnek Satırlar:

```
Color Code | Color Name | Additional Cost | Is Standard
RAL7035 | Açık Gri | 0.00 | Yes
RAL9005 | Siyah | 350.00 | No
RAL3000 | Kırmızı | 450.00 | No
```

### Notlar:
- Standart renk: RAL7035 (ek maliyet yok)
- Farklı renk seçilirse ek maliyet eklenir

---

## 18. CabinetAccessories (Kabin Aksesuarları)

**Sayfa Adı:** `CabinetAccessories`

**Açıklama:** Kabin ısıtıcısı, aydınlatma ve servis prizi için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Cabinet Accessory" |
| Product Name | String | Metin | Ürün adı | "Cabinet Heater SR1" |
| Accessory Type | String | Metin | Aksesuar tipi | "Heater", "Lighting", "Service Plug" |
| Cabinet Size | String | Metin | Kabin boyutu | "SR1", "SR2", "SR3" |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 450.00 |
| Stock Code | String | Metin | Stok kodu | "CAB-ACC-HEATER-SR1" |

### Örnek Satırlar:

```
Product Type | Product Name | Accessory Type | Cabinet Size | Cost | Stock Code
Cabinet Accessory | Cabinet Heater SR1 | Heater | SR1 | 450.00 | CAB-ACC-HEATER-SR1
Cabinet Accessory | Cabinet Heater SR2 | Heater | SR2 | 550.00 | CAB-ACC-HEATER-SR2
Cabinet Accessory | Cabinet Lighting SR1 | Lighting | SR1 | 280.00 | CAB-ACC-LIGHT-SR1
Cabinet Accessory | Service Plug | Service Plug | | 150.00 | CAB-ACC-PLUG
```

### Seçim Kriterleri:
- Heater: Çalışma sıcaklığı min ≤ -10°C ise seçilir, kabin boyutuna göre
- Lighting: Kullanıcı seçimine göre, kabin boyutuna göre
- Service Plug: Kullanıcı seçimine göre, kabin boyutundan bağımsız

---

## 19. CommunicationComponents (Haberleşme Bileşenleri)

**Sayfa Adı:** `CommunicationComponents`

**Açıklama:** RJ45 portu ve diğer haberleşme bileşenleri için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Communication Component" |
| Product Name | String | Metin | Ürün adı | "RJ45 Port" |
| Component Type | String | Metin | Bileşen tipi | "RJ45 Port" |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 85.00 |
| Stock Code | String | Metin | Stok kodu | "COMM-RJ45" |

### Örnek Satırlar:

```
Product Type | Product Name | Component Type | Cost | Stock Code
Communication Component | RJ45 Port | RJ45 Port | 85.00 | COMM-RJ45
```

### Seçim Kriterleri:
- RJ45 Port: Paralel çalışma = "Aktif" ise seçilir

---

## 20. Options (Opsiyonlar)

**Sayfa Adı:** `Options`

**Açıklama:** RFI Filtre, Surge Suppressor, Transducer ve diğer opsiyonlar için fiyat listesi

### Sütun Yapısı:

| Sütun Adı | Veri Tipi | Format | Açıklama | Örnek Değer |
|-----------|-----------|--------|----------|-------------|
| Product Type | String | Metin | Ürün tipi | "Option" |
| Product Name | String | Metin | Ürün adı | "Input RFI Filter 400V 3P 50A" |
| Option Type | String | Metin | Opsiyon tipi | "Input RFI Filter", "Input Surge Suppressor", "Output Surge Suppressor", "Transducer", "Potentiometer", "Mode Selector", "Alarm Reset Button", "Emergency Stop Button", "Rapid Fuses" |
| Input Voltage (V) | Number | Sayı | Giriş gerilimi (Volt) | 400 |
| Input Phase | Number | Sayı | Giriş faz sayısı | 3 |
| Input Current (A) | Number | Sayı | Giriş akımı (Amper) | 50 |
| Output Voltage (V) | Number | Sayı | Çıkış gerilimi (Volt) | 48 |
| Channels | Number | Sayı | Kanal sayısı (Transducer için) | 4 |
| Cost | Number/String | Sayı veya Para formatı | Birim fiyat | 850.00 |
| Stock Code | String | Metin | Stok kodu | "OPT-RFI-400V-3P-50A" |

### Örnek Satırlar:

```
Product Type | Product Name | Option Type | Input Voltage (V) | Input Phase | Input Current (A) | Output Voltage (V) | Channels | Cost | Stock Code
Option | Input RFI Filter 400V 3P 50A | Input RFI Filter | 400 | 3 | 50 | | | 850.00 | OPT-RFI-400V-3P-50A
Option | Input Surge Suppressor 400V 3P | Input Surge Suppressor | 400 | 3 | | | | 650.00 | OPT-SURGE-IN-400V-3P
Option | Output Surge Suppressor 48V | Output Surge Suppressor | | | | 48 | | 450.00 | OPT-SURGE-OUT-48V
Option | Transducer 4 Channel | Transducer | | | | | 4 | 1200.00 | OPT-TRANS-4CH
Option | Transducer 8 Channel | Transducer | | | | | 8 | 1800.00 | OPT-TRANS-8CH
Option | Potentiometer | Potentiometer | | | | | | 85.00 | OPT-POT
Option | Mode Selector | Mode Selector | | | | | | 120.00 | OPT-MODE-SEL
Option | Alarm Reset Button | Alarm Reset Button | | | | | | 95.00 | OPT-ALARM-RST
Option | Emergency Stop Button | Emergency Stop Button | | | | | | 150.00 | OPT-EMERG-STOP
Option | Rapid Fuses | Rapid Fuses | | | | | | 250.00 | OPT-RAPID-FUSE
```

### Notlar:
- Her opsiyon tipi için ilgili kolonlar doldurulur, diğerleri boş bırakılır
- Input RFI Filter: Input Voltage, Input Phase, Input Current doldurulur
- Input Surge Suppressor: Input Voltage, Input Phase doldurulur
- Output Surge Suppressor: Output Voltage doldurulur
- Transducer: Channels doldurulur (4 veya 8)
- Diğer opsiyonlar: Sadece Option Type doldurulur

---

## Genel Format Kuralları

### Cost Kolonu Formatı:
- Sayı formatı: `1250.50` (nokta ile ondalık ayırıcı)
- Para formatı: `"1.250,50 TL"` (sistem otomatik olarak sayıya çevirir)
- Sistem regex ile temizler: `parseFloat(Cost.replace(/[^0-9.-]/g, ''))`

### Boş Değerler:
- Sayısal kolonlar için boş değer: `null` veya boş bırakılabilir
- Metin kolonları için boş değer: Boş bırakılabilir

### Filtreleme:
- `Product Type` kolonu boş olan satırlar otomatik olarak filtrelenir
- Boş satırlar filtrelenir

### Sütun Başlıkları:
- Tam eşleşme gereklidir (büyük/küçük harf duyarlı)
- Örnek: `"Current Rating (A)"` doğru, `"current rating (a)"` yanlış

---

## Excel Dosyası Oluşturma Adımları

1. Yeni bir Excel dosyası oluşturun: `Rectifier.xlsx`
2. Her sayfa için yukarıdaki sütun başlıklarını ilk satıra ekleyin
3. Örnek verileri ikinci satırdan itibaren ekleyin
4. Her sayfayı belirtilen isimle adlandırın (tam eşleşme önemli)
5. Dosyayı kaydedin: `\\10.0.0.2\epc_data\SATIS VE PAZARLAMA\FIYATLAR\masaustu_uygulama_data\fiyatlandırma excel\Rectifier.xlsx`

---

## İletişim ve Destek

Excel dosyası hazırlandıktan sonra sistem otomatik olarak tüm sayfaları okuyacak ve parça seçimini gerçekleştirecektir.

Herhangi bir sorun durumunda console log'larını kontrol edin:
- `Loaded X items from Rectifier.xlsx (Sheet: [Sayfa Adı])`
- Hata mesajları detaylı bilgi içerir

---

**Son Güncelleme:** Bu doküman RECTIFIER_EXCEL_MAPPING.json dosyasına göre oluşturulmuştur.
