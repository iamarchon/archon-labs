import { OrderBookEntry } from '@/lib/amm';

export default function OrderBook({
  asks,
  bids,
}: {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
}) {
  return (
    <div>
      <div className="grid grid-cols-3 mb-2 px-1">
        {['PRICE', 'SHARES', 'TOTAL'].map(h => (
          <span key={h} className="text-[9px] tracking-widest uppercase text-gray-400">{h}</span>
        ))}
      </div>
      <p className="text-[9px] tracking-widest uppercase text-gray-400 mb-1">ASKS</p>
      {asks.map((a, i) => (
        <div key={i} className="grid grid-cols-3 py-0.5 px-1 relative">
          <div className="absolute inset-0 bg-red-50" style={{ width: `${a.price * 100}%` }} />
          <span className="relative text-[11px] text-red-500 font-medium">{Math.round(a.price * 100)}¢</span>
          <span className="relative text-[11px] text-gray-600">{a.shares.toLocaleString()}</span>
          <span className="relative text-[11px] text-gray-600">{a.total.toLocaleString()}</span>
        </div>
      ))}
      <div className="border-t border-gray-200 my-2" />
      <p className="text-[9px] tracking-widest uppercase text-gray-400 mb-1">BIDS</p>
      {bids.map((b, i) => (
        <div key={i} className="grid grid-cols-3 py-0.5 px-1 relative">
          <div className="absolute inset-0 bg-green-50" style={{ width: `${b.price * 100}%` }} />
          <span className="relative text-[11px] text-green-600 font-medium">{Math.round(b.price * 100)}¢</span>
          <span className="relative text-[11px] text-gray-600">{b.shares.toLocaleString()}</span>
          <span className="relative text-[11px] text-gray-600">{b.total.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
