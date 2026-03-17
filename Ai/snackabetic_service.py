"""
Snackabetic - Birleşik AI Servisi
===================================
Tek endpoint'e resim gönder → yemek adı + gram + kalori + karbonhidrat döner.

Akış:
  1. EfficientNet-B3  → yemeği tanır  ("lahmacun", %87)
  2. Depth Anything V2 → derinlik haritası → hacim → gram
  3. Veritabanı        → kalori + karbonhidrat hesaplar

Kurulum:
  pip install flask torch torchvision transformers pillow numpy scipy

Çalıştırma:
  python snackabetic_service.py

    Gerekli dosyalar (varsayılan olarak Ai/models/ klasöründe olmalı):
    - best_model.pth       (EfficientNet ağırlıkları)
    - class_mapping.json   (idx → sınıf ismi eşleşmesi)
"""

import os, io, json, logging, time
import numpy as np
from pathlib import Path
from flask import Flask, request, jsonify
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms
from torchvision import models
from scipy import ndimage

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ─── DOSYA YOLLARI ────────────────────────────────────────────────────────────
# MODELS_DIR env varsa onu kullanır, yoksa bu dosyanın yanındaki models/ klasörünü kullanır
DEFAULT_MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR     = Path(os.environ.get("MODELS_DIR", str(DEFAULT_MODELS_DIR))).expanduser().resolve()
MODEL_PATH     = MODELS_DIR / "best_model.pth"
MAPPING_PATH   = MODELS_DIR / "class_mapping.json"

