import { T } from "../tokens";
import { LEADERBOARD } from "../data";
import Reveal from "../components/Reveal";
import Card from "../components/Card";

export default function Leaderboard() {
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink }}>Leaderboard</h1>
          <p style={{ color: T.inkSub, fontSize: "15px", marginTop: "5px" }}>Top traders this week</p>
        </div>
      </Reveal>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {LEADERBOARD.map((entry, i) => {
          const rankColors = [null, "#c9862a", "#8e8e93", "#7d4f2a"];
          return (
            <Reveal key={entry.rank} delay={i * .06}>
              <Card style={{ padding: "22px 28px", boxShadow: entry.isUser ? `0 0 0 2px ${T.accent}30, 0 4px 20px rgba(0,0,0,.07)` : "0 2px 12px rgba(0,0,0,.05), 0 0 0 1px rgba(0,0,0,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div style={{ fontSize: "18px", width: "28px", textAlign: "center", fontWeight: 800, color: rankColors[entry.rank] || T.inkFaint }}>
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: entry.isUser ? `${T.accent}12` : T.bg, border: entry.isUser ? `1.5px solid ${T.accent}35` : `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: entry.isUser ? T.accent : T.inkFaint, fontSize: "15px", fontWeight: 700 }}>{entry.user[0].toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: entry.isUser ? T.accent : T.ink, fontWeight: 600, fontSize: "15px", letterSpacing: "-0.2px" }}>@{entry.user}</span>
                      {entry.isUser && <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: T.accent, background: `${T.accent}12`, padding: "2px 7px", borderRadius: "4px" }}>You</span>}
                    </div>
                    <div style={{ color: T.inkFaint, fontSize: "12px", marginTop: "2px" }}>{entry.level} · {entry.streak} day streak</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: T.ink, fontWeight: 700, fontSize: "17px", letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums" }}>{entry.total}</div>
                    <div style={{ color: T.green, fontSize: "13px", fontWeight: 500 }}>{entry.gain}</div>
                  </div>
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
