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

function TeamBadge({ team }: { team: string }) {
  const meta = TEAM_META[team];
  if (!meta) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-bold text-gray-600">🏏</span>
      </div>
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: meta.bg }}
    >
      <span className="text-[10px] font-bold leading-none" style={{ color: meta.color }}>
        {meta.abbr}
      </span>
    </div>
  );
}

function formatVol(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function MarketCard({
  market,
  onBet,
}: {
  market: Market;
  onBet: (market: Market, side: 'yes' | 'no') => void;
}) {
  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const match = market.matches;
  const homeTeam = match?.home_team ?? '';

  const matchDate = match
    ? new Date(match.match_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    : '';

  return (
    <Link href={`/market/${market.id}`} className="block group">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
        {/* Top: badge + title */}
        <div className="flex items-start gap-3">
          <TeamBadge team={homeTeam} />
          <p className="text-[13px] font-medium text-gray-900 leading-snug line-clamp-2 pt-0.5">
            {market.title}
          </p>
        </div>

        {/* Bottom row: date · vol · % · Yes/No */}
        <div className="flex items-center gap-2 mt-auto flex-wrap">
          {matchDate && (
            <span className="text-xs text-gray-400 shrink-0">{matchDate}</span>
          )}
          {market.total_pool > 0 && (
            <span className="text-xs text-gray-400 shrink-0">
              · {formatVol(market.total_pool)} coins
            </span>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[15px] font-bold text-gray-900">{yesP}%</span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onBet(market, 'yes'); }}
              className="text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-600 hover:text-white px-2.5 py-1 rounded-full transition-colors"
            >
              Yes
            </button>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onBet(market, 'no'); }}
              className="text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-500 hover:text-white px-2.5 py-1 rounded-full transition-colors"
            >
              No
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
