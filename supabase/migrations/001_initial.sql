-- ============================================================
-- SongScraper — Initial Schema Migration
-- Run this in the Supabase SQL editor or via the CLI:
--   supabase db push
-- ============================================================

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Extends auth.users — one row per registered user.

create table public.users (
  id           uuid references auth.users on delete cascade not null primary key,
  display_name text not null,
  created_at   timestamptz default now() not null
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.users enable row level security;

-- Allow users to register their own profile row
create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

-- Users can only read their own profile
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

-- Users can only update their own profile
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);
