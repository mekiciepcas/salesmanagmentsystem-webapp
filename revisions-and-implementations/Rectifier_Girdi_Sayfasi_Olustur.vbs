Option Explicit

' ============================================
' Rectifier Girdi Sayfasi Olusturma Scripti
' - Görsel tasarim + gerçek dropdown'lar
' - Dropdown listeleri gizli "Lists" sayfasinda tutulur
' - DataValidation: Named Range ile (en stabil)
' ============================================

Public Sub CreateRectifierInputSheet()

    Dim ws As Worksheet
    Dim wsLists As Worksheet
    Dim currentRow As Long
    Dim wnd As Window

    On Error GoTo CleanFail

    Application.ScreenUpdating = False
    Application.EnableEvents = False

    ' --- Form sayfasi ---
    Set ws = GetOrCreateSheet(ThisWorkbook, "Rectifier Girdileri", True)

    ' --- Liste sayfasi (gizli) ---
    Set wsLists = GetOrCreateSheet(ThisWorkbook, "Lists", False)
    wsLists.Cells.Clear
    wsLists.Visible = xlSheetVeryHidden

    ' Sayfa ayarlari (Worksheet seviyesinde olanlar)
    With ws
        .Cells.Clear
        .Cells.UnMerge
        .DisplayPageBreaks = False
        .Tab.Color = RGB(0, 120, 215)
    End With

    ' Gridlines: Window ayarı (workbook + window güvenli)
    On Error Resume Next
    ThisWorkbook.Activate
    Set wnd = ThisWorkbook.Windows(1)
    If Not wnd Is Nothing Then wnd.DisplayGridlines = False
    On Error GoTo CleanFail

    currentRow = 1

    ' Baslik
    With ws.Range("A" & currentRow & ":H" & currentRow)
        .Merge
        .Value = "RECTIFIER SISTEM TASARIMI - GIRDI SAYFASI VER1 REV0"
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
    ' 1) PROJE BILGILERI
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "?? PROJE BILGILERI / PROJECT INFORMATION", RGB(70, 130, 180))
    currentRow = CreateSubSectionHeader(ws, currentRow, "Genel Bilgiler / General Information")

    currentRow = CreateInputRow(ws, currentRow, "Musteri / Firma / Customer:", "projectCustomerName")
    currentRow = CreateInputRow(ws, currentRow, "Teklif No / Referans / Quote Reference:", "projectQuoteRef")
    currentRow = CreateInputRow(ws, currentRow, "Cihaz Adedi / Device Quantity:", "projectDeviceCount")
    currentRow = CreateInputRow(ws, currentRow, "Teklif Tarihi / Quote Date:", "projectQuoteDate")

    currentRow = currentRow + 1
    currentRow = CreateSubSectionHeader(ws, currentRow, "Lojistik ve Paketleme / Logistics and Packaging")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Beklenen Teslim Süresi / Expected Delivery Time:", _
        "projectDeliveryWindow", _
        Array("6-8 Hafta / Weeks", "8-10 Hafta / Weeks", "10-12 Hafta / Weeks", "12-14 Hafta / Weeks", _
              "14-16 Hafta / Weeks", "16-18 Hafta / Weeks", "18-20 Hafta / Weeks"), _
        "8-10 Hafta / Weeks")

    currentRow = CreateInputRow(ws, currentRow, "Teslim Sekli / Delivery Terms (Incoterms):", "projectIncoterms")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Paketleme Türü / Packaging Type:", _
        "projectPackingType", _
        Array("Karton Kutu / Standard Packing", "Kontra / Overseas Packing", "Mühürlü Kontra / Sealed Overseas Packing"), _
        "Karton Kutu / Standard Packing")

    currentRow = currentRow + 1
    currentRow = CreateSubSectionHeader(ws, currentRow, "Ek Tanimlayicilar / Additional Identifiers")

    currentRow = CreateInputRow(ws, currentRow, "Marka / Brand:", "projectBrand")
    currentRow = CreateInputRow(ws, currentRow, "Cihaz Dili / Device Language:", "projectDeviceLanguage")
    currentRow = CreateInputRow(ws, currentRow, "Formu Hazırlayan / Form Preparer:", "projectPreparedBy", True)

    currentRow = currentRow + 2

    ' ============================================
    ' 2) Cihaz Girdi Bilgileri
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "? CIHAZ GIRIS BILGILERI / DEVICE INPUT INFORMATION", RGB(60, 179, 113))
    currentRow = CreateSubSectionHeader(ws, currentRow, "Nominal Giris Parametreleri / Nominal Input Parameters")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Nominal Giriş Gerilimi (AC) / Nominal Input Voltage (AC):", _
        "inputVoltageNominal", _
        Array("66V", "115V", "120V", "220V", "230V", "240V", "280V", "380V", "400V", "415V", "440V", "480V", "600V"), _
        "400V")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Giris Gerilimi Tolerans Araligi / Input Voltage Tolerance Range:", _
        "inputVoltageTolerance", _
        Array("+/-5%", "+/-10%", "+/-15%", "-5% +10%", "-10% +5%", "-15% +10%", "-10% +15%"), _
        "+/-10%")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Giriş Faz Sayisi / Input Phase Count:", _
        "inputPhase", _
        Array("1 Faz", "3 Faz"), _
        "3 Faz")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Giriş Nötr Baglantisi / Input Neutral Connection:", _
        "inputNeutral", _
        Array("Nötr Var / Neutral Exist", "Nötr Yok / No Neutral"), _
        "Nötr Yok / No Neutral")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Giris Frekansi / Input Frequency:", _
        "systemFrequency", _
        Array("50Hz", "60Hz", "400Hz"), _
        "50Hz")

    currentRow = CreateInputRow(ws, currentRow, "AC Giris Güç Faktörü (Nominal Yükte) / AC Input Power Factor:", "acPowerFactor", True)
    currentRow = CreateInputRow(ws, currentRow, "AC Giriş Akimi THD (Nominal Yükte) / AC Input Current THD (%):", "acInputCurrentTHD")

    currentRow = currentRow + 2

    ' ============================================
    ' 3) CIHAZ ÇIKIS BILGILERI
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "?? CIHAZ ÇIKIS BILGILERI / DEVICE OUTPUT INFORMATION", RGB(255, 140, 0))
    currentRow = CreateSubSectionHeader(ws, currentRow, "Nominal Cikis Parametreleri / Nominal Output Parameters")

    currentRow = CreateInputRow(ws, currentRow, "Nominal Cikis Gerilimi (DC) / Nominal Output Voltage (DC) (V):", "outputVoltage")
    currentRow = CreateInputRow(ws, currentRow, "Nominal Cikis Akimi (DC) / Nominal Output Current (DC) (A):", "outputCurrent")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Topoloji (Devre Şekli) / Topology (Circuit Type):", _
        "topology", _
        Array("B6C (6 darbe / 6 pulse)", "B12C (12 darbe / 12 pulse)", "SNMPS", "IGBT Doğrultucu / IGBT Rectifier"), _
        "B6C (6 darbe / 6 pulse)")

    currentRow = CreateInputRow(ws, currentRow, "DC Bara Dalgaliligi (Aküsüz) / DC Bus Ripple (%):", "dcRipple", True)

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Ek Yük Cikisi Var mı? / Is there an Additional Load Output?:", _
        "extraLoadOutput", _
        Array("Yok", "Var"), _
        "Yok")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Diyot Dropper / Diode Dropper:", _
        "diodeDropper", _
        Array("Yok / No", "1 kademe / 1 Stage", "2 kademe / 2 Stage", "3 kademe / 3 Stage", "4 kademe / 4 Stage", "DC-DC Kiyicili / DC-DC Chopper"), _
        "Yok / No")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Dahili DC Yük Dagitimi / Internal DC Load Distribution:", _
        "internalDistribution", _
        Array("Yok / No", "Var / Yes"), _
        "Yok / No")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Akü LVD / Battery LVD:", _
        "batteryLVD", _
        Array("Yok / No", "Var / Yes"), _
        "Yok / No")

    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "Cikis Klemensi/Output Terminal Seçimi:", _
        "Cikis akimina göre bir üst deger seçilir. Örnek: Cikis akimi 100A › 35mm Klemens (110A kapasiteli) seçilir.")
    currentRow = CreateInfoBox(ws, currentRow, "Cikis Kesicisi (MCB/MCCB) Seçimi:", _
        "Cikis akimindan bir üst deger seçilir. DC gerilim > 48V › 3 kutuplu, ? 48V › 2 kutuplu. Kullanici MCB/MCCB tercihini belirtir.")

    currentRow = currentRow + 2

    ' ============================================
    ' 4) AKÜ BİLGİLERİ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, " AKÜ BILGILERI / BATTERY INFORMATION", RGB(255, 99, 71))
    currentRow = CreateSubSectionHeader(ws, currentRow, "Akü Konfigürasyonu / Battery Configuration")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Akü Tipi / Battery Type:", _
        "batteryType", _
        Array("VRLA", "Ni-CD", "Li-ion"), _
        "VRLA")

    currentRow = CreateInputRow(ws, currentRow, "Batarya Voltajı / Battery Voltage (V):", "batteryVoltage")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Kutu Icinde Dahili Akü / Internal Battery in Cabinet:", _
        "batteryInCabinet", _
        Array("Yok / No", "Var / Yes"), _
        "Yok / No")

    currentRow = CreateInputRow(ws, currentRow, "Dahili Akü Adedi / Internal Battery Quantity:", "internalBatteryQuantity")
    currentRow = CreateInputRow(ws, currentRow, "Dahili Akü Adi / Internal Battery Name:", "internalBatteryName")
    currentRow = CreateInputRow(ws, currentRow, "Toplam Hücre Sayisi / Total Cell Count:", "batteryCellCount", True)
    currentRow = CreateInputRow(ws, currentRow, "Hücre Basi Gerilim / Voltage per Cell (V):", "batteryVoltagePerCell", True)
    currentRow = CreateInputRow(ws, currentRow, "Float Gerilimi (Hücre Basi) / Float Voltage per Cell (V):", "floatVoltagePerCell")
    currentRow = CreateInputRow(ws, currentRow, "Dengeleme Gerilimi (Hücre Basi) / Equalization Voltage per Cell (V):", "equalizationVoltagePerCell")
    currentRow = CreateInputRow(ws, currentRow, "Boost Gerilimi (Hücre Basi) / Boost Voltage per Cell (V):", "boostVoltagePerCell")
    currentRow = CreateInputRow(ws, currentRow, "Toplam Yüzdürme Gerilimi / Total Float Voltage (V):", "floatVoltage", True)
    currentRow = CreateInputRow(ws, currentRow, "Toplam Dengeleme Gerilimi / Total Equalization Voltage (V):", "equalizationVoltage", True)
    currentRow = CreateInputRow(ws, currentRow, "Toplam Boost Gerilimi / Total Boost Voltage (V):", "boostVoltage", True)

    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "?? Batarya Kesicisi (MCB/MCCB) Seçimi:", _
        "Cikis kesicisi ile ayni seçim kurallari geçerlidir: cikis akimindan bir üst degeri, ayni kutup sayisi ve tip.")
    currentRow = CreateInfoBox(ws, currentRow, "Batarya Akim Okuma Karti Seçimi:", _
        "Cikis akimi < 100A › L100P, 100A ? < 200A › L200P, 200A ? < 300A › L300P, ? 300A › Yetkili kisi ile görüsülmelidir.")

    currentRow = currentRow + 2

    ' ============================================
    ' 5) MEKANİK
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "CIHAZ MEKANIK BILGILERI / DEVICE MECHANICAL INFORMATION", RGB(147, 112, 219))
    currentRow = CreateSubSectionHeader(ws, currentRow, "Kutu Tipi ve Boyutlari / Cabinet Type and Dimensions")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Kutu Tipi / Cabinet Type:", _
        "cabinetType", _
        Array("Dikili Tip / Standing Type", "Duvar Montaj / Wall Mount", "Rack Montaj / Rack Mount", "Özel tasarim / Custom Design"), _
        "Dikili Tip / Standing Type")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Kutu Boyutlari / Cabinet Dimensions:", _
        "cabinetSize", _
        Array("SR1 450*500*1000mm", "SR2 600*600*1300mm", "SR3 750*700*1600mm", "Özel Boyutlar / Custom Dimensions"), _
        "SR2 600*600*1300mm")

    currentRow = CreateInputRow(ws, currentRow, "Özel Genişlik / Custom Width (mm):", "customCabinetWidth")
    currentRow = CreateInputRow(ws, currentRow, "Özel Derinlik / Custom Depth (mm):", "customCabinetDepth")
    currentRow = CreateInputRow(ws, currentRow, "Özel Yükseklik / Custom Height (mm):", "customCabinetHeight")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Koruma Sınıfı / Protection Class:", _
        "protectionClass", _
        Array("IP20", "IP54", "IP65", "IP66", "IP67"), _
        "IP20")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Kutu Rengi / Cabinet Color:", _
        "cabinetColor", _
        Array("RAL7035", "RAL7032", "RAL7040", "RAL7047", "RAL1013", "RAL9005"), _
        "RAL7035")

    currentRow = currentRow + 1
    currentRow = CreateSubSectionHeader(ws, currentRow, "Kablo ve Sogutma / Cable and Cooling")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Kablo Girişi / Cable Entry:", _
        "cableEntry", _
        Array("Alttan / Bottom", "Üstten / Top", "Üstten ve Alttan / Top and Bottom", "Önden / Front", "Arkadan / Rear"), _
        "Alttan / Bottom")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Sac Tipi / Sheet Type:", _
        "sheetType", _
        Array("Galvaniz Sac 1.5mm", "Galvaniz Sac 2mm", "Galvaniz Sac 3mm"), _
        "Galvaniz Sac 1.5mm")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Sogutma / Cooling:", _
        "cooling", _
        Array("Hava Zorlamali / Fan Forced", "Dogal / Natural", "Sulu / Water Cooling"), _
        "Hava Zorlamali / Fan Forced")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Hava Akis Yönü / Airflow Direction:", _
        "airflowDirection", _
        Array("Üstten / Top", "Arkadan / Rear", "Yanlardan / Sides", "Önden arkaya / Front to Rear"), _
        "Arkadan / Rear")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Çalışma Sıcaklığı / Operating Temperature:", _
        "operatingTemperature", _
        Array("-5°C / 45°C", "0°C / 45°C", "-5°C / 40°C", "-5°C / 50°C", "-10°C / 40°C", "-10°C / 45°C", "-10°C / 50°C"), _
        "-5°C / 45°C")

    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "?? Kabin Seçimi:", _
        "Otomatik tasarım tarafından mekanik bilgilere göre seçilir. SR1/SR2/SR3 veya özel boyutlar için fiyatlandırma yapılır.")

    currentRow = currentRow + 2

    ' ============================================
    ' 6) KULLANICI ARAYÜZÜ
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "??? KULLANICI ARAYÜZÜ / USER INTERFACE", RGB(72, 209, 204))
    currentRow = CreateSubSectionHeader(ws, currentRow, "Ön Panel / Front Panel")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Ön Panel / Front Panel:", _
        "frontPanel", _
        Array("LCD+ LED Panel", "LCD", "Dokunmatik 7"" renkli / Touch Screen 7"" Color", "Mimic Panel", "LCD+Led Panel+Mimic Panel"), _
        "LCD+ LED Panel")

    currentRow = currentRow + 1
    currentRow = CreateSubSectionHeader(ws, currentRow, "Ölçü Aletleri / Measurement Instruments")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Ölçü Aleti Tipi / Instrument Type:", _
        "measurementInstrumentType", _
        Array("Analog / Analog", "Dijital / Digital", "Multimetre / Multimeter", "Enerji analizörü / Energy Analyzer"), _
        "")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Ölçüm Noktası / Measurement Point:", _
        "measurementPoint", _
        Array("Yük gerilimi / Load Voltage", "Yük akımı / Load Current", "Akü gerilimi / Battery Voltage", "Akü akımı / Battery Current", _
              "Giriş gerilimler / Input Voltages", "Giriş akımlar / Input Currents"), _
        "")

    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "?? Ölçü Aletleri Seçimi:", _
        "Voltmetre: voltaj × 1.2 aralık seç. Multimetre: giriş/çıkış/akü noktalarında. Enerji analizörü: sadece giriş ölçümünde.")

    currentRow = currentRow + 2

    ' ============================================
    ' 7) HABERLEŞME
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "?? HABERLEŞME ARAYÜZÜ / COMMUNICATION INTERFACE", RGB(255, 20, 147))
    currentRow = CreateSubSectionHeader(ws, currentRow, "Haberleşme Protokolü / Communication Protocol")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Haberleşme Protokolü / Communication Protocol:", _
        "communicationProtocol", _
        Array("Modbus RTU RS232", "Modbus RTU RS485", "Modbus RTU RS232 + Modbus RTU RS485", "Modbus TCP / IP", _
              "IEC61850", "Modbus RTU RS485 + IEC61850", "Profinet", "Profibus"), _
        "Modbus RTU RS232")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Röle Kuru Kontak Alarm Çıkışları / Relay Dry Contact Alarm Outputs:", _
        "relayAlarmOutputs", _
        Array("Programlanabilir Kuru Kontak Alarm Çıkışı 4 Adet", "Programlanabilir Kuru Kontak Alarm Çıkışı 8 Adet", _
              "Programlanabilir Kuru Kontak Alarm Çıkışı 12 Adet", "Programlanabilir Kuru Kontak Alarm Çıkışı 16 Adet"), _
        "Programlanabilir Kuru Kontak Alarm Çıkışı 4 Adet")

    currentRow = CreateDropdownRow(ws, wsLists, currentRow, _
        "Paralel Çalışma / Parallel Operation:", _
        "parallelOperation", _
        Array("Pasif (standart) / Passive (Standard)", "Yok / No", "Aktif / Active"), _
        "Pasif (standart) / Passive (Standard)")

    currentRow = currentRow + 1
    currentRow = CreateInfoBox(ws, currentRow, "?? Haberleşme Protokolü Seçimi:", _
        "Seçilen protokole göre haberleşme modülü seçilir. Bütün güçlerde aynı ürünler kullanılır.")
    currentRow = CreateInfoBox(ws, currentRow, "?? Paralel Çalışma:", _
        "Aktif paralel seçilirse paralelleme kartı ve RJ45 port eklenir.")
    currentRow = CreateInfoBox(ws, currentRow, "?? Alarm Terminalleri Seçimi:", _
        "4 röle › 12 adet, 8 röle › 24 adet, 12 röle › 36 adet 2.5mm terminal seçilir.")

    currentRow = currentRow + 2

    ' ============================================
    ' HESAPLAMA BUTONU
    ' ============================================
    currentRow = CreateSectionHeader(ws, currentRow, "🔧 PARÇA SEÇİM HESAPLAMALARI / COMPONENT SELECTION CALCULATIONS", RGB(50, 50, 50))
    
    ' Buton oluştur
    Dim btnRange As Range
    Set btnRange = ws.Range("B" & currentRow & ":H" & currentRow)
    btnRange.Merge
    btnRange.RowHeight = 40
    btnRange.Interior.Color = RGB(0, 120, 215)
    btnRange.Font.Size = 14
    btnRange.Font.Bold = True
    btnRange.Font.Color = RGB(255, 255, 255)
    btnRange.HorizontalAlignment = xlCenter
    btnRange.VerticalAlignment = xlCenter
    btnRange.Value = "📊 PARÇALARI HESAPLA / CALCULATE COMPONENTS"
    btnRange.Borders.LineStyle = xlContinuous
    btnRange.Borders.Weight = xlMedium
    
    ' Buton için makro ataması (hücre seçildiğinde çalışacak)
    ws.Range("B" & currentRow).AddComment "Bu hücreye çift tıklayarak parça seçim hesaplamalarını başlatabilirsiniz."
    ws.Range("B" & currentRow).Comment.Visible = False
    
    ' Buton hücresine özel format
    With ws.Range("B" & currentRow)
        .Name = "CalculateComponentsBtn"
        .Interior.Pattern = xlPatternSolid
    End With
    
    currentRow = currentRow + 2

    ' ============================================
    ' SAYFA FORMATLAMA
    ' ============================================
    With ws
        .Columns("A").ColumnWidth = 3
        .Columns("B").ColumnWidth = 50
        .Columns("C").ColumnWidth = 40
        .Columns("D").ColumnWidth = 60
        .Columns("E").ColumnWidth = 15
        .Columns("F").ColumnWidth = 15
        .Columns("G").ColumnWidth = 15
        .Columns("H").ColumnWidth = 15
        .Rows.AutoFit
    End With

    ' Buton için özel format ve açıklama
    Dim btnCell As Range
    Set btnCell = ws.Range("B" & currentRow)
    btnCell.AddComment "Bu hücreye çift tıklayarak veya Alt+F8 ile 'CalculateRectifierComponents' makrosunu çalıştırarak parça seçim hesaplamalarını başlatabilirsiniz."
    btnCell.Comment.Visible = False
    
    ' Buton hücresine isim ver (makro çağrısı için)
    btnCell.Name = "CalculateComponentsBtn"
    
    ' Otomatik güncelleme için event handler ve formüller ekle
    SetupAutoUpdate ws
    
    ' Parça listesi sayfasını oluştur
    CreateComponentListSheet ThisWorkbook
    
    ' İstersen kullanıcıya sayfayı göster:
    ' ThisWorkbook.Activate
    ' ws.Activate
    ' ws.Range("A1").Select

