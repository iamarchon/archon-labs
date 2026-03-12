import { useState, useEffect, useRef, useCallback } from "react";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";
const POLL_INTERVAL = 30000; // 30 seconds

export default function useLivePrices(tickers) {
  const [prices, setPrices] = useState({});
  const tickersRef = useRef(tickers);
  tickersRef.current = tickers;

  const fetchAll = useCallback(async () => {
    const current = tickersRef.current;
    if (!current.length) return;

    const results = {};
    await Promise.all(current.map(async (ticker) => {
      try {
        const res = await fetch(`${baseUrl}/api/quote/${encodeURIComponent(ticker)}`);
        const data = await res.json();
        if (data.c > 0) results[ticker] = data.c;
      } catch { /* ignore */ }
    }));

    if (Object.keys(results).length > 0) {
      setPrices(prev => ({ ...prev, ...results }));
    }
  }, []);

  useEffect(() => {
    fetchAll(); // Initial fetch
    const id = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  return prices;
}
