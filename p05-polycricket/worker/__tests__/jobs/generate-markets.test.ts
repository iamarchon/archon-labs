// worker/__tests__/jobs/generate-markets.test.ts
jest.mock('../../lib/supabase', () => ({ supabase: {} }));
jest.mock('../../lib/cricapi', () => ({ fetchUpcomingMatches: jest.fn() }));
jest.mock('../../lib/claude', () => ({ generateMarketTitles: jest.fn() }));

import { buildMarketsForMatch } from '../../jobs/generate-markets';

describe('buildMarketsForMatch', () => {
  it('creates one market per title', () => {
    const matchId = 'match-uuid-1';
    const titles = ['Will MI win?', 'Will there be a Super Over?'];
    const matchDate = new Date('2025-04-05T14:00:00Z');
    const markets = buildMarketsForMatch(matchId, titles, matchDate);

    expect(markets).toHaveLength(2);
    expect(markets[0].match_id).toBe(matchId);
    expect(markets[0].title).toBe('Will MI win?');
    expect(markets[0].yes_pool).toBe(500);
    expect(markets[0].no_pool).toBe(500);
    expect(markets[0].status).toBe('open');
  });

  it('sets resolves_at to 4 hours after match date', () => {
    const matchDate = new Date('2025-04-05T14:00:00Z');
    const markets = buildMarketsForMatch('id', ['Will MI win?'], matchDate);
    const expected = new Date(matchDate.getTime() + 4 * 60 * 60 * 1000);
    expect(new Date(markets[0].resolves_at).getTime()).toBe(expected.getTime());
  });
});
