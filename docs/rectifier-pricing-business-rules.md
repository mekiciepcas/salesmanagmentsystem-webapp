# Rectifier fiyatlandırma — iş kuralları (özet)

Bu dosya, rectifier BOM / maliyet seçim mantığının **insan okunur** özetidir. Kurallar kodla birlikte güncellenmelidir.

## Şablon (yeni kural eklerken)

| Alan | Açıklama |
|------|-----------|
| **ID** | `R-00x` (benzersiz) |
| **Koşul** | Ne zaman geçerli? (topoloji, gerilim, vb.) |
| **Uygulama** | Ne yapılır? |
| **Kod** | İlgili fonksiyon / dosya |
| **Veri önkoşulu** | Excel veya API beklentisi |

---

## R-001 — B2H giriş kesicisi tipi (MCCB)

| Alan | İçerik |
|------|--------|
| **Koşul** | Topoloji **B2H** (tek faz yarım köprü). |
| **Uygulama** | **Giriş kesicisi** seçiminde kesici tipi **MCCB** olarak aranır; kullanıcı arayüzündeki genel `breakerType` seçimi **çıkış** ve **batarya** kesicileri için kullanılmaya devam eder. |
| **Kod** | `RectifierPricing.getEffectiveInputBreakerType`, `selectComponents` içinde giriş `selectBreaker` çağrısı — [`src/scripts/rectifier-pricing.js`](../src/scripts/rectifier-pricing.js). |
| **Veri önkoşulu** | `Rectifier.xlsx` → `CircuitBreakers` sayfasında, ilgili kutup sayısı ve akım için `Type` alanında **MCCB** (veya metin içinde açık `MCCB` geçen satırlar; yanlışlıkla MCB eşleşmesi engellenir). |

---

## Notlar

- Yeni kuralları bu dosyaya ekleyin ve kodda kısa bir yorumla `docs/rectifier-pricing-business-rules.md` referansını verin.
