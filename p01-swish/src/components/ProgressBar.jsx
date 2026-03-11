import { T } from "../tokens";

export default function ProgressBar({ value, color = T.accent, height = 6 }) {
  return (
    <div style={{ height, background: T.bg, borderRadius: height, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: height, transition: "width 1s cubic-bezier(.25,.46,.45,.94)" }} />
    </div>
  );
}
