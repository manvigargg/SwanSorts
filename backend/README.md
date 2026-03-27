# SwanSorts — Backend API 🦢

FastAPI backend that serves your PyTorch waste classification model.

---

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Add your model
```
swansorts_backend/
├── main.py
├── requirements.txt
└── models/
    └── best_model.pt   ← place your model here
```

### 3. Update CLASS_NAMES
Open `main.py` and update this list to match your training classes **in the exact same order** as your dataset folders:
```python
CLASS_NAMES = [
    "cardboard",
    "glass",
    "metal",
    ...
]
```

### 4. Run the server
```bash
uvicorn main:app --reload --port 8000
```
Visit http://localhost:8000/docs for the interactive Swagger UI.

---

## API Endpoints

| Method | Endpoint   | Description                        |
|--------|------------|------------------------------------|
| GET    | /health    | Check server + model status        |
| GET    | /classes   | List all waste classes + metadata  |
| POST   | /predict   | Upload image → get classification  |

---

## POST /predict

Send a multipart form with an image file:

```js
// From your SwanSorts frontend
const formData = new FormData();
formData.append("file", imageFile);

const res = await fetch("http://localhost:8000/predict", {
  method: "POST",
  body: formData,
});
const result = await res.json();
```

### Response
```json
{
  "class": "plastic",
  "confidence": 0.9732,
  "confidence_pct": "97.3%",
  "category": "Recyclable",
  "disposal": "Plastic Bin",
  "co2_saved": 0.6,
  "color": "cyan",
  "demo_mode": false,
  "inference_ms": 42.1,
  "filename": "bottle.jpg"
}
```

---

## Model Notes

- Default input size: **224×224** (ImageNet standard)
- If your Colab used a different size, update `IMG_SIZE` in `main.py`
- Normalization uses ImageNet defaults — update `mean` and `std` in `transform` if you used custom values
- Supports both **full model** save (`torch.save(model, path)`) and **state dict** save (`torch.save(model.state_dict(), path)`) — see comments in `load_model()`

---

## Connecting to SwanSorts Frontend

In your HTML, replace the mock `doScan()` function with a real fetch call:

```js
async function doScan(imageBlob) {
  const formData = new FormData();
  formData.append("file", imageBlob, "scan.jpg");

  const res = await fetch("http://localhost:8000/predict", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  // data.class, data.category, data.confidence_pct, data.co2_saved
  showResult(data);
}
```

---

## Deploying (optional)

Once ready to go live, host on **Railway**, **Render**, or **Fly.io** — all free tiers available.
Then swap `http://localhost:8000` in the frontend with your live URL.
