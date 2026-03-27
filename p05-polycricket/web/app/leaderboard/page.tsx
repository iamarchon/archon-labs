import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function Leaderboard() {
  const sb = createSupabaseServerClient();
  const { data: users } = await sb
    .from('users')
    .select('id, username, coins')
    .order('coins', { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-8">Leaderboard</p>

      <div className="grid grid-cols-3 mb-3">
        {['RANK', 'PLAYER', 'COINS'].map(h => (
          <span key={h} className="text-[9px] tracking-widest uppercase text-gray-400">{h}</span>
        ))}
      </div>

      {(users ?? []).map((u: any, i: number) => (
        <div key={u.id} className="grid grid-cols-3 py-4 border-b border-gray-100 items-center">
          <span className={`text-2xl font-light ${i < 3 ? 'text-black' : 'text-gray-300'}`}>
            {i + 1}
          </span>
          <span className="text-sm">{u.username}</span>
          <span className="text-sm font-medium">{u.coins.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
