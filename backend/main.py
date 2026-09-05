import os

# Prevent Ultralytics from attempting to install dependencies at runtime.
# All dependencies are installed during the Render build.
os.environ["YOLO_AUTOINSTALL"] = "false"

import io
import logging
import time
from collections import Counter

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from ultralytics import YOLO


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

MODEL_PATH = "models/best_model.onnx"

CONF_THRESH = 0.25
IMG_SIZE = 416
MAX_IMAGE_DIM = 960
MAX_DETECTIONS = 20

CLASS_NAMES = {
    0: "plastic",
    1: "paper",
    2: "metal",
    3: "glass",
    4: "food",
    5: "battery",
}

CO2_SAVED_PER_ITEM = {
    "plastic": 0.50,
    "paper": 0.25,
    "metal": 1.00,
    "glass": 0.50,
    "food": 0.25,
    "battery": 0.50,
}


# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("swansorts")


# ---------------------------------------------------------
# FastAPI
# ---------------------------------------------------------

app = FastAPI(
    title="SwanSorts API",
    version="1.0.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

allowed_origins = [
    "https://swan-sorts.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Load ONNX model
# ---------------------------------------------------------

try:
    model = YOLO(MODEL_PATH)
    logger.info("ONNX model loaded from %s", MODEL_PATH)
except Exception:
    logger.exception("Failed to load ONNX model")
    raise


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "best_model.onnx",
        "inference": "onnxruntime",
    }


# ---------------------------------------------------------
# Image preprocessing
# ---------------------------------------------------------

def prepare_image(image: Image.Image):
    """
    Convert the uploaded image to RGB and resize it so that
    the largest dimension is MAX_IMAGE_DIM while preserving
    the original aspect ratio.
    """

    image = image.convert("RGB")

    original_width, original_height = image.size

    scale = min(
        1.0,
        MAX_IMAGE_DIM / max(original_width, original_height),
    )

    if scale < 1.0:
        new_width = int(original_width * scale)
        new_height = int(original_height * scale)

        image = image.resize(
            (new_width, new_height),
            Image.Resampling.LANCZOS,
        )

    return image, original_width, original_height


# ---------------------------------------------------------
# Detection
# ---------------------------------------------------------

def run_detection(image: Image.Image):
    """
    Run YOLO inference using the ONNX model through Ultralytics.
    """

    image, original_width, original_height = prepare_image(image)

    logger.info(
        "Received image dimensions=%sx%s resized_dimensions=%sx%s",
        original_width,
        original_height,
        image.width,
        image.height,
    )

    logger.info("ONNX inference started")

    start_time = time.perf_counter()

    results = model.predict(
        source=image,
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

    # Only one image is supplied, so retrieve the first result.
    result = next(iter(results))

    inference_ms = (
        time.perf_counter() - start_time
    ) * 1000

    logger.info(
        "ONNX inference completed in %.1f ms",
        inference_ms,
    )

    detections = []

    if result.boxes is not None and len(result.boxes) > 0:

        boxes = result.boxes.xyxy.cpu().tolist()
        confidences = result.boxes.conf.cpu().tolist()
        class_ids = result.boxes.cls.cpu().tolist()

        resized_width, resized_height = image.size

        scale_x = original_width / resized_width
        scale_y = original_height / resized_height

        for box, confidence, class_id in zip(
            boxes,
            confidences,
            class_ids,
        ):
            x1, y1, x2, y2 = box

            # Scale coordinates back to the original image.
            x1 *= scale_x
            x2 *= scale_x
            y1 *= scale_y
            y2 *= scale_y

            class_id = int(class_id)

            class_name = CLASS_NAMES.get(
                class_id,
                f"class_{class_id}",
            )

            detections.append(
                {
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": round(
                        float(confidence),
                        4,
                    ),
                    "bbox": [
                        round(float(x1), 2),
                        round(float(y1), 2),
                        round(float(x2), 2),
                        round(float(y2), 2),
                    ],
                }
            )

    # Highest confidence first.
    detections.sort(
        key=lambda detection: detection["confidence"],
        reverse=True,
    )

    # -----------------------------------------------------
    # Summary
    # -----------------------------------------------------

    summary_counter = Counter(
        detection["class_name"]
        for detection in detections
    )

    summary = dict(summary_counter)

    # -----------------------------------------------------
    # CO2 calculation
    # -----------------------------------------------------

    total_co2_saved = sum(
        CO2_SAVED_PER_ITEM.get(
            detection["class_name"],
            0.0,
        )
        for detection in detections
    )

    total_detected = len(detections)

    logger.info(
        "ONNX inference completed with %s detections",
        total_detected,
    )

    return (
        detections,
        total_detected,
        summary,
        round(total_co2_saved, 2),
        False,
        round(inference_ms, 1),
    )


# ---------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):

    start_time = time.perf_counter()

    try:

        # -------------------------------------------------
        # Validate file
        # -------------------------------------------------

        if (
            not file.content_type
            or not file.content_type.startswith("image/")
        ):
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Please upload a valid image file."
                },
            )

        # -------------------------------------------------
        # Read image
        # -------------------------------------------------

        contents = await file.read()

        if not contents:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Uploaded file is empty."
                },
            )

        image = Image.open(
            io.BytesIO(contents)
        )

        # Force image decoding before inference.
        image.load()

        # -------------------------------------------------
        # Run detection
        # -------------------------------------------------

        (
            detections,
            total_detected,
            summary,
            total_co2_saved,
            demo_mode,
            inference_ms,
        ) = run_detection(image)

        total_request_ms = (
            time.perf_counter() - start_time
        ) * 1000

        logger.info(
            "Prediction completed: detections=%s "
            "inference_ms=%.1f total_ms=%.1f",
            total_detected,
            inference_ms,
            total_request_ms,
        )

        # -------------------------------------------------
        # Response
        # -------------------------------------------------

        return {
            "success": True,
            "filename": file.filename,
            "total_detected": total_detected,
            "detections": detections,
            "summary": summary,
            "total_co2_saved": total_co2_saved,
            "demo_mode": demo_mode,
            "inference_ms": inference_ms,
        }

    except Exception as exc:

        logger.exception(
            "Prediction failed"
        )

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(exc),
            },
        )


# ---------------------------------------------------------
# Root
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "SwanSorts API is running",
        "docs": "/docs",
        "health": "/health",
    }