# MISSION — p07-dreamxi: DreamXI
**Issued by:** Boss (iamarchon)
**Priority:** HIGH
**Issued:** 2026-03-30

---

## What You're Building

An IPL 2026 fantasy cricket web app. Full-stack. Greenfield. Ship it.

Read `CLAUDE.md` completely before touching any code. It has the stack, structure, DB schema, design system, and build order. `docs/` has the full PRD, types, player data, teams/fixtures, scoring engine, and Zustand stores.

**Stack:** Next.js 14 App Router · TypeScript (strict, no `any`) · Tailwind CSS · Supabase · Clerk Auth · Zustand · Anthropic AI tips

---

## Design Standard — NON-NEGOTIABLE

Do NOT ship generic AI-generated UI. This needs to look and feel like a premium mobile product.

**References to study before designing:**
- Dream11 (dream11.com) — the gold standard for this UX pattern
- Gully Cricket fantasy app
- DraftKings (draftkings.com) — US fantasy sports, polish reference
- FanDuel (fanduel.com) — US fantasy, card designs
- MPL (mpl.live) — mobile-first fantasy

The UI must feel like a **native mobile app**. Dark theme. Max 480px centered. Crisp typography (Oswald + Manrope as specified). Team colors matter — use them aggressively in gradients, borders, badges.

If you are unsure about a design decision or need Boss to pick between two approaches, **ask on Telegram**. Do not guess on design.

---

## How to Execute

1. Read CLAUDE.md and all docs/ files first
2. Use the coder agent for all implementation
3. Use the reviewer agent to review each major step
4. Use the tester agent once screens are built
5. Spawn additional specialist agents if needed (e.g. a dedicated UI agent)
6. Follow the 11-step build order in CLAUDE.md exactly
7. Run `npm run build` after each major step — fix TypeScript errors immediately, don't accumulate them

---

## Reporting

- Update Boss on Telegram every 30 minutes with: what's done, what's in progress, any blockers, any design questions
- Flag blockers immediately — don't sit on them
- When `npm run build` passes clean with zero errors, report complete with a summary

---

## Repo

Monorepo: `iamarchon/archon-labs`
Project lives at: `projects/p07-dreamxi` (or `/p07-dreamxi` at repo root — check current structure)
Branch: `feature/p07-dreamxi`

Create the branch, build there, open a PR when complete.

---

## Env Vars Needed

Boss needs to supply:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`

Ask Boss on Telegram if these are not in `.env.local` yet.
