# Rectifier Girdi Sayfası Oluşturma Scripti - Kullanım Kılavuzu

Bu script, Excel'de görsel tasarımlar ile birlikte Rectifier sistem tasarımı için kapsamlı bir girdi sayfası oluşturur. Sayfa, parça seçim bilgilendirmeleri içerir ve maliyet hesaplamasına gerek kalmadan hangi parçaların seçilmesi gerektiği hakkında bilgi verir.

## 📋 İçerik

- **Proje Bilgileri**: Müşteri, teklif no, cihaz adedi, lojistik bilgileri
- **Cihaz Giriş Bilgileri**: Nominal giriş parametreleri, faz sayısı, frekans
- **Cihaz Çıkış Bilgileri**: Nominal çıkış parametreleri, topoloji, dropper bilgileri
- **Akü Bilgileri**: Akü konfigürasyonu, gerilim değerleri
- **Mekanik Bilgiler**: Kabin tipi, boyutlar, koruma sınıfı, soğutma
- **Kullanıcı Arayüzü**: Ön panel, ölçü aletleri
- **Haberleşme Arayüzü**: Protokol, alarm çıkışları, paralel çalışma
- **Parça Seçim Kuralları**: Zorunlu ve koşullu parçalar için detaylı bilgilendirmeler

## 🚀 Kurulum ve Kullanım

### Adım 1: VBA Kodunu Excel'e Aktarma

1. Excel'i açın
2. `Alt + F11` tuşlarına basarak VBA editörünü açın
3. Sol taraftaki proje penceresinde, çalışma kitabınızın adına sağ tıklayın
4. `Insert` > `Module` seçeneğini seçin
5. Yeni açılan modül penceresine `Rectifier_Girdi_Sayfasi_Olustur.bas` dosyasının içeriğini kopyalayıp yapıştırın
6. `Ctrl + S` ile kaydedin

### Adım 2: Makroyu Çalıştırma

**Yöntem 1: Makro Penceresinden**
1. Excel'de `Alt + F8` tuşlarına basın
2. `CreateRectifierInputSheet` makrosunu seçin
3. `Run` butonuna tıklayın

**Yöntem 2: Geliştirici Sekmesinden**
1. Excel'de `Geliştirici` (Developer) sekmesine gidin
2. `Makrolar` (Macros) butonuna tıklayın
3. `CreateRectifierInputSheet` makrosunu seçin ve çalıştırın

**Yöntem 3: Hızlı Erişim Çubuğu**
1. `Dosya` > `Seçenekler` > `Hızlı Erişim Çubuğu`
2. `Makrolar` kategorisinden `CreateRectifierInputSheet` makrosunu ekleyin
3. Hızlı erişim çubuğundan tek tıkla çalıştırın

### Adım 3: Sonuç

Makro çalıştırıldığında:
- "Rectifier Girdileri" adında yeni bir sayfa oluşturulur (veya mevcut sayfa temizlenir)
- Tüm girdi alanları ve bilgilendirmeler otomatik olarak eklenir
- Sayfa görsel olarak formatlanır ve renklendirilir
- Parça seçim kuralları bilgilendirme kutuları ile gösterilir

## 🎨 Özellikler

### Görsel Tasarım
- **Renkli Bölüm Başlıkları**: Her bölüm farklı renkte başlık ile ayrılmıştır
- **Alt Bölüm Başlıkları**: Gri arka plan ile alt bölümler belirtilmiştir
- **Bilgilendirme Kutuları**: Yeşil arka planlı bilgilendirme kutuları parça seçim kurallarını gösterir
- **Okunabilir Format**: Satır yükseklikleri ve sütun genişlikleri otomatik ayarlanır

### Girdi Alanları
- **Metin Girişleri**: Beyaz arka planlı metin giriş alanları
- **Sadece Okunur Alanlar**: Gri arka planlı, otomatik hesaplanan alanlar
- **Dropdown Alanlar**: Gri desenli dropdown alanları (gerçek dropdown değil, görsel gösterim)

