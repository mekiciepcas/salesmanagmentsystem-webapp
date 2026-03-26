Attribute VB_Name = "RectifierGirdiSayfasi"
' Rectifier Girdi Sayfası Oluşturma Makrosu
' Excel'de görsel tasarımlar ile birlikte girdi sayfası oluşturur
' Parça seçim bilgilendirmeleri içerir
'
' Kullanım: Excel'de Alt+F11 ile VBA editörünü açın, bu kodu Module1'e yapıştırın
' Ardından F5'e basarak veya makro çalıştırarak CreateRectifierInputSheet'i çalıştırın

Sub CreateRectifierInputSheet()
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim currentRow As Long
    
    ' Yeni sayfa oluştur veya mevcut sayfayı kullan
    On Error Resume Next
    Set ws = Worksheets("Rectifier Girdileri")
    If ws Is Nothing Then
        Set ws = Worksheets.Add
        ws.Name = "Rectifier Girdileri"
    Else
        ws.Cells.Clear
    End If
    On Error GoTo 0
    
    ' Sayfa ayarları
    With ws
        .DisplayPageBreaks = False
        .DisplayGridlines = False
        .Tab.Color = RGB(0, 120, 215) ' Mavi tab rengi
    End With
    
    currentRow = 1
    
    ' Başlık Bölümü
    With ws.Range("A" & currentRow & ":H" & currentRow)
        .Merge
        .Value = "RECTIFIER SİSTEM TASARIMI - GİRDİ SAYFASI"
        .Font.Size = 18
        .Font.Bold = True
        .Font.Color = RGB(255, 255, 255)
        .Interior.Color = RGB(0, 120, 215)
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .RowHeight = 35
    End With
    currentRow = currentRow + 2
    
    ' ============================================
    ' 1. PROJE BİLGİLERİ BÖLÜMÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "📁 PROJE BİLGİLERİ / PROJECT INFORMATION", RGB(70, 130, 180))
    
    ' Genel Bilgiler
    currentRow = CreateSubSectionHeader(ws, currentRow, "Genel Bilgiler / General Information")
    
    currentRow = CreateInputRow(ws, currentRow, "Müşteri / Firma / Customer:", "projectCustomerName", "Müşteri seçiniz...")
    currentRow = CreateInputRow(ws, currentRow, "Teklif No / Referans / Quote Reference:", "projectQuoteRef", "Örn: 25-Q0250")
    currentRow = CreateInputRow(ws, currentRow, "Cihaz Adedi / Device Quantity:", "projectDeviceCount", "1")
    currentRow = CreateInputRow(ws, currentRow, "Teklif Tarihi / Quote Date:", "projectQuoteDate", "")
    
    currentRow = currentRow + 1
    
    ' Lojistik ve Paketleme
    currentRow = CreateSubSectionHeader(ws, currentRow, "Lojistik ve Paketleme / Logistics and Packaging")
    
    currentRow = CreateDropdownRow(ws, currentRow, "Beklenen Teslim Süresi / Expected Delivery Time:", "projectDeliveryWindow", _
        Array("6-8 Hafta / Weeks", "8-10 Hafta / Weeks", "10-12 Hafta / Weeks", "12-14 Hafta / Weeks", "14-16 Hafta / Weeks", "16-18 Hafta / Weeks", "18-20 Hafta / Weeks"), "")
    currentRow = CreateInputRow(ws, currentRow, "Teslim Şekli / Delivery Terms (Incoterms):", "projectIncoterms", "EXW, FOB, CIF vb.")
    currentRow = CreateDropdownRow(ws, currentRow, "Paketleme Türü / Packaging Type:", "projectPackingType", _
        Array("Karton Kutu / Standard Packing", "Kontra / Overseas Packing", "Mühürlü Kontra / Sealed Overseas Packing"), "")
    
    currentRow = currentRow + 1
    
    ' Ek Tanımlayıcılar
    currentRow = CreateSubSectionHeader(ws, currentRow, "Ek Tanımlayıcılar / Additional Identifiers")
    
    currentRow = CreateInputRow(ws, currentRow, "Marka / Brand:", "projectBrand", "EPC, OEM vb.")
    currentRow = CreateInputRow(ws, currentRow, "Cihaz Dili / Device Language:", "projectDeviceLanguage", "TR, EN vb.")
    currentRow = CreateInputRow(ws, currentRow, "Formu Hazırlayan / Form Preparer:", "projectPreparedBy", "", True)
    
    currentRow = currentRow + 2
    
    ' ============================================
    ' 2. CİHAZ GİRİŞ BİLGİLERİ BÖLÜMÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "📥 CİHAZ GİRİŞ BİLGİLERİ / DEVICE INPUT INFORMATION", RGB(60, 179, 113))
    
    ' Nominal Giriş Parametreleri
    currentRow = CreateSubSectionHeader(ws, currentRow, "Nominal Giriş Parametreleri / Nominal Input Parameters")
    
    currentRow = CreateDropdownRow(ws, currentRow, "Nominal Giriş Gerilimi (AC) / Nominal Input Voltage (AC):", "inputVoltageNominal", _
        Array("66V", "115V", "120V", "220V", "230V", "240V", "280V", "380V", "400V", "415V", "440V", "480V", "600V"), "400V")
    currentRow = CreateDropdownRow(ws, currentRow, "Giriş Gerilimi Tolerans Aralığı / Input Voltage Tolerance Range:", "inputVoltageTolerance", _
        Array("+/-5%", "+/-10%", "+/-15%", "-5% +10%", "-10% +5%", "-15% +10%", "-10% +15%"), "+/-10%")
    currentRow = CreateDropdownRow(ws, currentRow, "Giriş Faz Sayısı / Input Phase Count:", "inputPhase", _
        Array("1 Faz", "3 Faz"), "3 Faz")
    currentRow = CreateDropdownRow(ws, currentRow, "Giriş Nötr Bağlantısı / Input Neutral Connection:", "inputNeutral", _
        Array("Nötr Var / Neutral Exist", "Nötr Yok / No Neutral"), "Nötr Yok / No Neutral")
    currentRow = CreateDropdownRow(ws, currentRow, "Giriş Frekansı / Input Frequency:", "systemFrequency", _
        Array("50Hz", "60Hz", "400Hz"), "50Hz")
    currentRow = CreateInputRow(ws, currentRow, "AC Giriş Güç Faktörü (Nominal Yükte) / AC Input Power Factor:", "acPowerFactor", "", True)
    currentRow = CreateInputRow(ws, currentRow, "AC Giriş Akımı THD (Nominal Yükte) / AC Input Current THD (%):", "acInputCurrentTHD", "")
    
    currentRow = currentRow + 2
    
    ' ============================================
    ' 3. CİHAZ ÇIKIŞ BİLGİLERİ BÖLÜMÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "📤 CİHAZ ÇIKIŞ BİLGİLERİ / DEVICE OUTPUT INFORMATION", RGB(255, 140, 0))
    
    ' Nominal Çıkış Parametreleri
    currentRow = CreateSubSectionHeader(ws, currentRow, "Nominal Çıkış Parametreleri / Nominal Output Parameters")
    
    currentRow = CreateInputRow(ws, currentRow, "Nominal Çıkış Gerilimi (DC) / Nominal Output Voltage (DC) (V):", "outputVoltage", "48")
    currentRow = CreateInputRow(ws, currentRow, "Nominal Çıkış Akımı (DC) / Nominal Output Current (DC) (A):", "outputCurrent", "100")
    currentRow = CreateDropdownRow(ws, currentRow, "Topoloji (Devre Şekli) / Topology (Circuit Type):", "topology", _
        Array("B6C (6 darbe / 6 pulse)", "B12C (12 darbe / 12 pulse)", "SNMPS", "IGBT Doğrultucu / IGBT Rectifier"), "B6C (6 darbe / 6 pulse)")
    currentRow = CreateInputRow(ws, currentRow, "DC Bara Dalgalılığı (Aküsüz) / DC Bus Ripple (%):", "dcRipple", "", True)
    currentRow = CreateDropdownRow(ws, currentRow, "Ek Yük Çıkışı Var mı? / Is there an Additional Load Output?:", "extraLoadOutput", _
        Array("Yok", "Var"), "Yok")
    currentRow = CreateDropdownRow(ws, currentRow, "Diyot Dropper / Diode Dropper:", "diodeDropper", _
        Array("Yok / No", "1 kademe / 1 Stage", "2 kademe / 2 Stage", "3 kademe / 3 Stage", "4 kademe / 4 Stage", "DC-DC kıyıcılı / DC-DC Chopper"), "Yok / No")
    currentRow = CreateDropdownRow(ws, currentRow, "Dahili DC Yük Dağıtımı / Internal DC Load Distribution:", "internalDistribution", _
        Array("Yok / No", "Var / Yes"), "Yok / No")
    currentRow = CreateDropdownRow(ws, currentRow, "Akü LVD / Battery LVD:", "batteryLVD", _
        Array("Yok / No", "Var / Yes"), "Yok / No")
    
    ' Parça Seçim Bilgilendirmesi - Çıkış Klemensi
    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Çıkış Klemensi/Barası Seçimi:", _
        "Çıkış akımına göre bir üst değer seçilir. Örnek: Çıkış akımı 100A → 35mm Klemens (110A kapasiteli) seçilir.")
    
    ' Parça Seçim Bilgilendirmesi - Çıkış Kesicisi
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Çıkış Kesicisi (MCB/MCCB) Seçimi:", _
        "Çıkış akımından bir üst değer seçilir. DC gerilim > 48V → 3 kutuplu, ≤ 48V → 2 kutuplu. Kullanıcı MCB veya MCCB tercihini belirtir.")
    
    currentRow = currentRow + 2
    
    ' ============================================
    ' 4. AKÜ BİLGİLERİ BÖLÜMÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "🔋 AKÜ BİLGİLERİ / BATTERY INFORMATION", RGB(255, 99, 71))
    
    ' Akü Konfigürasyonu
    currentRow = CreateSubSectionHeader(ws, currentRow, "Akü Konfigürasyonu / Battery Configuration")
    
    currentRow = CreateDropdownRow(ws, currentRow, "Akü Tipi / Battery Type:", "batteryType", _
        Array("VRLA", "Ni-CD", "Li-ion"), "VRLA")
    currentRow = CreateInputRow(ws, currentRow, "Batarya Voltajı / Battery Voltage (V):", "batteryVoltage", "110")
    currentRow = CreateDropdownRow(ws, currentRow, "Kutu İçinde Dahili Akü / Internal Battery in Cabinet:", "batteryInCabinet", _
        Array("Yok / No", "Var / Yes"), "Yok / No")
    currentRow = CreateInputRow(ws, currentRow, "Dahili Akü Adedi / Internal Battery Quantity:", "internalBatteryQuantity", "1")
    currentRow = CreateInputRow(ws, currentRow, "Dahili Akü Adı / Internal Battery Name:", "internalBatteryName", "Akü adını girin...")
    currentRow = CreateInputRow(ws, currentRow, "Toplam Hücre Sayısı / Total Cell Count:", "batteryCellCount", "", True)
    currentRow = CreateInputRow(ws, currentRow, "Hücre Başı Gerilim / Voltage per Cell (V):", "batteryVoltagePerCell", "", True)
    currentRow = CreateInputRow(ws, currentRow, "Float Gerilimi (Hücre Başı) / Float Voltage per Cell (V):", "floatVoltagePerCell", "")
    currentRow = CreateInputRow(ws, currentRow, "Dengeleme Gerilimi (Hücre Başı) / Equalization Voltage per Cell (V):", "equalizationVoltagePerCell", "")
    currentRow = CreateInputRow(ws, currentRow, "Boost Gerilimi (Hücre Başı) / Boost Voltage per Cell (V):", "boostVoltagePerCell", "")
    currentRow = CreateInputRow(ws, currentRow, "Toplam Yüzdürme Gerilimi / Total Float Voltage (V):", "floatVoltage", "", True)
    currentRow = CreateInputRow(ws, currentRow, "Toplam Dengeleme Gerilimi / Total Equalization Voltage (V):", "equalizationVoltage", "", True)
    currentRow = CreateInputRow(ws, currentRow, "Toplam Boost Gerilimi / Total Boost Voltage (V):", "boostVoltage", "", True)
    
    ' Parça Seçim Bilgilendirmesi - Batarya Kesicisi
    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Batarya Kesicisi (MCB/MCCB) Seçimi:", _
        "Çıkış kesicisi ile aynı seçim kuralları geçerlidir. Çıkış akımından bir üst değer, aynı kutup sayısı ve tip.")
    
    ' Parça Seçim Bilgilendirmesi - Batarya Akım Okuma Kartı
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Batarya Akım Okuma Kartı Seçimi:", _
        "Çıkış akımı < 100A → L100P, 100A ≤ Çıkış akımı < 200A → L200P, 200A ≤ Çıkış akımı < 300A → L300P, ≥ 300A → Yetkili kişi ile görüşülmeli.")
    
    currentRow = currentRow + 2
    
    ' ============================================
    ' 5. MEKANİK BİLGİLER BÖLÜMÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "🔧 CİHAZ MEKANİK BİLGİLERİ / DEVICE MECHANICAL INFORMATION", RGB(147, 112, 219))
    
    ' Kutu Tipi ve Boyutları
    currentRow = CreateSubSectionHeader(ws, currentRow, "Kutu Tipi ve Boyutları / Cabinet Type and Dimensions")
    
    currentRow = CreateDropdownRow(ws, currentRow, "Kutu Tipi / Cabinet Type:", "cabinetType", _
        Array("Dikili Tip / Standing Type", "Duvar Montaj / Wall Mount", "Rack Montaj / Rack Mount", "Özel tasarım / Custom Design"), "Dikili Tip / Standing Type")
    currentRow = CreateDropdownRow(ws, currentRow, "Kutu Boyutları / Cabinet Dimensions:", "cabinetSize", _
        Array("SR1 450*500*1000mm", "SR2 600*600*1300mm", "SR3 750*700*1600mm", "Özel Boyutlar / Custom Dimensions"), "SR2 600*600*1300mm")
    currentRow = CreateInputRow(ws, currentRow, "Özel Genişlik / Custom Width (mm):", "customCabinetWidth", "")
    currentRow = CreateInputRow(ws, currentRow, "Özel Derinlik / Custom Depth (mm):", "customCabinetDepth", "")
    currentRow = CreateInputRow(ws, currentRow, "Özel Yükseklik / Custom Height (mm):", "customCabinetHeight", "")
    currentRow = CreateDropdownRow(ws, currentRow, "Koruma Sınıfı / Protection Class:", "protectionClass", _
        Array("IP20", "IP54", "IP65", "IP66", "IP67"), "IP20")
    currentRow = CreateDropdownRow(ws, currentRow, "Kutu Rengi / Cabinet Color:", "cabinetColor", _
        Array("RAL7035", "RAL7032", "RAL7040", "RAL7047", "RAL1013", "RAL9005"), "RAL7035")
    
    currentRow = currentRow + 1
    
    ' Kablo ve Soğutma
    currentRow = CreateSubSectionHeader(ws, currentRow, "Kablo ve Soğutma / Cable and Cooling")
    
    currentRow = CreateDropdownRow(ws, currentRow, "Kablo Girişi / Cable Entry:", "cableEntry", _
        Array("Alttan / Bottom", "Üstten / Top", "Üstten ve Alttan / Top and Bottom", "Önden / Front", "Arkadan / Rear"), "Alttan / Bottom")
    currentRow = CreateDropdownRow(ws, currentRow, "Sac Tipi / Sheet Type:", "sheetType", _
        Array("Galvaniz Sac 1.5mm", "Galvaniz Sac 2mm", "Galvaniz Sac 3mm"), "Galvaniz Sac 1.5mm")
    currentRow = CreateDropdownRow(ws, currentRow, "Soğutma / Cooling:", "cooling", _
        Array("Hava Zorlamalı / Fan Forced", "Doğal / Natural", "Sulu / Water Cooling"), "Hava Zorlamalı / Fan Forced")
    currentRow = CreateDropdownRow(ws, currentRow, "Hava Akış Yönü / Airflow Direction:", "airflowDirection", _
        Array("Üstten / Top", "Arkadan / Rear", "Yanlardan / Sides", "Önden arkaya / Front to Rear"), "Arkadan / Rear")
    currentRow = CreateDropdownRow(ws, currentRow, "Çalışma Sıcaklığı / Operating Temperature:", "operatingTemperature", _
        Array("-5°C / 45°C", "0°C / 45°C", "-5°C / 40°C", "-5°C / 50°C", "-10°C / 40°C", "-10°C / 45°C", "-10°C / 50°C"), "-5°C / 45°C")
    
    ' Parça Seçim Bilgilendirmesi - Kabin
    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Kabin Seçimi:", _
        "Otomatik tasarım tarafından girilen mekanik bilgilere göre seçilir. Standart boyutlar (SR1, SR2, SR3) veya özel boyutlar için fiyatlandırma yapılır.")
    
    currentRow = currentRow + 2
    
    ' ============================================
    ' 6. KULLANICI ARAYÜZÜ BÖLÜMÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "🖥️ KULLANICI ARAYÜZÜ / USER INTERFACE", RGB(72, 209, 204))
    
    ' Ön Panel
    currentRow = CreateSubSectionHeader(ws, currentRow, "Ön Panel / Front Panel")
    
    currentRow = CreateDropdownRow(ws, currentRow, "Ön Panel / Front Panel:", "frontPanel", _
        Array("LCD+ LED Panel", "LCD", "Dokunmatik 7"" renkli / Touch Screen 7"" Color", "Mimic Panel", "LCD+Led Panel+Mimic Panel"), "LCD+ LED Panel")
    
    currentRow = currentRow + 1
    
    ' Ölçü Aletleri
    currentRow = CreateSubSectionHeader(ws, currentRow, "Ölçü Aletleri / Measurement Instruments")
    
    currentRow = CreateDropdownRow(ws, currentRow, "Ölçü Aleti Tipi / Instrument Type:", "measurementInstrumentType", _
        Array("Analog / Analog", "Dijital / Digital", "Multimetre / Multimeter", "Enerji analizörü / Energy Analyzer"), "")
    currentRow = CreateDropdownRow(ws, currentRow, "Ölçüm Noktası / Measurement Point:", "measurementPoint", _
        Array("Yük gerilimi / Load Voltage", "Yük akımı / Load Current", "Akü gerilimi / Battery Voltage", "Akü akımı / Battery Current", "Giriş gerilimler / Input Voltages", "Giriş akımlar / Input Currents"), "")
    
    ' Parça Seçim Bilgilendirmesi - Ölçü Aletleri
    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Ölçü Aletleri Seçimi:", _
        "Voltmetre: Ölçüm noktasına göre voltaj değeri belirlenir (Giriş/Çıkış/Akü). Voltaj aralığı: Belirlenen voltaj × 1.2. Multimetre: Giriş, Çıkış, Akü ölçüm noktalarında kullanılır. Enerji Analizörü: Sadece Giriş ölçüm noktasında kullanılır.")
    
    currentRow = currentRow + 2
    
    ' ============================================
    ' 7. HABERLEŞME ARAYÜZÜ BÖLÜMÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "📡 HABERLEŞME ARAYÜZÜ / COMMUNICATION INTERFACE", RGB(255, 20, 147))
    
    ' Haberleşme Protokolü
    currentRow = CreateSubSectionHeader(ws, currentRow, "Haberleşme Protokolü / Communication Protocol")
    
    currentRow = CreateDropdownRow(ws, currentRow, "Haberleşme Protokolü / Communication Protocol:", "communicationProtocol", _
        Array("Modbus RTU RS232", "Modbus RTU RS485", "Modbus RTU RS232 + Modbus RTU RS485", "Modbus TCP / IP", "IEC61850", "Modbus RTU RS485 + IEC61850", "Profinet", "Profibus"), "Modbus RTU RS232")
    currentRow = CreateDropdownRow(ws, currentRow, "Röle Kuru Kontak Alarm Çıkışları / Relay Dry Contact Alarm Outputs:", "relayAlarmOutputs", _
        Array("Programlanabilir Kuru Kontak Alarm Çıkışı 4 Adet", "Programlanabilir Kuru Kontak Alarm Çıkışı 8 Adet", "Programlanabilir Kuru Kontak Alarm Çıkışı 12 Adet", "Programlanabilir Kuru Kontak Alarm Çıkışı 16 Adet"), "Programlanabilir Kuru Kontak Alarm Çıkışı 4 Adet")
    currentRow = CreateDropdownRow(ws, currentRow, "Paralel Çalışma / Parallel Operation:", "parallelOperation", _
        Array("Pasif (standart) / Passive (Standard)", "Yok / No", "Aktif / Active"), "Pasif (standart) / Passive (Standard)")
    
    ' Parça Seçim Bilgilendirmesi - Haberleşme
    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Haberleşme Protokolü Seçimi:", _
        "Seçilen protokole göre haberleşme modülü seçilir. Bütün güçlerde ve durumlarda aynı ürünler kullanılıyor.")
    
    ' Parça Seçim Bilgilendirmesi - Paralel Çalışma
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Paralel Çalışma:", _
        "Paralel çalışma aktif ise: Paralelleme Kartı ve RJ45 Portu eklenir.")
    
    ' Parça Seçim Bilgilendirmesi - Alarm Terminalleri
    currentRow = CreateInfoBox(ws, currentRow, "ℹ️ Alarm Terminalleri Seçimi:", _
        "Programlanabilir röle sayısına göre: 4 röle → 12 adet, 8 röle → 24 adet, 12 röle → 36 adet 2.5mm terminal seçilir.")
    
    currentRow = currentRow + 2
    
    ' ============================================
    ' 8. PARÇA SEÇİM BİLGİLENDİRMELERİ BÖLÜMÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "📋 PARÇA SEÇİM KURALLARI / COMPONENT SELECTION RULES", RGB(255, 165, 0))
    
    ' Zorunlu Parçalar
    currentRow = CreateSubSectionHeader(ws, currentRow, "Zorunlu Parçalar (Her Rectifier Sisteminde Bulunur)")
    
    Dim componentRules As Variant
    componentRules = Array( _
        Array("Giriş Trafosu", "Hesaplanan güç (kVA), Primer gerilimi, Sekonder gerilimi. 3 faz giriş → Verimlilik 0.9, PF 0.8. 1 faz giriş → Verimlilik 0.8, PF 0.7. B12C → 12 pulse trafo, B6C → 6 pulse trafo, B2H → Tek faz trafo."), _
        Array("Besleme Trafosu", "Excel'den Product Type = 'Besleme Trafosu' olan trafo seçilir. Güç hesabı yapılmaz, direkt Excel'den fiyat alınır. Her sistemde 1 adet."), _
        Array("Oto Trafo", "Standart olmayan giriş gerilimleri için koşullu olarak eklenir. Standart gerilimler: 3 faz 400V, 3 faz 380V, Tek faz 220V, Tek faz 230V. Primer: Giriş gerilimi / √(faz sayısı), Sekonder: 230VAC (sabit)."), _
        Array("DC Şok", "Her zaman 1mH sabit değer kullanılır. B2H/B6C: 1 adet, B12C: 2 adet. Gerilim kriteri gereksizdir, sadece akım ve endüktans değerine göre fiyat değişir."), _
        Array("DC Kapasitör", "Kesim frekansı hesaplamasına göre iteratif seçim. 4700µF veya 10000µF seçilebilir. Sabit 200V kullanılır. Hedef kesim frekansı: B2H → 20Hz, B6C/B12C → 35Hz."), _
        Array("Faz Kontrol Tristörleri", "(Çıkış akımı × 1.5) / Faz sayısı. B6C: 3 adet, B12C: 6 adet, B2H: 2 adet. Her 4 adet tristör için 1 adet Heatsink + 1 adet Fan."), _
        Array("Serbest Geçiş Diyotu", "Çıkış akımı × 1.5. Bu akımdan yüksek bir üst segment seçilir. Gerilim kriteri önemsizdir (en az 1200V). 1 adet."), _
        Array("Giriş Kesicisi (MCB/MCCB)", "Hesaplanan giriş akımından bir üst değer. Giriş Akımı = Trafo Gücü / (Primer Gerilimi × √Faz Sayısı). Tolerans dikkate alınır (+%10 gibi düşünülür)."), _
        Array("Giriş Klemensi/Barası", "Giriş akımına göre bir üst değer seçilir. Klemens veya bara akım kapasitelerine göre."), _
        Array("Rectifier Çıkış Akımı Okuma Kartı", "Batarya akım okuma kartı ile aynı şartlar. Çıkış akımı < 100A → L100P, 100A ≤ < 200A → L200P, 200A ≤ < 300A → L300P, ≥ 300A → Bildirim.") _
    )
    
    Dim i As Long
    For i = LBound(componentRules) To UBound(componentRules)
        currentRow = CreateInfoBox(ws, currentRow, "• " & componentRules(i)(0) & ":", componentRules(i)(1))
    Next i
    
    currentRow = currentRow + 1
    
    ' Koşullu Parçalar
    currentRow = CreateSubSectionHeader(ws, currentRow, "Koşullu Parçalar (Seçilen Özelliklere Göre)")
    
    Dim conditionalComponents As Variant
    conditionalComponents = Array( _
        Array("Diyot Dropper", "diodeDropper değeri seçilmiş olmalı. Diyot akımı: Çıkış akımı × 1.5. Röle akımı: Çıkış akımına eşit. Gerilim düşüşü kademe bazlı hesaplanır. Her kademe için röle kontrol kartı. DC-DC kıyıcılı durumunda soğutucu eklenmez."), _
        Array("Dahili Dağıtım Kesicileri", "internalDistribution = 'Var' ise eklenir. Kullanıcı belirtilen adet sayısı ve kutup akım bilgisi (örn: '3x15A') ile MCB seçimi yapılır."), _
        Array("Akü LVD (Low Voltage Disconnect)", "batteryLVD = 'Var' ise eklenir: LVD Röle Kontrol Kartı ve LVD Rölesi (Röle akımı: Çıkış akımı × 1.2).") _
    )
    
    For i = LBound(conditionalComponents) To UBound(conditionalComponents)
        currentRow = CreateInfoBox(ws, currentRow, "• " & conditionalComponents(i)(0) & ":", conditionalComponents(i)(1))
    Next i
    
    ' ============================================
    ' SAYFA FORMATLAMA
    ' ============================================
    
    ' Sütun genişliklerini ayarla
    ws.Columns("A").ColumnWidth = 3
    ws.Columns("B").ColumnWidth = 50
    ws.Columns("C").ColumnWidth = 40
    ws.Columns("D").ColumnWidth = 60
    ws.Columns("E").ColumnWidth = 15
    ws.Columns("F").ColumnWidth = 15
    ws.Columns("G").ColumnWidth = 15
    ws.Columns("H").ColumnWidth = 15
    
    ' Satır yüksekliklerini otomatik ayarla
    ws.Rows.AutoFit
    
    ' Sayfayı aktif hale getir
    ws.Activate
    ws.Range("A1").Select
    
    MsgBox "Rectifier Girdi Sayfası başarıyla oluşturuldu!", vbInformation, "Başarılı"
    
