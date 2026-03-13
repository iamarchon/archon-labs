import { useState, useMemo, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { T } from "./tokens";
import { SEED_STOCKS } from "./data";
import { STOCK_CATEGORIES } from "./data/stockCategories";
import useUserData from "./hooks/useUserData";
import useTrade from "./hooks/useTrade";
import useConfetti from "./hooks/useConfetti";
import supabase from "./lib/supabase";
import AuthGate from "./components/AuthGate";
import TopNav from "./components/TopNav";
import TickerStrip from "./components/TickerStrip";
import TradeModal from "./components/TradeModal";
import StockDetailModal from "./components/StockDetailModal";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Learn from "./pages/Learn";
import Leaderboard from "./pages/Leaderboard";
import Coach from "./pages/Coach";
import StockDetail from "./pages/StockDetail";
import Challenges from "./pages/Challenges";
import TeacherDashboard from "./pages/TeacherDashboard";
import Scenarios from "./pages/Scenarios";
import AutoInvest from "./pages/AutoInvest";
import RoleSelect from "./components/RoleSelect";
import useNotifications from "./hooks/useNotifications";
import MobileNav from "./components/MobileNav";
import TutorialOverlay from "./components/TutorialOverlay";
import usePullToRefresh from "./hooks/usePullToRefresh";
import PullToRefreshIndicator from "./components/PullToRefreshIndicator";
import FloatingCoach from "./components/FloatingCoach";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [pathname]);
  return null;
}

