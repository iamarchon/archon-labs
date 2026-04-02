"use client";

import Link from "next/link";
import { useParams, useSearchParams, notFound } from "next/navigation";
import { BottomNav, MatchHeaderSticky, PitchView, PlayerRow } from "@/components/dreamxi";
import { getFixtureById } from "@/lib/data/fixtures";
import { getMatchPlayers } from "@/lib/data/players";
import { useTeamBuilder } from "@/lib/stores/teamBuilder";

export default function BuildTeamPage() {
  const params = useParams<{ matchId: string }>();
  const searchParams = useSearchParams();
  const fixture = getFixtureById(Number(params.matchId));

  if (!fixture) {
    notFound();
  }

  const fixtureId = fixture.id;
  const contestId = searchParams.get("contest") ?? "mega";
  const matchPlayers = getMatchPlayers(fixture.home, fixture.away);
  const selected = useTeamBuilder((state) => state.selected);
  const captain = useTeamBuilder((state) => state.captain);
  const vc = useTeamBuilder((state) => state.vc);
  const togglePlayer = useTeamBuilder((state) => state.togglePlayer);
  const toggleCaptain = useTeamBuilder((state) => state.toggleCaptain);
  const toggleVC = useTeamBuilder((state) => state.toggleVC);
  const totalCredits = useTeamBuilder((state) => state.credits(matchPlayers));
  const valid = useTeamBuilder((state) => state.isValid(matchPlayers));

  const selectedPlayers = matchPlayers.filter((player) => selected.includes(player.id));
  const roleCounts = {
    WK: selectedPlayers.filter((player) => player.role === "WK").length,
    BAT: selectedPlayers.filter((player) => player.role === "BAT").length,
    AR: selectedPlayers.filter((player) => player.role === "AR").length,
    BOWL: selectedPlayers.filter((player) => player.role === "BOWL").length,
  };

  function handleConfirm() {
    if (!valid) return;
    window.location.assign(`/leaderboard/${fixtureId}?contest=${contestId}&entry=confirmed`);
  }

  return (
    <main className="container-mobile px-4 pb-24 pt-6">
      <section className="space-y-5">
        <MatchHeaderSticky fixture={fixture} eyebrow="Team builder" />

        <div className="sports-panel rounded-[1.8rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-violet-300">Builder progress</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white">Build your winning XI</h1>
            </div>
            <span className="signal-chip signal-chip--hot">Contest {contestId}</span>
          </div>

          <div className="mt-4 stat-grid">
            <div className="stat-card">
              <p className="stat-label">Players</p>
              <p className="stat-value">{selected.length}/11</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Credits left</p>
              <p className="stat-value">{(100 - totalCredits).toFixed(1)}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">C/VC</p>
              <p className="stat-value">{captain && vc ? "Ready" : "Choose"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="signal-chip">WK {roleCounts.WK}/1-4</span>
            <span className="signal-chip">BAT {roleCounts.BAT}/3-6</span>
            <span className="signal-chip">AR {roleCounts.AR}/1-4</span>
            <span className="signal-chip">BOWL {roleCounts.BOWL}/3-6</span>
          </div>
        </div>

        <PitchView players={selectedPlayers} captainId={captain} vcId={vc} />

        <div className="sports-panel rounded-[1.8rem] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-[-0.03em] text-white">Player pool</h2>
              <p className="mt-1 text-sm text-slate-400">Select your XI first, then assign captain and vice-captain with intent.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="signal-chip signal-chip--violet">Popular</span>
              <span className="signal-chip">Budget</span>
              <span className="signal-chip">Differential</span>
            </div>
          </div>
          <div className="space-y-3">
            {matchPlayers.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                selected={selected.includes(player.id)}
                captain={captain === player.id}
                viceCaptain={vc === player.id}
                onToggle={() => togglePlayer(player.id, matchPlayers)}
                onCaptain={() => toggleCaptain(player.id)}
                onViceCaptain={() => toggleVC(player.id)}
              />
            ))}
          </div>
        </div>

        <div className="sports-panel rounded-[1.8rem] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-300">Step 1: lock 11 players. Step 2: assign C and VC. Step 3: enter your contest.</p>
              <p className="mt-2 text-sm font-semibold text-slate-200">Status: {valid ? "Ready to join contest" : "Builder incomplete"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!valid}
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Join contest
              </button>
              <Link prefetch={false} href={`/play/${fixtureId}`} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300">Back to lobby</Link>
            </div>
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
