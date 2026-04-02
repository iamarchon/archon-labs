import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav, ContestCard, MatchHeaderSticky, MatchPill } from "@/components/dreamxi";
import { getFixtureById } from "@/lib/data/fixtures";

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

        <div className="sports-panel rounded-[1.8rem] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-violet-300">Fast contest scan</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white">Choose your contest and join fast</h2>
              <p className="mt-1 text-sm text-slate-400">Entry fee, prize pool, and spot pressure should all be visible on first glance.</p>
            </div>
            <Link prefetch={false} href={`/build/${fixture.id}`} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-extrabold text-slate-950">Build XI</Link>
          </div>
        </div>

        <div className="space-y-4">
          <ContestCard
            fixture={fixture}
            contestName="Mega Contest"
            badge="MEGA"
            entry={49}
            prizePool="₹25L"
            firstPrize="₹2.5L"
            spots={134582}
            spotsLeft={18462}
            href={`/build/${fixture.id}?contest=mega`}
          />

          <ContestCard
            fixture={fixture}
            contestName="Head to Head"
            badge="H2H"
            entry={59}
            prizePool="₹2000"
            firstPrize="₹2000"
            spots={1}
            spotsLeft={0}
            href={`/leaderboard/${fixture.id}?contest=h2h`}
          />

          <ContestCard
            fixture={fixture}
            contestName="Small League"
            badge="SMALL"
            entry={29}
            prizePool="₹1000"
            firstPrize="₹400"
            spots={10}
            spotsLeft={4}
            href={`/build/${fixture.id}?contest=safe`}
          />
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
