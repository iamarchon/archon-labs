-- ============================================
-- Swish: Disable RLS (Clerk handles auth)
-- Run this in the Supabase SQL Editor NOW
-- ============================================

-- Drop all existing policies
drop policy if exists "Users can read own row" on users;
drop policy if exists "Users can update own row" on users;
drop policy if exists "Users can insert own row" on users;
drop policy if exists "Holdings select own" on holdings;
drop policy if exists "Holdings insert own" on holdings;
drop policy if exists "Holdings update own" on holdings;
drop policy if exists "Holdings delete own" on holdings;
drop policy if exists "Transactions select own" on transactions;
drop policy if exists "Transactions insert own" on transactions;
drop policy if exists "Watchlist select own" on watchlist;
drop policy if exists "Watchlist insert own" on watchlist;
drop policy if exists "Watchlist delete own" on watchlist;

-- Disable RLS on all tables
alter table users disable row level security;
alter table holdings disable row level security;
alter table transactions disable row level security;
alter table watchlist disable row level security;
