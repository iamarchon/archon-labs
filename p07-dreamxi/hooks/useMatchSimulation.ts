"use client";

import { useCallback, useEffect, useMemo } from "react";
import { generateEvent, applyEventToStats } from "@/lib/simulation";
import { totalTeamPoints } from "@/lib/scoring";
import { useLiveMatch } from "@/lib/stores/liveMatch";
import type { LeaderboardEntry, LiveStats, Player } from "@/types";

interface SimulationEntry {
  name: string;
  playerIds: number[];
  captainId: number | null;
  vcId: number | null;
  isUser?: boolean;
}

interface UseMatchSimulationOptions {
  battingPlayers: Player[];
  bowlingPlayers: Player[];
  leaderboardEntries?: SimulationEntry[];
  intervalMs?: number;
  enabled?: boolean;
}

function buildLeaderboard(entries: SimulationEntry[], liveStats: LiveStats): LeaderboardEntry[] {
  return entries
    .map((entry) => ({
      name: entry.name,
      pts: totalTeamPoints(entry.playerIds, entry.captainId, entry.vcId, liveStats),
      live: totalTeamPoints(entry.playerIds, entry.captainId, entry.vcId, liveStats),
      rank: 0,
      isUser: entry.isUser ?? false,
    }))
    .sort((a, b) => b.pts - a.pts)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function useMatchSimulation({
  battingPlayers,
  bowlingPlayers,
  leaderboardEntries = [],
  intervalMs = 1100,
  enabled = true,
}: UseMatchSimulationOptions) {
  const liveStats = useLiveMatch((state) => state.liveStats);
  const matchLog = useLiveMatch((state) => state.matchLog);
  const over = useLiveMatch((state) => state.over);
  const ball = useLiveMatch((state) => state.ball);
  const homeScore = useLiveMatch((state) => state.homeScore);
  const homeWickets = useLiveMatch((state) => state.homeWickets);
  const running = useLiveMatch((state) => state.running);
  const matchDone = useLiveMatch((state) => state.matchDone);
  const leaderboard = useLiveMatch((state) => state.leaderboard);
  const updateStat = useLiveMatch((state) => state.updateStat);
  const addLog = useLiveMatch((state) => state.addLog);
  const addHomeRuns = useLiveMatch((state) => state.addHomeRuns);
  const addHomeWicket = useLiveMatch((state) => state.addHomeWicket);
  const advanceBall = useLiveMatch((state) => state.advanceBall);
  const setLeaderboard = useLiveMatch((state) => state.setLeaderboard);
  const setRunning = useLiveMatch((state) => state.setRunning);
  const setMatchDone = useLiveMatch((state) => state.setMatchDone);
  const resetStore = useLiveMatch((state) => state.reset);

  const playerPool = useMemo(() => ({ battingPlayers, bowlingPlayers }), [battingPlayers, bowlingPlayers]);

  const tick = useCallback(() => {
    if (!playerPool.battingPlayers.length || !playerPool.bowlingPlayers.length) {
      setRunning(false);
      return;
    }

    const battingPlayer = playerPool.battingPlayers[Math.floor(Math.random() * playerPool.battingPlayers.length)];
    const bowlingPlayer = playerPool.bowlingPlayers[Math.floor(Math.random() * playerPool.bowlingPlayers.length)];
    const battingEvent = Math.random() >= 0.38;
    const actor = battingEvent ? battingPlayer : bowlingPlayer;
    const event = generateEvent(battingEvent);
    const currentStats = liveStats[actor.id] ?? {};
    const nextStats = applyEventToStats(currentStats as Record<string, number>, event, battingEvent);

    updateStat(actor.id, nextStats);

    if (event.runs > 0) {
      addHomeRuns(event.runs);
    }

    if (event.type === "wicket") {
      addHomeWicket();
    }

    addLog({
      id: `${Date.now()}-${actor.id}-${event.type}`,
      msg: `${actor.name} · ${event.label}`,
      team: actor.team,
      timestamp: Date.now(),
    });

    advanceBall();
  }, [addHomeRuns, addHomeWicket, addLog, advanceBall, liveStats, playerPool, setRunning, updateStat]);

  const start = useCallback(() => {
    if (!enabled || matchDone) {
      return;
    }

    setRunning(true);
  }, [enabled, matchDone, setRunning]);

  const stop = useCallback(() => {
    setRunning(false);
  }, [setRunning]);

  const reset = useCallback(() => {
    resetStore();
  }, [resetStore]);

  useEffect(() => {
    if (!leaderboardEntries.length) {
      return;
    }

    setLeaderboard(buildLeaderboard(leaderboardEntries, liveStats));
  }, [leaderboardEntries, liveStats, setLeaderboard]);

  useEffect(() => {
    if (!enabled || !running || matchDone) {
      return;
    }

    const timer = window.setInterval(() => {
      tick();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, matchDone, running, tick]);

  useEffect(() => {
    if (matchDone) {
      setRunning(false);
    }
  }, [matchDone, setRunning]);

  return {
    liveStats,
    matchLog,
    leaderboard,
    over,
    ball,
    homeScore,
    homeWickets,
    running,
    matchDone,
    start,
    stop,
    reset,
    setMatchDone,
  };
}
