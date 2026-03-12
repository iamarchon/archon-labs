import { T } from "../tokens";

const RANGES = ["1D", "1W", "1M", "3M", "1Y"];

export default function RangeTabs({ selected, onChange }) {
  return (
    <div style={{ display: "flex", gap: "4px", background: T.bg, borderRadius: "8px", padding: "2px" }}>
      {RANGES.map(r => (
        <button key={r} onClick={() => onChange(r)} style={{
          background: selected === r ? T.white : "transparent",
          color: selected === r ? T.ink : T.inkFaint,
          border: "none", borderRadius: "6px", padding: "4px 10px",
          fontSize: "11px", fontWeight: 600, cursor: "pointer",
          boxShadow: selected === r ? "0 1px 3px rgba(0,0,0,.08)" : "none",
          transition: "all .15s",
        }}>{r}</button>
      ))}
    </div>
  );
}
