# p07-dreamxi — IPL 2026 Fantasy Cricket App

## Project Identity
- **Project:** p07-dreamxi
- **Owner:** iamarchon (Archon Labs)
- **Repo:** github.com/iamarchon/archon-labs (monorepo, lives at `/projects/p07-dreamxi`)
- **Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase · Clerk Auth
- **Status:** Active build — no existing code, greenfield

---

## What This Is

A full-stack IPL 2026 fantasy cricket web app modelled after Dream11 UX.
**No real money.** Virtual coins only (🪙). Think Dream11 but free-to-play with coins.

Core loop:
1. User picks a fixture → selects 11 players (100cr budget, real IPL 2026 rosters)
2. Assigns Captain (2×) and Vice-Captain (1.5×)
3. Joins leagues (public grand leagues + private)
4. Watches live score simulation with real-time fantasy point updates
5. Sees leaderboard animate as match progresses

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 14 App Router | `/app` directory, RSC where possible |
| Language | TypeScript strict | No `any` allowed |
| Styling | Tailwind CSS + CSS vars | Dark theme only, mobile-first |
| Auth | Clerk | Social login (Google), JWT in middleware |
| Database | Supabase (Postgres) | Auth sync via Clerk webhook |
| Realtime | Supabase Realtime | Live score + leaderboard channels |
| State | Zustand | Client-side game state |
| Fonts | Oswald (display) + Manrope (body) | Google Fonts, next/font |
| AI Tips | Anthropic claude-sonnet-4-20250514 | Server action, streaming |
| Deployment | Vercel | env vars in Vercel dashboard |

---

## Env Variables Required

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

ANTHROPIC_API_KEY=
```

---

## Project Structure

```
p07-dreamxi/
├── CLAUDE.md                    ← you are here
├── .env.local                   ← secrets (gitignored)
├── app/
│   ├── layout.tsx               ← ClerkProvider, fonts, global styles
│   ├── page.tsx                 ← redirect → /contests
│   ├── (auth)/
│   │   └── sign-in/page.tsx
│   ├── contests/
│   │   └── page.tsx             ← My Contests screen (home)
│   ├── play/[matchId]/
│   │   └── page.tsx             ← Contest lobby for a fixture
│   ├── build/[matchId]/
│   │   └── page.tsx             ← Build XI screen
│   ├── live/[matchId]/
│   │   └── page.tsx             ← Live match + pitch view
│   ├── leaderboard/[matchId]/
│   │   └── page.tsx             ← Full leaderboard
│   └── api/
│       ├── ai-tips/route.ts     ← POST → Anthropic streaming
│       └── webhooks/clerk/route.ts
├── components/
│   ├── ui/                      ← shadcn primitives
│   ├── TeamLogo.tsx             ← SVG inline logos, all 10 teams
│   ├── JerseyAvatar.tsx         ← Player jersey card (SVG, no images)
│   ├── PitchView.tsx            ← Oval cricket pitch with player rows
│   ├── PlayerRow.tsx            ← Player list item (build screen)
│   ├── ScoreHeader.tsx          ← Live score banner
│   ├── Leaderboard.tsx          ← Animated rank rows
│   ├── BallLog.tsx              ← Ball-by-ball event ticker
│   ├── ContestCard.tsx          ← Match contest card (home)
│   └── BottomNav.tsx            ← Mobile nav bar
├── lib/
│   ├── data/
│   │   ├── players.ts           ← All 54 players, IPL 2026 rosters
│   │   ├── fixtures.ts          ← First 20 fixtures with venues/dates
│   │   └── teams.ts             ← 10 teams, colors, SVG logos
│   ├── scoring.ts               ← Fantasy points engine
│   ├── simulation.ts            ← Match event generator
│   ├── supabase.ts              ← Supabase client (client + server)
│   └── stores/
│       ├── teamBuilder.ts       ← Zustand: sel, cap, vc, credits
│       └── liveMatch.ts         ← Zustand: liveStats, matchLog, over/ball
├── hooks/
│   ├── useMatchSimulation.ts    ← interval-based event emitter
│   └── useLeaderboard.ts        ← Supabase realtime subscription
├── types/
│   └── index.ts                 ← Player, Fixture, Team, MatchEvent types
└── supabase/
    └── migrations/
        └── 001_initial.sql      ← DB schema
