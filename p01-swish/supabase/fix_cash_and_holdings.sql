-- Fix cash and phantom holdings for user 770dd23e-2274-4035-a79b-caa388e5bab0
-- Run this in Supabase SQL Editor

-- 0. Check what's there first
SELECT id, ticker, shares FROM holdings
WHERE user_id = '770dd23e-2274-4035-a79b-caa388e5bab0'
ORDER BY ticker;

-- 1. Fix cash (column is "cash", not "cash_balance")
UPDATE users
SET cash = 4342.79
WHERE id = '770dd23e-2274-4035-a79b-caa388e5bab0';

-- 2. Delete phantom holdings: zero, null, or near-zero shares
DELETE FROM holdings
WHERE user_id = '770dd23e-2274-4035-a79b-caa388e5bab0'
  AND (shares IS NULL OR shares = 0 OR shares < 0.001);

-- 3. Verify: show remaining holdings (should be exactly 5)
SELECT ticker, shares, avg_cost FROM holdings
WHERE user_id = '770dd23e-2274-4035-a79b-caa388e5bab0'
ORDER BY ticker;

-- 4. Verify: show updated cash (should be 4342.79)
SELECT id, username, cash FROM users
WHERE id = '770dd23e-2274-4035-a79b-caa388e5bab0';
