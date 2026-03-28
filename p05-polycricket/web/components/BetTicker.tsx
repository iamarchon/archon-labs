'use client';
import { useEffect, useState } from 'react';

interface TickerItem {
  id: number;
  side: 'yes' | 'no';
  amount: number;
}

let _id = 0;

export function useBetTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  function push(side: 'yes' | 'no', amount: number) {
    const id = ++_id;
    setItems(prev => [...prev.slice(-4), { id, side, amount }]);
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== id));
    }, 3000);
  }

  return { items, push };
}

export default function BetTicker({ items }: { items: TickerItem[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse gap-2 pointer-events-none">
      {items.map(item => (
        <BetToast key={item.id} item={item} />
      ))}
    </div>
  );
}

function BetToast({ item }: { item: TickerItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const isYes = item.side === 'yes';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border text-sm font-semibold transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      } ${
        isYes
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-600'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isYes ? 'bg-green-500' : 'bg-red-500'}`} />
      <span>+${item.amount} {item.side.toUpperCase()}</span>
    </div>
  );
}
