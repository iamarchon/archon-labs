import { useState, useMemo, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { T } from "./tokens";
import { SEED_STOCKS } from "./data";
import useLivePrices from "./hooks/useLivePrices";
import useUserData from "./hooks/useUserData";
import useTrade from "./hooks/useTrade";
import AuthGate from "./components/AuthGate";
import TopNav from "./components/TopNav";
import TickerStrip from "./components/TickerStrip";
import TradeModal from "./components/TradeModal";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Portfolio from "./pages/Portfolio";
import Learn from "./pages/Learn";
import Leaderboard from "./pages/Leaderboard";
import Coach from "./pages/Coach";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [pathname]);
  return null;
}

function AppShell() {
  const tickers = useMemo(() => SEED_STOCKS.map(s => s.ticker), []);
  const livePrices = useLivePrices(tickers);
  const {
    user: dbUser, holdings, watchlist, loading: userLoading,
    toggleWatch, refreshUser, refreshHoldings, xpToLevel,
  } = useUserData();
  const [tradeStock, setTradeStock] = useState(null);
  const [toast, setToast] = useState(null);

  const onTradeComplete = useCallback(async () => {
    await refreshUser();
    await refreshHoldings();
  }, [refreshUser, refreshHoldings]);

  const { executeTrade, error: tradeError } = useTrade(dbUser?.id, onTradeComplete);

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

  const handleTrade = async (stock, action, shares) => {
    await executeTrade(stock, action, shares);
    if (!tradeError) {
      setToast({ text: `${action} ${shares}× ${stock.ticker} confirmed`, type: action });
      setTimeout(() => setToast(null), 3000);
    }
  };

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
              <Dashboard stocks={stocks} onTrade={setTradeStock}
                holdings={holdings} cash={cash} xp={xp} level={level}
                streak={streak} username={username} />
            } />
            <Route path="/markets" element={
              <Markets onTrade={setTradeStock} watchlist={watchlist} onWatch={toggleWatch} />
            } />
            <Route path="/portfolio" element={
              <Portfolio stocks={stocks} holdings={holdings} cash={cash} xp={xp} />
            } />
            <Route path="/learn" element={<Learn />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
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

      {toast && (
        <div style={{ position: "fixed", bottom: "36px", left: "50%", transform: "translateX(-50%)", background: T.ink, color: T.white, padding: "12px 24px", borderRadius: "24px", fontWeight: 500, fontSize: "14px", zIndex: 300, animation: "toastIn .28s cubic-bezier(.34,1.56,.64,1)", whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,.18)" }}>
          {toast.type === "BUY" ? "↗" : "↘"} {toast.text}
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
