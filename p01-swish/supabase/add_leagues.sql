-- Run this in Supabase SQL Editor to add leagues tables

create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  created_by uuid references users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(league_id, user_id)
);

alter table leagues disable row level security;
alter table league_members disable row level security;