```

---

## Database Schema

```sql
-- Users (synced from Clerk)
create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  username text unique not null,
  coins integer default 10000,
  created_at timestamptz default now()
);

-- Teams created by users for a fixture
create table fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  fixture_id integer not null,
  team_name text not null,
  player_ids integer[] not null,  -- 11 player IDs
  captain_id integer not null,
  vc_id integer not null,
  created_at timestamptz default now()
);

-- Leagues
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fixture_id integer not null,
  creator_id uuid references users(id),
  is_public boolean default false,
  prize_coins integer default 0,
  max_members integer default 100,
  created_at timestamptz default now()
);

-- League membership
create table league_members (
  league_id uuid references leagues(id),
  user_id uuid references users(id),
  fantasy_team_id uuid references fantasy_teams(id),
  primary key (league_id, user_id)
);

-- Live match state (updated by simulation)
create table match_state (
  fixture_id integer primary key,
  home_score integer default 0,
  home_wickets integer default 0,
  away_score integer default 220,
  away_wickets integer default 4,
  current_over integer default 0,
  current_ball integer default 0,
  status text default 'upcoming', -- upcoming | live | completed
  updated_at timestamptz default now()
);

-- Per-player live stats
create table player_match_stats (
  fixture_id integer not null,
  player_id integer not null,
  runs integer default 0,
  wickets integer default 0,
  fours integer default 0,
  sixes integer default 0,
  dots integer default 0,
  maidens integer default 0,
  primary key (fixture_id, player_id)
);

-- Enable realtime
alter publication supabase_realtime add table match_state;
alter publication supabase_realtime add table player_match_stats;
```

---

## Fantasy Points Engine

```typescript
// lib/scoring.ts
export function calcPoints(stats: PlayerStats): number {
  const { runs=0, wickets=0, fours=0, sixes=0, dots=0, maidens=0 } = stats;
  let pts = runs + fours + sixes * 2 + wickets * 25 + dots + maidens * 12;
  if (runs >= 25)  pts += 4;
  if (runs >= 50)  pts += 8;
  if (runs >= 75)  pts += 12;
  if (runs >= 100) pts += 16;
  if (wickets >= 3) pts += 8;
  if (wickets >= 5) pts += 16;
  return Math.max(0, pts);
}

