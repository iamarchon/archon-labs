'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import CategoryTabs from '@/components/CategoryTabs';
import MarketRow from '@/components/MarketRow';
import BetPanel from '@/components/BetPanel';

interface Market {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  matches: { home_team: string; away_team: string; match_date: string } | null;
}

export default function Home() {
  const { isSignedIn } = useUser();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [tab, setTab] = useState('TRENDING');
  const [betTarget, setBetTarget] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null);

  useEffect(() => {
    fetch('/api/markets?status=open')
      .then(r => r.json())
      .then(setMarkets);
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user', { method: 'POST' });
    }
  }, [isSignedIn]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Hero */}
      <div className="mb-12">
        <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-3">IPL 2025 · {markets.length} Markets Open</p>
        <h1 className="text-5xl font-light tracking-tight text-black">Predict.<br />Trade.<br />Win.</h1>
      </div>

      <CategoryTabs active={tab} onChange={setTab} />

      <div className="mt-0">
        {markets.length === 0 ? (
          <p className="text-[10px] tracking-widest uppercase text-gray-400 py-12 text-center">No markets open yet</p>
        ) : (
          markets.map(m => (
            <MarketRow
              key={m.id}
              market={m}
              onBet={(market, side) => {
                if (!isSignedIn) { window.location.href = '/sign-in'; return; }
                setBetTarget({ market, side });
              }}
            />
          ))
        )}
      </div>

      {betTarget && (
        <BetPanel
          market={betTarget.market}
          defaultSide={betTarget.side}
          onClose={() => setBetTarget(null)}
          onSuccess={() => fetch('/api/markets?status=open').then(r => r.json()).then(setMarkets)}
        />
      )}
    </div>
  );
}
