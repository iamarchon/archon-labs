import { useState, useEffect, useRef, useCallback } from "react";

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY || "";

export default function useLivePrices(tickers) {
  const [prices, setPrices] = useState({});
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const timerRef = useRef(null);
  const batchRef = useRef({});
  const flushRef = useRef(null);

  const connect = useCallback(() => {
    if (!FINNHUB_KEY || !tickers.length) return;

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      tickers.forEach(t => {
        ws.send(JSON.stringify({ type: "subscribe", symbol: t }));
      });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== "trade" || !msg.data?.length) return;

      // Batch updates — collect trades, flush every 1s
      for (const trade of msg.data) {
        batchRef.current[trade.s] = trade.p;
      }

      if (!flushRef.current) {
        flushRef.current = setTimeout(() => {
          const batch = { ...batchRef.current };
          batchRef.current = {};
          flushRef.current = null;
          setPrices(prev => ({ ...prev, ...batch }));
        }, 1000);
      }
    };

    ws.onclose = () => {
      const delay = Math.min(3000 * Math.pow(2, retryRef.current), 30000);
      retryRef.current++;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [tickers]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(flushRef.current);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        tickers.forEach(t => {
          ws.send(JSON.stringify({ type: "unsubscribe", symbol: t }));
        });
        ws.close();
      }
    };
  }, [connect]);

  return prices;
}
