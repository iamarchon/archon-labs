'use client';

interface Bet {
  side: string;
  coins_wagered: number;
  price_at_bet: number;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActivityFeed({ bets }: { bets: Bet[] }) {
  const recent = [...bets].reverse().slice(0, 20);

  if (recent.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400 text-sm">No trades yet — be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {recent.map((b, i) => {
        const isYes = b.side === 'yes';
        const payout = Math.round(b.coins_wagered / b.price_at_bet);
        return (
          <div
            key={i}
            className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            {/* Side badge */}
            <span
              className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isYes
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {b.side.toUpperCase()}
            </span>

            {/* Amount + price */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-900">
                ${b.coins_wagered.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 ml-1.5">
                @ {Math.round(b.price_at_bet * 100)}¢
              </span>
            </div>

            {/* Potential payout */}
            <div className="text-right shrink-0">
              <span className="text-xs text-gray-400">→ </span>
              <span className={`text-xs font-semibold ${isYes ? 'text-green-600' : 'text-red-500'}`}>
                ${payout.toLocaleString()}
              </span>
            </div>

            {/* Time */}
            <span className="text-[11px] text-gray-300 shrink-0 w-14 text-right">
              {timeAgo(b.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
