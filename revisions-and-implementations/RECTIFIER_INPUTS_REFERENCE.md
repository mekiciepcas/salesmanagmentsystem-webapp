# Rectifier Pricing - Girdi Referans Listesi

Bu doküman, Rectifier Pricing sisteminde kullanılan tüm girdi alanlarının kapsamlı listesini içermektedir.

---

## 1. Proje Bilgileri / Project Information

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler |
|----------|---------------|-----|----------|----------------|
| Müşteri Adı | `customerName` | String | Dashboard'dan seçilen müşteri | Database'den çekilir |
| Teklif Referans Numarası | `quoteRef` | String | Satışçının belirlediği teklif numarası | Kullanıcı girişi |
| Cihaz Adedi | `deviceCount` | Number | Üretilecek cihaz sayısı | 1, 2, 3, ... |
| Teklif Tarihi | `quoteDate` | Date | Teklif oluşturulma tarihi | Otomatik (bugünün tarihi) |
| Beklenen Teslim Tarihi | `deliveryWindow` | String | Teslim süresi aralığı | 6-8 Hafta, 8-10 Hafta, 10-12 Hafta, 12-14 Hafta, 14-16 Hafta, 16-18 Hafta, 18-20 Hafta |
| Teslim Şekli/Incoterms | `incoterms` | String | Teslim koşulları | Kullanıcı girişi (EXW, FOB, CIF, vb.) |
| Paketleme Türü | `packingType` | String | Paketleme tipi | Karton Kutu, Kontra, Mühürlü Kontra |
| Marka | `brand` | String | Cihaz markası | Kullanıcı girişi (varsayılan: EPC) |
| Cihaz Dili | `deviceLanguage` | String | Cihaz arayüz dili | TR, EN, vb. |
| Hazırlayan Kişi | `preparedBy` | String | Teklifi hazırlayan kişi | Otomatik (giriş yapan kullanıcı) |

---

## 2. Cihaz Giriş Bilgileri / Device Input Information

### 2.1 Nominal Giriş Parametreleri

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler |
|----------|---------------|-----|----------|----------------|
| Nominal Giriş Gerilimi (AC) | `inputVoltageNominal` | Number | Faz-faz gerilim değeri | 66V, 115V, 120V, 220V, 230V, 240V, 280V, 380V, 400V, 415V, 440V, 480V, 600V |
| Giriş Gerilimi Tolerans Aralığı | `inputVoltageTolerance` | String | Gerilim toleransı | +/-5%, +/-10%, +/-15%, -5% +10%, -10% +5%, -15% +10%, -10% +15% |
| Giriş Faz Sayısı | `inputPhase` | Number | AC giriş faz sayısı | 1 (Tek Faz), 3 (Üç Faz) |
| Giriş Nötr Bağlantısı | `inputNeutral` | String | Nötr bağlantı durumu | Nötr Var / Neutral Exist, Nötr Yok / No Neutral |
| Giriş Frekansı | `systemFrequency` | Number | Sistem frekansı | 50Hz, 60Hz, 400Hz |

### 2.2 Hesaplanan Parametreler

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Hesaplama Yöntemi |
|----------|---------------|-----|----------|-------------------|
| AC Giriş Güç Faktörü | `acPowerFactor` | Number | Nominal yükte güç faktörü | Otomatik: 3 faz → 0.8, 1 faz → 0.7 (Topolojiye göre değişebilir) |
| AC Giriş Akımı THD | `acInputCurrentTHD` | Number | Nominal yükte akım harmonik distorsiyonu | Standart: <30%, Değiştirilebilir (Faz ve topolojiye göre otomatik güncellenir) |

---

## 3. Cihaz Çıkış Bilgileri / Device Output Information

### 3.1 Nominal Çıkış Parametreleri

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler / Açıklama |
|----------|---------------|-----|----------|---------------------------|
| Nominal Çıkış Gerilimi (DC) | `outputVoltage` | Number | DC çıkış gerilimi | Kullanıcı girişi (V) |
| Nominal Çıkış Akımı (DC) | `outputCurrent` | Number | DC çıkış akımı | Kullanıcı girişi (A) |
| Topoloji (Devre Şekli) | `topology` | String | Doğrultucu topolojisi | **Tek Faz için:** B2H, SNMPS, IGBT Doğrultucu<br>**Üç Faz için:** B6C, B12C, SNMPS, IGBT Doğrultucu |
| DC Bus Ripple (Aküsüz) | `dcRipple` | Number | DC bara dalgalılığı | Standart: <5%, Değiştirilebilir (%) |

