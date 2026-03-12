import { useEffect, useRef } from "react";
import { T } from "../tokens";

const LEVELS = [
  { name: "Bronze",   emoji: "🥉", threshold: 0 },
  { name: "Silver",   emoji: "🥈", threshold: 100 },
  { name: "Gold",     emoji: "🥇", threshold: 300 },
  { name: "Platinum", emoji: "💎", threshold: 750 },
  { name: "Legend",   emoji: "👑", threshold: 2000 },
];

const GLASS = {
  background: "rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(40px) saturate(150%) brightness(1.05)",
  WebkitBackdropFilter: "blur(40px) saturate(150%) brightness(1.05)",
  borderRadius: "24px",
  border: "none",
  boxShadow: [
    "inset 0 1.5px 0 rgba(255, 255, 255, 0.9)",
    "inset 0 -1px 0 rgba(0, 0, 0, 0.08)",
    "inset 1px 0 0 rgba(255, 255, 255, 0.3)",
    "inset -1px 0 0 rgba(255, 255, 255, 0.3)",
    "0 20px 60px rgba(0, 0, 0, 0.15)",
    "0 1px 0 rgba(255, 255, 255, 0.5)",
  ].join(", "),
};

const TEXT = "#111111";

export default function XpPopup({ xp = 0, level = "Bronze", onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const currentIdx = LEVELS.findIndex(l => l.name === level);
  const nextLevel = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;
  const progressPct = nextLevel
    ? ((xp - LEVELS[currentIdx].threshold) / (nextLevel.threshold - LEVELS[currentIdx].threshold)) * 100
    : 100;

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 8px)", right: "-40px",
      width: "320px", padding: "24px",
      zIndex: 150, animation: "sheetUp .22s cubic-bezier(.34,1.56,.64,1)",
      ...GLASS,
    }}>
      {/* Arrow */}
      <div style={{
        position: "absolute", top: "-6px", right: "64px",
        width: "12px", height: "12px", transform: "rotate(45deg)", borderRadius: "2px",
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        boxShadow: "inset 0 1.5px 0 rgba(255, 255, 255, 0.9)",
      }} />

      {/* Current level */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "36px", marginBottom: "4px" }}>{LEVELS[currentIdx]?.emoji}</div>
        <div style={{ color: TEXT, fontSize: "20px", fontWeight: 700, letterSpacing: "-0.4px" }}>{level}</div>
        <div style={{ color: TEXT, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
          {xp.toLocaleString()} XP
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ height: "8px", background: "rgba(0,0,0,.08)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(progressPct, 100)}%`, background: T.accent, borderRadius: "4px", transition: "width .4s ease" }} />
        </div>
        <div style={{ color: "rgba(0,0,0,.45)", fontSize: "12px", marginTop: "6px", textAlign: "center" }}>
          {nextLevel ? `${xp} / ${nextLevel.threshold} XP to ${nextLevel.name}` : "Max level reached!"}
        </div>
      </div>

      {/* Level list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {LEVELS.map((l, i) => {
          const isCurrent = l.name === level;
          const isCompleted = xp >= l.threshold && i < currentIdx;
          const isLocked = i > currentIdx;
          return (
            <div key={l.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderRadius: "10px",
              background: isCurrent
                ? "rgba(99, 102, 241, 0.12)"
                : isCompleted
                  ? "rgba(34, 197, 94, 0.1)"
                  : "transparent",
              opacity: isLocked ? 0.5 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "16px", width: "22px", textAlign: "center" }}>
                  {isCompleted ? "✅" : l.emoji}
                </span>
                <span style={{ color: isCurrent ? T.accent : TEXT, fontSize: "14px", fontWeight: isCurrent ? 600 : 400 }}>
                  {l.name}
                </span>
              </div>
              <span style={{ color: "rgba(0,0,0,.4)", fontSize: "12px", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {l.threshold.toLocaleString()} XP
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ color: "rgba(0,0,0,.35)", fontSize: "12px", textAlign: "center", marginTop: "16px" }}>
        Keep trading to earn XP! 🏀
      </div>
    </div>
  );
}
