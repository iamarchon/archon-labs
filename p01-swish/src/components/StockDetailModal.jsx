import { useState, useEffect } from "react";
import { T } from "../tokens";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

export default function StockDetailModal({ stock, onClose, onTrade, holdings = [], livePrices = {}, userId }) {
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [news, setNews] = useState(null);
  const [newsLoading, setNewsLoading] = useState(true);

  const ticker = stock?.ticker;
  const name = stock?.name ?? ticker;
  const livePrice = livePrices[ticker] ?? stock?.price ?? null;
  const holding = holdings.find(h => h.ticker === ticker);
  const shares = holding ? Number(holding.shares) : 0;
  const avgCost = holding ? Number(holding.avg_cost) : 0;
  const costBasis = shares * avgCost;
  const currentValue = shares * (livePrice ?? avgCost);
  const unrealizedPL = currentValue - costBasis;
  const unrealizedPct = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  // Escape key
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Fetch trade history
  useEffect(() => {
    if (!userId || !ticker) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/transactions?userId=${userId}&ticker=${encodeURIComponent(ticker)}`);
        const data = await res.json();
        if (!cancelled) setTransactions(data.transactions || []);
      } catch { /* ignore */ }
      if (!cancelled) setTxLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, ticker]);

  // Fetch news
  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/news/${encodeURIComponent(ticker)}?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (!cancelled) setNews(data);
      } catch { /* ignore */ }
      if (!cancelled) setNewsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ticker, name]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (!stock) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.22)", zIndex: 200,
      display: "flex", justifyContent: "flex-end",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      animation: "fadeIn .16s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.white, width: "520px", maxWidth: "100vw", height: "100vh",
        overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,.12)",
        animation: "slideInRight .28s cubic-bezier(.34,1.56,.64,1)",
        padding: "32px 28px 60px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer", color: T.accent,
              fontSize: "14px", fontWeight: 500, padding: 0, marginBottom: "16px",
            }}>← Close</button>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 700, letterSpacing: "-1px", color: T.ink }}>{ticker}</h2>
              {stock.sector && (
                <span style={{ fontSize: "11px", fontWeight: 500, color: T.inkFaint, background: T.bg, padding: "3px 8px", borderRadius: "5px", border: `1px solid ${T.line}` }}>{stock.sector}</span>
              )}
            </div>
            <div style={{ color: T.inkSub, fontSize: "14px", marginTop: "3px" }}>{name}</div>
          </div>
          <div style={{ textAlign: "right", paddingTop: "36px" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-1px", color: T.ink, fontVariantNumeric: "tabular-nums" }}>
              {livePrice != null ? `$${livePrice.toFixed(2)}` : "$..."}
            </div>
            {stock.changePct != null && (
              <div style={{ color: stock.changePct >= 0 ? T.green : T.red, fontSize: "14px", fontWeight: 600, marginTop: "2px" }}>
                {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
              </div>
            )}
          </div>
        </div>

        {/* Trade buttons */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
          <button
            onClick={() => onTrade({ ...stock, price: livePrice ?? stock.price, defaultAction: "BUY" })}
            style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "none", cursor: "pointer", background: T.accent, color: T.white, fontWeight: 600, fontSize: "14px", transition: "opacity .15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >Buy {ticker}</button>
          <button
            onClick={() => onTrade({ ...stock, price: livePrice ?? stock.price, defaultAction: "SELL" })}
            style={{ flex: 1, padding: "13px", borderRadius: "12px", border: `2px solid ${T.line}`, cursor: "pointer", background: T.white, color: T.ink, fontWeight: 600, fontSize: "14px", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.red; e.currentTarget.style.color = T.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.color = T.ink; }}
          >Sell {ticker}</button>
        </div>

        {/* Section 1: My Position */}
        {shares > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px", marginBottom: "16px" }}>My Position</div>
            <div style={{ background: T.bg, borderRadius: "14px", padding: "18px 20px" }}>
              {[
                ["Shares Held", shares],
                ["Avg Cost", `$${avgCost.toFixed(2)}`],
                ["Cost Basis", `$${costBasis.toFixed(2)}`],
                ["Current Value", `$${currentValue.toFixed(2)}`],
              ].map(([label, val], i, arr) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none",
                }}>
                  <span style={{ color: T.inkSub, fontSize: "14px" }}>{label}</span>
                  <span style={{ color: T.ink, fontWeight: 600, fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>{val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", borderTop: `1px solid ${T.line}`, marginTop: "2px" }}>
                <span style={{ color: T.inkSub, fontSize: "14px", fontWeight: 600 }}>Unrealized P&L</span>
                <span style={{ color: unrealizedPL >= 0 ? T.green : T.red, fontWeight: 700, fontSize: "15px", fontVariantNumeric: "tabular-nums" }}>
                  {unrealizedPL >= 0 ? "+" : ""}${unrealizedPL.toFixed(2)} ({unrealizedPct >= 0 ? "+" : ""}{unrealizedPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Trade History */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px", marginBottom: "16px" }}>Trade History</div>
          {txLoading ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>Loading trades...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>No trades yet for {ticker}</div>
          ) : (
            <div style={{ borderRadius: "14px", overflow: "hidden", border: `1px solid ${T.line}` }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr", padding: "10px 16px", background: T.bg }}>
                {["Date", "Action", "Shares", "Price", "Total"].map(h => (
                  <div key={h} style={{ color: T.inkFaint, fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</div>
                ))}
              </div>
              {/* Table rows */}
              {transactions.map((tx, i) => (
                <div key={tx.id ?? i} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr",
                  padding: "12px 16px", background: T.white,
                  borderTop: `1px solid ${T.line}`,
                }}>
                  <div style={{ color: T.inkSub, fontSize: "12px" }}>{formatDate(tx.created_at)}</div>
                  <div>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, letterSpacing: "0.03em",
                      color: tx.action === "BUY" ? T.green : T.red,
                      background: tx.action === "BUY" ? T.greenBg : T.redBg,
                      padding: "2px 8px", borderRadius: "4px",
                    }}>{tx.action}</span>
                  </div>
                  <div style={{ color: T.ink, fontSize: "13px", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{tx.shares}</div>
                  <div style={{ color: T.ink, fontSize: "13px", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>${Number(tx.price).toFixed(2)}</div>
                  <div style={{ color: T.ink, fontSize: "13px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${(Number(tx.shares) * Number(tx.price)).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Latest News */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>Latest News</div>
            <span style={{ fontSize: "10px", fontWeight: 500, color: T.inkFaint, background: T.bg, padding: "2px 8px", borderRadius: "4px", border: `1px solid ${T.line}` }}>AI</span>
          </div>

          {newsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div style={{ height: "14px", width: `${60 + i * 10}%`, background: T.bg, borderRadius: "4px", marginBottom: "6px" }} />
                  <div style={{ height: "10px", width: "35%", background: T.bg, borderRadius: "4px" }} />
                </div>
              ))}
            </div>
          ) : !news?.articles?.length ? (
            <div style={{ padding: "16px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>No recent news</div>
          ) : (
            <>
              {news.summary && (
                <div style={{ background: "#f0f7ff", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "13px", color: T.inkSub, lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600, color: T.accent }}>AI Summary: </span>{news.summary}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {news.articles.slice(0, 5).map((article, i) => (
                  <div key={i}>
                    <div style={{ padding: "10px 0" }}>
                      {article.url ? (
                        <a href={article.url} target="_blank" rel="noopener noreferrer"
                          style={{ color: T.ink, fontSize: "14px", fontWeight: 600, letterSpacing: "-0.2px", textDecoration: "none", lineHeight: 1.4 }}
                          onMouseEnter={e => e.currentTarget.style.color = T.accent}
                          onMouseLeave={e => e.currentTarget.style.color = T.ink}>
                          {article.headline}
                        </a>
                      ) : (
                        <div style={{ color: T.ink, fontSize: "14px", fontWeight: 600, letterSpacing: "-0.2px", lineHeight: 1.4 }}>{article.headline}</div>
                      )}
                      <div style={{ color: T.inkFaint, fontSize: "11px", marginTop: "3px" }}>
                        {[article.source, article.date].filter(Boolean).join(" · ")}
                      </div>
                      {article.summary && (
                        <div style={{ color: T.inkSub, fontSize: "13px", marginTop: "5px", lineHeight: 1.5 }}>{article.summary}</div>
                      )}
                    </div>
                    {i < Math.min(news.articles.length, 5) - 1 && <div style={{ height: "1px", background: T.line }} />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
