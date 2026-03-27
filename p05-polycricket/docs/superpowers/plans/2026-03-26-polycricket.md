# PolyCricket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Polymarket-style IPL prediction market with virtual coins, dynamic AMM odds, AI-generated markets, and a Tesla.com aesthetic.

**Architecture:** Two services — `web/` (Next.js 15 on Vercel) for user-facing UI and API routes, and `worker/` (Node.js on Railway) for scheduled market generation and resolution. Both share a single Supabase database; Supabase Realtime handles live updates to the browser.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Clerk v5 (auth), Supabase v2 (DB + Realtime), Recharts (charts), CricAPI (cricket data), Anthropic SDK / Claude (market generation), Jest (testing), Railway (worker deploy), Vercel (web deploy)

---

## File Structure

```
p05-polycricket/
├── web/
│   ├── package.json
│   ├── next.config.ts
│   ├── middleware.ts                        # Clerk auth guard
│   ├── app/
│   │   ├── layout.tsx                       # Root layout: Navbar + LiveTicker
│   │   ├── page.tsx                         # / — market listing
│   │   ├── market/[id]/page.tsx             # /market/[id] — detail
│   │   ├── portfolio/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   ├── admin/page.tsx
│   │   └── api/
│   │       ├── user/route.ts                # POST — create user
│   │       ├── daily-bonus/route.ts         # POST — claim bonus
│   │       ├── markets/route.ts             # GET — list markets
│   │       ├── markets/[id]/route.ts        # GET — single market + order book
│   │       ├── bets/route.ts                # POST — place bet (calls RPC)
│   │       ├── portfolio/route.ts           # GET — user bets + stats
│   │       └── leaderboard/route.ts         # GET — top 20
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── LiveTicker.tsx                   # Supabase Realtime subscription
│   │   ├── CategoryTabs.tsx
│   │   ├── MarketRow.tsx
│   │   ├── BetPanel.tsx                     # Slide-up/sidebar bet UI
│   │   ├── MarketChart.tsx                  # Recharts line graph
│   │   └── OrderBook.tsx                    # Simulated asks/bids table
│   └── lib/
│       ├── supabase-server.ts               # Service role client (API routes)
│       ├── supabase-client.ts               # Browser anon client (Realtime)
│       └── amm.ts                           # Pure AMM math functions
├── worker/
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.ts                             # Cron entry point
│   ├── jobs/
│   │   ├── generate-markets.ts
│   │   ├── resolve-markets.ts
│   │   └── update-live-odds.ts
│   └── lib/
│       ├── cricapi.ts                       # CricAPI HTTP client
│       ├── claude.ts                        # Anthropic SDK wrapper
│       └── supabase.ts                      # Service role client
└── supabase/
    └── schema.sql                           # All tables + RPCs + RLS
```

---

## Task 1: Supabase Schema

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Write schema.sql**

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- USERS
create table users (
  id text primary key,
  username text not null,
  coins integer not null default 1000,
  last_bonus_at timestamptz,
  created_at timestamptz default now()
);

-- MATCHES (worker-owned)
create table matches (
  id uuid primary key default gen_random_uuid(),
  cricapi_match_id text unique not null,
  home_team text not null,
  away_team text not null,
  match_date timestamptz not null,
  status text not null default 'scheduled',
  winner text,
  created_at timestamptz default now()
);

-- MARKETS
create table markets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  title text not null,
  status text not null default 'open',
  outcome text,
  yes_pool integer not null default 500,
  no_pool integer not null default 500,
  total_pool integer generated always as (yes_pool + no_pool) stored,
  market_type text not null default 'match_outcome',
  resolves_at timestamptz not null,
  created_at timestamptz default now()
);

-- BETS
create table bets (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  market_id uuid references markets(id) on delete cascade,
  side text not null,
  coins_wagered integer not null,
  price_at_bet numeric not null,
  payout integer,
  created_at timestamptz default now()
);

-- COIN TRANSACTIONS
create table coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  amount integer not null,
  type text not null,
  ref_id uuid,
  created_at timestamptz default now()
);

-- ORDER BOOK STUB (future CLOB)
create table order_book (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references markets(id) on delete cascade,
  user_id text references users(id) on delete cascade,
  side text not null,
  order_type text not null,
  price numeric not null,
  shares numeric not null,
  status text not null default 'open',
  created_at timestamptz default now()
);

-- RLS
alter table users enable row level security;
alter table markets enable row level security;
alter table bets enable row level security;
alter table coin_transactions enable row level security;
alter table matches enable row level security;

create policy "public read users" on users for select using (true);
create policy "public read markets" on markets for select using (true);
create policy "public read matches" on matches for select using (true);
create policy "public read bets" on bets for select using (true);
create policy "own coin_transactions" on coin_transactions for select using (auth.uid()::text = user_id);

-- RPC: place_bet (atomic)
create or replace function place_bet(
  p_user_id text,
  p_market_id uuid,
  p_side text,
  p_coins integer
) returns json language plpgsql security definer as $$
declare
  v_market markets%rowtype;
  v_user_coins integer;
  v_price numeric;
  v_bet_id uuid;
begin
  select * into v_market from markets where id = p_market_id for update;
  if v_market.status != 'open' then raise exception 'Market is not open'; end if;

  select coins into v_user_coins from users where id = p_user_id for update;
  if v_user_coins < p_coins then raise exception 'Insufficient coins'; end if;

  if p_side = 'yes' then
    v_price := v_market.yes_pool::numeric / (v_market.yes_pool + v_market.no_pool);
    update markets set yes_pool = yes_pool + p_coins where id = p_market_id;
  else
    v_price := v_market.no_pool::numeric / (v_market.yes_pool + v_market.no_pool);
    update markets set no_pool = no_pool + p_coins where id = p_market_id;
  end if;

  update users set coins = coins - p_coins where id = p_user_id;

  insert into bets (user_id, market_id, side, coins_wagered, price_at_bet)
  values (p_user_id, p_market_id, p_side, p_coins, v_price)
  returning id into v_bet_id;

  insert into coin_transactions (user_id, amount, type, ref_id)
  values (p_user_id, -p_coins, 'bet', v_bet_id);

  return json_build_object('bet_id', v_bet_id, 'price_at_bet', v_price);
end;
$$;

-- RPC: resolve_market (atomic)
create or replace function resolve_market(
  p_market_id uuid,
  p_outcome text
) returns void language plpgsql security definer as $$
declare
  v_market markets%rowtype;
  v_bet bets%rowtype;
  v_winning_pool integer;
  v_payout integer;
begin
  select * into v_market from markets where id = p_market_id for update;
  if v_market.status != 'open' then return; end if;

  if p_outcome = 'yes' then
    v_winning_pool := v_market.yes_pool;
  else
    v_winning_pool := v_market.no_pool;
  end if;

  for v_bet in select * from bets where market_id = p_market_id and side = p_outcome loop
    v_payout := floor((v_bet.coins_wagered::numeric / v_winning_pool) * (v_market.yes_pool + v_market.no_pool));
    update bets set payout = v_payout where id = v_bet.id;
    update users set coins = coins + v_payout where id = v_bet.user_id;
    insert into coin_transactions (user_id, amount, type, ref_id)
    values (v_bet.user_id, v_payout, 'payout', v_bet.id);
  end loop;

  update bets set payout = 0 where market_id = p_market_id and side != p_outcome and payout is null;
  update markets set status = 'resolved', outcome = p_outcome where id = p_market_id;
end;
$$;
```

- [ ] **Step 2: Apply schema**

Paste `supabase/schema.sql` into the Supabase SQL editor and run it. Verify all 6 tables appear in the Table Editor.

- [ ] **Step 3: Enable Realtime**

In Supabase Dashboard → Database → Replication, enable Realtime for the `bets` and `markets` tables.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add supabase schema with AMM RPCs"
```

