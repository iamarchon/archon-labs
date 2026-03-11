import { T } from "../tokens";
import { HOLDINGS, STARTING_CASH } from "../data";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import Sparkline from "../components/Sparkline";

export default function Portfolio({ stocks }) {
  const portfolioValue = HOLDINGS.reduce((sum, h) => {
    const s = stocks.find(x => x.ticker === h.ticker);
    return sum + (s ? s.price * h.shares : 0);
  }, 0);
  const cash = STARTING_CASH, total = portfolioValue + cash;
  const gain = total - 10000, gainPct = (gain / 10000) * 100;
  const barData = [38,45,42,58,52,67,61,75,70,82,78,91,86,100];

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <Card hover={false} style={{ padding: "52px", marginBottom: "20px", textAlign: "center" }}>
          <div style={{ color: T.inkFaint, fontSize: "12px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "10px" }}>Total Portfolio Value</div>
          <div style={{ fontSize: "60px", fontWeight: 700, letterSpacing: "-2.5px", color: T.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>${total.toFixed(2)}</div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "12px" }}>
            <span style={{ color: gain >= 0 ? T.green : T.red, fontSize: "17px", fontWeight: 600 }}>{gain >= 0 ? "▲" : "▼"} {gain >= 0 ? "+" : ""}{gainPct.toFixed(2)}%</span>
            <span style={{ color: T.inkFaint, fontSize: "15px" }}>{gain >= 0 ? "+" : "−"}${Math.abs(gain).toFixed(2)} all time</span>
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "48px", justifyContent: "center", marginTop: "28px", padding: "0 60px" }}>
            {barData.map((h, i) => (<div key={i} style={{ flex: 1, maxWidth: "20px", height: `${h}%`, background: i === barData.length - 1 ? T.accent : `${T.accent}22`, borderRadius: "3px 3px 0 0", transition: "height .6s ease" }} />))}
          </div>
        </Card>
      </Reveal>
      <Reveal delay={0.08}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          {[["Invested", `$${portfolioValue.toFixed(2)}`], ["Cash", `$${cash.toFixed(2)}`], ["XP", "2,840"]].map(([label, value]) => (
            <Card key={label} style={{ padding: "24px 28px" }}>
              <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
              <div style={{ color: T.ink, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.6px", fontVariantNumeric: "tabular-nums" }}>{value}</div>
            </Card>
          ))}
        </div>
      </Reveal>
      <Reveal delay={0.14}>
        <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "14px", padding: "0 4px" }}>Holdings</div>
        <Card hover={false} style={{ overflow: "hidden" }}>
          {HOLDINGS.map((h, i) => {
            const s = stocks.find(x => x.ticker === h.ticker);
            if (!s) return null;
            const val = s.price * h.shares, cost = h.avgCost * h.shares, g = val - cost, gPct = (g / cost) * 100;
            return (
              <div key={h.ticker} style={{ display: "flex", alignItems: "center", gap: "20px", padding: "20px 28px", borderBottom: i < HOLDINGS.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: T.inkMid, fontSize: "9.5px", fontWeight: 700 }}>{s.ticker}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: T.ink, fontWeight: 600, fontSize: "15px", letterSpacing: "-0.2px" }}>{s.ticker} <span style={{ color: T.inkSub, fontWeight: 400 }}>· {s.name}</span></div>
                  <div style={{ color: T.inkSub, fontSize: "13px", marginTop: "2px" }}>{h.shares} shares · avg cost ${h.avgCost.toFixed(2)}</div>
                </div>
                <Sparkline positive={gPct >= 0} width={64} height={24} />
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: T.ink, fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px", fontVariantNumeric: "tabular-nums" }}>${val.toFixed(2)}</div>
                  <div style={{ color: gPct >= 0 ? T.green : T.red, fontSize: "13px", fontWeight: 500 }}>{gPct >= 0 ? "+" : ""}{gPct.toFixed(2)}%</div>
                </div>
              </div>
            );
          })}
        </Card>
      </Reveal>
    </div>
  );
}
