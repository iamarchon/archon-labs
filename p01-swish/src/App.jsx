import { useState, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { T } from "./tokens";
import { SEED_STOCKS } from "./data";
import useLivePrices from "./hooks/useLivePrices";
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
  const [tradeStock, setTradeStock] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [toast, setToast] = useState(null);

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

  const handleTrade = (stock, action, shares) => {
    setToast({ text: `${action} ${shares}× ${stock.ticker} confirmed`, type: action });
    setTimeout(() => setToast(null), 3000);
  };

  const handleWatch = (stock) => {
    setWatchlist(prev =>
      prev.includes(stock.ticker)
        ? prev.filter(t => t !== stock.ticker)
        : [...prev, stock.ticker]
    );
  };

  return (
    <>
      <ScrollToTop />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg }}>
        <TopNav />
        <div style={{ height: "52px", flexShrink: 0 }} />
        <TickerStrip stocks={stocks} />
        <main style={{ flex: 1, background: T.bg }}>
          <Routes>
            <Route path="/" element={<Dashboard stocks={stocks} onTrade={setTradeStock} />} />
            <Route path="/markets" element={<Markets onTrade={setTradeStock} watchlist={watchlist} onWatch={handleWatch} />} />
            <Route path="/portfolio" element={<Portfolio stocks={stocks} />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/coach" element={<Coach />} />
          </Routes>
        </main>
      </div>

      {tradeStock && <TradeModal stock={tradeStock} onClose={() => setTradeStock(null)} onTrade={handleTrade} />}

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
      <AppShell />
    </BrowserRouter>
  );
}
