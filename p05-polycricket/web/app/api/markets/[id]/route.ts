import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const { data: market, error } = await supabase
    .from('markets')
    .select('*, matches(home_team, away_team, match_date)')
    .eq('id', id)
    .single();

  if (error || !market) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: bets } = await supabase
    .from('bets')
    .select('side, coins_wagered, price_at_bet, created_at')
    .eq('market_id', id)
    .order('created_at', { ascending: true })
    .limit(500);

  return NextResponse.json({ ...market, bets: bets ?? [] });
}
