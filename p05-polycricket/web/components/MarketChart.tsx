'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useMemo } from 'react';

interface Bet {
  side: string;
  coins_wagered: number;
  price_at_bet: number;
  created_at: string;
}

const TABS = ['1H', '6H', '1D', '1W', '1M', 'ALL'];

const TAB_MS: Record<string, number> = {
  '1H': 60 * 60 * 1000,
  '6H': 6 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
};

export default function MarketChart({
  bets,
  currentYesP,
}: {
  bets: Bet[];
  currentYesP: number;
}) {
  const [active, setActive] = useState('ALL');

  const chartData = useMemo(() => {
    const cutoff = TAB_MS[active] ? Date.now() - TAB_MS[active] : 0;
    const filtered = bets.filter(b => new Date(b.created_at).getTime() >= cutoff);

    const points = filtered.map(b => ({
      time: new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      yes: Math.round(b.price_at_bet * 100),
      no: 100 - Math.round(b.price_at_bet * 100),
    }));

    if (points.length === 0) {
      return [{ time: 'NOW', yes: currentYesP, no: 100 - currentYesP }];
    }
    return points;
  }, [bets, active, currentYesP]);

  return (
    <div>
      <div className="flex gap-4 mb-4">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`text-[10px] tracking-widest uppercase transition-colors ${
              active === t ? 'text-black border-b border-black pb-0.5' : 'text-gray-400 hover:text-black'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#9ca3af' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} unit="%" />
          <Tooltip
            formatter={(v) => [`${v}%`]}
            contentStyle={{ border: '1px solid #e5e7eb', fontSize: 11, borderRadius: 0 }}
          />
          <Line type="monotone" dataKey="yes" stroke="#16a34a" dot={false} strokeWidth={1.5} name="YES" />
          <Line type="monotone" dataKey="no" stroke="#ef4444" dot={false} strokeWidth={1.5} name="NO" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
