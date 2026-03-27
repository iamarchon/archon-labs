// worker/jobs/update-live-odds.ts
import { supabase } from '../lib/supabase';

export async function runUpdateLiveOdds(): Promise<void> {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const fourHoursAhead = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: matches } = await supabase
    .from('matches')
    .select('id, cricapi_match_id, status')
    .gte('match_date', fourHoursAgo.toISOString())
    .lte('match_date', fourHoursAhead.toISOString())
    .neq('status', 'completed');

  if (!matches || matches.length === 0) return;

  for (const match of matches) {
    await supabase.from('matches').update({ status: 'live' }).eq('id', match.id);

    await supabase.channel(`match:${match.id}`).send({
      type: 'broadcast',
      event: 'live_update',
      payload: { match_id: match.id, timestamp: now.toISOString() },
    });

    console.log(`[live-odds] Updated match ${match.id}`);
  }
}
