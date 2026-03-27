# SwanSorts 🦢 — AI Waste Classification

## Quick Start

### Backend
```bash
cd backend && pip install -r requirements.txt
# Put best_model.pt in backend/models/
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.example .env   # add your Supabase keys
npm install && npm run dev
```

See SUPABASE_SETUP.md for the full Supabase guide.

## Pages
- `/auth` — Login / Signup
- `/` — Home
- `/scan` — Upload or webcam scan
- `/dashboard` — Your real CO₂ + waste stats
- `/settings` — Profile photo, edit details, logout
