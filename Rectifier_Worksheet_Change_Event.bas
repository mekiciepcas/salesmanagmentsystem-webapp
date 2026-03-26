Attribute VB_Name = "RectifierWorksheetEvents"
' ============================================
' Rectifier Girdileri Sayfası - Worksheet Change Event
' ============================================
' Bu kod "Rectifier Girdileri" sayfasının kod modülüne eklenmelidir
' 
' Uygulama:
' 1. VBA Editor'da sol taraftaki proje penceresinde "Rectifier Girdileri" sayfasına çift tıklayın
' 2. Açılan kod penceresine bu kodu yapıştırın
' 3. Dosyayı kaydedin
'
' Alternatif: Bu kodu bir modüle kopyalayıp, sayfa kod modülünde çağırabilirsiniz
' ============================================

Private Sub Worksheet_Change(ByVal Target As Range)
    Dim ws As Worksheet
    Set ws = Me
    
    ' Girdi alanlarından biri değiştiğinde otomatik güncelleme yap
    If Not Intersect(Target, ws.Range("C:C,E:E")) Is Nothing Then
        ' Event'leri geçici olarak kapat (sonsuz döngüyü önlemek için)
        Application.EnableEvents = False
        Application.ScreenUpdating = False
        
        On Error Resume Next
        
        ' Parça listesini güncelle
        UpdateComponentList ThisWorkbook
        
        ' Hata durumunda mesaj göster
        If Err.Number <> 0 Then
            ' Sessizce devam et (kullanıcıyı rahatsız etme)
            Err.Clear
        End If
        
        On Error GoTo 0
        
        ' Event'leri tekrar aç
        Application.EnableEvents = True
        Application.ScreenUpdating = True
    End If
End Sub

' Sayfa aktif olduğunda parça listesini güncelle (opsiyonel)
Private Sub Worksheet_Activate()
    On Error Resume Next
    UpdateComponentList ThisWorkbook
    On Error GoTo 0
End Sub



