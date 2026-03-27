import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { market_id, side, coins } = body;

  if (!market_id || !side || !coins) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!['yes', 'no'].includes(side)) {
    return NextResponse.json({ error: 'Invalid side' }, { status: 400 });
  }
  if (typeof coins !== 'number' || coins < 1) {
    return NextResponse.json({ error: 'Invalid coins' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('place_bet', {
    p_market_id: market_id,
    p_side: side,
    p_coins: coins,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
