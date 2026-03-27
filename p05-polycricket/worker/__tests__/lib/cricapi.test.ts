// worker/__tests__/lib/cricapi.test.ts
import { parseUpcomingMatches, parseMatchResult } from '../../lib/cricapi';

describe('parseUpcomingMatches', () => {
  it('extracts id, teams, and date from CricAPI response', () => {
    const raw = {
      data: [{
        id: 'abc123',
        name: 'Mumbai Indians vs Royal Challengers Bengaluru',
        dateTimeGMT: '2025-04-05T14:00:00',
        matchType: 't20',
        series_id: 'ipl-2025',
      }]
    };
    const matches = parseUpcomingMatches(raw);
    expect(matches).toHaveLength(1);
    expect(matches[0].cricapiMatchId).toBe('abc123');
    expect(matches[0].homeTeam).toBe('Mumbai Indians');
    expect(matches[0].awayTeam).toBe('Royal Challengers Bengaluru');
    expect(matches[0].matchDate).toBeInstanceOf(Date);
  });

  it('returns empty array for malformed data', () => {
    expect(parseUpcomingMatches({})).toEqual([]);
    expect(parseUpcomingMatches({ data: null })).toEqual([]);
  });
});

describe('parseMatchResult', () => {
  it('extracts winner from match result', () => {
    const raw = {
      data: {
        matchWinner: 'Mumbai Indians',
        status: 'Match over',
      }
    };
    expect(parseMatchResult(raw)).toBe('Mumbai Indians');
  });

  it('returns null if match not complete', () => {
    const raw = { data: { status: 'Match not started', matchWinner: '' } };
    expect(parseMatchResult(raw)).toBeNull();
  });
});
