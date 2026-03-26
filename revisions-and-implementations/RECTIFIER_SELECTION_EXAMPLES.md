# Rectifier Pricing - Örnek Senaryolar ve Parça Seçim Mantığı

Bu doküman, Rectifier Pricing sisteminde farklı senaryolara göre otomatik parça seçiminin nasıl yapıldığını örneklerle açıklamaktadır.

---

## Senaryo 1: Temel 3 Fazlı B6C Sistemi

### Girdiler:
- **Giriş:** 3 faz, 400V, 50Hz, %10 tolerans
- **Çıkış:** 48V DC, 100A
- **Topoloji:** B6C (6 Pulse)
- **Akü Tipi:** VRLA
- **Kesici Tipi:** MCB
- **Kabin:** SR2, IP54, RAL7035

### Otomatik Seçilen Parçalar:

#### 1. Çıkış Klemensi
- **Hesaplama:** Çıkış akımı = 100A
- **Seçim:** 35mm Klemens (110A kapasiteli) - bir üst değer
- **Excel:** `Terminals.xlsx` → Current Rating >= 100A

#### 2. Çıkış Kesicisi
- **Hesaplama:** Çıkış akımı = 100A, DC gerilim = 48V (≤48V → 2 kutuplu)
- **Seçim:** MCB 2x100A
- **Excel:** `CircuitBreakers.xlsx` → Type=MCB, Poles=2, Current Rating > 100A

#### 3. Batarya Kesicisi
- **Hesaplama:** Çıkış kesicisi ile aynı
- **Seçim:** MCB 2x100A
- **Excel:** `CircuitBreakers.xlsx` → Aynı kriterler

#### 4. Batarya Akım Okuma Kartı
- **Hesaplama:** Çıkış akımı = 100A (100A ≤ 100A < 200A)
- **Seçim:** L200P
- **Excel:** `CurrentReadingCards.xlsx` → Max Current >= 100A ve < 200A

#### 5. Rectifier Çıkış Akımı Okuma Kartı
- **Hesaplama:** Aynı kurallar
- **Seçim:** L200P
- **Excel:** `CurrentReadingCards.xlsx` → Aynı kriterler

#### 6. Serbest Geçiş Diyotu
- **Hesaplama:** Çıkış akımı × 1.5 = 100 × 1.5 = 150A
- **Seçim:** MDD156-12 (170A) - bir üst segment
- **Excel:** `FreewheelingDiodes.xlsx` → Current Rating >= 150A

#### 7. Giriş Trafosu
- **Güç Hesaplama:**
  ```
  #Trafogücünde çıkış gerilimi ile değil float voltajı ile hesaplamalıyız.
  Trafo Gücü = (100A × Hesaplanan Float gerilimi 48V VRLA için 54V) / (0.9 × 0.8)
             = 5400W / 0.72
             = 7.5 kVA
             Transformers excel sayfasından Output Voltageları eşleşen eşleşmiyorsa en yakın değer için eşleştirme yapılır. Eğer güç Power (kVA) eşleşmiyorsa hesaplanan trafo gücüne yakın bir üst güç değeri.
             Maliyet tablosuna aktarıldığında excelden seçilen trafo  bilgileri değil otomatik hesaplama ile bulunması istenen trafonun Açıklaması yazılır. Örnek olarak [Bu bir matematiksel işlem değil düz metindir.] (Giriş Faz Sayısı)x Giriş gerilim değeri / (Giriş Faz Sayısı) x (Sistemin Float gerilimi) 
  ```
- **Primer:** 3 faz 400V
- **Sekonder:** Float gerilimi (VRLA için hesaplanır, örn: 54V)
- **Topoloji:** 6 Pulse
- **Seçim:** 6.67 kVA, 3 faz 400V → 3 faz 54V, 6 Pulse trafo
- **Excel:** `Transformers.xlsx` → Power Rating ≈ 6.67 kVA, Topology=6 Pulse

#### 8. Faz Kontrol Tristörleri
- **Hesaplama:** (100A × 1.5) / 3 = 150 / 3 = 50A
- **Seçim:** SCR-63A (bir üst segment) × 3 adet
- **Excel:** `Thyristors.xlsx` → Current Rating >= 50A
- **Adet:** B6C için 3 adet

#### 8.1 Faz Kontrol Tristörleri Soğutucuları
- **Hesaplama:** B6C için 3 adet tristör → Her 4 tristör için 1 heatsink + fan
- **Seçim:** 1 adet Heatsink + 1 adet Fan
- **Excel:** `CoolingComponents.xlsx` → Component Type=Heatsink/Fan
- **Not:** Faz kontrol tristörleri soğutucuları her zaman eklenir

