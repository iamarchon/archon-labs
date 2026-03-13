import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Lightbulb, Star, Users, Briefcase, Activity, Flame, Award } from "lucide-react";
import { T } from "../tokens";
import supabase from "../lib/supabase";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import Sparkline from "../components/Sparkline";
import ProgressBar from "../components/ProgressBar";
import InsightsTile from "../components/InsightsTile";
import LeaguesTile from "../components/LeaguesTile";
import RangeTabs from "../components/RangeTabs";
import { STOCK_CATEGORIES, CATEGORY_ICONS } from "../data/stockCategories";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

const PRANGE = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
];

const PerfTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: T.ink, color: T.white, padding: "8px 14px", borderRadius: "10px", fontSize: "13px", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>${(p.value ?? 0).toFixed(2)}</div>
      <div style={{ color: T.ghost, fontSize: "11px", marginTop: "2px" }}>{p.label}</div>
    </div>
  );
};

export default function Dashboard({ stocks, onTrade, onOpenDetail, holdings = [], cash = 10000, xp = 0, level = "Bronze", streak = 0, username = "trader", livePrices = {}, dbUser, saveSnapshot, totalTrades = 0, totalValue = 10000, portfolioGain = 0, onClaimXp, fireConfetti, watchlist = [], watchlistItems = [], toggleWatch }) {
  const navigate = useNavigate();

  const portfolioValue = holdings.reduce((sum, h) => {
    const shares = Number(h.shares);
    const livePrice = livePrices[h.ticker];
    const seedStock = stocks.find(x => x.ticker === h.ticker);
    const price = livePrice ?? seedStock?.price ?? Number(h.avg_cost);
    return sum + shares * price;
  }, 0);
  const total = portfolioValue + cash;
  const gain = total - 10000, gainPct = (gain / 10000) * 100;

  // Portfolio snapshots — fetched per range
  const [chartPoints, setChartPoints] = useState([]);
  const [perfRange, setPerfRange] = useState("1D");
  const [lastSessionValue, setLastSessionValue] = useState(null);
  const snapshotSaved = useRef(false);

  // Save snapshot ONCE then fetch "since last session" — sequential to avoid race
  useEffect(() => {
    if (!dbUser || total <= 0) return;
    let cancelled = false;
    (async () => {
      // Save snapshot once
      if (!snapshotSaved.current) {
        snapshotSaved.current = true;
        await saveSnapshot?.(total);
      }

      // Fetch yesterday's most recent snapshot (before today's date)
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: prev } = await supabase
          .from("portfolio_snapshots")
          .select("total_value")
          .eq("user_id", dbUser.id)
          .lt("created_at", todayStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (prev) {
          const lastVal = Number(prev.total_value);
          if (lastVal > 0 && !isNaN(lastVal)) {
            setLastSessionValue(lastVal);
          }
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [dbUser?.id, total, saveSnapshot]);

  // Fetch chart snapshots filtered by selected range — re-runs when range changes
  useEffect(() => {
    if (!dbUser) return;
    let cancelled = false;
    const r = PRANGE.find(x => x.label === perfRange);
    const startDate = new Date(Date.now() - r.days * 86400000).toISOString();

    (async () => {
      try {
        const { data } = await supabase
          .from("portfolio_snapshots")
          .select("total_value, created_at")
          .eq("user_id", dbUser.id)
          .gte("created_at", startDate)
          .order("created_at", { ascending: true });
        if (cancelled) return;

        const formatLabel = (dateStr) => {
          const d = new Date(dateStr);
          if (perfRange === "1D") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          if (perfRange === "1W") return d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        };

        // For 1D range, only show today's snapshots with yesterday's close as baseline
        let filtered = data || [];
        if (perfRange === "1D") {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          filtered = filtered.filter(s => new Date(s.created_at) >= todayStart);
        }

        const points = filtered.map(s => ({
          value: Number(s.total_value),
          label: formatLabel(s.created_at),
        }));

        // For 1D, prepend yesterday's close as the baseline
        if (perfRange === "1D" && lastSessionValue > 0) {
          points.unshift({ value: lastSessionValue, label: "Close" });
        }

        // Append current live value as the final point
        const lastVal = points.length > 0 ? points[points.length - 1].value : null;
        if (lastVal === null || Math.abs(total - lastVal) > 0.01) {
          points.push({ value: total, label: formatLabel(new Date().toISOString()) });
        }

        setChartPoints(points);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [dbUser?.id, perfRange, total, lastSessionValue]);

  // Global leaderboard preview
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbTab, setLbTab] = useState("global");
  const [dashLeagues, setDashLeagues] = useState([]);
  const [dashLeagueMembers, setDashLeagueMembers] = useState({});
  const [expandedDashLeague, setExpandedDashLeague] = useState(null);

  // Fetch global leaderboard
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leaderboard`);
        const data = await res.json();
        setLeaderboard((data.leaderboard || []).slice(0, 5));
      } catch { /* ignore */ }
    })();
  }, []);

  // Fetch user's leagues for dashboard leaderboard toggle
  useEffect(() => {
    if (!dbUser) return;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leagues/${dbUser.id}`);
        const data = await res.json();
        setDashLeagues(data.leagues || []);
      } catch { /* ignore */ }
    })();
  }, [dbUser]);

  // Challenges
  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  const fetchChallenges = useCallback(async () => {
    if (!dbUser?.id) {
      setChallengesLoading(false);
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/challenges?userId=${dbUser.id}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error("Failed to load challenges:", err);
    }
    setChallengesLoading(false);
  }, [dbUser?.id]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  const daysUntilMonday = () => {
    const now = new Date();
    const day = now.getDay();
    return day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  };

  // Top 3: skip claimed/completed, claimable first, then closest to 100%
  const topChallenges = [...challenges]
    .filter(c => !c.completedAt)
    .sort((a, b) => {
      const aClaimable = a.percent >= 100 ? 1 : 0;
      const bClaimable = b.percent >= 100 ? 1 : 0;
      if (aClaimable !== bClaimable) return bClaimable - aClaimable;
      return b.percent - a.percent;
    })
    .slice(0, 3);

  const claimChallenge = async (challengeId) => {
    setClaimingId(challengeId);
    try {
      const res = await fetch(`${baseUrl}/api/challenges/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: dbUser.id, challengeId }),
      });
      const data = await res.json();
      if (data.success) {
        if (onClaimXp) onClaimXp(data.xpAwarded);
        if (fireConfetti) fireConfetti("trade");
        await fetchChallenges();
      }
    } catch { /* ignore */ }
    setClaimingId(null);
  };

  // Market Movers — own independent range
  const [movers, setMovers] = useState([]);
  const [moversLoading, setMoversLoading] = useState(true);
  const [moversRange, setMoversRange] = useState("1D");

  useEffect(() => {
    setMoversLoading(true);
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/movers?range=${moversRange}`);
        const data = await res.json();
        setMovers(data.movers || []);
      } catch { /* ignore */ }
      setMoversLoading(false);
    })();
  }, [moversRange]);

  const MOVERS_LABELS = { "1D": "Today", "1W": "Past week", "1M": "Past month", "3M": "Past 3 months", "1Y": "Past year" };
  const moversRangeLabel = MOVERS_LABELS[moversRange] || "Today";

  // Watchlist range + price history + live quotes + collapsed state
  const [wlRange, setWlRange] = useState("1D");
  const [wlPriceHistory, setWlPriceHistory] = useState({});
  const [wlQuotes, setWlQuotes] = useState({});
  const [wlCollapsed, setWlCollapsed] = useState({});

  // Fetch live quote for every watched symbol (price + daily % from Finnhub)
  useEffect(() => {
    if (watchlist.length === 0) return;
    (async () => {
      const results = {};
      await Promise.all(watchlist.map(async (symbol) => {
        try {
          const res = await fetch(`${baseUrl}/api/quote/${encodeURIComponent(symbol)}`);
          const data = await res.json();
          if (data.c && data.c > 0) {
            results[symbol] = { price: data.c, changePct: data.dp ?? 0 };
          }
        } catch { /* ignore */ }
      }));
      setWlQuotes(results);
    })();
  }, [watchlist]);

  // Fetch candle-based % change for selected range
  useEffect(() => {
    if (watchlist.length === 0) return;
    (async () => {
      const results = {};
      await Promise.all(watchlist.map(async (symbol) => {
        try {
          const res = await fetch(`${baseUrl}/api/candles?symbol=${encodeURIComponent(symbol)}&range=${wlRange}`);
          const data = await res.json();
          if (data.s === "ok" && data.c?.length >= 2) {
            const first = data.c[0];
            const last = data.c[data.c.length - 1];
            results[symbol] = { changePct: ((last - first) / first) * 100 };
          }
        } catch { /* ignore */ }
      }));
      setWlPriceHistory(results);
    })();
  }, [watchlist, wlRange]);

  // Holdings % change for the selected hero chart range (perfRange)
  const [holdingsPerfChange, setHoldingsPerfChange] = useState({});

  useEffect(() => {
    if (holdings.length === 0) return;
    const tickers = holdings.filter(h => Number(h.shares) > 0).map(h => h.ticker);
    if (tickers.length === 0) return;
    setHoldingsPerfChange({});
    (async () => {
      const results = {};
      if (perfRange === "1D") {
        // Use Finnhub quote API for 1D daily percent change
        await Promise.all(tickers.map(async (ticker) => {
          try {
            const res = await fetch(`${baseUrl}/api/quote/${encodeURIComponent(ticker)}`);
            const data = await res.json();
            if (data.c && data.c > 0) {
              results[ticker] = data.dp ?? 0;
            }
          } catch { /* ignore */ }
        }));
      } else {
        // Use candle API for longer ranges
        await Promise.all(tickers.map(async (ticker) => {
          try {
            const res = await fetch(`${baseUrl}/api/candles?symbol=${encodeURIComponent(ticker)}&range=${perfRange}`);
            const data = await res.json();
            if (data.s === "ok" && data.c?.length >= 2) {
              const first = data.c[0];
              const last = data.c[data.c.length - 1];
              results[ticker] = ((last - first) / first) * 100;
            }
          } catch { /* ignore */ }
        }));
      }
      setHoldingsPerfChange(results);
    })();
  }, [holdings, perfRange]);

  // Holdings time range + price history
  const [holdingsRange, setHoldingsRange] = useState("1D");
  const [holdingsPriceHistory, setHoldingsPriceHistory] = useState({});

  useEffect(() => {
    if (holdings.length === 0) return;
    const tickers = holdings.map(h => h.ticker);
    (async () => {
      const results = {};
      await Promise.all(tickers.map(async (ticker) => {
        try {
          const res = await fetch(`${baseUrl}/api/candles?symbol=${encodeURIComponent(ticker)}&range=${holdingsRange}`);
          const data = await res.json();
          if (data.s === "ok" && data.c?.length >= 2) {
            const first = data.c[0];
            const last = data.c[data.c.length - 1];
            results[ticker] = { changePct: ((last - first) / first) * 100 };
          }
        } catch { /* ignore */ }
      }));
      setHoldingsPriceHistory(results);
    })();
  }, [holdings, holdingsRange]);

  const toggleDashLeague = async (leagueId) => {
    if (expandedDashLeague === leagueId) { setExpandedDashLeague(null); return; }
    setExpandedDashLeague(leagueId);
    if (!dashLeagueMembers[leagueId]) {
      try {
        const res = await fetch(`${baseUrl}/api/leagues/members/${leagueId}`);
        const data = await res.json();
        setDashLeagueMembers(prev => ({ ...prev, [leagueId]: data.members || [] }));
      } catch { /* ignore */ }
    }
  };

  // Derive chart color + range P&L from fetched chartPoints
  const RANGE_LABELS = { "1D": "today", "1W": "this week", "1M": "this month", "3M": "3 months", "1Y": "this year" };
  const rangeLabel = RANGE_LABELS[perfRange] || "this year";
  const hasRangeData = chartPoints.length >= 2;
  const rangeBaseline = hasRangeData ? chartPoints[0].value : 10000;
  const rangeLast = hasRangeData ? chartPoints[chartPoints.length - 1].value : total;
  const rangeGain = rangeLast - rangeBaseline;
  const rangeGainPct = rangeBaseline > 0 ? (rangeGain / rangeBaseline) * 100 : 0;
  const chartColor = useMemo(() => {
    if (!chartPoints || chartPoints.length < 2) return "#22c55e";
    const delta = chartPoints[chartPoints.length - 1].value - chartPoints[0].value;
    return delta >= 0 ? "#22c55e" : "#ef4444";
  }, [chartPoints]);
  const chartFill = chartColor === "#22c55e" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";

  // Compute sessionDelta from stored lastSessionValue (live, updates with total)
  const computedSessionDelta = lastSessionValue > 0 ? total - lastSessionValue : null;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 100px" }}>

      {/* Hero */}
      <Reveal>
        <Card hover={false} className="dash-hero" style={{ padding: "48px 52px", marginBottom: "16px", background: "linear-gradient(160deg,#ffffff 60%,#f0f7ff 100%)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
            <div>
              <div style={{ color: T.inkFaint, fontSize: "12px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "10px" }}>Portfolio Value</div>
              <div className="portfolio-value" style={{ fontSize: "56px", fontWeight: 700, letterSpacing: "-2.5px", color: T.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {hasRangeData && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                  <span style={{ color: rangeGain >= 0 ? T.green : T.red, fontSize: "17px", fontWeight: 600 }}>{rangeGain >= 0 ? "▲" : "▼"} {rangeGain >= 0 ? "+" : ""}{(rangeGainPct ?? 0).toFixed(2)}%</span>
                  <span style={{ color: T.inkFaint, fontSize: "15px" }}>{rangeGain >= 0 ? "+" : "−"}${Math.abs(rangeGain ?? 0).toFixed(2)} {rangeLabel}</span>
                </div>
              )}
              {(() => {
                const activeH = holdings.filter(h => Number(h.shares) > 0);
                if (activeH.length === 0) return null;
                const BEST_LABELS = { "1D": "today", "1W": "this week", "1M": "this month", "3M": "last 3 months", "1Y": "this year" };
                const periodLabel = BEST_LABELS[perfRange] || "today";
                let bestTicker = null, bestPct = -Infinity;
                for (const h of activeH) {
                  const dp = holdingsPerfChange[h.ticker];
                  if (dp === undefined) continue;
                  if (dp > bestPct) { bestPct = dp; bestTicker = h.ticker; }
                }
                if (bestTicker && bestPct > 0) {
                  return (
                    <div style={{ color: T.green, fontSize: "13px", fontWeight: 500, marginTop: "6px", animation: "fadeIn .4s ease" }}>
                      Best performer {periodLabel}: {bestTicker} +{bestPct.toFixed(2)}%
                    </div>
                  );
                }
                if (bestTicker !== null) {
                  return (
                    <div style={{ color: T.inkFaint, fontSize: "13px", fontWeight: 500, marginTop: "6px", animation: "fadeIn .4s ease" }}>
                      All holdings down {periodLabel} — stay patient
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Portfolio performance chart */}
          <div style={{ marginTop: "28px" }}>
            {chartPoints.length >= 2 ? (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartPoints} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <XAxis dataKey="label" hide />
                    <Tooltip content={<PerfTooltip />} cursor={{ stroke: T.ghost, strokeDasharray: "4 4" }} />
                    <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill={chartFill} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                  <RangeTabs selected={perfRange} onChange={setPerfRange} />
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: "32px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>
                  Not enough data yet for this period — check back soon 📈
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: "2px" }}>
                  <RangeTabs selected={perfRange} onChange={setPerfRange} />
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", marginTop: "24px", paddingTop: "28px", borderTop: `1px solid ${T.line}` }}>
            {[["Invested", `$${(portfolioValue ?? 0).toFixed(2)}`], ["Available Cash", `$${(cash ?? 0).toFixed(2)}`]].map((stat, i, arr) => (
              <div key={stat[0]} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ color: T.inkFaint, fontSize: "10.5px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "5px" }}>{stat[0]}</div>
                <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>{stat[1]}</div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* Row 2: Market Movers — full width, own range tabs */}
      <Reveal delay={0.04}>
        <Card style={{ padding: "28px 30px", marginBottom: "16px" }}>
          <div className="movers-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}><Activity size={16} strokeWidth={1.5} color={T.inkFaint} />Market Movers</div>
              <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 500, letterSpacing: "0.03em", marginTop: "2px" }}>{moversRangeLabel}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <RangeTabs selected={moversRange} onChange={setMoversRange} />
              <button onClick={() => navigate("/markets")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>All stocks</button>
            </div>
          </div>
          {moversLoading ? (
            <div className="movers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "10px" }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ padding: "16px", borderRadius: "14px", background: T.bg, border: `1px solid ${T.line}`, textAlign: "center", height: "110px" }}>
                  <div style={{ width: "36px", height: "14px", background: T.line, borderRadius: "4px", margin: "0 auto 12px" }} />
                  <div style={{ width: "64px", height: "24px", background: T.line, borderRadius: "4px", margin: "0 auto 10px" }} />
                  <div style={{ width: "48px", height: "12px", background: T.line, borderRadius: "3px", margin: "0 auto" }} />
                </div>
              ))}
            </div>
          ) : movers.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>Market data unavailable</div>
          ) : (
            <div className="movers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "10px" }}>
              {movers.map(m => {
                const stock = stocks.find(x => x.ticker === m.symbol);
                return (
                  <div key={m.symbol} onClick={() => stock && onTrade(stock)} style={{ padding: "16px", borderRadius: "14px", background: T.bg, border: `1px solid ${T.line}`, cursor: "pointer", transition: "all .18s ease", textAlign: "center" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.ghost; e.currentTarget.style.background = T.white; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.bg; }}>
                    <div style={{ color: T.ink, fontWeight: 700, fontSize: "14px", letterSpacing: "-0.2px", marginBottom: "8px" }}>{m.symbol}</div>
                    <Sparkline data={m.sparkline} width={64} height={24} />
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ color: T.ink, fontWeight: 600, fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>${(m.price ?? 0).toFixed(2)}</div>
                      <div style={{ color: (m.changePercent ?? 0) >= 0 ? T.green : T.red, fontSize: "12px", fontWeight: 500, marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>{(m.changePercent ?? 0) >= 0 ? "+" : ""}{(m.changePercent ?? 0).toFixed(2)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Reveal>

      {/* Row 3: Watchlist — grouped by category */}
      {watchlist.length > 0 && (
        <Reveal delay={0.06}>
          <Card style={{ padding: "28px 30px", marginBottom: "16px" }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}><Star size={16} strokeWidth={1.5} color={T.inkFaint} />Watchlist</div>
                <button onClick={() => navigate("/markets")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>Browse Markets</button>
              </div>
              <div style={{ marginTop: "10px" }}>
                <RangeTabs selected={wlRange} onChange={setWlRange} />
              </div>
            </div>
            {(() => {
              const enriched = watchlist.map(symbol => {
                const s = stocks.find(x => x.ticker === symbol);
                const q = wlQuotes[symbol];
                const price = livePrices[symbol] ?? q?.price ?? s?.price ?? null;
                const rangeData = wlPriceHistory[symbol];
                const changePct = rangeData ? rangeData.changePct : (q?.changePct ?? s?.changePct ?? 0);
                const name = s?.name ?? symbol;
                const category = STOCK_CATEGORIES[symbol] || "Other";
                return { symbol, price, changePct, name, category };
              });

              const grouped = {};
              for (const item of enriched) {
                if (!grouped[item.category]) grouped[item.category] = [];
                grouped[item.category].push(item);
              }
              for (const cat of Object.keys(grouped)) {
                grouped[cat].sort((a, b) => b.changePct - a.changePct);
              }

              const categories = Object.keys(grouped).sort();
              const singleCategory = categories.length <= 1;

              const renderRow = (item, showDivider) => (
                <div key={item.symbol}>
                  <div
                    onClick={() => navigate(`/stock/${item.symbol}`)}
                    style={{ display: "flex", alignItems: "center", padding: "14px 4px", cursor: "pointer", transition: "background .15s", borderRadius: "8px" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: T.ink, fontWeight: 700, fontSize: "14px", letterSpacing: "-0.2px" }}>{item.symbol}</div>
                      <div style={{ color: T.inkSub, fontSize: "12px", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: "110px" }}>
                      {item.price != null ? (
                        <>
                          <div style={{ color: T.ink, fontWeight: 700, fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>${(item.price ?? 0).toFixed(2)}</div>
                          <div style={{ color: (item.changePct ?? 0) >= 0 ? T.green : T.red, fontSize: "12px", fontWeight: 600, marginTop: "1px", fontVariantNumeric: "tabular-nums" }}>
                            {(item.changePct ?? 0) >= 0 ? "+" : ""}{(item.changePct ?? 0).toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        <div style={{ color: T.ghost, fontWeight: 600, fontSize: "14px" }}>--</div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); toggleWatch(item.symbol); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#e67e22", fontSize: "18px", padding: "4px 8px", marginLeft: "8px", flexShrink: 0 }}
                    >★</button>
                  </div>
                  {showDivider && <div style={{ height: "1px", background: T.line, margin: "0 4px" }} />}
                </div>
              );

              if (singleCategory) {
                const items = enriched.sort((a, b) => b.changePct - a.changePct);
                return <div>{items.map((item, i) => renderRow(item, i < items.length - 1))}</div>;
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {categories.map(cat => {
                    const items = grouped[cat];
                    const icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.Other;
                    const collapsed = wlCollapsed[cat] || false;
                    return (
                      <div key={cat}>
                        <div
                          onClick={() => setWlCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 4px", cursor: "pointer", userSelect: "none", borderRadius: "6px", transition: "background .15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = T.bg}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <span style={{ fontSize: "14px" }}>{icon}</span>
                          <span style={{ color: T.ink, fontSize: "13px", fontWeight: 700, letterSpacing: "-0.2px" }}>{cat}</span>
                          <span style={{ color: T.inkFaint, fontSize: "12px", fontWeight: 500 }}>({items.length})</span>
                          <span style={{ color: T.inkFaint, fontSize: "10px", marginLeft: "auto", transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform .2s" }}>▼</span>
                        </div>
                        {!collapsed && (
                          <div style={{ animation: "fadeIn .2s ease" }}>
                            {items.map((item, i) => renderRow(item, i < items.length - 1))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </Reveal>
      )}

      {/* Row 4: Your Holdings — full width list */}
      <Reveal delay={0.08}>
        <Card style={{ padding: "28px 30px", marginBottom: "16px" }}>
          {(() => {
            const activeHoldings = holdings.filter(h => Number(h.shares) > 0);
            return (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}><Briefcase size={16} strokeWidth={1.5} color={T.inkFaint} />Your Holdings</div>
            {activeHoldings.length > 0 && (
              <RangeTabs selected={holdingsRange} onChange={setHoldingsRange} />
            )}
          </div>
          {activeHoldings.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ marginBottom: "12px" }}><TrendingUp size={36} strokeWidth={1.5} color={T.inkFaint} /></div>
              <div style={{ color: T.ink, fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>Your portfolio is empty</div>
              <div style={{ color: T.inkSub, fontSize: "14px", marginBottom: "20px" }}>Make your first trade to start building!</div>
              <button onClick={() => navigate("/markets")} style={{
                background: T.accent, color: T.white, border: "none", borderRadius: "10px",
                padding: "10px 24px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                transition: "opacity .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >Go to Markets</button>
            </div>
          ) : (
            <div>
              {activeHoldings.map((h, i) => {
                const s = stocks.find(x => x.ticker === h.ticker);
                if (!s) return null;
                const shares = Number(h.shares), avgCost = Number(h.avg_cost);
                const currentPrice = s.price;
                const val = currentPrice * shares;
                const rangeData = holdingsPriceHistory[h.ticker];
                const pct = rangeData ? rangeData.changePct : ((currentPrice - avgCost) / avgCost) * 100;
                return (
                  <div key={h.ticker}>
                    <div
                      onClick={() => onOpenDetail?.(s) || navigate(`/stock/${s.ticker}`)}
                      style={{ display: "flex", alignItems: "center", padding: "14px 4px", cursor: "pointer", transition: "background .15s", borderRadius: "8px" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: T.ink, fontWeight: 700, fontSize: "14px", letterSpacing: "-0.2px" }}>{s.ticker}</div>
                        <div style={{ color: T.inkSub, fontSize: "12px", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: "120px" }}>
                        <div style={{ color: T.ink, fontSize: "13px", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{shares} shares</div>
                        <div style={{ color: T.inkFaint, fontSize: "11px", marginTop: "1px", fontVariantNumeric: "tabular-nums" }}>avg ${(avgCost ?? 0).toFixed(2)}</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: "110px" }}>
                        <div style={{ color: T.ink, fontWeight: 700, fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>${(currentPrice ?? 0).toFixed(2)}</div>
                        <div style={{ color: (pct ?? 0) >= 0 ? T.green : T.red, fontSize: "12px", fontWeight: 600, marginTop: "1px", fontVariantNumeric: "tabular-nums" }}>
                          {(pct ?? 0) >= 0 ? "+" : ""}{(pct ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    {i < activeHoldings.length - 1 && (
                      <div style={{ height: "1px", background: T.line, margin: "0 4px" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </>); })()}
        </Card>
      </Reveal>

      {/* Row 4: Your Progress + Your Insights — side by side */}
      <div className="dash-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "stretch", marginBottom: "16px" }}>
        <Reveal delay={0.1}>
          <Card style={{ padding: "28px 30px", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px", marginBottom: "22px" }}><TrendingUp size={16} strokeWidth={1.5} color={T.inkFaint} />Your Progress</div>
            {(() => {
              const LEVELS = [
                { name: "Rookie", color: "#92400e", threshold: 0 },
                { name: "Beginner", color: "#6b7280", threshold: 100 },
                { name: "Rising Star", color: "#3b82f6", threshold: 300 },
                { name: "Investor", color: "#f59e0b", threshold: 600 },
                { name: "Trader", color: "#8b5cf6", threshold: 1000 },
                { name: "Expert", color: "#059669", threshold: 1500 },
                { name: "Legend", color: "#f59e0b", threshold: 2000 },
              ];
              // Find current tier by XP (not by name) to avoid mismatch with useUserData levels
              let currentIdx = 0;
              for (let i = LEVELS.length - 1; i >= 0; i--) {
                if (xp >= LEVELS[i].threshold) { currentIdx = i; break; }
              }
              const nextLevel = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;
              const currentThreshold = LEVELS[currentIdx].threshold;
              const progressPct = nextLevel
                ? ((xp - currentThreshold) / (nextLevel.threshold - currentThreshold)) * 100
                : 100;
              const displayLevel = LEVELS[currentIdx].name;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: T.bg, borderRadius: "14px", padding: "16px" }}>
                    <div style={{ color: T.ink, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}>{xp.toLocaleString()}</div>
                    <div style={{ color: T.inkFaint, fontSize: "10px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "2px" }}>XP earned</div>
                    <div style={{ height: "5px", background: "rgba(0,0,0,.06)", borderRadius: "3px", overflow: "hidden", marginTop: "10px" }}>
                      <div style={{ height: "100%", width: `${Math.min(progressPct, 100)}%`, background: T.accent, borderRadius: "3px", transition: "width .4s ease" }} />
                    </div>
                    <div style={{ color: T.inkFaint, fontSize: "10px", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
                      {nextLevel ? `${xp} / ${nextLevel.threshold} to ${nextLevel.name}` : "Max level!"}
                    </div>
                  </div>
                  <div style={{ background: T.bg, borderRadius: "14px", padding: "16px" }}>
                    <Award size={24} strokeWidth={1.5} color={LEVELS[currentIdx]?.color || T.inkFaint} />
                    <div style={{ color: T.ink, fontSize: "18px", fontWeight: 700, letterSpacing: "-0.5px", marginTop: "4px" }}>{displayLevel}</div>
                    <div style={{ color: T.inkFaint, fontSize: "10px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "2px" }}>Current level</div>
                  </div>
                  <div style={{ background: T.bg, borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: T.ink, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}><Flame size={22} strokeWidth={1.5} color="#f97316" />{streak}</div>
                    <div style={{ color: T.inkFaint, fontSize: "10px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "2px" }}>Day streak</div>
                  </div>
                  <div style={{ background: T.bg, borderRadius: "14px", padding: "16px" }}>
                    <div style={{ color: T.ink, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}>{totalTrades.toLocaleString()}</div>
                    <div style={{ color: T.inkFaint, fontSize: "10px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "2px" }}>Total trades</div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </Reveal>

        <Reveal delay={0.12}>
          <InsightsTile
            holdings={holdings} cash={cash} totalValue={totalValue}
            totalTrades={totalTrades} portfolioGain={portfolioGain}
            livePrices={livePrices} stocks={stocks}
            watchlistItems={watchlistItems}
            cardStyle={{ height: "100%" }}
          />
        </Reveal>
      </div>

      {/* Row 5: My Leagues + Leaderboard — side by side */}
      <div className="dash-leagues-lb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "stretch", marginBottom: "16px" }}>
        <Reveal delay={0.14}>
          <LeaguesTile userId={dbUser?.id} cardStyle={{ height: "100%" }} />
        </Reveal>

        <Reveal delay={0.16}>
          <Card style={{ padding: "28px 30px", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "4px", background: T.bg, borderRadius: "8px", padding: "2px" }}>
                <button onClick={() => setLbTab("global")} style={{ background: lbTab === "global" ? T.white : "transparent", color: lbTab === "global" ? T.ink : T.inkFaint, border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", fontWeight: 600, cursor: "pointer", boxShadow: lbTab === "global" ? "0 1px 3px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>Global</button>
                <button onClick={() => setLbTab("leagues")} style={{ background: lbTab === "leagues" ? T.white : "transparent", color: lbTab === "leagues" ? T.ink : T.inkFaint, border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", fontWeight: 600, cursor: "pointer", boxShadow: lbTab === "leagues" ? "0 1px 3px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>Leagues</button>
              </div>
              <button onClick={() => navigate("/leaderboard")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>Full table</button>
            </div>

            {lbTab === "global" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {leaderboard.length === 0 ? (
                  <div style={{ color: T.inkFaint, fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No traders yet</div>
                ) : leaderboard.map((entry, i) => {
                  const rank = i + 1;
                  const isUser = entry.user_id === dbUser?.id;
                  return (
                    <div key={entry.user_id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "10px", background: isUser ? `${T.accent}08` : "transparent", border: isUser ? `1px solid ${T.accent}20` : "1px solid transparent" }}>
                      <div style={{ width: "22px", fontSize: "14px", textAlign: "center", color: [null, "#c9862a", "#8e8e93", "#7d4f2a"][rank] || T.inkFaint, fontWeight: 700 }}>
                        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                      </div>
                      <div style={{ flex: 1 }}><span style={{ color: isUser ? T.accent : T.ink, fontSize: "13px", fontWeight: isUser ? 700 : 500 }}>@{entry.username}</span></div>
                      <div style={{ color: (entry.gain_pct ?? 0) >= 0 ? T.green : T.red, fontSize: "13px", fontWeight: 600 }}>
                        {(entry.gain_pct ?? 0) >= 0 ? "+" : ""}{(entry.gain_pct ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {dashLeagues.length === 0 ? (
                  <div style={{ color: T.inkFaint, fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No leagues yet</div>
                ) : dashLeagues.map(league => (
                  <div key={league.id}>
                    <div onClick={() => toggleDashLeague(league.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div>
                        <span style={{ color: T.ink, fontSize: "13px", fontWeight: 600 }}>{league.name}</span>
                        <span style={{ color: T.inkFaint, fontSize: "11px", marginLeft: "8px" }}>{league.member_count}</span>
                      </div>
                      <span style={{ color: T.inkFaint, fontSize: "10px", transform: expandedDashLeague === league.id ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
                    </div>
                    {expandedDashLeague === league.id && dashLeagueMembers[league.id] && (
                      <div style={{ padding: "4px 10px 8px", animation: "fadeIn .2s ease" }}>
                        {dashLeagueMembers[league.id].map((m, i) => (
                          <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", borderRadius: "6px", background: m.user_id === dbUser?.id ? `${T.accent}08` : "transparent" }}>
                            <span style={{ width: "18px", fontSize: "11px", fontWeight: 700, color: i < 3 ? ["#c9862a", "#8e8e93", "#7d4f2a"][i] : T.inkFaint, textAlign: "center" }}>
                              {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                            </span>
                            <span style={{ flex: 1, color: m.user_id === dbUser?.id ? T.accent : T.ink, fontSize: "12px", fontWeight: m.user_id === dbUser?.id ? 600 : 400 }}>@{m.username}</span>
                            <span style={{ color: (m.gain_pct ?? 0) >= 0 ? T.green : T.red, fontSize: "12px", fontWeight: 600 }}>
                              {(m.gain_pct ?? 0) >= 0 ? "+" : ""}{(m.gain_pct ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Reveal>
      </div>

      {/* Row 6: Challenges — full width */}
      <Reveal delay={0.18}>
        <Card style={{ padding: "28px 30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
            <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>Challenges</div>
            <button onClick={() => navigate("/challenges")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "14px", fontWeight: 500 }}>View all {challenges.length} challenges &rarr;</button>
          </div>
          {challengesLoading ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>Loading challenges...</div>
          ) : topChallenges.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>No challenges available</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {topChallenges.map(ch => {
                const claimable = ch.percent >= 100 && !ch.completedAt;
                const done = !!ch.completedAt;
                const color = done ? T.green : claimable ? T.green : T.accent;
                return (
                  <div key={ch.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <div style={{ color: T.ink, fontSize: "14px", fontWeight: 600, letterSpacing: "-0.2px" }}>{ch.title}</div>
                        <div style={{ color: T.inkSub, fontSize: "12px", marginTop: "2px" }}>{ch.description}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                        {claimable ? (
                          <button onClick={() => claimChallenge(ch.id)} disabled={claimingId === ch.id}
                            style={{ background: T.green, color: T.white, border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em", opacity: claimingId === ch.id ? 0.6 : 1, transition: "opacity .15s" }}>
                            {claimingId === ch.id ? "Claiming..." : `Claim +${ch.xpReward} XP`}
                          </button>
                        ) : (
                          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", color, background: `${color}12`, padding: "3px 8px", borderRadius: "5px" }}>
                            {done ? "Completed" : `+${ch.xpReward} XP`}
                          </div>
                        )}
                        {ch.type === "weekly" && !done && (
                          <div style={{ color: T.inkFaint, fontSize: "11px", marginTop: "3px" }}>{daysUntilMonday()} days left</div>
                        )}
                      </div>
                    </div>
                    <ProgressBar value={Math.min(ch.percent, 100)} color={color} />
                    <div style={{ color: T.inkFaint, fontSize: "11px", marginTop: "4px", textAlign: "right" }}>
                      {ch.current} / {ch.target} · {Math.round(ch.percent)}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
