import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav, MatchHeaderSticky, MatchPill } from "@/components/dreamxi";
import { getFixtureById } from "@/lib/data/fixtures";
import type { League } from "@/types";

const LEAGUES: Array<League & { entry: number; firstPrize: string; spotsLeft: number; totalSpots: number; maxTeams: number; badge: string }> = [
  { id: "mega", name: "Mega Contest", members: 134582, prize: "₹25 Lakhs", joined: false, rank: null, mega: true, entry: 49, firstPrize: "₹2.5 Lakhs", spotsLeft: 18462, totalSpots: 134582, maxTeams: 20, badge: "MEGA" },
  { id: "h2h", name: "Head to Head", members: 2, prize: "₹1,000", joined: true, rank: 1, mega: false, entry: 59, firstPrize: "₹1,000", spotsLeft: 1, totalSpots: 2, maxTeams: 1, badge: "H2H" },
  { id: "safe", name: "Small League", members: 1458, prize: "₹50,000", joined: false, rank: null, mega: false, entry: 29, firstPrize: "₹8,000", spotsLeft: 208, totalSpots: 1458, maxTeams: 6, badge: "SAFE" },
];

export default async function MatchLobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ joined?: string }>;
}) {
  const { matchId } = await params;
  const { joined } = await searchParams;
  const fixture = getFixtureById(Number(matchId));

  if (!fixture) {
    notFound();
  }

  return (
    <main className="container-mobile px-4 pb-24 pt-6">
      <section className="space-y-5">
        <MatchHeaderSticky fixture={fixture} eyebrow="Contest lobby" />

        {joined ? (
          <div className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Contest entry locked for <span className="font-bold">{joined}</span>. Review standings or jump into the live match center.
          </div>
        ) : null}

        <MatchPill fixture={fixture} />

        <div className="flex flex-wrap gap-2">
          <span className="signal-chip signal-chip--violet">All contests</span>
          <span className="signal-chip">Mega</span>
          <span className="signal-chip">H2H</span>
          <span className="signal-chip">Safe</span>
          <span className="signal-chip signal-chip--hot">Low spots left</span>
        </div>

        <div className="sports-panel rounded-[2rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-white">Available contests</h2>
              <p className="mt-1 text-sm text-slate-400">Choose the right risk/reward profile and join before the slate locks.</p>
            </div>
            <Link prefetch={false} href={`/build/${fixture.id}`} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-extrabold text-slate-950">Build XI</Link>
          </div>

          <div className="mt-5 space-y-4">
            {LEAGUES.map((league) => {
              const primaryHref = league.joined
                ? `/leaderboard/${fixture.id}?contest=${league.id}`
                : `/build/${fixture.id}?contest=${league.id}`;
              const fillPercent = Math.round(((league.totalSpots - league.spotsLeft) / league.totalSpots) * 100);

              return (
                <div key={league.id} className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`signal-chip ${league.joined ? "signal-chip--live" : league.badge === "MEGA" ? "signal-chip--hot" : "signal-chip--violet"}`}>{league.joined ? "JOINED" : league.badge}</span>
                        {league.spotsLeft < 500 && <span className="signal-chip signal-chip--hot">Locks soon</span>}
                      </div>
                      <p className="mt-3 text-xl font-extrabold tracking-[-0.03em] text-white">{league.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{league.members.toLocaleString()} entries • Max {league.maxTeams} teams</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Entry</p>
                      <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-white">₹{league.entry}</p>
                    </div>
                  </div>

                  <div className="mt-4 stat-grid">
                    <div className="stat-card">
                      <p className="stat-label">Prize pool</p>
                      <p className="stat-value">{league.prize}</p>
                    </div>
                    <div className="stat-card">
                      <p className="stat-label">1st prize</p>
                      <p className="stat-value">{league.firstPrize}</p>
                    </div>
                    <div className="stat-card">
                      <p className="stat-label">Spots left</p>
                      <p className="stat-value">{league.spotsLeft}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.3rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-200">{fillPercent}% filled</span>
                      <span className="text-slate-400">{league.totalSpots.toLocaleString()} total spots</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${fillPercent}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link prefetch={false} href={primaryHref} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-extrabold text-slate-950">
                      {league.joined ? "View contest" : `Join ₹${league.entry}`}
                    </Link>
                    <Link prefetch={false} href={`/build/${fixture.id}?contest=${league.id}`} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300">
                      Edit team
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
