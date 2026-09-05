"""
SwanSorts — FastAPI Backend
YOLOv8 + ONNX Runtime
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import time
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("swansorts")

MODEL_PATH = "models/best_model.onnx"

CONF_THRESH = 0.25
IMG_SIZE = 416
MAX_IMAGE_DIM = 960
MAX_DETECTIONS = 20


# ============================================================
# Classes
# ============================================================

CLASS_NAMES = [
    "plastic",
    "paper",
    "metal",
    "glass",
    "food",
    "battery",
]


# ============================================================
# Waste metadata
# ============================================================

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


# ============================================================
# Model
# ============================================================

def load_model():
    try:
        from ultralytics import YOLO

        model_instance = YOLO(MODEL_PATH)

        logger.info(
            "ONNX model loaded from %s",
            MODEL_PATH,
        )

        return model_instance

    except FileNotFoundError:
        logger.error(
            "Model not found at %s",
            MODEL_PATH,
        )
        return None

    except Exception as e:
        logger.exception(
            "Failed to load model: %s",
            e,
        )
        return None


model = load_model()


# ============================================================
# FastAPI
# ============================================================

app = FastAPI(
    title="SwanSorts API",
    description=(
        "YOLOv8 waste detection backend using ONNX Runtime"
    ),
    version="3.0.0",
)


# ============================================================
# CORS
# ============================================================

allowed_origins = [
    "https://swan-sorts.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


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


# ============================================================
# Image preparation
# ============================================================

def prepare_image(upload):
    with Image.open(upload) as source:
        original_size = source.size
        image = source.convert("RGB")

    image.thumbnail(
        (MAX_IMAGE_DIM, MAX_IMAGE_DIM),
        Image.Resampling.LANCZOS,
    )

    return image, original_size, image.size


# ============================================================
# Detection
# ============================================================

def run_detection(
    img,
    original_size,
    resized_size,
):
    if model is None:
        raise RuntimeError(
            "ONNX model is not loaded."
        )

    detections = []
    summary = {}

    scale_x = (
        original_size[0]
        / resized_size[0]
    )

    scale_y = (
        original_size[1]
        / resized_size[1]
    )

    inference_started = time.time()

    logger.info(
        "ONNX inference started"
    )

    results = None

    try:

            results = model.predict(
                source=img,
                imgsz=IMG_SIZE,
                device="cpu",
                conf=CONF_THRESH,
                max_det=MAX_DETECTIONS,
                stream=True,
                save=False,
                save_txt=False,
                save_conf=False,
                augment=False,
                verbose=False,
            )

            for result in results:

                for box in result.boxes:

                    cls_id = int(
                        box.cls[0]
                    )

                    conf = round(
                        float(box.conf[0]),
                        4,
                    )

                    cls_name = (
                        CLASS_NAMES[cls_id]
                        if cls_id
                        < len(CLASS_NAMES)
                        else "unknown"
                    )

                    meta = CLASS_META.get(
                        cls_name,
                        {},
                    )

                    x1, y1, x2, y2 = [
                        round(
                            float(value)
                            * scale,
                            1,
                        )
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
                        summary.get(
                            cls_name,
                            0,
                        )
                        + 1
                    )

                # stream=True:
                # process only the first result
                break

            del results
            results = None

    finally:

        if results is not None:
            del results

        logger.info(
            "ONNX inference finished in %.1fms",
            (
                time.time()
                - inference_started
            )
            * 1000,
        )

    logger.info(
        "ONNX inference completed with %d detections",
        len(detections),
    )

    detections.sort(
        key=lambda detection: detection[
            "confidence"
        ],
        reverse=True,
    )

    total_co2 = round(
        sum(
            detection[
                "co2_saved_kg"
            ]
            for detection in detections
        ),
        3,
    )

    return {
        "detections": detections,
        "total_detected": len(
            detections
        ),
        "summary": summary,
        "total_co2_saved": total_co2,
        "demo_mode": False,
    }


# ============================================================
# Health
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_type": (
            "YOLOv8 ONNX object detector"
        ),
        "classes": CLASS_NAMES,
        "conf_thresh": CONF_THRESH,
    }


# ============================================================
# Classes
# ============================================================

@app.get("/classes")
def get_classes():
    return {
        "classes": [
            {
                "id": index,
                "name": name,
                **CLASS_META.get(
                    name,
                    {},
                ),
            }
            for index, name in enumerate(
                CLASS_NAMES
            )
        ]
    }


# ============================================================
# Prediction
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
):
    if (
        not file.content_type
        or not file.content_type.startswith(
            "image/"
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="File must be an image.",
        )

    start = time.time()

    img = None

    try:

        (
            img,
            original_size,
            resized_size,
        ) = prepare_image(
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

        result = run_detection(
            img,
            original_size,
            resized_size,
        )

        result["inference_ms"] = round(
            (
                time.time()
                - start
            )
            * 1000,
            1,
        )

        result["filename"] = (
            file.filename
        )

        logger.info(
            "Prediction complete: "
            "%d detections in %.1fms",
            result[
                "total_detected"
            ],
            result[
                "inference_ms"
            ],
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
            detail=(
                "Prediction failed. "
                "Please try again."
            ),
        )

    finally:

        if img is not None:
            img.close()

        await file.close()


# ============================================================
# Local entry point
# ============================================================

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