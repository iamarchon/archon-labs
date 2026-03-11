import { useState, useEffect } from "react";
import { T } from "../tokens";

export default function TradeModal({ stock, onClose, onTrade, cash = 10000, holdings = [] }) {
  const [action, setAction] = useState("BUY");
  const [shares, setShares] = useState(1);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const price = stock.price ?? 0;
  const total = (price * shares).toFixed(2);
  const holding = holdings.find(h => h.ticker === stock.ticker);
  const ownedShares = holding ? Number(holding.shares) : 0;
  const canAfford = action === "BUY" ? cash >= price * shares : ownedShares >= shares;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.22)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", animation: "fadeIn .16s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: "22px", padding: "38px", width: "400px", boxShadow: "0 40px 80px rgba(0,0,0,.14)", animation: "sheetUp .26s cubic-bezier(.34,1.56,.64,1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ color: T.ink, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.6px" }}>{stock.ticker}</div>
            <div style={{ color: T.inkSub, fontSize: "14px", marginTop: "2px" }}>{stock.name}</div>
          </div>
          <button onClick={onClose} style={{ background: T.bg, border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: T.inkSub, fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = T.line}
            onMouseLeave={e => e.currentTarget.style.background = T.bg}>×</button>
        </div>
        <div style={{ display: "flex", background: T.bg, borderRadius: "11px", padding: "3px", marginBottom: "24px" }}>
          {["BUY", "SELL"].map(a => (
            <button key={a} onClick={() => { setAction(a); setShares(1); }} style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "none", cursor: "pointer", background: action === a ? T.white : "transparent", color: action === a ? T.ink : T.inkSub, fontWeight: action === a ? 600 : 400, fontSize: "14px", boxShadow: action === a ? "0 1px 4px rgba(0,0,0,.1)" : "none", transition: "all .18s ease" }}>{a}</button>
          ))}
        </div>
        <div style={{ background: T.bg, borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "13px", borderBottom: `1px solid ${T.line}` }}>
            <span style={{ color: T.inkSub, fontSize: "14px" }}>Market Price</span>
            <span style={{ color: T.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{price > 0 ? `$${price.toFixed(2)}` : "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "13px", paddingBottom: "13px", borderBottom: `1px solid ${T.line}` }}>
            <span style={{ color: T.inkSub, fontSize: "14px" }}>
              {action === "BUY" ? "Cash Available" : "Shares Owned"}
            </span>
            <span style={{ color: T.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {action === "BUY" ? `$${cash.toFixed(2)}` : ownedShares}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "13px" }}>
            <span style={{ color: T.inkSub, fontSize: "14px" }}>Shares</span>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button onClick={() => setShares(Math.max(1, shares - 1))} style={{ width: "30px", height: "30px", borderRadius: "50%", background: T.line, border: "none", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ color: T.ink, fontWeight: 600, fontSize: "18px", minWidth: "22px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{shares}</span>
              <button onClick={() => setShares(shares + 1)} style={{ width: "30px", height: "30px", borderRadius: "50%", background: T.line, border: "none", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", padding: "0 2px" }}>
          <span style={{ color: T.inkSub, fontSize: "14px" }}>Total</span>
          <span style={{ color: T.ink, fontWeight: 700, fontSize: "26px", letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}>{price > 0 ? `$${total}` : "—"}</span>
        </div>
        {!canAfford && (
          <div style={{ color: T.red, fontSize: "13px", textAlign: "center", marginBottom: "12px", fontWeight: 500 }}>
            {action === "BUY" ? "Not enough cash" : "Not enough shares"}
          </div>
        )}
        <button
          onClick={() => { if (canAfford) { onTrade(stock, action, shares); onClose(); } }}
          disabled={!canAfford}
          style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "none", cursor: canAfford ? "pointer" : "not-allowed", background: action === "BUY" ? T.accent : T.red, color: T.white, fontWeight: 600, fontSize: "15px", transition: "opacity .15s ease", opacity: canAfford ? 1 : 0.4 }}
          onMouseEnter={e => { if (canAfford) e.currentTarget.style.opacity = ".88"; }}
          onMouseLeave={e => { if (canAfford) e.currentTarget.style.opacity = "1"; }}>
          {action === "BUY" ? "Buy" : "Sell"} {shares} share{shares > 1 ? "s" : ""} of {stock.ticker}
        </button>
      </div>
    </div>
  );
}
