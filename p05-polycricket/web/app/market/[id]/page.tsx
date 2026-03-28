'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import MarketChart from '@/components/MarketChart';
import ActivityFeed from '@/components/ActivityFeed';
import BetPanel from '@/components/BetPanel';
import BetTicker, { useBetTicker } from '@/components/BetTicker';
import { getYesPrice } from '@/lib/amm';
import { createSupabaseClient } from '@/lib/supabase-client';

interface Bet {
  side: string;
  coins_wagered: number;
  price_at_bet: number;
  created_at: string;
}

interface MarketDetail {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  status: string;
  resolves_at: string;
  matches: { home_team: string; away_team: string; match_date: string } | null;
  bets: Bet[];
}

const TABS = ['ACTIVITY', 'GRAPH', 'RESOLUTION'];

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn } = useUser();
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [activeTab, setActiveTab] = useState('ACTIVITY');
  const [betSide, setBetSide] = useState<'yes' | 'no' | null>(null);
  const ticker = useBetTicker();

  function load() {
    fetch(`/api/markets/${id}`)
      .then(r => r.json())
      .then(setMarket)
      .catch(err => console.error('[market] fetch failed:', err));
  }

  useEffect(() => {
    load();

    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`market-bets-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bets', filter: `market_id=eq.${id}` },
        (payload) => {
          const bet = payload.new as Bet;
          ticker.push(bet.side as 'yes' | 'no', bet.coins_wagered);
          load();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (!market) return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-100 rounded w-32" />
        <div className="h-8 bg-gray-100 rounded w-3/4" />
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    </div>
  );

  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;
  const totalVol = market.total_pool;

  function openBet(side: 'yes' | 'no') {
    if (!isSignedIn) { window.location.href = '/sign-in'; return; }
    setBetSide(side);
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT — main content */}
          <div className="flex-1 min-w-0">

            {/* Breadcrumb */}
            {market.matches && (
              <p className="text-xs text-gray-400 mb-3">
                IPL 2026 · {market.matches.home_team} vs {market.matches.away_team}
              </p>
            )}

            {/* Title */}
            <h1 className="text-xl font-semibold text-gray-900 mb-1 leading-snug">{market.title}</h1>

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap mb-6">
              <span className="text-xs text-gray-400">
                ${totalVol.toLocaleString()} Vol.
              </span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">
                {market.bets.length} trades
              </span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">
                Resolves {new Date(market.resolves_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </span>
              {market.status === 'open' && (
                <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  OPEN
                </span>
              )}
            </div>

            {/* Probability bar */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-green-600">{yesP}%</span>
                  <span className="text-sm text-gray-400">YES</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gray-400">NO</span>
                  <span className="text-3xl font-bold text-red-500">{noP}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-red-100">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${yesP}%` }}
                />
              </div>
            </div>

            {/* Buy row — visible on mobile, hidden on desktop (desktop uses sidebar) */}
            <div className="flex gap-2 mb-6 lg:hidden">
              <button
                onClick={() => openBet('yes')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors shadow-sm"
              >
                Buy YES · {yesP}¢
              </button>
              <button
                onClick={() => openBet('no')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors shadow-sm"
              >
                Buy NO · {noP}¢
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-100 mb-5">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`text-xs font-semibold tracking-wide pb-3 transition-colors ${
                    activeTab === t
                      ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {t}
                  {t === 'ACTIVITY' && market.bets.length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {market.bets.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'ACTIVITY' && <ActivityFeed bets={market.bets} />}
            {activeTab === 'GRAPH' && <MarketChart bets={market.bets} currentYesP={yesP} />}
            {activeTab === 'RESOLUTION' && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resolution Criteria</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  This market resolves YES if the outcome matches the match result from CricAPI after the match ends.
                  Markets are auto-resolved within 10 minutes of match completion.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT — sticky trade panel, desktop only */}
          <div className="hidden lg:block lg:w-72 lg:sticky lg:top-20 lg:self-start">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Panel header */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-3">Trade</p>
                {/* Buy/Sell tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  <button className="flex-1 py-1.5 text-xs font-semibold rounded-md bg-white text-gray-900 shadow-sm">Buy</button>
                  <button className="flex-1 py-1.5 text-xs font-semibold rounded-md text-gray-400 cursor-not-allowed">Sell</button>
                </div>
              </div>

              <div className="p-4">
                {/* Outcome buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => openBet('yes')}
                    className="py-3 rounded-xl bg-green-50 hover:bg-green-500 hover:text-white text-green-700 font-semibold text-sm transition-all group"
                  >
                    <span className="block text-[10px] font-normal opacity-60 mb-0.5">YES</span>
                    {yesP}¢
                  </button>
                  <button
                    onClick={() => openBet('no')}
                    className="py-3 rounded-xl bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-semibold text-sm transition-all"
                  >
                    <span className="block text-[10px] font-normal opacity-60 mb-0.5">NO</span>
                    {noP}¢
                  </button>
                </div>

                {/* Quick amounts */}
                <p className="text-[10px] text-gray-400 mb-2">Quick amounts</p>
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {[1, 5, 10, 100].map(v => (
                    <button
                      key={v}
                      onClick={() => openBet('yes')}
                      className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors"
                    >
                      ${v}
                    </button>
                  ))}
                </div>

                {/* Stats */}
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Volume</span>
                    <span className="font-medium text-gray-700">${totalVol.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Trades</span>
                    <span className="font-medium text-gray-700">{market.bets.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-medium capitalize ${market.status === 'open' ? 'text-green-600' : 'text-gray-500'}`}>
                      {market.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Paper trading disclaimer */}
            <p className="text-center text-[10px] text-gray-400 mt-3">
              Paper trading · $1,000 starting balance
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

      <BetTicker items={ticker.items} />
    </>
  );
}
