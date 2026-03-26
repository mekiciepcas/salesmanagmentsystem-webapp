# Rectifier Excel Otomatik Güncelleme ve Parça Listesi - Uygulama Rehberi

Bu doküman, Excel içinde otomatik form güncelleme, sonuç hesaplama ve parça listesi oluşturma özelliklerinin nasıl uygulanacağını açıklar.

## 📋 Yapılacaklar Listesi

### 1. Otomatik Güncelleme Mekanizması
- ✅ Worksheet_Change event'i ekle
- ✅ Girdi değiştiğinde otomatik hesaplama
- ✅ Formül bazlı hesaplamalar (Float, Boost gerilimleri vb.)
- ✅ Dinamik alan gösterimi/gizleme

### 2. Parça Listesi Sayfası
- ✅ Otomatik oluşturulan parça listesi
- ✅ Değer bazlı gösterim (başka sayfadan seçim yok)
- ✅ Hesaplanan değerlerle birlikte

### 3. Sonuç Gösterimi
- ✅ Hesaplanan değerlerin otomatik gösterimi
- ✅ Parça seçim bilgilendirmeleri
- ✅ Görsel formatlama

## 🔧 Uygulama Adımları

### Adım 1: Worksheet Event Handler Ekleme

`ThisWorkbook` modülüne veya `Rectifier Girdileri` sayfasına Worksheet_Change event'i eklenmelidir.

### Adım 2: Formül Bazlı Hesaplamalar

Bazı alanlar formül ile otomatik hesaplanmalı:
- Float/Boot/Equalization gerilimleri (hücre başı × hücre sayısı)
- Trafo gücü
- Giriş akımı
- vb.

### Adım 3: Parça Listesi Sayfası

Yeni bir sayfa oluşturulmalı ve parçalar otomatik listelenmeli.

### Adım 4: Otomatik Güncelleme Tetikleyicileri

Belirli hücreler değiştiğinde otomatik hesaplama yapılmalı.

## 📝 Kod Yapısı

1. **CreateRectifierInputSheet()** - Ana sayfa oluşturma (güncellenecek)
2. **Worksheet_Change()** - Otomatik güncelleme event'i (yeni)
3. **UpdateCalculatedFields()** - Hesaplanan alanları güncelle (yeni)
4. **CreateComponentListSheet()** - Parça listesi sayfası oluştur (yeni)
5. **UpdateComponentList()** - Parça listesini güncelle (yeni)

## 🎯 Özellikler

### Otomatik Hesaplanan Alanlar
- Float/Boot/Equalization gerilimleri (toplam)
- Trafo gücü
- Giriş akımı
- AC Güç Faktörü
- DC Ripple
- Hücre sayısı
- Hücre başı gerilim

### Otomatik Güncellenen Parçalar
- Çıkış/Batarya/Giriş Klemensleri
- Kesiciler
- Akım Okuma Kartları
- Tristörler
- Diyotlar
- Soğutucu ve Fanlar
- DC Şok ve Kapasitörler
- Terminaller

### Dinamik Gösterim
- Özel kabin boyutları (seçildiğinde göster)
- Dahili akü detayları (seçildiğinde göster)
- Dahili dağıtım detayları (seçildiğinde göster)