export function totalPts(playerIds: number[], capId: number, vcId: number, stats: Record<number, PlayerStats>): number {
  return playerIds.reduce((sum, id) => {
    const mult = id === capId ? 2 : id === vcId ? 1.5 : 1;
    return sum + calcPoints(stats[id] ?? {}) * mult;
  }, 0);
}
```

---

## Team Builder Rules

```typescript
const MAX_CREDITS = 100;
const TEAM_SIZE = 11;
const MAX_FROM_ONE_TEAM = 7;
const MAX_OVERSEAS = 4;
```

Validation checklist:
- [ ] Exactly 11 players selected
- [ ] Credits used ≤ 100
- [ ] Max 7 players from any single team
- [ ] Max 4 overseas players
- [ ] Captain assigned (≠ VC)
- [ ] Vice-Captain assigned (≠ Captain)

---

## Design System

### Colors (CSS vars in globals.css)
```css
--bg-base: #0a0e1a;
--bg-card: #0d1120;
--bg-elevated: #0f172a;
--border: #1e293b;
--text-primary: #e2e8f0;
--text-muted: #64748b;
--accent-purple: #a78bfa;
--accent-blue: #38bdf8;
--accent-green: #4ade80;
--accent-orange: #fb923c;
--accent-gold: #FFD700;
--live-red: #ef4444;
```

### Team Colors
See `lib/data/teams.ts` — each team has `c1` (primary) and `c2` (accent).

### Fonts
- **Oswald** — scores, team names, section headers, jersey numbers
- **Manrope** — all body text, player names, descriptions

### Key Components
- `TeamLogo` — inline SVG circle badge, no external images
- `JerseyAvatar` — player circle with initials + jersey # + team gradient, C/VC ring + multiplier pill
- `PitchView` — SVG oval field, players arranged WK → BAT → AR → BOWL rows
- Bottom nav: 4 tabs — My Contests / Play / Build XI / Live

---

## AI Tips Feature

```typescript
// app/api/ai-tips/route.ts
// POST { homeTeam, awayTeam, venue, date, homePlayers, awayPlayers }
// Returns streaming text from claude-sonnet-4-20250514
// System: "IPL fantasy expert. 3 bullet points: C/VC pick, must-have, avoid."
// No real money framing ever
```

---

## Simulation Engine

Match runs client-side via `useMatchSimulation` hook.
- Interval: 1100ms per ball
- 20 overs = 120 balls
- Events: six, four, wicket, run1, run2, dot, maiden
- On each event: update Zustand liveStats → recalc fantasy points → sort leaderboard

For production: move to Supabase Edge Function + Realtime broadcast.

---

## Key Screens

### My Contests (home)
- LIVE / UPCOMING / HISTORY tabs
- Live contest card: team logos, score, contest count, Leaderboard + Watch Live CTAs
- Player jersey strip (6 jerseys from active match)
- Upcoming fixture cards: both team logos, date/time, venue, "TAP TO PLAY" CTA

### Play (contest lobby for a fixture)
- Fixture header with team logos
- League cards (join/leave, prize, member count)
- AI Tips button → streaming response
- Build Team CTA

### Build XI
- Score header with credits remaining + player count
- `PitchView` (interactive — tap C/VC/remove buttons on each player)
- Role filter pills (ALL / BAT / BOWL / AR / WK)
- Team filter (Home / Away / ALL)
- Player list rows with jersey avatar, role badge, credit, selection %
- Overseas cap warning at 4
- Sticky "Lock Team & Start Match" CTA when team valid

### Live
- Score header (home innings vs away target)
- Progress bar (overs)
- Pitch view (read-only, shows live pts on each jersey)
- Ball log (scrolling ticker, team color left-border)
- Mini leaderboard (top 5, See All →)
- Match over card with final rank

### Leaderboard
- Back arrow, LIVE badge
- Score header
- User pinned card (B badge, rank, points)
- Column headers: Username & Rank / Winnings / Points
- Rows with avatar initial, username, rank badge, coin winnings (top 3 only), points

---

## Build Order for Claude Code

1. `types/index.ts` — all types first
2. `lib/data/` — teams, players, fixtures data
3. `lib/scoring.ts` + `lib/simulation.ts`
4. `lib/stores/` — Zustand stores
5. `supabase/migrations/001_initial.sql` — run this in Supabase dashboard
6. `lib/supabase.ts` — client helpers
7. `components/` — all components, start with TeamLogo + JerseyAvatar
8. `app/layout.tsx` — fonts + providers
9. `app/contests/page.tsx` — home screen
10. `app/play/[matchId]/page.tsx`
11. `app/build/[matchId]/page.tsx`
12. `app/live/[matchId]/page.tsx`
13. `app/leaderboard/[matchId]/page.tsx`
14. `app/api/ai-tips/route.ts`
15. `app/api/webhooks/clerk/route.ts`

---

## Notes

- All player avatars are SVG-generated inline — no external image dependencies
- Team logos are inline SVG — no external image dependencies  
- No real money, no payments, no Stripe
- Coins are virtual only — earned/spent within the app
- IPL data (players, fixtures) is hardcoded from 2026 season rosters
- Mobile-first layout, max-width 480px centered, feels like a native app
