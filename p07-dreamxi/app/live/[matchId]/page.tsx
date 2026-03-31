"use client";

import { useEffect, useMemo } from "react";
import { notFound, useParams } from "next/navigation";
import { BallLog, BottomNav, PitchView, ScoreHeader } from "@/components/dreamxi";
import { getFixtureById } from "@/lib/data/fixtures";
import { getMatchPlayers } from "@/lib/data/players";
import { useTeamBuilder } from "@/lib/stores/teamBuilder";
import { useMatchSimulation } from "@/hooks/useMatchSimulation";

export default function LiveMatchPage() {
  const params = useParams<{ matchId: string }>();
  const fixture = getFixtureById(Number(params.matchId));

  if (!fixture) {
    notFound();
  }

  const players = getMatchPlayers(fixture.home, fixture.away);
  const battingPlayers = useMemo(() => players.filter((player) => player.role !== "BOWL"), [players]);
  const bowlingPlayers = useMemo(() => players.filter((player) => player.role === "BOWL" || player.role === "AR"), [players]);

  const selected = useTeamBuilder((state) => state.selected);
  const captain = useTeamBuilder((state) => state.captain);
  const vc = useTeamBuilder((state) => state.vc);
  const userTeam = players.filter((player) => selected.includes(player.id));

  const leaderboardEntries = useMemo(() => [
    {
      name: "You",
      playerIds: userTeam.length ? userTeam.map((player) => player.id) : battingPlayers.slice(0, 11).map((player) => player.id),
      captainId: captain,
      vcId: vc,
      isUser: true,
    },
    {
      name: "BoundaryHunter",
      playerIds: players.slice(0, 11).map((player) => player.id),
      captainId: players[0]?.id ?? null,
      vcId: players[1]?.id ?? null,
    },
    {
      name: "SpinDoctor",
      playerIds: [...players].reverse().slice(0, 11).map((player) => player.id),
      captainId: players[2]?.id ?? null,
      vcId: players[3]?.id ?? null,
    },
  ], [battingPlayers, captain, players, userTeam, vc]);

  const simulation = useMatchSimulation({ battingPlayers, bowlingPlayers, leaderboardEntries, enabled: true });
  const { reset } = simulation;

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <main className="container-mobile px-4 pb-20 pt-6">
      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Live fantasy</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50">Match center</h1>
        </div>

        <ScoreHeader mode="live" fixture={fixture} score={simulation.homeScore} wickets={simulation.homeWickets} over={simulation.over} ball={simulation.ball} />

        <div className="flex gap-3">
          <button onClick={simulation.running ? simulation.stop : simulation.start} className="rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950">
            {simulation.running ? "Stop simulation" : "Start simulation"}
          </button>
          <button onClick={simulation.reset} className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300">Reset</button>
        </div>

        <PitchView players={userTeam.length ? userTeam : battingPlayers.slice(0, 11)} liveStats={simulation.liveStats} captainId={captain} vcId={vc} />
        <BallLog events={simulation.matchLog} />
      </section>

      <BottomNav />
    </main>
  );
}
