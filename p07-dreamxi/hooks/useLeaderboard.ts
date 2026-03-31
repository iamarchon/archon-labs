"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { totalTeamPoints } from "@/lib/scoring";
import type { LeaderboardEntry, LiveStats, PlayerStats } from "@/types";

interface LeaderboardSeed {
  name: string;
  playerIds: number[];
  captainId: number | null;
  vcId: number | null;
  isUser?: boolean;
}

interface UseLeaderboardOptions {
  fixtureId: number;
  entries?: LeaderboardSeed[];
  enabled?: boolean;
}

interface PlayerMatchStatsRow extends PlayerStats {
  player_id: number;
}

function toLiveStats(rows: PlayerMatchStatsRow[]): LiveStats {
  return rows.reduce<LiveStats>((acc, row) => {
    acc[row.player_id] = {
      runs: row.runs ?? 0,
      wickets: row.wickets ?? 0,
      fours: row.fours ?? 0,
      sixes: row.sixes ?? 0,
      dots: row.dots ?? 0,
      maidens: row.maidens ?? 0,
    };

    return acc;
  }, {});
}

function rankEntries(entries: LeaderboardSeed[], liveStats: LiveStats): LeaderboardEntry[] {
  return entries
    .map((entry) => {
      const points = totalTeamPoints(entry.playerIds, entry.captainId, entry.vcId, liveStats);
      return {
        name: entry.name,
        pts: points,
        live: points,
        rank: 0,
        isUser: entry.isUser ?? false,
      } satisfies LeaderboardEntry;
    })
    .sort((a, b) => b.pts - a.pts)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function useLeaderboard({ fixtureId, entries = [], enabled = true }: UseLeaderboardOptions) {
  const [liveStats, setLiveStats] = useState<LiveStats>({});
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!supabase) {
      setError("Supabase client unavailable");
      setLoading(false);
      return;
    }

    const client = supabase;
    let cancelled = false;

    async function loadInitialStats() {
      setLoading(true);
      setError(null);

      const { data, error: statsError } = await client
        .from("player_match_stats")
        .select("player_id, runs, wickets, fours, sixes, dots, maidens")
        .eq("fixture_id", fixtureId);

      if (cancelled) {
        return;
      }

      if (statsError) {
        setError(statsError.message);
        setLoading(false);
        return;
      }

      setLiveStats(toLiveStats((data ?? []) as PlayerMatchStatsRow[]));
      setLoading(false);
    }

    void loadInitialStats();

    const channel = client
      .channel(`leaderboard:${fixtureId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_match_stats",
          filter: `fixture_id=eq.${fixtureId}`,
        },
        () => {
          void loadInitialStats();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [enabled, fixtureId]);

  const leaderboard = useMemo(() => rankEntries(entries, liveStats), [entries, liveStats]);

  return {
    leaderboard,
    liveStats,
    loading,
    error,
  };
}
