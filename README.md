## v1.2.3
- PIN durumu okunmadan ana ekranın kısa süre görünmesi engellendi.
- PIN yoksa kilit ekranı kesin olarak gizlenir.
- Service Worker önbelleği v1.2.3 olarak yenilendi.

# Küçük Adımlar v1.2.1 — Çoklu Çocuk Profili

Bu sürümde birden fazla çocuk için ayrı profiller desteklenir.

- Her profil için ayrı zaman çizelgesi, takvim, sözler, ilkler ve albümler
- Üst menüden hızlı profil değiştirme
- Eski tek profil verilerini otomatik olarak ilk profile bağlama
- Tam ZIP yedeğinde bütün profilleri, kayıtları ve medyayı birlikte taşıma
- Profil silerken o profile ait kayıt ve medyayı birlikte temizleme

Çalıştırma: `python3 -m http.server 8080`
