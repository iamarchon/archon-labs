'use client';
import { useEffect, useRef, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase-client';

interface TickerItem {
  id: string;
  side: 'yes' | 'no';
  amount: number;
  price: number;
  marketTitle?: string;
}

const SEED: TickerItem[] = [
  { id: 's0', side: 'yes', amount: 250,  price: 0.62, marketTitle: 'MI to win' },
  { id: 's1', side: 'no',  amount: 100,  price: 0.41, marketTitle: 'CSK to win' },
  { id: 's2', side: 'yes', amount: 500,  price: 0.58, marketTitle: 'RCB to win' },
  { id: 's3', side: 'no',  amount: 75,   price: 0.35, marketTitle: 'KKR to win' },
  { id: 's4', side: 'yes', amount: 1000, price: 0.71, marketTitle: 'SRH to win' },
  { id: 's5', side: 'no',  amount: 200,  price: 0.44, marketTitle: 'RR to win' },
];

export default function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(SEED);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createSupabaseClient();
    const channel = sb
      .channel('ticker-bets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, payload => {
        const b = payload.new as {
          side: string;
          coins_wagered: number;
          price_at_bet: number;
        };
        setItems(prev => [
          {
            id: String(Date.now() + Math.random()),
            side: b.side as 'yes' | 'no',
            amount: b.coins_wagered,
            price: b.price_at_bet,
          },
          ...prev,
        ].slice(0, 30));
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, []);

  // Duplicate for seamless loop
  const display = [...items, ...items];

  return (
    <div
      className="overflow-hidden"
      style={{ borderBottom: '1px solid #f3f4f6', background: '#fff' }}
    >
      <div
        ref={containerRef}
        className="flex items-center animate-ticker whitespace-nowrap py-2"
        style={{ gap: 0 }}
      >
        {display.map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-1.5 mr-8 shrink-0">
            {/* Colored side badge */}
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{
                background: item.side === 'yes' ? '#dcfce7' : '#fee2e2',
                color: item.side === 'yes' ? '#166534' : '#dc2626',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: item.side === 'yes' ? '#16a34a' : '#ef4444' }}
              />
              {item.side.toUpperCase()}
            </span>
            <span className="text-[11px] font-semibold text-gray-700">
              ${item.amount.toLocaleString()}
            </span>
            {item.marketTitle && (
              <span className="text-[11px] text-gray-400">
                on {item.marketTitle}
              </span>
            )}
            <span className="text-[10px] text-gray-300 mx-1">·</span>
            <span className="text-[10px] text-gray-400">
              {Math.round(item.price * 100)}¢
            </span>
            <span className="text-gray-200 text-[10px] mx-3">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
