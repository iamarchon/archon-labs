'use client';
import { useEffect, useState } from 'react';

interface Market {
  id: string;
  title: string;
  status: string;
  yes_pool: number;
  no_pool: number;
}

export default function Admin() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/markets?status=disputed').then(r => r.json()).then(setMarkets).catch(() => {});
  }, []);

  async function resolve(marketId: string, outcome: 'yes' | 'no') {
    setResolving(marketId);
    await fetch('/api/admin/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_id: marketId, outcome }),
    });
    setMarkets(m => m.filter(x => x.id !== marketId));
    setResolving(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-8">Admin · Disputed Markets</p>
      {markets.length === 0 && (
        <p className="text-[10px] tracking-widest uppercase text-gray-400">No disputed markets</p>
      )}
      {markets.map(m => (
        <div key={m.id} className="py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm">{m.title}</p>
          <div className="flex gap-2">
            <button
              onClick={() => resolve(m.id, 'yes')}
              disabled={resolving === m.id}
              className="text-[10px] tracking-widest uppercase bg-green-600 text-white px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
            >
              RESOLVE YES
            </button>
            <button
              onClick={() => resolve(m.id, 'no')}
              disabled={resolving === m.id}
              className="text-[10px] tracking-widest uppercase bg-red-500 text-white px-3 py-1.5 hover:bg-red-600 disabled:opacity-50"
            >
              RESOLVE NO
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