### 3.2 Ek Çıkış Özellikleri

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler |
|----------|---------------|-----|----------|----------------|
| Ek Yük Çıkışı | `extraLoadOutput` | String | Ek yük çıkışı varlığı | Var, Yok |
| Diyot Dropper | `diodeDropper` | String | Diyot dropper tipi | 1 kademe, 2 kademe, 3 kademe, 4 kademe, DC-DC kıyıcılı |
| Dahili Dağıtım | `internalDistribution` | String | Dahili dağıtım varlığı | Var, Yok |
| Dahili Dağıtım Detayları | `internalDistributions` | Array | Dahili dağıtım listesi | Her biri: { quantity: Number, breakerPoleCurrent: String (örn: "3x15A") } |
| Akü LVD | `batteryLVD` | String | Akü düşük gerilim kesicisi | Var, Yok |

---

## 4. Akü Bilgileri / Battery Information

### 4.1 Akü Konfigürasyonu

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler |
|----------|---------------|-----|----------|----------------|
| Akü Tipi | `batteryType` | String | Batarya teknolojisi | VRLA, Ni-CD, Li-ion |
| Batarya Voltajı | `batteryVoltage` | Number | Nominal batarya gerilimi | Otomatik (çıkış gerilimi ile eşitlenir) |
| Kutu İçinde Dahili Akü | `batteryInCabinet` | String | Dahili akü varlığı | Var / Yes, Yok / No |
| Dahili Akü Adedi | `internalBatteryQuantity` | Number | Dahili akü sayısı | Sayısal değer (1, 2, 3, ...) |
| Dahili Akü Adı | `internalBatteryName` | String | Dahili akü modeli/adı | Metin |

### 4.2 Hesaplanan Akü Parametreleri

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Hesaplama Yöntemi |
|----------|---------------|-----|----------|-------------------|
| Toplam Hücre Sayısı | `batteryCellCount` | Number | Toplam hücre adedi | Otomatik: Batarya Voltajı / Hücre Başı Gerilim |
| Hücre Başı Gerilim | `batteryVoltagePerCell` | Number | Nominal hücre gerilimi | VRLA: 2V, Diğerleri: Batarya Voltajı / Hücre Sayısı |
| Float Gerilimi (Hücre Başı) | `floatVoltagePerCell` | Number | Float şarj gerilimi | VRLA: 2.24V (değiştirilebilir), Diğerleri: Hesaplanır |
| Dengeleme Gerilimi (Hücre Başı) | `equalizationVoltagePerCell` | Number | Equalize şarj gerilimi | VRLA: 2.40V (değiştirilebilir), Diğerleri: Hesaplanır |
| Boost Gerilimi (Hücre Başı) | `boostVoltagePerCell` | Number | Boost şarj gerilimi | VRLA: 2.40V (değiştirilebilir), Diğerleri: Hesaplanır |
| Toplam Float Gerilimi | `floatVoltage` | Number | Toplam float gerilimi | Hücre Sayısı × Float Gerilimi (Hücre Başı) |
| Toplam Dengeleme Gerilimi | `equalizationVoltage` | Number | Toplam equalize gerilimi | Hücre Sayısı × Dengeleme Gerilimi (Hücre Başı) |
| Toplam Boost Gerilimi | `boostVoltage` | Number | Toplam boost gerilimi | Hücre Sayısı × Boost Gerilimi (Hücre Başı) |
| Ek Notlar | `batteryNotes` | String | Akü ile ilgili ek notlar | Metin |

---

## 5. Cihaz Mekanik Bilgileri / Device Mechanical Information

