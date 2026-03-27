# SwanSorts — Supabase Setup Guide 🦢

Follow these steps once to connect your app to Supabase.

---

## Step 1 — Create a Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**
3. Give it a name: `swansorts`
4. Choose a region close to India (e.g. Singapore)
5. Set a strong database password → **Save it**
6. Wait ~2 minutes for the project to be ready

---

## Step 2 — Run the database setup SQL

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase_setup.sql` from this folder
4. Copy and paste the entire contents into the editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see: *"Success. No rows returned"*

This creates:
- `profiles` table — stores name, phone, city, avatar per user
- `scans` table — stores every waste detection with CO₂ data
- Row Level Security — users only ever see their own data
- `avatars` storage bucket — for profile photos

---

## Step 3 — Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon / public key** → long string starting with `eyJ...`

---

## Step 4 — Add keys to your frontend

1. In the `frontend/` folder, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste your values:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON=eyJhbGci...your_anon_key
   ```

---

## Step 5 — Enable Email Auth

1. In Supabase, go to **Authentication → Providers**
2. Make sure **Email** is enabled (it is by default)
3. Optional: turn off **Confirm email** while testing so you can log in instantly without verifying

---

## Step 6 — Run the app

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — you should see the SwanSorts login page!

---

## Troubleshooting

**"Invalid API key"** — double-check your `.env` values, make sure there are no spaces

**"Row violates RLS policy"** — make sure you ran the full `supabase_setup.sql` correctly

**Avatar not uploading** — check the storage bucket policies were created (Step 2)

**Camera not working** — browser requires HTTPS for camera access in production; works on localhost without HTTPS
