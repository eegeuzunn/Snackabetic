"""
Snackabetic - Birleşik AI Servisi  (v2)
========================================
Tek endpoint'e resim gönder → yemek adı + gram + kalori + karbonhidrat döner.

Akış:
    1. EfficientNet-B3      → yemeği tanır  ("lahmacun", %87)
    2. Kategori tespiti     → flat / volumetric / soup / drink / fruit
    3a. Flat yemekler   s    → Pure 2D alan × sabit kalınlık  (depth map kullanılmaz)
    3b. Volumetric yemekler → Depth Anything V2 + constrained height
    3c. Soup / drink        → Sabit porsiyon (kase/bardak)
    4. Veritabanı           → kalori + karbonhidrat hesaplar

Kurulum:
    pip install flask torch torchvision transformers pillow numpy scipy opencv-python

Çalıştırma:
    python snackabetic_service.py

Gerekli dosyalar (varsayılan olarak bu dosyanın yanındaki models/ klasöründe):
    - best_model.pth       (EfficientNet ağırlıkları)
    - class_mapping.json   (idx → sınıf ismi eşleşmesi)
"""

import os, io, json, logging, time
import numpy as np
from pathlib import Path
from flask import Flask, request, jsonify
from PIL import Image, UnidentifiedImageError
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
DEFAULT_MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR   = Path(os.environ.get("MODELS_DIR", str(DEFAULT_MODELS_DIR))).expanduser().resolve()
MODEL_PATH   = MODELS_DIR / "best_model.pth"
MAPPING_PATH = MODELS_DIR / "class_mapping.json"

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
DEFAULT_NUTRITION = (200, 20.0, 10.0, 8.0, 0.90)

# Inference-time sınıf birleştirme: aynı yemeğin farklı etiketlerini tek sınıfta topla
CLASS_MERGE_GROUPS = {
    "omlet": ["omlet", "omelette"],
}
MERGE_CANONICAL = {}
for canonical, aliases in CLASS_MERGE_GROUPS.items():
    for alias in aliases:
        MERGE_CANONICAL[alias] = canonical