CleanExit:
    Application.EnableEvents = True
    Application.ScreenUpdating = True

    MsgBox "Rectifier Girdi Sayfası başarıyla oluşturuldu!", vbInformation, "Başarılı"
    Exit Sub

CleanFail:
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    MsgBox "Hata: " & Err.description, vbCritical, "Rectifier Input Sheet"
End Sub


' =========================
' Yardımcılar
' =========================

Private Function GetOrCreateSheet(ByVal wb As Workbook, ByVal sheetName As String, ByVal clearIfExists As Boolean) As Worksheet
    Dim ws As Worksheet

    On Error Resume Next
    Set ws = wb.Worksheets(sheetName)
    On Error GoTo 0

    If ws Is Nothing Then
        Set ws = wb.Worksheets.Add(After:=wb.Worksheets(wb.Worksheets.Count))
        ws.Name = sheetName
    ElseIf clearIfExists Then
        ws.Cells.Clear
    End If

    Set GetOrCreateSheet = ws
End Function

Private Function CreateSectionHeader(ws As Worksheet, rowNum As Long, title As String, bgColor As Long) As Long
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

Private Function CreateSubSectionHeader(ws As Worksheet, rowNum As Long, title As String) As Long
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

Private Function CreateInputRow(ws As Worksheet, rowNum As Long, label As String, fieldName As String, Optional isReadOnly As Boolean = False) As Long
    ' Label
    With ws.Range("B" & rowNum)
        .Value = label
        .Font.Size = 10
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .WrapText = True
        .RowHeight = 25
    End With

    ' Input area (C:E) merged
    With ws.Range("C" & rowNum & ":E" & rowNum)
        .Merge
        .Value = vbNullString
        .Font.Size = 10
        .Interior.Color = IIf(isReadOnly, RGB(240, 240, 240), RGB(255, 255, 255))
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .Validation.Delete
        If isReadOnly Then
            .Locked = True
            .Font.Color = RGB(128, 128, 128)
            .Font.Italic = True
        Else
            .Locked = False
        End If
    End With

    ' FieldName (hidden reference)
    ws.Range("F" & rowNum).Value = fieldName
    ws.Range("F" & rowNum).Font.Color = RGB(255, 255, 255)

    CreateInputRow = rowNum + 1
