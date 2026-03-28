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
  matches: { home_team: string; away_team: string; match_date: string } | null;
}

interface LiveItem {
  id: number;
  side: 'yes' | 'no';
  amount: number;
}

const TEAM_META: Record<string, { abbr: string; color: string; bg: string; accent: string }> = {
  'Mumbai Indians':               { abbr: 'MI',   color: '#fff',    bg: '#004C8F', accent: '#0066CC' },
  'Royal Challengers Bengaluru':  { abbr: 'RCB',  color: '#fff',    bg: '#DA1B1B', accent: '#FF3333' },
  'Chennai Super Kings':          { abbr: 'CSK',  color: '#1a1a1a', bg: '#F8CD28', accent: '#FFD700' },
  'Kolkata Knight Riders':        { abbr: 'KKR',  color: '#FFD700', bg: '#3A225D', accent: '#5A3A8D' },
  'Delhi Capitals':               { abbr: 'DC',   color: '#fff',    bg: '#0057B8', accent: '#0070E0' },
  'Rajasthan Royals':             { abbr: 'RR',   color: '#fff',    bg: '#EA1A8E', accent: '#FF40AA' },
  'Sunrisers Hyderabad':          { abbr: 'SRH',  color: '#fff',    bg: '#F26522', accent: '#FF8040' },
  'Punjab Kings':                 { abbr: 'PBKS', color: '#fff',    bg: '#DD1F2D', accent: '#FF3340' },
  'Lucknow Super Giants':         { abbr: 'LSG',  color: '#1a1a1a', bg: '#A2EFFF', accent: '#70E0FF' },
  'Gujarat Titans':               { abbr: 'GT',   color: '#fff',    bg: '#1D2951', accent: '#2D3F7A' },
};

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

function formatVol(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffH = (d.getTime() - now.getTime()) / 3_600_000;
  if (diffH < 24 && diffH > 0) return `Today · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffH < 48) return `Tomorrow · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function HeroMarkets({
  markets,
  liveActivity,
  onBet,
}: {
  markets: Market[];
  liveActivity: Record<string, LiveItem[]>;
  onBet: (market: Market, side: 'yes' | 'no') => void;
}) {
  // Top 3 markets by volume, or just first 3
  const featured = [...markets]
    .sort((a, b) => b.total_pool - a.total_pool)
    .slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
        <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase">
          Featured Matches
        </span>
      </div>

      {/* Hero card row */}
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {featured.map(market => (
          <HeroCard
            key={market.id}
            market={market}
            isLive={(liveActivity[market.id]?.length ?? 0) > 0}
            onBet={onBet}
          />
        ))}
      </div>
    </div>
  );
}

function HeroCard({
  market,
  isLive,
  onBet,
}: {
  market: Market;
  isLive: boolean;
  onBet: (market: Market, side: 'yes' | 'no') => void;
}) {
  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;
  const match = market.matches;
  const homeTeam = match?.home_team ?? '';
  const awayTeam = match?.away_team ?? '';
  const homeMeta = TEAM_META[homeTeam];
  const awayMeta = TEAM_META[awayTeam];
  const homeLogo = TEAM_LOGOS[homeTeam];
  const awayLogo = TEAM_LOGOS[awayTeam];
  const homeAbbr = homeMeta?.abbr ?? homeTeam.split(' ')[0];
  const awayAbbr = awayMeta?.abbr ?? awayTeam.split(' ')[0];

  const homeBg = homeMeta?.bg ?? '#374151';
  const awayBg = awayMeta?.bg ?? '#374151';

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: 320,
        height: 168,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}
    >
      {/* Gradient background: home team left → dark center → away team right */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, ${homeBg}ee 0%, #0f1117 42%, #0f1117 58%, ${awayBg}ee 100%)`,
        }}
      />

      {/* Subtle noise overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '128px',
        }}
      />

      {/* Content layer */}
      <div className="relative z-10 h-full flex flex-col justify-between p-4">

        {/* Top row: match label + LIVE */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
            IPL 2026{match?.match_date ? ` · ${formatMatchDate(match.match_date)}` : ''}
          </span>
          {isLive && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-bold text-red-400 tracking-wider">LIVE</span>
            </div>
          )}
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between">
          {/* Home team */}
          <div className="flex flex-col items-center gap-1.5 w-[88px]">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: `${homeBg}44`, border: `1px solid ${homeBg}66` }}
            >
              {homeLogo ? (
                <img src={homeLogo} alt={homeAbbr} width={44} height={44} className="object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="font-black text-white text-sm">{homeAbbr}</span>
              )}
            </div>
            <span className="text-white font-bold text-[11px] text-center leading-tight">{homeAbbr}</span>
          </div>

          {/* Center: VS + probability */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-white font-black text-2xl leading-none" style={{ letterSpacing: '-0.04em' }}>
                {yesP}
              </span>
              <span className="text-white/40 text-sm font-medium">%</span>
            </div>
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${yesP}%`,
                  background: yesP >= 50 ? '#4ade80' : '#f87171',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <span className="text-white/30 text-[10px] font-medium">vs</span>
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-1.5 w-[88px]">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: `${awayBg}44`, border: `1px solid ${awayBg}66` }}
            >
              {awayLogo ? (
                <img src={awayLogo} alt={awayAbbr} width={44} height={44} className="object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="font-black text-white text-sm">{awayAbbr}</span>
              )}
            </div>
            <span className="text-white font-bold text-[11px] text-center leading-tight">{awayAbbr}</span>
          </div>
        </div>

        {/* Bottom row: volume + quick bet buttons */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/30 text-[10px]">
            {market.total_pool > 0 ? `${formatVol(market.total_pool)} traded` : 'Open for trading'}
          </span>
          <div className="flex gap-1.5">
            <button
              className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: '#16a34a22', color: '#4ade80', border: '1px solid #16a34a44' }}
              onClick={e => { e.preventDefault(); onBet(market, 'yes'); }}
              onMouseEnter={e => (e.currentTarget.style.background = '#16a34a44')}
              onMouseLeave={e => (e.currentTarget.style.background = '#16a34a22')}
            >
              YES {yesP}¢
            </button>
            <button
              className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: '#dc262622', color: '#f87171', border: '1px solid #dc262644' }}
              onClick={e => { e.preventDefault(); onBet(market, 'no'); }}
              onMouseEnter={e => (e.currentTarget.style.background = '#dc262644')}
              onMouseLeave={e => (e.currentTarget.style.background = '#dc262622')}
            >
              NO {noP}¢
            </button>
            <Link
              href={`/market/${market.id}`}
              className="px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