### 5.1 Kabin Bilgileri

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler |
|----------|---------------|-----|----------|----------------|
| Kabin Tipi | `cabinetType` | String | Kabin montaj tipi | Dikili Tip, Duvar Montaj, Rack Montaj, Özel Tasarım |
| Özel Kabin Tasarımı | `customCabinetDesign` | String | Özel tasarım açıklaması | Metin (özel tasarım için) |
| Kabin Boyutu | `cabinetSize` | String | Standart kabin boyutu | SR1 (450×500×1000mm), SR2 (600×600×1300mm), SR3 (750×700×1600mm), Özel Boyutlar |
| Özel Kabin Genişliği | `customCabinetWidth` | Number | Özel kabin genişliği | mm cinsinden |
| Özel Kabin Derinliği | `customCabinetDepth` | Number | Özel kabin derinliği | mm cinsinden |
| Özel Kabin Yüksekliği | `customCabinetHeight` | Number | Özel kabin yüksekliği | mm cinsinden |
| Koruma Sınıfı | `protectionClass` | String | IP koruma sınıfı | IP00, IP01, IP02, IP10, IP11, IP12, IP13, IP20, IP21, IP22, IP23, IP30, IP31, IP32, IP33, IP34, IP40, IP41, IP42, IP43, IP44, IP45, IP46, IP54, IP55, IP56, IP65, IP66, IP67 |
| Kabin Rengi | `cabinetColor` | String | RAL renk kodu | RAL7032, RAL7035, RAL7040, RAL7047, RAL1013, RAL9005 |
| Kablo Girişi | `cableEntry` | String | Kablo giriş konumu | Üstten, Alttan, Üstten ve Alttan, Önden, Arkadan |
| Sac Tipi | `sheetType` | String | Kabin sac kalınlığı | Galvaniz Sac 1.5mm, Galvaniz Sac 2mm, Galvaniz Sac 3mm |
| Soğutma | `cooling` | String | Soğutma tipi | Hava Zorlamalı, Doğal, Sulu |
| Hava Akış Yönü | `airflowDirection` | String | Hava akış yönü | Üstten, Arkadan, Yanlardan, Üstten ve Yanlardan, Yanlardan ve Arkadan, Önden arkaya |
| Çalışma Sıcaklığı | `operatingTemperature` | String | Çalışma sıcaklık aralığı | 0°C/45°C, -5°C/40°C, -5°C/45°C, -5°C/50°C, -10°C/40°C, -10°C/45°C, -10°C/50°C |

---

## 6. Kullanıcı Arayüzü / User Interface

### 6.1 Ön Panel

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler |
|----------|---------------|-----|----------|----------------|
| Ön Panel | `frontPanel` | String | Panel tipi | LCD+LED Panel, LCD, Dokunmatik 7" renkli, Mimic Panel, LCD+LED Panel+Mimic Panel |

### 6.2 Ölçü Aletleri

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler |
|----------|---------------|-----|----------|----------------|
| Ölçü Aletleri Listesi | `measurementInstruments` | Array | Tip ve ölçüm noktası çiftleri | Her biri: { type: String, point: String }<br>**Tip:** Analog, Dijital, Multimetre, Enerji analizörü<br>**Ölçüm Noktası:** Yük gerilimi, Akü gerilimi, Akü akımı, Giriş gerilimler, Giriş akımlar |

---

## 7. Haberleşme Arayüzü / Communication Interface

| Alan Adı | Kod Değişkeni | Tip | Açıklama | Olası Değerler |
|----------|---------------|-----|----------|----------------|
| Haberleşme Protokolü | `communicationProtocol` | String | İletişim protokolü | Modbus RTU RS232, Modbus RTU RS485, Modbus RTU RS232 + Modbus RTU RS485, Modbus TCP/IP, IEC61850, Modbus RTU RS485 + IEC61850, Profinet, Profibus |
| Röle Kuru Kontak Alarm Çıkışları | `relayAlarmOutputs` | String | Röle çıkış sayısı | 4 Adet, 8 Adet, 12 Adet, 16 Adet |
| Paralel Çalışma | `parallelOperation` | String | Paralel çalışma modu | Pasif (standart), Yok, Aktif |

---

## 8. Alarm & Koruma / Alarm & Protection

### 8.1 Standart Alarmlar

