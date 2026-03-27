'use client';
import { getYesPrice, getNoPrice } from '@/lib/amm';

interface Market {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  matches: { home_team: string; away_team: string; match_date: string } | null;
}

export default function MarketRow({
  market,
  onBet,
}: {
  market: Market;
  onBet: (market: Market, side: 'yes' | 'no') => void;
}) {
  const yesP = Math.round(getYesPrice(market.yes_pool, market.no_pool) * 100);
  const noP = 100 - yesP;
  const match = market.matches;

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 px-2 -mx-2 cursor-pointer group">
      <div className="flex-1 min-w-0">
        {match && (
          <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-1">
            {match.home_team} vs {match.away_team} · {new Date(match.match_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </p>
        )}
        <p className="text-sm font-medium text-black truncate">{market.title}</p>
      </div>

      {/* YES/NO volume bar */}
      <div className="mx-6 w-32 hidden md:block">
        <div className="flex h-1.5 rounded-none overflow-hidden">
          <div className="bg-green-500" style={{ width: `${yesP}%` }} />
          <div className="bg-red-500" style={{ width: `${noP}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-green-600 font-medium">{yesP}%</span>
          <span className="text-[10px] text-red-500 font-medium">{noP}%</span>
        </div>
      </div>

      <div className="text-[10px] text-gray-400 tracking-wider w-24 text-right hidden lg:block">
        {market.total_pool.toLocaleString()} coins
      </div>

      {/* Buy buttons */}
      <div className="flex gap-2 ml-6">
        <button
          onClick={e => { e.stopPropagation(); onBet(market, 'yes'); }}
          className="text-[10px] tracking-widest uppercase bg-green-600 text-white px-3 py-1.5 hover:bg-green-700 transition-colors"
        >
          YES {yesP}¢
        </button>
        <button
          onClick={e => { e.stopPropagation(); onBet(market, 'no'); }}
          className="text-[10px] tracking-widest uppercase bg-red-500 text-white px-3 py-1.5 hover:bg-red-600 transition-colors"
        >
          NO {noP}¢
        </button>
      </div>
    </div>
  );
}
