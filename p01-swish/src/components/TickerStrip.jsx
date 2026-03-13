import { T } from "../tokens";

export default function TickerStrip({ stocks }) {
  const doubled = [...stocks, ...stocks];
  return (
    <div style={{ overflow: "hidden", height: "33px", display: "flex", alignItems: "center", background: T.white, borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", gap: "48px", whiteSpace: "nowrap", animation: "ticker 84s linear infinite" }}>
        {doubled.map((s, i) => (
          <span key={i} style={{ display: "inline-flex", gap: "10px", alignItems: "center", fontSize: "11.5px" }}>
            <span style={{ color: T.inkFaint, fontWeight: 500 }}>{s.ticker}</span>
            <span style={{ color: T.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${(s.price ?? 0).toFixed(2)}</span>
            <span style={{ color: (s.changePct ?? 0) >= 0 ? T.green : T.red, fontWeight: 500 }}>
              {(s.changePct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(s.changePct ?? 0).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
