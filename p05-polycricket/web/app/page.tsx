'use client';
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import MarketCard from '@/components/MarketCard';
import BetPanel from '@/components/BetPanel';

interface Market {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  resolves_at: string;
  volume_24h?: number;
  matches: { home_team: string; away_team: string; match_date: string } | null;
}

const SORT_OPTS = ['All', 'Today', 'Tomorrow', 'Most Volume'] as const;
type SortOpt = typeof SORT_OPTS[number];

export default function Home() {
  const { isSignedIn } = useUser();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [sort, setSort] = useState<SortOpt>('All');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [betTarget, setBetTarget] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null);

  useEffect(() => {
    fetch('/api/markets?status=open')
      .then(r => r.json())
      .then(setMarkets)
      .catch(err => console.error('[markets] fetch failed:', err));
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user', { method: 'POST' }).catch(() => {});
    }
  }, [isSignedIn]);

  const teams = useMemo(() => {
    const seen = new Set<string>();
    markets.forEach(m => {
      if (m.matches?.home_team) seen.add(m.matches.home_team);
      if (m.matches?.away_team) seen.add(m.matches.away_team);
    });
    return Array.from(seen).sort();
  }, [markets]);

  const filtered = useMemo(() => {
    let list = [...markets];
    if (teamFilter !== 'All') {
      list = list.filter(m =>
        m.matches?.home_team === teamFilter || m.matches?.away_team === teamFilter
      );
    }
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    if (sort === 'Today') {
      list = list.filter(m => {
        const d = new Date(m.matches?.match_date ?? '').getTime();
        return d >= now && d < now + day;
      });
    } else if (sort === 'Tomorrow') {
      list = list.filter(m => {
        const d = new Date(m.matches?.match_date ?? '').getTime();
        return d >= now + day && d < now + 2 * day;
      });
    } else if (sort === 'Most Volume') {
      list.sort((a, b) => b.total_pool - a.total_pool);
    }
    return list;
  }, [markets, sort, teamFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-xl font-bold text-gray-900"
          style={{ letterSpacing: '-0.025em' }}
        >
          All markets
        </h2>
        <span className="text-[13px] text-gray-400">{filtered.length} open</span>
      </div>

      {/* Filter pills row — Polymarket style */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
        {SORT_OPTS.map(opt => (
          <button
            key={opt}
            onClick={() => setSort(opt)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: sort === opt ? '#111827' : '#F3F4F6',
              color: sort === opt ? '#fff' : '#374151',
              letterSpacing: '-0.01em',
            }}
          >
            {opt}
          </button>
        ))}

        {teams.length > 0 && <div className="w-px h-5 mx-1 shrink-0" style={{ background: '#e5e7eb' }} />}

        <button
          onClick={() => setTeamFilter('All')}
          className="shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
          style={{
            background: teamFilter === 'All' ? '#111827' : '#F3F4F6',
            color: teamFilter === 'All' ? '#fff' : '#374151',
            letterSpacing: '-0.01em',
          }}
        >
          All Teams
        </button>

        {teams.map(team => {
          const abbr = team.split(' ').map((w: string) => w[0]).join('').slice(0, 3);
          return (
            <button
              key={team}
              onClick={() => setTeamFilter(team)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: teamFilter === team ? '#111827' : '#F3F4F6',
                color: teamFilter === team ? '#fff' : '#374151',
                letterSpacing: '-0.01em',
              }}
            >
              {abbr}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-4xl mb-4">🏏</span>
          <p className="text-gray-500 text-sm">No markets match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(m => (
            <MarketCard
              key={m.id}
              market={m}
              onBet={(market, side) => {
                if (!isSignedIn) { window.location.href = '/sign-in'; return; }
                setBetTarget({ market, side });
              }}
            />
          ))}
        </div>
      )}

      {betTarget && (
        <BetPanel
          market={betTarget.market}
          defaultSide={betTarget.side}
          onClose={() => setBetTarget(null)}
          onSuccess={() =>
            fetch('/api/markets?status=open').then(r => r.json()).then(setMarkets)
          }
        />
      )}
    </div>
  );
}
