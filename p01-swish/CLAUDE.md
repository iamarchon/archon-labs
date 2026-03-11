# Swish — Virtual Stock Trading for Under-18s
# "Nothing but net."
# Archon Labs · Project 01

---

## 🎯 What This Is
A gamified, Apple-grade web app teaching kids (8–18) to invest through
virtual stock trading. No real money. No social feed. No strangers.
Target users: self-directed students AND classroom assignments.

---

## 🏗 Tech Stack
| Layer       | Tool                              | Status    |
|-------------|-----------------------------------|-----------|
| Frontend    | React + Vite                      | ✅ Active  |
| Styling     | Tailwind CSS (after scaffold)     | Week 1    |
| Stock data  | Finnhub WebSocket + REST          | Week 2    |
| Auth        | Clerk                             | Week 3    |
| Database    | Supabase (Postgres)               | Week 3    |
| AI Coach    | Anthropic claude-sonnet-4-20250514| ✅ Active  |
| Deploy      | Vercel                            | Week 4    |

---

## 📁 File Structure
```
src/
  pages/
    Dashboard.jsx     ← Home: portfolio hero, challenges, leaderboard, holdings, movers
    Markets.jsx       ← Wraps StockSearch — full market with search
    Portfolio.jsx     ← Full holdings breakdown + chart
    Learn.jsx         ← XP-gated lessons
    Leaderboard.jsx   ← Class + global rankings
    Coach.jsx         ← AI investing coach (Claude-powered)
  components/
    TopNav.jsx        ← Frosted glass nav bar
    TickerStrip.jsx   ← Live price ticker
    StockSearch.jsx   ← Full-market search (Finnhub symbol search API)
    TradeModal.jsx    ← Buy/sell sheet modal
    Card.jsx          ← White card with hover lift
    Reveal.jsx        ← Scroll-triggered fade+slide reveal
    Sparkline.jsx     ← SVG mini chart with gradient fill
    ProgressBar.jsx   ← XP / challenge progress bar
  tokens.js           ← All design tokens (T object)
  App.jsx             ← React Router wiring
  main.jsx            ← Entry point
```

---

## 🎨 Design System — Apple-Grade Rules

### The ONE rule above all others:
**Every screen must look like it belongs on apple.com. If it doesn't,
it's not done. No exceptions.**

### Color Tokens (tokens.js)
```js
export const T = {
  white:    "#ffffff",
  bg:       "#f5f5f7",   // Apple near-white — ALWAYS the page background
  ink:      "#1d1d1f",   // Apple headline black
  inkMid:   "#424245",
  inkSub:   "#6e6e73",   // Body text
  inkFaint: "#86868b",
  line:     "#e8e8ed",   // Hairline separators
  ghost:    "#d2d2d7",
  accent:   "#0071e3",   // Apple blue — ONE accent, used sparingly
  green:    "#1a7f3c",   // Financial green — deep, NOT neon
  greenBg:  "#f0faf4",
  red:      "#c0392b",
  redBg:    "#fdf2f2",
  amber:    "#b45309",
};
```

### Typography
- Font: DM Sans (Google Fonts) — loaded in index.html
- Headlines: 32–60px, weight 700, letter-spacing -0.8px to -2.5px
- Body: 14–16px, weight 400, line-height 1.65
- Labels: 11–12px, weight 500–600, letter-spacing 0.04–0.06em, UPPERCASE
- Numbers: always `font-variant-numeric: tabular-nums`

### Spacing
- Page padding: 40px top, 28px sides, 100px bottom
- Card padding: 28px–52px depending on hierarchy
- Section gaps: 20px between cards, 28–36px within cards
- NEVER collapse whitespace. Breathing room IS the design.

### Cards
```jsx
// Every surface is a white card floating on #f5f5f7
background: #ffffff
border-radius: 20px
box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)
// On hover:
box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)
transform: translateY(-2px)
transition: 220ms ease
```

### Navigation
- Fixed top bar, 52px height
- Frosted glass: `backdrop-filter: saturate(180%) blur(20px)`
- Background: `rgba(255,255,255,0.76)` → `rgba(255,255,255,0.88)` on scroll
- Active page: 2px accent underline dot centered below label
- NO sidebar. NO bottom tabs on desktop.

### Animations — The Apple Way
```
Scroll reveal:    opacity 0→1 + translateY(24px→0), 650ms ease, staggered by 70ms
Page transition:  fadeIn 200ms ease
Modal open:       scale(0.95)→scale(1) + translateY(12px→0), 260ms spring
                  cubic-bezier(0.34, 1.56, 0.64, 1)
Card hover:       translateY(-2px), 220ms ease
Button hover:     opacity 0.88, 150ms ease
Price flash:      color transition 450ms ease (green/red → ink)
Toast:            scale(0.95)→scale(1) spring, same cubic-bezier
```

