import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('last_bonus_at, coins')
    .eq('id', userId)
    .single();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lastBonus = user.last_bonus_at ? new Date(user.last_bonus_at) : null;
  const now = new Date();
  if (lastBonus && now.getTime() - lastBonus.getTime() < 24 * 60 * 60 * 1000) {
    const nextBonus = new Date(lastBonus.getTime() + 24 * 60 * 60 * 1000);
    return NextResponse.json({ error: 'Already claimed', nextBonus }, { status: 400 });
  }

  await supabase.from('users').update({ coins: user.coins + 100, last_bonus_at: now }).eq('id', userId);
  await supabase.from('coin_transactions').insert({ user_id: userId, amount: 100, type: 'bonus' });

  return NextResponse.json({ coins: user.coins + 100 });
}
