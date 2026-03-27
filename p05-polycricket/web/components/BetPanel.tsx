'use client';
import { useState } from 'react';
import { getYesPrice, getNoPrice, calculatePayout } from '@/lib/amm';

interface Market {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
}

export default function BetPanel({
  market,
  defaultSide,
  onClose,
  onSuccess,
}: {
  market: Market;
  defaultSide: 'yes' | 'no';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [side, setSide] = useState<'yes' | 'no'>(defaultSide);
  const [coins, setCoins] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const yesPrice = getYesPrice(market.yes_pool, market.no_pool);
  const noPrice = getNoPrice(market.yes_pool, market.no_pool);
  const sidePool = side === 'yes' ? market.yes_pool : market.no_pool;
  const coinsNum = parseInt(coins) || 0;
  const estimatedPayout = coinsNum > 0
    ? calculatePayout(coinsNum, sidePool + coinsNum, market.total_pool + coinsNum)
    : 0;

  async function handleBet() {
    setError('');
    if (!coinsNum || coinsNum < 1) { setError('Enter coins to bet'); return; }
    setLoading(true);
    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_id: market.id, side, coins: coinsNum }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Failed'); return; }
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6 border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <p className="text-[10px] tracking-widest uppercase text-gray-400">Place Bet</p>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xs">✕</button>
        </div>

        <p className="text-sm font-medium mb-4">{market.title}</p>

        {/* YES / NO toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSide('yes')}
            className={`flex-1 py-2 text-[10px] tracking-widest uppercase border transition-colors ${
              side === 'yes' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            YES {Math.round(yesPrice * 100)}¢
          </button>
          <button
            onClick={() => setSide('no')}
            className={`flex-1 py-2 text-[10px] tracking-widest uppercase border transition-colors ${
              side === 'no' ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            NO {Math.round(noPrice * 100)}¢
          </button>
        </div>

        {/* Quick add */}
        <div className="flex gap-2 mb-3">
          {[100, 500, 1000].map(v => (
            <button
              key={v}
              onClick={() => setCoins(String((parseInt(coins) || 0) + v))}
              className="flex-1 text-[10px] tracking-widest uppercase border border-gray-200 py-1.5 hover:border-black transition-colors"
            >
              +{v}
            </button>
          ))}
          <button
            onClick={() => setCoins('5000')}
            className="flex-1 text-[10px] tracking-widest uppercase border border-gray-200 py-1.5 hover:border-black transition-colors"
          >
            MAX
          </button>
        </div>

        {/* Input */}
        <input
          type="number"
          value={coins}
          onChange={e => setCoins(e.target.value)}
          placeholder="Coins to bet"
          className="w-full border border-gray-200 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-black"
        />

        {/* Payout preview */}
        {coinsNum > 0 && (
          <p className="text-[10px] text-gray-400 tracking-wide mb-4">
            If {side.toUpperCase()} wins → <span className="text-black font-medium">{estimatedPayout} coins</span>
          </p>
        )}

        {error && <p className="text-[10px] text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleBet}
          disabled={loading}
          className="w-full bg-black text-white text-[10px] tracking-widest uppercase py-3 hover:bg-gray-900 transition-colors disabled:opacity-50"
        >
          {loading ? 'PLACING...' : 'CONFIRM BET'}
        </button>
      </div>
    </div>
  );
}