function AppShell() {
  const navigate = useNavigate();
  const {
    user: dbUser, holdings, watchlist, watchlistItems, loading: userLoading,
    toggleWatch, refreshUser, refreshHoldings, xpToLevel,
  } = useUserData();
  const [tradeStock, setTradeStock] = useState(null);
  const [tradeSuccess, setTradeSuccess] = useState(null);
  const [tradeFirstTrade, setTradeFirstTrade] = useState(false);
  const [detailStock, setDetailStock] = useState(null);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem("swish_tutorial_done"));
  const { pathname } = useLocation();

  // Pull-to-refresh on mobile
  const handlePullRefresh = useCallback(async () => {
    await Promise.all([refreshUser(), refreshHoldings()]);
  }, [refreshUser, refreshHoldings]);
  const { state: pullState, pullDistance } = usePullToRefresh(handlePullRefresh);

  // Close trade modal on route change
  useEffect(() => {
    setTradeStock(null);
    setTradeSuccess(null);
    setTradeFirstTrade(false);
    setDetailStock(null);
  }, [pathname]);
  const { fireConfetti } = useConfetti();
  const prevLevelRef = useRef(null);
  const initialLoadDone = useRef(false);

  const {
    notifications, unreadCount, markAllRead,
    generateChallengeNotifications,
  } = useNotifications(dbUser, dbUser?.xp ?? 0, dbUser?.streak ?? 0);

  const onTradeComplete = useCallback(async () => {
    await refreshUser();
    await refreshHoldings();
  }, [refreshUser, refreshHoldings]);

  const { executeTrade } = useTrade(dbUser?.id, onTradeComplete);

  // Full universe of tickers from STOCK_CATEGORIES (equities + ETFs + crypto)
  const allUniverseTickers = useMemo(() => Object.keys(STOCK_CATEGORIES), []);
  const CRYPTO_SYMBOLS = useMemo(() => {
    const set = new Set();
    for (const [ticker, cat] of Object.entries(STOCK_CATEGORIES)) {
      if (cat === "Crypto") set.add(ticker);
    }
    return set;
  }, []);

  // Price state: ONLY held tickers fetched at app level.
  // All other tickers fetched by Markets/StockSearch when that page mounts.
  const [dailyQuotes, setDailyQuotes] = useState({});
  const [quotesLoaded, setQuotesLoaded] = useState(false);

  // Derive held tickers from holdings (only when holdings are loaded from Supabase)
  const heldTickers = useMemo(() => {
    return holdings.filter(h => Number(h.shares) >= 0.001).map(h => h.ticker);
  }, [holdings]);

  // Fetch ONLY held tickers — nothing else runs at app level
  // Wait for holdings to actually load (non-empty) before fetching, to avoid the
  // race where holdings=[] → quotesLoaded=true → Phase 2 fetches everything
  useEffect(() => {
    // Don't fetch until we know what the user holds (wait for Supabase)
    if (userLoading) return;
    if (heldTickers.length === 0) {
      // User genuinely has no holdings — mark loaded immediately
      setQuotesLoaded(true);
      return;
    }
    const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";
    let cancelled = false;

    const fetchHeldQuotes = async () => {
      const results = {};
      await Promise.all(heldTickers.map(async (ticker) => {
        try {
          const isCrypto = CRYPTO_SYMBOLS.has(ticker);
          const url = isCrypto
            ? `${baseUrl}/api/crypto/quote/${encodeURIComponent(ticker)}`
            : `${baseUrl}/api/quote/${encodeURIComponent(ticker)}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.source === "swish" && data.c && data.c > 0) {
            results[ticker] = { dp: data.dp ?? 0, price: data.c };
          }
        } catch { /* ignore */ }
      }));
      console.log("[skeleton] held quotes fetched:", Object.keys(results), "from held:", heldTickers);
      if (!cancelled && Object.keys(results).length > 0) {
        setDailyQuotes(results); // replace, not merge — held tickers are the only source
        setQuotesLoaded(true);
      } else if (!cancelled && heldTickers.length > 0) {
        // Even if all returned 0, mark loaded to prevent infinite skeleton
        console.warn("[skeleton] no valid quotes returned, forcing quotesLoaded");
        setQuotesLoaded(true);
      }
    };
    fetchHeldQuotes();
    const id = setInterval(fetchHeldQuotes, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [heldTickers, CRYPTO_SYMBOLS, userLoading]);

  // Derive livePrices from dailyQuotes for backward compatibility
  const livePrices = useMemo(() => {
    const map = {};
    for (const [ticker, q] of Object.entries(dailyQuotes)) {
      map[ticker] = q.price;
    }
    return map;
  }, [dailyQuotes]);

  // Merge quote data into seed data, plus non-seed symbols — single price source
  const stocks = useMemo(() => {
    const seedTickers = new Set(SEED_STOCKS.map(s => s.ticker));
    const equities = SEED_STOCKS.map(s => {
      const q = dailyQuotes[s.ticker];
      // Use quote price when available; keep seed price ONLY as visual placeholder before quotes load
      const price = q?.price ?? s.price;
      const changePct = q?.dp ?? 0;
      const priceLoaded = !!q;
      return { ...s, price, changePct, dailyPct: q?.dp, priceLoaded, sector: STOCK_CATEGORIES[s.ticker] || "Other", isCrypto: CRYPTO_SYMBOLS.has(s.ticker) };
    });
    // Add non-seed symbols (crypto, ETFs, other equities) from quote data
    const extras = allUniverseTickers
      .filter(t => !seedTickers.has(t) && dailyQuotes[t])
      .map(ticker => {
        const q = dailyQuotes[ticker];
        return {
          ticker,
          name: ticker,
          price: q.price,
          changePct: q.dp,
          dailyPct: q.dp,
          sector: STOCK_CATEGORIES[ticker] || "Other",
          isCrypto: CRYPTO_SYMBOLS.has(ticker),
        };
      });
    return [...equities, ...extras];
  }, [dailyQuotes, allUniverseTickers, CRYPTO_SYMBOLS]);

  const cash = dbUser ? Number(dbUser.cash) : 10000;
  useEffect(() => {
    if (dbUser) console.log("[cash] dbUser.id:", dbUser.id, "dbUser.cash:", dbUser.cash, "parsed:", cash);
  }, [dbUser, cash]);
  const xp = dbUser?.xp ?? 0;
  const level = xpToLevel(xp);
  const streak = dbUser?.streak ?? 0;
  const username = dbUser?.username ?? "trader";
  const totalTrades = dbUser?.total_trades ?? 0;

  // Update daily login streak
  useEffect(() => {
    if (!dbUser?.id) return;
    const base = import.meta.env.DEV ? "http://localhost:3001" : "";
    fetch(`${base}/api/streak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: dbUser.id }),
    })
      .then(r => r.json())
      .then(() => refreshUser())
      .catch(() => {});
  }, [dbUser?.id, refreshUser]);

  // Detect level up — skip the initial load so reload doesn't trigger confetti
  useEffect(() => {
    if (!initialLoadDone.current) {
      if (dbUser) {
        prevLevelRef.current = level;
        initialLoadDone.current = true;
      }
      return;
    }
    if (prevLevelRef.current && prevLevelRef.current !== level) {
      fireConfetti("levelUp");
    }
    prevLevelRef.current = level;
  }, [level, fireConfetti, dbUser]);

  // Save portfolio snapshot helper — once per day max (upsert on snapshot_date)
  // GUARD: reject implausible values (sim starts at $10k, valid range $3k–$50k)
  const saveSnapshot = useCallback(async (value) => {
    if (!dbUser) return;
    if (value == null || value < 3000 || value > 50000) {
      console.warn("[snapshot] REJECTED implausible value:", value);
      return;
    }
    try {
      const now = new Date();
      const snapshotDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
      console.log("[snapshot] upserting for", snapshotDate, "value:", value);

      const { error } = await supabase
        .from("portfolio_snapshots")
        .upsert(
          { user_id: dbUser.id, total_value: value, snapshot_date: snapshotDate },
          { onConflict: "user_id,snapshot_date" }
        );

      if (error) {
        console.error("[snapshot] upsert error:", error);
      } else {
        console.log("[snapshot] upsert success for", snapshotDate);
      }
    } catch (err) {
      console.error("Snapshot save failed:", err);
    }
  }, [dbUser]);

  // Trade success toast state
  const [tradeToast, setTradeToast] = useState(null);

  // Challenge toast state
  const [challengeToast, setChallengeToast] = useState(null);

  const onClaimXp = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  // Background challenge check after trade
  const checkChallengesAfterAction = useCallback(async () => {
    if (!dbUser?.id) return;
    try {
      const base = import.meta.env.DEV ? "http://localhost:3001" : "";
      const res = await fetch(`${base}/api/challenges?userId=${dbUser.id}`);
      const data = await res.json();
      const challenges = data.challenges || [];
      generateChallengeNotifications(challenges);
      const newlyComplete = challenges.find(c => c.percent >= 100 && !c.completedAt);
      if (newlyComplete) {
        setChallengeToast(newlyComplete);
        setTimeout(() => setChallengeToast(null), 5000);
      }
    } catch { /* ignore */ }
  }, [dbUser?.id, generateChallengeNotifications]);

  // Generate challenge notifications on initial load
  useEffect(() => {
    if (!dbUser?.id) return;
    const base = import.meta.env.DEV ? "http://localhost:3001" : "";
    fetch(`${base}/api/challenges?userId=${dbUser.id}`)
      .then(r => r.json())
      .then(data => generateChallengeNotifications(data.challenges || []))
      .catch(() => {});
  }, [dbUser?.id, generateChallengeNotifications]);

  const handleTrade = async (stock, action, shares) => {
    const wasFirstTrade = totalTrades === 0;
    await executeTrade(stock, action, shares);

    // Fire confetti
    fireConfetti(wasFirstTrade ? "firstTrade" : "trade");

    // Swap to success state inside the same modal
    setTradeSuccess({ action, shares });
    setTradeFirstTrade(wasFirstTrade);

    // Show trade success toast
    const verb = action === "BUY" ? "Bought" : "Sold";
    const xpText = wasFirstTrade ? "+100 XP earned" : "+10 XP earned";
    setTradeToast(`${verb} ${shares} ${stock.ticker} share${shares > 1 ? "s" : ""}! ${xpText}`);
    setTimeout(() => setTradeToast(null), 3000);

    // Save snapshot after trade — only if ALL held ticker prices are from sim feed
    if (allHeldPricesLoaded) {
      const portfolioValue = activeHoldings.reduce((sum, h) => {
        const s = stocks.find(x => x.ticker === h.ticker);
        return sum + Number(h.shares) * (s?.price ?? 0);
      }, 0);
      const newCash = action === "BUY"
        ? cash - (stock.price * shares)
        : cash + (stock.price * shares);
      saveSnapshot(portfolioValue + newCash);
    }

    // Background challenge check
    checkChallengesAfterAction();
  };

  // Open stock detail modal
  const openDetail = useCallback((stock) => {
    setDetailStock(stock);
  }, []);

  // Navigate to stock detail page
  const goToStock = useCallback((stock) => {
    navigate(`/stock/${stock.ticker}`);
  }, [navigate]);

  // Role selection for new users
  const handleRoleSelect = useCallback(async (role) => {
    await refreshUser();
    if (role === "teacher") navigate("/teacher");
  }, [refreshUser, navigate]);

  // Only check held tickers (shares > 0) — ignore 0-share rows from past sells
  // MUST be declared before any conditional returns (React rules of hooks)
  const activeHoldings = useMemo(() => holdings.filter(h => Number(h.shares) >= 0.001), [holdings]);

  // 8s hard timeout — if prices haven't loaded by then, force loaded to prevent infinite skeleton
  const [priceTimedOut, setPriceTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      console.warn("[skeleton] 8s timeout — forcing allHeldPricesLoaded");
      setPriceTimedOut(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Check that EVERY held ticker has a real quote from /api/quote — not seed or avg_cost fallback
  const allHeldPricesLoadedReal = quotesLoaded && (activeHoldings.length > 0
    ? activeHoldings.every(h => {
        const s = stocks.find(x => x.ticker === h.ticker);
        return s?.priceLoaded === true;
      })
    : true // no holdings → just need quotes to have loaded
  );
  const allHeldPricesLoaded = allHeldPricesLoadedReal || priceTimedOut;

  // Debug: log skeleton blocking reason
  useEffect(() => {
    if (allHeldPricesLoaded) {
      console.log("[skeleton] cleared — allHeldPricesLoaded:", allHeldPricesLoadedReal, "timedOut:", priceTimedOut);
    } else {
      const missing = activeHoldings.filter(h => {
        const s = stocks.find(x => x.ticker === h.ticker);
        return !s?.priceLoaded;
      }).map(h => h.ticker);
      console.log("[skeleton] BLOCKING — quotesLoaded:", quotesLoaded, "missing tickers:", missing, "activeHoldings:", activeHoldings.map(h => h.ticker));
    }
  }, [allHeldPricesLoaded, allHeldPricesLoadedReal, priceTimedOut, quotesLoaded, activeHoldings, stocks]);

  // Only compute portfolio value when ALL held tickers have sim-feed prices
  const portfolioValue = allHeldPricesLoaded ? activeHoldings.reduce((sum, h) => {
    const s = stocks.find(x => x.ticker === h.ticker);
    // s.priceLoaded is guaranteed true for all held tickers here
    return sum + Number(h.shares) * (s?.price ?? 0);
  }, 0) : 0;
  const totalValue = allHeldPricesLoaded ? portfolioValue + cash : null;
  const portfolioGain = totalValue != null ? ((totalValue - 10000) / 10000) * 100 : null;

  if (userLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink, marginBottom: "8px" }}>
            swish<span style={{ color: T.accent }}>.</span>
          </div>
          <div style={{ color: T.inkFaint, fontSize: "14px" }}>Loading your portfolio...</div>
        </div>
      </div>
    );
  }

  // Show role selection if user has no role set yet
  if (dbUser && (!dbUser.role || dbUser.role === "null")) {
    return <RoleSelect userId={dbUser.id} onSelect={handleRoleSelect} />;
  }

  const shouldShowTutorial = showTutorial && dbUser && totalTrades === 0 && dbUser.role !== "teacher";

  return (
    <>
      <ScrollToTop />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg }}>
        <TopNav notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} role={dbUser?.role} />
        <div style={{ height: "52px", flexShrink: 0 }} />
        <TickerStrip stocks={stocks} />
        <main style={{ flex: 1, background: T.bg }}>
          <Routes>
            <Route path="/" element={
              dbUser?.role === "teacher" ? <Navigate to="/teacher" replace /> :
              <Dashboard stocks={stocks} onTrade={goToStock} onOpenDetail={openDetail}
                holdings={holdings} cash={cash} xp={xp} level={level}
                streak={streak} username={username} livePrices={livePrices}
                dbUser={dbUser} saveSnapshot={saveSnapshot}
                totalTrades={totalTrades} totalValue={totalValue}
                portfolioGain={portfolioGain}
                quotesLoaded={quotesLoaded}
                allHeldPricesLoaded={allHeldPricesLoaded}
                onClaimXp={onClaimXp} fireConfetti={fireConfetti}
                watchlist={watchlist} watchlistItems={watchlistItems}
                toggleWatch={toggleWatch} />
            } />
            <Route path="/markets" element={
              <Markets onOpenTrade={setTradeStock} watchlist={watchlist} onWatch={toggleWatch} />
            } />
            <Route path="/portfolio" element={<Navigate to="/" replace />} />
            <Route path="/stock/:symbol" element={
              <StockDetail stocks={stocks} livePrices={livePrices}
                onTrade={setTradeStock} onOpenDetail={openDetail}
                holdings={holdings} cash={cash} userId={dbUser?.id} />
            } />
            <Route path="/challenges" element={
              <Challenges dbUser={dbUser} onClaimXp={onClaimXp} fireConfetti={fireConfetti} />
            } />
            <Route path="/auto-invest" element={
              <AutoInvest dbUser={dbUser} stocks={stocks} livePrices={livePrices} refreshUser={refreshUser} />
            } />
            <Route path="/learn" element={<Learn dbUser={dbUser} refreshUser={refreshUser} fireConfetti={fireConfetti} />} />
            <Route path="/scenarios" element={
              <Scenarios dbUser={dbUser} onClaimXp={onClaimXp} fireConfetti={fireConfetti} />
            } />
            <Route path="/teacher" element={<TeacherDashboard dbUser={dbUser} />} />
            <Route path="/leaderboard" element={<Leaderboard userId={dbUser?.id} />} />
            <Route path="/coach" element={<Coach />} />
          </Routes>
        </main>
      </div>

      {detailStock && !tradeStock && (
        <StockDetailModal
          stock={detailStock}
          onClose={() => setDetailStock(null)}
          onTrade={(s) => { setDetailStock(null); setTradeStock(s); }}
          holdings={holdings}
          livePrices={livePrices}
          userId={dbUser?.id}
        />
      )}

      {tradeStock && (
        <TradeModal
          stock={tradeStock}
          onClose={() => { setTradeStock(null); setTradeSuccess(null); setTradeFirstTrade(false); }}
          onTrade={handleTrade}
          cash={cash}
          holdings={holdings}
          success={tradeSuccess}
          isFirstTrade={tradeFirstTrade}
        />
      )}

      {tradeToast && (
        <div style={{
          position: "fixed", top: "64px", left: "50%", transform: "translateX(-50%)",
          zIndex: 1002, background: T.white, borderRadius: "14px",
          padding: "14px 22px", display: "flex", alignItems: "center", gap: "10px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
          animation: "fadeIn .25s ease, slideUp .25s ease",
          whiteSpace: "nowrap", maxWidth: "90vw",
        }}>
          <span style={{ fontSize: "16px" }}>&#10004;</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: T.ink }}>{tradeToast}</span>
        </div>
      )}

      {challengeToast && (
        <div onClick={() => { setChallengeToast(null); navigate("/challenges"); }}
          style={{
            position: "fixed", bottom: "24px", right: "24px", zIndex: 1001,
            background: T.white, borderRadius: "14px", padding: "16px 22px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
            cursor: "pointer", maxWidth: "320px",
            animation: "fadeIn .3s ease, slideUp .3s ease",
          }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: T.ink, marginBottom: "4px" }}>
            Challenge Complete!
          </div>
          <div style={{ fontSize: "12px", color: T.inkSub }}>
            {challengeToast.title} — Claim your XP
          </div>
          <div style={{ fontSize: "11px", color: T.green, fontWeight: 600, marginTop: "6px" }}>
            +{challengeToast.xpReward} XP available
          </div>
        </div>
      )}

      <PullToRefreshIndicator state={pullState} pullDistance={pullDistance} />
      <MobileNav role={dbUser?.role} />
      {dbUser?.role !== "teacher" && <FloatingCoach />}

      {shouldShowTutorial && (
        <TutorialOverlay onDone={() => setShowTutorial(false)} />
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <AppShell />
      </AuthGate>
    </BrowserRouter>
  );
}
