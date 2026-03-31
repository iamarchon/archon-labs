import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav, MatchPill } from "@/components/dreamxi";
import { getFixtureById } from "@/lib/data/fixtures";
import type { League } from "@/types";

const LEAGUES: League[] = [
  { id: "mega", name: "Mega Contest", members: 134582, prize: "₹25 Lakhs", joined: false, rank: null, mega: true },
  { id: "h2h", name: "Head to Head", members: 2, prize: "₹1,000", joined: true, rank: 1, mega: false },
  { id: "safe", name: "Small League", members: 1458, prize: "₹50,000", joined: false, rank: null, mega: false },
];

export default async function MatchLobbyPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const fixture = getFixtureById(Number(matchId));

  if (!fixture) {
    notFound();
  }

  return (
    <main className="container-mobile px-4 pb-20 pt-6">
      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Match lobby</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50">Join a contest</h1>
        </div>

        <MatchPill fixture={fixture} />

        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Available leagues</h2>
              <p className="mt-1 text-sm text-slate-400">Choose your entry style and lock your squad before toss.</p>
            </div>
            <Link href={`/build/${fixture.id}`} className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-950">Build team</Link>
          </div>
          <div className="mt-4 space-y-3">
            {LEAGUES.map((league) => (
              <div key={league.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-100">{league.name}</p>
                      {league.mega && <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Mega</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{league.members.toLocaleString()} entries • Prize {league.prize}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-200">{league.joined ? "Joined" : "Open"}</p>
                    <p className="mt-1 text-xs text-slate-500">{league.rank ? `Current rank #${league.rank}` : "No rank yet"}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-950">{league.joined ? "View contest" : "Join now"}</button>
                  <Link href={`/build/${fixture.id}`} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">Edit team</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
