# 🦢 SwanSorts

### AI-Powered Waste Classification & Recycling Assistant

SwanSorts is a full-stack AI application that uses computer vision to detect and classify waste from images. It identifies common waste materials, visualises detected objects with bounding boxes and confidence scores, and provides disposal guidance along with an estimated CO₂ savings value.

The application combines a custom-trained YOLOv8 object detection model with a FastAPI backend and React frontend. For production deployment, the YOLOv8 model is exported to ONNX and served using ONNX Runtime for lightweight CPU-based inference.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=flat-square&logo=vercel)](https://swan-sorts.vercel.app)
[![Backend](https://img.shields.io/badge/API-Render-00e87a?style=flat-square)](https://swansorts.onrender.com)
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber?style=flat-square)](LICENSE)

---

## What is SwanSorts?

SwanSorts helps users identify waste materials through image-based object detection and provides guidance on how each detected item should be disposed of.

A user can upload an image or capture one through the camera. The image is sent to a FastAPI backend where it is preprocessed and passed through a custom-trained YOLOv8 model running through ONNX Runtime.

The backend returns the detected objects, confidence scores, bounding boxes, material summary, and estimated CO₂ savings. The React frontend then visualises the results and provides recycling information for each detected material.

The application currently recognises six waste categories:

- Plastic
- Paper
- Metal
- Glass
- Food
- Battery

---

## Why Waste Classification Matters

Improper waste segregation makes recycling and waste processing significantly more difficult.

Different materials require different handling processes:

| Material | Recommended Handling |
|---|---|
| **Plastic** | Plastic recycling |
| **Paper** | Paper recycling |
| **Metal** | Metal recycling |
| **Glass** | Glass recycling |
| **Food** | Compost / organic waste |
| **Battery** | Battery collection / special waste |

SwanSorts is designed to make this information accessible at the point where waste is being sorted.

The application combines automated visual classification with simple disposal guidance so users can make faster and more informed sorting decisions.

---

## Key Features

- **AI waste detection**: identifies multiple waste objects within a single image
- **Six waste categories**: plastic, paper, metal, glass, food, and battery
- **YOLOv8 object detection**: custom-trained computer vision model for waste detection
- **ONNX Runtime inference**: production inference without loading the full PyTorch runtime
- **Bounding-box visualisation**: displays detected objects directly over the uploaded image
- **Confidence scores**: shows the model's confidence for each detection
- **Class-aware NMS**: removes overlapping detections while preserving separate waste classes
- **Disposal recommendations**: provides recycling or disposal guidance for each material
- **CO₂ savings estimate**: calculates an estimated environmental impact based on detected materials
- **Camera scanning**: supports capturing waste images directly from the browser
- **Supabase authentication**: user authentication and application data management
- **Scan history**: stores completed scans for authenticated users
- **Interactive dashboard**: presents scan and sustainability information
- **Cloud deployment**: React frontend deployed on Vercel and FastAPI backend deployed on Render

---

## How SwanSorts Works

```text
                  Image
                    ↓
          Upload / Camera Capture
                    ↓
             React Frontend
                    ↓
              POST /predict
                    ↓
             FastAPI Backend
                    ↓
          Image Preprocessing
                    ↓
          YOLO Letterboxing
                    ↓
            ONNX Runtime
                    ↓
          YOLOv8 Inference
                    ↓
       Confidence Filtering
                    ↓
        Class-aware NMS
                    ↓
        Bounding Box Decoding
                    ↓
          Detection Results
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
   React Results          CO₂ Calculation
        ↓                       ↓
  Disposal Guidance       Sustainability Data
```

The backend handles image preprocessing, model inference, output decoding, non-maximum suppression, coordinate transformation, and CO₂ estimation.

The frontend is responsible for image capture, visualisation, user interaction, and presentation of the returned results.

---

## AI Model

SwanSorts uses a custom-trained YOLOv8 object detection model.

The model contains six classes:

| Class ID | Category |
|---|---|
| `0` | Plastic |
| `1` | Paper |
| `2` | Metal |
| `3` | Glass |
| `4` | Food |
| `5` | Battery |

The original trained model was stored as a PyTorch `.pt` model and exported to ONNX for production deployment.

```text
YOLOv8 trained model
        ↓
best_model.pt
        ↓
ONNX export
        ↓
best_model.onnx
        ↓
ONNX Runtime
        ↓
CPU inference
```

The production backend uses `onnxruntime` with the `CPUExecutionProvider`.

This avoids loading the full PyTorch inference stack during production inference and significantly reduces memory requirements for deployment on a constrained cloud instance.

---

## Image Processing Pipeline

Before inference, SwanSorts applies several preprocessing steps.

### 1. Image validation

The API verifies that the uploaded file is an image and loads it using Pillow.

### 2. Image resizing

Large images are resized so that their largest dimension does not exceed:

```text
960 pixels
```

This prevents unnecessarily large images from consuming excessive backend memory.

### 3. Letterboxing

The image is resized while preserving its aspect ratio and padded to:

```text
416 × 416
```

using YOLO-style letterboxing.

### 4. Normalisation

Pixel values are converted from:

```text
0–255
```

to:

```text
0–1
```

and the image is converted from HWC to CHW format before being passed to ONNX Runtime.

### 5. Model inference

ONNX Runtime performs CPU-based inference using the exported YOLOv8 model.

### 6. Output decoding

The model output is converted from:

```text
center_x, center_y, width, height
```

to:

```text
x1, y1, x2, y2
```

Bounding boxes are then transformed back to the original image coordinate system.

### 7. Non-Maximum Suppression

Class-aware NMS removes overlapping detections using an IoU threshold of:

```text
0.45
```

The maximum number of returned detections is:

```text
20
```

---

## CO₂ Savings

SwanSorts calculates an estimated CO₂ savings value based on the detected material.

The current application-level estimates are:

| Material | Estimated CO₂ Saved |
|---|---:|
| Plastic | 0.50 kg |
| Paper | 0.25 kg |
| Metal | 1.00 kg |
| Glass | 0.50 kg |
| Food | 0.25 kg |
| Battery | 0.50 kg |

For example, a scan containing:

```text
6 × Metal
2 × Plastic
1 × Glass
```

produces:

```text
6 × 1.00 kg  = 6.00 kg
2 × 0.50 kg  = 1.00 kg
1 × 0.50 kg  = 0.50 kg
                     ─────
                     7.50 kg
```

The CO₂ value is an application-level estimate intended to communicate the potential environmental impact of correct waste sorting. It should not be interpreted as a scientifically precise lifecycle assessment.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                         SwanSorts                            │
│                                                              │
│  ┌────────────────────┐        ┌─────────────────────────┐  │
│  │   React Frontend   │        │     FastAPI Backend     │  │
│  │                    │        │                         │  │
│  │  Image Upload      │ ─────► │  Image Validation       │  │
│  │  Camera Capture    │        │  Preprocessing           │  │
│  │  Scan UI           │        │  ONNX Runtime            │  │
│  │  Result Cards      │ ◄───── │  YOLOv8 Inference        │  │
│  │  Dashboard         │        │  NMS                     │  │
│  └────────────────────┘        │  CO₂ Calculation         │  │
│             │                  └─────────────────────────┘  │
│             │                              │                 │
│             ↓                              ↓                 │
│       ┌───────────┐                  ┌───────────┐          │
│       │ Supabase  │                  │  ONNX     │          │
│       │ Auth/Data │                  │  Model    │          │
│       └───────────┘                  └───────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Frontend → Vercel
Backend  → Render
Database → Supabase
```

---

## Project Structure

```text
SwanSorts/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   ├── ScanFrame.jsx
│   │   │   ├── SwanOrbit.jsx
│   │   │   └── Footer.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Auth.jsx
│   │   │   ├── Scan.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Settings.jsx
│   │   │
│   │   ├── hooks/
│   │   │   └── usePredict.js
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   └── lib/
│   │       └── supabase.js
│   │
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   │
│   └── models/
│       └── best_model.onnx
│
├── .gitignore
└── README.md
```

---

## Frontend

The frontend is built with React and Vite and provides the user-facing interface for scanning waste.

### Features

- **Image upload** — upload waste images directly from the device
- **Camera capture** — capture an image using the browser camera
- **Detection overlay** — renders bounding boxes over detected waste
- **Confidence display** — displays detection confidence percentages
- **Result cards** — shows material type, disposal method, and environmental information
- **Animated interface** — Framer Motion animations throughout the application
- **Authentication** — Supabase-powered authentication
- **Dashboard** — displays user scan information
- **Responsive interface** — designed for desktop and mobile usage

### Live URL

```text
https://swan-sorts.vercel.app
```

---

## API Connection

The frontend communicates with the FastAPI backend using the `VITE_API_URL` environment variable.

Production:

```text
VITE_API_URL=https://swansorts.onrender.com
```

The scan endpoint is called using:

```javascript
const formData = new FormData()

formData.append("file", imageFile)

const response = await fetch(
  `${import.meta.env.VITE_API_URL}/predict`,
  {
    method: "POST",
    body: formData
  }
)

const result = await response.json()
```

The frontend uses the returned detection data to render bounding boxes and result cards.

---

## Backend API

### Base URL

```text
https://swansorts.onrender.com
```

The backend is built using FastAPI and deployed on Render.

---

### GET `/`

Returns basic API information.

```json
{
  "message": "SwanSorts API is running",
  "docs": "/docs",
  "health": "/health"
}
```

---

### GET `/health`

Returns the backend health status.

```json
{
  "status": "ok",
  "model": "best_model.onnx",
  "inference": "onnxruntime"
}
```

---

### POST `/predict`

Accepts an image and performs waste detection.

#### Request

```text
multipart/form-data

file = waste.jpg
```

#### Response

```json
{
  "success": true,
  "filename": "waste.jpg",
  "total_detected": 9,
  "detections": [
    {
      "class_id": 2,
      "class_name": "metal",
      "confidence": 0.858,
      "bbox": [
        120.5,
        230.1,
        410.2,
        580.7
      ]
    }
  ],
  "summary": {
    "metal": 6,
    "plastic": 2,
    "glass": 1
  },
  "total_co2_saved": 7.5,
  "demo_mode": false,
  "inference_ms": 1000.5
}
```

Each detection contains:

| Field | Description |
|---|---|
| `class_id` | Numeric model class |
| `class_name` | Detected material |
| `confidence` | Model confidence from 0–1 |
| `bbox` | `[x1, y1, x2, y2]` bounding box |

---

## Example Detection

For an image containing multiple waste objects, SwanSorts can return multiple detections from a single image.

Example:

```text
9 objects detected

Metal     87%
Metal     84%
Metal     81%
Metal     62%
Plastic   57%
Glass     56%
Plastic   50%
Metal     48%
Metal     36%
```

The frontend visualises these detections directly on the original image.

The actual number and classes depend on the uploaded image.

---

## Installation

### Prerequisites

- Node.js 18+
- Python 3.10+
- Git

### Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd SwanSorts
```

---

## Frontend Setup

```bash
cd frontend
npm install
```

Create:

```text
frontend/.env
```

Add:

```env
VITE_API_URL=http://localhost:8000
```

Run the development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

---

## Backend Setup

From the project root:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Start the API

```bash
uvicorn main:app --reload
```

The API will be available at:

```text
http://localhost:8000
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

---

## Requirements

The production backend uses:

```text
fastapi
uvicorn
python-multipart
onnxruntime
onnx
numpy
Pillow
```

The YOLOv8 model is exported to ONNX before production deployment.

---

## Production Deployment

### Frontend — Vercel

The React/Vite frontend is deployed on Vercel.

```text
https://swan-sorts.vercel.app
```

Production API configuration:

```env
VITE_API_URL=https://swansorts.onrender.com
```

### Backend — Render

The FastAPI backend is deployed on Render.

```text
https://swansorts.onrender.com
```

Production start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

The production inference engine uses:

```text
ONNX Runtime
CPUExecutionProvider
```

The backend was optimised to avoid loading the original PyTorch model during production inference, helping keep memory usage within the limits of the cloud deployment environment.

---

## Performance

The production backend processes inference using ONNX Runtime on CPU.

A representative scan containing multiple waste objects produced:

```text
Detections: 9
Inference time: ~1 second
```

Actual response time can vary depending on:

- Image size
- Render cold starts
- CPU availability
- Network latency
- Image preprocessing time

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| UI Animation | Framer Motion |
| Backend API | FastAPI, Uvicorn |
| Computer Vision | YOLOv8 |
| Model Format | ONNX |
| Model Runtime | ONNX Runtime |
| Image Processing | Pillow, NumPy |
| Authentication | Supabase |
| Database | Supabase |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Limitations and Current Scope

- **Six waste classes** — currently limited to plastic, paper, metal, glass, food, and battery
- **Model-dependent accuracy** — prediction quality depends on the training dataset, image quality, lighting, object size, and camera angle
- **Estimated CO₂ values** — environmental impact values are application-level estimates rather than a full lifecycle assessment
- **CPU inference** — production inference currently uses ONNX Runtime on CPU
- **Cloud cold starts** — the backend may experience increased response time after periods of inactivity depending on the hosting instance
- **Image-based detection** — the current system processes captured or uploaded images rather than continuous video inference
- **Geographic disposal guidance** — disposal recommendations are currently general and are not location-specific

---

## Planned Improvements

- Improve model accuracy with a larger and more diverse waste dataset
- Add additional waste categories
- Introduce real-time camera detection
- Improve small-object detection
- Add location-aware disposal recommendations
- Improve environmental impact calculations
- Add model performance metrics and evaluation reports
- Add richer scan analytics to the dashboard
- Improve mobile camera experience
- Add multilingual disposal guidance

---

## Contributing

Pull requests are welcome.

For major changes, please open an issue first to discuss what you would like to change.

```bash
git checkout -b feat/my-feature
git add .
git commit -m "feat: describe your change"
git push origin feat/my-feature
```

Then open a pull request.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

**Manvi Garg**

SwanSorts is a portfolio project combining computer vision, full-stack web development, REST APIs, cloud deployment, authentication, and sustainability-focused product design.
