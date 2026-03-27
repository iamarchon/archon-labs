# PolyCricket — Design Spec
**Date:** 2026-03-26
**Project:** p05-polycricket
**Status:** Approved

---

## Overview

PolyCricket is a Polymarket-style prediction market website for the IPL season using virtual coins (no real money). Users predict match outcomes, trade YES/NO shares on dynamic markets, and compete on a leaderboard. Markets are auto-generated from live cricket data via CricAPI and Claude, and resolved automatically by a worker service after each match.

This is a proper rebuild of the P03 CalledIt prototype — same concept, done right.

---

## Architecture

Two deployable services sharing a single Supabase database:

### `web/` — Next.js 15 App Router (Vercel)
- All user-facing UI and API routes
- Clerk for authentication
- Supabase client for reads/writes
- Supabase Realtime subscriptions for live odds and ticker updates

### `worker/` — Node.js cron service (Railway)
- Runs three scheduled jobs every 5 minutes
- No HTTP server — pure cron runner
- Connects to Supabase with service role key
- Calls CricAPI for match data and Claude API for market generation

**Communication:** Both services share Supabase as the data layer. No message queue. Supabase Realtime handles live push to the browser.

---

## Data Model

### `users`
| column | type | notes |
|---|---|---|
| id | text (PK) | Clerk user ID |
| username | text | |
| coins | integer | default 1000 |
| last_bonus_at | timestamptz | daily login bonus tracking |
| created_at | timestamptz | |

### `matches`
| column | type | notes |
|---|---|---|
| id | uuid (PK) | |
| cricapi_match_id | text | unique, worker owns this |
| home_team | text | |
| away_team | text | |
| match_date | timestamptz | |
| status | text | scheduled / live / completed |
| winner | text | null until complete |

### `markets`
| column | type | notes |
|---|---|---|
| id | uuid (PK) | |
| match_id | uuid (FK) | |
| title | text | e.g. "Will Mumbai Indians win?" |
| status | text | open / closed / resolved / disputed |
| outcome | text | yes / no / null |
| yes_pool | integer | coins in YES pool, starts at 500 |
| no_pool | integer | coins in NO pool, starts at 500 |
| total_pool | integer | yes_pool + no_pool |
| market_type | text | match_outcome / tournament (for future expansion) |
| created_at | timestamptz | |
| resolves_at | timestamptz | |

### `bets`
| column | type | notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | text (FK) | |
| market_id | uuid (FK) | |
| side | text | yes / no |
| coins_wagered | integer | |
| price_at_bet | numeric | probability at time of bet (0–1) |
| payout | integer | null until resolved |
| created_at | timestamptz | |

### `coin_transactions`
| column | type | notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | text (FK) | |
| amount | integer | positive = credit, negative = debit |
| type | text | bet / payout / bonus / signup |
| ref_id | uuid | references bets.id or null |
| created_at | timestamptz | |

### `order_book` (stub — for future real CLOB)
| column | type | notes |
|---|---|---|
| id | uuid (PK) | |
| market_id | uuid (FK) | |
| user_id | text (FK) | |
| side | text | yes / no |
| order_type | text | bid / ask |
| price | numeric | limit price (0–1) |
| shares | numeric | |
| status | text | open / filled / cancelled |
| created_at | timestamptz | |

> V1: this table is populated by a synthetic generator from AMM pool depth for the order book UI. V2: replace with real limit order matching engine.

---

## Dynamic Odds (AMM)

PolyCricket uses a **constant-product AMM** for pricing:

- Each market starts with `yes_pool = 500`, `no_pool = 500`
- YES probability = `yes_pool / (yes_pool + no_pool)` — more YES bets → YES pool grows → YES price rises
- Payout on win = `(user_coins_wagered / winning_side_pool) * total_pool`
- `total_pool` is a Supabase generated column: `yes_pool + no_pool`

**Simulated order book UI:** Generated from pool depth — asks show synthetic sell orders above current price in red, bids show synthetic buy orders below in green. This gives the Polymarket look without a real CLOB.

**Future upgrade path:** The `order_book` table is already stubbed. When upgrading to a real CLOB, replace the AMM logic in the worker with an order-matching engine and populate the table with real user orders.

---

## Worker Jobs

All three jobs run in the same Node.js process on a 5-minute interval.

### Job 1 — Market Generator
Runs 24 hours before each upcoming match.
1. Fetch fixtures from CricAPI for next 48 hours
2. Check which matches already have markets in Supabase — skip those
3. For each new match, send to Claude: `"Generate 3-5 YES/NO prediction market questions for: {home_team} vs {away_team} on {date}"`
4. Fallback if Claude fails: use 3 template questions ("Will {team} win?", "Will there be a super over?", "Will {team} post 180+?")
5. Insert markets with initial pools (500/500) and `resolves_at = match_date + 4 hours`

