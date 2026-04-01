import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav, Leaderboard, ScoreHeader } from "@/components/dreamxi";
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
    <main className="container-mobile px-4 pb-20 pt-6">
      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Contest standings</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50">Leaderboard</h1>
        </div>

        {entry === "confirmed" ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Team confirmed successfully for <span className="font-semibold">{contest ?? "your selected contest"}</span>. Your prototype entry now flows into leaderboard review and live match tracking.
          </div>
        ) : null}

        <ScoreHeader mode="leaderboard" fixture={fixture} score={184} wickets={5} over={18} ball={2} />
        <Leaderboard entries={MOCK_ENTRIES} />

        <div className="flex flex-wrap gap-3">
          <Link prefetch={false} href={`/live/${fixture.id}`} className="rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950">
            View live match
          </Link>
          <Link prefetch={false} href={`/play/${fixture.id}?joined=${contest ?? "contest"}`} className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300">
            Back to contest lobby
          </Link>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
