import { T } from "../tokens";

const THRESHOLD = 80;

export default function PullToRefreshIndicator({ state, pullDistance }) {
  if (state === "idle" && pullDistance === 0) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const translateY = state === "refreshing" || state === "done"
    ? 0
    : -40 + (40 * progress);

  const text = state === "done"
    ? "Updated \u2713"
    : state === "refreshing"
      ? "Refreshing..."
      : pullDistance >= THRESHOLD
        ? "Release to refresh"
        : "Pull to refresh";

  return (
    <div style={{
      position: "fixed", top: "58px", left: "50%", zIndex: 200,
      transform: `translateX(-50%) translateY(${translateY}px)`,
      transition: state === "pulling" ? "none" : "all .3s ease",
      opacity: progress > 0.1 || state === "refreshing" || state === "done" ? 1 : 0,
      pointerEvents: "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        background: T.white, borderRadius: "20px",
        padding: "8px 18px",
        boxShadow: "0 4px 20px rgba(0,0,0,.10), 0 0 0 1px rgba(0,0,0,.04)",
        fontSize: "12px", fontWeight: 600, color: T.inkSub,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {state === "refreshing" ? (
          <span style={{
            display: "inline-block", width: "14px", height: "14px",
            border: `2px solid ${T.line}`, borderTopColor: T.accent,
            borderRadius: "50%",
            animation: "pullSpin .6s linear infinite",
          }} />
        ) : state === "done" ? (
          <span style={{ color: T.green, fontSize: "14px" }}>{"\u2713"}</span>
        ) : (
          <span style={{
            display: "inline-block", fontSize: "14px",
            transform: pullDistance >= THRESHOLD ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s ease",
          }}>{"\u2193"}</span>
        )}
        <span>{text}</span>
      </div>
    </div>
  );
}
