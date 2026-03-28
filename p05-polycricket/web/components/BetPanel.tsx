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
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const yesPrice = getYesPrice(market.yes_pool, market.no_pool);
  const noPrice = getNoPrice(market.yes_pool, market.no_pool);
  const sidePool = side === 'yes' ? market.yes_pool : market.no_pool;
  const amountNum = parseInt(amount) || 0;
  const estimatedPayout = amountNum > 0
    ? calculatePayout(amountNum, sidePool + amountNum, market.total_pool + amountNum)
    : 0;
  const profit = estimatedPayout - amountNum;

  function addAmount(n: number) {
    setAmount(String((parseInt(amount) || 0) + n));
  }

  async function handleTrade() {
    setError('');
    if (!amountNum || amountNum < 1) { setError('Enter an amount'); return; }
    setLoading(true);
    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_id: market.id, side, coins: amountNum }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Failed'); return; }
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="p-5">
          {/* Market title */}
          <p className="text-[11px] font-medium text-gray-500 mb-1 line-clamp-1">{market.title}</p>

          {/* Buy / Sell tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
            {(['buy', 'sell'] as const).map(tab => (
              <button
                key={tab}
                disabled={tab === 'sell'}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                  tab === 'buy'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {tab === 'sell' ? 'Sell (soon)' : 'Buy'}
              </button>
            ))}
          </div>

          {/* YES / NO outcome buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setSide('yes')}
              className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                side === 'yes'
                  ? 'bg-green-500 text-white ring-2 ring-green-500 ring-offset-2'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              <span className="block text-[10px] font-normal opacity-70 mb-0.5">YES</span>
              {Math.round(yesPrice * 100)}¢
            </button>
            <button
              onClick={() => setSide('no')}
              className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                side === 'no'
                  ? 'bg-red-500 text-white ring-2 ring-red-500 ring-offset-2'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <span className="block text-[10px] font-normal opacity-70 mb-0.5">NO</span>
              {Math.round(noPrice * 100)}¢
            </button>
          </div>

          {/* Amount input */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">Amount</span>
              {amountNum > 0 && (
                <span className="text-xs text-gray-400">
                  Win up to <span className="text-gray-800 font-semibold">${estimatedPayout}</span>
                  {profit > 0 && <span className="text-green-600 ml-1">(+${profit})</span>}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl pl-7 pr-3 py-3 text-lg font-semibold text-gray-900 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Quick add buttons */}
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {[1, 5, 10, 100].map(v => (
              <button
                key={v}
                onClick={() => addAmount(v)}
                className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors"
              >
                +${v}
              </button>
            ))}
            <button
              onClick={() => setAmount('1000')}
              className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors"
            >
              Max
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
          )}

          {/* Trade button */}
          <button
            onClick={handleTrade}
            disabled={loading || amountNum < 1}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
              amountNum >= 1
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Placing...' : amountNum >= 1 ? `Buy ${side.toUpperCase()} · $${amountNum}` : 'Trade'}
          </button>

          <p className="text-center text-[10px] text-gray-400 mt-3">
            Paper trading · No real money · Just for fun
          </p>
        </div>
      </div>
    </div>
  );
}