End Function

Private Function CreateDropdownRow(ws As Worksheet, wsLists As Worksheet, rowNum As Long, label As String, fieldName As String, options As Variant, Optional defaultValue As String = "") As Long

    Dim inputCell As Range
    Dim listStartRow As Long, listEndRow As Long
    Dim i As Long
    Dim rngList As Range

    ' Label
    With ws.Range("B" & rowNum)
        .Value = label
        .Font.Size = 10
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .WrapText = True
        .RowHeight = 25
    End With

    ' Input merged range
    Set inputCell = ws.Range("C" & rowNum & ":E" & rowNum)
    inputCell.Merge

    ' Write options into Lists sheet (column A)
    listStartRow = wsLists.Cells(wsLists.Rows.Count, "A").End(xlUp).Row
    If wsLists.Cells(1, 1).Value = vbNullString And listStartRow = 1 Then
        listStartRow = 1
    Else
        listStartRow = listStartRow + 2
    End If

    wsLists.Cells(listStartRow, 1).Value = fieldName
    For i = LBound(options) To UBound(options)
        wsLists.Cells(listStartRow + 1 + i, 1).Value = options(i)
    Next i
    listEndRow = listStartRow + 1 + UBound(options)

    Set rngList = wsLists.Range("A" & (listStartRow + 1) & ":A" & listEndRow)

    ' Create/replace named range
    On Error Resume Next
    ThisWorkbook.Names(fieldName).Delete
    On Error GoTo 0
    ThisWorkbook.Names.Add Name:=fieldName, RefersTo:=rngList

    ' Apply Data Validation list (named range)
    With inputCell
        .Value = IIf(defaultValue <> vbNullString, defaultValue, options(0))
        .Font.Size = 10
        .Interior.Color = RGB(255, 255, 255)
        .Interior.Pattern = xlNone ' Gri deseni kaldır
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin

        .Validation.Delete
        .Validation.Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, Operator:=xlBetween, Formula1:="=" & fieldName
        .Validation.IgnoreBlank = True
        .Validation.InCellDropdown = True
        .Locked = False
    End With

    ' FieldName (hidden reference)
    ws.Range("F" & rowNum).Value = fieldName
    ws.Range("F" & rowNum).Font.Color = RGB(255, 255, 255)

    CreateDropdownRow = rowNum + 1
