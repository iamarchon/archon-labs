import { BottomNav, ContestCard } from "@/components/dreamxi";
import { getUpcomingFixtures } from "@/lib/data/fixtures";

export default function ContestsPage() {
  const fixtures = getUpcomingFixtures();

  return (
    <main className="container-mobile px-4 pb-20 pt-6">
      <section className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-300">DreamXI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-50">Upcoming contests</h1>
        <p className="mt-2 text-sm text-slate-400">Pick a fixture, enter a contest, and build your fantasy XI.</p>
      </section>

      <section className="space-y-4">
        {fixtures.map((fixture) => (
          <ContestCard key={fixture.id} fixture={fixture} />
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
