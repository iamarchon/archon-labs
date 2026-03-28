'use client';
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import MarketCard from '@/components/MarketCard';
import HeroMarkets from '@/components/HeroMarkets';
import LiveTicker from '@/components/LiveTicker';
import BetPanel from '@/components/BetPanel';
import { createSupabaseClient } from '@/lib/supabase-client';

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

export interface LiveItem {
  id: number;
  side: 'yes' | 'no';
  amount: number;
}

const SORT_OPTS = ['All', 'Today', 'Tomorrow', 'Most Volume'] as const;
type SortOpt = typeof SORT_OPTS[number];

export default function Home() {
  const { isSignedIn } = useUser();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [sort, setSort] = useState<SortOpt>('All');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [betTarget, setBetTarget] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null);
  const [liveActivity, setLiveActivity] = useState<Record<string, LiveItem[]>>({});

  // Initial fetch
  useEffect(() => {
    fetch('/api/markets?status=open')
      .then(r => r.json())
      .then(setMarkets)
      .catch(err => console.error('[markets] fetch failed:', err));
  }, []);

  // Register new user
  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user', { method: 'POST' }).catch(() => {});
    }
  }, [isSignedIn]);

  // Realtime: watch ALL new bets — update pools + show live floaters on cards
  useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel('listing-live-bets')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bets' },
        (payload) => {
          const bet = payload.new as {
            market_id: string;
            side: string;
            coins_wagered: number;
          };

          const itemId = Date.now() + Math.random();

          // Add floater to the card
          setLiveActivity(prev => ({
            ...prev,
            [bet.market_id]: [
              ...(prev[bet.market_id] ?? []).slice(-3),
              { id: itemId, side: bet.side as 'yes' | 'no', amount: bet.coins_wagered },
            ],
          }));

          // Optimistically update market pool sizes on the card
          setMarkets(prev =>
            prev.map(m => {
              if (m.id !== bet.market_id) return m;
              return {
                ...m,
                yes_pool: m.yes_pool + (bet.side === 'yes' ? bet.coins_wagered : 0),
                no_pool: m.no_pool + (bet.side === 'no' ? bet.coins_wagered : 0),
                total_pool: m.total_pool + bet.coins_wagered,
              };
            })
          );

          // Remove floater after animation completes
          setTimeout(() => {
            setLiveActivity(prev => ({
              ...prev,
              [bet.market_id]: (prev[bet.market_id] ?? []).filter(i => i.id !== itemId),
            }));
          }, 2500);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
    <div>
      {/* Live bet ticker */}
      <LiveTicker />

      <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Hero featured markets */}
      <HeroMarkets
        markets={filtered.length > 0 ? filtered : markets}
        liveActivity={liveActivity}
        onBet={(market, side) => {
          if (!isSignedIn) { window.location.href = '/sign-in'; return; }
          setBetTarget({ market, side });
        }}
      />

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

      {/* Filter pills */}
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

        {teams.length > 0 && (
          <div className="w-px h-5 mx-1 shrink-0" style={{ background: '#e5e7eb' }} />
        )}

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
              liveActivity={liveActivity[m.id] ?? []}
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
    </div>
  );
}