End Function
Private Function CreateInfoBox(ws As Worksheet, rowNum As Long, title As String, description As String) As Long
    Dim boxRng As Range
    Set boxRng = ws.Range("B" & rowNum & ":H" & rowNum)

    ' Güvenli merge
    Set boxRng = SafeMerge(boxRng)

    With boxRng
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

Private Function SafeMerge(ByVal rng As Range) As Range
    Dim c As Range
    ' rng ile kesişen merge alanlarını tek tek kaldır
    For Each c In rng.Cells
        If c.MergeCells Then c.MergeArea.UnMerge
    Next c

    On Error Resume Next
    rng.UnMerge
    On Error GoTo 0

    rng.Merge
    Set SafeMerge = rng
End Function

' ============================================
' PARÇA SEÇİM HESAPLAMA FONKSİYONLARI
' ============================================

' Bu fonksiyon butona çift tıklandığında veya F9 tuşuna basıldığında çağrılabilir
Public Sub CalculateRectifierComponents()
    Dim ws As Worksheet
    
    On Error Resume Next
    Set ws = Worksheets("Rectifier Girdileri")
    On Error GoTo 0
    
    If ws Is Nothing Then
        MsgBox "Rectifier Girdileri sayfası bulunamadı!", vbExclamation
        Exit Sub
    End If
    
    ' Hesaplamayı başlat
    CalculateComponentSelections ws
End Sub

Private Sub CalculateComponentSelections(ByVal ws As Worksheet)
    Dim wsResults As Worksheet
    Dim inputs As Object
    Dim results As Object
    Dim currentRow As Long
    
    On Error GoTo CalcError
    
    Application.ScreenUpdating = False
    Application.EnableEvents = False
    
    ' Sonuç sayfasını oluştur
    Set wsResults = GetOrCreateSheet(ThisWorkbook, "Parça Seçim Sonuçları", True)
    wsResults.Cells.Clear
    wsResults.Tab.Color = RGB(0, 150, 0)
    
    ' Girdi değerlerini oku
    Set inputs = ReadInputValues(ws)
    
    ' Hesaplamaları yap
    Set results = PerformCalculations(inputs)
    
    ' Sonuçları göster
    currentRow = DisplayResults(wsResults, inputs, results)
    
    ' Sayfayı aktif et
    wsResults.Activate
    wsResults.Range("A1").Select
    
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    
    MsgBox "Parça seçim hesaplamaları tamamlandı!" & vbCrLf & _
           "Sonuçlar 'Parça Seçim Sonuçları' sayfasında gösteriliyor.", vbInformation, "Hesaplama Tamamlandı"
    Exit Sub
    
CalcError:
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    MsgBox "Hesaplama hatası: " & Err.description, vbCritical, "Hata"
End Sub

Private Function ReadInputValues(ByVal ws As Worksheet) As Object
    ' Dictionary yerine Collection kullan (daha uyumlu)
    Dim inputs As Object
    Set inputs = CreateObject("Scripting.Dictionary")
    
    Dim cell As Range
    Dim fieldName As String
    Dim value As Variant
    
    ' F sütunundaki field name'leri kullanarak değerleri oku
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "F").End(xlUp).Row
    
    Dim i As Long
    For i = 1 To lastRow
        fieldName = Trim(ws.Range("F" & i).Value)
        If fieldName <> "" And fieldName <> "CalculateComponentsBtn" Then
            ' C:E birleşik hücresinden değeri oku
            Set cell = ws.Range("C" & i & ":E" & i)
            If cell.MergeCells Then
                value = cell.MergeArea.Cells(1, 1).Value
            Else
                value = ws.Range("C" & i).Value
            End If
            
            ' Boş değerleri kontrol et
            If IsEmpty(value) Or value = "" Then
                value = ""
            End If
            
            inputs.Add fieldName, value
        End If
    Next i
    
    Set ReadInputValues = inputs
End Function

