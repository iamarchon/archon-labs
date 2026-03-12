import { useState, useEffect } from "react";
import { T } from "../tokens";
import Reveal from "../components/Reveal";
import Card from "../components/Card";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

function xpToLevel(xp) {
  if (xp >= 2000) return "Legend";
  if (xp >= 750) return "Platinum";
  if (xp >= 300) return "Gold";
  if (xp >= 100) return "Silver";
  return "Bronze";
}

export default function Leaderboard({ userId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leaderboard`);
        const data = await res.json();
        setEntries(data.leaderboard || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink }}>Leaderboard</h1>
          <p style={{ color: T.inkSub, fontSize: "15px", marginTop: "5px" }}>Top traders by portfolio gain</p>
        </div>
      </Reveal>

      {loading ? (
        <div style={{ textAlign: "center", color: T.inkFaint, fontSize: "14px", padding: "40px 0" }}>Loading leaderboard...</div>
      ) : entries.length === 0 ? (
        <Card style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ color: T.inkSub, fontSize: "15px" }}>No traders yet. Be the first!</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isUser = entry.user_id === userId;
            const level = xpToLevel(entry.xp);
            const rankColors = [null, "#c9862a", "#8e8e93", "#7d4f2a"];
            return (
              <Reveal key={entry.user_id} delay={i * .06}>
                <Card style={{ padding: "22px 28px", boxShadow: isUser ? `0 0 0 2px ${T.accent}30, 0 4px 20px rgba(0,0,0,.07)` : "0 2px 12px rgba(0,0,0,.05), 0 0 0 1px rgba(0,0,0,.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ fontSize: "18px", width: "28px", textAlign: "center", fontWeight: 800, color: rankColors[rank] || T.inkFaint }}>
                      {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                    </div>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: isUser ? `${T.accent}12` : T.bg, border: isUser ? `1.5px solid ${T.accent}35` : `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: isUser ? T.accent : T.inkFaint, fontSize: "15px", fontWeight: 700 }}>{entry.username?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: isUser ? T.accent : T.ink, fontWeight: 600, fontSize: "15px", letterSpacing: "-0.2px" }}>@{entry.username}</span>
                        {isUser && <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: T.accent, background: `${T.accent}12`, padding: "2px 7px", borderRadius: "4px" }}>You</span>}
                      </div>
                      <div style={{ color: T.inkFaint, fontSize: "12px", marginTop: "2px" }}>{level}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: T.ink, fontWeight: 700, fontSize: "17px", letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums" }}>
                        ${entry.total_value?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ color: entry.gain_pct >= 0 ? T.green : T.red, fontSize: "13px", fontWeight: 500 }}>
                        {entry.gain_pct >= 0 ? "+" : ""}{entry.gain_pct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
