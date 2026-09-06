import io
import logging
import time
from collections import Counter

import numpy as np
import onnxruntime as ort
from PIL import Image
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

MODEL_PATH = "models/best_model.onnx"

CONF_THRESH = 0.25
IOU_THRESH = 0.45
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
# ONNX Runtime
# ---------------------------------------------------------

session_options = ort.SessionOptions()

# Keep CPU memory usage controlled.
session_options.intra_op_num_threads = 1
session_options.inter_op_num_threads = 1
session_options.graph_optimization_level = (
    ort.GraphOptimizationLevel.ORT_ENABLE_ALL
)

session = ort.InferenceSession(
    MODEL_PATH,
    sess_options=session_options,
    providers=["CPUExecutionProvider"],
)

input_name = session.get_inputs()[0].name

logger.info(
    "ONNX model loaded from %s",
    MODEL_PATH,
)

logger.info(
    "ONNX Runtime providers: %s",
    session.get_providers(),
)

logger.info(
    "ONNX input name: %s",
    input_name,
)


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
# Letterbox preprocessing
# ---------------------------------------------------------

def letterbox_image(image: Image.Image, new_shape=(416, 416)):
    """
    Resize image while preserving aspect ratio and pad to the
    requested YOLO input size.

    Returns:
        padded image
        scale
        padding_x
        padding_y
    """

    image = image.convert("RGB")

    original_width, original_height = image.size

    new_width, new_height = new_shape

    scale = min(
        new_width / original_width,
        new_height / original_height,
    )

    resized_width = int(round(original_width * scale))
    resized_height = int(round(original_height * scale))

    resized = image.resize(
        (resized_width, resized_height),
        Image.Resampling.LANCZOS,
    )

    # YOLO-style padding.
    pad_width = new_width - resized_width
    pad_height = new_height - resized_height

    left = pad_width // 2
    top = pad_height // 2

    padded = Image.new(
        "RGB",
        (new_width, new_height),
        (114, 114, 114),
    )

    padded.paste(
        resized,
        (left, top),
    )

    return (
        padded,
        scale,
        left,
        top,
    )


# ---------------------------------------------------------
# NMS
# ---------------------------------------------------------

def calculate_iou(box, boxes):
    """
    Calculate IoU between one box and an array of boxes.
    """

    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])

    intersection_width = np.maximum(
        0.0,
        x2 - x1,
    )

    intersection_height = np.maximum(
        0.0,
        y2 - y1,
    )

    intersection = (
        intersection_width
        * intersection_height
    )

    area_box = max(
        0.0,
        box[2] - box[0],
    ) * max(
        0.0,
        box[3] - box[1],
    )

    area_boxes = np.maximum(
        0.0,
        boxes[:, 2] - boxes[:, 0],
    ) * np.maximum(
        0.0,
        boxes[:, 3] - boxes[:, 1],
    )

    union = (
        area_box
        + area_boxes
        - intersection
        + 1e-7
    )

    return intersection / union


def non_max_suppression(
    boxes,
    scores,
    class_ids,
    iou_threshold=0.45,
    max_det=20,
):
    """
    Class-aware Non-Maximum Suppression.
    """

    if len(boxes) == 0:
        return []

    boxes = np.asarray(
        boxes,
        dtype=np.float32,
    )

    scores = np.asarray(
        scores,
        dtype=np.float32,
    )

    class_ids = np.asarray(
        class_ids,
        dtype=np.int32,
    )

    keep = []

    # Perform NMS independently for each class.
    for class_id in np.unique(class_ids):

        class_indices = np.where(
            class_ids == class_id
        )[0]

        class_indices = class_indices[
            np.argsort(
                scores[class_indices]
            )[::-1]
        ]

        while len(class_indices) > 0:

            current = class_indices[0]

            keep.append(current)

            if len(keep) >= max_det:
                break

            if len(class_indices) == 1:
                break

            remaining = class_indices[1:]

            ious = calculate_iou(
                boxes[current],
                boxes[remaining],
            )

            class_indices = remaining[
                ious < iou_threshold
            ]

        if len(keep) >= max_det:
            break

    # Sort final detections by confidence.
    keep = sorted(
        keep,
        key=lambda index: float(scores[index]),
        reverse=True,
    )

    return keep[:max_det]