Private Function PerformCalculations(ByVal inputs As Object) As Object
    ' Dictionary kullan
    Dim results As Object
    Set results = CreateObject("Scripting.Dictionary")
    
    Dim outputVoltage As Double
    Dim outputCurrent As Double
    Dim inputPhase As Long
    Dim topology As String
    Dim floatVoltage As Double
    Dim boostVoltage As Double
    
    ' Temel değerleri al (hata kontrolü ile)
    Dim tempValue As Variant
    tempValue = GetInputValue(inputs, "outputVoltage", 48)
    If IsNumeric(tempValue) And tempValue <> "" Then
        outputVoltage = CDbl(tempValue)
    Else
        outputVoltage = 48
    End If
    
    tempValue = GetInputValue(inputs, "outputCurrent", 100)
    If IsNumeric(tempValue) And tempValue <> "" Then
        outputCurrent = CDbl(tempValue)
    Else
        outputCurrent = 100
    End If
    
    Dim phaseStr As String
    phaseStr = GetInputValue(inputs, "inputPhase", "3 Faz")
    If phaseStr = "" Then phaseStr = "3 Faz"
    inputPhase = IIf(InStr(phaseStr, "3") > 0, 3, 1)
    
    topology = GetInputValue(inputs, "topology", "B6C")
    If topology = "" Then topology = "B6C"
    
    tempValue = GetInputValue(inputs, "floatVoltage", outputVoltage)
    If IsNumeric(tempValue) And tempValue <> "" Then
        floatVoltage = CDbl(tempValue)
    Else
        floatVoltage = outputVoltage
    End If
    
    tempValue = GetInputValue(inputs, "boostVoltage", outputVoltage * 1.15)
    If IsNumeric(tempValue) And tempValue <> "" Then
        boostVoltage = CDbl(tempValue)
    Else
        boostVoltage = outputVoltage * 1.15
    End If
    
    ' 1. Trafo Gücü Hesaplama
    Dim efficiency As Double
    Dim powerFactor As Double
    efficiency = IIf(inputPhase = 3, 0.9, 0.8)
    powerFactor = IIf(inputPhase = 3, 0.8, 0.7)
    
    Dim transformerPower As Double
    transformerPower = (outputCurrent * outputVoltage) / (efficiency * powerFactor) / 1000 ' kVA
    results.Add "transformerPower", transformerPower
    
    ' 2. Giriş Akımı Hesaplama
    Dim inputVoltageNominal As Double
    tempValue = GetInputValue(inputs, "inputVoltageNominal", 400)
    If IsNumeric(tempValue) And tempValue <> "" Then
        inputVoltageNominal = CDbl(tempValue)
    Else
        ' String'den sayı çıkar (örn: "380V" -> 380)
        Dim volStr As String
        volStr = CStr(tempValue)
        volStr = Replace(Replace(volStr, "V", ""), "v", "")
        If IsNumeric(volStr) Then
            inputVoltageNominal = CDbl(volStr)
        Else
            inputVoltageNominal = 400
        End If
    End If
    Dim inputCurrent As Double
    If inputVoltageNominal > 0 And inputPhase > 0 Then
        inputCurrent = transformerPower / (inputVoltageNominal * Sqr(inputPhase))
    Else
        inputCurrent = 0
    End If
    results.Add "inputCurrent", inputCurrent
    
    ' 3. Çıkış Klemensi Seçimi
    Dim outputTerminal As String
    outputTerminal = SelectTerminal(outputCurrent)
    results.Add "outputTerminal", outputTerminal
    
    ' 4. Çıkış Kesicisi Seçimi
    Dim outputBreaker As String
    Dim breakerPoles As Long
    breakerPoles = IIf(outputVoltage > 48, 3, 2)
    outputBreaker = SelectBreaker(outputCurrent, breakerPoles)
    results.Add "outputBreaker", outputBreaker
    results.Add "breakerPoles", breakerPoles
    
    ' 5. Batarya Kesicisi (çıkış ile aynı)
    results.Add "batteryBreaker", outputBreaker
    
    ' 6. Batarya Akım Okuma Kartı
    Dim batteryCurrentCard As String
    batteryCurrentCard = SelectCurrentCard(outputCurrent)
    results.Add "batteryCurrentCard", batteryCurrentCard
    
    ' 7. Rectifier Çıkış Akımı Okuma Kartı (batarya ile aynı)
    results.Add "rectifierCurrentCard", batteryCurrentCard
    
    ' 8. Serbest Geçiş Diyotu
    Dim freewheelingDiode As String
    Dim diodeCurrent As Double
    diodeCurrent = outputCurrent * 1.5
    freewheelingDiode = SelectFreewheelingDiode(diodeCurrent)
    results.Add "freewheelingDiode", freewheelingDiode
    results.Add "diodeCurrent", diodeCurrent
    
    ' 9. Faz Kontrol Tristörleri
    Dim thyristorCount As Long
    Dim thyristorCurrent As Double
    thyristorCurrent = (outputCurrent * 1.5) / inputPhase
    If topology = "B6C" Then
        thyristorCount = 3
    ElseIf topology = "B12C" Then
        thyristorCount = 6
    ElseIf topology = "B2H" Or InStr(topology, "Tek Faz") > 0 Then
        thyristorCount = 2
    Else
        thyristorCount = 3
    End If
    Dim thyristor As String
    thyristor = SelectThyristor(thyristorCurrent)
    results.Add "thyristor", thyristor
    results.Add "thyristorCount", thyristorCount
    results.Add "thyristorCurrent", thyristorCurrent
    
    ' 10. Soğutucu ve Fanlar
    Dim heatsinkCount As Long
    Dim fanCount As Long
    heatsinkCount = Application.WorksheetFunction.RoundUp(thyristorCount / 4, 0)
    fanCount = heatsinkCount
    If outputCurrent > 100 Then
        fanCount = fanCount + Application.WorksheetFunction.Floor((outputCurrent - 100) / 50, 1)
    End If
    results.Add "heatsinkCount", heatsinkCount
    results.Add "fanCount", fanCount
    
    ' 11. DC Şok
    Dim dcChokeCount As Long
    dcChokeCount = IIf(topology = "B12C", 2, 1)
    results.Add "dcChokeCount", dcChokeCount
    results.Add "dcChokeValue", "1mH"
    
    ' 12. DC Kapasitör (basitleştirilmiş)
    Dim capacitorCount As Long
    capacitorCount = Application.WorksheetFunction.RoundUp(outputCurrent / 50, 0)
    If capacitorCount < 2 Then capacitorCount = 2
    results.Add "capacitorCount", capacitorCount
    results.Add "capacitorValue", "4700µF veya 10000µF (kesim frekansına göre)"
    
    ' 13. Giriş Kesicisi
    Dim inputBreaker As String
    inputBreaker = SelectBreaker(inputCurrent, inputPhase)
    results.Add "inputBreaker", inputBreaker
    
    ' Giriş Trafosu bilgisi (zaten yukarıda hesaplandı)
    results.Add "inputVoltageNominal", inputVoltageNominal
    
    ' 14. Giriş Klemensi
    Dim inputTerminal As String
    inputTerminal = SelectTerminal(inputCurrent)
    results.Add "inputTerminal", inputTerminal
    
    ' 15. Diyot Dropper (koşullu)
    Dim diodeDropper As String
    diodeDropper = GetInputValue(inputs, "diodeDropper", "Yok / No")
    If diodeDropper <> "Yok / No" And diodeDropper <> "" Then
        Dim dropperInfo As String
        dropperInfo = CalculateDiodeDropper(outputCurrent, outputVoltage, floatVoltage, boostVoltage, diodeDropper)
        results.Add "diodeDropperInfo", dropperInfo
    End If
    
    ' 16. Alarm Terminalleri
    Dim relayAlarmOutputs As String
    relayAlarmOutputs = GetInputValue(inputs, "relayAlarmOutputs", "")
    Dim alarmTerminalCount As Long
    If InStr(relayAlarmOutputs, "4 Adet") > 0 Then
        alarmTerminalCount = 12
    ElseIf InStr(relayAlarmOutputs, "8 Adet") > 0 Then
        alarmTerminalCount = 24
    ElseIf InStr(relayAlarmOutputs, "12 Adet") > 0 Then
        alarmTerminalCount = 36
    Else
        alarmTerminalCount = 12
    End If
    results.Add "alarmTerminalCount", alarmTerminalCount
    
    Set PerformCalculations = results
End Function