#### 9. Giriş Kesicisi
- **Giriş Akımı Hesaplama:**
  ```
  Giriş Voltajı (Toleranslı) = 400V × (1 - 0.10) = 360V
  Giriş Akımı = 6.67 kVA / (360V × √3)
              = 6.67 kVA / 623.5V
              = 10.7A
  ```
- **Seçim:** MCB 3x16A (bir üst değer)
- **Excel:** `CircuitBreakers.xlsx` → Type=MCB, Poles=3, Current Rating > 10.7A

#### 10. Giriş Klemensi
- **Hesaplama:** Giriş akımı = 10.7A
- **Seçim:** 6.0mm Klemens (33A kapasiteli)
- **Excel:** `Terminals.xlsx` → Current Rating >= 10.7A

#### 11. DC Şok ve Kapasitör
- **Kaçak Endüktans Hesaplama:**
  ```
  V = 54V × 0.04 / 1.732 = 1.25V
  I = 6.67 kVA / (54V × √3) = 71.3A
  XL = 1.25V / 71.3A = 0.0175Ω
  L = 0.0175 / (2 × π × 50) = 55.7µH
  ```
- **Kesim Frekansı:** (50Hz × 6) / 10 = 30Hz
- **Seçim:** 1mH DC Şok + 2 adet 4700µF kapasitör (optimize edilmiş kombinasyon)
- **Excel:** `DCComponents.xlsx` → Optimize edilmiş kombinasyon

### Maliyet Listesi Görünümü:
```
Maliyetin cihaza ait bilgiler:
- Müşteri: [Müşteri Adı]
- Teklif Referans: [Teklif No]
- Cihaz Adedi: 1
- Teklif Tarihi: [Tarih]
- Beklenen Teslim: [Teslim Süresi]
- Teslim Şekli: [Incoterms]
- Paketleme: [Paketleme Türü]

Parça Listesi:
1. Çıkış Klemensi 35mm (110A) - 1 adet
2. Çıkış Kesicisi MCB 2x100A - 1 adet
3. Batarya Kesicisi MCB 2x100A - 1 adet
4. Batarya Akım Okuma Kartı L200P - 1 adet
5. Rectifier Çıkış Akımı Okuma Kartı L200P - 1 adet
6. Serbest Geçiş Diyotu MDD156-12 (170A) - 1 adet
7. Giriş Trafosu 6.67 kVA 3x400V→3x54V 6 Pulse - 1 adet
8. Faz Kontrol Tristörü SCR-63A - 3 adet
8.1. Heatsink (Faz Kontrol Tristörleri) - 1 adet
8.2. Fan (Faz Kontrol Tristörleri) - 1 adet
9. Giriş Kesicisi MCB 3x16A - 1 adet
10. Giriş Klemensi 6.0mm (33A) - 1 adet
11. DC Şok 1mH - 1 adet
12. DC Bara Kapasitörü 4700µF - 2 adet
13. Kabin SR2 (600×600×1300mm) IP54 RAL7035 - 1 adet

Notlar:
- Marka: EPC
- Hazırlayan: [Kullanıcı Adı]
- Cihaz Dili: TR
```

---

## Senaryo 2: 12 Pulse Sistem (B12C)

### Girdiler:
- **Giriş:** 3 faz, 400V, 50Hz, %10 tolerans
- **Çıkış:** 48V DC, 100A
- **Topoloji:** B12C (12 Pulse) ⚠️ **Değişiklik**
- **Akü Tipi:** VRLA
- **Kesici Tipi:** MCB
- **Kabin:** SR2, IP54, RAL7035

### Senaryo 1'den Farklılıklar:

#### 1. Giriş Trafosu
- **Güç:** Aynı (6.67 kVA)
- **Topoloji:** 12 Pulse ⚠️
- **Maliyet:** Senaryo 1'deki 6 Pulse trafo maliyetinin yaklaşık 2 katı
- **Seçim:** 6.67 kVA, 3 faz 400V → 3 faz 54V, **12 Pulse trafo**
- **Excel:** `Transformers.xlsx` → Topology=12 Pulse

#### 2. Faz Kontrol Tristörleri
- **Hesaplama:** Aynı (50A)
- **Seçim:** SCR-63A × **6 adet** ⚠️ (B6C'de 3 adet, B12C'de 6 adet)
- **Adet:** B12C için 6 adet (3 adet daha fazla)

