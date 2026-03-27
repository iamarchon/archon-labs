'use client';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase-client';

interface TickerEvent {
  id: string;
  text: string;
}

export default function LiveTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([
    { id: '0', text: 'anon bet 500 coins YES on MI vs RCB · 58¢' },
    { id: '1', text: 'anon bet 200 coins NO on CSK vs KKR · 42¢' },
    { id: '2', text: 'anon bet 1000 coins YES on RR vs SRH · 65¢' },
  ]);

  useEffect(() => {
    const sb = createSupabaseClient();
    const channel = sb.channel('bets-ticker')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, payload => {
        const b = payload.new as { side: string; coins_wagered: number; price_at_bet: number };
        const text = `anon bet ${b.coins_wagered} coins ${b.side.toUpperCase()} · ${Math.round(b.price_at_bet * 100)}¢`;
        setEvents(prev => [{ id: String(Date.now()), text }, ...prev].slice(0, 20));
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, []);

  return (
    <div className="border-b border-gray-100 overflow-hidden bg-white">
      <div className="flex animate-ticker whitespace-nowrap py-2 px-4">
        {[...events, ...events].map((e, i) => (
          <span key={`${e.id}-${i}`} className="text-[10px] text-gray-400 tracking-widest uppercase mr-12">
            {e.text}
          </span>
        ))}
      </div>
    </div>
  );
}
