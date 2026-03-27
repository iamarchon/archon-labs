import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',');
  if (!adminIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { market_id, outcome } = await req.json();
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc('resolve_market', {
    p_market_id: market_id,
    p_outcome: outcome,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
