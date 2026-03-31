// ─────────────────────────────────────────────────────────────────────────────
// lib/scoring.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { PlayerStats } from "@/types";

export function calcPoints(stats: PlayerStats): number {
  const { runs = 0, wickets = 0, fours = 0, sixes = 0, dots = 0, maidens = 0 } = stats;
  let pts = runs + fours + sixes * 2 + wickets * 25 + dots + maidens * 12;
  if (runs >= 25)  pts += 4;
  if (runs >= 50)  pts += 8;
  if (runs >= 75)  pts += 12;
  if (runs >= 100) pts += 16;
  if (wickets >= 3) pts += 8;
  if (wickets >= 5) pts += 16;
  return Math.max(0, pts);
}

export function totalTeamPoints(
  playerIds: number[],
  captainId: number | null,
  vcId: number | null,
  liveStats: Record<number, PlayerStats>
): number {
  return playerIds.reduce((sum, id) => {
    const mult = id === captainId ? 2 : id === vcId ? 1.5 : 1;
    return sum + calcPoints(liveStats[id] ?? {}) * mult;
  }, 0);
}


// ─────────────────────────────────────────────────────────────────────────────
// lib/simulation.ts
// Ball-by-ball match event generator
// ─────────────────────────────────────────────────────────────────────────────

export type EventType = "six" | "four" | "wicket" | "run2" | "run1" | "dot" | "maiden";

export interface BallEvent {
  type: EventType;
  label: string;
  isBatEvent: boolean;  // true = batter scored, false = bowler took action
  runs: number;         // runs added to total score
}

const BAT_EVENTS: BallEvent[] = [
  { type: "six",     label: "🏏 SIX!!",     isBatEvent: true,  runs: 6 },
  { type: "four",    label: "⚡ FOUR!",     isBatEvent: true,  runs: 4 },
  { type: "wicket",  label: "Wicket 💥",    isBatEvent: true,  runs: 0 },
  { type: "run2",    label: "2 runs",        isBatEvent: true,  runs: 2 },
  { type: "run1",    label: "Single",        isBatEvent: true,  runs: 1 },
  { type: "dot",     label: "Dot ball",      isBatEvent: true,  runs: 0 },
];

const BOWL_EVENTS: BallEvent[] = [
  { type: "wicket",  label: "Wicket!! 🎯",  isBatEvent: false, runs: 0 },
  { type: "maiden",  label: "Maiden 🔒",    isBatEvent: false, runs: 0 },
  { type: "dot",     label: "Dot ball",      isBatEvent: false, runs: 0 },
  { type: "run1",    label: "Run given",     isBatEvent: false, runs: 1 },
];

// Weighted random event picker
export function generateEvent(isBatEvent: boolean): BallEvent {
  const r = Math.random();
  if (isBatEvent) {
    if (r < 0.04) return BAT_EVENTS[0];  // six
    if (r < 0.12) return BAT_EVENTS[1];  // four
    if (r < 0.19) return BAT_EVENTS[2];  // wicket
    if (r < 0.35) return BAT_EVENTS[3];  // run2
    if (r < 0.55) return BAT_EVENTS[4];  // run1
    return BAT_EVENTS[5];                 // dot
  } else {
    if (r < 0.07) return BOWL_EVENTS[0]; // wicket
    if (r < 0.14) return BOWL_EVENTS[1]; // maiden
    if (r < 0.45) return BOWL_EVENTS[2]; // dot
    return BOWL_EVENTS[3];               // run given
  }
}

export function applyEventToStats(
  current: Record<string, number>,
  event: BallEvent,
  isBatEvent: boolean
): Record<string, number> {
  const next = { ...current };
  if (event.type === "six")    { next.runs = (next.runs ?? 0) + 6; next.sixes = (next.sixes ?? 0) + 1; }
  if (event.type === "four")   { next.runs = (next.runs ?? 0) + 4; next.fours = (next.fours ?? 0) + 1; }
  if (event.type === "run2" && isBatEvent) next.runs = (next.runs ?? 0) + 2;
  if (event.type === "run1" && isBatEvent) next.runs = (next.runs ?? 0) + 1;
  if (event.type === "wicket" && !isBatEvent) next.wickets = (next.wickets ?? 0) + 1;
  if (event.type === "dot")    next.dots = (next.dots ?? 0) + 1;
  if (event.type === "maiden") { next.maidens = (next.maidens ?? 0) + 1; next.dots = (next.dots ?? 0) + 6; }
  return next;
}


