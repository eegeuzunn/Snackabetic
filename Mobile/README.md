# Snackabetic Mobile (MVP Plan)

Bu doküman, **bitirme projesi için yeterli ve sade** bir mobil kapsam verir.
Amaç: iOS/Android'de çalışan temel bir uygulama ile yemek analizi + diyabet günlüğü akışını tamamlamak.

## 1) MVP Hedefi (Karmaşıklaştırmadan)

- Kullanıcı yemek fotoğrafı çeker veya galeriden seçer.
- Görsel backend'e gönderilir, AI tahmini döner.
- Kullanıcı tahmini **onaylar/düzeltir** ve kaydeder.
- Günlükte şeker ölçümü / insülin / ilaç girişi yapılır.
- Dashboard’da günlük karbonhidrat ve temel trend gösterilir.

## 2) Fonksiyonel Gereksinimler (Mobil Özel)

1. **Kamera ve Görüntü İşleme**
   - Kamera açılmalı, fotoğraf çekilmeli.
   - Fotoğraf backend üzerinden AI servisine iletilmeli (EfficientNetV2 + Depth Anything).

2. **Anlık Tahmin ve Onay**
   - Dönen yemek sınıfı, tahmini gram/karbonhidrat kullanıcıya gösterilmeli.
   - Kullanıcı sonucu onaylayabilmeli veya yemek adını/gramı manuel düzeltebilmeli.

3. **Diyabet Günlüğü**
   - Kan şekeri değeri (mg/dL), insülin dozu (ünite), ilaç notu manuel girilebilmeli.
   - Kayıtlar tarih-saat ile listelenebilmeli.

4. **Kişiselleştirilmiş Dashboard (Basit)**
   - Günlük toplam karbonhidrat.
   - Hedef kalori/karbonhidrat ile karşılaştırma.
   - Son 7 gün kan şekeri mini trend grafiği.

5. **Türk Mutfağı Desteği**
   - Yemek adı düzeltme ekranında yerel yemek araması (ör. mantı, dolma, lahmacun).

## 3) Teknik Gereksinimler ve Mimari

- **Frontend**: React Native (tercihen Expo)
- **Backend Entegrasyonu**: Spring Boot REST API + JWT
- **AI Inference**: EfficientNetV2 (sınıflandırma) + Depth Anything (hacim kestirimi)
- **Paket Politikası (Expo-First)**: Mümkün olan her yerde önce Expo paketleri tercih edilir; Expo karşılığı yoksa React Native topluluk paketi kullanılır.
- **Örnek Expo öncelikleri**: `expo-secure-store`, `expo-camera`, `expo-image-picker`, `expo-file-system`, `expo-status-bar`.
- **Hesaplama**:

$$
Agirlik_{Tahmini}(g) = Hacim_{Tahmini}(ml) \times Yogunluk_{Veritabani}
$$

- **MVP Performans Hedefi**: Fotoğraf -> sonuç akışı idealde 5 saniye civarı

## 4) Gerekli Ekranlar (MVP)

Sadece bu 6 ekran yeterli:

1. **Giriş / Kayıt Ekranı**
   - E-posta + şifre ile login
   - JWT saklama (secure storage)

2. **Ana Sayfa (Dashboard)**
   - Bugünkü karbonhidrat toplamı
   - Son ölçümler özeti
   - “Yemek Tara” ve “Günlüğe Ekle” hızlı butonları

3. **Kamera / Görsel Seçim Ekranı**
   - Kamera aç
   - Galeriden seç
   - Fotoğraf önizleme ve gönder

4. **Tahmin Sonucu & Onay Ekranı**
   - Tahmin edilen yemek adı, gram, karbonhidrat
   - “Onayla” veya “Düzelt”
   - Düzeltmede yemek ara + gram düzenle

5. **Diyabet Günlüğü Ekleme Ekranı**
   - Kan şekeri, insülin, ilaç/not alanları
   - Kaydet

6. **Geçmiş / Kayıtlar Ekranı**
   - Yemek kayıtları + diyabet kayıtları liste
   - Tarihe göre sıralı görüntü

## 5) Navigasyon (Basit Akış)

- Alt sekme: `Dashboard` | `Kamera` | `Geçmiş`
- Ek modal/sayfa: `Tahmin Sonucu`, `Günlük Ekle`, `Giriş`

Önerilen akış:

