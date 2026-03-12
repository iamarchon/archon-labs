import { useEffect, useRef } from "react";
import { T } from "../tokens";

const LEVELS = [
  { name: "Bronze",   emoji: "🥉", threshold: 0 },
  { name: "Silver",   emoji: "🥈", threshold: 100 },
  { name: "Gold",     emoji: "🥇", threshold: 300 },
  { name: "Platinum", emoji: "💎", threshold: 750 },
  { name: "Legend",   emoji: "👑", threshold: 2000 },
];

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
      position: "absolute", top: "100%", right: 0, marginTop: "8px",
      width: "320px",
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "20px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
      padding: "24px",
      zIndex: 150, animation: "sheetUp .22s cubic-bezier(.34,1.56,.64,1)",
    }}>
      {/* Arrow */}
      <div style={{ position: "absolute", top: "-6px", right: "24px", width: "12px", height: "12px", background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(20px)", transform: "rotate(45deg)", borderRadius: "2px" }} />

      {/* Current level */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "36px", marginBottom: "4px" }}>{LEVELS[currentIdx]?.emoji}</div>
        <div style={{ color: T.ink, fontSize: "20px", fontWeight: 700, letterSpacing: "-0.4px" }}>{level}</div>
        <div style={{ color: T.ink, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
          {xp.toLocaleString()} XP
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ height: "8px", background: "rgba(0,0,0,.06)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(progressPct, 100)}%`, background: T.accent, borderRadius: "4px", transition: "width .4s ease" }} />
        </div>
        <div style={{ color: T.inkFaint, fontSize: "12px", marginTop: "6px", textAlign: "center" }}>
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
              background: isCurrent ? "rgba(59, 130, 246, 0.15)" : "transparent",
              opacity: isLocked ? 0.5 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "16px", width: "22px", textAlign: "center" }}>
                  {isCompleted ? "✅" : l.emoji}
                </span>
                <span style={{ color: isCurrent ? T.accent : T.ink, fontSize: "14px", fontWeight: isCurrent ? 600 : 400 }}>
                  {l.name}
                </span>
              </div>
              <span style={{ color: T.inkFaint, fontSize: "12px", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {l.threshold.toLocaleString()} XP
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ color: T.inkFaint, fontSize: "12px", textAlign: "center", marginTop: "16px" }}>
        Keep trading to earn XP! 🏀
      </div>
    </div>
  );
}
