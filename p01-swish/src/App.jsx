import { useState, useMemo, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { T } from "./tokens";
import { SEED_STOCKS } from "./data";
import useLivePrices from "./hooks/useLivePrices";
import useUserData from "./hooks/useUserData";
import useTrade from "./hooks/useTrade";
import useConfetti from "./hooks/useConfetti";
import supabase from "./lib/supabase";
import AuthGate from "./components/AuthGate";
import TopNav from "./components/TopNav";
import TickerStrip from "./components/TickerStrip";
import TradeModal from "./components/TradeModal";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Learn from "./pages/Learn";
import Leaderboard from "./pages/Leaderboard";
import Coach from "./pages/Coach";
import StockDetail from "./pages/StockDetail";
import Challenges from "./pages/Challenges";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [pathname]);
  return null;
}

function AppShell() {
  const navigate = useNavigate();
  const tickers = useMemo(() => SEED_STOCKS.map(s => s.ticker), []);
  const livePrices = useLivePrices(tickers);
  const {
    user: dbUser, holdings, watchlist, loading: userLoading,
    toggleWatch, refreshUser, refreshHoldings, xpToLevel,
  } = useUserData();
  const [tradeStock, setTradeStock] = useState(null);
  const [tradeSuccess, setTradeSuccess] = useState(null);
  const [tradeFirstTrade, setTradeFirstTrade] = useState(false);
  const { fireConfetti } = useConfetti();
  const prevLevelRef = useRef(null);
  const initialLoadDone = useRef(false);

  const onTradeComplete = useCallback(async () => {
    await refreshUser();
    await refreshHoldings();
  }, [refreshUser, refreshHoldings]);

  const { executeTrade } = useTrade(dbUser?.id, onTradeComplete);

  // Merge live WebSocket prices into seed data
  const stocks = useMemo(() =>
    SEED_STOCKS.map(s => {
      const live = livePrices[s.ticker];
      if (live == null) return s;
      const changePct = ((live - s.price) / s.price) * 100;
      return { ...s, price: live, changePct };
    }),
    [livePrices]
  );

  const cash = dbUser ? Number(dbUser.cash) : 10000;
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

  // Save portfolio snapshot helper
  const saveSnapshot = useCallback(async (value) => {
    if (!dbUser) return;
    try {
      const { data: last } = await supabase
        .from("portfolio_snapshots")
        .select("total_value")
        .eq("user_id", dbUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!last || Math.abs(Number(last.total_value) - value) > 0.01) {
        await supabase.from("portfolio_snapshots").insert({
          user_id: dbUser.id,
          total_value: value,
        });
      }
    } catch (err) {
      console.error("Snapshot save failed:", err);
    }
  }, [dbUser]);

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
      const newlyComplete = (data.challenges || []).find(c => c.percent >= 100 && !c.completedAt);
      if (newlyComplete) {
        setChallengeToast(newlyComplete);
        setTimeout(() => setChallengeToast(null), 5000);
      }
    } catch { /* ignore */ }
  }, [dbUser?.id]);

  const handleTrade = async (stock, action, shares) => {
    const wasFirstTrade = totalTrades === 0;
    await executeTrade(stock, action, shares);

    // Fire confetti
    fireConfetti(wasFirstTrade ? "firstTrade" : "trade");

    // Swap to success state inside the same modal
    setTradeSuccess({ action, shares });
    setTradeFirstTrade(wasFirstTrade);

    // Save snapshot after trade
    const portfolioValue = holdings.reduce((sum, h) => {
      const price = livePrices[h.ticker] ?? stocks.find(x => x.ticker === h.ticker)?.price ?? Number(h.avg_cost);
      return sum + Number(h.shares) * price;
    }, 0);
    const newCash = action === "BUY"
      ? cash - (stock.price * shares)
      : cash + (stock.price * shares);
    saveSnapshot(portfolioValue + newCash);

    // Background challenge check
    checkChallengesAfterAction();
  };

  // Navigate to stock detail
  const goToStock = useCallback((stock) => {
    navigate(`/stock/${stock.ticker}`);
  }, [navigate]);

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

  const portfolioValue = holdings.reduce((sum, h) => {
    const price = livePrices[h.ticker] ?? stocks.find(x => x.ticker === h.ticker)?.price ?? Number(h.avg_cost);
    return sum + Number(h.shares) * price;
  }, 0);
  const totalValue = portfolioValue + cash;
  const portfolioGain = ((totalValue - 10000) / 10000) * 100;

  return (
    <>
      <ScrollToTop />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg }}>
        <TopNav />
        <div style={{ height: "52px", flexShrink: 0 }} />
        <TickerStrip stocks={stocks} />
        <main style={{ flex: 1, background: T.bg }}>
          <Routes>
            <Route path="/" element={
              <Dashboard stocks={stocks} onTrade={goToStock}
                holdings={holdings} cash={cash} xp={xp} level={level}
                streak={streak} username={username} livePrices={livePrices}
                dbUser={dbUser} saveSnapshot={saveSnapshot}
                totalTrades={totalTrades} totalValue={totalValue}
                portfolioGain={portfolioGain}
                onClaimXp={onClaimXp} fireConfetti={fireConfetti} />
            } />
            <Route path="/markets" element={
              <Markets onTrade={goToStock} watchlist={watchlist} onWatch={toggleWatch} />
            } />
            <Route path="/portfolio" element={<Navigate to="/" replace />} />
            <Route path="/stock/:symbol" element={
              <StockDetail stocks={stocks} livePrices={livePrices}
                onTrade={setTradeStock} holdings={holdings} cash={cash} />
            } />
            <Route path="/challenges" element={
              <Challenges dbUser={dbUser} onClaimXp={onClaimXp} fireConfetti={fireConfetti} />
            } />
            <Route path="/learn" element={<Learn />} />
            <Route path="/leaderboard" element={<Leaderboard userId={dbUser?.id} />} />
            <Route path="/coach" element={<Coach />} />
          </Routes>
        </main>
      </div>

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
