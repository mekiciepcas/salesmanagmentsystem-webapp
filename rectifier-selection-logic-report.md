# Rectifier Selection Logic Report

## Amaç
Bu rapor, `rectifier-pricing.js` içinde otomatik parça seçiminde kullanılan temel mantığı ve mevcut varsayımları özetler.

## Ana Hesaplama Girdileri
- Giriş gerilimi
- Giriş faz sayısı
- Çıkış gerilimi
- Çıkış akımı
- Akü gerilimi
- Topoloji
- Kesici tipi
- Paralel çalışma
- Röle alarm çıkış adedi
- Ölçü aleti seçimleri
- Dahili dağıtım detayları

## Temel Hesaplama Adımları

### 1. Trafo Gücü
Formül:

```text
Trafo Gücü (kVA) = (Çıkış Akımı x Float Gerilimi) / (Verim x Güç Faktörü) / 1000
```

Varsayımlar:
- 3 faz için verim: `0.9`
- 1 faz için verim: `0.8`
- 3 faz için güç faktörü: `0.8`
- 1 faz için güç faktörü: `0.7`

### 2. Giriş Akımı
Formül:

```text
Giriş Akımı = Trafo Gücü / (Toleranslı Giriş Gerilimi x sqrt(Faz Sayısı))
```

### 3. Sekonder Gerilim
Kural:
- 3 faz sistemde `floatVoltage`
- 1 faz sistemde `boostVoltage`

### 4. DC Şok ve Kapasitör
Kullanılan yaklaşım:
- Kaçak endüktans hesaplanır
- Hedef kesim frekansına göre DC şok ve kapasitör kombinasyonu seçilir

## Parça Bazlı Seçim Kuralları

### Terminaller
- Çıkış terminalleri: çıkış akımına göre
- Giriş terminalleri: hesaplanan giriş akımına göre
- Alarm terminalleri: röle alarm çıkış adedine göre

Kural:

```text
Seçilen terminal akım kapasitesi >= gerekli akım
```

### Kesiciler
- Giriş kesicisi: giriş akımına göre
- Çıkış kesicisi: çıkış akımına göre
- Batarya kesicisi: çıkış kesicisiyle aynı ya da ayrı seçim
- Dahili dağıtım kesicileri: kullanıcı girilen `NxMA` değerine göre

Filtreler:
- kutup sayısı
- kesici tipi
- akım kapasitesi

### Tristörler
Formül:

```text
Gerekli tristör akımı = (Çıkış Akımı x 1.5) / Faz Sayısı
```

Adet:
- `B2H` -> 2
- `B6C` -> 3
- `B12C` -> 6

### Serbest Geçiş Diyodu
Formül:

```text
Gerekli diyot akımı = Çıkış Akımı x 1.5
```

### Röleler
- LVD rölesi:

```text
Gerekli akım = Çıkış Akımı x 1.2
```

- Dropper rölesi:

```text
Gerekli akım = Çıkış Akımı
```

### Soğutma
- Tristör heatsink sayısı:

```text
max(ceil(tristör adedi / 4), ceil(çıkış akımı / 200))
```

- Fan adedi:
  - taban `3`
  - çıkış akımı `100A` üzerindeyse her `50A` için `+1` fan
- Termostat adedi:
  - soğutucu adedi kadar

### Standart Sabit Parçalar
- `Besleme Trafosu 20VA 230V / 2x18V 50Hz Isolated`
- `NTC 10K Wired`
- `Fuse 2A 10.38 500V`
- `Fuse Holder 10.38`

Bu parçalar projede kullanıcı seçimine bağlı olmadan standart kural ile eklenir.

### Akü ve Toprak Bağlantıları
- `Akü terminali kırmızı`
- `Akü terminali siyah`

Bu iki kalem, çıkış terminali ile aynı akım seçme kuralını kullanır.

- `Toprak barası`

Toprak barası, busbar/terminal verileri içinden uygun akım kapasitesine göre seçilir.

### Panel Bağımlı Kalemler
- `Led Panel` seçildiyse panel kalemi eklenir.
- `Touch Panel` seçildiyse:
  - `Touch Panel`
  - `Touch Panel Power Supply`
  - `Besleme Trafosu 2`
  eklenir.

### Ölçü Aletleri
- Ölçüm noktası: `Giriş`, `Yük/Çıkış`, `Akü`
- Gerilim aralığı:

```text
Gerekli ölçüm aralığı = ilgili gerilim x 1.2
```

### Haberleşme
- Paralel çalışma aktifse paralelleme kartı ve RJ45 portu
- Haberleşme protokolü seçiliyse ilgili haberleşme modülü

## Mevcut Varsayımlar ve Dikkat Noktaları
- Bazı seçimler doğrudan Excel ürün adlarına bağlıdır.
- Bazı kartlar ve opsiyonlar sabit eşleştirme ile seçilir.
- Kabin seçimi mekanik bilgilerden türetilir; Excel’de tam eşleşme yoksa açıklama bazlı fallback olabilir.
- Teknik seçim mantığı modalı yalnız otomatik eklenen satırlarda tam çalışır; manuel satırlarda teknik formül gösterilmez.

## İyileştirme Önerileri
- Tüm parça tipleri için tek tip `selectionLogic` nesnesi üretmek
- Excel mapping dosyasındaki `selectionRules` ile runtime seçim mantığını birebir senkronize etmek
- Manual satırlar için “manuel eklendi” statüsü göstermek
- Teknik seçim raporunu PDF/HTML çıktısına da dahil etmek
