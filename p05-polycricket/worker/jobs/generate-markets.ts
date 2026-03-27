// worker/jobs/generate-markets.ts
import { supabase } from '../lib/supabase';
import { fetchUpcomingMatches } from '../lib/cricapi';
import { generateMarketTitles } from '../lib/claude';

export interface MarketInsert {
  match_id: string;
  title: string;
  yes_pool: number;
  no_pool: number;
  status: string;
  resolves_at: string;
}

export function buildMarketsForMatch(
  matchId: string,
  titles: string[],
  matchDate: Date
): MarketInsert[] {
  const resolvesAt = new Date(matchDate.getTime() + 4 * 60 * 60 * 1000);
  return titles.map(title => ({
    match_id: matchId,
    title,
    yes_pool: 500,
    no_pool: 500,
    status: 'open',
    resolves_at: resolvesAt.toISOString(),
  }));
}

export async function runGenerateMarkets(): Promise<void> {
  const apiKey = process.env.CRICAPI_KEY!;
  const upcoming = await fetchUpcomingMatches(apiKey);

  for (const match of upcoming) {
    const hoursUntil = (match.matchDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 0 || hoursUntil > 25) continue;

    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('cricapi_match_id', match.cricapiMatchId)
      .single();

    if (existing) continue;

    const { data: dbMatch } = await supabase
      .from('matches')
      .insert({
        cricapi_match_id: match.cricapiMatchId,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        match_date: match.matchDate.toISOString(),
        status: 'scheduled',
      })
      .select()
      .single();

    if (!dbMatch) continue;

    const titles = await generateMarketTitles(match.homeTeam, match.awayTeam, match.matchDate);
    const markets = buildMarketsForMatch(dbMatch.id, titles, match.matchDate);

    await supabase.from('markets').insert(markets);
    console.log(`[generate] Created ${markets.length} markets for ${match.homeTeam} vs ${match.awayTeam}`);
  }
}
