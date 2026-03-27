// worker/jobs/resolve-markets.ts
import { supabase } from '../lib/supabase';
import { fetchMatchResult } from '../lib/cricapi';

interface MatchMeta { superOver?: boolean }

export function determineOutcome(
  title: string,
  homeTeam: string,
  winner: string,
  meta: MatchMeta = {}
): 'yes' | 'no' | null {
  const t = title.toLowerCase();

  if (t.includes('super over')) {
    if (meta.superOver === undefined) return null;
    return meta.superOver ? 'yes' : 'no';
  }

  const winnerClean = winner.toLowerCase();
  const homeClean = homeTeam.toLowerCase();
  return winnerClean.includes(homeClean) || homeClean.includes(winnerClean) ? 'yes' : 'no';
}

export async function runResolveMarkets(): Promise<void> {
  const apiKey = process.env.CRICAPI_KEY!;
  const now = new Date();

  const { data: markets } = await supabase
    .from('markets')
    .select('*, matches(cricapi_match_id, home_team, away_team, winner, status)')
    .eq('status', 'open')
    .lt('resolves_at', now.toISOString());

  if (!markets || markets.length === 0) return;

  for (const market of markets) {
    const match = market.matches;
    if (!match) continue;

    let winner = match.winner;
    if (!winner) {
      winner = await fetchMatchResult(apiKey, match.cricapi_match_id);
      if (winner) {
        await supabase.from('matches').update({ winner, status: 'completed' }).eq('cricapi_match_id', match.cricapi_match_id);
      }
    }

    if (!winner) {
      await supabase.from('markets').update({ status: 'disputed' }).eq('id', market.id);
      console.log(`[resolve] Disputed: ${market.title}`);
      continue;
    }

    const outcome = determineOutcome(market.title, match.home_team, winner);
    if (!outcome) {
      await supabase.from('markets').update({ status: 'disputed' }).eq('id', market.id);
      continue;
    }

    const { error } = await supabase.rpc('resolve_market', {
      p_market_id: market.id,
      p_outcome: outcome,
    });

    if (error) {
      console.error(`[resolve] Failed for ${market.title}:`, error.message);
    } else {
      console.log(`[resolve] Resolved ${market.title} → ${outcome}`);
    }
  }
}