### Parça Seçim Bilgilendirmeleri

Script, aşağıdaki parçalar için seçim bilgilendirmeleri içerir:

#### Zorunlu Parçalar:
- Giriş Trafosu
- Besleme Trafosu
- Oto Trafo (koşullu)
- DC Şok
- DC Kapasitör
- Faz Kontrol Tristörleri
- Serbest Geçiş Diyotu
- Giriş Kesicisi (MCB/MCCB)
- Giriş Klemensi/Barası
- Çıkış Klemensi/Barası
- Çıkış Kesicisi (MCB/MCCB)
- Batarya Kesicisi (MCB/MCCB)
- Batarya Akım Okuma Kartı
- Rectifier Çıkış Akımı Okuma Kartı

#### Koşullu Parçalar:
- Diyot Dropper
- Dahili Dağıtım Kesicileri
- Akü LVD (Low Voltage Disconnect)
- Paralel Çalışma Kartı ve RJ45 Portu
- Alarm Terminalleri
- Ölçü Aletleri
- Haberleşme Protokolü Modülleri

## 📝 Notlar

- Script, mevcut "Rectifier Girdileri" sayfasını bulursa içeriğini temizler ve yeniden oluşturur
- Sayfa koruması varsayılan olarak kapalıdır (kod içinde yorum satırı olarak eklenebilir)
- Dropdown alanları gerçek Excel dropdown değildir, görsel gösterim amaçlıdır
- G sütununda dropdown seçenekleri referans olarak saklanır
- F sütununda alan adları gizli olarak saklanır (beyaz renk)

## 🔧 Özelleştirme

Script'i özelleştirmek için:

1. **Renkleri Değiştirme**: `RGB()` değerlerini değiştirerek bölüm başlık renklerini özelleştirebilirsiniz
2. **Yeni Alanlar Ekleme**: `CreateInputRow()` veya `CreateDropdownRow()` fonksiyonlarını kullanarak yeni alanlar ekleyebilirsiniz
3. **Bilgilendirme Ekleme**: `CreateInfoBox()` fonksiyonunu kullanarak yeni bilgilendirme kutuları ekleyebilirsiniz
4. **Sütun Genişlikleri**: `ws.Columns("X").ColumnWidth` değerlerini değiştirerek sütun genişliklerini ayarlayabilirsiniz

## 📄 Dosya Yapısı

```
SAVE POINT DESTKOP APP0.4/
├── Rectifier_Girdi_Sayfasi_Olustur.bas    # VBA makro kodu
├── Rectifier_Girdi_Sayfasi_Olustur.vbs    # Alternatif VBScript versiyonu
└── Rectifier_Girdi_Sayfasi_KULLANIM.md    # Bu kullanım kılavuzu
```

## ⚠️ Önemli Uyarılar

- Makroyu çalıştırmadan önce Excel dosyanızı kaydedin
- Eğer "Rectifier Girdileri" adında bir sayfa varsa, içeriği silinecektir
- Makro güvenlik ayarlarınızı kontrol edin (Dosya > Seçenekler > Güven Merkezi > Makro Ayarları)

## 🆘 Sorun Giderme

**Makro çalışmıyor:**
- Makro güvenlik ayarlarını kontrol edin
- VBA kodunun doğru şekilde kopyalandığından emin olun
- Excel'in makro desteğinin etkin olduğundan emin olun

**Sayfa oluşturulmuyor:**
- Excel'de yeterli sayfa olup olmadığını kontrol edin
- Sayfa adının geçerli olduğundan emin olun (özel karakterler içermemeli)

**Formatlar görünmüyor:**
- Sayfayı yeniden oluşturmayı deneyin
- Excel'in otomatik formatlamayı desteklediğinden emin olun

## 📞 Destek

Sorularınız veya önerileriniz için lütfen geliştirici ile iletişime geçin.

---

**Versiyon:** 1.0  
**Tarih:** 2024  
**Geliştirici:** AI Assistant

