import { BottomNav, ContestCard } from "@/components/dreamxi";
import { getUpcomingFixtures } from "@/lib/data/fixtures";

export default function ContestsPage() {
  const fixtures = getUpcomingFixtures();

  return (
    <main className="container-mobile px-4 pb-24 pt-6">
      <section className="sports-panel rounded-[2rem] p-5">
        <div className="flex items-center gap-2">
          <span className="signal-chip signal-chip--live">Real-time fantasy</span>
          <span className="signal-chip signal-chip--hot">High-entry slate</span>
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-violet-300">DreamXI</p>
        <h1 className="section-title mt-3 text-slate-50">Pick a match. Enter a contest. Build your XI.</h1>
        <p className="section-subtitle mt-3">
          Premium IPL fantasy contests with stronger prize visibility, secure scoring cues, and faster entry decisions.
        </p>

        <div className="mt-5 stat-grid">
          <div className="stat-card">
            <p className="stat-label">Prize pools</p>
            <p className="stat-value">₹25L+</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Live matches</p>
            <p className="stat-value">20</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Entry from</p>
            <p className="stat-value">₹29</p>
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-wrap gap-2">
        <span className="signal-chip signal-chip--violet">Upcoming</span>
        <span className="signal-chip">Mega</span>
        <span className="signal-chip">Safe</span>
        <span className="signal-chip">H2H</span>
      </section>

      <section className="mt-5 space-y-4">
        {fixtures.map((fixture) => (
          <ContestCard key={fixture.id} fixture={fixture} />
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
