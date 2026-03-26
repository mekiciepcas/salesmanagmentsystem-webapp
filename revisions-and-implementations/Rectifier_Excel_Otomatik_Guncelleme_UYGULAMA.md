# Rectifier Excel Otomatik Güncelleme - Uygulama Rehberi

Bu rehber, Excel içinde otomatik form güncelleme ve parça listesi özelliklerinin nasıl uygulanacağını adım adım açıklar.

## 🎯 Özellikler

1. **Otomatik Form Güncelleme**: Girdi değerleri değiştiğinde otomatik hesaplama
2. **Formül Bazlı Hesaplamalar**: Float/Boot/Equalization gerilimleri otomatik hesaplanır
3. **Parça Listesi**: Otomatik oluşturulan ve güncellenen parça listesi
4. **Değer Bazlı Gösterim**: Parçalar başka sayfadan seçilmez, sadece değer olarak gösterilir

## 📋 Uygulama Adımları

### Adım 1: Ana Makroyu Çalıştırın

1. Excel'i açın
2. `Alt + F11` ile VBA Editor'ı açın
3. `Rectifier_Girdi_Sayfasi_Olustur.vbs` dosyasındaki tüm kodu bir modüle kopyalayın
4. `CreateRectifierInputSheet` makrosunu çalıştırın

Bu işlem:
- "Rectifier Girdileri" sayfasını oluşturur
- "Parça Listesi" sayfasını oluşturur
- Formül bazlı hesaplamaları ekler

### Adım 2: Worksheet Change Event Handler Ekleme

**ÖNEMLİ**: Otomatik güncelleme için Worksheet_Change event'i eklenmelidir.

1. VBA Editor'da sol taraftaki proje penceresinde **"Rectifier Girdileri"** sayfasına çift tıklayın
2. Açılan kod penceresine aşağıdaki kodu yapıştırın:

```vba
Private Sub Worksheet_Change(ByVal Target As Range)
    Dim ws As Worksheet
    Set ws = Me
    
    ' Girdi alanlarından biri değiştiğinde
    If Not Intersect(Target, ws.Range("C:C,E:E")) Is Nothing Then
        Application.EnableEvents = False
        On Error Resume Next
        
        ' Parça listesini güncelle
        UpdateComponentList ThisWorkbook
        
        On Error GoTo 0
        Application.EnableEvents = True
    End If
End Sub
```

3. Dosyayı kaydedin (`Ctrl + S`)

### Adım 3: İlk Parça Listesi Güncellemesi

1. "Rectifier Girdileri" sayfasında bazı temel değerleri doldurun:
   - Çıkış Gerilimi (örn: 48)
   - Çıkış Akımı (örn: 100)
   - Topoloji seçin
   - Akü bilgilerini doldurun

2. `Alt + F8` ile makro penceresini açın
3. `UpdateComponentList` makrosunu çalıştırın
4. "Parça Listesi" sayfasını kontrol edin

### Adım 4: Otomatik Güncellemeyi Test Edin

1. "Rectifier Girdileri" sayfasında bir değer değiştirin (örn: Çıkış Akımı)
2. "Parça Listesi" sayfasına bakın - otomatik güncellenmiş olmalı

## 🔧 Formül Bazlı Hesaplamalar

Aşağıdaki alanlar otomatik olarak formül ile hesaplanır:

### Akü Gerilimleri
- **Float Gerilimi**: `=Hücre Sayısı × Float Gerilimi (Hücre Başı)`
- **Equalization Gerilimi**: `=Hücre Sayısı × Equalization Gerilimi (Hücre Başı)`
- **Boost Gerilimi**: `=Hücre Sayısı × Boost Gerilimi (Hücre Başı)`

### Akü Hesaplamaları
- **Hücre Sayısı**: `=Batarya Voltajı / Hücre Başı Gerilim`
- **Hücre Başı Gerilim**: `=Batarya Voltajı / Hücre Sayısı`

## 📊 Parça Listesi Sayfası

"Parça Listesi" sayfası şu bilgileri içerir:

| No | Parça Adı | Değer / Özellik | Adet | Açıklama | Durum |
|----|-----------|-----------------|------|----------|-------|
| 1 | Giriş Trafosu | 6.67 kVA | 1 | Hesaplanan güç | ✓ |
| 2 | Çıkış Klemensi | 35mm (110A) | 1 | Çıkış akımı: 100A | ✓ |
| ... | ... | ... | ... | ... | ... |

### Özellikler
- ✅ Otomatik güncellenir
- ✅ Değer bazlı gösterim (başka sayfadan seçim yok)
- ✅ Renkli satırlar (zebra striping)
- ✅ Durum göstergesi (✓)

## 🔄 Otomatik Güncelleme Tetikleyicileri

Parça listesi şu durumlarda otomatik güncellenir:

1. **Çıkış Gerilimi** değiştiğinde
2. **Çıkış Akımı** değiştiğinde
3. **Topoloji** değiştiğinde
4. **Akü Bilgileri** değiştiğinde
5. **Giriş Parametreleri** değiştiğinde

## ⚙️ Manuel Güncelleme

Otomatik güncelleme çalışmıyorsa:

1. `Alt + F8` ile makro penceresini açın
2. `UpdateComponentList` makrosunu seçin
3. `Run` butonuna tıklayın

## 🐛 Sorun Giderme

### Parça listesi güncellenmiyor
- Worksheet_Change event'inin eklenmiş olduğundan emin olun
- VBA makrolarının etkin olduğundan emin olun
- `Application.EnableEvents = True` olduğundan emin olun

### Formüller çalışmıyor
- Hücre referanslarının doğru olduğundan emin olun
- Sayfa adının "Rectifier Girdileri" olduğundan emin olun
- Girdi değerlerinin sayısal olduğundan emin olun

### Hata mesajları
- Tüm gerekli alanların doldurulduğundan emin olun
- Sayısal değerlerin geçerli olduğundan emin olun
- VBA Editor'da hata mesajlarını kontrol edin

## 📝 Notlar

- Parça listesi sadece değer bazlıdır - başka sayfadan seçim yapılmaz
- Tüm hesaplamalar girdi değerlerine göre otomatik yapılır
- Formül bazlı hesaplamalar gerçek zamanlı çalışır
- Parça listesi her değişiklikte otomatik güncellenir

## 🎨 Özelleştirme

### Güncelleme Aralığını Değiştirme

Worksheet_Change event'indeki `ws.Range("C:C,E:E")` kısmını değiştirerek hangi sütunların değişikliğinde güncelleme yapılacağını belirleyebilirsiniz.

### Parça Listesi Formatını Değiştirme

`FormatComponentRow` fonksiyonunu düzenleyerek renkleri ve formatları değiştirebilirsiniz.

---

**Versiyon:** 1.0  
**Tarih:** 2024  
**Güncelleme:** Otomatik güncelleme ve parça listesi özellikleri eklendi