`Giriş -> Dashboard -> Kamera -> Tahmin Sonucu(Onay/Düzelt) -> Dashboard`

## 6) MVP Dışı (Şimdilik Yapma)

- Push notification
- Sosyal özellikler
- Gelişmiş raporlama (PDF, detaylı analitik)
- Offline senkronizasyon
- Çok adımlı onboarding

## 7) Copilot/LLM Prompt Seti (Ekran Ekran)

Bu promptları sırayla kullanarak hızlı ilerleyebilirsiniz.

### Prompt 1 - Proje Kurulumu

"React Native Expo ile bir uygulama oluştur (TypeScript zorunlu değil; uygun görürsen JavaScript kullan).
`Dashboard`, `Camera`, `History` adında bottom tab navigation kur.
Auth için `LoginScreen` ekle.
Clean code prensiplerine uygun klasör yapısı kur (screens, components, services, hooks, navigation, constants).
Renkleri, spacing ve font boyutlarını tek bir theme dosyasından yönet (`src/theme/colors`, `src/theme/spacing`, `src/theme/typography`).
Paket seçiminde Expo-first yaklaşımı uygula: mümkün olan yerde Expo paketlerini tercih et, sadece zorunluysa React Native community paketine geç.
Basit ama okunaklı bir tema kullan: büyük butonlar, yüksek kontrast, minimum bileşen."

### Prompt 2 - Auth ve API Client

"Axios tabanlı bir API client yaz.
JWT login endpointine istek at, tokenı secure storage'da sakla.
Token saklamada `expo-secure-store` kullan.
Tokenı tüm isteklerde Authorization Bearer olarak otomatik ekle.
401 durumunda kullanıcıyı login ekranına yönlendir."

### Prompt 3 - Kamera Ekranı

"`expo-camera` ve `expo-image-picker` kullanarak `CameraScreen` oluştur.
Kullanıcı kameradan çekebilsin veya galeriden seçebilsin.
Seçilen görseli önizle ve `Analiz Et` butonuyla backend'e multipart/form-data gönder.
Yükleniyor ve hata durumlarını göster."

### Prompt 4 - Tahmin Sonucu ve Düzeltme

"`PredictionResultScreen` oluştur.
API'den gelen yemek adı, tahmini gram, karbonhidrat bilgisini göster.
`Onayla` butonu ile kaydet.
`Düzelt` seçeneğinde yemek adı arama (Türk yemekleri listesi) ve gram manuel düzenleme alanı aç.
Onaydan sonra Dashboard'a dön."

### Prompt 5 - Diyabet Günlüğü

"`DiabetesLogScreen` oluştur.
Alanlar: kan şekeri (mg/dL), insülin (ünite), ilaç/not, tarih-saat.
Form validasyonu ekle (boş ve negatif değer engeli).
Kaydetme sonrası kullanıcıya başarı mesajı göster."

### Prompt 6 - Dashboard

"`DashboardScreen` oluştur.
Bugünkü toplam karbonhidratı kartta göster.
Son 7 gün kan şekeri trendini basit çizgi grafikle göster.
`Yemek Tara` ve `Günlüğe Ekle` kısa yol butonları ekle."

### Prompt 7 - Geçmiş Listesi

"`HistoryScreen` oluştur.
Yemek kayıtları ve diyabet kayıtlarını tarih-saat sırasıyla listele.
Liste elemanında temel alanlar görünsün (yemek adı/karbonhidrat veya şeker/insülin).
Boş durum ekranı ekle."

## 8) Sprint Planı (Kısa)

- **Gün 1-2**: Kurulum + Auth + Navigasyon
- **Gün 3-4**: Kamera + AI analiz entegrasyonu
- **Gün 5**: Tahmin onay/düzeltme
- **Gün 6**: Diyabet günlüğü + geçmiş
- **Gün 7**: Dashboard + son testler + demo hazırlığı

## 9) Minimum API İhtiyaçları (Mobilin Beklediği)

- `POST /auth/login`
- `POST /analyze` (multipart image)
- `POST /meals` (onaylanan/düzeltilen sonuç kaydı)
- `POST /glucose-logs`
- `GET /dashboard/summary?date=YYYY-MM-DD`
- `GET /history`

Bu endpoint isimleri farklıysa mobilde tek bir `api.ts` dosyasından uyarlayın.
