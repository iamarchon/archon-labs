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

export interface LiveItem {
  id: number;
  side: 'yes' | 'no';
  amount: number;
}

const TEAM_META: Record<string, { abbr: string; color: string; bg: string; logo?: string }> = {
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

// IPL logo URLs from official CDN
const TEAM_LOGOS: Record<string, string> = {
  'Mumbai Indians': 'https://scores.iplt20.com/ipl/teamlogos/MI.png',
  'Royal Challengers Bengaluru': 'https://scores.iplt20.com/ipl/teamlogos/RCB.png',
  'Chennai Super Kings': 'https://scores.iplt20.com/ipl/teamlogos/CSK.png',
  'Kolkata Knight Riders': 'https://scores.iplt20.com/ipl/teamlogos/KKR.png',
  'Delhi Capitals': 'https://scores.iplt20.com/ipl/teamlogos/DC.png',
  'Rajasthan Royals': 'https://scores.iplt20.com/ipl/teamlogos/RR.png',
  'Sunrisers Hyderabad': 'https://scores.iplt20.com/ipl/teamlogos/SRH.png',
  'Punjab Kings': 'https://scores.iplt20.com/ipl/teamlogos/PBKS.png',
  'Lucknow Super Giants': 'https://scores.iplt20.com/ipl/teamlogos/LSG.png',
  'Gujarat Titans': 'https://scores.iplt20.com/ipl/teamlogos/GT.png',
};

function TeamBadge({ team, size = 36 }: { team: string; size?: number }) {
  const meta = TEAM_META[team];
  const logo = TEAM_LOGOS[team];
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: meta?.bg ?? '#F3F4F6' }}
    >
      {logo ? (
        <img
          src={logo}
          alt={meta?.abbr ?? team}
          width={size - 6}
          height={size - 6}
          className="object-contain"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <span
          className="font-bold leading-none"
          style={{
            color: meta?.color ?? '#374151',
            fontSize: meta && meta.abbr.length > 2 ? size * 0.22 : size * 0.28,
            letterSpacing: '-0.03em',
          }}
        >
          {meta?.abbr ?? '🏏'}
        </span>
      )}
    </div>
  );
}

function ProbGauge({ pct, label }: { pct: number; label: string }) {
  const r = 17;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const isGreen = pct >= 50;
  const fillColor = isGreen ? '#166534' : '#dc2626';

  return (
    <svg width="50" height="50" viewBox="0 0 50 50" className="shrink-0">
      <circle cx="25" cy="25" r={r} fill="none" stroke="#F3F4F6" strokeWidth="4" />
      <circle
        cx="25" cy="25" r={r} fill="none"
        stroke={fillColor} strokeWidth="4"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
        transform="rotate(-90 25 25)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x="25" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827" fontFamily="inherit">
        {pct}%
      </text>
      <text x="25" y="32" textAnchor="middle" fontSize="7.5" fill="#9CA3AF" fontFamily="inherit">
        {label.slice(0, 4)}
      </text>
    </svg>
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
  liveActivity = [],
}: {
  market: Market;
  onBet: (market: Market, side: 'yes' | 'no') => void;
  liveActivity?: LiveItem[];
}) {
  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;
  const match = market.matches;
  const homeTeam = match?.home_team ?? '';
  const awayTeam = match?.away_team ?? '';
  const homeMeta = TEAM_META[homeTeam];
  const awayMeta = TEAM_META[awayTeam];
  const homeAbbr = homeMeta?.abbr ?? homeTeam.split(' ')[0] ?? 'YES';
  const awayAbbr = awayMeta?.abbr ?? awayTeam.split(' ')[0] ?? 'NO';

  const yesItems = liveActivity.filter(i => i.side === 'yes').slice(-2);
  const noItems = liveActivity.filter(i => i.side === 'no').slice(-2);
  const hasLive = liveActivity.length > 0;

  return (
    <Link href={`/market/${market.id}`} className="block group">
      <div
        className="bg-white rounded-xl flex flex-col overflow-hidden h-full"
        style={{
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.15s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
      >
        {/* Top: badge + title + gauge */}
        <div className="p-4 pb-3 flex-1">
          <div className="flex items-start gap-3">
            <TeamBadge team={homeTeam} size={38} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 mb-1">
                IPL 2026{match?.match_date ? ` · ${formatDate(match.match_date)}` : ''}
              </p>
              <p
                className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2"
                style={{ letterSpacing: '-0.01em' }}
              >
                {market.title}
              </p>
            </div>
            <ProbGauge pct={yesP} label={homeAbbr} />
          </div>
        </div>

        {/* Split buy buttons with live activity floaters */}
        <div className="flex" style={{ borderTop: '1px solid #f3f4f6' }}>
          {/* YES / home */}
          <button
            className="relative flex-1 h-[52px] flex items-center justify-center text-[13px] font-semibold overflow-hidden transition-colors"
            style={{
              background: '#dcfce7',
              color: '#166534',
              borderRight: '1px solid #e5e7eb',
            }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onBet(market, 'yes'); }}
            onMouseEnter={e => (e.currentTarget.style.background = '#bbf7d0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#dcfce7')}
          >
            {/* Floaters: appear on left side */}
            <div className="absolute left-2 inset-y-0 flex flex-col-reverse justify-start gap-0.5 overflow-hidden pointer-events-none">
              {yesItems.map(item => (
                <span
                  key={item.id}
                  className="live-floater text-[10px] font-bold text-green-600 leading-none whitespace-nowrap"
                >
                  +${item.amount}
                </span>
              ))}
            </div>
            <span style={{ letterSpacing: '-0.01em' }}>{homeAbbr}</span>
          </button>

          {/* NO / away */}
          <button
            className="relative flex-1 h-[52px] flex items-center justify-center text-[13px] font-semibold overflow-hidden transition-colors"
            style={{ background: '#fee2e2', color: '#dc2626' }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onBet(market, 'no'); }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fecaca')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fee2e2')}
          >
            {/* Floaters: appear on right side */}
            <div className="absolute right-2 inset-y-0 flex flex-col-reverse justify-start gap-0.5 overflow-hidden pointer-events-none">
              {noItems.map(item => (
                <span
                  key={item.id}
                  className="live-floater text-[10px] font-bold text-red-500 leading-none whitespace-nowrap"
                >
                  +${item.amount}
                </span>
              ))}
            </div>
            <span style={{ letterSpacing: '-0.01em' }}>{awayAbbr}</span>
          </button>
        </div>

        {/* Bottom strip: LIVE dot or vol + bookmark */}
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ borderTop: '1px solid #f3f4f6' }}
        >
          {hasLive ? (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
              <span className="text-[11px] font-semibold text-red-500">LIVE</span>
            </div>
          ) : (
            <span className="text-[11px] text-gray-400">
              {market.total_pool > 0 ? formatVol(market.total_pool) + ' vol' : '—'}
            </span>
          )}

          {/* Away team micro-badge */}
          {awayTeam && (
            <div className="flex items-center gap-1.5">
              {hasLive && (
                <span className="text-[11px] text-gray-400">
                  {formatVol(market.total_pool)}
                </span>
              )}
              <TeamBadge team={awayTeam} size={20} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