// ─────────────────────────────────────────────────────────────────────────────
// lib/stores/teamBuilder.ts — Zustand store
// ─────────────────────────────────────────────────────────────────────────────
/*
import { create } from "zustand";
import type { Player } from "@/types";

const MAX_CREDITS = 100;
const TEAM_SIZE = 11;
const MAX_FROM_ONE_TEAM = 7;
const MAX_OVERSEAS = 4;

interface TeamBuilderStore {
  selected: number[];
  captain: number | null;
  vc: number | null;
  togglePlayer: (id: number, allPlayers: Player[]) => void;
  toggleCaptain: (id: number) => void;
  toggleVC: (id: number) => void;
  reset: () => void;
  credits: (allPlayers: Player[]) => number;
  isValid: (allPlayers: Player[]) => boolean;
}

export const useTeamBuilder = create<TeamBuilderStore>((set, get) => ({
  selected: [],
  captain: null,
  vc: null,

  togglePlayer: (id, allPlayers) => {
    const { selected, captain, vc } = get();
    const player = allPlayers.find(p => p.id === id);
    if (!player) return;

    if (selected.includes(id)) {
      set({
        selected: selected.filter(x => x !== id),
        captain: captain === id ? null : captain,
        vc: vc === id ? null : vc,
      });
      return;
    }

    if (selected.length >= TEAM_SIZE) return;
    const usedCredits = selected.reduce((s, pid) => s + (allPlayers.find(p => p.id === pid)?.cr ?? 0), 0);
    if (usedCredits + player.cr > MAX_CREDITS) return;
    const sameTeam = selected.filter(pid => allPlayers.find(p => p.id === pid)?.team === player.team).length;
    if (sameTeam >= MAX_FROM_ONE_TEAM) return;
    const overseasCount = selected.filter(pid => allPlayers.find(p => p.id === pid)?.ovr).length;
    if (player.ovr && overseasCount >= MAX_OVERSEAS) return;

    set({ selected: [...selected, id] });
  },

  toggleCaptain: (id) => {
    const { captain, vc } = get();
    set({
      captain: captain === id ? null : id,
      vc: vc === id ? null : vc,
    });
  },

  toggleVC: (id) => {
    const { vc, captain } = get();
    set({
      vc: vc === id ? null : id,
      captain: captain === id ? null : captain,
    });
  },

  reset: () => set({ selected: [], captain: null, vc: null }),

  credits: (allPlayers) => {
    const { selected } = get();
    return selected.reduce((s, id) => s + (allPlayers.find(p => p.id === id)?.cr ?? 0), 0);
  },

  isValid: (allPlayers) => {
    const { selected, captain, vc, credits } = get();
    return selected.length === TEAM_SIZE && !!captain && !!vc && credits(allPlayers) <= MAX_CREDITS;
  },
}));
*/


// ─────────────────────────────────────────────────────────────────────────────
// lib/stores/liveMatch.ts — Zustand store
// ─────────────────────────────────────────────────────────────────────────────
/*
import { create } from "zustand";
import type { LiveStats, MatchEvent, LeaderboardEntry } from "@/types";

interface LiveMatchStore {
  liveStats: LiveStats;
  matchLog: MatchEvent[];
  over: number;
  ball: number;
  homeScore: number;
  homeWickets: number;
  running: boolean;
  matchDone: boolean;
  leaderboard: LeaderboardEntry[];
  updateStat: (playerId: number, updates: Record<string, number>) => void;
  addLog: (event: MatchEvent) => void;
  addHomeRuns: (runs: number) => void;
  addHomeWicket: () => void;
  advanceBall: () => void;
  setLeaderboard: (lb: LeaderboardEntry[]) => void;
  setRunning: (v: boolean) => void;
  setMatchDone: (v: boolean) => void;
  reset: () => void;
}

export const useLiveMatch = create<LiveMatchStore>((set, get) => ({
  liveStats: {},
  matchLog: [],
  over: 0,
  ball: 0,
  homeScore: 0,
  homeWickets: 0,
  running: false,
  matchDone: false,
  leaderboard: [],

  updateStat: (playerId, updates) =>
    set(state => ({
      liveStats: {
        ...state.liveStats,
        [playerId]: { ...state.liveStats[playerId], ...updates },
      },
    })),

  addLog: (event) =>
    set(state => ({ matchLog: [event, ...state.matchLog.slice(0, 79)] })),

  addHomeRuns: (runs) =>
    set(state => ({ homeScore: state.homeScore + runs })),

  addHomeWicket: () =>
    set(state => {
      const nw = state.homeWickets + 1;
      if (nw >= 10) return { homeWickets: nw, running: false };
      return { homeWickets: nw };
    }),

  advanceBall: () =>
    set(state => {
      const nextBall = (state.ball + 1) % 6;
      const nextOver = nextBall === 0 ? state.over + 1 : state.over;
      const done = nextOver >= 20;
      return { ball: nextBall, over: nextOver, running: done ? false : state.running, matchDone: done || state.matchDone };
    }),

  setLeaderboard: (lb) => set({ leaderboard: lb }),
  setRunning: (v) => set({ running: v }),
  setMatchDone: (v) => set({ matchDone: v }),
  reset: () => set({ liveStats: {}, matchLog: [], over: 0, ball: 0, homeScore: 0, homeWickets: 0, running: false, matchDone: false, leaderboard: [] }),
}));
*/


// ─────────────────────────────────────────────────────────────────────────────
// .env.local.example
// Copy to .env.local and fill in your values
// ─────────────────────────────────────────────────────────────────────────────
/*
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
*/