Private Function DisplayResults(ByVal ws As Worksheet, ByVal inputs As Object, ByVal results As Object) As Long
    Dim currentRow As Long
    Dim outputCurrent As Double
    Dim outputVoltage As Double
    Dim inputPhase As Long
    
    ' Değerleri güvenli şekilde al
    Dim tempValue As Variant
    tempValue = GetInputValue(inputs, "outputCurrent", 100)
    If IsNumeric(tempValue) And tempValue <> "" Then
        outputCurrent = CDbl(tempValue)
    Else
        outputCurrent = 100
    End If
    
    tempValue = GetInputValue(inputs, "outputVoltage", 48)
    If IsNumeric(tempValue) And tempValue <> "" Then
        outputVoltage = CDbl(tempValue)
    Else
        outputVoltage = 48
    End If
    
    Dim phaseStr As String
    phaseStr = GetInputValue(inputs, "inputPhase", "3 Faz")
    If phaseStr = "" Then phaseStr = "3 Faz"
    inputPhase = IIf(InStr(phaseStr, "3") > 0, 3, 1)
    
    currentRow = 1
    
    ' Başlık
    With ws.Range("A" & currentRow & ":E" & currentRow)
        .Merge
        .Value = "RECTIFIER PARÇA SEÇİM BİLGİLENDİRMESİ"
        .Font.Size = 16
        .Font.Bold = True
        .Font.Color = RGB(255, 255, 255)
        .Interior.Color = RGB(0, 150, 0)
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .RowHeight = 35
    End With
    currentRow = currentRow + 2
    
    ' Bilgilendirme metni
    With ws.Range("A" & currentRow & ":E" & currentRow)
        .Merge
        .Value = "Aşağıdaki parçalar belirtilen değerlerde kullanılmalıdır:"
        .Font.Size = 11
        .Font.Bold = True
        .Font.Italic = True
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .Interior.Color = RGB(240, 240, 240)
        .RowHeight = 25
        .Borders.LineStyle = xlContinuous
    End With
    currentRow = currentRow + 2
    
    ' Parça bilgilendirmeleri (özet format)
    Dim infoText As String
    
    ' Hata kontrolü ile değerleri al
    Dim transformerPower As Double
    Dim inputVoltageNominal As Double
    If results.Exists("transformerPower") Then
        transformerPower = results("transformerPower")
    Else
        transformerPower = 0
    End If
    If results.Exists("inputVoltageNominal") Then
        inputVoltageNominal = results("inputVoltageNominal")
    Else
        inputVoltageNominal = 400
    End If
    
    ' 1. Trafo
    infoText = "• Giriş Trafosu: " & Format(transformerPower, "0.00") & " kVA, " & _
               inputPhase & " faz, " & Format(inputVoltageNominal, "0") & "V giriş"
    currentRow = CreateInfoRow(ws, currentRow, infoText)
    
    ' Parça bilgilendirmeleri (özet format) - Hata kontrolü ile
    Dim infoText As String
    
    ' 2. Çıkış Klemensi
    If results.Exists("outputTerminal") Then
        infoText = "• Çıkış Klemensi/Barası: " & results("outputTerminal") & " (Çıkış akımı: " & Format(outputCurrent, "0") & "A)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 3. Çıkış Kesicisi
    If results.Exists("outputBreaker") And results.Exists("breakerPoles") Then
        infoText = "• Çıkış Kesicisi: " & results("outputBreaker") & " (" & results("breakerPoles") & " kutuplu, DC gerilim: " & Format(outputVoltage, "0") & "V)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 4. Batarya Kesicisi
    If results.Exists("batteryBreaker") Then
        infoText = "• Batarya Kesicisi: " & results("batteryBreaker") & " (Çıkış kesicisi ile aynı)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 5. Akım Okuma Kartları
    If results.Exists("batteryCurrentCard") Then
        infoText = "• Batarya Akım Okuma Kartı: " & results("batteryCurrentCard") & " (Çıkış akımı: " & Format(outputCurrent, "0") & "A)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    If results.Exists("rectifierCurrentCard") Then
        infoText = "• Rectifier Çıkış Akımı Okuma Kartı: " & results("rectifierCurrentCard") & " (Batarya kartı ile aynı)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 6. Serbest Geçiş Diyotu
    If results.Exists("freewheelingDiode") And results.Exists("diodeCurrent") Then
        infoText = "• Serbest Geçiş Diyotu: " & results("freewheelingDiode") & " (Hesaplanan akım: " & Format(results("diodeCurrent"), "0.0") & "A = Çıkış × 1.5)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 7. Faz Kontrol Tristörleri
    If results.Exists("thyristorCount") And results.Exists("thyristor") And results.Exists("thyristorCurrent") Then
        infoText = "• Faz Kontrol Tristörleri: " & results("thyristorCount") & " adet " & results("thyristor") & _
                   " (Her tristör için akım: " & Format(results("thyristorCurrent"), "0.0") & "A = (Çıkış × 1.5) / Faz sayısı)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 8. Soğutucu ve Fanlar
    If results.Exists("heatsinkCount") Then
        infoText = "• Soğutucu (Heatsink): " & results("heatsinkCount") & " adet (Her 4 tristör için 1 adet)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    If results.Exists("fanCount") Then
        infoText = "• Fan: " & results("fanCount") & " adet (Tristör soğutucuları + akım bazlı ek fanlar)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 9. DC Şok
    If results.Exists("dcChokeCount") And results.Exists("dcChokeValue") Then
        infoText = "• DC Şok: " & results("dcChokeCount") & " adet, " & results("dcChokeValue") & " (Sabit değer)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 10. DC Kapasitör
    If results.Exists("capacitorCount") And results.Exists("capacitorValue") Then
        infoText = "• DC Kapasitör: " & results("capacitorCount") & " adet, " & results("capacitorValue") & " (Kesim frekansına göre iteratif seçim)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 11. Giriş Kesicisi
    If results.Exists("inputBreaker") And results.Exists("inputCurrent") Then
        infoText = "• Giriş Kesicisi: " & results("inputBreaker") & " (Giriş akımı: " & Format(results("inputCurrent"), "0.00") & "A, " & inputPhase & " faz)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 12. Giriş Klemensi
    If results.Exists("inputTerminal") Then
        infoText = "• Giriş Klemensi: " & results("inputTerminal") & " × " & inputPhase & " adet (Faz sayısı kadar)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 13. Terminaller
    If results.Exists("inputTerminal") Then
        infoText = "• Giriş Terminali Gri (Faz): " & results("inputTerminal") & " × " & inputPhase & " adet"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
        
        infoText = "• Giriş Terminali Sarı-Yeşil (Toprak): " & results("inputTerminal") & " × 1 adet"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    If results.Exists("outputTerminal") Then
        infoText = "• Çıkış Terminali Kırmızı: " & results("outputTerminal") & " × 1 adet"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
        
        infoText = "• Çıkış Terminali Siyah: " & results("outputTerminal") & " × 1 adet"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 14. Alarm Terminalleri
    If results.Exists("alarmTerminalCount") Then
        infoText = "• Alarm Terminalleri: 2.5mm Terminal × " & results("alarmTerminalCount") & " adet (Röle sayısına göre)"
        currentRow = CreateInfoRow(ws, currentRow, infoText)
    End If
    
    ' 15. Diyot Dropper (koşullu)
    If results.Exists("diodeDropperInfo") Then
        infoText = "• Diyot Dropper: " & results("diodeDropperInfo")
        currentRow = CreateInfoRow(ws, currentRow, infoText, True)
    End If
    
    ' Sütun genişliklerini ayarla
    ws.Columns("A").ColumnWidth = 3
    ws.Columns("B").ColumnWidth = 80
    ws.Columns("C").ColumnWidth = 3
    ws.Columns("D").ColumnWidth = 3
    ws.Columns("E").ColumnWidth = 3
    ws.Rows.AutoFit
    
    DisplayResults = currentRow
End Function

Private Function CreateInfoRow(ByVal ws As Worksheet, ByVal rowNum As Long, ByVal text As String, Optional isHighlighted As Boolean = False) As Long
    With ws.Range("B" & rowNum & ":E" & rowNum)
        .Merge
        .Value = text
        .Font.Size = 10
        .Font.Bold = False
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .WrapText = True
        .RowHeight = 22
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        If isHighlighted Then
            .Interior.Color = RGB(255, 255, 200)
            .Font.Bold = True
        Else
            .Interior.Color = RGB(255, 255, 255)
        End If
    End With
    CreateInfoRow = rowNum + 1
End Function

' Yardımcı fonksiyonlar
Private Function GetInputValue(ByVal inputs As Object, ByVal key As String, ByVal defaultValue As Variant) As Variant
    If inputs.Exists(key) Then
        GetInputValue = inputs(key)
    Else
        GetInputValue = defaultValue
    End If
End Function

Private Function SelectTerminal(ByVal current As Double) As String
    Dim terminals As Variant
    terminals = Array(20, 25, 33, 50, 60, 85, 110, 132, 155, 205, 245, 325, 350, 450, 460, 600, 835)
    Dim terminalSizes As Variant
    terminalSizes = Array("2.5mm", "4.0mm", "6.0mm", "10.0mm", "16.0mm", "25.0mm", "35.0mm", "50.0mm", _
                          "15x2mm", "20x2mm", "20x3mm", "20x5mm", "30x3mm", "30x5mm", "40x3mm", "40x5mm", "40x10mm")
    
    Dim i As Long
    For i = LBound(terminals) To UBound(terminals)
        If terminals(i) >= current Then
            SelectTerminal = terminalSizes(i) & " (" & terminals(i) & "A)"
            Exit Function
        End If
    Next i
    SelectTerminal = "40x10mm (835A+)"
End Function

Private Function SelectBreaker(ByVal current As Double, ByVal poles As Variant) As String
    Dim breakerValues As Variant
    breakerValues = Array(6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 175, 200, 225, 250, 320, 400, 500)
    
    Dim poleStr As String
    If IsNumeric(poles) Then
        poleStr = poles & "x"
    Else
        poleStr = "2x"
    End If
    
    Dim i As Long
    For i = LBound(breakerValues) To UBound(breakerValues)
        If breakerValues(i) >= current Then
            SelectBreaker = "MCB " & poleStr & breakerValues(i) & "A"
            Exit Function
        End If
    Next i
    SelectBreaker = "MCCB " & poleStr & "500A+"
End Function

Private Function SelectCurrentCard(ByVal current As Double) As String
    If current < 100 Then
        SelectCurrentCard = "L100P"
    ElseIf current < 200 Then
        SelectCurrentCard = "L200P"
    ElseIf current < 300 Then
        SelectCurrentCard = "L300P"
    Else
        SelectCurrentCard = "L300P+ (Yetkili kişi ile görüşülmeli)"
    End If
End Function

Private Function SelectFreewheelingDiode(ByVal current As Double) As String
    Dim diodeValues As Variant
    diodeValues = Array(71, 80, 120, 170, 220)
    Dim diodeNames As Variant
    diodeNames = Array("MDD56-12 (71A)", "MDD76-12 (80A)", "MDD110-12 (120A)", "MDD156-12 (170A)", "MDD215-12 (220A)")
    
    Dim i As Long
    For i = LBound(diodeValues) To UBound(diodeValues)
        If diodeValues(i) >= current Then
            SelectFreewheelingDiode = diodeNames(i)
            Exit Function
        End If
    Next i
    SelectFreewheelingDiode = "MDD215-12+ (220A+)"
End Function

Private Function SelectThyristor(ByVal current As Double) As String
    ' Basitleştirilmiş tristör seçimi
    If current <= 25 Then
        SelectThyristor = "25A Tristör"
    ElseIf current <= 50 Then
        SelectThyristor = "50A Tristör"
    ElseIf current <= 100 Then
        SelectThyristor = "100A Tristör"
    Else
        SelectThyristor = "150A+ Tristör"
    End If
End Function

