"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { BottomNav, MatchPill, PitchView, PlayerRow } from "@/components/dreamxi";
import { getFixtureById } from "@/lib/data/fixtures";
import { getMatchPlayers } from "@/lib/data/players";
import { useTeamBuilder } from "@/lib/stores/teamBuilder";

export default function BuildTeamPage() {
  const params = useParams<{ matchId: string }>();
  const fixture = getFixtureById(Number(params.matchId));

  if (!fixture) {
    notFound();
  }

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

  return (
    <main className="container-mobile px-4 pb-20 pt-6">
      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Team builder</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50">Build your XI</h1>
          <p className="mt-2 text-sm text-slate-400">Select 11 players, stay under 100 credits, then assign captain and vice-captain.</p>
        </div>

        <MatchPill fixture={fixture} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Players</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{selected.length}/11</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Credits used</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{totalCredits.toFixed(1)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Credits left</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{(100 - totalCredits).toFixed(1)}</p>
          </div>
        </div>

        <PitchView players={selectedPlayers} captainId={captain} vcId={vc} />

        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">Available players</h2>
            <p className="text-sm text-slate-400">Filtered to {fixture.home} & {fixture.away}</p>
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

        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Captain and VC boost your total points. Make sure both are assigned.</p>
              <p className="mt-2 text-sm font-medium text-slate-200">Status: {valid ? "Ready to confirm" : "Incomplete team"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button disabled={!valid} className="rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Confirm team</button>
              <Link href={`/play/${fixture.id}`} className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300">Back to lobby</Link>
            </div>
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
