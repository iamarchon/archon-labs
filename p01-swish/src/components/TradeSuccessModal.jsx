import { useEffect } from "react";
import { T } from "../tokens";

export default function TradeSuccessModal({ trade, isFirstTrade, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!trade) return null;

  const { stock, action, shares } = trade;
  const total = (stock.price * shares).toFixed(2);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.22)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", animation: "fadeIn .16s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: "22px", padding: "44px 38px 34px", width: "380px", boxShadow: "0 40px 80px rgba(0,0,0,.14)", animation: "sheetUp .26s cubic-bezier(.34,1.56,.64,1)", textAlign: "center" }}>
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
          You {action.toLowerCase() === "buy" ? "bought" : "sold"} {shares} share{shares > 1 ? "s" : ""} of <span style={{ fontWeight: 600, color: T.ink }}>{stock.ticker}</span> at ${stock.price?.toFixed(2)}
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: `${T.accent}10`, color: T.accent, fontWeight: 600, fontSize: "14px", padding: "6px 16px", borderRadius: "20px", marginBottom: "24px" }}>
          +10 XP
        </div>

        <div style={{ color: T.inkFaint, fontSize: "13px", fontVariantNumeric: "tabular-nums", marginBottom: "24px" }}>
          Total: ${total}
        </div>

        <button
          onClick={onClose}
          style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "none", cursor: "pointer", background: T.accent, color: T.white, fontWeight: 600, fontSize: "15px", transition: "opacity .15s ease" }}
          onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >Done</button>
      </div>
    </div>
  );
}
