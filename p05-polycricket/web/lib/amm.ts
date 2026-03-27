export interface OrderBookEntry {
  price: number;
  shares: number;
  total: number;
}

export function getYesPrice(yesPool: number, noPool: number): number {
  return yesPool / (yesPool + noPool);
}

export function getNoPrice(yesPool: number, noPool: number): number {
  return noPool / (yesPool + noPool);
}

export function calculatePayout(
  coinsWagered: number,
  sidePool: number,
  totalPool: number
): number {
  return Math.floor((coinsWagered / sidePool) * totalPool);
}

export function generateOrderBook(
  yesPool: number,
  noPool: number
): { asks: OrderBookEntry[]; bids: OrderBookEntry[] } {
  const currentPrice = getYesPrice(yesPool, noPool);
  const asks: OrderBookEntry[] = [];
  const bids: OrderBookEntry[] = [];

  for (let i = 1; i <= 5; i++) {
    const price = parseFloat(Math.min(0.99, currentPrice + i * 0.02).toFixed(2));
    const shares = Math.max(1, Math.floor((noPool * 0.1) / i));
    asks.push({ price, shares, total: Math.floor(price * shares) });
  }

  for (let i = 1; i <= 5; i++) {
    const price = parseFloat(Math.max(0.01, currentPrice - i * 0.02).toFixed(2));
    const shares = Math.max(1, Math.floor((yesPool * 0.1) / i));
    bids.push({ price, shares, total: Math.floor(price * shares) });
  }

  return {
    asks: asks.sort((a, b) => b.price - a.price),
    bids: bids.sort((a, b) => b.price - a.price),
  };
}
