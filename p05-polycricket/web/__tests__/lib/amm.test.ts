import { getYesPrice, getNoPrice, calculatePayout, generateOrderBook } from '@/lib/amm';

describe('getYesPrice', () => {
  it('returns 0.5 for equal pools', () => {
    expect(getYesPrice(500, 500)).toBe(0.5);
  });
  it('increases as yes pool grows', () => {
    expect(getYesPrice(700, 300)).toBeCloseTo(0.7);
  });
  it('decreases as yes pool shrinks', () => {
    expect(getYesPrice(300, 700)).toBeCloseTo(0.3);
  });
});

describe('getNoPrice', () => {
  it('is complement of yes price', () => {
    expect(getYesPrice(600, 400) + getNoPrice(600, 400)).toBeCloseTo(1);
  });
});

describe('calculatePayout', () => {
  it('gives proportional share of total pool', () => {
    // 100 coins in 500 yes pool, total 1000 → 200 payout
    expect(calculatePayout(100, 500, 1000)).toBe(200);
  });
  it('floors fractional results', () => {
    expect(calculatePayout(1, 3, 10)).toBe(3); // 3.33 → 3
  });
});

describe('generateOrderBook', () => {
  it('returns 5 asks and 5 bids', () => {
    const { asks, bids } = generateOrderBook(500, 500);
    expect(asks).toHaveLength(5);
    expect(bids).toHaveLength(5);
  });
  it('all asks are above current yes price', () => {
    const price = getYesPrice(500, 500);
    const { asks } = generateOrderBook(500, 500);
    asks.forEach(a => expect(a.price).toBeGreaterThan(price));
  });
  it('all bids are below current yes price', () => {
    const price = getYesPrice(500, 500);
    const { bids } = generateOrderBook(500, 500);
    bids.forEach(b => expect(b.price).toBeLessThan(price));
  });
  it('each entry has price, shares, total', () => {
    const { asks } = generateOrderBook(500, 500);
    expect(asks[0]).toHaveProperty('price');
    expect(asks[0]).toHaveProperty('shares');
    expect(asks[0]).toHaveProperty('total');
  });
});
