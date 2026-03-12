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
import TradeSuccessModal from "./components/TradeSuccessModal";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Learn from "./pages/Learn";
import Leaderboard from "./pages/Leaderboard";
import Coach from "./pages/Coach";
import StockDetail from "./pages/StockDetail";

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
  const { fireConfetti } = useConfetti();
  const prevLevelRef = useRef(null);

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

  // Detect level up
  useEffect(() => {
    if (prevLevelRef.current && prevLevelRef.current !== level) {
      fireConfetti("levelUp");
    }
    prevLevelRef.current = level;
  }, [level, fireConfetti]);

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

  const handleTrade = async (stock, action, shares) => {
    const wasFirstTrade = totalTrades === 0;
    await executeTrade(stock, action, shares);

    // Fire confetti
    fireConfetti(wasFirstTrade ? "firstTrade" : "trade");

    // Show success modal
    setTradeSuccess({ stock, action, shares, isFirstTrade: wasFirstTrade });

    // Save snapshot after trade
    const portfolioValue = holdings.reduce((sum, h) => {
      const price = livePrices[h.ticker] ?? stocks.find(x => x.ticker === h.ticker)?.price ?? Number(h.avg_cost);
      return sum + Number(h.shares) * price;
    }, 0);
    const newCash = action === "BUY"
      ? cash - (stock.price * shares)
      : cash + (stock.price * shares);
    saveSnapshot(portfolioValue + newCash);
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
        <TopNav xp={xp} level={level} />
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
                portfolioGain={portfolioGain} />
            } />
            <Route path="/markets" element={
              <Markets onTrade={goToStock} watchlist={watchlist} onWatch={toggleWatch} />
            } />
            <Route path="/portfolio" element={<Navigate to="/" replace />} />
            <Route path="/stock/:symbol" element={
              <StockDetail stocks={stocks} livePrices={livePrices}
                onTrade={setTradeStock} holdings={holdings} cash={cash} />
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
          onClose={() => setTradeStock(null)}
          onTrade={handleTrade}
          cash={cash}
          holdings={holdings}
        />
      )}

      {tradeSuccess && (
        <TradeSuccessModal
          trade={tradeSuccess}
          isFirstTrade={tradeSuccess.isFirstTrade}
          onClose={() => setTradeSuccess(null)}
        />
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
