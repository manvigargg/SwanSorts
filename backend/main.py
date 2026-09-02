"""
SwanSorts — FastAPI Backend (YOLOv8 Edition)
---------------------------------------------
Your model is a YOLOv8 object detector trained on 6 waste classes.

Place your model file at:
    models/best_model.pt

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

import time
import logging
import os
import torch


# ── LOGGING ────────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("swansorts")


# ── CONFIG ─────────────────────────────────────────────────────────────────────

MODEL_PATH = "models/best_model.pt"

# Minimum confidence threshold
CONF_THRESH = 0.25

# Reduced inference resolution to stay within Render's 512 MB limit
IMG_SIZE = 416

# Maximum decoded image dimension
MAX_IMAGE_DIM = 960

# Prevent excessive detections from consuming memory
MAX_DETECTIONS = 20


# ── DOWNLOAD MODEL IF MISSING ──────────────────────────────────────────────────

if not os.path.exists(MODEL_PATH):
    import gdown

    os.makedirs("models", exist_ok=True)

    gdown.download(
        "https://drive.google.com/uc?id=1PVMm_XCOw8YF9inBzdGCiJYNDA5Y4ZIV",
        MODEL_PATH,
        quiet=False,
    )


# ── CLASS DEFINITIONS ──────────────────────────────────────────────────────────
#
# From your dataset.yaml:
#
#   0: plastic
#   1: paper
#   2: metal
#   3: glass
#   4: food
#   5: battery
#
# waste_map and carbon_factors are kept consistent with your existing notebook.

CLASS_NAMES = [
    "plastic",
    "paper",
    "metal",
    "glass",
    "food",
    "battery",
]


CLASS_META = {
    "plastic": {
        "material": "Plastic",
        "waste_category": "Recyclable",
        "disposal": "Plastic / Blue Bin",
        "co2_factor": 6.0,
        "co2_per_item": 0.6,
        "icon": "🧴",
        "color": "#a8e063",
        "tip": "Rinse before recycling. Remove caps if possible.",
    },

    "paper": {
        "material": "Paper",
        "waste_category": "Recyclable",
        "disposal": "Paper / Dry Waste Bin",
        "co2_factor": 4.0,
        "co2_per_item": 0.4,
        "icon": "📰",
        "color": "#a8e063",
        "tip": "Keep dry. Shred sensitive documents before recycling.",
    },

    "metal": {
        "material": "Metal",
        "waste_category": "Recyclable",
        "disposal": "Metal / Scrap Bin",
        "co2_factor": 9.0,
        "co2_per_item": 0.9,
        "icon": "🥫",
        "color": "#c6f135",
        "tip": "Crush cans to save space. High recycling value!",
    },

    "glass": {
        "material": "Glass",
        "waste_category": "Recyclable",
        "disposal": "Glass Bin",
        "co2_factor": 1.5,
        "co2_per_item": 0.15,
        "icon": "🍶",
        "color": "#7dd6f0",
        "tip": "Do not mix with ceramics or mirrors.",
    },

    "food": {
        "material": "Food / Organic",
        "waste_category": "Biodegradable",
        "disposal": "Green / Compost Bin",
        "co2_factor": 2.0,
        "co2_per_item": 0.2,
        "icon": "🍃",
        "color": "#a8e063",
        "tip": "Compost it — great for soil and reduces methane emissions.",
    },

    "battery": {
        "material": "Battery",
        "waste_category": "Hazardous",
        "disposal": "E-Waste / Hazardous Bin",
        "co2_factor": 12.0,
        "co2_per_item": 1.2,
        "icon": "🔋",
        "color": "#fab900",
        "tip": "NEVER put in general waste. Take to an e-waste drop point.",
    },
}


# ── LOAD MODEL ─────────────────────────────────────────────────────────────────

def load_model():
    try:
        from ultralytics import YOLO

        model_instance = YOLO(MODEL_PATH)

        logger.info(
            "✅ YOLOv8 model loaded from %s",
            MODEL_PATH,
        )

        return model_instance

    except FileNotFoundError:
        logger.warning(
            "⚠️ Model not found at %s. Running in DEMO mode.",
            MODEL_PATH,
        )

        return None

    except Exception as e:
        logger.error(
            "❌ Failed to load model: %s",
            e,
        )

        return None


model = load_model()


# ── APP ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SwanSorts API",
    description=(
        "YOLOv8 waste detection backend — "
        "classifies material type, waste category & CO₂ impact"
    ),
    version="2.0.0",
)


# ── CORS ───────────────────────────────────────────────────────────────────────

allowed_origins = [
    "https://swan-sorts.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# Allow Render environment variable to override the defaults
if os.getenv("CORS_ORIGINS"):
    allowed_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS").split(",")
        if origin.strip()
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── IMAGE PREPARATION ──────────────────────────────────────────────────────────

def prepare_image(
    upload,
) -> tuple[Image.Image, tuple[int, int], tuple[int, int]]:
    """
    Decode and resize an uploaded image.

    Returns:
        image:
            RGB PIL image used for inference.

        original_size:
            Original image dimensions as (width, height).

        resized_size:
            Resized image dimensions as (width, height).

    Bounding boxes are later scaled back to the original
    image coordinate system.
    """

    with Image.open(upload) as source:
        original_size = source.size

        # Convert once to RGB
        image = source.convert("RGB")

    # Resize large images while preserving aspect ratio
    image.thumbnail(
        (MAX_IMAGE_DIM, MAX_IMAGE_DIM),
        Image.Resampling.LANCZOS,
    )

    return image, original_size, image.size


# ── YOLO DETECTION ─────────────────────────────────────────────────────────────

def run_detection(
    img: Image.Image,
    original_size: tuple[int, int],
    resized_size: tuple[int, int],
) -> dict:

    if model is None:
        return _demo_response()

    detections = []
    summary = {}

    # Calculate scaling factors so bounding boxes can be
    # returned in the original uploaded image coordinates.
    scale_x = original_size[0] / resized_size[0]
    scale_y = original_size[1] / resized_size[1]

    inference_started = time.time()

    logger.info("YOLO inference started")

    results = None

    try:
        # inference_mode() reduces PyTorch inference memory usage
        # by disabling autograd bookkeeping.
        with torch.inference_mode():

            results = model.predict(
                source=img,

                # Lower resolution significantly reduces inference memory.
                imgsz=IMG_SIZE,

                # Explicit CPU inference for Render.
                device="cpu",

                # Confidence threshold.
                conf=CONF_THRESH,

                # Limit the number of detections.
                max_det=MAX_DETECTIONS,

                # Stream results instead of building a large list.
                stream=True,

                # Disable unnecessary features.
                save=False,
                save_txt=False,
                save_conf=False,

                # No augmentation during production inference.
                augment=False,

                # Don't print Ultralytics prediction details.
                verbose=False,
            )

            # stream=True returns a generator.
            # We only have one uploaded image, so process the
            # first result and stop.
            for result in results:

                for box in result.boxes:

                    cls_id = int(box.cls[0])

                    conf = round(
                        float(box.conf[0]),
                        4,
                    )

                    cls_name = (
                        CLASS_NAMES[cls_id]
                        if cls_id < len(CLASS_NAMES)
                        else "unknown"
                    )

                    meta = CLASS_META.get(
                        cls_name,
                        {},
                    )

                    # Convert YOLO coordinates back to the
                    # original uploaded image dimensions.
                    x1, y1, x2, y2 = [
                        round(float(value) * scale, 1)
                        for value, scale in zip(
                            box.xyxy[0],
                            (
                                scale_x,
                                scale_y,
                                scale_x,
                                scale_y,
                            ),
                        )
                    ]

                    detections.append(
                        {
                            "class": cls_name,

                            "material": meta.get(
                                "material",
                                cls_name.title(),
                            ),

                            "waste_category": meta.get(
                                "waste_category",
                                "Unknown",
                            ),

                            "disposal": meta.get(
                                "disposal",
                                "General Waste",
                            ),

                            "confidence": conf,

                            "confidence_pct": (
                                f"{round(conf * 100, 1)}%"
                            ),

                            "co2_saved_kg": meta.get(
                                "co2_per_item",
                                0.0,
                            ),

                            "icon": meta.get(
                                "icon",
                                "♻️",
                            ),

                            "color": meta.get(
                                "color",
                                "#888",
                            ),

                            "tip": meta.get(
                                "tip",
                                "",
                            ),

                            "bbox": {
                                "x1": x1,
                                "y1": y1,
                                "x2": x2,
                                "y2": y2,
                            },
                        }
                    )

                    summary[cls_name] = (
                        summary.get(cls_name, 0) + 1
                    )

                # Only one image is being processed.
                break

            # Explicitly release the generator/result reference.
            del results
            results = None

    finally:

        # Make sure result references are released even if
        # inference raises an exception.
        if results is not None:
            del results

        logger.info(
            "YOLO inference finished in %.1fms",
            (time.time() - inference_started) * 1000,
        )

    logger.info(
        "YOLO inference completed with %d detections",
        len(detections),
    )

    # Highest-confidence detections first.
    detections.sort(
        key=lambda detection: detection["confidence"],
        reverse=True,
    )

    total_co2 = round(
        sum(
            detection["co2_saved_kg"]
            for detection in detections
        ),
        3,
    )

    return {
        "detections": detections,
        "total_detected": len(detections),
        "summary": summary,
        "total_co2_saved": total_co2,
        "demo_mode": False,
    }


# ── DEMO RESPONSE ──────────────────────────────────────────────────────────────

def _demo_response() -> dict:
    """
    Returns a fake result so the frontend can work
    without a model file.
    """

    import random

    cls = random.choice(CLASS_NAMES)
    meta = CLASS_META[cls]

    confidence = round(
        random.uniform(0.6, 0.97),
        4,
    )

    return {
        "detections": [
            {
                "class": cls,

                "material": meta["material"],

                "waste_category": meta["waste_category"],

                "disposal": meta["disposal"],

                "confidence": confidence,

                "confidence_pct": (
                    f"{round(confidence * 100, 1)}%"
                ),

                "co2_saved_kg": meta["co2_per_item"],

                "icon": meta["icon"],

                "color": meta["color"],

                "tip": meta["tip"],

                "bbox": {
                    "x1": 80.0,
                    "y1": 60.0,
                    "x2": 340.0,
                    "y2": 280.0,
                },
            }
        ],

        "total_detected": 1,

        "summary": {
            cls: 1,
        },

        "total_co2_saved": meta["co2_per_item"],

        "demo_mode": True,
    }


# ── ROUTES ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_type": "YOLOv8 object detector",
        "classes": CLASS_NAMES,
        "conf_thresh": CONF_THRESH,
    }


@app.get("/classes")
def get_classes():
    return {
        "classes": [
            {
                "id": index,
                "name": name,
                **CLASS_META.get(name, {}),
            }
            for index, name in enumerate(CLASS_NAMES)
        ]
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
):
    # Validate uploaded file type.
    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=400,
            detail="File must be an image.",
        )

    start = time.time()

    img = None

    try:
        # Decode and resize image.
        img, original_size, resized_size = prepare_image(
            file.file
        )

        logger.info(
            "Received image dimensions=%sx%s "
            "resized_dimensions=%sx%s",
            original_size[0],
            original_size[1],
            resized_size[0],
            resized_size[1],
        )

    except Exception as e:

        logger.error(
            "Failed to read uploaded image: %s",
            e,
        )

        raise HTTPException(
            status_code=400,
            detail="Could not read image.",
        )

    try:
        # Run YOLO inference.
        result = run_detection(
            img,
            original_size,
            resized_size,
        )

        # Add request-level metadata.
        result["inference_ms"] = round(
            (time.time() - start) * 1000,
            1,
        )

        result["filename"] = file.filename

        logger.info(
            "Prediction complete: %d detections in %.1fms",
            result["total_detected"],
            result["inference_ms"],
        )

        return JSONResponse(
            content=result
        )

    except Exception as e:

        logger.exception(
            "Prediction failed: %s",
            e,
        )

        raise HTTPException(
            status_code=500,
            detail="Prediction failed. Please try again.",
        )

    finally:

        # Release PIL image memory.
        if img is not None:
            img.close()

        # Close uploaded file.
        await file.close()


# ── LOCAL ENTRY POINT ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(
            os.getenv(
                "PORT",
                "8000",
            )
        ),
        workers=1,
    )