# Rectifier Girdi Sayfası - Parça Seçim Hesaplama Özelliği

## 🆕 Yeni Özellik: Parça Seçim Hesaplama

Girdi sayfasına **"Parçaları Hesapla"** butonu eklendi. Bu buton sayesinde girilen değerlere göre otomatik olarak parça seçim hesaplamaları yapılır ve sonuçlar gösterilir.

## 📋 Nasıl Kullanılır?

### Adım 1: Girdi Değerlerini Doldurun
1. "Rectifier Girdileri" sayfasındaki tüm gerekli alanları doldurun:
   - Çıkış Gerilimi (V)
   - Çıkış Akımı (A)
   - Topoloji
   - Giriş parametreleri
   - Akü bilgileri
   - vb.

### Adım 2: Hesaplamayı Başlatın
**Yöntem 1: Butona Çift Tıklama**
- Sayfanın alt kısmındaki **"📊 PARÇALARI HESAPLA / CALCULATE COMPONENTS"** butonuna çift tıklayın

**Yöntem 2: Makro Çalıştırma**
- `Alt + F8` tuşlarına basın
- `CalculateRectifierComponents` makrosunu seçin
- `Run` butonuna tıklayın

**Yöntem 3: Hızlı Erişim**
- Buton hücresini seçin (mavi renkli hücre)
- `F9` tuşuna basın veya çift tıklayın

### Adım 3: Sonuçları İnceleyin
- Hesaplama tamamlandığında **"Parça Seçim Sonuçları"** adında yeni bir sayfa oluşturulur
- Bu sayfada:
  - Girdi bilgileri
  - Hesaplanan değerler (Trafo gücü, Giriş akımı vb.)
  - Seçilen parçalar listesi
  - Her parça için adet ve açıklama bilgileri

## 📊 Gösterilen Bilgiler

### Hesaplanan Değerler
- **Trafo Gücü (kVA)**: Çıkış gücüne göre hesaplanan trafo gücü
- **Giriş Akımı (A)**: Trafo gücü ve giriş gerilimine göre hesaplanan akım

### Seçilen Parçalar
1. **Çıkış Klemensi/Barası**: Çıkış akımına göre bir üst değer
2. **Çıkış Kesicisi**: Çıkış akımından bir üst değer, kutup sayısına göre
3. **Batarya Kesicisi**: Çıkış kesicisi ile aynı
4. **Batarya Akım Okuma Kartı**: Çıkış akımına göre (L100P/L200P/L300P)
5. **Rectifier Çıkış Akımı Okuma Kartı**: Batarya kartı ile aynı
6. **Serbest Geçiş Diyotu**: Çıkış akımı × 1.5
7. **Faz Kontrol Tristörleri**: Topolojiye göre adet ve akım değeri
8. **Soğutucu (Heatsink)**: Tristör sayısına göre
9. **Fan**: Tristör soğutucuları + akım bazlı ek fanlar
10. **DC Şok**: Topolojiye göre adet (B12C: 2 adet, diğerleri: 1 adet)
11. **DC Kapasitör**: Kesim frekansına göre iteratif seçim
12. **Giriş Kesicisi**: Giriş akımına göre
13. **Giriş Klemensi**: Giriş akımına göre
14. **Terminaller**: Giriş ve çıkış terminalleri
15. **Alarm Terminalleri**: Röle sayısına göre

## ⚙️ Hesaplama Kuralları

### Trafo Gücü Hesaplama
```
Trafo Gücü (kVA) = (Çıkış Akımı × Çıkış Gerilimi) / (Verimlilik × Power Factor)
```
- 3 faz giriş → Verimlilik: 0.9, Power Factor: 0.8
- 1 faz giriş → Verimlilik: 0.8, Power Factor: 0.7

### Giriş Akımı Hesaplama
```
Giriş Akımı = Trafo Gücü / (Giriş Gerilimi × √Faz Sayısı)
```

### Parça Seçim Kuralları
- **Klemensler**: Akım değerine göre bir üst kapasiteli klemens seçilir
- **Kesiciler**: Akım değerine göre bir üst standart değer seçilir
- **Tristörler**: (Çıkış akımı × 1.5) / Faz sayısı
- **Diyotlar**: Çıkış akımı × 1.5
- **Akım Okuma Kartları**: 
  - < 100A → L100P
  - 100A ≤ < 200A → L200P
  - 200A ≤ < 300A → L300P
  - ≥ 300A → Yetkili kişi ile görüşülmeli

## 🔧 Teknik Detaylar

### Girdi Okuma
- Girdi değerleri "Rectifier Girdileri" sayfasındaki F sütunundaki field name'lere göre okunur
- C:E birleşik hücrelerinden değerler alınır
- Boş değerler varsayılan değerlerle doldurulur

### Sonuç Gösterimi
- Sonuçlar "Parça Seçim Sonuçları" sayfasında gösterilir
- Sayfa her hesaplamada yeniden oluşturulur
- Sonuçlar tablo formatında düzenlenir

## ⚠️ Önemli Notlar

1. **Girdi Kontrolü**: Tüm zorunlu alanların doldurulması önerilir
2. **Akü Gerilimleri**: Float ve Boost gerilimleri doğru girilmelidir
3. **Topoloji Seçimi**: B6C, B12C veya B2H seçimi parça sayılarını etkiler
4. **Maliyet Hesaplaması**: Bu özellik sadece parça seçim bilgilerini gösterir, maliyet hesaplaması yapmaz

## 🐛 Sorun Giderme

**Hesaplama çalışmıyor:**
- Girdi sayfasının doğru adla oluşturulduğundan emin olun ("Rectifier Girdileri")
- Gerekli alanların doldurulduğunu kontrol edin
- VBA makrolarının etkin olduğundan emin olun

**Sonuçlar görünmüyor:**
- "Parça Seçim Sonuçları" sayfasının oluşturulduğunu kontrol edin
- Sayfa sekmesinde yeşil renkli sekme görünmelidir

**Yanlış hesaplamalar:**
- Girdi değerlerinin doğru girildiğini kontrol edin
- Özellikle akım ve gerilim değerlerinin birimlerine dikkat edin (A ve V)

## 📝 Örnek Kullanım Senaryosu

1. **Girdiler:**
   - Çıkış Gerilimi: 48V
   - Çıkış Akımı: 100A
   - Topoloji: B6C (6 pulse)
   - Giriş: 3 faz, 400V
   - Float Gerilimi: 54V
   - Boost Gerilimi: 56V

2. **Butona Tıklayın**

3. **Sonuçlar:**
   - Trafo Gücü: ~6.67 kVA
   - Giriş Akımı: ~9.62A
   - Çıkış Klemensi: 35mm (110A)
   - Çıkış Kesicisi: MCB 2x100A
   - Serbest Geçiş Diyotu: MDD156-12 (170A)
   - Faz Kontrol Tristörleri: 3 adet, 50A per tristör
   - Soğutucu: 1 adet
   - Fan: 1 adet
   - DC Şok: 1 adet, 1mH
   - vb.

---

**Versiyon:** 1.1  
**Tarih:** 2024  
**Güncelleme:** Parça seçim hesaplama özelliği eklendi