# ─── YEMEk ŞEKİL PROFİLLERİ ──────────────────────────────────────────────────
# Kategori: "flat" | "volumetric" | "soup" | "drink" | "fruit"
#
# flat:       Pure 2D alan × sabit kalınlık → depth map yok
# volumetric: 2D alan × depth haritasından gelen yükseklik
# soup:       Sabit kase/tabak porsiyonu (250-400 ml arası)
# drink:      Sabit bardak porsiyonu
# fruit:      Basit 3D küre / elipsoid tahmini
#
# Tuple: (min_g, max_g, thickness_cm_or_None, category)
#   thickness_cm → flat yemekler için sabit kalınlık
#   None         → depth map kullanılır (volumetric) veya sabit porsiyon
FOOD_SHAPE_PROFILES = {
    # ── Flat (sadece alan × kalınlık) ────────────────────────────────────────
    "lahmacun":           (130, 250,  0.30, "flat"),
    "pizza":              (80,  300,  1.50, "flat"),   # tek dilim
    "omlet":              (80,  220,  1.40, "flat"),
    "omelette":           (80,  220,  1.40, "flat"),
    "pancakes":           (60,  200,  1.20, "flat"),
    "waffles":            (80,  220,  2.00, "flat"),
    "french_toast":       (80,  220,  2.50, "flat"),
    "kiymali-pide":       (150, 350,  1.50, "flat"),
    "su-boregi":          (100, 300,  2.00, "flat"),
    "kiymali-borek":      (100, 280,  2.00, "flat"),
    "peynirli-borek":     (100, 280,  2.00, "flat"),
    # ── Volumetric (depth map + constrained height) ───────────────────────────
    "pilav":              (100, 400,  None, "volumetric"),
    "bulgur-pilavi":      (100, 350,  None, "volumetric"),
    "salcali-makarna":    (150, 450,  None, "volumetric"),
    "yogurtlu-makarna":   (150, 450,  None, "volumetric"),
    "manti":              (150, 450,  None, "volumetric"),
    "karniyarik":         (150, 400,  None, "volumetric"),
    "hunkar-begendi":     (150, 400,  None, "volumetric"),
    "menemen":            (100, 350,  None, "volumetric"),
    "kabak-mucver":       (100, 300,  None, "volumetric"),
    "yaprak-sarma":       (100, 350,  None, "volumetric"),
    "biber-dolma":        (150, 400,  None, "volumetric"),
    "midye-dolma":        (100, 300,  None, "volumetric"),
    "ispanak-yemegi":     (150, 400,  None, "volumetric"),
    "zeytinyagli-fasulye":(150, 400,  None, "volumetric"),
    "sulu-kuru-fasulye-yemegi": (200, 450, None, "volumetric"),
    "sulu-barbunya-yemegi":     (200, 450, None, "volumetric"),
    "sulu-bezelye-yemegi":      (150, 400, None, "volumetric"),
    "sulu-nohut-yemegi":        (150, 400, None, "volumetric"),
    "sulu-bamya-yemegi":        (150, 400, None, "volumetric"),
    "coban-salatasi":     (100, 300,  None, "volumetric"),
    "kisir":              (100, 300,  None, "volumetric"),
    "cacik":              (100, 250,  None, "volumetric"),
    "tursu":              ( 50, 200,  None, "volumetric"),
    "patates-puresi":     (150, 400,  None, "volumetric"),
    "patates-kizartmasi": (100, 350,  None, "volumetric"),
    "patates-salatasi":   (100, 300,  None, "volumetric"),
    "hamburger":          (150, 400,  None, "volumetric"),
    "hot_dog":            (100, 250,  None, "volumetric"),
    "doner":              (150, 400,  None, "volumetric"),
    "iskender":           (200, 500,  None, "volumetric"),
    "adana-kebap":        (150, 400,  None, "volumetric"),
    "tas-kebabi":         (150, 400,  None, "volumetric"),
    "patlican-kebabi":    (150, 400,  None, "volumetric"),
    "steak":              (150, 450,  None, "volumetric"),
    "grilled_salmon":     (100, 350,  None, "volumetric"),
    "hamsi-tava":         (100, 300,  None, "volumetric"),
    "levrek":             (150, 400,  None, "volumetric"),
    "cipura":             (150, 400,  None, "volumetric"),
    "chicken_wings":      (100, 350,  None, "volumetric"),
    "french_fries":       (100, 350,  None, "volumetric"),
    "onion_rings":        (100, 300,  None, "volumetric"),
    "falafel":            (100, 300,  None, "volumetric"),
    "sushi":              (100, 350,  None, "volumetric"),
    "caesar_salad":       (100, 350,  None, "volumetric"),
    "greek_salad":        (100, 350,  None, "volumetric"),
    "hummus":             ( 50, 200,  None, "volumetric"),
    "tacos":              (100, 300,  None, "volumetric"),
    "churros":            ( 50, 200,  None, "volumetric"),
    "spaghetti_bolognese":(150, 450,  None, "volumetric"),
    "spaghetti_carbonara":(150, 450,  None, "volumetric"),
    "lasagna":            (150, 450,  None, "volumetric"),
    "club_sandwich":      (100, 350,  None, "volumetric"),
    "grilled_cheese_sandwich": (100, 300, None, "volumetric"),
    "cheesecake":         ( 80, 200,  None, "volumetric"),
    "tiramisu":           ( 80, 200,  None, "volumetric"),
    "chocolate_cake":     ( 80, 200,  None, "volumetric"),
    "apple_pie":          ( 80, 250,  None, "volumetric"),
    "ice_cream":          (100, 300,  None, "volumetric"),
    "frozen_yogurt":      (100, 300,  None, "volumetric"),
    "donuts":             ( 40, 120,  None, "volumetric"),
    "baklava":            ( 60, 200,  None, "volumetric"),
    "kazandibi":          (100, 250,  None, "volumetric"),
    "sutlac":             (150, 300,  None, "volumetric"),
    "tulumba-tatlisi":    ( 80, 250,  None, "volumetric"),
    "kalburabasti":       ( 80, 250,  None, "volumetric"),
    "kemal-pasa-tatlisi": ( 80, 250,  None, "volumetric"),
    "lokma":              ( 50, 200,  None, "volumetric"),
    "dondurma":           (100, 300,  None, "volumetric"),
    "cig-kofte":          ( 50, 200,  None, "volumetric"),
    "icli-kofte":         (100, 350,  None, "volumetric"),
    "mercimek-koftesi":   (100, 300,  None, "volumetric"),
    "anne-koftesi":       (100, 350,  None, "volumetric"),
    "kokorec":            (100, 300,  None, "volumetric"),
    "tantuni":            (150, 350,  None, "volumetric"),
    "sucuklu-yumurta":    ( 80, 250,  None, "volumetric"),
    "haslanmis-yumurta":  ( 40, 120,  None, "volumetric"),
    "yogurt":             (100, 250,  None, "volumetric"),
    "midye-tava":         (100, 300,  None, "volumetric"),
    "canak-enginar":      (100, 300,  None, "volumetric"),
    "et-sote":            (150, 400,  None, "volumetric"),
    "tavuk-sote":         (150, 400,  None, "volumetric"),
    # ── Soup (sabit porsiyon: büyük kase ~350g) ───────────────────────────────
    "mercimek-corbasi":   (200, 400,  None, "soup"),
    "domates-corbasi":    (200, 400,  None, "soup"),
    "tarhana-corbasi":    (200, 400,  None, "soup"),
    "yayla-corbasi":      (200, 400,  None, "soup"),
    "sehriye-corbasi":    (200, 400,  None, "soup"),
    # ── Drink (sabit porsiyon) ────────────────────────────────────────────────
    "ayran":              (200, 300,  None, "drink"),
    "turk-kahvesi":       ( 60, 100,  None, "drink"),
    "cay":                (150, 200,  None, "drink"),
    "sahlep":             (200, 300,  None, "drink"),
    # ── Fruit (basit küre / elipsoid) ─────────────────────────────────────────
    "portakal": (130, 250,  None, "fruit"),
    "elma":     (120, 250,  None, "fruit"),
    "armut":    (120, 250,  None, "fruit"),
    "muz":      (80,  200,  None, "fruit"),
    "uzum":     (80,  300,  None, "fruit"),
    "cilek":    (50,  200,  None, "fruit"),
    "kiraz":    (50,  200,  None, "fruit"),
    "erik":     (50,  150,  None, "fruit"),
    "seftali":  (100, 200,  None, "fruit"),
    "kayisi":   (40,  100,  None, "fruit"),
    "incir":    (40,  100,  None, "fruit"),
    "kavun":    (200, 600,  None, "fruit"),
    "karpuz":   (300, 1000, None, "fruit"),
    "nar":      (150, 300,  None, "fruit"),
    "kivi":     (60,  120,  None, "fruit"),
    "mango":    (200, 400,  None, "fruit"),
    "avokado":  (150, 300,  None, "fruit"),
}