### What NEVER to do
- ❌ Dark backgrounds (except trade modal overlay)
- ❌ Neon colors — green is #1a7f3c not #00ff00
- ❌ Borders on cards — use box-shadow instead
- ❌ Heavy shadows — max opacity 0.10
- ❌ More than ONE accent color per section
- ❌ Emoji in UI (except leaderboard medals 🥇🥈🥉 and streak 🔥)
- ❌ Inline styles — Tailwind only (after scaffold)
- ❌ Busy layouts — if it feels crowded, add more space
- ❌ System fonts — always DM Sans
- ❌ Generic AI-slop aesthetics (purple gradients, Inter font, etc.)

---

## 📈 Stock Data Architecture

### Featured stocks (StockSearch.jsx)
20 curated brands kids know — shown by default, filterable by sector.
Sectors: Tech, Media, Gaming, Social, Fintech, Consumer, Auto, Retail,
Food, Travel, Crypto, Transport.

### Full market search
Finnhub symbol search API: `https://finnhub.io/api/v1/search`
- Debounced 320ms after keystroke
- Filter: type === "Common Stock", no dots in symbol (US only)
- Max 12 results per search
- Fallback to featured filter when no API key

### Live prices
Finnhub WebSocket: `wss://ws.finnhub.io`
- Subscribe all tickers on connect
- Reconnect on disconnect with exponential backoff
- Batch state updates — don't re-render per tick

### Watchlist
- User-local state (Supabase in Week 3)
- Toggle star icon on any StockRow
- Watchlisted stocks appear at top of Markets page

---

## 🎮 Gamification System
```
XP sources:
  First trade:       +100 XP
  Each trade:        +10 XP
  Win a challenge:   +100–200 XP
  Complete a lesson: +50–150 XP
  Daily login:       +20 XP
  7-day streak:      +150 XP bonus

Levels:
  0–499     Bronze
  500–1,499 Silver
  1,500–4,999 Gold
  5,000–9,999 Diamond
  10,000+   Legend
```

---

## 🛡 Safety & Compliance Rules
- NO real money — virtual $10,000 starting balance only
- NO social feed — no public user content, no strangers
- NO chat between users
- COPPA-aware: no PII collected for under-13 without parental consent
- Class codes: teacher creates → students join → class-scoped leaderboard only
- All API keys in .env — never committed to git

---

## 💻 Coding Standards

### Components
- Functional components only — NO class components
- Max 200 lines per file — split ruthlessly if longer
- Props must have clear names — no `data`, `info`, `obj`
- Co-locate small helpers at top of file, shared helpers in utils/

### State
- Local UI state: useState
- Shared app state: prop drilling is fine for now (Zustand in Week 3)
- Server state: direct fetch (React Query in Week 3)

### Performance
- Debounce all search inputs (320ms)
- Batch Finnhub WebSocket updates
- Memoize expensive renders with useMemo/useCallback
- Lazy load pages with React.lazy + Suspense (Week 2)

### Error handling
- Every fetch wrapped in try/catch
- User-visible error states (not console.error only)
- API key missing → graceful fallback, not broken UI

---

## 🚀 Session Roadmap

### ✅ Session 1 — Scaffold
Vite + React, split swish.jsx + StockSearch.jsx into components,
React Router, confirm localhost:5173.

### Session 2 — Live Data
Finnhub WebSocket for real-time prices on all held + watched stocks.
REST quote endpoint for search results. Reconnection logic.

### Session 3 — Auth + Database
Clerk sign-in (Google + email). Supabase schema:
- users(id, clerk_id, username, xp, level, cash, streak)
- holdings(id, user_id, ticker, shares, avg_cost)
- transactions(id, user_id, ticker, action, shares, price, created_at)
- watchlist(id, user_id, ticker)
Load/persist on every trade.

### Session 4 — Deploy
Vercel CLI, env vars, custom domain (swish.gg?), update README.

### Session 5 — Polish
Responsive (tablet first, then mobile), loading skeletons,
AI Coach end-to-end test, accessibility audit, Lighthouse score > 90.

---

## ⚠️ End of EVERY Session (NON-NEGOTIABLE)
```bash
git add .
git commit -m "feat: [what you built]"
git push origin main
```
No exceptions. If you forget, the work didn't happen.

---

## 🧠 Claude Code Reminders
- Read this file at the START of every session
- Read the relevant page/component file before editing it
- Run `npm run dev` and visually verify before committing
- If something looks off visually — FIX IT. Don't ship ugly.
- The standard is apple.com. Not "good enough". Apple.
