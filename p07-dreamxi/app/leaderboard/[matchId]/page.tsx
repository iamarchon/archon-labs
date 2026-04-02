import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav, Leaderboard, MatchHeaderSticky, ScoreHeader } from "@/components/dreamxi";
import { getFixtureById } from "@/lib/data/fixtures";
import type { LeaderboardEntry } from "@/types";

const MOCK_ENTRIES: LeaderboardEntry[] = [
  { name: "PowerplayPro", pts: 712, live: 84, rank: 1, isUser: false },
  { name: "YorkerKing", pts: 689, live: 77, rank: 2, isUser: false },
  { name: "You", pts: 664, live: 73, rank: 3, isUser: true },
  { name: "CaptainChaos", pts: 651, live: 68, rank: 4, isUser: false },
];

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ contest?: string; entry?: string }>;
}) {
  const { matchId } = await params;
  const { contest, entry } = await searchParams;
  const fixture = getFixtureById(Number(matchId));

  if (!fixture) notFound();

  return (
    <main className="container-mobile px-4 pb-24 pt-6">
      <section className="space-y-5">
        <MatchHeaderSticky fixture={fixture} eyebrow="Leaderboard" />

        {entry === "confirmed" ? (
          <div className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Team confirmed for <span className="font-bold">{contest ?? "your selected contest"}</span>. You are now in live standings.
          </div>
        ) : null}

        <div className="sports-panel rounded-[1.8rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-violet-300">Your performance</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-white">#3 rank</h1>
              <p className="mt-1 text-sm text-slate-400">12 pts behind #2 • +73 live this stretch</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Projected payout</p>
              <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-amber-300">₹8,000</p>
            </div>
          </div>
        </div>

        <ScoreHeader mode="leaderboard" fixture={fixture} score={184} wickets={5} over={18} ball={2} />
        <Leaderboard entries={MOCK_ENTRIES} />

        <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Winning zone cutoff: top 25% of entries currently cash.
        </div>

        <div className="flex flex-wrap gap-3">
          <Link prefetch={false} href={`/live/${fixture.id}`} className="rounded-full bg-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950">
            Watch live match
          </Link>
          <Link prefetch={false} href={`/play/${fixture.id}?joined=${contest ?? "contest"}`} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300">
            Back to contest lobby
          </Link>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