# ---------------------------------------------------------
# YOLO output decoding
# ---------------------------------------------------------

def decode_yolo_output(
    output,
    original_width,
    original_height,
    scale,
    pad_x,
    pad_y,
):
    """
    Decode standard YOLOv8 ONNX output.

    Expected output is typically:
        (1, 4 + num_classes, num_predictions)

    or:
        (1, num_predictions, 4 + num_classes)
    """

    output = np.asarray(
        output,
        dtype=np.float32,
    )

    # Remove batch dimension.
    if output.ndim == 3:
        output = output[0]

    if output.ndim != 2:
        raise ValueError(
            f"Unexpected ONNX output shape: {output.shape}"
        )

    # YOLOv8 normally outputs:
    # [4 + classes, predictions]
    #
    # For 6 classes:
    # [10, predictions]
    if output.shape[0] <= 128:
        predictions = output.T
    else:
        predictions = output

    if predictions.shape[1] < 5:
        raise ValueError(
            f"Unexpected YOLO prediction shape: "
            f"{predictions.shape}"
        )

    # First four values:
    # center_x, center_y, width, height
    boxes_xywh = predictions[:, :4]

    # Remaining values are class confidence scores.
    class_scores = predictions[:, 4:]

    # Best class per prediction.
    class_ids = np.argmax(
        class_scores,
        axis=1,
    )

    scores = class_scores[
        np.arange(
            class_scores.shape[0]
        ),
        class_ids,
    ]

    # Confidence filtering.
    valid = scores >= CONF_THRESH

    if not np.any(valid):
        return []

    boxes_xywh = boxes_xywh[valid]
    scores = scores[valid]
    class_ids = class_ids[valid]

    # Convert xywh → xyxy.
    x_center = boxes_xywh[:, 0]
    y_center = boxes_xywh[:, 1]

    width = boxes_xywh[:, 2]
    height = boxes_xywh[:, 3]

    x1 = x_center - width / 2
    y1 = y_center - height / 2
    x2 = x_center + width / 2
    y2 = y_center + height / 2

    boxes = np.stack(
        [
            x1,
            y1,
            x2,
            y2,
        ],
        axis=1,
    )

    # Remove letterbox padding.
    boxes[:, [0, 2]] -= pad_x
    boxes[:, [1, 3]] -= pad_y

    # Convert from model-space back to original image-space.
    boxes /= scale

    # Clip to original image dimensions.
    boxes[:, [0, 2]] = np.clip(
        boxes[:, [0, 2]],
        0,
        original_width,
    )

    boxes[:, [1, 3]] = np.clip(
        boxes[:, [1, 3]],
        0,
        original_height,
    )

    # NMS.
    keep = non_max_suppression(
        boxes,
        scores,
        class_ids,
        iou_threshold=IOU_THRESH,
        max_det=MAX_DETECTIONS,
    )

    detections = []

    for index in keep:

        class_id = int(
            class_ids[index]
        )

        class_name = CLASS_NAMES.get(
            class_id,
            f"class_{class_id}",
        )

        detections.append(
            {
                "class_id": class_id,
                "class_name": class_name,
                "confidence": round(
                    float(scores[index]),
                    4,
                ),
                "bbox": [
                    round(
                        float(boxes[index][0]),
                        2,
                    ),
                    round(
                        float(boxes[index][1]),
                        2,
                    ),
                    round(
                        float(boxes[index][2]),
                        2,
                    ),
                    round(
                        float(boxes[index][3]),
                        2,
                    ),
                ],
            }
        )

    return detections


# ---------------------------------------------------------
# Detection
# ---------------------------------------------------------

