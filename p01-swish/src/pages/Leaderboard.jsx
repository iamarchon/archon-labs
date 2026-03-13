import { useState, useEffect, useCallback } from "react";
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

function RankRow({ entry, rank, isUser }) {
  const level = xpToLevel(entry.xp || 0);
  const rankColors = [null, "#c9862a", "#8e8e93", "#7d4f2a"];
  return (
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
          <div style={{ color: (entry.gain_pct ?? 0) >= 0 ? T.green : T.red, fontSize: "13px", fontWeight: 500 }}>
            {(entry.gain_pct ?? 0) >= 0 ? "+" : ""}{(entry.gain_pct ?? 0).toFixed(1)}%
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Leaderboard({ userId }) {
  const [tab, setTab] = useState("global");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState([]);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [expandedLeague, setExpandedLeague] = useState(null);
  const [leagueMembers, setLeagueMembers] = useState({});

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

  useEffect(() => {
    if (!userId) { setLeaguesLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leagues/${userId}`);
        const data = await res.json();
        setLeagues(data.leagues || []);
      } catch { /* ignore */ }
      setLeaguesLoading(false);
    })();
  }, [userId]);

  const toggleExpand = useCallback(async (leagueId) => {
    if (expandedLeague === leagueId) { setExpandedLeague(null); return; }
    setExpandedLeague(leagueId);
    if (!leagueMembers[leagueId]) {
      try {
        const res = await fetch(`${baseUrl}/api/leagues/members/${leagueId}`);
        const data = await res.json();
        setLeagueMembers(prev => ({ ...prev, [leagueId]: data.members || [] }));
      } catch { /* ignore */ }
    }
  }, [expandedLeague, leagueMembers]);

  const copyCode = (code) => { navigator.clipboard?.writeText(code); };

  const tabStyle = (active) => ({
    background: active ? T.ink : "transparent",
    color: active ? T.white : T.inkSub,
    border: "none", borderRadius: "10px", padding: "8px 20px",
    fontSize: "14px", fontWeight: active ? 600 : 400,
    cursor: "pointer", transition: "all .18s ease",
  });

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink }}>Leaderboard</h1>
          <p style={{ color: T.inkSub, fontSize: "15px", marginTop: "5px" }}>See how you stack up</p>
        </div>
      </Reveal>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: T.bg, borderRadius: "12px", padding: "3px", marginBottom: "24px" }}>
        <button onClick={() => setTab("global")} style={tabStyle(tab === "global")}>Global 🌍</button>
        <button onClick={() => setTab("leagues")} style={tabStyle(tab === "leagues")}>My Leagues 🏆</button>
      </div>

      {/* Global tab */}
      {tab === "global" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", color: T.inkFaint, fontSize: "14px", padding: "40px 0" }}>Loading leaderboard...</div>
          ) : entries.length === 0 ? (
            <Card style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ color: T.inkSub, fontSize: "15px" }}>No traders yet. Be the first!</div>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {entries.map((entry, i) => (
                <Reveal key={entry.user_id} delay={i * .06}>
                  <RankRow entry={entry} rank={i + 1} isUser={entry.user_id === userId} />
                </Reveal>
              ))}
            </div>
          )}
        </>
      )}

      {/* Leagues tab */}
      {tab === "leagues" && (
        <>
          {leaguesLoading ? (
            <div style={{ textAlign: "center", color: T.inkFaint, fontSize: "14px", padding: "40px 0" }}>Loading leagues...</div>
          ) : leagues.length === 0 ? (
            <Card style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ color: T.inkSub, fontSize: "15px" }}>Join or create a league from your Dashboard</div>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {leagues.map(league => (
                <Reveal key={league.id}>
                  <Card style={{ padding: "0", overflow: "hidden" }}>
                    <div onClick={() => toggleExpand(league.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", cursor: "pointer", transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg}
                      onMouseLeave={e => e.currentTarget.style.background = T.white}>
                      <div>
                        <div style={{ color: T.ink, fontSize: "16px", fontWeight: 600, letterSpacing: "-0.2px" }}>{league.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                          <span style={{ color: T.inkFaint, fontSize: "13px" }}>{league.member_count} member{league.member_count !== 1 ? "s" : ""}</span>
                          <span onClick={e => { e.stopPropagation(); copyCode(league.code); }}
                            style={{ color: T.accent, fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
                            Code: {league.code} 📋
                          </span>
                        </div>
                      </div>
                      <span style={{ color: T.inkFaint, fontSize: "12px", transform: expandedLeague === league.id ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
                    </div>

                    {expandedLeague === league.id && (
                      <div style={{ borderTop: `1px solid ${T.line}`, padding: "12px 28px 20px", animation: "fadeIn .2s ease" }}>
                        {!leagueMembers[league.id] ? (
                          <div style={{ color: T.inkFaint, fontSize: "13px", padding: "12px 0" }}>Loading...</div>
                        ) : leagueMembers[league.id].length === 0 ? (
                          <div style={{ color: T.inkFaint, fontSize: "13px", padding: "12px 0" }}>No members yet</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {leagueMembers[league.id].map((m, i) => (
                              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "10px 12px", borderRadius: "10px", background: m.user_id === userId ? `${T.accent}08` : "transparent" }}>
                                <span style={{ width: "24px", fontSize: "14px", fontWeight: 700, color: i < 3 ? ["#c9862a", "#8e8e93", "#7d4f2a"][i] : T.inkFaint, textAlign: "center" }}>
                                  {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                                </span>
                                <span style={{ flex: 1, color: m.user_id === userId ? T.accent : T.ink, fontSize: "14px", fontWeight: m.user_id === userId ? 600 : 400 }}>@{m.username}</span>
                                <span style={{ color: (m.gain_pct ?? 0) >= 0 ? T.green : T.red, fontSize: "14px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                  {(m.gain_pct ?? 0) >= 0 ? "+" : ""}{(m.gain_pct ?? 0).toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