# ─── 1. EFFICİENTNET MODELİ ───────────────────────────────────────────────────
class FoodClassifier:
    def __init__(self):
        self.model        = None
        self.idx_to_class = {}
        self.transform    = transforms.Compose([
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

        with open(MAPPING_PATH, "r", encoding="utf-8") as f:
            mapping = json.load(f)
        self.idx_to_class = {int(k): v for k, v in mapping["idx_to_class"].items()}
        num_classes = len(self.idx_to_class)

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

    def predict(self, pil_image: Image.Image, top_k: int = 5, use_crop: bool = True):
        if self.model is None:
            raise RuntimeError("Model yüklenemedi!")

        classify_img = _crop_food_region(pil_image) if use_crop else pil_image
        img_tensor = self.transform(classify_img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            output = self.model(img_tensor)
            probs  = torch.softmax(output, dim=1)[0]

        merged = _merge_class_probabilities(probs, self.idx_to_class)
        sorted_items = sorted(merged.items(), key=lambda item: item[1], reverse=True)[:top_k]
        return [(food, float(conf)) for food, conf in sorted_items]


# ─── 2. DEPTH ESTIMATION MODELİ ───────────────────────────────────────────────
class DepthEstimator:
    def __init__(self):
        self.pipe  = None
        self.midas = None
        self.mode  = None
        self._load()

    def _load(self):
        try:
            from transformers import pipeline as hf_pipeline
            self.pipe = hf_pipeline(
                task="depth-estimation",
                model="depth-anything/Depth-Anything-V2-Small-hf",
                device=-1,
            )
            self.mode = "depth_anything"
            logger.info("✅ Depth Anything V2 (Small) yüklendi")
        except Exception as e:
            logger.warning(f"Depth Anything yüklenemedi ({e}), MiDaS deneniyor...")
            try:
                self.midas = torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
                self.midas.eval()
                midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
                self.midas_transform = midas_transforms.small_transform
                self.mode = "midas"
                logger.info("✅ MiDaS Small yüklendi (fallback)")
            except Exception as e2:
                logger.error(f"Hiçbir depth modeli yüklenemedi: {e2}")

    def predict(self, pil_image: Image.Image) -> np.ndarray:
        """Normalize edilmiş derinlik haritası döner [H,W], 0=uzak 1=yakın."""
        if self.mode == "depth_anything":
            result = self.pipe(pil_image)
            depth  = np.array(result["depth"], dtype=np.float32)
        elif self.mode == "midas":
            img = np.array(pil_image.convert("RGB"))
            inp = self.midas_transform(img)
            with torch.no_grad():
                pred = self.midas(inp)
                pred = F.interpolate(
                    pred.unsqueeze(1), size=img.shape[:2],
                    mode="bicubic", align_corners=False
                ).squeeze()
            depth = pred.numpy().astype(np.float32)
        else:
            w, h  = pil_image.size
            depth = np.ones((h, w), dtype=np.float32) * 0.5

        d_min, d_max = depth.min(), depth.max()
        if d_max > d_min:
            depth = (depth - d_min) / (d_max - d_min)
        return depth


# ─── 3. YARDIMCI FONKSİYONLAR ────────────────────────────────────────────────
def _plate_circle_mask(img_h: int, img_w: int, plate_px_diam, plate_ctr):
    """Tabak dairesi bool maskesi; tespit yoksa None."""
    if not plate_px_diam or not plate_ctr:
        return None
    px_cx, px_cy = plate_ctr
    r = plate_px_diam // 2
    yy, xx = np.ogrid[:img_h, :img_w]
    return (xx - px_cx) ** 2 + (yy - px_cy) ** 2 <= r ** 2


def _get_food_mask(
    img_arr: np.ndarray,
    depth_map: np.ndarray = None,
    plate_circle: np.ndarray = None,
) -> np.ndarray:
    """Renk + derinlik + tabak kısıtı ile yemek maskesi döner."""
    import cv2

    h, w = img_arr.shape[:2]
    img_hsv = cv2.cvtColor(img_arr, cv2.COLOR_RGB2HSV)
    sat, bri = img_hsv[:, :, 1], img_hsv[:, :, 2]

    # Renkli, aşırı parlak/karanlık olmayan pikseller
    mask = (sat > 20) & (bri > 35) & (bri < 235)
    # Beyaz/gri tabak ve masa yüzeyini çıkar
    mask &= ~((sat < 45) & (bri > 165))
    mask &= bri >= 25

    if plate_circle is not None:
        mask &= plate_circle

    if depth_map is not None and depth_map.shape[:2] == (h, w) and mask.any():
        depth_in_mask = depth_map[mask]
        if depth_in_mask.size > 50:
            depth_thresh = np.percentile(depth_in_mask, 30)
            mask &= depth_map >= depth_thresh

    mask = ndimage.binary_opening(mask, iterations=2)
    mask = ndimage.binary_closing(mask, iterations=3)

    labeled, n = ndimage.label(mask)
    if n == 0:
        cy, cx = h // 2, w // 2
        yy, xx = np.ogrid[:h, :w]
        center = ((xx - cx) ** 2 + (yy - cy) ** 2) <= (min(h, w) * 0.35) ** 2
        if plate_circle is not None:
            return plate_circle & center
        return center

    cy, cx = h // 2, w // 2
    max_dist = max(np.sqrt(cx ** 2 + cy ** 2), 1.0)
    best_lbl, best_score = 1, -1.0
    min_area = mask.size * 0.01

    for lbl in range(1, n + 1):
        comp = labeled == lbl
        area = comp.sum()
        if area < min_area:
            continue
        ys, xs = np.where(comp)
        dist = np.sqrt((xs.mean() - cx) ** 2 + (ys.mean() - cy) ** 2)
        score = area * (1.0 / (1.0 + dist / max_dist))
        if score > best_score:
            best_score = score
            best_lbl = lbl

    return labeled == best_lbl


def _align_depth_map(depth_map: np.ndarray, img_h: int, img_w: int) -> np.ndarray:
    if depth_map.shape[0] == img_h and depth_map.shape[1] == img_w:
        return depth_map
    return ndimage.zoom(
        depth_map,
        (img_h / depth_map.shape[0], img_w / depth_map.shape[1]),
        order=1,
    )


def _prepare_estimation_context(
    depth_map: np.ndarray,
    pil_image: Image.Image,
    plate_diameter_cm: float = None,
    camera_height_cm: float = 30.0,
) -> dict:
    """Maske, ölçek ve alan hesaplarını bir kez üretir (top-5 için paylaşılır)."""
    img_arr = np.array(pil_image.convert("RGB"))
    img_h, img_w = img_arr.shape[:2]
    depth_map = _align_depth_map(depth_map, img_h, img_w)

    plate_px_diam, plate_ctr = _detect_plate(img_arr)
    plate_circle = _plate_circle_mask(img_h, img_w, plate_px_diam, plate_ctr)
    mask = _get_food_mask(img_arr, depth_map=depth_map, plate_circle=plate_circle)

    cm_per_px, scale_confidence = _get_scale(
        img_w, plate_px_diam, plate_diameter_cm, camera_height_cm
    )
    pixel_area_cm2 = cm_per_px ** 2

    return {
        "img_h": img_h,
        "img_w": img_w,
        "depth_map": depth_map,
        "mask": mask,
        "plate_px_diam": plate_px_diam,
        "cm_per_px": cm_per_px,
        "scale_confidence": scale_confidence,
        "pixel_area_cm2": pixel_area_cm2,
        "food_area_cm2": float(mask.sum()) * pixel_area_cm2,
        "food_pixel_ratio": float(mask.sum()) / mask.size,
    }


def _crop_food_region(
    pil_img: Image.Image,
    pad: int = 20,
    min_side: int = 80,
) -> Image.Image:
    """Yemek maskesine göre bounding-box kırp; çok küçükse orijinali döndür."""
    arr = np.array(pil_img.convert("RGB"))
    mask = _get_food_mask(arr)
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return pil_img

    h, w = arr.shape[:2]
    y0 = max(0, int(ys.min()) - pad)
    y1 = min(h, int(ys.max()) + pad)
    x0 = max(0, int(xs.min()) - pad)
    x1 = min(w, int(xs.max()) + pad)

    if (y1 - y0) < min_side or (x1 - x0) < min_side:
        return pil_img

    return Image.fromarray(arr[y0:y1, x0:x1])


def _merge_class_probabilities(probs, idx_to_class: dict) -> dict:
    """Benzer sınıfların softmax olasılıklarını birleştir."""
    merged = {}
    for idx, prob in enumerate(probs):
        class_name = idx_to_class.get(idx)
        if not class_name:
            continue
        canonical = MERGE_CANONICAL.get(class_name, class_name)
        merged[canonical] = merged.get(canonical, 0.0) + float(prob)
    return merged


def _load_image_from_bytes(raw: bytes) -> Image.Image:
    """JPEG/PNG/WEBP/HEIC byte dizisinden PIL RGB görüntü yükle."""
    try:
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except UnidentifiedImageError:
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
            return Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception as exc:
            raise UnidentifiedImageError(
                "Geçersiz resim formatı. JPEG/PNG/HEIC gönderin."
            ) from exc


def _detect_plate(img_arr: np.ndarray):
    """
    HoughCircles ile tabak tespit eder.
    Döner: (plate_px_diameter, plate_center) veya (None, None)
    """
    import cv2
    h, w = img_arr.shape[:2]
    gray = cv2.cvtColor(img_arr, cv2.COLOR_RGB2GRAY)
    gray = cv2.medianBlur(gray, 5)
    try:
        circles = cv2.HoughCircles(
            gray, cv2.HOUGH_GRADIENT, dp=1.2, minDist=max(h, w) // 8,
            param1=100, param2=30,
            minRadius=int(min(w, h) * 0.12), maxRadius=int(min(w, h) * 0.60),
        )
        if circles is not None:
            circles = np.round(circles[0, :]).astype(int)
            cx, cy  = w // 2, h // 2
            best    = min(circles, key=lambda c: (c[0] - cx) ** 2 + (c[1] - cy) ** 2)
            return int(best[2] * 2), (int(best[0]), int(best[1]))
    except Exception:
        pass
    return None, None


def _get_scale(img_w: int, plate_px_diameter, plate_diameter_cm, camera_height_cm: float):
    """
    cm_per_px ve scale_confidence döner.
    Öncelik: kullanıcı + tespit > sadece tespit > FOV tahmini
    """
    if plate_px_diameter and plate_diameter_cm:
        cm_per_px        = float(plate_diameter_cm) / plate_px_diameter
        scale_confidence = "high"
    elif plate_px_diameter:
        cm_per_px        = 26.0 / plate_px_diameter   # 26cm standart tabak
        scale_confidence = "medium"
    elif plate_diameter_cm:
        cm_per_px        = float(plate_diameter_cm) / img_w
        scale_confidence = "medium"
    else:
        fov_rad          = np.radians(69.0)
        scene_width_cm   = 2 * camera_height_cm * np.tan(fov_rad / 2)
        cm_per_px        = scene_width_cm / img_w
        scale_confidence = "low"
    return cm_per_px, scale_confidence


# ─── 4. ANA PORSIYON TAHMİN FONKSİYONU ──────────────────────────────────────
def estimate_weight(
    depth_map:         np.ndarray,
    pil_image:         Image.Image,
    food_name:         str,
    density:           float,
    camera_height_cm:  float = 30.0,
    plate_diameter_cm: float = None,
    context:           dict = None,
) -> dict:
    """
    Yemek kategorisine göre farklı tahmin stratejisi uygular.
    Döner: dict  {weight_g, volume_ml, food_pixel_ratio, scale_confidence, method}
    """
    if context is None:
        context = _prepare_estimation_context(
            depth_map, pil_image, plate_diameter_cm, camera_height_cm
        )

    profile      = FOOD_SHAPE_PROFILES.get(food_name)
    category     = profile[3] if profile else "volumetric"
    min_g, max_g = (profile[0], profile[1]) if profile else (80, 600)
    thickness_cm = profile[2] if profile else None

    mask               = context["mask"]
    depth_map          = context["depth_map"]
    scale_confidence   = context["scale_confidence"]
    cm_per_px          = context["cm_per_px"]
    pixel_area_cm2     = context["pixel_area_cm2"]
    food_area_cm2      = context["food_area_cm2"]
    food_pixel_ratio   = context["food_pixel_ratio"]

    # ── Strateji: FLAT ────────────────────────────────────────────────────────
    if category == "flat":
        # Depth map kullanılmaz; sadece 2D alan × sabit kalınlık
        raw_weight = food_area_cm2 * thickness_cm * density
        weight_g   = int(np.clip(raw_weight, min_g, max_g))
        volume_ml  = food_area_cm2 * thickness_cm
        method     = "area_flat"

    # ── Strateji: VOLUMETRIC ──────────────────────────────────────────────────
    elif category == "volumetric":
        # Yükseklik sınırı: food-class'a göre veya genel default
        VOLUMETRIC_MAX_HEIGHT = {
            "hamburger": 8.0, "hot_dog": 8.0, "doner": 7.0,
            "iskender": 6.0, "adana-kebap": 6.0,
            "steak": 5.0, "grilled_salmon": 4.0,
        }
        max_h_cm   = VOLUMETRIC_MAX_HEIGHT.get(food_name, 5.0)
        depth_range_cm = min(camera_height_cm * 0.25, max_h_cm)
        depth_cm       = depth_map * depth_range_cm

        masked_depth = depth_cm * mask
        ref_depth    = np.percentile(masked_depth[mask], 5) if mask.sum() > 0 else 0
        thickness    = np.maximum(masked_depth - ref_depth, 0) * mask

        raw_volume   = float((thickness * pixel_area_cm2).sum())
        volume_ml    = float(np.clip(raw_volume, 1.0, 2000.0))
        raw_weight   = volume_ml * density

        # scale_confidence düşükse alanı ağırlıklı yap (daha güvenilir)
        if scale_confidence == "low":
            # FOV tahmini kötüyse tahminleri %60'a çek
            raw_weight = raw_weight * 0.60
            volume_ml  = volume_ml  * 0.60

        weight_g = int(np.clip(raw_weight, min_g, max_g))
        method   = "depth_volumetric"

    # ── Strateji: SOUP ────────────────────────────────────────────────────────
    elif category == "soup":
        # Çorba/sulu yemek → büyük kase tahmini (300g ± alan oranı)
        base_g   = 300
        ratio    = np.clip(food_pixel_ratio / 0.35, 0.7, 1.3)
        weight_g = int(np.clip(base_g * ratio, min_g, max_g))
        volume_ml = weight_g / density
        method    = "fixed_bowl"

    # ── Strateji: DRINK ───────────────────────────────────────────────────────
    elif category == "drink":
        base_g   = int((min_g + max_g) / 2)
        weight_g = base_g
        volume_ml = weight_g / density
        method    = "fixed_cup"

    # ── Strateji: FRUIT ───────────────────────────────────────────────────────
    elif category == "fruit":
        # Maskenin bounding-box'u → elipsoid hacim tahmini
        rows      = np.any(mask, axis=1)
        cols      = np.any(mask, axis=0)
        if rows.any() and cols.any():
            r_min, r_max = np.where(rows)[0][[0, -1]]
            c_min, c_max = np.where(cols)[0][[0, -1]]
            a_cm  = ((c_max - c_min) / 2) * cm_per_px   # yarı eksen X
            b_cm  = ((r_max - r_min) / 2) * cm_per_px   # yarı eksen Y
            c_cm  = (a_cm + b_cm) / 2                    # derinlik tahmini
            volume_ml = (4 / 3) * np.pi * a_cm * b_cm * c_cm
        else:
            volume_ml = 200.0
        raw_weight = volume_ml * density
        weight_g   = int(np.clip(raw_weight, min_g, max_g))
        method     = "ellipsoid_fruit"

    else:
        weight_g  = int((min_g + max_g) / 2)
        volume_ml = weight_g / density
        method    = "fallback_midpoint"

    return {
        "weight_g":         weight_g,
        "volume_ml":        round(float(volume_ml), 1),
        "food_pixel_ratio": round(food_pixel_ratio, 3),
        "scale_confidence": scale_confidence,
        "method":           method,
    }


# ─── MODEL BAŞLATMA ───────────────────────────────────────────────────────────
logger.info("Modeller yükleniyor...")
food_classifier = FoodClassifier()
depth_estimator = DepthEstimator()
logger.info("🚀 Servis hazır!")


# ─── API ENDPOINT'LERİ ────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":       "ok",
        "efficientnet": food_classifier.model is not None,
        "depth_model":  depth_estimator.mode,
        "num_classes":  len(food_classifier.idx_to_class),
    })


def _run_pipeline(pil_img, plate_diam, cam_height, top_k):
    """Ortak pipeline — hem /analyze hem /analyze-base64 kullanır."""
    # 1. Yemek tanıma
    predictions        = food_classifier.predict(pil_img, top_k=top_k)
    top_food, top_conf = predictions[0]

    # 2. Beslenme DB
    nutrition                           = NUTRITION_DB.get(top_food, DEFAULT_NUTRITION)
    cal100, carb100, prot100, fat100, density = nutrition

    # 3. Derinlik (volumetric kategoriler için kullanılır)
    depth_map = depth_estimator.predict(pil_img)
    est_ctx   = _prepare_estimation_context(depth_map, pil_img, plate_diam, cam_height)

    # 4. Porsiyon tahmini
    est = estimate_weight(
        depth_map, pil_img, top_food, density,
        camera_height_cm=cam_height,
        plate_diameter_cm=plate_diam,
        context=est_ctx,
    )
    weight_g  = est["weight_g"]
    volume_ml = est["volume_ml"]

    # 5. Besin değerleri
    factor   = weight_g / 100.0
    calories = round(cal100  * factor)
    carbs_g  = round(carb100 * factor, 1)
    prot_g   = round(prot100 * factor, 1)
    fat_g    = round(fat100  * factor, 1)

    # 6. Güven seviyesi
    sc = est["scale_confidence"]
    if top_conf > 0.75 and sc == "high" and est["food_pixel_ratio"] > 0.20:
        confidence_level = "high"
    elif top_conf > 0.50 and sc in ("high", "medium"):
        confidence_level = "medium"
    else:
        confidence_level = "low"

    # 7. Top-5 — her aday için kendi şekil profiline göre ayrı gram tahmini
    top5 = []
    for food, conf in predictions:
        n = NUTRITION_DB.get(food, DEFAULT_NUTRITION)
        cal100, carb100, prot100, fat100, food_density = n
        alt_est = estimate_weight(
            depth_map, pil_img, food, food_density,
            camera_height_cm=cam_height,
            plate_diameter_cm=plate_diam,
            context=est_ctx,
        )
        alt_weight = alt_est["weight_g"]
        factor = alt_weight / 100.0
        top5.append({
            "food_name":           food,
            "confidence":          round(conf, 4),
            "weight_g_estimated":  alt_weight,
            "calories_estimated":  round(cal100 * factor),
            "carbs_g_estimated":   round(carb100 * factor, 1),
            "protein_g_estimated": round(prot100 * factor, 1),
            "fat_g_estimated":     round(fat100 * factor, 1),
        })

    return {
        "top_prediction": {
            "food_name":  top_food,
            "confidence": round(top_conf, 4),
            "weight_g":   weight_g,
            "volume_ml":  volume_ml,
            "calories":   calories,
            "carbs_g":    carbs_g,
            "protein_g":  prot_g,
            "fat_g":      fat_g,
        },
        "top5":             top5,
        "confidence_level": confidence_level,
        "estimation_method": est["method"],
        "scale_confidence": sc,
        "depth_model":      depth_estimator.mode,
        "plate_calibrated": plate_diam is not None,
        "food_fill_ratio":  est["food_pixel_ratio"],
    }


def _log_analyze_exchange(endpoint, request_payload, response_payload):
    """Gelen isteği ve dönen cevabı olduğu gibi logla."""
    logger.info("[%s] REQUEST:\n%s", endpoint, json.dumps(request_payload, ensure_ascii=False, indent=2))
    logger.info("[%s] RESPONSE:\n%s", endpoint, json.dumps(response_payload, ensure_ascii=False, indent=2))


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Multipart/form-data endpoint.

    Alanlar:
        image             : yemek fotoğrafı (JPG/PNG)
        plate_diameter_cm : float, opsiyonel (örn. "26")
        camera_height_cm  : float, opsiyonel, default 30
        top_k             : int,   opsiyonel, default 5
    """
    t_start = time.time()
    if "image" not in request.files:
        return jsonify({"error": "image alanı eksik"}), 400
    try:
        plate_diam = request.form.get("plate_diameter_cm")
        plate_diam = float(plate_diam) if plate_diam else None
        cam_height = float(request.form.get("camera_height_cm", 30.0))
        top_k      = int(request.form.get("top_k", 5))

        raw = request.files["image"].read()
        try:
            pil_img = _load_image_from_bytes(raw)
        except UnidentifiedImageError:
            return jsonify({"error": "Geçersiz resim formatı. JPEG/PNG/HEIC gönderin."}), 400

        max_dim = 518
        w, h    = pil_img.size
        if max(w, h) > max_dim:
            ratio   = max_dim / max(w, h)
            pil_img = pil_img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

        image_file = request.files["image"]
        request_log = {
            "plate_diameter_cm": plate_diam,
            "camera_height_cm": cam_height,
            "top_k": top_k,
            "image": {
                "filename": image_file.filename,
                "content_type": image_file.content_type,
                "size_bytes": len(raw),
                "width": pil_img.size[0],
                "height": pil_img.size[1],
            },
        }

        result = _run_pipeline(pil_img, plate_diam, cam_height, top_k)
        processing_ms = int((time.time() - t_start) * 1000)
        result["processing_ms"] = processing_ms

        _log_analyze_exchange("/analyze", request_log, result)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Hata: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/analyze-base64", methods=["POST"])
def analyze_base64():
    """
    JSON endpoint (base64 görsel).

    Body:
        {
            "image_base64":      "...",
            "plate_diameter_cm":  26,   (opsiyonel)
            "camera_height_cm":   30,   (opsiyonel)
            "top_k":               5    (opsiyonel)
        }
    """
    import base64
    t_start = time.time()
    data    = request.get_json()
    if not data or "image_base64" not in data:
        return jsonify({"error": "image_base64 alanı eksik"}), 400
    try:
        img_bytes  = base64.b64decode(data["image_base64"])
        try:
            pil_img = _load_image_from_bytes(img_bytes)
        except UnidentifiedImageError:
            return jsonify({"error": "Geçersiz resim formatı. JPEG/PNG/HEIC gönderin."}), 400
        max_dim    = 518
        w, h       = pil_img.size
        if max(w, h) > max_dim:
            ratio   = max_dim / max(w, h)
            pil_img = pil_img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

        plate_diam = data.get("plate_diameter_cm")
        cam_height = float(data.get("camera_height_cm", 30.0))
        top_k      = int(data.get("top_k", 5))

        result = _run_pipeline(pil_img, plate_diam, cam_height, top_k)
        result["processing_ms"] = int((time.time() - t_start) * 1000)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Base64 hatası: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    logger.info("=" * 60)
    logger.info("  Snackabetic AI Servisi  v2")
    logger.info(f"  Model:         {MODEL_PATH}")
    logger.info(f"  Depth:         {depth_estimator.mode}")
    logger.info(f"  Sınıf sayısı:  {len(food_classifier.idx_to_class)}")
    logger.info("  Endpointler:")
    logger.info("    GET  /health")
    logger.info("    POST /analyze          (multipart)")
    logger.info("    POST /analyze-base64   (JSON + base64)")
    logger.info("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=False)
