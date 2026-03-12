-- Run this in Supabase SQL Editor to add portfolio snapshots + total_trades

create table if not exists portfolio_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  total_value numeric not null,
  created_at  timestamptz default now()
);

alter table users add column if not exists total_trades integer default 0;
