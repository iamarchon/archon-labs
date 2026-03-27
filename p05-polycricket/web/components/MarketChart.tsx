'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const TABS = ['1H', '6H', '1D', '1W', '1M', 'ALL'];

interface DataPoint { time: string; yes: number; no: number }

export default function MarketChart({ data }: { data: DataPoint[] }) {
  const [active, setActive] = useState('ALL');

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
        <LineChart data={data}>
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
