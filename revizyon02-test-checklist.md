# Revizyon02 Test Checklist

## E2E Senaryo

- [ ] Login ol, `anasayfa.html` ekranina gel.
- [ ] Yeni teklifte `Musteri` arama kutusunda metin yaz; liste filtrelensin.
- [ ] Arama sonucu yokken `Yeni Musteri Ekle` butonu gorunsun.
- [ ] Butona basinca `dashboard.html#customers` acilsin.
- [ ] Musteri sec, kalem ekle, `Maliyetlendirmeye Basla` ile `project-costing.html` akisi baslasin.
- [ ] Kalemleri tamamla, teklifi hazirla, proje durumu tamamlandiginda gecmiste gorunsun.
- [ ] Gecmisten `Revize` butonuna bas; prompt cikmadan revize akisi baslayip maliyetlendirme ekranina gitsin.

## Negatif Senaryolar

- [ ] Musteri API hatasi alindiginda arayuz kirilmadan `Yeni Musteri Ekle` butonu gosterilsin.
- [ ] Yetkisiz token ile `quote-projects/my` ve `quote-documents` cagrilarinda beklenen hata donsun.
- [ ] `quote-documents` kaydi `auto://` ile yapilmaya calisildiginda `400` donsun.
- [ ] Bos kuyrukta `project-costing.html` bos durum gostersin.

## Kabul Kriterleri

- [ ] `Teklif Gecmisim` tablosunda `Musteri` kolonu `customer_name` ile dolu.
- [ ] `Hazirlayan` kolonu API kaynakli `prepared_by_fullname` ile dolu.
- [ ] `COMPLETED` proje revize edilince durum `REVIZE` olarak kalir.
- [ ] `Dokuman` aksiyonunda kayit yoksa paket olusturma onayi gelir.
- [ ] Dokuman listesinde `file_exists` durumuna gore `hazir / olusturulmamis` bilgisi gorunur.