# ─── KALORİ & KARBONHİDRAT VERİTABANI (100g başına) ─────────────────────────
# format: "yemek_adi": (kalori, karbonhidrat_g, protein_g, yag_g, yogunluk_g_per_ml)
NUTRITION_DB = {
    # ── Global ───────────────────────────────────────────────────────────────
    "pizza":                  (266, 33.0, 11.0,  9.8, 1.05),
    "hamburger":              (295, 24.0, 17.0, 14.0, 1.10),
    "hot_dog":                (290, 22.0, 11.0, 18.0, 1.05),
    "french_fries":           (312, 41.0,  3.4, 15.0, 0.55),
    "chicken_wings":          (203,  0.0, 19.0, 14.0, 0.90),
    "onion_rings":            (411, 46.0,  5.0, 24.0, 0.60),
    "tacos":                  (226, 21.0, 12.0, 10.0, 1.00),
    "spaghetti_bolognese":    (163, 18.0,  9.0,  5.5, 1.10),
    "spaghetti_carbonara":    (184, 22.0,  8.0,  7.0, 1.05),
    "lasagna":                (135, 13.0,  8.0,  5.0, 1.15),
    "tiramisu":               (240, 28.0,  4.0, 12.0, 0.90),
    "pancakes":               (227, 35.0,  6.0,  7.0, 0.75),
    "waffles":                (291, 42.0,  6.5,  9.5, 0.70),
    "french_toast":           (229, 27.0,  8.0,  8.0, 0.85),
    "omelette":               (154,  1.0, 11.0, 12.0, 1.00),
    "donuts":                 (452, 51.0,  5.0, 25.0, 0.50),
    "cheesecake":             (321, 26.0,  6.0, 22.0, 1.20),
    "chocolate_cake":         (371, 55.0,  5.0, 15.0, 0.85),
    "ice_cream":              (207, 24.0,  3.5, 11.0, 0.60),
    "frozen_yogurt":          (159, 27.0,  4.0,  4.0, 0.75),
    "apple_pie":              (265, 40.0,  2.5, 11.0, 1.00),
    "steak":                  (271,  0.0, 26.0, 18.0, 1.05),
    "grilled_salmon":         (208,  0.0, 20.0, 13.0, 1.00),
    "sushi":                  (143, 18.5,  8.0,  3.5, 1.10),
    "caesar_salad":           (100,  7.0,  4.5,  6.5, 0.45),
    "greek_salad":            ( 90,  8.0,  3.0,  5.5, 0.50),
    "hummus":                 (166, 14.0,  8.0,  9.5, 1.10),
    "falafel":                (333, 32.0, 13.0, 18.0, 0.75),
    "club_sandwich":          (282, 28.0, 16.0, 11.0, 1.05),
    "grilled_cheese_sandwich":(378, 32.0, 14.0, 21.0, 1.00),
    "churros":                (375, 48.0,  4.5, 19.0, 0.70),
    # ── Türk Yemekleri ───────────────────────────────────────────────────────
    "lahmacun":               (274, 32.0, 14.0,  9.0, 0.80),
    "doner":                  (270, 15.0, 22.0, 14.0, 1.05),
    "iskender":               (250, 18.0, 18.0, 12.0, 1.10),
    "adana-kebap":            (258,  2.0, 24.0, 17.0, 1.00),
    "tas-kebabi":             (180, 10.0, 18.0,  8.0, 1.10),
    "patlican-kebabi":        (150,  8.0, 12.0,  8.0, 0.90),
    "manti":                  (180, 25.0,  9.0,  5.0, 1.15),
    "karniyarik":             (140, 10.0,  8.0,  8.0, 1.05),
    "hunkar-begendi":         (175, 12.0,  9.0,  9.0, 1.00),
    "menemen":                (120,  6.0,  7.0,  8.0, 1.05),
    "tantuni":                (220, 18.0, 16.0,  9.0, 0.95),
    "cig-kofte":              ( 75, 14.0,  3.0,  1.5, 1.10),
    "kokorec":                (290,  5.0, 20.0, 22.0, 0.95),
    "icli-kofte":             (170, 18.0,  9.0,  7.0, 1.10),
    "mercimek-koftesi":       ( 95, 16.0,  5.0,  2.0, 1.00),
    "anne-koftesi":           (225,  8.0, 20.0, 14.0, 1.00),
    "kiymali-borek":          (280, 22.0, 12.0, 16.0, 0.90),
    "peynirli-borek":         (260, 24.0, 10.0, 14.0, 0.85),
    "su-boregi":              (245, 26.0,  9.0, 12.0, 1.00),
    "kiymali-pide":           (260, 28.0, 13.0, 10.0, 0.85),
    "yaprak-sarma":           (175, 20.0,  6.0,  8.0, 1.15),
    "biber-dolma":            (130, 16.0,  5.0,  5.0, 1.05),
    "midye-dolma":            (110, 14.0,  5.0,  3.0, 1.15),
    "beyaz-lahana-sarmasi":   (105, 12.0,  5.0,  4.0, 1.10),
    "mercimek-corbasi":       ( 65,  9.0,  4.0,  1.5, 1.05),
    "domates-corbasi":        ( 55,  8.0,  1.5,  2.0, 1.02),
    "tarhana-corbasi":        ( 60,  9.0,  2.5,  1.5, 1.05),
    "yayla-corbasi":          ( 70,  8.0,  4.0,  2.5, 1.03),
    "sehriye-corbasi":        ( 55,  9.0,  1.5,  1.5, 1.02),
    "zeytinyagli-fasulye":    ( 95, 10.0,  4.0,  4.5, 1.00),
    "sulu-kuru-fasulye-yemegi":(110, 15.0,  6.5,  3.0, 1.05),
    "sulu-barbunya-yemegi":   (100, 13.0,  5.5,  3.0, 1.03),
    "sulu-bezelye-yemegi":    ( 85, 12.0,  4.5,  2.0, 1.02),
    "sulu-nohut-yemegi":      (120, 16.0,  6.0,  3.5, 1.05),
    "sulu-bamya-yemegi":      ( 65,  7.0,  2.5,  3.0, 1.02),
    "ispanak-yemegi":         ( 75,  6.0,  4.0,  4.0, 1.03),
    "kabak-mucver":           (165, 14.0,  6.0,  9.0, 0.95),
    "pilav":                  (130, 28.0,  2.5,  1.5, 0.85),
    "bulgur-pilavi":          (115, 24.0,  3.5,  1.5, 0.80),
    "salcali-makarna":        (148, 26.0,  5.0,  3.0, 1.05),
    "coban-salatasi":         ( 40,  5.0,  1.5,  2.0, 0.55),
    "kisir":                  ( 95, 16.0,  3.0,  2.5, 0.90),
    "cacik":                  ( 45,  4.0,  3.0,  2.0, 1.03),
    "tursu":                  ( 20,  3.5,  1.0,  0.2, 1.00),
    "baklava":                (426, 48.0,  5.0, 24.0, 1.20),
    "kazandibi":              (195, 32.0,  5.0,  5.0, 1.10),
    "sutlac":                 (130, 22.0,  4.5,  3.5, 1.05),
    "tulumba-tatlisi":        (350, 42.0,  3.5, 18.0, 1.00),
    "kalburabasti":           (320, 40.0,  4.0, 16.0, 0.95),
    "kemal-pasa-tatlisi":     (290, 38.0,  5.5, 12.0, 1.00),
    "lokma":                  (345, 44.0,  4.0, 16.0, 0.75),
    "dondurma":               (218, 28.0,  3.5, 10.0, 0.65),
    "ayran":                  ( 36,  4.0,  3.0,  1.5, 1.03),
    "turk-kahvesi":           ( 20,  3.0,  0.5,  0.5, 1.00),
    "cay":                    (  2,  0.3,  0.0,  0.0, 1.00),
    "sahlep":                 ( 95, 19.0,  3.0,  1.0, 1.02),
    "omlet":                  (154,  1.0, 11.0, 12.0, 1.00),
    "sucuklu-yumurta":        (220,  2.0, 14.0, 17.0, 1.05),
    "haslanmis-yumurta":      (155,  1.1, 13.0, 11.0, 1.03),
    "yogurt":                 ( 59,  3.6,  3.5,  3.3, 1.05),
    "hamsi-tava":             (196,  5.0, 18.0, 11.0, 1.00),
    "levrek":                 (124,  0.0, 19.0,  5.5, 1.00),
    "cipura":                 (128,  0.0, 20.0,  5.5, 1.00),
    "patates-puresi":         (113, 17.0,  2.0,  4.0, 1.05),
    "patates-kizartmasi":     (312, 41.0,  3.4, 15.0, 0.55),
    "patates-salatasi":       (143, 16.0,  3.0,  7.0, 1.00),
    "yogurtlu-makarna":       (135, 20.0,  6.0,  3.5, 1.03),
    "et-sote":                (200,  5.0, 20.0, 11.0, 1.00),
    "tavuk-sote":             (165,  4.0, 20.0,  8.0, 0.98),
    "midye-tava":             (185, 14.0, 12.0,  8.0, 1.00),
    "canak-enginar":          ( 55,  8.0,  2.5,  1.5, 0.90),
    # Meyveler
    "portakal": (47,11.0,0.9,0.1,0.90), "elma":  (52,14.0,0.3,0.2,0.80),
    "armut":    (57,15.0,0.4,0.1,0.85), "muz":   (89,23.0,1.1,0.3,0.95),
    "uzum":     (67,17.0,0.6,0.4,0.90), "cilek": (32, 8.0,0.7,0.3,0.75),
    "kiraz":    (50,12.0,1.0,0.3,0.90), "erik":  (46,11.0,0.7,0.3,0.85),
    "seftali":  (39, 9.8,0.9,0.3,0.85), "kayisi":(48,11.0,1.4,0.4,0.85),
    "incir":    (74,19.0,0.8,0.3,0.90), "kavun": (34, 8.0,0.8,0.2,0.85),
    "karpuz":   (30, 7.5,0.6,0.2,0.90), "nar":   (83,19.0,1.7,1.2,1.00),
    "kivi":     (61,15.0,1.1,0.5,0.90), "mango": (60,15.0,0.8,0.4,0.90),
    "avokado":  (160, 9.0,2.0,15.0,0.85),
}
DEFAULT_NUTRITION = (200, 20.0, 10.0, 8.0, 0.90)  # bilinmeyen yemek


