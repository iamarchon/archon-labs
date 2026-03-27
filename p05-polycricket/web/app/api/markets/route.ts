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
  return NextResponse.json(data);
}
