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

export default async function LeaderboardPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const fixture = getFixtureById(Number(matchId));

  if (!fixture) notFound();

  return (
    <main className="container-mobile px-4 pb-20 pt-6">
      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Contest standings</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50">Leaderboard</h1>
        </div>
        <ScoreHeader mode="leaderboard" fixture={fixture} score={184} wickets={5} over={18} ball={2} />
        <Leaderboard entries={MOCK_ENTRIES} />
      </section>
      <BottomNav />
    </main>
  );
}