| Alarm Adı | Kod Değişkeni | Tip | Açıklama |
|-----------|---------------|-----|----------|
| Şebeke Yok / Line Failure | `alarmLineFailure` | Boolean | Şebeke kesintisi alarmı |
| DC Düşük / DC Low | `alarmDCLow` | Boolean | DC gerilim düşük alarmı |
| DC Yüksek / DC High | `alarmDCHigh` | Boolean | DC gerilim yüksek alarmı |
| Aşırı Sıcaklık / Over Temperature | `alarmOverTemp` | Boolean | Aşırı ısınma alarmı |
| Akım Sınırlama / Current Limiting | `alarmCurrentLimit` | Boolean | Akım sınırlama alarmı |
| Akü Düşük / Battery Low | `alarmBatteryLow` | Boolean | Akü gerilim düşük alarmı |
| Akü Çok Düşük / Battery Too Low | `alarmBatteryTooLow` | Boolean | Akü gerilim çok düşük alarmı |
| Kesici Açık / Breaker Open | `alarmBreakerOpen` | Boolean | Kesici açık durumu alarmı |
| Toprak Kaçağı / Earth Fault | `alarmEarthFault` | Boolean | Toprak kaçağı alarmı |
| Sıcaklık Probu Yok / T. Probe Failure | `alarmTProbeFailure` | Boolean | Sıcaklık probu arızası |
| Acil Durdurma / Emergency Stop | `alarmEmergencyStop` | Boolean | Acil durdurma durumu |

### 8.2 Ek Alarmlar

| Alan Adı | Kod Değişkeni | Tip | Açıklama |
|----------|---------------|-----|----------|
| Ek Alarmlar Listesi | `additionalAlarms` | Array | Kullanıcı tanımlı ek alarmlar | String array |

---

## 9. Ek Özellikler / Additional Features

Ek özellikler checkbox listesi olarak sunulur ve seçilen özellikler `selectedFeatures` Set'inde tutulur.

| Özellik Adı | Kod Değişkeni | Açıklama |
|-------------|---------------|----------|
| Giriş Gerilim Bastırıcı | `featureInputSurge` | Input Surge Suppression |
| Çıkış Gerilim Bastırıcı | `featureOutputSurge` | Output Surge Suppression |
| Hızlı Yarıiletken Sigortalar | `featureRapidFuses` | Rapid Semic. Fuses |
| Kabin İçi Aydınlatma | `featureCabinetLighting` | Cabinet Internal Lighting |
| Kabin İçi Isıtıcı | `featureCabinetHeater` | Cabinet Termostat Heater |
| Giriş Akımı Ölçümü | `featureInputCurrentMeas` | Input Current Measurement |
| Acil Durdurma Butonu | `featureEmergencyStopBtn` | Emergency Stop Button |
| Transducer 4 kanal | `featureTransducer4ch` | Transducers 4 channels |
| Transducer 8 kanal | `featureTransducer8ch` | Transducers 8 channels |
| Servis Prizi | `featureServicePlug` | Service Plug |
| Potansiyometre(ler) | `featurePotentiometer` | Potentiometer(s) |
| Mod Seçici Anahtar | `featureModeSelector` | Mode Selector |
| Giriş RFI Filtre | `featureInputRFIFilter` | Input RFI Filter |
| Alarm Sıfırlama Butonu | `featureAlarmResetBtn` | Alarm Reset Button |

---

## Notlar

- Tüm sayısal değerler için birimler belirtilmiştir (V, A, Hz, mm, °C, vb.)
- Otomatik hesaplanan alanlar kullanıcı tarafından değiştirilebilir (readonly değildir)
- Bazı alanlar diğer alanlara bağlı olarak dinamik güncellenir (örnek: Topoloji seçimi → Faz seçenekleri değişir)
- Girdi validasyonu `validateInputs()` fonksiyonu ile yapılır
- Tüm girdiler `getProjectConfig()` fonksiyonu ile tek bir config objesi olarak toplanır

---

## İlgili Dosyalar

- `rectifier-pricing.js` - Ana uygulama mantığı
- `rectifier-pricing.html` - Form arayüzü
- `RECTIFIER_EXCEL_REHBERI.md` - Excel dosya yapıları
- `RECTIFIER_COMPONENT_SELECTION_RULES.md` - Parça seçim kuralları (oluşturulacak)
