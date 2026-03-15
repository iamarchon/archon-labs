import { useState, useEffect } from "react";
import { T } from "../tokens";

export default function TradeModal({ stock, onClose, onTrade, cash = 10000, holdings = [], success, isFirstTrade }) {
  const price = Number(stock.price) || 0;
  const [action, setAction] = useState(stock.defaultAction || "BUY");
  const [mode, setMode] = useState("shares");
  const [shares, setShares] = useState(1);
  const [dollarAmt, setDollarAmt] = useState("");

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const holding = holdings.find(h => h.ticker === stock.ticker);
  const ownedShares = holding ? Number(holding.shares) : 0;

  // Derived values based on mode
  const dollarVal = Number(dollarAmt) || 0;
  const effectiveShares = mode === "dollars" ? (price > 0 ? dollarVal / price : 0) : shares;
  const totalCost = mode === "dollars" ? dollarVal : price * shares;
  const canAfford = action === "BUY" ? cash >= totalCost && totalCost > 0 : ownedShares >= effectiveShares && effectiveShares > 0;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.22)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", animation: "fadeIn .16s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: "22px", padding: "38px", width: "400px", boxShadow: "0 40px 80px rgba(0,0,0,.14)", animation: "sheetUp .26s cubic-bezier(.34,1.56,.64,1)" }}>

        {success ? (
          /* ── Success state ── */
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: T.greenBg, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "scaleIn .3s cubic-bezier(.34,1.56,.64,1)" }}>
              <span style={{ fontSize: "28px", color: T.green }}>✓</span>
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px", color: T.ink, marginBottom: "8px" }}>
              {isFirstTrade ? "Your First Trade! 🚀" : "Trade Successful! 🎉"}
            </div>
            {isFirstTrade && (
              <div style={{ color: T.inkSub, fontSize: "14px", marginBottom: "12px" }}>
                You're officially an investor.
              </div>
            )}
            <div style={{ color: T.inkSub, fontSize: "15px", marginBottom: "20px" }}>
              You {success.action.toLowerCase() === "buy" ? "bought" : "sold"} {Number(success.shares) % 1 === 0 ? success.shares : Number(success.shares).toFixed(4)} share{Number(success.shares) !== 1 ? "s" : ""} of <span style={{ fontWeight: 600, color: T.ink }}>{stock.ticker}</span> at ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: `${T.accent}10`, color: T.accent, fontWeight: 600, fontSize: "14px", padding: "6px 16px", borderRadius: "20px", marginBottom: "24px" }}>
              +10 XP
            </div>
            <div style={{ color: T.inkFaint, fontSize: "13px", fontVariantNumeric: "tabular-nums", marginBottom: "24px" }}>
              Total: ${(price * success.shares).toFixed(2)}
            </div>
            <button
              onClick={onClose}
              style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "none", cursor: "pointer", background: T.accent, color: T.white, fontWeight: 600, fontSize: "15px", transition: "opacity .15s ease" }}
              onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Done</button>
          </div>
        ) : (
          /* ── Trade form ── */
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
              <div>
                <div style={{ color: T.ink, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.6px" }}>{stock.ticker}</div>
                <div style={{ color: T.inkSub, fontSize: "14px", marginTop: "2px" }}>{stock.name}</div>
              </div>
              <button onClick={onClose} style={{ background: T.bg, border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: T.inkSub, fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.line}
                onMouseLeave={e => e.currentTarget.style.background = T.bg}>×</button>
            </div>
            <div style={{ display: "flex", background: T.bg, borderRadius: "11px", padding: "3px", marginBottom: "16px" }}>
              {["BUY", "SELL"].map(a => (
                <button key={a} onClick={() => { setAction(a); setShares(1); setDollarAmt(""); }} style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "none", cursor: "pointer", background: action === a ? T.white : "transparent", color: action === a ? T.ink : T.inkSub, fontWeight: action === a ? 600 : 400, fontSize: "14px", boxShadow: action === a ? "0 1px 4px rgba(0,0,0,.1)" : "none", transition: "all .18s ease" }}>{a}</button>
              ))}
            </div>
            {/* Shares / Dollars toggle */}
            {action === "BUY" && (
              <div style={{ display: "flex", background: T.bg, borderRadius: "9px", padding: "2px", marginBottom: "16px" }}>
                {["shares", "dollars"].map(m => (
                  <button key={m} onClick={() => { setMode(m); setShares(1); setDollarAmt(""); }} style={{ flex: 1, padding: "7px", borderRadius: "7px", border: "none", cursor: "pointer", background: mode === m ? T.white : "transparent", color: mode === m ? T.ink : T.inkFaint, fontWeight: mode === m ? 600 : 400, fontSize: "12px", textTransform: "capitalize", boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.08)" : "none", transition: "all .18s ease" }}>{m === "shares" ? "Shares" : "Dollars"}</button>
                ))}
              </div>
            )}
            <div style={{ background: T.bg, borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "13px", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ color: T.inkSub, fontSize: "14px" }}>Market Price</span>
                <span style={{ color: T.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{price > 0 ? `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "13px", paddingBottom: "13px", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ color: T.inkSub, fontSize: "14px" }}>
                  {action === "BUY" ? "Cash Available" : "Shares Owned"}
                </span>
                <span style={{ color: T.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {action === "BUY" ? `$${(cash ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ownedShares}
                </span>
              </div>
              {/* Mode-specific input row */}
              {mode === "dollars" && action === "BUY" ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "13px" }}>
                    <span style={{ color: T.inkSub, fontSize: "14px" }}>Amount</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ color: T.inkSub, fontSize: "18px", fontWeight: 500 }}>$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={cash}
                        value={dollarAmt}
                        onChange={e => setDollarAmt(e.target.value)}
                        placeholder="0.00"
                        style={{ width: "100px", background: T.white, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "8px 10px", fontSize: "18px", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right", color: T.ink, outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                  </div>
                  {dollarVal > 0 && price > 0 && (
                    <div style={{ textAlign: "right", color: T.inkFaint, fontSize: "12px", marginTop: "6px" }}>
                      ≈ {(dollarVal / price).toFixed(4)} shares
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "13px" }}>
                  <span style={{ color: T.inkSub, fontSize: "14px" }}>Shares</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button onClick={() => setShares(Math.max(0.01, Math.round((shares - (price > 50 ? 0.1 : 1)) * 100) / 100))} style={{ width: "30px", height: "30px", borderRadius: "50%", background: T.line, border: "none", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <input
                      type="number"
                      min="0.01"
                      step={price > 50 ? "0.01" : "1"}
                      value={shares}
                      onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setShares(Math.round(v * 100) / 100); }}
                      style={{ width: "60px", background: T.white, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "6px 4px", fontSize: "18px", fontWeight: 600, textAlign: "center", fontVariantNumeric: "tabular-nums", color: T.ink, outline: "none", fontFamily: "inherit" }}
                    />
                    <button onClick={() => setShares(Math.round((shares + (price > 50 ? 0.1 : 1)) * 100) / 100)} style={{ width: "30px", height: "30px", borderRadius: "50%", background: T.line, border: "none", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", padding: "0 2px" }}>
              <span style={{ color: T.inkSub, fontSize: "14px" }}>Total</span>
              <span style={{ color: T.ink, fontWeight: 700, fontSize: "26px", letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}>{price > 0 ? `$${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</span>
            </div>
            {!canAfford && (
              <div style={{ color: T.red, fontSize: "13px", textAlign: "center", marginBottom: "12px", fontWeight: 500 }}>
                {action === "BUY" ? "Not enough cash" : "Not enough shares"}
              </div>
            )}
            <button
              onClick={() => { if (canAfford) onTrade(stock, action, Math.round(effectiveShares * 10000) / 10000); }}
              disabled={!canAfford}
              style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "none", cursor: canAfford ? "pointer" : "not-allowed", background: action === "BUY" ? T.accent : T.red, color: T.white, fontWeight: 600, fontSize: "15px", transition: "opacity .15s ease", opacity: canAfford ? 1 : 0.4 }}
              onMouseEnter={e => { if (canAfford) e.currentTarget.style.opacity = ".88"; }}
              onMouseLeave={e => { if (canAfford) e.currentTarget.style.opacity = "1"; }}>
              {action === "BUY"
                ? (mode === "dollars" ? `Buy $${dollarVal.toFixed(2)} of ${stock.ticker}` : `Buy ${shares} share${shares !== 1 ? "s" : ""} of ${stock.ticker}`)
                : `Sell ${shares} share${shares !== 1 ? "s" : ""} of ${stock.ticker}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
