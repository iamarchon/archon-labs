import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Lightbulb, Star, Users, Briefcase, Activity, Flame, Award } from "lucide-react";
import { T } from "../tokens";
import supabase from "../lib/supabase";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import InsightsTile from "../components/InsightsTile";
import LeaguesTile from "../components/LeaguesTile";
import RangeTabs from "../components/RangeTabs";
import { STOCK_CATEGORIES, CategoryIcon } from "../data/stockCategories";

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

// Custom dot: pulsing circle on the last data point only
const PulseDot = ({ cx, cy, index, dataLength, color, showPulse }) => {
  if (index !== dataLength - 1) return null;
  return (
    <g>
      {showPulse && (
        <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.4}
          style={{ animation: "chartPulse 1.5s ease infinite" }} />
      )}
      <circle cx={cx} cy={cy} r={3.5} fill={color} />
    </g>
  );
};

// Y-axis formatter: $8.5k style
const formatYAxis = (value) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
};

export default function Dashboard({ stocks, onTrade, onOpenDetail, holdings = [], cash = 10000, xp = 0, level = "Bronze", streak = 0, username = "trader", livePrices = {}, dbUser, saveSnapshot, totalTrades = 0, totalValue = 10000, portfolioGain = 0, quotesLoaded = false, allHeldPricesLoaded: allHeldPricesLoadedProp = false, onClaimXp, fireConfetti, watchlist = [], watchlistItems = [], toggleWatch, tourActive = false }) {
  const navigate = useNavigate();
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem("swish_onboarding_dismissed") === "true");

  // allHeldPricesLoaded now includes 8s timeout from App.jsx — safe for all uses
  const allHeldPricesLoaded = allHeldPricesLoadedProp;

  // Market hours check: Mon–Fri 9:30am–4:00pm US Eastern
  const isMarketOpen = useCallback(() => {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = et.getDay();
    if (day === 0 || day === 6) return false; // weekend
    const mins = et.getHours() * 60 + et.getMinutes();
    return mins >= 570 && mins < 960; // 9:30 (570) to 16:00 (960)
  }, []);

  // Live polling during market hours — 5s interval for held tickers
  const [liveQuotes, setLiveQuotes] = useState({});
  useEffect(() => {
    if (!allHeldPricesLoaded || holdings.length === 0) return;
    if (!isMarketOpen()) return;
    let cancelled = false;
    const heldTickers = holdings.filter(h => Number(h.shares) >= 0.001).map(h => h.ticker);
    if (heldTickers.length === 0) return;

    const poll = async () => {
      const results = {};
      await Promise.all(heldTickers.map(async (ticker) => {
        try {
          const res = await fetch(`${baseUrl}/api/quote/${encodeURIComponent(ticker)}`);
          const data = await res.json();
          if (data.c && data.c > 0) {
            results[ticker] = { price: data.c, dp: data.dp ?? 0, pc: data.pc ?? data.c };
          }
        } catch { /* ignore */ }
      }));
      if (!cancelled && Object.keys(results).length > 0) {
        setLiveQuotes(results);
      }
    };
    const id = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [allHeldPricesLoaded, holdings, isMarketOpen]);

  // Portfolio value: use live polled prices when available, else props
  const portfolioValue = allHeldPricesLoaded ? holdings.reduce((sum, h) => {
    const shares = Number(h.shares);
    const lq = liveQuotes[h.ticker];
    if (lq) return sum + shares * lq.price;
    const s = stocks.find(x => x.ticker === h.ticker);
    const price = s?.price ?? livePrices[h.ticker] ?? Number(h.avg_cost);
    return sum + shares * price;
  }, 0) : null;
  // Use prop totalValue when available (quote-backed), fall back to local calc after timeout
  const total = (Object.keys(liveQuotes).length > 0 && portfolioValue != null)
    ? portfolioValue + cash
    : totalValue ?? (allHeldPricesLoaded ? (portfolioValue ?? 0) + cash : null);
  const gain = total != null ? total - 10000 : null;
  const gainPct = gain != null ? (gain / 10000) * 100 : null;

  // Portfolio snapshots — fetched per range
  const [chartPoints, setChartPoints] = useState([]);
  const [perfRange, setPerfRange] = useState("1D");
  const [lastSessionValue, setLastSessionValue] = useState(null);
  const snapshotSaved = useRef(false);

  // Save snapshot ONCE then fetch "since last session" — sequential to avoid race
  // CRITICAL: only save after ALL held tickers have sim-feed prices
  useEffect(() => {
    if (!dbUser || !allHeldPricesLoaded || total == null || total <= 0) return;
    let cancelled = false;
    (async () => {
      // Save snapshot once (only after real quotes are loaded)
      if (!snapshotSaved.current) {
        snapshotSaved.current = true;
        await saveSnapshot?.(total);
      }

      // Fetch yesterday's snapshot using snapshot_date column
      try {
        const now = new Date();
        const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
        const twoDaysAgoDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const twoDaysAgoStr = `${twoDaysAgoDate.getUTCFullYear()}-${String(twoDaysAgoDate.getUTCMonth() + 1).padStart(2, "0")}-${String(twoDaysAgoDate.getUTCDate()).padStart(2, "0")}`;
        const { data: prev } = await supabase
          .from("portfolio_snapshots")
          .select("total_value")
          .eq("user_id", dbUser.id)
          .lt("snapshot_date", todayStr)
          .gte("snapshot_date", twoDaysAgoStr)
          .order("snapshot_date", { ascending: false })
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
  }, [dbUser?.id, total, saveSnapshot, allHeldPricesLoaded]);

  // Build chart from current holdings × historical candle prices
  // Wait until sim prices are confirmed to avoid chart using seed/avg_cost fallback
  // Key: candle fetch runs once per range change. "Now" point is appended only AFTER candles load.
  const candlesLoaded = useRef(false);
  useEffect(() => {
    // Reset on range change
    candlesLoaded.current = false;
  }, [perfRange]);

  // Candle fetch effect — runs when range changes or prices load. Does NOT depend on `total`.
  useEffect(() => {
    if (!allHeldPricesLoaded) return;
    const activeHoldings = holdings.filter(h => Number(h.shares) >= 0.001);
    if (activeHoldings.length === 0) {
      setChartPoints([{ value: cash, label: "Now" }]);
      candlesLoaded.current = true;
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        // Fetch candles for each held ticker
        const candleData = {};
        await Promise.all(activeHoldings.map(async (h) => {
          try {
            const res = await fetch(`${baseUrl}/api/candles?symbol=${encodeURIComponent(h.ticker)}&range=${perfRange}`);
            const data = await res.json();
            if (data.s === "ok" && data.t?.length >= 2) {
              candleData[h.ticker] = { t: data.t, c: data.c };
            }
          } catch { /* ignore */ }
        }));
        if (cancelled) return;

        const tickers = Object.keys(candleData);
        if (tickers.length === 0) {
          // No candle data — leave chart empty until "Now" effect below fills it
          candlesLoaded.current = true;
          return;
        }

        let refTicker = tickers[0];
        for (const tk of tickers) {
          if (candleData[tk].t.length > candleData[refTicker].t.length) refTicker = tk;
        }
        const refTimestamps = candleData[refTicker].t;

        const formatLabel = (ts) => {
          const d = new Date(ts * 1000);
          if (perfRange === "1D") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          if (perfRange === "1W") return d.toLocaleDateString("en-US", { weekday: "short" });
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        };

        const priceMaps = {};
        for (const tk of tickers) {
          const map = {};
          for (let i = 0; i < candleData[tk].t.length; i++) {
            map[candleData[tk].t[i]] = candleData[tk].c[i];
          }
          priceMaps[tk] = map;
        }

        const getPrice = (ticker, timestamp) => {
          if (priceMaps[ticker]?.[timestamp] !== undefined) return priceMaps[ticker][timestamp];
          const cd = candleData[ticker];
          if (!cd) return null;
          let best = null;
          for (let i = cd.t.length - 1; i >= 0; i--) {
            if (cd.t[i] <= timestamp) { best = cd.c[i]; break; }
          }
          return best;
        };

        const step = Math.max(1, Math.floor(refTimestamps.length / 40));
        const points = [];
        for (let i = 0; i < refTimestamps.length; i++) {
          if (i % step !== 0 && i !== refTimestamps.length - 1) continue;
          const ts = refTimestamps[i];
          let portfolioVal = cash;
          for (const h of activeHoldings) {
            const price = getPrice(h.ticker, ts);
            if (price !== null) {
              portfolioVal += Number(h.shares) * price;
            } else {
              const seedStock = stocks.find(x => x.ticker === h.ticker);
              portfolioVal += Number(h.shares) * (livePrices[h.ticker] ?? seedStock?.price ?? Number(h.avg_cost));
            }
          }
          points.push({ value: portfolioVal, label: formatLabel(ts) });
        }

        candlesLoaded.current = true;
        setChartPoints(points);
      } catch {
        candlesLoaded.current = true;
        // Don't set a single "Now" point on error — leave chart empty
      }
    })();
    return () => { cancelled = true; };
  }, [holdings, perfRange, cash, stocks, livePrices, allHeldPricesLoaded]);

  // Append live "Now" point AFTER candles have loaded — separate effect so it doesn't re-trigger candle fetch
  useEffect(() => {
    if (!candlesLoaded.current || total == null) return;
    setChartPoints(prev => {
      if (prev.length === 0) {
        // No candle data was available — show flat line
        return [{ value: total, label: "Start" }, { value: total, label: "Now" }];
      }
      // Remove any existing "Now" point, then append fresh one
      const withoutNow = prev.filter(p => p.label !== "Now");
      const lastPt = withoutNow[withoutNow.length - 1];
      if (lastPt && Math.abs(total - lastPt.value) < 0.01) return withoutNow;
      return [...withoutNow, { value: total, label: "Now" }];
    });
  }, [total]);

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

  // Market Movers — split into Stocks and Crypto tabs using isCrypto field
  const [moversTab, setMoversTab] = useState("Stocks");

  const stockMovers = useMemo(() => {
    return [...stocks]
      .filter(s => s.price > 0 && s.changePct !== undefined && !s.isCrypto)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 6);
  }, [stocks]);

  // Crypto movers: fetch from /api/crypto/top on mount (covers BTC, ETH, and all top coins)
  const [cryptoMoversData, setCryptoMoversData] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/crypto/top`);
        const data = await res.json();
        if (!cancelled && data.coins) {
          setCryptoMoversData(data.coins.map(c => ({
            ticker: c.symbol,
            name: c.name,
            price: c.price,
            changePct: c.changePct ?? 0,
            isCrypto: true,
          })));
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const cryptoMovers = useMemo(() => {
    return [...cryptoMoversData]
      .filter(s => s.price > 0 && s.changePct !== undefined)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 6);
  }, [cryptoMoversData]);

  const activeMovers = moversTab === "Stocks" ? stockMovers : cryptoMovers;

  // Watchlist range + price history + live quotes + collapsed state
  const [wlRange, setWlRange] = useState("1D");
  const [wlPriceHistory, setWlPriceHistory] = useState({});
  const [wlQuotes, setWlQuotes] = useState({});
  const [wlCollapsed, setWlCollapsed] = useState({});

  // Fetch live quote for every watched symbol — DELAYED until sim prices loaded to avoid rate-limit contention
  useEffect(() => {
    if (watchlist.length === 0 || !allHeldPricesLoaded) return;
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
  }, [watchlist, allHeldPricesLoaded]);

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
  // DELAYED until sim prices loaded to avoid rate-limit contention with App.jsx
  const [holdingsPerfChange, setHoldingsPerfChange] = useState({});

  useEffect(() => {
    if (holdings.length === 0 || !allHeldPricesLoaded) return;
    const tickers = holdings.filter(h => Number(h.shares) >= 0.001).map(h => h.ticker);
    if (tickers.length === 0) return;
    setHoldingsPerfChange({});
    (async () => {
      const results = {};
      if (perfRange === "1D") {
        // Use already-loaded dp from stocks array instead of a separate fetch
        for (const ticker of tickers) {
          const s = stocks.find(x => x.ticker === ticker);
          if (s?.dailyPct !== undefined) {
            results[ticker] = s.dailyPct;
          }
        }
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
  }, [holdings, perfRange, allHeldPricesLoaded, stocks]);

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
  // Compute daily P&L from real previous close prices: sum(shares × (currentPrice - prevClose))
  const dailyPL = useMemo(() => {
    if (!allHeldPricesLoaded || holdings.length === 0) return null;
    const quoteKeys = Object.keys(liveQuotes);
    if (quoteKeys.length === 0) return null;
    let sum = 0;
    for (const h of holdings) {
      const shares = Number(h.shares);
      if (shares < 0.001) continue;
      const lq = liveQuotes[h.ticker];
      if (lq && lq.pc > 0) {
        sum += shares * (lq.price - lq.pc);
      }
    }
    return sum;
  }, [holdings, liveQuotes, allHeldPricesLoaded]);

  const RANGE_LABELS = { "1D": "today", "1W": "this week", "1M": "this month", "3M": "3 months", "1Y": "this year" };
  const rangeLabel = RANGE_LABELS[perfRange] || "this year";
  const hasRangeData = chartPoints.length >= 2;
  const rangeBaseline = hasRangeData ? chartPoints[0].value : 10000;
  const rangeLast = hasRangeData ? chartPoints[chartPoints.length - 1].value : total;
  const rawRangeGain = rangeLast - rangeBaseline;
  // For 1D range, use real daily P&L from previous close prices when available
  const rangeGain = perfRange === "1D" && dailyPL != null ? dailyPL : rawRangeGain;
  const rangeGainPct = perfRange === "1D" && dailyPL != null && total > cash
    ? (dailyPL / (total - cash - dailyPL)) * 100
    : rangeBaseline > 0 ? (rawRangeGain / rangeBaseline) * 100 : 0;
  const chartColor = useMemo(() => {
    if (!chartPoints || chartPoints.length < 2) return "#22c55e";
    const delta = chartPoints[chartPoints.length - 1].value - chartPoints[0].value;
    return delta >= 0 ? "#22c55e" : "#ef4444";
  }, [chartPoints]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 100px" }}>

      {/* Onboarding banner for first-time users */}
      {totalTrades === 0 && !onboardingDismissed && !tourActive && (
        <Reveal>
          <Card hover={false} style={{ padding: "32px 36px", marginBottom: "16px", background: "linear-gradient(135deg, #0071e3, #0055b3)", position: "relative", overflow: "hidden" }}>
            <button
              onClick={() => { localStorage.setItem("swish_onboarding_dismissed", "true"); setOnboardingDismissed(true); }}
              style={{ position: "absolute", top: "12px", right: "16px", background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: "18px", cursor: "pointer", padding: "4px", lineHeight: 1 }}
            >&times;</button>
            <div style={{ color: T.white, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "8px" }}>Welcome to Swish! 👋</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "15px", marginBottom: "20px", lineHeight: 1.5 }}>Make your first trade to start building your portfolio</div>
            <button
              onClick={() => navigate("/markets")}
              style={{ background: T.white, color: "#0071e3", border: "none", borderRadius: "20px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "opacity .15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Browse stocks &rarr;</button>
          </Card>
        </Reveal>
      )}

      {/* Hero */}
      <Reveal>
        <Card hover={false} className="dash-hero" style={{ padding: "48px 52px", marginBottom: "16px", background: "linear-gradient(160deg,#ffffff 60%,#f0f7ff 100%)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
            <div>
              <div style={{ color: T.inkFaint, fontSize: "12px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "10px" }}>Portfolio Value</div>
              {allHeldPricesLoaded ? (
                <div className="portfolio-value" style={{ fontSize: "56px", fontWeight: 700, letterSpacing: "-2.5px", color: T.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  ${(total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              ) : (
                <div style={{ height: "56px", width: "280px", borderRadius: "12px", background: `linear-gradient(90deg, ${T.line} 25%, #f0f0f5 50%, ${T.line} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }} />
              )}
              {allHeldPricesLoaded && hasRangeData && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                  <span style={{ color: rangeGain >= 0 ? T.green : T.red, fontSize: "17px", fontWeight: 600 }}>{rangeGain >= 0 ? "▲" : "▼"} {rangeGain >= 0 ? "+" : ""}{(rangeGainPct ?? 0).toFixed(2)}%</span>
                  <span style={{ color: T.inkFaint, fontSize: "15px" }}>{rangeGain >= 0 ? "+" : "−"}${Math.abs(rangeGain ?? 0).toFixed(2)} {rangeLabel}</span>
                </div>
              )}
              {!allHeldPricesLoaded && (
                <div style={{ height: "20px", width: "180px", borderRadius: "8px", marginTop: "12px", background: `linear-gradient(90deg, ${T.line} 25%, #f0f0f5 50%, ${T.line} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }} />
              )}
              {(() => {
                const activeH = holdings.filter(h => Number(h.shares) >= 0.001);
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
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={chartPoints} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} interval="preserveStartEnd" minTickGap={40} />
                    <YAxis orientation="right" width={45} axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={formatYAxis} domain={["dataMin - 50", "dataMax + 50"]} />
                    <Tooltip content={<PerfTooltip />} cursor={{ stroke: T.ghost, strokeDasharray: "4 4" }} />
                    <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="transparent"
                      dot={(props) => <PulseDot {...props} dataLength={chartPoints.length} color={chartColor} showPulse={isMarketOpen()} />}
                      activeDot={{ r: 4, fill: chartColor, stroke: "#fff", strokeWidth: 2 }} />
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
            {[["Invested", allHeldPricesLoaded && portfolioValue != null ? `$${portfolioValue.toFixed(2)}` : null], ["Available Cash", `$${(cash ?? 0).toFixed(2)}`]].map((stat, i, arr) => (
              <div key={stat[0]} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ color: T.inkFaint, fontSize: "10.5px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "5px" }}>{stat[0]}</div>
                {stat[1] != null ? (
                  <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>{stat[1]}</div>
                ) : (
                  <div style={{ height: "20px", width: "100px", borderRadius: "8px", margin: "0 auto", background: `linear-gradient(90deg, ${T.line} 25%, #f0f0f5 50%, ${T.line} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }} />
                )}
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* Row 2: Market Movers — Stocks / Crypto tabs */}
      <Reveal delay={0.04}>
        <Card style={{ padding: "28px 30px", marginBottom: "16px" }}>
          <div className="movers-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}><Activity size={16} strokeWidth={1.5} color={T.inkFaint} />Market Movers</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                {["Stocks", "Crypto"].map(tab => (
                  <button key={tab} onClick={() => setMoversTab(tab)} style={{
                    padding: "5px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all .15s",
                    background: moversTab === tab ? T.ink : T.bg,
                    color: moversTab === tab ? T.white : T.inkSub,
                    border: moversTab === tab ? "none" : `1px solid ${T.line}`,
                  }}>{tab}</button>
                ))}
              </div>
            </div>
            <button onClick={() => navigate("/markets")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>All stocks</button>
          </div>
          {activeMovers.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>Market data unavailable</div>
          ) : (
            <div className="movers-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(activeMovers.length, 5)},1fr)`, gap: "10px" }}>
              {activeMovers.map(m => {
                return (
                  <div key={m.ticker} onClick={() => navigate(`/stock/${m.ticker}`)} style={{ padding: "16px", borderRadius: "14px", background: T.bg, border: `1px solid ${T.line}`, cursor: "pointer", transition: "all .18s ease", textAlign: "center" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.ghost; e.currentTarget.style.background = T.white; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.bg; }}>
                    <div style={{ color: T.ink, fontWeight: 700, fontSize: "14px", letterSpacing: "-0.2px", marginBottom: "8px" }}>{m.ticker}</div>
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ color: T.ink, fontWeight: 600, fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>${(m.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ color: (m.changePct ?? 0) >= 0 ? T.green : T.red, fontSize: "12px", fontWeight: 500, marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>{(m.changePct ?? 0) >= 0 ? "+" : ""}{(m.changePct ?? 0).toFixed(2)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Reveal>

      {/* Row 3: Watchlist — grouped by category */}
        <Reveal delay={0.06}>
          <Card style={{ padding: "28px 30px", marginBottom: "16px" }}>
            <div style={{ marginBottom: watchlist.length > 0 ? "20px" : "0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}><Star size={16} strokeWidth={1.5} color={T.inkFaint} />Watchlist</div>
                <button onClick={() => navigate("/markets")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>Browse Markets</button>
              </div>
              {watchlist.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <RangeTabs selected={wlRange} onChange={setWlRange} />
                </div>
              )}
            </div>
            {watchlist.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ marginBottom: "12px" }}><Star size={32} strokeWidth={1.5} color={T.inkFaint} /></div>
                <div style={{ color: T.ink, fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>Your watchlist is empty</div>
                <div style={{ color: T.inkSub, fontSize: "14px", marginBottom: "16px" }}>Star any stock to track it here</div>
                <button onClick={() => navigate("/markets")} style={{ background: "none", border: "none", color: T.accent, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Browse Markets &rarr;</button>
              </div>
            ) : (
            (() => {
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
                    const collapsed = wlCollapsed[cat] || false;
                    return (
                      <div key={cat}>
                        <div
                          onClick={() => setWlCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 4px", cursor: "pointer", userSelect: "none", borderRadius: "6px", transition: "background .15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = T.bg}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <CategoryIcon category={cat} />
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
            })()
            )}
          </Card>
        </Reveal>


      {/* Row 4: Your Holdings — full width list */}
      <Reveal delay={0.08}>
        <Card style={{ padding: "28px 30px", marginBottom: "16px" }}>
          {(() => {
            const activeHoldings = holdings.filter(h => Number(h.shares) >= 0.001);
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
