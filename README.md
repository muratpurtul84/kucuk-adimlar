# Küçük Adımlar v1.1 — Güvenli Tam Yedek

Fotoğraf, kısa video, ses, söz, ilkler, albümler, konum, zaman kapsülü ve anı kitabı içeren çevrimdışı çocukluk günlüğü PWA'sı.

## v1.1 yedekleme özellikleri
- Tam ZIP: metin + fotoğraf + video + ses + albüm + ayarlar
- Hafif ZIP: video hariç tüm veriler
- Manifest ve SHA-256 medya doğrulaması
- Tamamen değiştir, birleştir veya yalnızca eksikleri ekle
- Tamamen değiştirmeden önce otomatik güvenlik yedeği
- Son yedek tarihi ve yeni kayıt sayısı uyarısı
- Android paylaşım menüsü üzerinden Drive'a gönderme desteği
- Eski v1.0 `backup.json` yedeklerini okuyabilme

## Çalıştırma
Klasörde terminal açın:
```bash
python3 -m http.server 8080
```
Tarayıcı: `http://localhost:8080`

Telefon kamerası, mikrofon, konum ve PWA kurulumu için GitHub Pages gibi HTTPS yayın kullanın. Günlük verileri GitHub'a yüklenmez; cihazın IndexedDB alanında kalır.
