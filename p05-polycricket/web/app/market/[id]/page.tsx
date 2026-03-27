'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import MarketChart from '@/components/MarketChart';
import OrderBook from '@/components/OrderBook';
import BetPanel from '@/components/BetPanel';
import { getYesPrice, getNoPrice, OrderBookEntry } from '@/lib/amm';

interface MarketDetail {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  status: string;
  resolves_at: string;
  matches: { home_team: string; away_team: string; match_date: string } | null;
  orderBook: { asks: OrderBookEntry[]; bids: OrderBookEntry[] };
  recentBets: { side: string; coins_wagered: number; price_at_bet: number; created_at: string }[];
}

const TABS = ['ORDER BOOK', 'GRAPH', 'RESOLUTION'];

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn } = useUser();
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [activeTab, setActiveTab] = useState('ORDER BOOK');
  const [betSide, setBetSide] = useState<'yes' | 'no' | null>(null);

  function load() {
    fetch(`/api/markets/${id}`).then(r => r.json()).then(setMarket).catch(err => console.error('[market] fetch failed:', err));
  }

  useEffect(load, [id]);

  if (!market) return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-widest uppercase text-gray-400">Loading...</p>
    </div>
  );

  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;

  // Mock chart data from recent bets
  const chartData = market.recentBets.slice().reverse().map((b) => ({
    time: new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    yes: Math.round(b.price_at_bet * 100),
    no: 100 - Math.round(b.price_at_bet * 100),
  }));
  if (chartData.length === 0) chartData.push({ time: 'NOW', yes: yesP, no: noP });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* LEFT */}
        <div className="flex-1 min-w-0">
          {market.matches && (
            <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">
              {market.matches.home_team} vs {market.matches.away_team}
            </p>
          )}
          <h1 className="text-2xl font-medium mb-1">{market.title}</h1>
          <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-8">
            {market.total_pool.toLocaleString()} coins Vol. · Resolves {new Date(market.resolves_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Outcome row */}
          <div className="flex items-center gap-6 mb-8 py-4 border-y border-gray-100">
            <div>
              <p className="text-4xl font-light">{yesP}%</p>
              <p className="text-[9px] tracking-widest uppercase text-gray-400 mt-1">YES</p>
            </div>
            <div className="flex-1 h-1 flex">
              <div className="bg-green-500 h-full transition-all" style={{ width: `${yesP}%` }} />
              <div className="bg-red-500 h-full transition-all" style={{ width: `${noP}%` }} />
            </div>
            <div className="text-right">
              <p className="text-4xl font-light">{noP}%</p>
              <p className="text-[9px] tracking-widest uppercase text-gray-400 mt-1">NO</p>
            </div>
          </div>

          {/* Buy row */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => isSignedIn ? setBetSide('yes') : (window.location.href = '/sign-in')}
              className="flex-1 bg-green-600 text-white text-[10px] tracking-widest uppercase py-3 hover:bg-green-700 transition-colors"
            >
              BUY YES {yesP}¢
            </button>
            <button
              onClick={() => isSignedIn ? setBetSide('no') : (window.location.href = '/sign-in')}
              className="flex-1 bg-red-500 text-white text-[10px] tracking-widest uppercase py-3 hover:bg-red-600 transition-colors"
            >
              BUY NO {noP}¢
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-gray-100 mb-6">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`text-[10px] tracking-widest uppercase pb-3 transition-colors ${
                  activeTab === t ? 'text-black border-b-2 border-black -mb-px' : 'text-gray-400 hover:text-black'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'ORDER BOOK' && (
            <OrderBook asks={market.orderBook.asks} bids={market.orderBook.bids} />
          )}
          {activeTab === 'GRAPH' && <MarketChart data={chartData} />}
          {activeTab === 'RESOLUTION' && (
            <div>
              <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">Resolution Criteria</p>
              <p className="text-sm text-gray-600">
                This market resolves YES if the outcome matches the match result from CricAPI after the match ends.
                Markets are auto-resolved within 10 minutes of match completion.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — sticky buy panel on desktop */}
        <div className="lg:w-72 lg:sticky lg:top-6 lg:self-start">
          <div className="border border-gray-200 p-6">
            <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">Trade</p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => isSignedIn ? setBetSide('yes') : (window.location.href = '/sign-in')}
                className="flex-1 bg-green-600 text-white text-[10px] tracking-widest uppercase py-2.5 hover:bg-green-700"
              >
                YES {yesP}¢
              </button>
              <button
                onClick={() => isSignedIn ? setBetSide('no') : (window.location.href = '/sign-in')}
                className="flex-1 bg-red-500 text-white text-[10px] tracking-widest uppercase py-2.5 hover:bg-red-600"
              >
                NO {noP}¢
              </button>
            </div>
            <p className="text-[9px] text-gray-400 tracking-wide">
              Volume: {market.total_pool.toLocaleString()} coins<br />
              Status: {market.status.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {betSide && (
        <BetPanel
          market={market}
          defaultSide={betSide}
          onClose={() => setBetSide(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
