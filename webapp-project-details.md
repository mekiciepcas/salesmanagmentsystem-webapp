
    -Oluşturulan bu formlar hem maliyet hesapla butonuna tıklanıldığında  profesyonel tablolandırılmış renklendirilmiş ve ilgili proje detayları ve ürün detaylarını içeren ayrıca ürün maliyetlendirme kalemlerini listeleyen bir maliyet tablosu çıkartmalı bu kalemlerin değerleri değiştirilebilir excele benzer bir yapıda oluşturulması gerekmekte ve kullanıcı manuel olarak düzenlemelerde bulunabilmelidir. Hem de proje için yapılan teknik hesaplama sonuçları pd olarak indirilebilir olmalı (html olarak oluşturup pdf olarak indir tekniğini kullanabiliriz.) hem de müşteriye gönderilecek olan teklif ön onay formunu yine html olarak kaliteli atentli ve düzgün tablolandırılmış şekilde sunabilmelidir. Bu dökümanlar daha sonra eişilebilir olması için indirilen veya kaydedilen windows dosya yolunu kaydetmeliyiz ve gelecekte bu dökümana erişilmek istenirse bu adrese yönlendirmeliyiz.
    -Kullanıcı ilgili ürünün maliyetlendirmesini bitirdiğinde ilgili projenin varsa diğer ürününü maliyetlendirmeye devam etmeli ve her ürün için maliyetlendirme bittiğinde teklife ekle seçeneği ile otomatik teklif dökümanı oluşturabilmek için formdaki belirli önemli bilgileri kullanmalıdır (Profesyonel bir çalışma için sistemin temel özelliklerini ve ek özelliklerini oluşturulacak otomatik teklif dökümanında sergilemek doğru olacaktır.). Ekleen bu teklifler düzgün atentli profesyonel bir teklif dökümanına dönüşmelidir.
    Teklif dökümanı arayüzünde ise currency değiştirilebilir ve otomatik olarak güncellenebilir olmalıdır ki sistem geneli default currency dolar olmalıdır.
Yönetici Dashboard:
    -Genel Bakış Sekmesi:
        *Toplam teklif sayısı
        *Onaylanan teklif Sayısı
        *Toplam Değer
        *Aktif Kullanıcı sayısı,
        *Aylık teklif trendi grafiği
            /Tutar, 12 Ay, Teklif sayısı olarak 3 eksende değerlendirme yapar.
        *Teklif durum dağılımı pasta grafiği onaylanan hazırlanan ve reddedilen tekliflerin yüzdelik analizini pasta grafiği olarak görselleştirir.
        * Kullanıcı performans karşılaştırması grafiği; kullanıcının verdiği toplam teklif sayısı, fiyatı, onay oranı ve ortalama teklif değeri grafiksel olarak hem hepsinin karşılaştırılması hem de toplu olarak inceleme fırsatı sunar.
        *Kullanıcıların teklif performansları grafiği
            / Verilen teklif toplam tutarı
            / Onaylanan tutar
            / bekleyen tutarı (henüz onaylanmamış siparişe geçmemiş teklifler)
        *Şirketin Aylık Teklif performansı grafiği;
            / Yıllık toplam 12 aylık Ay ay onaylanan teklif trendi
        * Hedef Takibi Grafiği
            / Kümülatif olarak yıllık 12 aylık hedef belirleme alanı bununla birlikte teklif norm çizgisi her ay ulaşılması gereken hedefi belirler ve siparişe geçen onaylanan tekliflerin yıllık hedefi ne kadar tutturulabildiği bu grafikten gözlemlenebilir.
        * Kullanıcı performansı tablosu;
            / Kullanıcılar, teklif sayıları onaylanan teklif sayısı, toplam gönderilen teklif tutarı, onaylanan değer, başarı oranı(toplam teklif sayısından yüzde kaçı onayladıysa)
    Bu tablo ve grafikler html to pdf seçeneği ile sayfa yapısını profesyonel bir rapor olarak gözlemlenebilecek şekilde yöneticiye otomatik olarak n8n ile otomatik raporlaması için gereken alt yapı hazırlanmaldır.
    Dashboard içinde kar zarar analizi sekmesi:
        * Onaylanan teklif sayısı toplam karlılık ortalama kar marjı gözlemlenebilmelidir.
        *Onaylanan tekliflerin maliyet analizleri burada incelenebilmelidir. Projelerde harcanan miktarlar databaseimde tutuluyor bu databasedeki projeleri seçebiliceğimiz bir alan olmalı ve maliyet analizi için eşleştirilebilmelidir. Ancak databasedeki maliyet verisi türk lirası cinsinden dolayısıyla ilgili teklif projesinin currencyci ile aynı hale getirilmelidir.
        *Veritabınındaki projeler ile proje teklifleri eşleştirildikten sonra kullanıcıların verdikleri marj ve başarı oranları analiz edilebilir olacaktır bu verileri de görselleştirebildiğimiz grafik ve tablolar ile destekleyelim.
        *Daha önce de belirtildiği gibi bu tablolar html to pdf mantığı ile n8n ile otomatik olarak yöneticiye yönlendirebileceğimiz altyapıyı tasarlayalım.
        *Müşterilerimizin bilgilerini firma adı iletişim kişisi eposta ülke gibi verilerini işleyebileceğimiz bir sekme daha yapalım ve bu sekmede de müşteri veritabanımıza işlediğimiz müşteri bilgilerini görebilelim
        *Proje tekliflerinde müşteri belirleyeceğimizden müşteri satış analizleri müşterilerin ülkeleri belirli olduğu için de ülke analizi gerçekleştirelim.
        * Harita üzerinde de ülke satış dağılımlarımızı


    