# ─── 1. EFFICİENTNET MODELİ ───────────────────────────────────────────────────
class FoodClassifier:
    """
    Eğitilmiş EfficientNet-B3 modelini yükler ve inference yapar.
    Notebook'taki aynı mimari — best_model.pth + class_mapping.json gerekir.
    """
    def __init__(self):
        self.model     = None
        self.idx_to_class = {}
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.CenterCrop((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
        self.device = (
            torch.device("mps")  if torch.backends.mps.is_available() else
            torch.device("cuda") if torch.cuda.is_available() else
            torch.device("cpu")
        )
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            logger.error(f"❌ Model bulunamadı: {MODEL_PATH}")
            return
        if not MAPPING_PATH.exists():
            logger.error(f"❌ Class mapping bulunamadı: {MAPPING_PATH}")
            return

        # class_mapping.json yükle
        with open(MAPPING_PATH, "r", encoding="utf-8") as f:
            mapping = json.load(f)
        # idx_to_class'ın key'leri string olabilir, int'e çeviriyoruz
        self.idx_to_class = {
            int(k): v for k, v in mapping["idx_to_class"].items()
        }
        num_classes = len(self.idx_to_class)

        # Notebook'takiyle aynı mimari
        net = models.efficientnet_b3(weights=None)
        in_features = net.classifier[1].in_features
        net.classifier = nn.Sequential(
            nn.Dropout(p=0.4, inplace=True),
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(512, num_classes),
        )

        checkpoint = torch.load(MODEL_PATH, map_location=self.device)
        net.load_state_dict(checkpoint["model_state_dict"])
        net.to(self.device).eval()
        self.model = net

        logger.info(f"✅ EfficientNet-B3 yüklendi — {num_classes} sınıf, device: {self.device}")

    def predict(self, pil_image: Image.Image, top_k: int = 5):
        """
        Returns: [(food_name, confidence), ...]  en yüksek olasılıklı top_k sonuç
        """
        if self.model is None:
            raise RuntimeError("Model yüklenemedi!")

        img_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            output = self.model(img_tensor)
            probs  = torch.softmax(output, dim=1)[0]
            top_probs, top_indices = probs.topk(top_k)

        return [
            (self.idx_to_class[idx.item()], float(prob))
            for prob, idx in zip(top_probs, top_indices)
        ]


# ─── 2. DEPTH ESTIMATION MODELİ ───────────────────────────────────────────────
class DepthEstimator:
    """Depth Anything V2 (Small) — HuggingFace üzerinden."""
    def __init__(self):
        self.pipe   = None
        self.midas  = None
        self.mode   = None
        self._load()

    def _load(self):
        try:
            from transformers import pipeline as hf_pipeline
            self.pipe = hf_pipeline(
                task="depth-estimation",
                model="depth-anything/Depth-Anything-V2-Small-hf",
                device=-1,  # CPU (MPS transformers desteği sınırlı)
            )
            self.mode = "depth_anything"
            logger.info("✅ Depth Anything V2 (Small) yüklendi")
        except Exception as e:
            logger.warning(f"Depth Anything yüklenemedi ({e}), MiDaS deneniyor...")
            try:
                self.midas = torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
                self.midas.eval()
                midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
                self.transform = midas_transforms.small_transform
                self.mode = "midas"
                logger.info("✅ MiDaS Small yüklendi (fallback)")
            except Exception as e2:
                logger.error(f"Hiçbir depth modeli yüklenemedi: {e2}")

    def predict(self, pil_image: Image.Image) -> np.ndarray:
        """Normalize derinlik haritası döner — shape [H,W], 0=uzak 1=yakın."""
        if self.mode == "depth_anything":
            result = self.pipe(pil_image)
            depth  = np.array(result["depth"], dtype=np.float32)
        elif self.mode == "midas":
            import cv2
            img = np.array(pil_image.convert("RGB"))
            inp = self.transform(img)
            with torch.no_grad():
                pred = self.midas(inp)
                pred = F.interpolate(
                    pred.unsqueeze(1), size=img.shape[:2],
                    mode="bicubic", align_corners=False
                ).squeeze()
            depth = pred.numpy().astype(np.float32)
        else:
            # Depth modeli yoksa düz bir harita döndür (en kötü durum)
            w, h  = pil_image.size
            depth = np.ones((h, w), dtype=np.float32) * 0.5

        d_min, d_max = depth.min(), depth.max()
        if d_max > d_min:
            depth = (depth - d_min) / (d_max - d_min)
        return depth


# ─── 3. PORSIYON HESAPLAMA ────────────────────────────────────────────────────
def estimate_weight(
    depth_map: np.ndarray,
    pil_image: Image.Image,
    density: float,
    camera_height_cm: float = 30.0,
    plate_diameter_cm: float = None,
) -> tuple[float, float, float]:
    """
    Derinlik haritası → hacim (ml) → gram.
    Returns: (volume_ml, weight_g, food_pixel_ratio)
    """
    import cv2

    h, w = depth_map.shape

    # — Yemek maskesi (HSV segmentasyon) —
    img_arr = np.array(pil_image.convert("RGB"))
    img_hsv = cv2.cvtColor(img_arr, cv2.COLOR_RGB2HSV)
    sat, bri = img_hsv[:, :, 1], img_hsv[:, :, 2]
    mask = (sat > 25) & (bri > 30) & (bri < 240)
    mask = ndimage.binary_erosion(mask, iterations=2)
    mask = ndimage.binary_dilation(mask, iterations=4)

    # En büyük / merkeze yakın bileşeni seç
    labeled, n = ndimage.label(mask)
    if n == 0:
        mask = np.ones((h, w), dtype=bool)
    else:
        cy, cx      = h // 2, w // 2
        center_lbl  = labeled[cy, cx]
        if center_lbl == 0:
            sizes      = ndimage.sum(mask, labeled, range(1, n + 1))
            center_lbl = int(np.argmax(sizes)) + 1
        mask = labeled == center_lbl

    food_pixel_ratio = float(mask.sum()) / mask.size

    # — Ölçek kalibrasyonu —
    if plate_diameter_cm:
        px_per_cm = (w * 0.75) / plate_diameter_cm
        cm_per_px = 1.0 / px_per_cm
    else:
        fov_rad        = np.radians(69.0)
        scene_width_cm = 2 * camera_height_cm * np.tan(fov_rad / 2)
        cm_per_px      = scene_width_cm / w

    pixel_area_cm2 = cm_per_px ** 2

    # — Kalınlık (derinlik farkı) —
    depth_range_cm = camera_height_cm * 0.30
    depth_cm       = depth_map * depth_range_cm
    masked_depth   = depth_cm * mask
    ref_depth      = np.percentile(masked_depth[mask], 5) if mask.sum() > 0 else 0
    thickness_cm   = np.maximum(masked_depth - ref_depth, 0) * mask

    # — Hacim ve ağırlık —
    volume_ml = float(np.clip((thickness_cm * pixel_area_cm2).sum(), 1.0, 2000.0))
    weight_g  = round(volume_ml * density)

    return volume_ml, weight_g, food_pixel_ratio


# ─── MODEL BAŞLATMA ───────────────────────────────────────────────────────────
logger.info("Modeller yükleniyor...")
food_classifier  = FoodClassifier()
depth_estimator  = DepthEstimator()
logger.info("🚀 Servis hazır!")


# ─── API ENDPOINT'LERİ ────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":           "ok",
        "efficientnet":     food_classifier.model is not None,
        "depth_model":      depth_estimator.mode,
        "num_classes":      len(food_classifier.idx_to_class),
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Ana endpoint — Spring Boot ve React Native buraya gönderir.

    Request (multipart/form-data):
        image             : yemek fotoğrafı (JPG/PNG)
        plate_diameter_cm : float, opsiyonel (örn: "26")
        camera_height_cm  : float, opsiyonel, default 30
        top_k             : int,   opsiyonel, default 5

    Response (JSON):
        {
            "top_prediction": {
                "food_name":    "lahmacun",
                "confidence":   0.87,
                "weight_g":     196,
                "volume_ml":    245.0,
                "calories":     537,
                "carbs_g":      62.7,
                "protein_g":    27.4,
                "fat_g":        17.6
            },
            "top5": [ ... ],
            "confidence_level": "high",
            "depth_model":      "depth_anything",
            "plate_calibrated": true,
            "processing_ms":    420
        }
    """
    t_start = time.time()

    if "image" not in request.files:
        return jsonify({"error": "image alanı eksik"}), 400

    try:
        # ── Parametreler ──────────────────────────────────────────────────────
        plate_diam = request.form.get("plate_diameter_cm")
        plate_diam = float(plate_diam) if plate_diam else None
        cam_height = float(request.form.get("camera_height_cm", 30.0))
        top_k      = int(request.form.get("top_k", 5))

        # ── Görüntü yükle ─────────────────────────────────────────────────────
        raw      = request.files["image"].read()
        pil_img  = Image.open(io.BytesIO(raw)).convert("RGB")

        # Performans için boyutu sınırla
        max_dim = 518
        w, h    = pil_img.size
        if max(w, h) > max_dim:
            ratio   = max_dim / max(w, h)
            pil_img = pil_img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

        # ── 1. Yemek tanıma (EfficientNet-B3) ────────────────────────────────
        predictions = food_classifier.predict(pil_img, top_k=top_k)
        top_food, top_conf = predictions[0]

        # ── 2. Derinlik → hacim → gram ────────────────────────────────────────
        depth_map              = depth_estimator.predict(pil_img)
        nutrition              = NUTRITION_DB.get(top_food, DEFAULT_NUTRITION)
        cal100, carb100, prot100, fat100, density = nutrition

        volume_ml, weight_g, fill_ratio = estimate_weight(
            depth_map, pil_img, density, cam_height, plate_diam
        )

        # ── 3. Besin değerleri (Denklem 3.2) ──────────────────────────────────
        factor   = weight_g / 100.0
        calories = round(cal100  * factor)
        carbs_g  = round(carb100 * factor, 1)
        prot_g   = round(prot100 * factor, 1)
        fat_g    = round(fat100  * factor, 1)

        # ── 4. Güven seviyesi ─────────────────────────────────────────────────
        if top_conf > 0.75 and plate_diam and fill_ratio > 0.3:
            confidence_level = "high"
        elif top_conf > 0.50 and fill_ratio > 0.2:
            confidence_level = "medium"
        else:
            confidence_level = "low"

        # ── 5. Top-5 listesi ──────────────────────────────────────────────────
        top5 = []
        for food, conf in predictions:
            n       = NUTRITION_DB.get(food, DEFAULT_NUTRITION)
            cal_est = round(n[0] * weight_g / 100)
            top5.append({
                "food_name":  food,
                "confidence": round(conf, 4),
                "calories_estimated": cal_est,
            })

        processing_ms = int((time.time() - t_start) * 1000)
        logger.info(
            f"{top_food} | conf={top_conf:.2f} | "
            f"{weight_g}g | {calories}kcal | {processing_ms}ms"
        )

        return jsonify({
            "top_prediction": {
                "food_name":  top_food,
                "confidence": round(top_conf, 4),
                "weight_g":   weight_g,
                "volume_ml":  round(volume_ml, 1),
                "calories":   calories,
                "carbs_g":    carbs_g,
                "protein_g":  prot_g,
                "fat_g":      fat_g,
            },
            "top5":             top5,
            "confidence_level": confidence_level,
            "depth_model":      depth_estimator.mode,
            "plate_calibrated": plate_diam is not None,
            "food_fill_ratio":  round(fill_ratio, 3),
            "processing_ms":    processing_ms,
        })

    except Exception as e:
        logger.error(f"Hata: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/analyze-base64", methods=["POST"])
def analyze_base64():
    """
    Base64 görsel için alternatif endpoint.
    React Native'den base64 göndermek daha kolay olduğunda kullanılır.

    Request (JSON):
        {
            "image_base64":     "...",
            "plate_diameter_cm": 26,   (opsiyonel)
            "camera_height_cm":  30    (opsiyonel)
        }
    """
    import base64

    data = request.get_json()
    if not data or "image_base64" not in data:
        return jsonify({"error": "image_base64 alanı eksik"}), 400

    # Base64'ü files gibi işle ve ana endpoint'i çağır
    img_bytes = base64.b64decode(data["image_base64"])

    # request.files mock yerine doğrudan işle
    pil_img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    max_dim   = 518
    w, h      = pil_img.size
    if max(w, h) > max_dim:
        ratio   = max_dim / max(w, h)
        pil_img = pil_img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    plate_diam  = data.get("plate_diameter_cm")
    cam_height  = float(data.get("camera_height_cm", 30.0))
    top_k       = int(data.get("top_k", 5))

    try:
        predictions = food_classifier.predict(pil_img, top_k=top_k)
        top_food, top_conf = predictions[0]

        depth_map              = depth_estimator.predict(pil_img)
        nutrition              = NUTRITION_DB.get(top_food, DEFAULT_NUTRITION)
        cal100, carb100, prot100, fat100, density = nutrition
        volume_ml, weight_g, fill_ratio = estimate_weight(
            depth_map, pil_img, density, cam_height, plate_diam
        )

        factor   = weight_g / 100.0
        calories = round(cal100  * factor)
        carbs_g  = round(carb100 * factor, 1)
        prot_g   = round(prot100 * factor, 1)
        fat_g    = round(fat100  * factor, 1)

        if top_conf > 0.75 and plate_diam and fill_ratio > 0.3:
            confidence_level = "high"
        elif top_conf > 0.50 and fill_ratio > 0.2:
            confidence_level = "medium"
        else:
            confidence_level = "low"

        top5 = [{"food_name": f, "confidence": round(c, 4),
                  "calories_estimated": round(NUTRITION_DB.get(f, DEFAULT_NUTRITION)[0] * weight_g / 100)}
                for f, c in predictions]

        return jsonify({
            "top_prediction": {
                "food_name":  top_food, "confidence": round(top_conf, 4),
                "weight_g":   weight_g, "volume_ml":  round(volume_ml, 1),
                "calories":   calories, "carbs_g":    carbs_g,
                "protein_g":  prot_g,   "fat_g":      fat_g,
            },
            "top5":             top5,
            "confidence_level": confidence_level,
            "depth_model":      depth_estimator.mode,
            "plate_calibrated": plate_diam is not None,
        })

    except Exception as e:
        logger.error(f"Base64 hatası: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info("=" * 55)
    logger.info("  Snackabetic AI Servisi")
    logger.info(f"  Model:        {MODEL_PATH}")
    logger.info(f"  Depth:        {depth_estimator.mode}")
    logger.info(f"  Sınıf sayısı: {len(food_classifier.idx_to_class)}")
    logger.info("  Endpointler:")
    logger.info("    GET  /health")
    logger.info("    POST /analyze          (multipart)")
    logger.info("    POST /analyze-base64   (JSON)")
    logger.info("=" * 55)
    logger.info("  Port:         %s", port)
    app.run(host="0.0.0.0", port=port, debug=False)
