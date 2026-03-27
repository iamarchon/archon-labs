import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const user = await currentUser();
  const username = user?.username ?? user?.firstName ?? userId.slice(0, 8);

  const { data } = await supabase
    .from('users')
    .upsert({ id: userId, username }, { onConflict: 'id', ignoreDuplicates: true })
    .select()
    .single();

  await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount: 1000,
    type: 'signup',
  }).then(() => {});

  return NextResponse.json(data ?? { id: userId, username });
}
