# Snackabetic

## AI Service (Kısa Kurulum)

Bu servis yemek görselinden tahmini gram ve besin değerlerini döner.
V2 sürümünde porsiyon tahmini kategoriye gore (flat/volumetric/soup/drink/fruit) hesaplanir.

### 1) Ai klasörüne gir

```bash
cd Ai
```

### 2) Tek sefer kurulum

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3) Model dosyaları

`Ai/models` içinde en az şunlar olmalı:

- `best_model.pth`
- `class_mapping.json`

İstersen explicit set edebilirsin:

```bash
export MODELS_DIR="$PWD/models"
```

### 4) Servisi başlat

```bash
source .venv/bin/activate
export PORT=5001
python snackabetic_service.py
```

### 5) Kontrol ve örnek istek

```bash
curl http://localhost:${PORT:-5000}/health
```

```bash
curl -X POST "http://localhost:${PORT:-5000}/analyze" \
  -F "image=@/ABSOLUTE/PATH/to/food.jpg" \
  -F "plate_diameter_cm=26" \
  -F "camera_height_cm=30" \
  -F "top_k=5"
```

### Notlar

- `source .venv/bin/activate` hatası alırsan: önce `python3.12 -m venv .venv` çalıştır.
- `Port 5000 is in use` alırsan: `export PORT=5001` kullan.

## Tek Docker Compose ile Backend + AI + DB

Proje kökünden (`Snackabetic/`) aşağıdaki komut ile üç servisi aynı networkte ayağa kaldırabilirsin:

```bash
docker compose up --build
```

Servisler:

- Backend: `http://localhost:8080`
- AI: `http://localhost:5001`
- PostgreSQL: `localhost:5433`

Notlar:

- Backend container içinde AI servisi adı ile erişilir: `http://ai:5000`
- Backend container içinde DB servisi adı ile erişilir: `jdbc:postgresql://db:5432/snackabetic`
- Host AI portunu değiştirmek istersen: `AI_PORT=5010 docker compose up --build`
- Durdurmak için: `docker compose down`

**Fiziksel telefondan test edeceksen:** Docker'dan sonra mutlaka [Projeyi tekrar başlatma](#projeyi-tekrar-başlatma-fiziksel-telefon) bölümündeki IP adımlarını uygula.

## Projeyi tekrar başlatma (fiziksel telefon)

Projeyi uzun süre sonra veya farklı bir ağda açtığında **her seferinde** şu sırayı izle. En sık yapılan hata: Docker ve Expo doğru çalışır ama `config.js` içindeki **eski IP** kalır → register/login istekleri **timeout** yer.

### 1) Docker servislerini başlat

Proje kökünden:

```bash
docker compose up --build
```

Backend `http://localhost:8080` üzerinde ayakta olmalı.

### 2) Bilgisayarının güncel IP adresini bul

macOS/Linux:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Windows:

```bash
ipconfig
```

Çıktıdaki `inet` satırındaki adres senin IP'n (ör. `172.2.0.67`, `192.168.1.42`).  
`npm start` sonrası Expo terminalinde de görünür: `exp://172.2.0.67:8081` → IP burada `172.2.0.67`.

### 3) `config.js` içindeki IP'yi güncelle (zorunlu)

`Mobile/src/constants/config.js` dosyasını aç ve **her iki satırda da** yukarıdaki IP'yi kullan:

```javascript
export const API_BASE_URL = "http://SENIN_IP:8080";
export const AI_SERVICE_URL = "http://SENIN_IP:5001";
```

Örnek (`172.2.0.67` için):

```javascript
export const API_BASE_URL = "http://172.2.0.67:8080";
export const AI_SERVICE_URL = "http://172.2.0.67:5001";
```

> Fiziksel telefon `localhost` kullanamaz. IP değiştiğinde (Wi‑Fi değişimi, VPN, hotspot, bilgisayar yeniden başlatma) bu dosyayı mutlaka güncelle.

### 4) Backend'in yeni IP'den erişildiğini doğrula

Mac'te (IP'yi kendi adresinle değiştir):

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://172.2.0.67:8080/
```

`HTTP 403` veya benzeri bir kod = backend erişilebilir.  
`HTTP 000` veya timeout = IP yanlış veya Docker çalışmıyor.

### 5) Mobile'ı başlat ve telefondan bağlan

```bash
cd Mobile
npm start
```

- Telefon ve bilgisayar **aynı Wi‑Fi** ağında olsun
- QR kodu Expo Go ile tara
- `config.js` değiştiyse Expo'yu yeniden başlat (`Ctrl+C` → `npm start`)

Expo seçenekleri:

- `i` — iOS simülatörü
- `a` — Android emülatörü
- `w` — Web tarayıcısı
- QR — Fiziksel cihaz (Expo Go)

### Simülatör / emülatör kullanıyorsan

`config.js` içinde localhost yeterli:

```javascript
export const API_BASE_URL = "http://localhost:8080";
export const AI_SERVICE_URL = "http://localhost:5001";
```

## Mobile App (ilk kurulum)

İlk kez kuruyorsan önce bağımlılıkları yükle:

```bash
cd Mobile
npm install
npm start
```

Sonrasında fiziksel cihaz için yukarıdaki **Projeyi tekrar başlatma** adımlarını uygula.
