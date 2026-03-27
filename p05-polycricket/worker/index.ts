// worker/index.ts
import cron from 'node-cron';
import { runGenerateMarkets } from './jobs/generate-markets';
import { runResolveMarkets } from './jobs/resolve-markets';
import { runUpdateLiveOdds } from './jobs/update-live-odds';

async function runAllJobs() {
  console.log(`[cron] Running jobs at ${new Date().toISOString()}`);
  await runGenerateMarkets().catch(e => console.error('[generate] Error:', e));
  await runResolveMarkets().catch(e => console.error('[resolve] Error:', e));
  await runUpdateLiveOdds().catch(e => console.error('[live-odds] Error:', e));
}

runAllJobs();

cron.schedule('*/5 * * * *', runAllJobs);

console.log('[worker] Started — running jobs every 5 minutes');
