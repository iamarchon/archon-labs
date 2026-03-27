// worker/__tests__/jobs/resolve-markets.test.ts
jest.mock('../../lib/supabase', () => ({ supabase: {} }));
jest.mock('../../lib/cricapi', () => ({ fetchMatchResult: jest.fn() }));

import { determineOutcome } from '../../jobs/resolve-markets';

describe('determineOutcome', () => {
  it('returns yes when winner matches home team', () => {
    expect(determineOutcome('Will MI win?', 'Mumbai Indians', 'Mumbai Indians')).toBe('yes');
  });

  it('returns no when winner does not match home team', () => {
    expect(determineOutcome('Will MI win?', 'Mumbai Indians', 'Chennai Super Kings')).toBe('no');
  });

  it('returns no for super over question when no super over', () => {
    expect(determineOutcome('Will there be a Super Over?', 'MI', 'CSK', { superOver: false })).toBe('no');
  });

  it('returns yes for super over question when super over happened', () => {
    expect(determineOutcome('Will there be a Super Over?', 'MI', 'CSK', { superOver: true })).toBe('yes');
  });
});
