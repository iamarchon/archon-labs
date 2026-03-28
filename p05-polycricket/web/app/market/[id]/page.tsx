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

const TEAM_META: Record<string, { abbr: string; color: string; bg: string }> = {
  'Mumbai Indians':               { abbr: 'MI',   color: '#fff',    bg: '#004C8F' },
  'Royal Challengers Bengaluru':  { abbr: 'RCB',  color: '#fff',    bg: '#DA1B1B' },
  'Chennai Super Kings':          { abbr: 'CSK',  color: '#1a1a1a', bg: '#F8CD28' },
  'Kolkata Knight Riders':        { abbr: 'KKR',  color: '#FFD700', bg: '#3A225D' },
  'Delhi Capitals':               { abbr: 'DC',   color: '#fff',    bg: '#0057B8' },
  'Rajasthan Royals':             { abbr: 'RR',   color: '#fff',    bg: '#EA1A8E' },
  'Sunrisers Hyderabad':          { abbr: 'SRH',  color: '#fff',    bg: '#F26522' },
  'Punjab Kings':                 { abbr: 'PBKS', color: '#fff',    bg: '#DD1F2D' },
  'Lucknow Super Giants':         { abbr: 'LSG',  color: '#1a1a1a', bg: '#A2EFFF' },
  'Gujarat Titans':               { abbr: 'GT',   color: '#fff',    bg: '#1D2951' },
};

const TABS = ['Activity', 'Chart', 'Resolution'];