### Job 2 — Market Resolver
Runs after `resolves_at` for each open market.
1. Fetch match result from CricAPI
2. Determine YES/NO for each market based on result
3. If result unavailable → mark `disputed`, skip
4. Calculate payouts: `floor(user_shares / total_winning_shares * total_pool)`
5. Bulk update: bets.payout, users.coins, coin_transactions, markets.status = resolved

### Job 3 — Live Odds Updater
Runs every 5 minutes during active matches (match_date ± 4 hours).
1. Fetch live score from CricAPI
2. Push update to Supabase Realtime channel `match:{match_id}`
3. Frontend subscribes — live ticker and odds update without polling

---

## UI / Pages

Visual direction: **Tesla.com aesthetic** — all-caps labels, razor-thin dividers, stark black/white, large numbers, minimal border-radius, no decorative elements.

### `/` — Market Listing
- Category tabs: TRENDING · TODAY · TOURNAMENT (all-caps, underline active)
- Live ticker bar below navbar: scrolling recent bets ("anon bet 500 coins YES on MI vs RCB · 58¢")
- Market rows: team icon · question · probability% · volume (green YES / red NO split bar) · BUY YES chip · BUY NO chip
- Click row → opens bet panel (slide-up sheet on mobile, right panel on desktop)

### `/market/[id]`
Two-column layout:

**Left panel:**
- Market title (large, bold)
- Volume (`12,915 coins Vol.`) and resolution date
- Probability chart (recharts line graph) with timeframe tabs: 1H · 6H · 1D · 1W · 1M · ALL
- Outcome rows: team name · current probability% · ▲/▼ delta · BUY YES (green) · BUY NO (red) buttons
- Tabs: ORDER BOOK · GRAPH · RESOLUTION
  - Order Book: Asks table (red prices, descending) + Bids table (green prices, descending), columns: PRICE · SHARES · TOTAL. Simulated from AMM pool depth.

**Right sidebar (sticky):**
- BUY / SELL toggle (V1: BUY only)
- YES price button (green, active) / NO price button (gray)
- Amount input with quick-add chips: +100 · +500 · +1000 · MAX
- Live payout preview: "If YES wins → you receive X coins"
- CONFIRM BET button

### `/portfolio`
- Summary stats: COINS BALANCE · OPEN BETS · TOTAL WON · WIN RATE
- Open positions table: market · side · coins wagered · current probability · unrealized value
- Settled bets table: market · side · outcome · payout

### `/leaderboard`
- Stark rank table: RANK · USERNAME · COINS · MARKETS TRADED · WIN RATE
- Top 20 users

### `/admin` (no auth beyond Clerk org check)
- List disputed markets with manual YES/NO resolve buttons
- Trigger market generator manually

---

## API Routes (web/)

| method | route | description |
|---|---|---|
| POST | `/api/user` | Create user on first sign-in (1000 coin signup bonus) |
| POST | `/api/daily-bonus` | Claim +100 coins (24h cooldown) |
| GET | `/api/markets` | List markets (filter by status, match_id) |
| GET | `/api/markets/[id]` | Single market + order book data |
| POST | `/api/bets` | Place a bet, update AMM pools atomically |
| GET | `/api/portfolio` | User's bets + summary stats |
| GET | `/api/leaderboard` | Top 20 users |

---

## Error Handling

| scenario | handling |
|---|---|
| CricAPI down | Worker logs, skips run, retries next tick. Markets stay open. |
| Claude API failure | Fall back to 3 template questions per match |
| Bet placement race condition | Supabase row-level lock on market during pool update |
| Bet deduction failure | Optimistic UI rolls back — coins never deducted unless Supabase confirms |
| Market resolution conflict | Mark `disputed`, surface in `/admin` for manual resolution |
| Supabase Realtime disconnect | Frontend falls back to polling every 30s |

---

## Out of Scope for V1

- Real CLOB order matching (table stubbed, UI simulated)
- Player performance markets (50+ runs, wicket taker, etc.)
- Tournament-level markets (Orange Cap, Purple Cap, playoff qualification)
- SELL / exit position before resolution
- Social features (comments, following)
- Real money / withdrawals (virtual coins only)

---

## Environment Variables

### web/
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### worker/
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CRICAPI_KEY
ANTHROPIC_API_KEY
```

---

## Deployment

| service | platform | trigger |
|---|---|---|
| web/ | Vercel | git push to main |
| worker/ | Railway | always-on, internal cron every 5 min |
