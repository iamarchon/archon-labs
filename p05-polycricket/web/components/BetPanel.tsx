'use client';
import { useState } from 'react';
import { getYesPrice, getNoPrice, calculatePayout } from '@/lib/amm';

interface Market {
  id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  matches?: { home_team: string; away_team: string } | null;
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
  const payout = amountNum > 0
    ? calculatePayout(amountNum, sidePool + amountNum, market.total_pool + amountNum)
    : 0;

  const homeTeam = market.matches?.home_team ?? 'YES';
  const awayTeam = market.matches?.away_team ?? 'NO';
  const homeAbbr = homeTeam.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
  const awayAbbr = awayTeam.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

  function addAmount(n: number) {
    setAmount(String((parseInt(amount) || 0) + n));
  }

  async function handleTrade() {
    setError('');
    if (!amountNum || amountNum < 1) { setError('Enter an amount to trade'); return; }
    setLoading(true);
    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_id: market.id, side, coins: amountNum }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Trade failed'); return; }
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="w-full sm:w-[340px] bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-8 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="p-4">
          {/* Header — team icon + title */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-bold">🏏</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {homeAbbr} vs {awayAbbr}
              </p>
              <span
                className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: '#dcfce7', color: '#166534' }}
              >
                {homeAbbr}
              </span>
            </div>
          </div>

          {/* Buy / Sell tabs */}
          <div className="flex items-center border-b border-gray-100 mb-4">
            <button className="text-sm font-semibold text-gray-900 pb-2.5 mr-4 border-b-2 border-gray-900 -mb-px">
              Buy
            </button>
            <button className="text-sm text-gray-400 pb-2.5 mr-auto cursor-not-allowed">
              Sell
            </button>
            <span className="text-xs text-gray-500 flex items-center gap-1 pb-2">
              Market
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>

          {/* Outcome buttons — exact Polymarket style */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {/* YES / home team */}
            <button
              onClick={() => setSide('yes')}
              className="py-3 px-4 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: side === 'yes' ? '#166534' : '#F3F4F6',
                color: side === 'yes' ? '#fff' : '#374151',
              }}
            >
              {homeAbbr} {Math.round(yesPrice * 100)}¢
            </button>
            {/* NO / away team */}
            <button
              onClick={() => setSide('no')}
              className="py-3 px-4 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: side === 'no' ? '#166534' : '#F3F4F6',
                color: side === 'no' ? '#fff' : '#374151',
              }}
            >
              {awayAbbr} {Math.round(noPrice * 100)}¢
            </button>
          </div>

          {/* Amount row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Amount</span>
            <div className="flex items-center">
              {amountNum > 0 ? (
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="text-2xl font-semibold text-gray-900 text-right w-28 outline-none tabular-nums"
                  style={{ letterSpacing: '-0.03em' }}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setAmount('1')}
                  className="text-2xl font-semibold text-gray-300 tabular-nums"
                  style={{ letterSpacing: '-0.03em' }}
                >
                  $0
                </button>
              )}
              {amountNum > 0 && (
                <button
                  onClick={() => setAmount('')}
                  className="ml-2 text-gray-300 hover:text-gray-500"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="#E5E7EB"/>
                    <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Quick add pills — exactly like Polymarket */}
          <div className="flex gap-1.5 mb-4">
            {[1, 5, 10, 100].map(v => (
              <button
                key={v}
                onClick={() => addAmount(v)}
                className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                style={{ background: '#F3F4F6', color: '#374151' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
              >
                +${v}
              </button>
            ))}
            <button
              onClick={() => setAmount('1000')}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors"
              style={{ background: '#F3F4F6', color: '#374151' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
            >
              Max
            </button>
          </div>

          {/* Payout preview */}
          {amountNum > 0 && payout > 0 && (
            <div className="flex justify-between items-center text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg px-3 py-2">
              <span>Potential return</span>
              <span className="font-semibold text-gray-800">${payout} <span className="text-green-600">(+${payout - amountNum})</span></span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
          )}

          {/* Trade button — exact Polymarket blue */}
          <button
            onClick={handleTrade}
            disabled={loading || amountNum < 1}
            className="w-full text-sm font-semibold text-white rounded-lg py-3 transition-all"
            style={{
              background: amountNum >= 1 ? '#2563EB' : '#E5E7EB',
              color: amountNum >= 1 ? '#fff' : '#9CA3AF',
              cursor: amountNum >= 1 ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Placing trade...' : 'Trade'}
          </button>

          <p className="text-center text-[11px] text-gray-400 mt-3">
            By trading, you agree to our{' '}
            <span className="underline cursor-pointer">Terms of Use</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
