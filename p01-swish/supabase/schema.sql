-- Swish database schema
-- Run this in the Supabase SQL editor

-- ── Users ──
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  clerk_id   text unique not null,
  username   text unique not null,
  xp         integer default 0,
  level      text default 'Bronze',
  cash       numeric default 10000,
  streak     integer default 0,
  created_at timestamptz default now()
);

-- ── Holdings ──
create table if not exists holdings (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references users(id) on delete cascade,
  ticker   text not null,
  shares   numeric not null,
  avg_cost numeric not null,
  unique(user_id, ticker)
);

-- ── Transactions ──
create table if not exists transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade,
  ticker     text not null,
  action     text not null,
  shares     numeric not null,
  price      numeric not null,
  total      numeric not null,
  created_at timestamptz default now()
);

-- ── Watchlist ──
create table if not exists watchlist (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  ticker  text not null,
  unique(user_id, ticker)
);

-- ── Portfolio Snapshots ──
create table if not exists portfolio_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  total_value numeric not null,
  created_at  timestamptz default now()
);

-- ── Users: add total_trades column ──
alter table users add column if not exists total_trades integer default 0;

-- ── Row Level Security ──
-- RLS is DISABLED because auth is handled by Clerk at the app level.
-- The Supabase client uses the anon key; all access control is enforced
-- in application code (queries always filter by user_id).
-- If you need RLS later, integrate Clerk JWTs with Supabase custom claims.
