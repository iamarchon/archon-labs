import { useState, useCallback, useRef } from "react";
import { T } from "../tokens";
import Card from "./Card";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

export default function InsightsTile({ holdings = [], cash = 10000, totalValue = 10000, totalTrades = 0, portfolioGain = 0, livePrices = {}, stocks = [] }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetched = useRef(false);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const holdingsData = holdings.map(h => {
        const livePrice = livePrices[h.ticker];
        const seedStock = stocks.find(x => x.ticker === h.ticker);
        const price = livePrice ?? seedStock?.price ?? Number(h.avg_cost);
        return {
          ticker: h.ticker,
          shares: Number(h.shares),
          avgCost: Number(h.avg_cost),
          currentPrice: price,
          value: price * Number(h.shares),
        };
      });

      const res = await fetch(`${baseUrl}/api/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: holdingsData,
          cash,
          totalValue,
          totalTrades,
          portfolioGain,
        }),
      });

      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
      } else {
        setError("Couldn't load insights right now. Try again later.");
      }
    } catch {
      setError("Couldn't load insights right now. Try again later.");
    }
    setLoading(false);
  }, [holdings, cash, totalValue, totalTrades, portfolioGain, livePrices, stocks]);

  // Auto-fetch once
  if (!fetched.current && (holdings.length > 0 || totalTrades > 0)) {
    fetched.current = true;
    fetchInsights();
  }

  if (holdings.length === 0 && totalTrades === 0) return null;

  return (
    <Card hover={false} style={{ padding: "28px 30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>
            ✨ Your Insights
          </div>
          <span style={{ fontSize: "10px", fontWeight: 500, color: T.inkFaint, background: T.bg, padding: "2px 8px", borderRadius: "4px", border: `1px solid ${T.line}` }}>
            Powered by AI
          </span>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          style={{ background: "none", border: "none", cursor: loading ? "default" : "pointer", color: T.accent, fontSize: "16px", padding: "4px 8px", borderRadius: "6px", transition: "background .15s" }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = `${T.accent}10`; }}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >↻</button>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: "16px", background: T.bg, borderRadius: "8px", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{ color: T.inkSub, fontSize: "14px", textAlign: "center", padding: "12px 0" }}>
          {error}
        </div>
      )}

      {insights && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {insights.map((tip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: T.amber, fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>⚡</span>
              <span style={{ color: T.inkSub, fontSize: "14px", lineHeight: "1.5" }}>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