#### 3. DC Şok ve Kapasitör
- **Kesim Frekansı:** (50Hz × 12) / 10 = **60Hz** ⚠️ (B6C'de 30Hz)
- **Seçim:** Farklı kombinasyon gerekebilir (daha yüksek kesim frekansı için)

### Maliyet Farkı:
- **Trafosu:** ~2x maliyet
- **Tristörler:** +3 adet (3 × SCR-63A maliyeti)
- **Toplam Ek Maliyet:** Trafo maliyeti + 3 tristör maliyeti

---

## Senaryo 3: Giriş RFI Filtre ile

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Ek Özellik:** Giriş RFI Filtre ✅

### Eklenen Parça:

#### Giriş RFI Filtre
- **Seçim Kriterleri:**
  - Giriş voltajı: 400V
  - Faz sayısı: 3 faz
  - Giriş akımı: 10.7A (hesaplanan)
- **Seçim:** 3 faz 400V, ≥10.7A kapasiteli RFI filtre
- **Excel:** `Options.xlsx` → Option Type=Input RFI Filter, Input Voltage=400V, Input Phase=3, Input Current >= 10.7A

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. Giriş RFI Filtre 3x400V ≥10.7A - 1 adet
```

---

## Senaryo 4: Diyot Dropper ile

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Diyot Dropper:** 2 kademe
- **1. Kademe Voltaj Düşüşü:** 6V
- **2. Kademe Voltaj Düşüşü:** 12V

### Eklenen Parçalar:

#### 1. Diyot Dropper Modülleri
- **1. Kademe:** 6V / 1.5 = 4 modül
- **2. Kademe:** 12V / 1.5 = 8 modül
- **Toplam:** 12 modül
- **Excel:** `DiodeDroppers.xlsx` → Module Type=Dropper Module

#### 2. Diyot Dropper Diyotları
- **Hesaplama:** Çıkış akımı × 1.5 = 100 × 1.5 = 150A
- **Seçim:** MDD156-12 (170A) × 2 adet (her kademe için)
- **Excel:** `FreewheelingDiodes.xlsx` → Current Rating >= 150A

#### 3. Diyot Dropper Röleleri
- **Hesaplama:** Çıkış akımı = 100A
- **Seçim:** 100A röle × 2 adet (her kademe için)
- **Excel:** `Relays.xlsx` → Current Rating = 100A

#### 4. Soğutucu ve Fanlar (Diyot Dropper)
- **Hesaplama:** Dropper'da kullanılacak diyot sayısına göre
- **Kural:** Her 4 adet diyot için 1 adet Heatsink + 1 adet Fan
- **Örnek Senaryo 4:** 2 diyot (2 kademe × 1 diyot/kademe) → 1 adet Heatsink + 1 adet Fan (2 < 4 olduğu için 1 adet)
- **Excel:** `CoolingComponents.xlsx` → Component Type=Heatsink/Fan
- **Not:** Dropper soğutucuları, faz kontrol tristörleri soğutucularından ayrı olarak eklenir

#### 5. Röle Kontrol Kartları
- **Seçim:** Röle kontrol kartı × 2 adet (her kademe için)
- **Excel:** `ControlCards.xlsx` → Card Type=Relay Control

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. Diyot Dropper Modülü - 12 adet (4+8)
15. Diyot Dropper Diyotu MDD156-12 (170A) - 2 adet
16. Diyot Dropper Rölesi 100A - 2 adet
17. Heatsink (Diyot Dropper) - 1 adet (2 diyot için: 2/4 = 0.5 → 1 adet)
18. Fan (Diyot Dropper) - 1 adet (2 diyot için: 2/4 = 0.5 → 1 adet)
19. Röle Kontrol Kartı (Diyot Dropper) - 2 adet
```

---

## Senaryo 5: Akü LVD ile

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Akü LVD:** Var ✅

### Eklenen Parçalar:

#### 1. LVD Röle Kontrol Kartı
- **Seçim:** LVD kontrol kartı
- **Excel:** `ControlCards.xlsx` → Card Type=LVD Control

#### 2. LVD Rölesi
- **Hesaplama:** Çıkış akımı × 1.2 = 100 × 1.2 = 120A
- **Seçim:** 120A röle (bir üst segment, örn: 125A)
- **Excel:** `Relays.xlsx` → Current Rating >= 120A

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. LVD Röle Kontrol Kartı - 1 adet
15. LVD Rölesi 125A - 1 adet
```

---

## Senaryo 6: Paralel Çalışma Aktif

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Paralel Çalışma:** Aktif ✅

### Eklenen Parçalar:

#### 1. Paralelleme Kartı
- **Seçim:** Paralelleme kontrol kartı
- **Excel:** `ControlCards.xlsx` → Card Type=Parallel Operation

#### 2. RJ45 Portu
- **Seçim:** RJ45 portu
- **Excel:** `CommunicationComponents.xlsx` → Component Type=RJ45 Port

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. Paralelleme Kartı - 1 adet
15. RJ45 Portu - 1 adet
```

---

## Senaryo 7: Çalışma Sıcaklığı -10°C

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Çalışma Sıcaklığı:** -10°C/40°C ⚠️

### Eklenen Parça:

#### Kabin İçi Isıtıcı
- **Koşul:** Minimum sıcaklık ≤ -10°C
- **Seçim:** Kabin boyutuna göre (SR2) termostat ısıtıcı
- **Excel:** `CabinetAccessories.xlsx` → Accessory Type=Heater, Cabinet Size=SR2
- **Otomatik İşaretleme:** `featureCabinetHeater` ek özellik olarak işaretlenir

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. Kabin İçi Isıtıcı SR2 - 1 adet
```

---

## Senaryo 9: Ölçü Aletleri ile

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Ölçü Aletleri:**
  - Analog Voltmetre - Çıkış gerilimi
  - Dijital Voltmetre - Akü gerilimi
  - Multimetre - Giriş

### Eklenen Parçalar:

#### 1. Çıkış Voltmetresi
- **Voltaj Aralığı:** 48V × 1.2 = 57.6V → **0-60V**
- **Gösterim:** "Çıkış Voltmetresi 0-60V"
- **Excel:** `MeasurementInstruments.xlsx` → Instrument Type=Analog, Measurement Point=Çıkış, Voltage Range >= 57.6V

#### 2. Akü Voltmetresi
- **Voltaj Aralığı:** 48V × 1.2 = 57.6V → **0-60V**
- **Gösterim:** "Akü Voltmetresi 0-60V"
- **Excel:** `MeasurementInstruments.xlsx` → Instrument Type=Dijital, Measurement Point=Akü, Voltage Range >= 57.6V

#### 3. Giriş Multimetresi
- **Voltaj Aralığı:** 400V × 1.2 = 480V → **0-500V**
- **Gösterim:** "Giriş Multimetresi 0-500V"
- **Excel:** `MeasurementInstruments.xlsx` → Instrument Type=Multimetre, Measurement Point=Giriş, Voltage Range >= 480V

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. Çıkış Voltmetresi 0-60V - 1 adet
15. Akü Voltmetresi 0-60V - 1 adet
16. Giriş Multimetresi 0-500V - 1 adet
```

---

## Senaryo 10: Dahili Dağıtım ile

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Dahili Dağıtım:** Var ✅
- **Dahili Dağıtım Detayları:**
  - Adet: 3
  - Kutup Akım Bilgisi: 3x15A

### Eklenen Parçalar:

#### Dahili Dağıtım Kesicileri
- **Seçim:** MCB 3x15A × 3 adet
- **Excel:** `CircuitBreakers.xlsx` → Type=MCB, Poles=3, Current Rating=15A
- **Not:** Kullanıcı combobox'tan seçebilir

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. Dahili Dağıtım Kesicisi MCB 3x15A - 3 adet
```

---

## Senaryo 11: Özel Kabin Boyutu

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Kabin Boyutu:** Özel Boyutlar
- **Özel Boyutlar:** 800mm × 700mm × 1800mm

### Kabin Seçimi:

#### Özel Kabin
- **Boyutlar:** 800×700×1800mm
- **Gösterim:** "Cabinet Custom (800×700×1800mm) IP54 RAL7035"
- **Excel:** `Cabinets.xlsx` → Width≈800mm, Depth≈700mm, Height≈1800mm (tolerance: ±10mm)
- **Fiyatlandırma:** Boyut tablosuna göre

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar (kabin hariç) ...]

13. Kabin Custom (800×700×1800mm) IP54 RAL7035 - 1 adet
```

---

## Senaryo 12: Farklı Kabin Rengi

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Kabin Rengi:** RAL7040 ⚠️ (Standart: RAL7035)

### Eklenen Maliyet:

#### Kabin Renk Değişimi Ücreti
- **Koşul:** RAL7035'ten farklı renk
- **Seçim:** RAL7040 için ek ücret
- **Excel:** `CabinetColors.xlsx` → Color Code=RAL7040, Is Standard=false

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. Kabin Renk Değişimi Ücreti (RAL7040) - 1 adet
```

---

## Senaryo 13: Farklı IP Koruma Sınıfı

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Koruma Sınıfı:** IP65 ⚠️ (Standart: IP20)

### Eklenen Maliyet:

#### IP Koruma Sınıfı Ek Maliyeti
- **Koşul:** Standart IP'den farklı
- **Seçim:** IP65 için ek maliyet
- **Excel:** `IPProtectionClasses.xlsx` → Protection Class=IP65

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. IP Koruma Sınıfı Ek Maliyeti (IP65) - 1 adet
```

---

## Senaryo 14: Transducer 4 Kanal

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Ek Özellik:** Transducer 4 kanal ✅

### Eklenen Parça:

#### Transducer 4 Kanal
- **Seçim:** 4 kanallı transducer
- **Excel:** `Options.xlsx` → Option Type=Transducer, Channels=4

### Maliyet Listesi Görünümü:
```
[... Senaryo 1'deki tüm parçalar ...]

14. Transducer 4 Kanal - 1 adet
```

---

## Senaryo 15: Kompleks Sistem (Tüm Özellikler)

### Girdiler:
- Senaryo 1'in tüm girdileri +
- **Topoloji:** B12C (12 Pulse)
- **Diyot Dropper:** 2 kademe
- **Dahili Dağıtım:** Var (3 adet 3x15A)
- **Akü LVD:** Var
- **Paralel Çalışma:** Aktif
- **Çalışma Sıcaklığı:** -10°C/50°C
- **Ek Özellikler:**
  - Giriş RFI Filtre
  - Transducer 8 kanal
  - Kabin İçi Aydınlatma
  - Servis Prizi

### Seçilen Parçalar:
1. Senaryo 1'deki tüm zorunlu parçalar
2. **12 Pulse trafo** (6 Pulse'ın 2 katı maliyet)
3. **6 adet tristör** (B6C'den 3 adet fazla)
4. **Diyot Dropper bileşenleri** (modül, diyot, röle, soğutucu, fan, kontrol kartı)
5. **Dahili dağıtım kesicileri** (3 adet MCB 3x15A)
6. **LVD bileşenleri** (kontrol kartı, röle)
7. **Paralelleme bileşenleri** (kart, RJ45)
8. **Kabin ısıtıcısı** (-10°C için)
9. **Giriş RFI Filtre**
11. **Transducer 8 kanal**
12. **Kabin aksesuarları** (aydınlatma, servis prizi)

### Toplam Maliyet:
- Temel sistem maliyeti
- + Trafo maliyet farkı (12 pulse)
- + 3 tristör maliyeti
- + Diyot Dropper maliyeti
- + Dahili dağıtım maliyeti
- + LVD maliyeti
- + Paralelleme maliyeti
- + Kabin ısıtıcısı maliyeti
- + RFI filtre maliyeti
- + Transducer maliyeti
- + Kabin aksesuarları maliyeti

---

## Önemli Notlar

1. **Bir Üst Değer Seçimi:** Tüm akım ve voltaj bazlı seçimlerde güvenlik marjı için bir üst değer seçilir.

2. **Topoloji Etkisi:** B12C seçildiğinde trafo maliyeti yaklaşık 2 katına çıkar ve 3 adet daha fazla tristör kullanılır.

3. **Koşullu Parçalar:** Bazı parçalar sadece belirli koşullar sağlandığında eklenir (LVD, Paralelleme, vb.).

4. **Excel Eşleştirme:** Tüm parçalar ilgili Excel dosyalarından kriterlere göre otomatik seçilir.

5. **Maliyet Çarpımı:** Cihaz adedi ile tüm maliyet çarpılır (toplam maliyet).

6. **Kullanıcı Tercihleri:** MCB/MCCB seçimi, kesici tipi gibi bazı seçimler kullanıcı tercihine bağlıdır.

---

## Referans Dosyalar

- `RECTIFIER_INPUTS_REFERENCE.md` - Girdi referans listesi
- `RECTIFIER_COMPONENT_SELECTION_RULES.md` - Parça seçim kuralları
- `RECTIFIER_EXCEL_MAPPING.json` - Excel mapping konfigürasyonu
- `plan-rec.md` - Sistem koşulları
- `rectifier_icin_pricing_deneme.txt` - Hesaplama formülleri