End Sub

' Yardımcı Fonksiyonlar

Function CreateSectionHeader(ws As Worksheet, rowNum As Long, title As String, bgColor As Long) As Long
    With ws.Range("B" & rowNum & ":H" & rowNum)
        .Merge
        .Value = title
        .Font.Size = 14
        .Font.Bold = True
        .Font.Color = RGB(255, 255, 255)
        .Interior.Color = bgColor
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .RowHeight = 30
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlMedium
    End With
    CreateSectionHeader = rowNum + 2
End Function

Function CreateSubSectionHeader(ws As Worksheet, rowNum As Long, title As String) As Long
    With ws.Range("B" & rowNum & ":H" & rowNum)
        .Merge
        .Value = title
        .Font.Size = 11
        .Font.Bold = True
        .Font.Color = RGB(0, 0, 0)
        .Interior.Color = RGB(230, 230, 230)
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .RowHeight = 22
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .IndentLevel = 1
    End With
    CreateSubSectionHeader = rowNum + 1
End Function

Function CreateInputRow(ws As Worksheet, rowNum As Long, label As String, fieldName As String, placeholder As String, Optional isReadOnly As Boolean = False) As Long
    ' Etiket
    With ws.Range("B" & rowNum)
        .Value = label
        .Font.Size = 10
        .Font.Bold = False
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .WrapText = True
        .RowHeight = 25
    End With
    
    ' Giriş alanı
    With ws.Range("C" & rowNum & ":E" & rowNum)
        .Merge
        .Value = placeholder
        .Font.Size = 10
        .Interior.Color = IIf(isReadOnly, RGB(240, 240, 240), RGB(255, 255, 255))
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        If isReadOnly Then
            .Font.Color = RGB(128, 128, 128)
            .Font.Italic = True
        End If
    End With
    
    ' Alan adı (gizli - referans için)
    ws.Range("F" & rowNum).Value = fieldName
    ws.Range("F" & rowNum).Font.Color = RGB(255, 255, 255) ' Gizli
    
    CreateInputRow = rowNum + 1