---

## Task 2: Web App Scaffold

**Files:**
- Create: `web/package.json`, `web/next.config.ts`, `web/middleware.ts`, `web/lib/supabase-server.ts`, `web/lib/supabase-client.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd p05-polycricket
npx create-next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd web
npm install @clerk/nextjs @supabase/supabase-js @supabase/ssr recharts
```

- [ ] **Step 2: Write middleware.ts**

```typescript
// web/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/portfolio(.*)',
  '/leaderboard(.*)',
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
```

- [ ] **Step 3: Write lib/supabase-server.ts**

```typescript
// web/lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

- [ ] **Step 4: Write lib/supabase-client.ts**

```typescript
// web/lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 5: Write .env.local**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_USER_IDS=user_abc123,user_def456
```

- [ ] **Step 6: Update next.config.ts**

```typescript
// web/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};
export default nextConfig;
```

- [ ] **Step 7: Verify dev server starts**

```bash
cd web && npm run dev
```
Expected: server at http://localhost:3000 with no errors.

- [ ] **Step 8: Commit**

```bash
git add web/
git commit -m "feat: scaffold Next.js web app with Clerk + Supabase"
```

---

## Task 3: AMM Math Library (TDD)

**Files:**
- Create: `web/lib/amm.ts`
- Create: `web/__tests__/lib/amm.test.ts`

- [ ] **Step 1: Install Jest**

```bash
cd web
npm install -D jest @types/jest ts-jest
```

Add to `web/package.json`:
```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/$1" }
},
"scripts": {
  "test": "jest"
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// web/__tests__/lib/amm.test.ts
import { getYesPrice, getNoPrice, calculatePayout, generateOrderBook } from '@/lib/amm';

describe('getYesPrice', () => {
  it('returns 0.5 for equal pools', () => {
    expect(getYesPrice(500, 500)).toBe(0.5);
  });
  it('increases as yes pool grows', () => {
    expect(getYesPrice(700, 300)).toBeCloseTo(0.7);
  });
  it('decreases as yes pool shrinks', () => {
    expect(getYesPrice(300, 700)).toBeCloseTo(0.3);
  });
});

describe('getNoPrice', () => {
  it('is complement of yes price', () => {
    expect(getYesPrice(600, 400) + getNoPrice(600, 400)).toBeCloseTo(1);
  });
});

describe('calculatePayout', () => {
  it('gives proportional share of total pool', () => {
    // 100 coins in 500 yes pool, total 1000 → 200 payout
    expect(calculatePayout(100, 500, 1000)).toBe(200);
  });
  it('floors fractional results', () => {
    expect(calculatePayout(1, 3, 10)).toBe(3); // 3.33 → 3
  });
});

describe('generateOrderBook', () => {
  it('returns 5 asks and 5 bids', () => {
    const { asks, bids } = generateOrderBook(500, 500);
    expect(asks).toHaveLength(5);
    expect(bids).toHaveLength(5);
  });
  it('all asks are above current yes price', () => {
    const price = getYesPrice(500, 500);
    const { asks } = generateOrderBook(500, 500);
    asks.forEach(a => expect(a.price).toBeGreaterThan(price));
  });
  it('all bids are below current yes price', () => {
    const price = getYesPrice(500, 500);
    const { bids } = generateOrderBook(500, 500);
    bids.forEach(b => expect(b.price).toBeLessThan(price));
  });
  it('each entry has price, shares, total', () => {
    const { asks } = generateOrderBook(500, 500);
    expect(asks[0]).toHaveProperty('price');
    expect(asks[0]).toHaveProperty('shares');
    expect(asks[0]).toHaveProperty('total');
  });
});
```

- [ ] **Step 3: Run tests — verify they FAIL**

```bash
cd web && npm test
```
Expected: `Cannot find module '@/lib/amm'`

- [ ] **Step 4: Implement amm.ts**

```typescript
// web/lib/amm.ts

export interface OrderBookEntry {
  price: number;
  shares: number;
  total: number;
}

export function getYesPrice(yesPool: number, noPool: number): number {
  return yesPool / (yesPool + noPool);
}

export function getNoPrice(yesPool: number, noPool: number): number {
  return noPool / (yesPool + noPool);
}

export function calculatePayout(
  coinsWagered: number,
  sidePool: number,
  totalPool: number
): number {
  return Math.floor((coinsWagered / sidePool) * totalPool);
}

export function generateOrderBook(
  yesPool: number,
  noPool: number
): { asks: OrderBookEntry[]; bids: OrderBookEntry[] } {
  const currentPrice = getYesPrice(yesPool, noPool);
  const asks: OrderBookEntry[] = [];
  const bids: OrderBookEntry[] = [];

  for (let i = 1; i <= 5; i++) {
    const price = parseFloat(Math.min(0.99, currentPrice + i * 0.02).toFixed(2));
    const shares = Math.max(1, Math.floor((noPool * 0.1) / i));
    asks.push({ price, shares, total: Math.floor(price * shares) });
  }

  for (let i = 1; i <= 5; i++) {
    const price = parseFloat(Math.max(0.01, currentPrice - i * 0.02).toFixed(2));
    const shares = Math.max(1, Math.floor((yesPool * 0.1) / i));
    bids.push({ price, shares, total: Math.floor(price * shares) });
  }

  return {
    asks: asks.sort((a, b) => b.price - a.price),
    bids: bids.sort((a, b) => b.price - a.price),
  };
}
```

- [ ] **Step 5: Run tests — verify they PASS**

```bash
cd web && npm test
```
Expected: 10 tests pass.

- [ ] **Step 6: Commit**

```bash
git add web/lib/amm.ts web/__tests__/lib/amm.test.ts web/package.json
git commit -m "feat: add AMM math library with tests"
```

---

## Task 4: API Routes — User, Markets, Bets

**Files:**
- Create: `web/app/api/user/route.ts`
- Create: `web/app/api/daily-bonus/route.ts`
- Create: `web/app/api/markets/route.ts`
- Create: `web/app/api/markets/[id]/route.ts`
- Create: `web/app/api/bets/route.ts`

- [ ] **Step 1: Write POST /api/user**

```typescript
// web/app/api/user/route.ts
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await currentUser();
  const username = user?.username ?? user?.firstName ?? userId.slice(0, 8);

  const { data, error } = await supabase
    .from('users')
    .upsert({ id: userId, username }, { onConflict: 'id', ignoreDuplicates: true })
    .select()
    .single();

  // Also insert signup coin_transaction if new user
  await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount: 1000,
    type: 'signup',
  }).then(() => {}); // ignore duplicate error on re-login

  return NextResponse.json(data ?? { id: userId, username });
}
```

- [ ] **Step 2: Write POST /api/daily-bonus**

```typescript
// web/app/api/daily-bonus/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: user } = await supabase
    .from('users')
    .select('last_bonus_at, coins')
    .eq('id', userId)
    .single();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lastBonus = user.last_bonus_at ? new Date(user.last_bonus_at) : null;
  const now = new Date();
  if (lastBonus && now.getTime() - lastBonus.getTime() < 24 * 60 * 60 * 1000) {
    const nextBonus = new Date(lastBonus.getTime() + 24 * 60 * 60 * 1000);
    return NextResponse.json({ error: 'Already claimed', nextBonus }, { status: 400 });
  }

  await supabase.from('users').update({ coins: user.coins + 100, last_bonus_at: now }).eq('id', userId);
  await supabase.from('coin_transactions').insert({ user_id: userId, amount: 100, type: 'bonus' });

  return NextResponse.json({ coins: user.coins + 100 });
}
```

- [ ] **Step 3: Write GET /api/markets**

```typescript
// web/app/api/markets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'open';
  const matchId = searchParams.get('match_id');

  let query = supabase
    .from('markets')
    .select('*, matches(home_team, away_team, match_date, status)')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (matchId) query = query.eq('match_id', matchId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Write GET /api/markets/[id]**

```typescript
// web/app/api/markets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateOrderBook } from '@/lib/amm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: market, error } = await supabase
    .from('markets')
    .select('*, matches(home_team, away_team, match_date)')
    .eq('id', id)
    .single();

  if (error || !market) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: recentBets } = await supabase
    .from('bets')
    .select('side, coins_wagered, price_at_bet, created_at')
    .eq('market_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const orderBook = generateOrderBook(market.yes_pool, market.no_pool);

  return NextResponse.json({ ...market, orderBook, recentBets: recentBets ?? [] });
}
```

- [ ] **Step 5: Write POST /api/bets**

```typescript
// web/app/api/bets/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { market_id, side, coins } = body;

  if (!market_id || !side || !coins) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!['yes', 'no'].includes(side)) {
    return NextResponse.json({ error: 'Invalid side' }, { status: 400 });
  }
  if (typeof coins !== 'number' || coins < 1) {
    return NextResponse.json({ error: 'Invalid coins' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('place_bet', {
    p_user_id: userId,
    p_market_id: market_id,
    p_side: side,
    p_coins: coins,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
```

- [ ] **Step 6: Write GET /api/portfolio**

```typescript
// web/app/api/portfolio/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: user }, { data: bets }] = await Promise.all([
    supabase.from('users').select('coins').eq('id', userId).single(),
    supabase.from('bets')
      .select('*, markets(title, status, outcome, yes_pool, no_pool, total_pool)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const open = (bets ?? []).filter(b => b.markets?.status === 'open');
  const settled = (bets ?? []).filter(b => b.markets?.status === 'resolved');
  const totalWon = settled.reduce((s, b) => s + (b.payout ?? 0), 0);
  const wins = settled.filter(b => b.payout && b.payout > 0).length;
  const winRate = settled.length ? Math.round((wins / settled.length) * 100) : 0;

  return NextResponse.json({ coins: user?.coins ?? 0, open, settled, totalWon, winRate });
}
```

- [ ] **Step 7: Write GET /api/leaderboard**

```typescript
// web/app/api/leaderboard/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET() {
  const { data } = await supabase
    .from('users')
    .select('id, username, coins')
    .order('coins', { ascending: false })
    .limit(20);

  return NextResponse.json(data ?? []);
}
```

- [ ] **Step 8: Smoke test all routes**

```bash
cd web && npm run dev
# In another terminal:
curl -s http://localhost:3000/api/markets | head -c 200
curl -s http://localhost:3000/api/leaderboard | head -c 200
```
Expected: JSON responses (empty arrays for now).

- [ ] **Step 9: Commit**

```bash
git add web/app/api/
git commit -m "feat: add all API routes (user, markets, bets, portfolio, leaderboard)"
```

---

## Task 5: Root Layout — Navbar + LiveTicker

**Files:**
- Create: `web/components/Navbar.tsx`
- Create: `web/components/LiveTicker.tsx`
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: Write Navbar.tsx**

```tsx
// web/components/Navbar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

const NAV = [
  { label: 'MARKETS', href: '/' },
  { label: 'PORTFOLIO', href: '/portfolio' },
  { label: 'LEADERBOARD', href: '/leaderboard' },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-xs font-medium tracking-[0.2em] uppercase text-black">
        POLYCRICKET
      </Link>
      <div className="flex items-center gap-8">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`text-[10px] tracking-widest uppercase transition-colors ${
              path === n.href ? 'text-black border-b border-black pb-0.5' : 'text-gray-400 hover:text-black'
            }`}
          >
            {n.label}
          </Link>
        ))}
        <SignedOut>
          <SignInButton>
            <button className="text-[10px] tracking-widest uppercase bg-black text-white px-4 py-1.5">
              SIGN IN
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Write LiveTicker.tsx**

```tsx
// web/components/LiveTicker.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase-client';

interface TickerEvent {
  id: string;
  text: string;
}

export default function LiveTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([
    { id: '0', text: 'anon bet 500 coins YES on MI vs RCB · 58¢' },
    { id: '1', text: 'anon bet 200 coins NO on CSK vs KKR · 42¢' },
    { id: '2', text: 'anon bet 1000 coins YES on RR vs SRH · 65¢' },
  ]);

  useEffect(() => {
    const sb = createSupabaseClient();
    const channel = sb.channel('bets-ticker')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, payload => {
        const b = payload.new as { side: string; coins_wagered: number; price_at_bet: number };
        const text = `anon bet ${b.coins_wagered} coins ${b.side.toUpperCase()} · ${Math.round(b.price_at_bet * 100)}¢`;
        setEvents(prev => [{ id: String(Date.now()), text }, ...prev].slice(0, 20));
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, []);

  return (
    <div className="border-b border-gray-100 overflow-hidden bg-white">
      <div className="flex animate-ticker whitespace-nowrap py-2 px-4">
        {[...events, ...events].map((e, i) => (
          <span key={`${e.id}-${i}`} className="text-[10px] text-gray-400 tracking-widest uppercase mr-12">
            {e.text}
          </span>
        ))}
      </div>
    </div>
  );
}
```

Add to `web/app/globals.css`:
```css
@keyframes ticker {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.animate-ticker {
  animation: ticker 30s linear infinite;
}
```

- [ ] **Step 3: Update layout.tsx**

```tsx
// web/app/layout.tsx
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import './globals.css';

export const metadata: Metadata = { title: 'PolyCricket', description: 'IPL Prediction Markets' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-white text-black antialiased">
          <Navbar />
          <LiveTicker />
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Verify layout renders**

```bash
cd web && npm run dev
```
Open http://localhost:3000. Expected: navbar + scrolling ticker bar visible.

- [ ] **Step 5: Commit**

```bash
git add web/components/Navbar.tsx web/components/LiveTicker.tsx web/app/layout.tsx web/app/globals.css
git commit -m "feat: add Navbar and LiveTicker with Supabase Realtime"
```

---

## Task 6: Market Listing Page (/)

**Files:**
- Create: `web/components/CategoryTabs.tsx`
- Create: `web/components/MarketRow.tsx`
- Create: `web/components/BetPanel.tsx`
- Modify: `web/app/page.tsx`

- [ ] **Step 1: Write CategoryTabs.tsx**

```tsx
// web/components/CategoryTabs.tsx
'use client';

const TABS = ['TRENDING', 'TODAY', 'TOURNAMENT'];

export default function CategoryTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="flex gap-8 border-b border-gray-100 mb-0">
      {TABS.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`text-[10px] tracking-widest uppercase pb-3 transition-colors ${
            active === t
              ? 'text-black border-b-2 border-black -mb-px'
              : 'text-gray-400 hover:text-black'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write MarketRow.tsx**

```tsx
// web/components/MarketRow.tsx
'use client';
import { getYesPrice, getNoPrice } from '@/lib/amm';

interface Market {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  matches: { home_team: string; away_team: string; match_date: string } | null;
}

export default function MarketRow({
  market,
  onBet,
}: {
  market: Market;
  onBet: (market: Market, side: 'yes' | 'no') => void;
}) {
  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;
  const match = market.matches;

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 px-2 -mx-2 cursor-pointer group">
      <div className="flex-1 min-w-0">
        {match && (
          <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-1">
            {match.home_team} vs {match.away_team} · {new Date(match.match_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </p>
        )}
        <p className="text-sm font-medium text-black truncate">{market.title}</p>
      </div>

      {/* YES/NO volume bar */}
      <div className="mx-6 w-32 hidden md:block">
        <div className="flex h-1.5 rounded-none overflow-hidden">
          <div className="bg-green-500" style={{ width: `${yesP}%` }} />
          <div className="bg-red-500" style={{ width: `${noP}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-green-600 font-medium">{yesP}%</span>
          <span className="text-[10px] text-red-500 font-medium">{noP}%</span>
        </div>
      </div>

      <div className="text-[10px] text-gray-400 tracking-wider w-24 text-right hidden lg:block">
        {market.total_pool.toLocaleString()} coins
      </div>

      {/* Buy buttons */}
      <div className="flex gap-2 ml-6">
        <button
          onClick={e => { e.stopPropagation(); onBet(market, 'yes'); }}
          className="text-[10px] tracking-widest uppercase bg-green-600 text-white px-3 py-1.5 hover:bg-green-700 transition-colors"
        >
          YES {yesP}¢
        </button>
        <button
          onClick={e => { e.stopPropagation(); onBet(market, 'no'); }}
          className="text-[10px] tracking-widest uppercase bg-red-500 text-white px-3 py-1.5 hover:bg-red-600 transition-colors"
        >
          NO {noP}¢
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write BetPanel.tsx**

```tsx
// web/components/BetPanel.tsx
'use client';
import { useState } from 'react';
import { getYesPrice, getNoPrice, calculatePayout } from '@/lib/amm';

interface Market {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
}

export default function BetPanel({
  market,
  defaultSide,
  onClose,
  onSuccess,
}: {
  market: Market;
  defaultSide: 'yes' | 'no';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [side, setSide] = useState<'yes' | 'no'>(defaultSide);
  const [coins, setCoins] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const yesPrice = getYesPrice(market.yes_pool, market.no_pool);
  const noPrice = getNoPrice(market.yes_pool, market.no_pool);
  const currentPrice = side === 'yes' ? yesPrice : noPrice;
  const sidePool = side === 'yes' ? market.yes_pool : market.no_pool;
  const coinsNum = parseInt(coins) || 0;
  const estimatedPayout = coinsNum > 0
    ? calculatePayout(coinsNum, sidePool + coinsNum, market.total_pool + coinsNum)
    : 0;

  async function handleBet() {
    setError('');
    if (!coinsNum || coinsNum < 1) { setError('Enter coins to bet'); return; }
    setLoading(true);
    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_id: market.id, side, coins: coinsNum }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Failed'); return; }
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6 border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <p className="text-[10px] tracking-widest uppercase text-gray-400">Place Bet</p>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xs">✕</button>
        </div>

        <p className="text-sm font-medium mb-4">{market.title}</p>

        {/* YES / NO toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSide('yes')}
            className={`flex-1 py-2 text-[10px] tracking-widest uppercase border transition-colors ${
              side === 'yes' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            YES {Math.round(yesPrice * 100)}¢
          </button>
          <button
            onClick={() => setSide('no')}
            className={`flex-1 py-2 text-[10px] tracking-widest uppercase border transition-colors ${
              side === 'no' ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            NO {Math.round(noPrice * 100)}¢
          </button>
        </div>

        {/* Quick add */}
        <div className="flex gap-2 mb-3">
          {[100, 500, 1000].map(v => (
            <button
              key={v}
              onClick={() => setCoins(String((parseInt(coins) || 0) + v))}
              className="flex-1 text-[10px] tracking-widest uppercase border border-gray-200 py-1.5 hover:border-black transition-colors"
            >
              +{v}
            </button>
          ))}
          <button
            onClick={() => setCoins('5000')}
            className="flex-1 text-[10px] tracking-widest uppercase border border-gray-200 py-1.5 hover:border-black transition-colors"
          >
            MAX
          </button>
        </div>

        {/* Input */}
        <input
          type="number"
          value={coins}
          onChange={e => setCoins(e.target.value)}
          placeholder="Coins to bet"
          className="w-full border border-gray-200 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-black"
        />

        {/* Payout preview */}
        {coinsNum > 0 && (
          <p className="text-[10px] text-gray-400 tracking-wide mb-4">
            If {side.toUpperCase()} wins → <span className="text-black font-medium">{estimatedPayout} coins</span>
          </p>
        )}

        {error && <p className="text-[10px] text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleBet}
          disabled={loading}
          className="w-full bg-black text-white text-[10px] tracking-widest uppercase py-3 hover:bg-gray-900 transition-colors disabled:opacity-50"
        >
          {loading ? 'PLACING...' : 'CONFIRM BET'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write app/page.tsx**

```tsx
// web/app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import CategoryTabs from '@/components/CategoryTabs';
import MarketRow from '@/components/MarketRow';
import BetPanel from '@/components/BetPanel';

interface Market {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  matches: { home_team: string; away_team: string; match_date: string } | null;
}

export default function Home() {
  const { isSignedIn } = useUser();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [tab, setTab] = useState('TRENDING');
  const [betTarget, setBetTarget] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null);

  useEffect(() => {
    fetch('/api/markets?status=open')
      .then(r => r.json())
      .then(setMarkets);
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user', { method: 'POST' });
    }
  }, [isSignedIn]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Hero */}
      <div className="mb-12">
        <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-3">IPL 2025 · {markets.length} Markets Open</p>
        <h1 className="text-5xl font-light tracking-tight text-black">Predict.<br />Trade.<br />Win.</h1>
      </div>

      <CategoryTabs active={tab} onChange={setTab} />

      <div className="mt-0">
        {markets.length === 0 ? (
          <p className="text-[10px] tracking-widest uppercase text-gray-400 py-12 text-center">No markets open yet</p>
        ) : (
          markets.map(m => (
            <MarketRow
              key={m.id}
              market={m}
              onBet={(market, side) => {
                if (!isSignedIn) { window.location.href = '/sign-in'; return; }
                setBetTarget({ market, side });
              }}
            />
          ))
        )}
      </div>

      {betTarget && (
        <BetPanel
          market={betTarget.market}
          defaultSide={betTarget.side}
          onClose={() => setBetTarget(null)}
          onSuccess={() => fetch('/api/markets?status=open').then(r => r.json()).then(setMarkets)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
cd web && npm run dev
```
Open http://localhost:3000. Expected: hero text, tabs, market rows (empty if no data yet). BetPanel opens on YES/NO click.

- [ ] **Step 6: Commit**

```bash
git add web/components/ web/app/page.tsx
git commit -m "feat: add market listing page with bet panel"
```

---

## Task 7: Market Detail Page

**Files:**
- Create: `web/components/MarketChart.tsx`
- Create: `web/components/OrderBook.tsx`
- Create: `web/app/market/[id]/page.tsx`

- [ ] **Step 1: Write MarketChart.tsx**

```tsx
// web/components/MarketChart.tsx
'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const TABS = ['1H', '6H', '1D', '1W', '1M', 'ALL'];

interface DataPoint { time: string; yes: number; no: number }

export default function MarketChart({ data }: { data: DataPoint[] }) {
  const [active, setActive] = useState('ALL');

  return (
    <div>
      <div className="flex gap-4 mb-4">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`text-[10px] tracking-widest uppercase transition-colors ${
              active === t ? 'text-black border-b border-black pb-0.5' : 'text-gray-400 hover:text-black'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#9ca3af' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} unit="%" />
          <Tooltip
            formatter={(v: number) => [`${v}%`]}
            contentStyle={{ border: '1px solid #e5e7eb', fontSize: 11, borderRadius: 0 }}
          />
          <Line type="monotone" dataKey="yes" stroke="#16a34a" dot={false} strokeWidth={1.5} name="YES" />
          <Line type="monotone" dataKey="no" stroke="#ef4444" dot={false} strokeWidth={1.5} name="NO" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Write OrderBook.tsx**

```tsx
// web/components/OrderBook.tsx
import { OrderBookEntry } from '@/lib/amm';

export default function OrderBook({
  asks,
  bids,
}: {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
}) {
  return (
    <div>
      <div className="grid grid-cols-3 mb-2 px-1">
        {['PRICE', 'SHARES', 'TOTAL'].map(h => (
          <span key={h} className="text-[9px] tracking-widest uppercase text-gray-400">{h}</span>
        ))}
      </div>
      <p className="text-[9px] tracking-widest uppercase text-gray-400 mb-1">ASKS</p>
      {asks.map((a, i) => (
        <div key={i} className="grid grid-cols-3 py-0.5 px-1 relative">
          <div className="absolute inset-0 bg-red-50" style={{ width: `${a.price * 100}%` }} />
          <span className="relative text-[11px] text-red-500 font-medium">{Math.round(a.price * 100)}¢</span>
          <span className="relative text-[11px] text-gray-600">{a.shares.toLocaleString()}</span>
          <span className="relative text-[11px] text-gray-600">{a.total.toLocaleString()}</span>
        </div>
      ))}
      <div className="border-t border-gray-200 my-2" />
      <p className="text-[9px] tracking-widest uppercase text-gray-400 mb-1">BIDS</p>
      {bids.map((b, i) => (
        <div key={i} className="grid grid-cols-3 py-0.5 px-1 relative">
          <div className="absolute inset-0 bg-green-50" style={{ width: `${b.price * 100}%` }} />
          <span className="relative text-[11px] text-green-600 font-medium">{Math.round(b.price * 100)}¢</span>
          <span className="relative text-[11px] text-gray-600">{b.shares.toLocaleString()}</span>
          <span className="relative text-[11px] text-gray-600">{b.total.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write app/market/[id]/page.tsx**

```tsx
// web/app/market/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import MarketChart from '@/components/MarketChart';
import OrderBook from '@/components/OrderBook';
import BetPanel from '@/components/BetPanel';
import { getYesPrice, getNoPrice, OrderBookEntry } from '@/lib/amm';

interface MarketDetail {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  status: string;
  resolves_at: string;
  matches: { home_team: string; away_team: string; match_date: string } | null;
  orderBook: { asks: OrderBookEntry[]; bids: OrderBookEntry[] };
  recentBets: { side: string; coins_wagered: number; price_at_bet: number; created_at: string }[];
}

const TABS = ['ORDER BOOK', 'GRAPH', 'RESOLUTION'];

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn } = useUser();
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [activeTab, setActiveTab] = useState('ORDER BOOK');
  const [betSide, setBetSide] = useState<'yes' | 'no' | null>(null);

  function load() {
    fetch(`/api/markets/${id}`).then(r => r.json()).then(setMarket);
  }

  useEffect(load, [id]);

  if (!market) return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-widest uppercase text-gray-400">Loading...</p>
    </div>
  );

  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;

  // Mock chart data from recent bets
  const chartData = market.recentBets.slice().reverse().map((b, i) => ({
    time: new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    yes: Math.round(b.price_at_bet * 100),
    no: 100 - Math.round(b.price_at_bet * 100),
  }));
  if (chartData.length === 0) chartData.push({ time: 'NOW', yes: yesP, no: noP });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* LEFT */}
        <div className="flex-1 min-w-0">
          {market.matches && (
            <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">
              {market.matches.home_team} vs {market.matches.away_team}
            </p>
          )}
          <h1 className="text-2xl font-medium mb-1">{market.title}</h1>
          <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-8">
            {market.total_pool.toLocaleString()} coins Vol. · Resolves {new Date(market.resolves_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Outcome row */}
          <div className="flex items-center gap-6 mb-8 py-4 border-y border-gray-100">
            <div>
              <p className="text-4xl font-light">{yesP}%</p>
              <p className="text-[9px] tracking-widest uppercase text-gray-400 mt-1">YES</p>
            </div>
            <div className="flex-1 h-1 flex">
              <div className="bg-green-500 h-full transition-all" style={{ width: `${yesP}%` }} />
              <div className="bg-red-500 h-full transition-all" style={{ width: `${noP}%` }} />
            </div>
            <div className="text-right">
              <p className="text-4xl font-light">{noP}%</p>
              <p className="text-[9px] tracking-widest uppercase text-gray-400 mt-1">NO</p>
            </div>
          </div>

          {/* Buy row */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => isSignedIn ? setBetSide('yes') : (window.location.href = '/sign-in')}
              className="flex-1 bg-green-600 text-white text-[10px] tracking-widest uppercase py-3 hover:bg-green-700 transition-colors"
            >
              BUY YES {yesP}¢
            </button>
            <button
              onClick={() => isSignedIn ? setBetSide('no') : (window.location.href = '/sign-in')}
              className="flex-1 bg-red-500 text-white text-[10px] tracking-widest uppercase py-3 hover:bg-red-600 transition-colors"
            >
              BUY NO {noP}¢
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-gray-100 mb-6">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`text-[10px] tracking-widest uppercase pb-3 transition-colors ${
                  activeTab === t ? 'text-black border-b-2 border-black -mb-px' : 'text-gray-400 hover:text-black'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'ORDER BOOK' && (
            <OrderBook asks={market.orderBook.asks} bids={market.orderBook.bids} />
          )}
          {activeTab === 'GRAPH' && <MarketChart data={chartData} />}
          {activeTab === 'RESOLUTION' && (
            <div>
              <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">Resolution Criteria</p>
              <p className="text-sm text-gray-600">
                This market resolves YES if the outcome matches the match result from CricAPI after the match ends.
                Markets are auto-resolved within 10 minutes of match completion.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — sticky buy panel on desktop */}
        <div className="lg:w-72 lg:sticky lg:top-6 lg:self-start">
          <div className="border border-gray-200 p-6">
            <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">Trade</p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => isSignedIn ? setBetSide('yes') : (window.location.href = '/sign-in')}
                className="flex-1 bg-green-600 text-white text-[10px] tracking-widest uppercase py-2.5 hover:bg-green-700"
              >
                YES {yesP}¢
              </button>
              <button
                onClick={() => isSignedIn ? setBetSide('no') : (window.location.href = '/sign-in')}
                className="flex-1 bg-red-500 text-white text-[10px] tracking-widest uppercase py-2.5 hover:bg-red-600"
              >
                NO {noP}¢
              </button>
            </div>
            <p className="text-[9px] text-gray-400 tracking-wide">
              Volume: {market.total_pool.toLocaleString()} coins<br />
              Status: {market.status.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {betSide && (
        <BetPanel
          market={market}
          defaultSide={betSide}
          onClose={() => setBetSide(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
cd web && npm run dev
```
Navigate to any market URL (e.g., `/market/[valid-uuid]`). Expected: two-column layout with probability bar, order book table, sticky trade panel.

- [ ] **Step 5: Commit**

```bash
git add web/components/MarketChart.tsx web/components/OrderBook.tsx web/app/market/
git commit -m "feat: add market detail page with chart, order book, trade panel"
```

---

## Task 8: Portfolio + Leaderboard Pages

**Files:**
- Create: `web/app/portfolio/page.tsx`
- Create: `web/app/leaderboard/page.tsx`
- Create: `web/app/admin/page.tsx`

- [ ] **Step 1: Write portfolio/page.tsx**

```tsx
// web/app/portfolio/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase-server';
import { getYesPrice } from '@/lib/amm';

export default async function Portfolio() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [{ data: user }, { data: bets }] = await Promise.all([
    supabase.from('users').select('coins, username').eq('id', userId).single(),
    supabase.from('bets')
      .select('*, markets(title, status, outcome, yes_pool, no_pool, total_pool)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const open = (bets ?? []).filter(b => b.markets?.status === 'open');
  const settled = (bets ?? []).filter(b => b.markets?.status === 'resolved');
  const totalWon = settled.reduce((s, b) => s + (b.payout ?? 0), 0);
  const wins = settled.filter(b => (b.payout ?? 0) > b.coins_wagered).length;
  const winRate = settled.length ? Math.round((wins / settled.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-8">Portfolio</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-gray-100 mb-12">
        {[
          { label: 'COINS', value: (user?.coins ?? 0).toLocaleString() },
          { label: 'OPEN BETS', value: open.length },
          { label: 'TOTAL WON', value: totalWon.toLocaleString() },
          { label: 'WIN RATE', value: `${winRate}%` },
        ].map((s, i) => (
          <div key={i} className="p-6 border-r border-gray-100 last:border-r-0">
            <p className="text-3xl font-light">{s.value}</p>
            <p className="text-[9px] tracking-widest uppercase text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Open positions */}
      {open.length > 0 && (
        <div className="mb-10">
          <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">Open Positions</p>
          <div className="grid grid-cols-4 mb-2">
            {['MARKET', 'SIDE', 'WAGERED', 'CURRENT ODDS'].map(h => (
              <span key={h} className="text-[9px] tracking-widest uppercase text-gray-400">{h}</span>
            ))}
          </div>
          {open.map(b => {
            const m = b.markets;
            const currentP = m ? Math.round((b.side === 'yes'
              ? getYesPrice(m.yes_pool, m.no_pool)
              : 1 - getYesPrice(m.yes_pool, m.no_pool)) * 100) : 0;
            return (
              <div key={b.id} className="grid grid-cols-4 py-3 border-b border-gray-100">
                <span className="text-xs truncate pr-4">{m?.title}</span>
                <span className={`text-xs font-medium ${b.side === 'yes' ? 'text-green-600' : 'text-red-500'}`}>
                  {b.side.toUpperCase()}
                </span>
                <span className="text-xs">{b.coins_wagered.toLocaleString()}</span>
                <span className="text-xs">{currentP}¢</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Settled bets */}
      {settled.length > 0 && (
        <div>
          <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">Settled</p>
          <div className="grid grid-cols-4 mb-2">
            {['MARKET', 'SIDE', 'WAGERED', 'PAYOUT'].map(h => (
              <span key={h} className="text-[9px] tracking-widest uppercase text-gray-400">{h}</span>
            ))}
          </div>
          {settled.map(b => (
            <div key={b.id} className="grid grid-cols-4 py-3 border-b border-gray-100">
              <span className="text-xs truncate pr-4">{b.markets?.title}</span>
              <span className={`text-xs font-medium ${b.side === 'yes' ? 'text-green-600' : 'text-red-500'}`}>
                {b.side.toUpperCase()}
              </span>
              <span className="text-xs">{b.coins_wagered.toLocaleString()}</span>
              <span className={`text-xs font-medium ${(b.payout ?? 0) > b.coins_wagered ? 'text-green-600' : 'text-gray-400'}`}>
                {(b.payout ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write leaderboard/page.tsx**

```tsx
// web/app/leaderboard/page.tsx
import { supabase } from '@/lib/supabase-server';

export default async function Leaderboard() {
  const { data: users } = await supabase
    .from('users')
    .select('id, username, coins')
    .order('coins', { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-8">Leaderboard</p>

      <div className="grid grid-cols-3 mb-3">
        {['RANK', 'PLAYER', 'COINS'].map(h => (
          <span key={h} className="text-[9px] tracking-widest uppercase text-gray-400">{h}</span>
        ))}
      </div>

      {(users ?? []).map((u, i) => (
        <div key={u.id} className="grid grid-cols-3 py-4 border-b border-gray-100 items-center">
          <span className={`text-2xl font-light ${i < 3 ? 'text-black' : 'text-gray-300'}`}>
            {i + 1}
          </span>
          <span className="text-sm">{u.username}</span>
          <span className="text-sm font-medium">{u.coins.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write admin/page.tsx**

```tsx
// web/app/admin/page.tsx
'use client';
import { useEffect, useState } from 'react';

interface Market {
  id: string;
  title: string;
  status: string;
  yes_pool: number;
  no_pool: number;
}

export default function Admin() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/markets?status=disputed').then(r => r.json()).then(setMarkets);
  }, []);

  async function resolve(marketId: string, outcome: 'yes' | 'no') {
    setResolving(marketId);
    await fetch('/api/admin/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_id: marketId, outcome }),
    });
    setMarkets(m => m.filter(x => x.id !== marketId));
    setResolving(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-8">Admin · Disputed Markets</p>
      {markets.length === 0 && (
        <p className="text-[10px] tracking-widest uppercase text-gray-400">No disputed markets</p>
      )}
      {markets.map(m => (
        <div key={m.id} className="py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm">{m.title}</p>
          <div className="flex gap-2">
            <button
              onClick={() => resolve(m.id, 'yes')}
              disabled={resolving === m.id}
              className="text-[10px] tracking-widest uppercase bg-green-600 text-white px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
            >
              RESOLVE YES
            </button>
            <button
              onClick={() => resolve(m.id, 'no')}
              disabled={resolving === m.id}
              className="text-[10px] tracking-widest uppercase bg-red-500 text-white px-3 py-1.5 hover:bg-red-600 disabled:opacity-50"
            >
              RESOLVE NO
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

Add the admin resolve API route:

```typescript
// web/app/api/admin/resolve/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Admin check: only allow users whose Clerk ID is in the ADMIN_USER_IDS env var
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',');
  if (!adminIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { market_id, outcome } = await req.json();
  const { error } = await supabase.rpc('resolve_market', {
    p_market_id: market_id,
    p_outcome: outcome,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verify all pages load**

```bash
cd web && npm run dev
```
Navigate to /portfolio, /leaderboard, /admin. Expected: all pages render without errors.

- [ ] **Step 5: Commit**

```bash
git add web/app/portfolio/ web/app/leaderboard/ web/app/admin/ web/app/api/admin/
git commit -m "feat: add portfolio, leaderboard, and admin pages"
```

---

## Task 9: Worker Service Setup + CricAPI Client (TDD)

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/lib/cricapi.ts`
- Create: `worker/__tests__/lib/cricapi.test.ts`
- Create: `worker/lib/supabase.ts`

- [ ] **Step 1: Init worker package**

```bash
cd worker
npm init -y
npm install @supabase/supabase-js @anthropic-ai/sdk node-cron
npm install -D typescript @types/node ts-node jest @types/jest ts-jest
```

`worker/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "."
  }
}
```

`worker/package.json` scripts section:
```json
"scripts": {
  "dev": "ts-node index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest"
},
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node"
}
```

- [ ] **Step 2: Write worker/lib/supabase.ts**

```typescript
// worker/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

- [ ] **Step 3: Write failing CricAPI tests**

```typescript
// worker/__tests__/lib/cricapi.test.ts
import { parseUpcomingMatches, parseMatchResult } from '../../lib/cricapi';

describe('parseUpcomingMatches', () => {
  it('extracts id, teams, and date from CricAPI response', () => {
    const raw = {
      data: [{
        id: 'abc123',
        name: 'Mumbai Indians vs Royal Challengers Bengaluru',
        dateTimeGMT: '2025-04-05T14:00:00',
        matchType: 't20',
        series_id: 'ipl-2025',
      }]
    };
    const matches = parseUpcomingMatches(raw);
    expect(matches).toHaveLength(1);
    expect(matches[0].cricapiMatchId).toBe('abc123');
    expect(matches[0].homeTeam).toBe('Mumbai Indians');
    expect(matches[0].awayTeam).toBe('Royal Challengers Bengaluru');
    expect(matches[0].matchDate).toBeInstanceOf(Date);
  });

  it('returns empty array for malformed data', () => {
    expect(parseUpcomingMatches({})).toEqual([]);
    expect(parseUpcomingMatches({ data: null })).toEqual([]);
  });
});

describe('parseMatchResult', () => {
  it('extracts winner from match result', () => {
    const raw = {
      data: {
        matchWinner: 'Mumbai Indians',
        status: 'Match over',
      }
    };
    expect(parseMatchResult(raw)).toBe('Mumbai Indians');
  });

  it('returns null if match not complete', () => {
    const raw = { data: { status: 'Match not started', matchWinner: '' } };
    expect(parseMatchResult(raw)).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests — verify FAIL**

```bash
cd worker && npm test
```
Expected: `Cannot find module '../../lib/cricapi'`

- [ ] **Step 5: Implement cricapi.ts**

```typescript
// worker/lib/cricapi.ts

export interface ParsedMatch {
  cricapiMatchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
}

export function parseUpcomingMatches(raw: unknown): ParsedMatch[] {
  if (!raw || typeof raw !== 'object') return [];
  const data = (raw as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];

  return data
    .filter((m: unknown) => m && typeof m === 'object')
    .map((m: unknown) => {
      const match = m as Record<string, unknown>;
      const name = String(match.name ?? '');
      const parts = name.split(' vs ');
      return {
        cricapiMatchId: String(match.id ?? ''),
        homeTeam: parts[0]?.trim() ?? 'TBA',
        awayTeam: parts[1]?.trim() ?? 'TBA',
        matchDate: new Date(String(match.dateTimeGMT ?? '')),
      };
    })
    .filter(m => m.cricapiMatchId && !isNaN(m.matchDate.getTime()));
}

export function parseMatchResult(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = (raw as Record<string, unknown>).data as Record<string, unknown>;
  if (!data) return null;
  const winner = String(data.matchWinner ?? '');
  return winner && winner.length > 0 ? winner : null;
}

const BASE = 'https://api.cricapi.com/v1';

export async function fetchUpcomingMatches(apiKey: string): Promise<ParsedMatch[]> {
  const res = await fetch(`${BASE}/matches?apikey=${apiKey}&offset=0`);
  const json = await res.json();
  return parseUpcomingMatches(json);
}

export async function fetchMatchResult(apiKey: string, matchId: string): Promise<string | null> {
  const res = await fetch(`${BASE}/match_info?apikey=${apiKey}&id=${matchId}`);
  const json = await res.json();
  return parseMatchResult(json);
}
```

- [ ] **Step 6: Run tests — verify PASS**

```bash
cd worker && npm test
```
Expected: 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add worker/
git commit -m "feat: scaffold worker service with CricAPI client (TDD)"
```

---

## Task 10: Worker — Claude Client + Market Generator (TDD)

**Files:**
- Create: `worker/lib/claude.ts`
- Create: `worker/jobs/generate-markets.ts`
- Create: `worker/__tests__/jobs/generate-markets.test.ts`

- [ ] **Step 1: Write claude.ts**

```typescript
// worker/lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FALLBACK_TEMPLATES = [
  (home: string) => `Will ${home} win the match?`,
  () => `Will there be a Super Over?`,
  (home: string) => `Will ${home} post 180+ runs?`,
];

export async function generateMarketTitles(
  homeTeam: string,
  awayTeam: string,
  matchDate: Date
): Promise<string[]> {
  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Generate 3-5 YES/NO prediction market questions for this IPL match:
${homeTeam} vs ${awayTeam} on ${matchDate.toDateString()}.

Rules:
- Each question must be answerable YES or NO from match scorecard data
- Vary the questions (win, player performance, match milestones)
- Keep questions short and clear

Return ONLY a JSON array of strings, e.g.: ["Will ${homeTeam} win?", "Will there be a Super Over?"]`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in response');
    const titles: unknown = JSON.parse(match[0]);
    if (!Array.isArray(titles)) throw new Error('Not an array');
    return (titles as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 5);
  } catch {
    return FALLBACK_TEMPLATES.map(fn => fn(homeTeam, awayTeam));
  }
}
```

- [ ] **Step 2: Write failing generate-markets tests**

```typescript
// worker/__tests__/jobs/generate-markets.test.ts
import { buildMarketsForMatch } from '../../jobs/generate-markets';

describe('buildMarketsForMatch', () => {
  it('creates one market per title', () => {
    const matchId = 'match-uuid-1';
    const titles = ['Will MI win?', 'Will there be a Super Over?'];
    const matchDate = new Date('2025-04-05T14:00:00Z');
    const markets = buildMarketsForMatch(matchId, titles, matchDate);

    expect(markets).toHaveLength(2);
    expect(markets[0].match_id).toBe(matchId);
    expect(markets[0].title).toBe('Will MI win?');
    expect(markets[0].yes_pool).toBe(500);
    expect(markets[0].no_pool).toBe(500);
    expect(markets[0].status).toBe('open');
  });

  it('sets resolves_at to 4 hours after match date', () => {
    const matchDate = new Date('2025-04-05T14:00:00Z');
    const markets = buildMarketsForMatch('id', ['Will MI win?'], matchDate);
    const expected = new Date(matchDate.getTime() + 4 * 60 * 60 * 1000);
    expect(new Date(markets[0].resolves_at).getTime()).toBe(expected.getTime());
  });
});
```

- [ ] **Step 3: Run tests — verify FAIL**

```bash
cd worker && npm test
```
Expected: `Cannot find module '../../jobs/generate-markets'`

- [ ] **Step 4: Implement generate-markets.ts**

```typescript
// worker/jobs/generate-markets.ts
import { supabase } from '../lib/supabase';
import { fetchUpcomingMatches, ParsedMatch } from '../lib/cricapi';
import { generateMarketTitles } from '../lib/claude';

export interface MarketInsert {
  match_id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  status: string;
  resolves_at: string;
}

export function buildMarketsForMatch(
  matchId: string,
  titles: string[],
  matchDate: Date
): MarketInsert[] {
  const resolvesAt = new Date(matchDate.getTime() + 4 * 60 * 60 * 1000);
  return titles.map(title => ({
    match_id: matchId,
    title,
    yes_pool: 500,
    no_pool: 500,
    status: 'open',
    resolves_at: resolvesAt.toISOString(),
  }));
}

export async function runGenerateMarkets(): Promise<void> {
  const apiKey = process.env.CRICAPI_KEY!;
  const upcoming = await fetchUpcomingMatches(apiKey);

  for (const match of upcoming) {
    // Skip matches too far out (> 25h) or already past
    const hoursUntil = (match.matchDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 0 || hoursUntil > 25) continue;

    // Check if match already has markets
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('cricapi_match_id', match.cricapiMatchId)
      .single();

    if (existing) continue;

    // Upsert match
    const { data: dbMatch } = await supabase
      .from('matches')
      .insert({
        cricapi_match_id: match.cricapiMatchId,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        match_date: match.matchDate.toISOString(),
        status: 'scheduled',
      })
      .select()
      .single();

    if (!dbMatch) continue;

    // Generate market titles via Claude
    const titles = await generateMarketTitles(match.homeTeam, match.awayTeam, match.matchDate);
    const markets = buildMarketsForMatch(dbMatch.id, titles, match.matchDate);

    await supabase.from('markets').insert(markets);
    console.log(`[generate] Created ${markets.length} markets for ${match.homeTeam} vs ${match.awayTeam}`);
  }
}
```

- [ ] **Step 5: Run tests — verify PASS**

```bash
cd worker && npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add worker/lib/claude.ts worker/jobs/generate-markets.ts worker/__tests__/
git commit -m "feat: add market generator job with Claude AI and tests"
```

---

## Task 11: Worker — Market Resolver + Live Odds Updater

**Files:**
- Create: `worker/jobs/resolve-markets.ts`
- Create: `worker/__tests__/jobs/resolve-markets.test.ts`
- Create: `worker/jobs/update-live-odds.ts`
- Create: `worker/index.ts`
- Create: `worker/.env`

- [ ] **Step 1: Write failing resolver tests**

```typescript
// worker/__tests__/jobs/resolve-markets.test.ts
import { determineOutcome } from '../../jobs/resolve-markets';

describe('determineOutcome', () => {
  it('returns yes when winner matches home team', () => {
    expect(determineOutcome('Will MI win?', 'Mumbai Indians', 'Mumbai Indians')).toBe('yes');
  });

  it('returns no when winner does not match home team', () => {
    expect(determineOutcome('Will MI win?', 'Mumbai Indians', 'Chennai Super Kings')).toBe('no');
  });

  it('returns null for super over question when no super over data', () => {
    expect(determineOutcome('Will there be a Super Over?', 'MI', 'CSK', { superOver: false })).toBe('no');
    expect(determineOutcome('Will there be a Super Over?', 'MI', 'CSK', { superOver: true })).toBe('yes');
  });
});
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd worker && npm test
```
Expected: `Cannot find module '../../jobs/resolve-markets'`

- [ ] **Step 3: Implement resolve-markets.ts**

```typescript
// worker/jobs/resolve-markets.ts
import { supabase } from '../lib/supabase';
import { fetchMatchResult } from '../lib/cricapi';

interface MatchMeta { superOver?: boolean }

export function determineOutcome(
  title: string,
  homeTeam: string,
  winner: string,
  meta: MatchMeta = {}
): 'yes' | 'no' | null {
  const t = title.toLowerCase();

  if (t.includes('super over')) {
    if (meta.superOver === undefined) return null;
    return meta.superOver ? 'yes' : 'no';
  }

  // Default: "Will [team] win?" style — check if winner contains home team name
  const winnerClean = winner.toLowerCase();
  const homeClean = homeTeam.toLowerCase();
  return winnerClean.includes(homeClean) || homeClean.includes(winnerClean) ? 'yes' : 'no';
}

export async function runResolveMarkets(): Promise<void> {
  const apiKey = process.env.CRICAPI_KEY!;
  const now = new Date();

  // Find open markets past their resolves_at
  const { data: markets } = await supabase
    .from('markets')
    .select('*, matches(cricapi_match_id, home_team, away_team, winner, status)')
    .eq('status', 'open')
    .lt('resolves_at', now.toISOString());

  if (!markets || markets.length === 0) return;

  for (const market of markets) {
    const match = market.matches;
    if (!match) continue;

    let winner = match.winner;
    if (!winner) {
      winner = await fetchMatchResult(apiKey, match.cricapi_match_id);
      if (winner) {
        await supabase.from('matches').update({ winner, status: 'completed' }).eq('cricapi_match_id', match.cricapi_match_id);
      }
    }

    if (!winner) {
      await supabase.from('markets').update({ status: 'disputed' }).eq('id', market.id);
      console.log(`[resolve] Disputed: ${market.title}`);
      continue;
    }

    const outcome = determineOutcome(market.title, match.home_team, winner);
    if (!outcome) {
      await supabase.from('markets').update({ status: 'disputed' }).eq('id', market.id);
      continue;
    }

    const { error } = await supabase.rpc('resolve_market', {
      p_market_id: market.id,
      p_outcome: outcome,
    });

    if (error) {
      console.error(`[resolve] Failed for ${market.title}:`, error.message);
    } else {
      console.log(`[resolve] Resolved ${market.title} → ${outcome}`);
    }
  }
}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
cd worker && npm test
```
Expected: all tests pass.

- [ ] **Step 5: Implement update-live-odds.ts**

```typescript
// worker/jobs/update-live-odds.ts
import { supabase } from '../lib/supabase';
import { fetchMatchResult } from '../lib/cricapi';

export async function runUpdateLiveOdds(): Promise<void> {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const fourHoursAhead = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  // Find matches currently in progress
  const { data: matches } = await supabase
    .from('matches')
    .select('id, cricapi_match_id, status')
    .gte('match_date', fourHoursAgo.toISOString())
    .lte('match_date', fourHoursAhead.toISOString())
    .neq('status', 'completed');

  if (!matches || matches.length === 0) return;

  for (const match of matches) {
    // Update match status to live
    await supabase.from('matches').update({ status: 'live' }).eq('id', match.id);

    // Broadcast to Realtime channel — frontend subscribes to match:{id}
    await supabase.channel(`match:${match.id}`).send({
      type: 'broadcast',
      event: 'live_update',
      payload: { match_id: match.id, timestamp: now.toISOString() },
    });

    console.log(`[live-odds] Updated match ${match.id}`);
  }
}
```

- [ ] **Step 6: Write worker/index.ts**

```typescript
// worker/index.ts
import cron from 'node-cron';
import { runGenerateMarkets } from './jobs/generate-markets';
import { runResolveMarkets } from './jobs/resolve-markets';
import { runUpdateLiveOdds } from './jobs/update-live-odds';

async function runAllJobs() {
  console.log(`[cron] Running jobs at ${new Date().toISOString()}`);
  await runGenerateMarkets().catch(e => console.error('[generate] Error:', e));
  await runResolveMarkets().catch(e => console.error('[resolve] Error:', e));
  await runUpdateLiveOdds().catch(e => console.error('[live-odds] Error:', e));
}

// Run immediately on startup
runAllJobs();

// Then every 5 minutes
cron.schedule('*/5 * * * *', runAllJobs);

console.log('[worker] Started — running jobs every 5 minutes');
```

Create `worker/.env`:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRICAPI_KEY=your_cricapi_key
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 7: Test worker startup**

```bash
cd worker && npm run dev
```
Expected: `[worker] Started — running jobs every 5 minutes` then job logs.

- [ ] **Step 8: Commit**

```bash
git add worker/jobs/ worker/index.ts worker/.env.example
git commit -m "feat: add market resolver, live odds updater, and cron entry"
```

---

## Task 12: Deploy Config

**Files:**
- Create: `web/vercel.json`
- Create: `worker/railway.json`
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```gitignore
# Root
.env
.env.local
node_modules/
.superpowers/

# Web
web/.next/
web/node_modules/

# Worker
worker/node_modules/
worker/dist/
```

- [ ] **Step 2: Create web/vercel.json**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

- [ ] **Step 3: Create worker/Procfile for Railway**

```
web: node dist/index.js
```

Add `worker/nixpacks.toml`:
```toml
[phases.build]
cmds = ["npm install", "npm run build"]

[start]
cmd = "npm start"
```

- [ ] **Step 4: Deploy web to Vercel**

```bash
cd web && npx vercel --prod
```
Set env vars in Vercel dashboard: all variables from `.env.local`.

- [ ] **Step 5: Deploy worker to Railway**

Push to GitHub → Railway → New Project → Deploy from GitHub → select `p05-polycricket` → set Root Directory to `worker/`. Add env vars from `worker/.env`.

- [ ] **Step 6: Verify end-to-end**

1. Open deployed web URL
2. Sign in with Clerk — verify 1000 coins appear
3. Check Supabase: `users` table has your entry
4. Check Railway logs — worker job should run and log `[generate]` or `[resolve]` output
5. Place a test bet — verify coins deduct and bet appears in portfolio

- [ ] **Step 7: Final commit**

```bash
git add .gitignore web/vercel.json worker/nixpacks.toml worker/Procfile
git commit -m "feat: add deploy config for Vercel and Railway"
```

---

## Summary

| Task | Deliverable |
|---|---|
| 1 | Supabase schema + RPCs |
| 2 | Next.js scaffold + auth + env |
| 3 | AMM math library (tested) |
| 4 | All API routes |
| 5 | Navbar + LiveTicker |
| 6 | Market listing page + BetPanel |
| 7 | Market detail page (chart, order book, trade) |
| 8 | Portfolio, leaderboard, admin |
| 9 | Worker setup + CricAPI client (tested) |
| 10 | Claude client + market generator (tested) |
| 11 | Market resolver + live odds + cron |
| 12 | Deploy to Vercel + Railway |
