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

-- ── Row Level Security ──
alter table users enable row level security;
alter table holdings enable row level security;
alter table transactions enable row level security;
alter table watchlist enable row level security;

-- Users: read/write own row only
create policy "Users can read own row"
  on users for select
  using (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update own row"
  on users for update
  using (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert own row"
  on users for insert
  with check (true);

-- Holdings: read/write own rows
create policy "Holdings select own"
  on holdings for select
  using (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Holdings insert own"
  on holdings for insert
  with check (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Holdings update own"
  on holdings for update
  using (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Holdings delete own"
  on holdings for delete
  using (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- Transactions: read/insert own rows
create policy "Transactions select own"
  on transactions for select
  using (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Transactions insert own"
  on transactions for insert
  with check (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- Watchlist: read/write own rows
create policy "Watchlist select own"
  on watchlist for select
  using (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Watchlist insert own"
  on watchlist for insert
  with check (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Watchlist delete own"
  on watchlist for delete
  using (user_id in (select id from users where clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));