Private Function CalculateDiodeDropper(ByVal outputCurrent As Double, ByVal outputVoltage As Double, _
                                       ByVal floatVoltage As Double, ByVal boostVoltage As Double, _
                                       ByVal dropperType As String) As String
    Dim voltageDrop As Double
    Dim diodeCount As Long
    
    If InStr(dropperType, "1 kademe") > 0 Then
        voltageDrop = boostVoltage - floatVoltage
    ElseIf InStr(dropperType, "2 kademe") > 0 Then
        voltageDrop = boostVoltage - (outputVoltage * 1.1)
    Else
        voltageDrop = boostVoltage - floatVoltage
    End If
    
    diodeCount = Application.WorksheetFunction.RoundUp(voltageDrop / 1.5, 0)
    If diodeCount < 1 Then diodeCount = 1
    
    CalculateDiodeDropper = "Diyot sayısı: " & diodeCount & " adet, Gerilim düşüşü: " & Format(voltageDrop, "0.0") & "V"
End Function

' ============================================
' OTOMATIK GÜNCELLEME VE PARÇA LİSTESİ
' ============================================

Private Sub SetupAutoUpdate(ByVal ws As Worksheet)
    ' Formül bazlı hesaplamalar için hücre referansları oluştur
    ' Bu fonksiyon, hesaplanan alanlara formül ekler
    
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "F").End(xlUp).Row
    
    Dim i As Long
    Dim fieldName As String
    Dim cell As Range
    Dim cellCountRow As Long
    Dim floatPerCellRow As Long
    Dim equalPerCellRow As Long
    Dim boostPerCellRow As Long
    Dim batteryVoltageRow As Long
    Dim voltagePerCellRow As Long
    
    ' Satır numaralarını bul
    cellCountRow = FindFieldRow(ws, "batteryCellCount")
    floatPerCellRow = FindFieldRow(ws, "floatVoltagePerCell")
    equalPerCellRow = FindFieldRow(ws, "equalizationVoltagePerCell")
    boostPerCellRow = FindFieldRow(ws, "boostVoltagePerCell")
    batteryVoltageRow = FindFieldRow(ws, "batteryVoltage")
    voltagePerCellRow = FindFieldRow(ws, "batteryVoltagePerCell")
    
    ' Hesaplanan alanları bul ve formül ekle
    For i = 1 To lastRow
        fieldName = Trim(ws.Range("F" & i).Value)
        
        ' C:E birleşik hücresini al
        Set cell = ws.Range("C" & i & ":E" & i)
        If Not cell.MergeCells Then
            Set cell = ws.Range("C" & i)
        Else
            Set cell = cell.MergeArea.Cells(1, 1)
        End If
        
        ' Float/Boot/Equalization gerilimleri için formül ekle
        If fieldName = "floatVoltage" And cellCountRow > 0 And floatPerCellRow > 0 Then
            cell.Formula = "=IF(AND(ISNUMBER(C" & cellCountRow & "),ISNUMBER(C" & floatPerCellRow & ")),C" & cellCountRow & "*C" & floatPerCellRow & ","""")"
            cell.Locked = True
        ElseIf fieldName = "equalizationVoltage" And cellCountRow > 0 And equalPerCellRow > 0 Then
            cell.Formula = "=IF(AND(ISNUMBER(C" & cellCountRow & "),ISNUMBER(C" & equalPerCellRow & ")),C" & cellCountRow & "*C" & equalPerCellRow & ","""")"
            cell.Locked = True
        ElseIf fieldName = "boostVoltage" And cellCountRow > 0 And boostPerCellRow > 0 Then
            cell.Formula = "=IF(AND(ISNUMBER(C" & cellCountRow & "),ISNUMBER(C" & boostPerCellRow & ")),C" & cellCountRow & "*C" & boostPerCellRow & ","""")"
            cell.Locked = True
        ElseIf fieldName = "batteryCellCount" And batteryVoltageRow > 0 And voltagePerCellRow > 0 Then
            cell.Formula = "=IF(AND(ISNUMBER(C" & batteryVoltageRow & "),ISNUMBER(C" & voltagePerCellRow & "),C" & voltagePerCellRow & "<>0),C" & batteryVoltageRow & "/C" & voltagePerCellRow & ","""")"
            cell.Locked = True
        ElseIf fieldName = "batteryVoltagePerCell" And batteryVoltageRow > 0 And cellCountRow > 0 Then
            cell.Formula = "=IF(AND(ISNUMBER(C" & batteryVoltageRow & "),ISNUMBER(C" & cellCountRow & "),C" & cellCountRow & "<>0),C" & batteryVoltageRow & "/C" & cellCountRow & ","""")"
            cell.Locked = True
        End If
    Next i
    
    ' Event handler için not ekle
    On Error Resume Next
    ws.Range("A1").Comment.Delete
    ws.Range("A1").AddComment "Bu sayfa otomatik güncelleme özelliğine sahiptir. Girdi değerleri değiştiğinde parça listesi otomatik güncellenir."
    ws.Range("A1").Comment.Visible = False
    On Error GoTo 0
End Sub

Private Function FindFieldRow(ByVal ws As Worksheet, ByVal fieldName As String) As Long
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "F").End(xlUp).Row
    
    Dim i As Long
    For i = 1 To lastRow
        If Trim(ws.Range("F" & i).Value) = fieldName Then
            FindFieldRow = i
            Exit Function
        End If
    Next i
    FindFieldRow = 0
End Function

' Worksheet Change Event Handler için yardımcı fonksiyon
Public Sub OnRectifierInputChange(ByVal Target As Range)
    Dim ws As Worksheet
    Set ws = Target.Worksheet
    
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

Private Sub CreateComponentListSheet(ByVal wb As Workbook)
    Dim ws As Worksheet
    Dim currentRow As Long
    
    ' Parça listesi sayfasını oluştur
    Set ws = GetOrCreateSheet(wb, "Parça Listesi", True)
    ws.Tab.Color = RGB(255, 140, 0)
    
    ' Başlık
    currentRow = 1
    With ws.Range("A" & currentRow & ":F" & currentRow)
        .Merge
        .Value = "RECTIFIER PARÇA LİSTESİ (OTOMATIK GÜNCELLENİR)"
        .Font.Size = 14
        .Font.Bold = True
        .Font.Color = RGB(255, 255, 255)
        .Interior.Color = RGB(255, 140, 0)
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .RowHeight = 30
    End With
    currentRow = currentRow + 2
    
    ' Tablo başlıkları
    ws.Range("A" & currentRow).Value = "No"
    ws.Range("B" & currentRow).Value = "Parça Adı"
    ws.Range("C" & currentRow).Value = "Değer / Özellik"
    ws.Range("D" & currentRow).Value = "Adet"
    ws.Range("E" & currentRow).Value = "Açıklama"
    ws.Range("F" & currentRow).Value = "Durum"
    
    With ws.Range("A" & currentRow & ":F" & currentRow)
        .Font.Bold = True
        .Interior.Color = RGB(200, 200, 200)
        .Borders.LineStyle = xlContinuous
        .HorizontalAlignment = xlCenter
    End With
    
    ' Sütun genişlikleri
    ws.Columns("A").ColumnWidth = 5
    ws.Columns("B").ColumnWidth = 35
    ws.Columns("C").ColumnWidth = 40
    ws.Columns("D").ColumnWidth = 10
    ws.Columns("E").ColumnWidth = 50
    ws.Columns("F").ColumnWidth = 15
    
    ' İlk güncellemeyi yap
    UpdateComponentList wb
End Sub

Public Sub UpdateComponentList(ByVal wb As Workbook)
    Dim wsInput As Worksheet
    Dim wsList As Worksheet
    Dim inputs As Object
    Dim results As Object
    Dim currentRow As Long
    Dim compNo As Long
    
    On Error Resume Next
    Set wsInput = wb.Worksheets("Rectifier Girdileri")
    Set wsList = wb.Worksheets("Parça Listesi")
    On Error GoTo 0
    
    If wsInput Is Nothing Or wsList Is Nothing Then Exit Sub
    
    Application.ScreenUpdating = False
    Application.EnableEvents = False
    
    ' Mevcut listeyi temizle (başlık hariç)
    wsList.Range("A3:F1000").Clear
    
    ' Girdi değerlerini oku
    Set inputs = ReadInputValues(wsInput)
    
    ' Temel değerler kontrolü
    Dim outputCurrent As Double
    Dim outputVoltage As Double
    Dim tempValue As Variant
    
    tempValue = GetInputValue(inputs, "outputCurrent", "")
    If IsNumeric(tempValue) And tempValue <> "" And tempValue > 0 Then
        outputCurrent = CDbl(tempValue)
    Else
        ' Boş liste göster
        wsList.Range("A3").Value = "Lütfen önce girdi değerlerini doldurun"
        wsList.Range("A3:F3").Merge
        wsList.Range("A3").Font.Italic = True
        wsList.Range("A3").Interior.Color = RGB(255, 255, 200)
        GoTo UpdateExit
    End If
    
    tempValue = GetInputValue(inputs, "outputVoltage", "")
    If IsNumeric(tempValue) And tempValue <> "" And tempValue > 0 Then
        outputVoltage = CDbl(tempValue)
    Else
        outputVoltage = 48
    End If
    
    ' Hesaplamaları yap
    Set results = PerformCalculations(inputs)
    
    ' Parçaları listele
    currentRow = 3
    compNo = 1
    
    ' 1. Giriş Trafosu
    If results.Exists("transformerPower") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Giriş Trafosu"
        wsList.Range("C" & currentRow).Value = Format(results("transformerPower"), "0.00") & " kVA"
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Hesaplanan güç: " & Format(results("transformerPower"), "0.00") & " kVA"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 2. Çıkış Klemensi
    If results.Exists("outputTerminal") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Çıkış Klemensi/Barası"
        wsList.Range("C" & currentRow).Value = results("outputTerminal")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Çıkış akımı: " & Format(outputCurrent, "0") & "A"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 3. Çıkış Kesicisi
    If results.Exists("outputBreaker") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Çıkış Kesicisi"
        wsList.Range("C" & currentRow).Value = results("outputBreaker")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = results("breakerPoles") & " kutuplu, DC: " & Format(outputVoltage, "0") & "V"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 4. Batarya Kesicisi
    If results.Exists("batteryBreaker") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Batarya Kesicisi"
        wsList.Range("C" & currentRow).Value = results("batteryBreaker")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Çıkış kesicisi ile aynı"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 5. Akım Okuma Kartları
    If results.Exists("batteryCurrentCard") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Batarya Akım Okuma Kartı"
        wsList.Range("C" & currentRow).Value = results("batteryCurrentCard")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Çıkış akımı: " & Format(outputCurrent, "0") & "A"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    If results.Exists("rectifierCurrentCard") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Rectifier Çıkış Akımı Okuma Kartı"
        wsList.Range("C" & currentRow).Value = results("rectifierCurrentCard")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Batarya kartı ile aynı"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 6. Serbest Geçiş Diyotu
    If results.Exists("freewheelingDiode") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Serbest Geçiş Diyotu"
        wsList.Range("C" & currentRow).Value = results("freewheelingDiode")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Akım: " & Format(results("diodeCurrent"), "0.0") & "A (Çıkış × 1.5)"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 7. Faz Kontrol Tristörleri
    If results.Exists("thyristor") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Faz Kontrol Tristörleri"
        wsList.Range("C" & currentRow).Value = results("thyristor")
        wsList.Range("D" & currentRow).Value = results("thyristorCount")
        wsList.Range("E" & currentRow).Value = "Her tristör: " & Format(results("thyristorCurrent"), "0.0") & "A"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 8. Soğutucu
    If results.Exists("heatsinkCount") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Soğutucu (Heatsink)"
        wsList.Range("C" & currentRow).Value = "Standart Soğutucu"
        wsList.Range("D" & currentRow).Value = results("heatsinkCount")
        wsList.Range("E" & currentRow).Value = "Her 4 tristör için 1 adet"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 9. Fan
    If results.Exists("fanCount") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Fan"
        wsList.Range("C" & currentRow).Value = "Standart Fan"
        wsList.Range("D" & currentRow).Value = results("fanCount")
        wsList.Range("E" & currentRow).Value = "Tristör soğutucuları + akım bazlı ek fanlar"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 10. DC Şok
    If results.Exists("dcChokeCount") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "DC Şok"
        wsList.Range("C" & currentRow).Value = results("dcChokeValue")
        wsList.Range("D" & currentRow).Value = results("dcChokeCount")
        wsList.Range("E" & currentRow).Value = "Sabit 1mH değer"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 11. DC Kapasitör
    If results.Exists("capacitorCount") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "DC Kapasitör"
        wsList.Range("C" & currentRow).Value = results("capacitorValue")
        wsList.Range("D" & currentRow).Value = results("capacitorCount")
        wsList.Range("E" & currentRow).Value = "Kesim frekansına göre iteratif seçim"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 12. Giriş Kesicisi
    If results.Exists("inputBreaker") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Giriş Kesicisi"
        wsList.Range("C" & currentRow).Value = results("inputBreaker")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Giriş akımı: " & Format(results("inputCurrent"), "0.00") & "A"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 13. Giriş Klemensi
    If results.Exists("inputTerminal") Then
        Dim phaseStr As String
        phaseStr = GetInputValue(inputs, "inputPhase", "3 Faz")
        Dim inputPhase As Long
        inputPhase = IIf(InStr(phaseStr, "3") > 0, 3, 1)
        
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Giriş Klemensi"
        wsList.Range("C" & currentRow).Value = results("inputTerminal")
        wsList.Range("D" & currentRow).Value = inputPhase
        wsList.Range("E" & currentRow).Value = "Faz sayısı kadar"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 14. Terminaller
    If results.Exists("inputTerminal") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Giriş Terminali Gri (Faz)"
        wsList.Range("C" & currentRow).Value = results("inputTerminal")
        wsList.Range("D" & currentRow).Value = inputPhase
        wsList.Range("E" & currentRow).Value = "Faz sayısı kadar"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
        
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Giriş Terminali Sarı-Yeşil (Toprak)"
        wsList.Range("C" & currentRow).Value = results("inputTerminal")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Her zaman 1 adet"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    If results.Exists("outputTerminal") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Çıkış Terminali Kırmızı"
        wsList.Range("C" & currentRow).Value = results("outputTerminal")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Pozitif çıkış"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
        
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Çıkış Terminali Siyah"
        wsList.Range("C" & currentRow).Value = results("outputTerminal")
        wsList.Range("D" & currentRow).Value = "1"
        wsList.Range("E" & currentRow).Value = "Negatif çıkış"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
        currentRow = currentRow + 1
        compNo = compNo + 1
    End If
    
    ' 15. Alarm Terminalleri
    If results.Exists("alarmTerminalCount") Then
        wsList.Range("A" & currentRow).Value = compNo
        wsList.Range("B" & currentRow).Value = "Alarm Terminalleri"
        wsList.Range("C" & currentRow).Value = "2.5mm Terminal"
        wsList.Range("D" & currentRow).Value = results("alarmTerminalCount")
        wsList.Range("E" & currentRow).Value = "Röle sayısına göre"
        wsList.Range("F" & currentRow).Value = "✓"
        FormatComponentRow wsList, currentRow
    End If
    
UpdateExit:
    Application.EnableEvents = True
    Application.ScreenUpdating = True
End Sub

Private Sub FormatComponentRow(ByVal ws As Worksheet, ByVal rowNum As Long)
    With ws.Range("A" & rowNum & ":F" & rowNum)
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        If rowNum Mod 2 = 0 Then
            .Interior.Color = RGB(245, 245, 245)
        Else
            .Interior.Color = RGB(255, 255, 255)
        End If
    End With
    ws.Range("A" & rowNum).HorizontalAlignment = xlCenter
    ws.Range("D" & rowNum).HorizontalAlignment = xlCenter
    ws.Range("F" & rowNum).HorizontalAlignment = xlCenter
End Sub

' ============================================
' WORKSHEET CHANGE EVENT HANDLER
' ============================================
' Bu kod "Rectifier Girdileri" sayfasının kod modülüne eklenmelidir
' VBA Editor'da: Sayfa adına sağ tık > View Code > Bu kodu yapıştır

'Private Sub Worksheet_Change(ByVal Target As Range)
'    Dim ws As Worksheet
'    Set ws = Me
'    
'    ' Girdi alanlarından biri değiştiğinde
'    If Not Intersect(Target, ws.Range("C:C,E:E")) Is Nothing Then
'        Application.EnableEvents = False
'        On Error Resume Next
'        
'        ' Parça listesini güncelle
'        UpdateComponentList ThisWorkbook
'        
'        On Error GoTo 0
'        Application.EnableEvents = True
'    End If
'End Sub

