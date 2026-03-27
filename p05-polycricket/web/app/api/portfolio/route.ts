import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const [{ data: user }, { data: bets }] = await Promise.all([
    supabase.from('users').select('coins').eq('id', userId).single(),
    supabase.from('bets')
      .select('*, markets(title, status, outcome, yes_pool, no_pool, total_pool)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const open = (bets ?? []).filter(b => b.markets?.status === 'open');
  const settled = (bets ?? []).filter(b => b.markets?.status === 'resolved');
  const totalWon = settled.reduce((s, b) => s + (b.payout ?? 0), 0);
  const wins = settled.filter(b => b.payout && b.payout > 0).length;
  const winRate = settled.length ? Math.round((wins / settled.length) * 100) : 0;

  return NextResponse.json({ coins: user?.coins ?? 0, open, settled, totalWon, winRate });
}