End Function

Function CreateDropdownRow(ws As Worksheet, rowNum As Long, label As String, fieldName As String, options As Variant, Optional defaultValue As String = "") As Long
    ' Etiket
    With ws.Range("B" & rowNum)
        .Value = label
        .Font.Size = 10
        .Font.Bold = False
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .WrapText = True
        .RowHeight = 25
    End With
    
    ' Dropdown alanı
    With ws.Range("C" & rowNum & ":E" & rowNum)
        .Merge
        .Value = IIf(defaultValue = "", options(0), defaultValue)
        .Font.Size = 10
        .Interior.Color = RGB(255, 255, 255)
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .Interior.Pattern = xlPatternGray25 ' Dropdown olduğunu göster
    End With
    
    ' Seçenekleri G sütununa yaz (referans için)
    Dim i As Long
    For i = LBound(options) To UBound(options)
        ws.Range("G" & (rowNum + i)).Value = options(i)
    Next i
    
    ' Alan adı (gizli - referans için)
    ws.Range("F" & rowNum).Value = fieldName
    ws.Range("F" & rowNum).Font.Color = RGB(255, 255, 255) ' Gizli
    
    CreateDropdownRow = rowNum + 1
End Function

Function CreateInfoBox(ws As Worksheet, rowNum As Long, title As String, description As String) As Long
    With ws.Range("B" & rowNum & ":H" & rowNum)
        .Merge
        .Value = title & " " & description
        .Font.Size = 9
        .Font.Bold = False
        .Font.Color = RGB(0, 100, 0)
        .Interior.Color = RGB(240, 255, 240)
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlTop
        .WrapText = True
        .RowHeight = 30
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .IndentLevel = 2
    End With
    CreateInfoBox = rowNum + 1
End Function

