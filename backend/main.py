"""
SwanSorts — FastAPI Backend (YOLOv8 Edition)
---------------------------------------------
Your model is a YOLOv8 object detector trained on 6 waste classes.
Place your model file at:  models/best_model.pt

Run with:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Endpoints:
    POST /predict   → send image, get all detected waste objects
    GET  /health    → check server + model status
    GET  /classes   → list all supported classes with metadata
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import io
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("swansorts")

# ── CONFIG ────────────────────────────────────────────────────────────────────
MODEL_PATH  = "models/best_model.pt"
CONF_THRESH = 0.25   # minimum confidence — matches your notebook
IMG_SIZE    = 640    # YOLOv8 input size used during training

# ── CLASS DEFINITIONS ─────────────────────────────────────────────────────────
#
# From your dataset.yaml:
#   0: plastic  |  1: paper  |  2: metal
#   3: glass    |  4: food   |  5: battery
#
# waste_map and carbon_factors taken directly from your notebook cells 17 + 25

CLASS_NAMES = ["plastic", "paper", "metal", "glass", "food", "battery"]

CLASS_META = {
    "plastic": {
        "material":       "Plastic",
        "waste_category": "Recyclable",
        "disposal":       "Plastic / Blue Bin",
        "co2_factor":     6.0,    # from your carbon_factors
        "co2_per_item":   0.6,    # factor × 0.1kg average item
        "icon":           "🧴",
        "color":          "#a8e063",
        "tip":            "Rinse before recycling. Remove caps if possible.",
    },
    "paper": {
        "material":       "Paper",
        "waste_category": "Recyclable",
        "disposal":       "Paper / Dry Waste Bin",
        "co2_factor":     4.0,
        "co2_per_item":   0.4,
        "icon":           "📰",
        "color":          "#a8e063",
        "tip":            "Keep dry. Shred sensitive documents before recycling.",
    },
    "metal": {
        "material":       "Metal",
        "waste_category": "Recyclable",
        "disposal":       "Metal / Scrap Bin",
        "co2_factor":     9.0,
        "co2_per_item":   0.9,
        "icon":           "🥫",
        "color":          "#c6f135",
        "tip":            "Crush cans to save space. High recycling value!",
    },
    "glass": {
        "material":       "Glass",
        "waste_category": "Recyclable",
        "disposal":       "Glass Bin",
        "co2_factor":     1.5,
        "co2_per_item":   0.15,
        "icon":           "🍶",
        "color":          "#7dd6f0",
        "tip":            "Do not mix with ceramics or mirrors.",
    },
    "food": {
        "material":       "Food / Organic",
        "waste_category": "Biodegradable",
        "disposal":       "Green / Compost Bin",
        "co2_factor":     2.0,
        "co2_per_item":   0.2,
        "icon":           "🍃",
        "color":          "#a8e063",
        "tip":            "Compost it — great for soil and reduces methane emissions.",
    },
    "battery": {
        "material":       "Battery",
        "waste_category": "Hazardous",
        "disposal":       "E-Waste / Hazardous Bin",
        "co2_factor":     12.0,
        "co2_per_item":   1.2,
        "icon":           "🔋",
        "color":          "#fab900",
        "tip":            "NEVER put in general waste. Take to an e-waste drop point.",
    },
}

# ── LOAD MODEL ────────────────────────────────────────────────────────────────
def load_model():
    try:
        from ultralytics import YOLO
        m = YOLO(MODEL_PATH)
        logger.info(f"✅ YOLOv8 model loaded from {MODEL_PATH}")
        return m
    except FileNotFoundError:
        logger.warning(f"⚠️  Model not found at {MODEL_PATH}. Running in DEMO mode.")
        return None
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        return None

model = load_model()

# ── APP ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SwanSorts API",
    description="YOLOv8 waste detection backend — classifies material type, waste category & CO₂ impact",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── INFERENCE ─────────────────────────────────────────────────────────────────
def run_detection(img: Image.Image) -> dict:
    if model is None:
        return _demo_response()

    results = model.predict(img, conf=CONF_THRESH, imgsz=IMG_SIZE, verbose=False)

    detections = []
    summary    = {}

    for r in results:
        for box in r.boxes:
            cls_id   = int(box.cls[0])
            conf     = round(float(box.conf[0]), 4)
            cls_name = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else "unknown"
            meta     = CLASS_META.get(cls_name, {})
            x1, y1, x2, y2 = [round(float(v), 1) for v in box.xyxy[0]]

            detections.append({
                "class":          cls_name,
                "material":       meta.get("material", cls_name.title()),
                "waste_category": meta.get("waste_category", "Unknown"),
                "disposal":       meta.get("disposal", "General Waste"),
                "confidence":     conf,
                "confidence_pct": f"{round(conf * 100, 1)}%",
                "co2_saved_kg":   meta.get("co2_per_item", 0.0),
                "icon":           meta.get("icon", "♻️"),
                "color":          meta.get("color", "#888"),
                "tip":            meta.get("tip", ""),
                "bbox":           {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            })

            summary[cls_name] = summary.get(cls_name, 0) + 1

    detections.sort(key=lambda d: d["confidence"], reverse=True)
    total_co2 = round(sum(d["co2_saved_kg"] for d in detections), 3)

    return {
        "detections":      detections,
        "total_detected":  len(detections),
        "summary":         summary,
        "total_co2_saved": total_co2,
        "demo_mode":       False,
    }


def _demo_response() -> dict:
    """Returns a fake result so the frontend works without a model file."""
    import random
    cls  = random.choice(CLASS_NAMES)
    meta = CLASS_META[cls]
    return {
        "detections": [{
            "class":          cls,
            "material":       meta["material"],
            "waste_category": meta["waste_category"],
            "disposal":       meta["disposal"],
            "confidence":     round(random.uniform(0.6, 0.97), 4),
            "confidence_pct": f"{round(random.uniform(60, 97), 1)}%",
            "co2_saved_kg":   meta["co2_per_item"],
            "icon":           meta["icon"],
            "color":          meta["color"],
            "tip":            meta["tip"],
            "bbox":           {"x1": 80.0, "y1": 60.0, "x2": 340.0, "y2": 280.0},
        }],
        "total_detected":  1,
        "summary":         {cls: 1},
        "total_co2_saved": meta["co2_per_item"],
        "demo_mode":       True,
    }


# ── ROUTES ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": model is not None,
        "model_type":   "YOLOv8 object detector",
        "classes":      CLASS_NAMES,
        "conf_thresh":  CONF_THRESH,
    }


@app.get("/classes")
def get_classes():
    return {
        "classes": [
            {"id": i, "name": n, **CLASS_META.get(n, {})}
            for i, n in enumerate(CLASS_NAMES)
        ]
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    start    = time.time()
    contents = await file.read()

    try:
        img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image.")

    result                = run_detection(img)
    result["inference_ms"] = round((time.time() - start) * 1000, 1)
    result["filename"]     = file.filename

    logger.info(
        f"Detected {result['total_detected']} objects in {result['inference_ms']}ms | "
        f"{result['summary']} | CO2: {result['total_co2_saved']}kg"
    )
    return JSONResponse(content=result)