function TeamBadge({ team }: { team: string }) {
  const meta = TEAM_META[team];
  return (
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center"
      style={{ background: meta?.bg ?? '#F3F4F6' }}
    >
      <span
        className="font-bold text-sm leading-none"
        style={{
          color: meta?.color ?? '#374151',
          letterSpacing: '-0.03em',
        }}
      >
        {meta?.abbr ?? '🏏'}
      </span>
    </div>
  );
}

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn } = useUser();
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [activeTab, setActiveTab] = useState('Activity');
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

  function openBet(side: 'yes' | 'no') {
    if (!isSignedIn) { window.location.href = '/sign-in'; return; }
    setBetSide(side);
  }

  if (!market) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-gray-100 rounded w-32" />
          <div className="h-7 bg-gray-100 rounded w-2/3" />
          <div className="h-32 bg-gray-100 rounded mt-6" />
        </div>
      </div>
    );
  }

  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;
  const homeTeam = market.matches?.home_team ?? '';
  const awayTeam = market.matches?.away_team ?? '';
  const homeMeta = TEAM_META[homeTeam];
  const awayMeta = TEAM_META[awayTeam];

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <p className="text-[12px] text-gray-400 mb-4" style={{ letterSpacing: '0' }}>
          Sports · IPL 2026
        </p>

        {/* Title */}
        <h1
          className="text-2xl font-bold text-gray-900 mb-5"
          style={{ letterSpacing: '-0.03em', lineHeight: 1.2 }}
        >
          {market.title}
        </h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT — main content */}
          <div className="flex-1 min-w-0">

            {/* Team matchup display — Polymarket style */}
            {market.matches && (
              <div
                className="rounded-xl p-6 mb-5 text-center relative overflow-hidden"
                style={{ background: '#F9FAFB', border: '1px solid #e5e7eb' }}
              >
                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <TeamBadge team={homeTeam} />
                    <span className="text-xs font-semibold text-gray-600"
                      style={{ letterSpacing: '-0.01em' }}>
                      {homeMeta?.abbr ?? homeTeam.split(' ')[0]}
                    </span>
                    <span
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: '#166534', letterSpacing: '-0.04em' }}
                    >
                      {yesP}%
                    </span>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-light text-gray-300 mb-1">vs</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(market.matches.match_date).toLocaleDateString('en-IN', {
                        month: 'short', day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <TeamBadge team={awayTeam} />
                    <span className="text-xs font-semibold text-gray-600"
                      style={{ letterSpacing: '-0.01em' }}>
                      {awayMeta?.abbr ?? awayTeam.split(' ')[0]}
                    </span>
                    <span
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: '#DC2626', letterSpacing: '-0.04em' }}
                    >
                      {noP}%
                    </span>
                  </div>
                </div>

                {/* Probability bar */}
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: '#fee2e2' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${yesP}%`,
                      background: '#166534',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>

                {/* Volume */}
                <div className="mt-3 flex items-center justify-center gap-1">
                  <span className="text-[12px] text-gray-400">
                    ${market.total_pool.toLocaleString()} Vol.
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[12px] text-gray-400">{market.bets.length} trades</span>
                </div>
              </div>
            )}

            {/* Mobile buy buttons */}
            <div className="flex gap-2 mb-5 lg:hidden">
              <button
                onClick={() => openBet('yes')}
                className="flex-1 py-3 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: '#166534' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#14532d')}
                onMouseLeave={e => (e.currentTarget.style.background = '#166534')}
              >
                {homeMeta?.abbr ?? 'YES'} {yesP}¢
              </button>
              <button
                onClick={() => openBet('no')}
                className="flex-1 py-3 rounded-lg text-sm font-semibold transition-all"
                style={{ background: '#F3F4F6', color: '#374151' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
              >
                {awayMeta?.abbr ?? 'NO'} {noP}¢
              </button>
            </div>

            {/* Tabs — Polymarket underline style */}
            <div className="flex" style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className="text-[13px] font-semibold mr-6 pb-3 transition-colors"
                  style={{
                    color: activeTab === t ? '#111827' : '#9CA3AF',
                    borderBottom: activeTab === t ? '2px solid #111827' : '2px solid transparent',
                    marginBottom: '-1px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t}
                  {t === 'Activity' && market.bets.length > 0 && (
                    <span
                      className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: '#F3F4F6', color: '#6B7280' }}
                    >
                      {market.bets.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'Activity' && <ActivityFeed bets={market.bets} />}
            {activeTab === 'Chart' && <MarketChart bets={market.bets} currentYesP={yesP} />}
            {activeTab === 'Resolution' && (
              <div className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #e5e7eb' }}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Resolution Criteria
                </p>
                <p className="text-sm text-gray-600" style={{ lineHeight: '1.6' }}>
                  This market resolves YES if {homeTeam || 'the home team'} wins the match.
                  Markets are auto-resolved within 10 minutes of match completion using CricAPI data.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT — sticky trade widget, desktop only */}
          <div className="hidden lg:block w-[320px] flex-shrink-0">
            <div
              className="sticky top-[72px] rounded-2xl overflow-hidden bg-white"
              style={{
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              {/* Widget header */}
              <div className="px-4 pt-4">
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: homeMeta?.bg ?? '#166534' }}
                  >
                    {homeMeta?.abbr?.slice(0, 2) ?? '🏏'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                      {homeMeta?.abbr ?? 'YES'} vs {awayMeta?.abbr ?? 'NO'}
                    </p>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: '#dcfce7', color: '#166534' }}
                    >
                      {homeMeta?.abbr ?? 'IPL'}
                    </span>
                  </div>
                </div>

                {/* Buy / Sell tabs */}
                <div className="flex items-center" style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <button className="text-sm font-semibold text-gray-900 pb-2.5 mr-4 border-b-2 border-gray-900 -mb-px">
                    Buy
                  </button>
                  <button className="text-sm text-gray-400 pb-2.5 mr-auto cursor-not-allowed">
                    Sell
                  </button>
                  <span className="text-xs text-gray-500 flex items-center gap-1 pb-2">
                    Market
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>

              <div className="p-4 pt-3">
                {/* Outcome buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => openBet('yes')}
                    className="py-3 px-3 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: '#166534', color: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#14532d')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#166534')}
                  >
                    {homeMeta?.abbr ?? 'YES'} {yesP}¢
                  </button>
                  <button
                    onClick={() => openBet('no')}
                    className="py-3 px-3 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: '#F3F4F6', color: '#374151' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
                  >
                    {awayMeta?.abbr ?? 'NO'} {noP}¢
                  </button>
                </div>

                {/* Amount row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Amount</span>
                  <span
                    className="text-2xl font-semibold text-gray-300 tabular-nums"
                    style={{ letterSpacing: '-0.03em' }}
                  >
                    $0
                  </span>
                </div>

                {/* Quick add pills */}
                <div className="flex gap-1.5 mb-4">
                  {[1, 5, 10, 100].map(v => (
                    <button
                      key={v}
                      onClick={() => openBet('yes')}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg"
                      style={{ background: '#F3F4F6', color: '#374151' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
                    >
                      +${v}
                    </button>
                  ))}
                  <button
                    onClick={() => openBet('yes')}
                    className="flex-1 text-xs font-semibold py-1.5 rounded-lg"
                    style={{ background: '#F3F4F6', color: '#374151' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
                  >
                    Max
                  </button>
                </div>

                {/* Trade button */}
                <button
                  onClick={() => openBet('yes')}
                  className="w-full text-sm font-semibold text-white rounded-lg py-3"
                  style={{ background: '#2563EB' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
                >
                  Trade
                </button>

                <p className="text-center text-[11px] text-gray-400 mt-3">
                  By trading, you agree to our{' '}
                  <span className="underline cursor-pointer">Terms of Use</span>.
                </p>

                {/* Stats */}
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span style={{ color: '#6B7280' }}>Volume</span>
                    <span className="font-semibold text-gray-800">${market.total_pool.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span style={{ color: '#6B7280' }}>Trades</span>
                    <span className="font-semibold text-gray-800">{market.bets.length}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span style={{ color: '#6B7280' }}>Resolves</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(market.resolves_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
