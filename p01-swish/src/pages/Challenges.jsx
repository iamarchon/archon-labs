import { useState, useEffect, useCallback } from "react";
import { T } from "../tokens";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import Reveal from "../components/Reveal";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

const CATEGORIES = ["all", "trading", "portfolio", "streak", "learning"];
const DIFF_BADGE = { easy: { label: "Easy", bg: "#e8f5e9", color: T.green }, medium: { label: "Medium", bg: "#fff8e1", color: T.amber }, hard: { label: "Hard", bg: "#fce4ec", color: T.red } };

export default function Challenges({ dbUser, onClaimXp, fireConfetti }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [claimingId, setClaimingId] = useState(null);

  const fetchChallenges = useCallback(async () => {
    if (!dbUser?.id) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/challenges?userId=${dbUser.id}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error("Failed to load challenges:", err);
      setError("Could not load challenges. Please try again.");
    }
    setLoading(false);
  }, [dbUser?.id]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  const claimChallenge = async (challengeId) => {
    setClaimingId(challengeId);
    try {
      const res = await fetch(`${baseUrl}/api/challenges/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: dbUser.id, challengeId }),
      });
      const data = await res.json();
      if (data.success) {
        if (onClaimXp) onClaimXp(data.xpAwarded);
        if (fireConfetti) fireConfetti("trade");
        await fetchChallenges();
      }
    } catch { /* ignore */ }
    setClaimingId(null);
  };

  const daysUntilMonday = () => {
    const now = new Date();
    const day = now.getDay();
    return day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  };

  const filtered = filter === "all" ? challenges : challenges.filter(c => c.category === filter);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-1.2px", color: T.ink, margin: 0 }}>Challenges</h1>
          <p style={{ color: T.inkSub, fontSize: "15px", marginTop: "6px", marginBottom: 0 }}>Complete challenges to earn XP</p>
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <div style={{ display: "flex", gap: "4px", background: T.white, borderRadius: "10px", padding: "3px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", width: "fit-content", maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              background: filter === cat ? T.accent : "transparent",
              color: filter === cat ? T.white : T.inkSub,
              border: "none", borderRadius: "8px", padding: "7px 16px",
              fontSize: "12px", fontWeight: 600, cursor: "pointer",
              textTransform: "capitalize", transition: "all .15s",
              letterSpacing: "0.02em",
            }}>{cat}</button>
          ))}
        </div>
      </Reveal>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: T.inkFaint, fontSize: "14px" }}>Loading challenges...</div>
      ) : error ? (
        <Card style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ color: T.red, fontSize: "14px", marginBottom: "12px" }}>{error}</div>
          <button onClick={fetchChallenges} style={{ background: T.accent, color: T.white, border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ color: T.inkFaint, fontSize: "14px" }}>
            {challenges.length === 0 ? "No challenges available yet. Make some trades to get started!" : "No challenges in this category."}
          </div>
        </Card>
      ) : (
        <div className="challenges-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {filtered.map((ch, i) => {
            const claimable = ch.percent >= 100 && !ch.completedAt;
            const done = !!ch.completedAt;
            const diff = DIFF_BADGE[ch.difficulty] || DIFF_BADGE.easy;
            const barColor = done ? T.green : claimable ? T.green : T.accent;

            return (
              <Reveal key={ch.id} delay={0.04 + i * 0.03}>
                <Card style={{ padding: "24px 28px", height: "100%" }}>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: diff.bg, color: diff.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{diff.label}</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: T.bg, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.04em" }}>{ch.category}</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: ch.type === "weekly" ? "#e3f2fd" : T.bg, color: ch.type === "weekly" ? T.accent : T.inkFaint, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {ch.type === "weekly" ? "Weekly" : ch.type === "ongoing" ? "Ongoing" : "One-time"}
                    </span>
                  </div>

                  <div style={{ fontSize: "17px", fontWeight: 700, color: T.ink, letterSpacing: "-0.4px", marginBottom: "4px" }}>{ch.title}</div>
                  <div style={{ fontSize: "13px", color: T.inkSub, marginBottom: "18px" }}>{ch.description}</div>

                  <ProgressBar value={Math.min(ch.percent, 100)} color={barColor} height={7} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                    <span style={{ color: T.inkFaint, fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{ch.current} / {ch.target} · {Math.round(ch.percent)}%</span>
                    {ch.type === "weekly" && !done && (
                      <span style={{ color: T.inkFaint, fontSize: "11px" }}>Resets in {daysUntilMonday()} days</span>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                    {done ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: T.green, fontSize: "14px" }}>&#10003;</span>
                        <span style={{ color: T.green, fontSize: "12px", fontWeight: 600 }}>Completed</span>
                        {ch.completedAt && (
                          <span style={{ color: T.inkFaint, fontSize: "11px", marginLeft: "4px" }}>{new Date(ch.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    ) : claimable ? (
                      <button onClick={() => claimChallenge(ch.id)} disabled={claimingId === ch.id}
                        style={{ background: T.green, color: T.white, border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "12px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em", opacity: claimingId === ch.id ? 0.6 : 1, transition: "opacity .15s" }}>
                        {claimingId === ch.id ? "Claiming..." : `Claim +${ch.xpReward} XP`}
                      </button>
                    ) : (
                      <div />
                    )}
                    <div style={{ fontSize: "12px", fontWeight: 600, color: barColor, background: `${barColor}12`, padding: "4px 10px", borderRadius: "6px", whiteSpace: "nowrap", flexShrink: 0 }}>
                      +{ch.xpReward} XP
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
