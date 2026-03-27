import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateOrderBook } from '@/lib/amm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const { data: market, error } = await supabase
    .from('markets')
    .select('*, matches(home_team, away_team, match_date)')
    .eq('id', id)
    .single();

  if (error || !market) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: recentBets } = await supabase
    .from('bets')
    .select('side, coins_wagered, price_at_bet, created_at')
    .eq('market_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const orderBook = generateOrderBook(market.yes_pool, market.no_pool);

  return NextResponse.json({ ...market, orderBook, recentBets: recentBets ?? [] });
}
