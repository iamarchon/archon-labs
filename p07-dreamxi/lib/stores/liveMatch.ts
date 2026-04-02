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

export const useLiveMatch = create<LiveMatchStore>((set) => ({
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
    set((state) => ({
      liveStats: {
        ...state.liveStats,
        [playerId]: { ...state.liveStats[playerId], ...updates },
      },
    })),

  addLog: (event) =>
    set((state) => ({ matchLog: [event, ...state.matchLog.slice(0, 79)] })),

  addHomeRuns: (runs) =>
    set((state) => ({ homeScore: state.homeScore + runs })),

  addHomeWicket: () =>
    set((state) => {
      const nw = state.homeWickets + 1;
      if (nw >= 10) return { homeWickets: nw, running: false };
      return { homeWickets: nw };
    }),

  advanceBall: () =>
    set((state) => {
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
