-- Fix portfolio_snapshots: ensure one snapshot per user per UTC day
-- Run this in Supabase SQL Editor

-- 0. Delete corrupted snapshot for today (written during race condition bug)
DELETE FROM portfolio_snapshots
WHERE user_id = '770dd23e-2274-4035-a79b-caa388e5bab0'
  AND snapshot_date = '2026-03-13';

-- 1. Delete all existing snapshots for the user (stale day-1 data)
-- DELETE FROM portfolio_snapshots
-- WHERE user_id = '770dd23e-2274-4035-a79b-caa388e5bab0';

-- 2. Add snapshot_date column for unique constraint
ALTER TABLE portfolio_snapshots
ADD COLUMN IF NOT EXISTS snapshot_date date;

-- 3. Backfill snapshot_date from created_at for any existing rows
UPDATE portfolio_snapshots
SET snapshot_date = (created_at AT TIME ZONE 'UTC')::date
WHERE snapshot_date IS NULL;

-- 4. Set default for new rows
ALTER TABLE portfolio_snapshots
ALTER COLUMN snapshot_date SET DEFAULT CURRENT_DATE;

-- 5. Add unique constraint: one snapshot per user per day
ALTER TABLE portfolio_snapshots
DROP CONSTRAINT IF EXISTS portfolio_snapshots_user_date_unique;

ALTER TABLE portfolio_snapshots
ADD CONSTRAINT portfolio_snapshots_user_date_unique
UNIQUE (user_id, snapshot_date);
