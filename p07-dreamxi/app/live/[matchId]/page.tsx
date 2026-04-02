"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { notFound, useParams } from "next/navigation";
import { BallLog, BottomNav, MatchHeaderSticky, PitchView, ScoreHeader } from "@/components/dreamxi";
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
    <main className="container-mobile px-4 pb-24 pt-6">
      <section className="space-y-5">
        <MatchHeaderSticky fixture={fixture} eyebrow="Live match center" />

        <div className="sports-panel rounded-[1.8rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="signal-chip signal-chip--live">Live</span>
                <span className="signal-chip signal-chip--hot">Last over +24 pts</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-white">High-trust match center</h1>
              <p className="mt-2 text-sm text-slate-400">Track score, XI impact, leaderboard movement, and ball-by-ball momentum in one place.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-100">
          {userTeam.length
            ? "Your saved XI is loaded. Watch rank swings as the simulation advances."
            : "No confirmed XI yet, so a premium preview lineup is loaded automatically for review. Live updates remain available immediately."}
        </div>

        <ScoreHeader mode="live" fixture={fixture} score={simulation.homeScore} wickets={simulation.homeWickets} over={simulation.over} ball={simulation.ball} />

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Current state</p>
            <p className="stat-value">{simulation.running ? "Live" : "Ready"}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Preview XI</p>
            <p className="stat-value">{showcaseTeam.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">My rank</p>
            <p className="stat-value">#{leaderboardPreview.find((entry) => entry.isUser)?.rank ?? 3}</p>
          </div>
        </div>

        <div className="sports-panel rounded-[1.8rem] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Top performers</p>
              <p className="mt-1 text-sm text-slate-300">{featuredBatters.map((player) => player.name).join(" • ")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={simulation.running ? simulation.stop : simulation.start} className="rounded-full bg-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950">
                {simulation.running ? "Pause live" : "Start live"}
              </button>
              <button onClick={simulation.reset} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300">Reset</button>
              <Link prefetch={false} href={`/leaderboard/${fixture.id}`} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300">
                View leaderboard
              </Link>
            </div>
          </div>
        </div>

        <PitchView players={showcaseTeam} liveStats={simulation.liveStats} captainId={captain} vcId={vc} />

        <div className="sports-panel rounded-[1.8rem] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-100">Leaderboard snapshot</h2>
            <span className="signal-chip signal-chip--violet">Winning zone</span>
          </div>
          <div className="space-y-3">
            {leaderboardPreview.map((entry) => (
              <div
                key={`${entry.name}-${entry.rank}`}
                className={`flex items-center justify-between rounded-[1.1rem] border px-4 py-3 ${entry.isUser ? "border-orange-500/35 bg-orange-500/10" : "border-white/8 bg-white/[0.03]"}`}
              >
                <div>
                  <p className="font-extrabold text-slate-100">#{entry.rank} • {entry.name}</p>
                  <p className="text-sm text-slate-400">Live +{Math.round(entry.live)} • {entry.isUser ? "↑7" : "↓1"}</p>
                </div>
                <p className="text-xl font-extrabold tracking-[-0.03em] text-white">{Math.round(entry.pts)}</p>
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
