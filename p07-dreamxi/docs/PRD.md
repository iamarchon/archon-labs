# PRD — p07-dreamxi: IPL 2026 Fantasy Cricket

**Author:** iamarchon (Archon Labs)
**Project code:** p07-dreamxi
**Date:** March 2026
**Status:** Ready to build

---

## 1. Overview

A mobile-first web app where users pick fantasy cricket teams for IPL 2026 matches, compete in leagues, and track live fantasy points as match simulation runs. No real money — virtual coins only.

**Inspiration:** Dream11 UX pattern (team building on pitch, live leaderboard, contest lobby) but entirely free-to-play with 🪙 coins.

---

## 2. User Stories

### Auth
- As a user, I can sign in with Google via Clerk so I don't need a password
- As a user, I start with 🪙 10,000 virtual coins

### Contests (Home)
- As a user, I see a LIVE tab showing active matches with live scores
- As a user, I see UPCOMING fixtures I can enter
- As a user, I can tap a fixture to go to its contest lobby

### Team Building
- As a user, I select 11 players from the 2 teams playing in a fixture
- As a user, I cannot exceed 100 credits, 7 players from one team, or 4 overseas players
- As a user, I assign a Captain (2× points) and Vice-Captain (1.5×)
- As a user, I see each player's jersey avatar with initials + jersey number (no photos needed)
- As a user, I see the players arranged on a cricket pitch (WK / BAT / AR / BOWL rows)
- As a user, I can filter the player pool by role (BAT/BOWL/AR/WK) and team
- As a user, I can tap C/V/✕ buttons on each player in the pitch view

### Leagues
- As a user, I can join public grand leagues for a fixture
- As a user, I can create private leagues and invite friends
- As a user, I see how many coins the top 3 players win

### Live Match
- As a user, I see a live ball-by-ball simulation with my players' points updating
- As a user, I see a live leaderboard showing my rank vs. other entrants
- As a user, I see a ball log with each event's description
- As a user, I see my full team on the pitch with live points shown below each player

### Leaderboard
- As a user, I see all entrants ranked by live fantasy points
- As a user, my card is pinned at the top with my score + rank
- As a user, I see coin winnings next to the top 3 ranks

### AI Tips
- As a user, I can tap "Get AI Tips" on the contest lobby to get 3 bullet-point tips for that fixture (C/VC pick, must-have, avoid)

---

## 3. Screens & Navigation

### Bottom Navigation (fixed, 4 tabs)
| Tab | Icon | Route |
|-----|------|-------|
| My Contests | 🏆 | `/contests` |
| Play | ▶ | `/play/[matchId]` |
| Build XI | 🏗 | `/build/[matchId]` |
| Live | 📡 | `/live/[matchId]` |

### Screen List
1. **My Contests** — home screen, LIVE/UPCOMING/HISTORY tabs
2. **Play** — contest lobby for a fixture, join leagues, AI tips
3. **Build XI** — player selection + pitch view
4. **Live** — live match simulation + pitch + ball log + leaderboard preview
5. **Leaderboard** — full ranked list with coins

---

## 4. Fantasy Rules

| Rule | Value |
|------|-------|
| Budget | 100 credits |
| Team size | 11 players |
| Max from one IPL team | 7 |
| Max overseas players | 4 |
| Captain multiplier | 2× |
| Vice-Captain multiplier | 1.5× |

### Points System
| Action | Points |
|--------|--------|
| Run scored | +1 |
| Four hit | +1 bonus (so +5 total) |
| Six hit | +2 bonus (so +8 total) |
| 25-run milestone | +4 |
| 50-run milestone | +8 |
| 75-run milestone | +12 |
| 100-run milestone | +16 |
| Wicket taken | +25 |
| Dot ball (bowler) | +1 |
| Maiden over | +12 |
| 3-wicket haul | +8 bonus |
| 5-wicket haul | +16 bonus |

---

## 5. Design Spec

### Theme
- Dark mode only
- Mobile-first, max-width 480px, centered
- Feels like a native mobile app

### Colors
| Variable | Value |
|----------|-------|
| `--bg-base` | `#0a0e1a` |
| `--bg-card` | `#0d1120` |
| `--bg-elevated` | `#0f172a` |
| `--border` | `#1e293b` |
| `--text-primary` | `#e2e8f0` |
| `--text-muted` | `#64748b` |
| `--accent-purple` | `#a78bfa` |
| `--accent-blue` | `#38bdf8` |
| `--accent-green` | `#4ade80` |
| `--accent-orange` | `#fb923c` |
| `--accent-gold` | `#FFD700` |
| `--live-red` | `#ef4444` |

### Fonts
- **Oswald** (700): Scores, section labels, team names, jersey numbers
- **Manrope** (400/600/800): All body text, player names, descriptions

### Player Avatars
- Circular SVG, no external images
- Background: team primary color radial gradient
- Content: player initials (2 chars) + jersey number
- C/VC: gold/purple glow ring + x2/x1.5 pill badge
- Overseas players: 🌍 indicator

### Team Logos
- Circular SVG, inline, no external images
- Team abbreviation + full name + team colors

### Pitch View
- SVG oval cricket field (green gradient)
- Players arranged in rows: WK row → BAT row → AR row → BOWL row
- In build mode: C/V/✕ buttons below each player
- In live mode: points badge below each player, read-only

---

## 6. Tech Constraints

- Next.js 14 App Router, TypeScript strict
- No `any` types
- Tailwind CSS utility classes only (no custom CSS files except globals.css for vars)
- Supabase for auth sync + DB + Realtime
- Clerk for auth (Google social login)
- Simulation runs client-side in browser (useMatchSimulation hook with setInterval)
- AI tips via server action / API route (POST to Anthropic, streaming)
- Vercel deployment

---

## 7. Out of Scope (v1)

- Real money / payments
- Push notifications
- Native mobile app
- Live real cricket API integration (simulation only for v1)
- Player injury flags / Impact Player logic
- Historical stats / past seasons
- Social features (chat, comments)

---

## 8. Success Criteria

- User can complete full flow: sign in → pick fixture → build team → join league → watch live match → see final rank
- Build XI enforces all fantasy rules (credits, max team, max overseas, C/VC)
- Live simulation runs for full 20 overs, updates leaderboard in real time
- AI tips return within 5 seconds
- Loads on mobile in < 3s
