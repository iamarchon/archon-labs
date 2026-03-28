import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getYesPrice } from '@/lib/amm';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function Portfolio() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const sb = createSupabaseServerClient();

  const [{ data: user }, { data: bets }] = await Promise.all([
    sb.from('users').select('coins, username').eq('id', userId).single(),
    sb.from('bets')
      .select('*, markets(title, status, outcome, yes_pool, no_pool, total_pool)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const open = (bets ?? []).filter((b: any) => b.markets?.status === 'open');
  const settled = (bets ?? []).filter((b: any) => b.markets?.status === 'resolved');
  const totalWon = settled.reduce((s: number, b: any) => s + (b.payout ?? 0), 0);
  const wins = settled.filter((b: any) => (b.payout ?? 0) > b.coins_wagered).length;
  const winRate = settled.length ? Math.round((wins / settled.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-8">Portfolio</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-gray-100 mb-12">
        {[
          { label: 'BALANCE', value: `$${(user?.coins ?? 0).toLocaleString()}` },
          { label: 'OPEN BETS', value: open.length },
          { label: 'TOTAL WON', value: totalWon.toLocaleString() },
          { label: 'WIN RATE', value: `${winRate}%` },
        ].map((s, i) => (
          <div key={i} className="p-6 border-r border-gray-100 last:border-r-0">
            <p className="text-3xl font-light">{s.value}</p>
            <p className="text-[9px] tracking-widest uppercase text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Open positions */}
      {open.length > 0 && (
        <div className="mb-10">
          <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">Open Positions</p>
          <div className="grid grid-cols-4 mb-2">
            {['MARKET', 'SIDE', 'WAGERED', 'CURRENT ODDS'].map(h => (
              <span key={h} className="text-[9px] tracking-widest uppercase text-gray-400">{h}</span>
            ))}
          </div>
          {open.map((b: any) => {
            const m = b.markets;
            const currentP = m ? Math.round((b.side === 'yes'
              ? getYesPrice(m.yes_pool, m.no_pool)
              : 1 - getYesPrice(m.yes_pool, m.no_pool)) * 100) : 0;
            return (
              <div key={b.id} className="grid grid-cols-4 py-3 border-b border-gray-100">
                <span className="text-xs truncate pr-4">{m?.title}</span>
                <span className={`text-xs font-medium ${b.side === 'yes' ? 'text-green-600' : 'text-red-500'}`}>
                  {b.side.toUpperCase()}
                </span>
                <span className="text-xs">${b.coins_wagered.toLocaleString()}</span>
                <span className="text-xs">{currentP}¢</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Settled bets */}
      {settled.length > 0 && (
        <div>
          <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">Settled</p>
          <div className="grid grid-cols-4 mb-2">
            {['MARKET', 'SIDE', 'WAGERED', 'PAYOUT'].map(h => (
              <span key={h} className="text-[9px] tracking-widest uppercase text-gray-400">{h}</span>
            ))}
          </div>
          {settled.map((b: any) => (
            <div key={b.id} className="grid grid-cols-4 py-3 border-b border-gray-100">
              <span className="text-xs truncate pr-4">{b.markets?.title}</span>
              <span className={`text-xs font-medium ${b.side === 'yes' ? 'text-green-600' : 'text-red-500'}`}>
                {b.side.toUpperCase()}
              </span>
              <span className="text-xs">${b.coins_wagered.toLocaleString()}</span>
              <span className={`text-xs font-medium ${(b.payout ?? 0) > b.coins_wagered ? 'text-green-600' : 'text-gray-400'}`}>
                ${(b.payout ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
