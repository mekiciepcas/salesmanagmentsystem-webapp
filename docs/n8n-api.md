# n8n HTTP sözleşmesi (EPC Pricing API)

Temel URL: `http://<host>:<PORT>/api` (varsayılan port `3110`).

## Kimlik doğrulama

Kimlik korumalı uçlar için:

- Header: `X-N8N-Key: <N8N_API_KEY>`  
  veya query: `?apiKey=<N8N_API_KEY>`

`.env` içinde `N8N_API_KEY` tanımlı olmalıdır; tanımsızsa uçlar `503` döner.

## Uçlar

### `GET /api/n8n/quotes-summary`

JSON özet (zaman aralığı).

| Query | Açıklama |
|--------|----------|
| `from` | ISO tarih/saat (varsayılan: şimdi − 7 gün) |
| `to` | ISO tarih/saat (varsayılan: şimdi) |

**Yanıt:** `{ success, from, to, count, rows }` — `rows` en fazla 5000 kayıt.

### `GET /api/n8n/export-weekly.xlsx`

Haftalık teklif Excel dosyası (tüm kullanıcılar). Sütunlar: Teklif No, Tarih, Müşteri, Teklif Detayı, Hazırlayan, Durum, Sipariş / Not.

| Query | Açıklama |
|--------|----------|
| `weekStart` | Opsiyonel; verilen tarihin içinde bulunduğu ISO haftanın Pazartesi’si hesaplanır |

**Yanıt:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (dosya indirme).

## Kullanıcı uçları (JWT)

Tarayıcı / mobil istemci için Bearer token gerekir:

- `GET /api/user/quotes-weekly` — giriş yapan kullanıcının haftalık Excel’i  
- `GET /api/user/quotes` — teklif listesi  

## Idempotency

GET uçları yan etkisizdir; aynı parametrelerle tekrar çağrılabilir. Excel üretimi her çağrıda yeniden oluşturulur.
