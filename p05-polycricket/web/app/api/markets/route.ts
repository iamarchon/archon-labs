import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'open';
  const matchId = searchParams.get('match_id');

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from('markets')
    .select('*, matches(home_team, away_team, match_date, status)')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (matchId) query = query.eq('match_id', matchId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const markets = data ?? [];

  // Compute volume_24h: sum of coins_wagered per market in the last 24 hours
  const marketIds = markets.map((m: { id: string }) => m.id);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const volumeMap: Record<string, number> = {};
  if (marketIds.length > 0) {
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('market_id, coins_wagered')
      .in('market_id', marketIds)
      .gte('created_at', cutoff);

    if (!betsError && bets) {
      for (const bet of bets) {
        volumeMap[bet.market_id] = (volumeMap[bet.market_id] ?? 0) + (bet.coins_wagered ?? 0);
      }
    }
  }

  const result = markets.map((m: { id: string }) => ({
    ...m,
    volume_24h: volumeMap[m.id] ?? 0,
  }));

  return NextResponse.json(result);
}
