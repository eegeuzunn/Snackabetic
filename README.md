# Snackabetic

## AI Service (Kısa Kurulum)

Bu servis yemek görselinden tahmini gram ve besin değerlerini döner.

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
