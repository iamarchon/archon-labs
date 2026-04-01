"use client";

import Link from "next/link";
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
  const showcaseTeam = userTeam.length ? userTeam : battingPlayers.slice(0, 11);

  const leaderboardEntries = useMemo(
    () => [
      {
        name: "You",
        playerIds: showcaseTeam.map((player) => player.id),
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
    ],
    [captain, players, showcaseTeam, vc],
  );

  const simulation = useMatchSimulation({ battingPlayers, bowlingPlayers, leaderboardEntries, enabled: true });
  const { reset } = simulation;

  useEffect(() => {
    reset();
  }, [reset]);

  const featuredBatters = showcaseTeam.slice(0, 3);
  const leaderboardPreview = simulation.leaderboard.slice(0, 3);

  return (
    <main className="container-mobile px-4 pb-20 pt-6">
      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Live fantasy</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50">Match center</h1>
          <p className="mt-2 text-sm text-slate-400">
            Follow the live prototype for {fixture.home} vs {fixture.away}, review your projected XI, and start the simulated ball-by-ball feed.
          </p>
        </div>

        <div className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-100">
          {userTeam.length
            ? "Your saved XI is loaded into the live match center. Start simulation to watch points move in real time."
            : "No confirmed XI yet, so a preview lineup is loaded automatically for review. You can still inspect the full live match experience immediately."}
        </div>

        <ScoreHeader mode="live" fixture={fixture} score={simulation.homeScore} wickets={simulation.homeWickets} over={simulation.over} ball={simulation.ball} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Current state</p>
            <p className="mt-2 text-lg font-bold text-slate-100">{simulation.running ? "Simulation live" : "Ready to start"}</p>
            <p className="mt-1 text-sm text-slate-400">Overs {simulation.over}.{simulation.ball} • Wkts {simulation.homeWickets}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Preview XI</p>
            <p className="mt-2 text-lg font-bold text-slate-100">{showcaseTeam.length} players loaded</p>
            <p className="mt-1 text-sm text-slate-400">{featuredBatters.map((player) => player.name).join(" • ")}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Prototype flow</p>
            <p className="mt-2 text-lg font-bold text-slate-100">Lobby → Build → Live</p>
            <p className="mt-1 text-sm text-slate-400">Review contest state, then continue into simulation.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={simulation.running ? simulation.stop : simulation.start} className="rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950">
            {simulation.running ? "Stop simulation" : "Start simulation"}
          </button>
          <button onClick={simulation.reset} className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300">Reset</button>
          <Link prefetch={false} href={`/leaderboard/${fixture.id}`} className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300">
            View leaderboard
          </Link>
        </div>

        <PitchView players={showcaseTeam} liveStats={simulation.liveStats} captainId={captain} vcId={vc} />

        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Leaderboard preview</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Auto-ranked</span>
          </div>
          <div className="space-y-3">
            {leaderboardPreview.map((entry) => (
              <div
                key={`${entry.name}-${entry.rank}`}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${entry.isUser ? "border-violet-500/50 bg-violet-500/10" : "border-slate-800 bg-slate-900/70"}`}
              >
                <div>
                  <p className="font-semibold text-slate-100">#{entry.rank} • {entry.name}</p>
                  <p className="text-sm text-slate-400">Live +{Math.round(entry.live)}</p>
                </div>
                <p className="text-lg font-bold text-slate-100">{Math.round(entry.pts)} pts</p>
              </div>
            ))}
          </div>
        </div>

        <BallLog events={simulation.matchLog} />
      </section>

      <BottomNav />
    </main>
  );
}
