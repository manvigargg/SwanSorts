-- ============================================================
-- SwanSorts — Supabase Database Setup
-- Run this entire file in: Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  phone       text,
  city        text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- 2. Scans table (one row per detected item)
create table if not exists public.scans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade,
  material       text not null,
  waste_category text,
  co2_saved      float default 0,
  confidence     float,
  scanned_at     timestamptz default now()
);

-- 3. Row Level Security — users only see their own data
alter table public.profiles enable row level security;
alter table public.scans     enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own scans"
  on public.scans for select using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert with check (auth.uid() = user_id);

-- 4. Storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

create policy "Avatar upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Avatar update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