def run_detection(image: Image.Image):

    image = image.convert("RGB")

    original_width, original_height = image.size

    # Prevent extremely large uploads from consuming excessive RAM.
    if max(original_width, original_height) > MAX_IMAGE_DIM:

        resize_scale = (
            MAX_IMAGE_DIM
            / max(
                original_width,
                original_height,
            )
        )

        resized_width = int(
            original_width * resize_scale
        )

        resized_height = int(
            original_height * resize_scale
        )

        image = image.resize(
            (
                resized_width,
                resized_height,
            ),
            Image.Resampling.LANCZOS,
        )

    working_width, working_height = image.size

    logger.info(
        "Received image dimensions=%sx%s "
        "resized_dimensions=%sx%s",
        original_width,
        original_height,
        working_width,
        working_height,
    )

    # -----------------------------------------------------
    # Letterbox
    # -----------------------------------------------------

    input_image, scale, pad_x, pad_y = (
        letterbox_image(
            image,
            (IMG_SIZE, IMG_SIZE),
        )
    )

    # -----------------------------------------------------
    # Convert to NumPy
    # -----------------------------------------------------

    input_array = np.asarray(
        input_image,
        dtype=np.float32,
    )

    # RGB → CHW
    input_array = input_array.transpose(
        2,
        0,
        1,
    )

    # Normalize 0-255 → 0-1
    input_array /= 255.0

    # Add batch dimension.
    input_array = np.expand_dims(
        input_array,
        axis=0,
    )

    # -----------------------------------------------------
    # Inference
    # -----------------------------------------------------

    logger.info(
        "ONNX inference started"
    )

    start_time = time.perf_counter()

    outputs = session.run(
        None,
        {
            input_name: input_array,
        },
    )

    inference_ms = (
        time.perf_counter()
        - start_time
    ) * 1000

    logger.info(
        "ONNX inference completed in %.1f ms",
        inference_ms,
    )

    # -----------------------------------------------------
    # Decode
    # -----------------------------------------------------

    detections = decode_yolo_output(
        outputs[0],
        working_width,
        working_height,
        scale,
        pad_x,
        pad_y,
    )

    # If the image itself was downscaled before letterboxing,
    # scale the boxes back to the original image dimensions.
    if (
        working_width != original_width
        or working_height != original_height
    ):

        scale_x = (
            original_width
            / working_width
        )

        scale_y = (
            original_height
            / working_height
        )

        for detection in detections:

            bbox = detection["bbox"]

            bbox[0] *= scale_x
            bbox[1] *= scale_y
            bbox[2] *= scale_x
            bbox[3] *= scale_y

            detection["bbox"] = [
                round(float(bbox[0]), 2),
                round(float(bbox[1]), 2),
                round(float(bbox[2]), 2),
                round(float(bbox[3]), 2),
            ]

    # -----------------------------------------------------
    # Summary
    # -----------------------------------------------------

    summary_counter = Counter(
        detection["class_name"]
        for detection in detections
    )

    summary = dict(summary_counter)

    # -----------------------------------------------------
    # CO2
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
async def predict(
    file: UploadFile = File(...)
):

    start_time = time.perf_counter()

    try:

        # -------------------------------------------------
        # Validate file
        # -------------------------------------------------

        if (
            not file.content_type
            or not file.content_type.startswith(
                "image/"
            )
        ):
            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "Please upload a valid "
                        "image file."
                    )
                },
            )

        # -------------------------------------------------
        # Read file
        # -------------------------------------------------

        contents = await file.read()

        if not contents:
            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "Uploaded file is empty."
                    )
                },
            )

        # -------------------------------------------------
        # Open image
        # -------------------------------------------------

        image = Image.open(
            io.BytesIO(contents)
        )

        image.load()

        # -------------------------------------------------
        # Detection
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
            time.perf_counter()
            - start_time
        ) * 1000

        logger.info(
            "Prediction completed: "
            "detections=%s inference_ms=%.1f "
            "total_ms=%.1f",
            total_detected,
            inference_ms,
            total_request_ms,
        )

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