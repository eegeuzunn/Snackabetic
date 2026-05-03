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

## Mobile App Başlatma

### 1) Mobile klasörüne gir

```bash
cd Mobile
```

### 2) Bağımlılıkları yükle

```bash
npm install
```

### 3) Uygulamayı başlat

**Expo ile:**

```bash
npm start
```

Ardından terminalde gösterilen seçeneklerden birini seç:

- `i` - iOS simülatörü ile aç
- `a` - Android emülatörü ile aç
- `w` - Web tarayıcısı ile aç
- `j` - Expo Go uygulaması ile cihazdan QR kod tarayarak aç

### 4) Backend yapılandırması

#### Simulator/Emülatör için (varsayılan)

Backend localhost'ta çalışıyorsa sorun yoktur.

#### Fiziksel cihazda çalıştırma için

**Önemli:** Fiziksel cihaz localhost erişemez. Backend sunucunuzun IP adresini kullanmalısınız.

**Adım 1:** Bilgisayarınızın ağdaki IP adresini bulun

macOS/Linux:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Windows:

```bash
ipconfig
```

Genellikle `192.168.x.x` veya `10.0.x.x` formatında olur.

**Adım 2:** `Mobile/src/constants/config.js` dosyasını düzenle

```javascript
export const API_BASE_URL = "http://YOUR_IP:8080";
export const AI_SERVICE_URL = "http://YOUR_IP:5001";
```

Örnek:

```javascript
export const API_BASE_URL = "http://192.168.1.42:8080";
export const AI_SERVICE_URL = "http://192.168.1.42:5001";
```

**Adım 3:** Backend ve AI servisinin fiziksel cihazdan erişilebilir olduğundan emin ol

```bash
# Cihazın terminal'inde test et
ping 192.168.1.42
```

**Adım 4:** Uygulamayı yeniden başlat

```bash
npm start
```

**Not:** IP adresleri değişirse (ağı değiştirdin, bilgisayar yeniden başladı), `config.js`'i güncelle ve uygulamayı yeniden başlat.
