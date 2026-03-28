'use client';
import Link from 'next/link';
import { getYesPrice } from '@/lib/amm';

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

function TeamBadge({ team, size = 32 }: { team: string; size?: number }) {
  const meta = TEAM_META[team];
  if (!meta) {
    return (
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, background: '#F3F4F6' }}
      >
        <span style={{ fontSize: size * 0.4 }}>🏏</span>
      </div>
    );
  }
  return (
    <div
      className="rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: meta.bg }}
    >
      <span
        className="font-bold leading-none"
        style={{
          color: meta.color,
          fontSize: meta.abbr.length > 2 ? size * 0.22 : size * 0.28,
          letterSpacing: '-0.03em',
        }}
      >
        {meta.abbr}
      </span>
    </div>
  );
}

function formatVol(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function MarketCard({
  market,
  onBet,
}: {
  market: Market;
  onBet: (market: Market, side: 'yes' | 'no') => void;
}) {
  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;
  const match = market.matches;
  const homeTeam = match?.home_team ?? '';
  const awayTeam = match?.away_team ?? '';
  const homeMeta = TEAM_META[homeTeam];
  const awayMeta = TEAM_META[awayTeam];

  return (
    <Link href={`/market/${market.id}`} className="block group">
      <div
        className="bg-white rounded-xl flex flex-col h-full transition-shadow duration-150"
        style={{
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
      >
        <div className="p-4 flex flex-col gap-3 h-full">

          {/* Top: home badge + category tag + date */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <TeamBadge team={homeTeam} size={36} />
              <div>
                <p className="text-[11px] font-medium text-gray-400 leading-none mb-0.5">
                  IPL 2026
                </p>
                {match?.match_date && (
                  <p className="text-[11px] text-gray-400">
                    {formatDate(match.match_date)}
                  </p>
                )}
              </div>
            </div>
            {awayMeta && (
              <TeamBadge team={awayTeam} size={28} />
            )}
          </div>

          {/* Title */}
          <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2 flex-1"
            style={{ letterSpacing: '-0.01em' }}>
            {market.title}
          </p>

          {/* Probability row */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-baseline gap-1">
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ letterSpacing: '-0.03em', color: '#166534' }}
                >
                  {yesP}%
                </span>
                <span className="text-[11px] font-medium text-gray-400">YES</span>
              </div>
              <span className="text-[11px] text-gray-400 tabular-nums">{noP}% NO</span>
            </div>
            {/* Progress bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#FEE2E2' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${yesP}%`, background: '#166534', transition: 'width 0.4s ease' }}
              />
            </div>
          </div>

          {/* Bottom: volume + buy buttons */}
          <div className="flex items-center gap-2 mt-auto pt-0.5">
            {market.total_pool > 0 && (
              <span className="text-[11px] text-gray-400 mr-auto">
                {formatVol(market.total_pool)} vol
              </span>
            )}
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onBet(market, 'yes'); }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
              style={{ background: '#dcfce7', color: '#166534' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#166534'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.color = '#166534'; }}
            >
              Yes
            </button>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onBet(market, 'no'); }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
              style={{ background: '#fee2e2', color: '#dc2626' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
