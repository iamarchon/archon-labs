# Claude Code Kickoff Prompt — p07-dreamxi

Paste this entire prompt into Claude Code to start the build.

---

## PROMPT TO PASTE INTO CLAUDE CODE:

```
Read CLAUDE.md fully before writing any code.

You are building p07-dreamxi — an IPL 2026 Fantasy Cricket web app for Archon Labs.

## Setup first:
1. Run: `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`
2. Install deps: `npm install zustand @clerk/nextjs @supabase/supabase-js @anthropic-ai/sdk`
3. Install dev deps: `npm install -D @types/node`

## Then build in this exact order:

### Step 1 — Types
Create `types/index.ts` using the spec in `docs/types.ts`

### Step 2 — Data
Create these files using the data in `docs/players.ts` and `docs/teams-and-fixtures.ts`:
- `lib/data/players.ts`
- `lib/data/teams.ts`  
- `lib/data/fixtures.ts`

### Step 3 — Logic
Create using `docs/engine-and-stores.ts`:
- `lib/scoring.ts`
- `lib/simulation.ts`
- `lib/stores/teamBuilder.ts` (uncomment the store code)
- `lib/stores/liveMatch.ts` (uncomment the store code)

### Step 4 — Supabase
Create `supabase/migrations/001_initial.sql` using the schema in CLAUDE.md

### Step 5 — Supabase client
Create `lib/supabase.ts`:
```typescript
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Step 6 — Hooks
Create `hooks/useMatchSimulation.ts` — encapsulates the setInterval logic from the simulation engine. Takes selectedPlayerIds, captainId, vcId. On each tick picks a random batter or bowler, generates an event, updates liveMatch store.

### Step 7 — Components (build all of these)

**`components/TeamLogo.tsx`**
- Props: `team: string, size?: number`  
- Renders the team's SVG logo inline using `dangerouslySetInnerHTML`
- Gets SVG from `TEAMS[team].logo` in lib/data/teams.ts

**`components/JerseyAvatar.tsx`**
- Props: `player: Player, size?: number, isC?: boolean, isVC?: boolean, pts?: number, compact?: boolean`
- Circular avatar with team gradient, player initials, jersey number
- C ring (gold), VC ring (purple), x2/x1.5 pill, pts badge
- No external images — all inline SVG/CSS

**`components/PitchView.tsx`**
- Props: `selObjs: Player[], captain, vc, liveStats?, onCap, onVC, onDel`
- SVG oval cricket field with grass gradient
- Players arranged in 4 rows: WK → BAT → AR → BOWL
- `liveStats` present = live mode (show pts, no buttons)
- No liveStats = build mode (show C/V/✕ buttons)

**`components/PlayerRow.tsx`**
- Props: `player, selected[], captain, vc, onToggle`
- List row with jersey avatar, full name, role badge (colored), team, selection %, credit, checkbox

**`components/ScoreHeader.tsx`**  
- Props: `fixture, homeScore, homeWickets, over, ball, userPts, userRank, mode`
- Shows both team logos, score (live mode), user's pts + rank (live/leaderboard mode), credits remaining (build mode)

**`components/BallLog.tsx`**
- Props: `events: MatchEvent[]`
- Scrolling list, newest at top, team color left border

**`components/ContestCard.tsx`**
- Props: `fixture, homeScore, homeWickets, over, ball, onLeaderboard, onLive`
- The large LIVE contest card on home screen
- Shows both team logos, score, player jersey strip (6 players), coins, CTAs

**`components/Leaderboard.tsx`**
- Props: `entries: LeaderboardEntry[], username`
- Column headers: USERNAME & RANK / WINNINGS / POINTS
- User card pinned at top (blue border)
- Coin winnings for top 3 only

**`components/BottomNav.tsx`**
- 4 tabs: My Contests / Play / Build XI / Live
- Active tab: purple indicator + purple label

### Step 8 — Layout
`app/layout.tsx`:
- ClerkProvider wrapping everything
- Import Oswald + Manrope via next/font/google
- Apply CSS vars in globals.css

### Step 9 — Pages

**`app/contests/page.tsx`** (protected by Clerk)
- LIVE / UPCOMING / HISTORY tabs
- ContestCard for the active match (fixture id=2, MI vs KKR)
- List of upcoming fixtures using TeamLogo components

**`app/play/[matchId]/page.tsx`**  
- Contest lobby
- Fixture header with both TeamLogos
- League cards (join/leave toggle)
- AI Tips button → calls /api/ai-tips
- Build Team CTA → /build/[matchId]

**`app/build/[matchId]/page.tsx`**
- ScoreHeader in build mode
- PitchView (interactive)  
- Role + team filter pills
- Player list using PlayerRow
- Overseas warning at 4
- Sticky "Lock Team & Start Match" button when valid → /live/[matchId]

**`app/live/[matchId]/page.tsx`**
- Calls useMatchSimulation hook
- ScoreHeader in live mode
- Progress bar (overs)
- PitchView (live mode with pts)
- BallLog
- Mini leaderboard (top 5) + See All link

**`app/leaderboard/[matchId]/page.tsx`**
- ScoreHeader
- Leaderboard component (full list)

### Step 10 — API Routes

**`app/api/ai-tips/route.ts`**
```typescript
// POST { homeTeam, awayTeam, venue, date, homePlayers, awayPlayers }
// Calls Anthropic claude-sonnet-4-20250514
// System: "IPL fantasy expert. Give exactly 3 bullet points: C/VC pick, must-have pick, player to avoid. Bold, specific, no fluff."
// Returns streaming text
```

**`app/api/webhooks/clerk/route.ts`**  
- Handles user.created → insert into supabase users table with clerk_id + username + 10000 coins

### Step 11 — Env file
Create `.env.local.example` from the template in `docs/engine-and-stores.ts`

## Design rules (always follow):
- Mobile-first, max-width 480px container
- Dark theme only — bg-base #0a0e1a
- Oswald for scores/labels, Manrope for body
- No external images — jersey avatars and team logos are inline SVG
- Bottom nav is fixed, 4 tabs
- All pages behind Clerk auth middleware

## Don't:
- Use `any` type
- Use external image sources (iplt20.com blocks cross-origin)
- Add real money / payments / Stripe
- Hardcode credentials

## When done:
Run `npm run build` and fix all TypeScript errors before reporting complete.
```
