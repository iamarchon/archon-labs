import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../tokens";
import Reveal from "../components/Reveal";
import Card from "../components/Card";

const RANGES = ["1D", "1W", "1M", "3M", "1Y"];
const RANGE_LABELS = { "1D": "Today", "1W": "Past week", "1M": "Past month", "3M": "Past 3 months", "1Y": "Past year" };

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

function formatTime(ts, range) {
  const d = new Date(ts * 1000);
  if (range === "1D") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (range === "1W") return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: T.ink, color: T.white, padding: "8px 14px", borderRadius: "10px", fontSize: "13px", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>${p.price.toFixed(2)}</div>
      <div style={{ color: T.ghost, fontSize: "11px", marginTop: "2px" }}>{p.time}</div>
    </div>
  );
};

export default function StockDetail({ stocks, livePrices = {}, onTrade, holdings, cash }) {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [range, setRange] = useState("1M");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);

  // Get stock info from seed data or create minimal
  const seedStock = stocks?.find(s => s.ticker === symbol);
  const livePrice = livePrices[symbol];
  const currentPrice = livePrice ?? seedStock?.price ?? quote?.c ?? null;
  const stockName = seedStock?.name ?? symbol;
  const sector = seedStock?.sector ?? null;

  // Poll quote every 30s for live price
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/quote/${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.c > 0) setQuote(data);
      } catch { /* ignore */ }
    };
    fetchQuote();
    const id = setInterval(fetchQuote, 30000);
    return () => clearInterval(id);
  }, [symbol]);

  // Raw OHLC data for stats
  const [rawOhlc, setRawOhlc] = useState(null);

  // Fetch candle data from Yahoo Finance via proxy
  const fetchCandles = useCallback(async (r) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/candles?symbol=${encodeURIComponent(symbol)}&range=${r}`
      );
      const data = await res.json();
      if (data.s === "ok" && data.c?.length) {
        setCandles(data.t.map((t, i) => ({
          timestamp: t,
          price: data.c[i],
          time: formatTime(t, r),
        })));
        setRawOhlc({ o: data.o, h: data.h, l: data.l, c: data.c });
      } else {
        setCandles([]);
        setRawOhlc(null);
      }
    } catch {
      setCandles([]);
      setRawOhlc(null);
    }
    setLoading(false);
  }, [symbol]);

  useEffect(() => { fetchCandles(range); }, [range, fetchCandles]);

  // Derive stats from candle OHLC data for the selected range
  const rangeStats = (() => {
    if (range === "1D" && quote) {
      return [
        ["OPEN", quote.o],
        ["HIGH", quote.h],
        ["LOW", quote.l],
        ["PREV CLOSE", quote.pc],
      ];
    }
    if (!rawOhlc || !rawOhlc.o.length) return null;
    const prefix = range === "1W" ? "7D" : range;
    return [
      [`${prefix} OPEN`, rawOhlc.o[0]],
      [`${prefix} HIGH`, Math.max(...rawOhlc.h)],
      [`${prefix} LOW`, Math.min(...rawOhlc.l)],
      ["START PRICE", rawOhlc.c[0]],
    ];
  })();

  // Compute change dynamically from candle data for selected range
  const firstPrice = candles.length >= 2 ? candles[0].price : null;
  const lastPrice = candles.length >= 2 ? candles[candles.length - 1].price : null;
  const changeAmt = firstPrice != null ? lastPrice - firstPrice : (quote?.d ?? 0);
  const changePct = firstPrice != null ? (changeAmt / firstPrice) * 100 : (quote?.dp ?? seedStock?.changePct ?? 0);
  const rangeLabel = RANGE_LABELS[range] || range;

  const chartColor = candles.length >= 2 && lastPrice >= firstPrice
    ? T.green : candles.length >= 2 ? T.red : T.accent;

  // News
  const [news, setNews] = useState(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  useEffect(() => {
    setNewsLoading(true);
    setNewsError(false);
    setNews(null);
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/news/${encodeURIComponent(symbol)}?name=${encodeURIComponent(stockName)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setNews(data);
      } catch {
        setNewsError(true);
      }
      setNewsLoading(false);
    })();
  }, [symbol, stockName]);

  const tickInterval = candles.length > 5 ? Math.floor(candles.length / 5) : 1;

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "14px", fontWeight: 500, marginBottom: "24px", padding: 0 }}>
          ← Back
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1 style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-1.2px", color: T.ink, margin: 0 }}>{symbol}</h1>
              {sector && (
                <span style={{ fontSize: "11px", fontWeight: 500, color: T.inkFaint, background: T.bg, padding: "3px 8px", borderRadius: "5px", border: `1px solid ${T.line}` }}>{sector}</span>
              )}
            </div>
            <div style={{ color: T.inkSub, fontSize: "15px", marginTop: "4px" }}>{stockName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-1.2px", color: T.ink, fontVariantNumeric: "tabular-nums" }}>
              {currentPrice != null ? `$${currentPrice.toFixed(2)}` : "$..."}
            </div>
            <div style={{ color: changePct >= 0 ? T.green : T.red, fontSize: "15px", fontWeight: 600, marginTop: "2px" }}>
              {changeAmt >= 0 ? "+" : ""}{changeAmt.toFixed(2)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
              <span style={{ color: T.inkFaint, fontWeight: 400, fontSize: "12px", marginLeft: "6px" }}>{rangeLabel}</span>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <Card hover={false} style={{ padding: "28px", marginBottom: "20px" }}>
          {loading ? (
            <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: T.inkFaint, fontSize: "14px" }}>Loading chart...</div>
          ) : candles.length < 2 ? (
            <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: T.inkSub, fontSize: "14px" }}>
              {range === "1D" ? "Market closed. Showing last session." : "No data available for this range."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={candles} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: T.inkFaint, fontSize: 11 }}
                  interval={tickInterval}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: T.ghost, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#chartFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          <div style={{ display: "flex", gap: "6px", marginTop: "16px", justifyContent: "center" }}>
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  background: range === r ? T.accent : T.bg,
                  color: range === r ? T.white : T.inkSub,
                  border: "none", borderRadius: "8px", padding: "7px 16px",
                  fontSize: "13px", fontWeight: range === r ? 600 : 400,
                  cursor: "pointer", transition: "all .18s ease",
                }}
              >{r}</button>
            ))}
          </div>
        </Card>
      </Reveal>

      {rangeStats && (
        <Reveal delay={0.1}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {rangeStats.map(([label, val]) => (
              <Card key={label} style={{ padding: "18px 20px" }}>
                <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
                <div style={{ color: T.ink, fontSize: "18px", fontWeight: 700, letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums" }}>
                  {val != null ? `$${val.toFixed(2)}` : "—"}
                </div>
              </Card>
            ))}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.14}>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => onTrade({ ticker: symbol, name: stockName, price: currentPrice, changePct, sector, defaultAction: "BUY" })}
            style={{ flex: 1, padding: "16px", borderRadius: "14px", border: "none", cursor: "pointer", background: T.accent, color: T.white, fontWeight: 600, fontSize: "16px", transition: "opacity .15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >Buy {symbol}</button>
          <button
            onClick={() => onTrade({ ticker: symbol, name: stockName, price: currentPrice, changePct, sector, defaultAction: "SELL" })}
            style={{ flex: 1, padding: "16px", borderRadius: "14px", border: `2px solid ${T.line}`, cursor: "pointer", background: T.white, color: T.ink, fontWeight: 600, fontSize: "16px", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.red; e.currentTarget.style.color = T.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.color = T.ink; }}
          >Sell {symbol}</button>
        </div>
      </Reveal>

      {/* Latest News */}
      <Reveal delay={0.18}>
        <Card hover={false} style={{ padding: "28px 30px", marginTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>
              Latest News &middot; {stockName}
            </div>
            <span style={{ fontSize: "10px", fontWeight: 500, color: T.inkFaint, background: T.bg, padding: "2px 8px", borderRadius: "4px", border: `1px solid ${T.line}` }}>Powered by AI</span>
          </div>

          {newsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ height: "14px", width: `${70 + i * 8}%`, background: T.bg, borderRadius: "4px", animation: "pulse 1.5s ease infinite" }} />
                  <div style={{ height: "10px", width: "40%", background: T.bg, borderRadius: "4px", animation: "pulse 1.5s ease infinite" }} />
                  <div style={{ height: "12px", width: "90%", background: T.bg, borderRadius: "4px", animation: "pulse 1.5s ease infinite" }} />
                  {i < 3 && <div style={{ height: "1px", background: T.line, marginTop: "8px" }} />}
                </div>
              ))}
            </div>
          ) : newsError ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>
              Couldn't load news right now
            </div>
          ) : (
            <>
              {news?.summary && (
                <div style={{ background: "#f0f7ff", borderRadius: "12px", padding: "16px 18px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "13px", color: T.inkSub, lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600, color: T.accent }}>AI Summary: </span>
                    {news.summary}
                  </div>
                </div>
              )}

              {(!news?.articles || news.articles.length === 0) ? (
                <div style={{ padding: "16px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>
                  No recent news found
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {news.articles.map((article, i) => (
                    <div key={i}>
                      <div style={{ padding: "12px 0" }}>
                        {article.url ? (
                          <a href={article.url} target="_blank" rel="noopener noreferrer"
                            style={{ color: T.ink, fontSize: "14px", fontWeight: 600, letterSpacing: "-0.2px", textDecoration: "none", lineHeight: 1.4 }}
                            onMouseEnter={e => e.currentTarget.style.color = T.accent}
                            onMouseLeave={e => e.currentTarget.style.color = T.ink}>
                            {article.headline}
                          </a>
                        ) : (
                          <div style={{ color: T.ink, fontSize: "14px", fontWeight: 600, letterSpacing: "-0.2px", lineHeight: 1.4 }}>
                            {article.headline}
                          </div>
                        )}
                        <div style={{ color: T.inkFaint, fontSize: "11px", marginTop: "4px" }}>
                          {[article.source, article.date].filter(Boolean).join(" · ")}
                        </div>
                        {article.summary && (
                          <div style={{ color: T.inkSub, fontSize: "13px", marginTop: "6px", lineHeight: 1.5 }}>
                            {article.summary}
                          </div>
                        )}
                      </div>
                      {i < news.articles.length - 1 && (
                        <div style={{ height: "1px", background: T.line }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
