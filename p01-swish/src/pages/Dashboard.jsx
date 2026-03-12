import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../tokens";
import { CHALLENGES } from "../data";
import supabase from "../lib/supabase";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import Sparkline from "../components/Sparkline";
import ProgressBar from "../components/ProgressBar";
import InsightsTile from "../components/InsightsTile";
import LeaguesTile from "../components/LeaguesTile";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

const PRANGE = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "ALL", days: 9999 },
];

const PerfTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: T.ink, color: T.white, padding: "8px 14px", borderRadius: "10px", fontSize: "13px", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>${p.value.toFixed(2)}</div>
      <div style={{ color: T.ghost, fontSize: "11px", marginTop: "2px" }}>{p.label}</div>
    </div>
  );
};

export default function Dashboard({ stocks, onTrade, holdings = [], cash = 10000, xp = 0, level = "Bronze", streak = 0, username = "trader", livePrices = {}, dbUser, saveSnapshot, totalTrades = 0, totalValue = 10000, portfolioGain = 0 }) {
  const navigate = useNavigate();

  const portfolioValue = holdings.reduce((sum, h) => {
    const shares = Number(h.shares);
    const livePrice = livePrices[h.ticker];
    const seedStock = stocks.find(x => x.ticker === h.ticker);
    const price = livePrice ?? seedStock?.price ?? Number(h.avg_cost);
    return sum + shares * price;
  }, 0);
  const total = portfolioValue + cash;
  const gain = total - 10000, gainPct = (gain / 10000) * 100;

  // Portfolio snapshots
  const [snapshots, setSnapshots] = useState([]);
  const [perfRange, setPerfRange] = useState("ALL");
  const [sessionDelta, setSessionDelta] = useState(null);

  // Global leaderboard preview
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbTab, setLbTab] = useState("global");
  const [dashLeagues, setDashLeagues] = useState([]);
  const [dashLeagueMembers, setDashLeagueMembers] = useState({});
  const [expandedDashLeague, setExpandedDashLeague] = useState(null);

  useEffect(() => {
    if (!dbUser) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("portfolio_snapshots")
          .select("total_value, created_at")
          .eq("user_id", dbUser.id)
          .order("created_at", { ascending: true });
        if (data?.length) {
          setSnapshots(data);
          const lastVal = Number(data[data.length - 1].total_value);
          const delta = total - lastVal;
          if (Math.abs(delta) > 0.01) setSessionDelta(delta);
        }
      } catch { /* ignore */ }
    })();
  }, [dbUser, total]);

  // Save snapshot on dashboard load
  useEffect(() => {
    if (dbUser && total > 0) saveSnapshot?.(total);
  }, [dbUser, total, saveSnapshot]);

  // Fetch global leaderboard
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leaderboard`);
        const data = await res.json();
        setLeaderboard((data.leaderboard || []).slice(0, 5));
      } catch { /* ignore */ }
    })();
  }, []);

  // Fetch user's leagues for dashboard leaderboard toggle
  useEffect(() => {
    if (!dbUser) return;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leagues/${dbUser.id}`);
        const data = await res.json();
        setDashLeagues(data.leagues || []);
      } catch { /* ignore */ }
    })();
  }, [dbUser]);

  const toggleDashLeague = async (leagueId) => {
    if (expandedDashLeague === leagueId) { setExpandedDashLeague(null); return; }
    setExpandedDashLeague(leagueId);
    if (!dashLeagueMembers[leagueId]) {
      try {
        const res = await fetch(`${baseUrl}/api/leagues/members/${leagueId}`);
        const data = await res.json();
        setDashLeagueMembers(prev => ({ ...prev, [leagueId]: data.members || [] }));
      } catch { /* ignore */ }
    }
  };

  const filteredSnapshots = (() => {
    const r = PRANGE.find(x => x.label === perfRange);
    const cutoff = Date.now() - r.days * 86400000;
    const filtered = snapshots.filter(s => new Date(s.created_at).getTime() > cutoff);
    return filtered.map(s => ({
      value: Number(s.total_value),
      label: new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  })();

  const perfColor = filteredSnapshots.length >= 2
    ? filteredSnapshots[filteredSnapshots.length - 1].value >= 10000 ? T.green : T.red
    : T.accent;

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "40px 28px 100px" }}>

      {/* Hero */}
      <Reveal>
        <Card hover={false} style={{ padding: "48px 52px", marginBottom: "20px", background: "linear-gradient(160deg,#ffffff 60%,#f0f7ff 100%)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
            <div>
              <div style={{ color: T.inkFaint, fontSize: "12px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "10px" }}>Portfolio Value</div>
              <div style={{ fontSize: "56px", fontWeight: 700, letterSpacing: "-2.5px", color: T.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                <span style={{ color: gain >= 0 ? T.green : T.red, fontSize: "17px", fontWeight: 600 }}>{gain >= 0 ? "▲" : "▼"} {gain >= 0 ? "+" : ""}{gainPct.toFixed(2)}%</span>
                <span style={{ color: T.inkFaint, fontSize: "15px" }}>{gain >= 0 ? "+" : "−"}${Math.abs(gain).toFixed(2)} all time</span>
              </div>
              {sessionDelta != null && (
                <div style={{ color: sessionDelta >= 0 ? T.green : T.red, fontSize: "13px", fontWeight: 500, marginTop: "6px", animation: "fadeIn .4s ease" }}>
                  {sessionDelta >= 0 ? "↑" : "↓"} {sessionDelta >= 0 ? "+" : ""}${sessionDelta.toFixed(2)} since last session
                </div>
              )}
            </div>
          </div>

          {/* Portfolio performance chart */}
          <div style={{ marginTop: "28px" }}>
            {filteredSnapshots.length >= 2 ? (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={filteredSnapshots} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <defs>
                      <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={perfColor} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={perfColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide />
                    <Tooltip content={<PerfTooltip />} cursor={{ stroke: T.ghost, strokeDasharray: "4 4" }} />
                    <Area type="monotone" dataKey="value" stroke={perfColor} strokeWidth={2} fill="url(#perfFill)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "10px" }}>
                  {PRANGE.map(r => (
                    <button key={r.label} onClick={() => setPerfRange(r.label)} style={{
                      background: perfRange === r.label ? T.accent : "transparent",
                      color: perfRange === r.label ? T.white : T.inkFaint,
                      border: "none", borderRadius: "6px", padding: "4px 12px",
                      fontSize: "11px", fontWeight: 600, cursor: "pointer", transition: "all .15s",
                    }}>{r.label}</button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: "20px 0", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>
                Keep trading to build your performance history
              </div>
            )}
          </div>

          <div style={{ display: "flex", marginTop: "24px", paddingTop: "28px", borderTop: `1px solid ${T.line}` }}>
            {[["Invested", `$${portfolioValue.toFixed(2)}`], ["Available Cash", `$${cash.toFixed(2)}`]].map((stat, i, arr) => (
              <div key={stat[0]} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ color: T.inkFaint, fontSize: "10.5px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "5px" }}>{stat[0]}</div>
                <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>{stat[1]}</div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* Your Progress */}
      <Reveal delay={0.06}>
        <Card style={{ padding: "28px 30px", marginBottom: "20px" }}>
          <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px", marginBottom: "22px" }}>Your Progress 🏆</div>
          {(() => {
            const LEVELS = [
              { name: "Bronze", emoji: "🥉", threshold: 0 },
              { name: "Silver", emoji: "🥈", threshold: 100 },
              { name: "Gold", emoji: "🥇", threshold: 300 },
              { name: "Platinum", emoji: "💎", threshold: 750 },
              { name: "Legend", emoji: "👑", threshold: 2000 },
            ];
            const currentIdx = LEVELS.findIndex(l => l.name === level);
            const nextLevel = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;
            const progressPct = nextLevel
              ? ((xp - LEVELS[currentIdx].threshold) / (nextLevel.threshold - LEVELS[currentIdx].threshold)) * 100
              : 100;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* XP */}
                <div style={{ background: T.bg, borderRadius: "14px", padding: "20px" }}>
                  <div style={{ color: T.ink, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}>{xp.toLocaleString()}</div>
                  <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "2px" }}>XP earned</div>
                  <div style={{ height: "6px", background: "rgba(0,0,0,.06)", borderRadius: "3px", overflow: "hidden", marginTop: "14px" }}>
                    <div style={{ height: "100%", width: `${Math.min(progressPct, 100)}%`, background: T.accent, borderRadius: "3px", transition: "width .4s ease" }} />
                  </div>
                  <div style={{ color: T.inkFaint, fontSize: "11px", marginTop: "6px", fontVariantNumeric: "tabular-nums" }}>
                    {nextLevel ? `${xp} / ${nextLevel.threshold} to ${nextLevel.name}` : "Max level reached!"}
                  </div>
                </div>
                {/* Level */}
                <div style={{ background: T.bg, borderRadius: "14px", padding: "20px" }}>
                  <div style={{ fontSize: "28px", lineHeight: 1 }}>{LEVELS[currentIdx]?.emoji}</div>
                  <div style={{ color: T.ink, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px", marginTop: "6px" }}>{level}</div>
                  <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "2px" }}>Current level</div>
                </div>
                {/* Streak */}
                <div style={{ background: T.bg, borderRadius: "14px", padding: "20px" }}>
                  <div style={{ color: T.ink, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}>🔥 {streak}</div>
                  <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "2px" }}>Day streak</div>
                </div>
                {/* Total trades */}
                <div style={{ background: T.bg, borderRadius: "14px", padding: "20px" }}>
                  <div style={{ color: T.ink, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}>{totalTrades.toLocaleString()}</div>
                  <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: "2px" }}>Total trades</div>
                </div>
              </div>
            );
          })()}
        </Card>
      </Reveal>

      {/* AI Insights */}
      <Reveal delay={0.1}>
        <div style={{ marginBottom: "20px" }}>
          <InsightsTile
            holdings={holdings} cash={cash} totalValue={totalValue}
            totalTrades={totalTrades} portfolioGain={portfolioGain}
            livePrices={livePrices} stocks={stocks}
          />
        </div>
      </Reveal>

      {/* Challenges + Leaderboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <Reveal delay={0.14}>
          <Card style={{ padding: "28px 30px", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>Challenges</div>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>See all</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {CHALLENGES.map(ch => (
                <div key={ch.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ color: T.ink, fontSize: "14px", fontWeight: 600, letterSpacing: "-0.2px" }}>{ch.title}</div>
                      <div style={{ color: T.inkSub, fontSize: "12px", marginTop: "2px" }}>{ch.desc}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", color: ch.color, background: `${ch.color}12`, padding: "3px 8px", borderRadius: "5px" }}>+{ch.xp} XP</div>
                      <div style={{ color: T.inkFaint, fontSize: "11px", marginTop: "3px" }}>{ch.due}</div>
                    </div>
                  </div>
                  <ProgressBar value={ch.progress} color={ch.color} />
                  <div style={{ color: T.inkFaint, fontSize: "11px", marginTop: "4px", textAlign: "right" }}>{ch.progress}%</div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.18}>
          <Card style={{ padding: "28px 30px", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "4px", background: T.bg, borderRadius: "8px", padding: "2px" }}>
                <button onClick={() => setLbTab("global")} style={{ background: lbTab === "global" ? T.white : "transparent", color: lbTab === "global" ? T.ink : T.inkFaint, border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", fontWeight: 600, cursor: "pointer", boxShadow: lbTab === "global" ? "0 1px 3px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>Global</button>
                <button onClick={() => setLbTab("leagues")} style={{ background: lbTab === "leagues" ? T.white : "transparent", color: lbTab === "leagues" ? T.ink : T.inkFaint, border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", fontWeight: 600, cursor: "pointer", boxShadow: lbTab === "leagues" ? "0 1px 3px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>Leagues</button>
              </div>
              <button onClick={() => navigate("/leaderboard")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>Full table</button>
            </div>

            {lbTab === "global" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {leaderboard.length === 0 ? (
                  <div style={{ color: T.inkFaint, fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No traders yet</div>
                ) : leaderboard.map((entry, i) => {
                  const rank = i + 1;
                  const isUser = entry.user_id === dbUser?.id;
                  return (
                    <div key={entry.user_id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "10px", background: isUser ? `${T.accent}08` : "transparent", border: isUser ? `1px solid ${T.accent}20` : "1px solid transparent" }}>
                      <div style={{ width: "22px", fontSize: "14px", textAlign: "center", color: [null, "#c9862a", "#8e8e93", "#7d4f2a"][rank] || T.inkFaint, fontWeight: 700 }}>
                        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                      </div>
                      <div style={{ flex: 1 }}><span style={{ color: isUser ? T.accent : T.ink, fontSize: "13px", fontWeight: isUser ? 700 : 500 }}>@{entry.username}</span></div>
                      <div style={{ color: entry.gain_pct >= 0 ? T.green : T.red, fontSize: "13px", fontWeight: 600 }}>
                        {entry.gain_pct >= 0 ? "+" : ""}{entry.gain_pct.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {dashLeagues.length === 0 ? (
                  <div style={{ color: T.inkFaint, fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No leagues yet</div>
                ) : dashLeagues.map(league => (
                  <div key={league.id}>
                    <div onClick={() => toggleDashLeague(league.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div>
                        <span style={{ color: T.ink, fontSize: "13px", fontWeight: 600 }}>{league.name}</span>
                        <span style={{ color: T.inkFaint, fontSize: "11px", marginLeft: "8px" }}>{league.member_count}</span>
                      </div>
                      <span style={{ color: T.inkFaint, fontSize: "10px", transform: expandedDashLeague === league.id ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
                    </div>
                    {expandedDashLeague === league.id && dashLeagueMembers[league.id] && (
                      <div style={{ padding: "4px 10px 8px", animation: "fadeIn .2s ease" }}>
                        {dashLeagueMembers[league.id].map((m, i) => (
                          <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", borderRadius: "6px", background: m.user_id === dbUser?.id ? `${T.accent}08` : "transparent" }}>
                            <span style={{ width: "18px", fontSize: "11px", fontWeight: 700, color: i < 3 ? ["#c9862a", "#8e8e93", "#7d4f2a"][i] : T.inkFaint, textAlign: "center" }}>
                              {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                            </span>
                            <span style={{ flex: 1, color: m.user_id === dbUser?.id ? T.accent : T.ink, fontSize: "12px", fontWeight: m.user_id === dbUser?.id ? 600 : 400 }}>@{m.username}</span>
                            <span style={{ color: m.gain_pct >= 0 ? T.green : T.red, fontSize: "12px", fontWeight: 600 }}>
                              {m.gain_pct >= 0 ? "+" : ""}{m.gain_pct.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Reveal>
      </div>

      {/* My Leagues */}
      <Reveal delay={0.22}>
        <div style={{ marginBottom: "20px" }}>
          <LeaguesTile userId={dbUser?.id} />
        </div>
      </Reveal>

      {/* Holdings */}
      <Reveal delay={0.26}>
        <Card style={{ padding: "28px 30px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>Your Holdings</div>
          </div>
          {holdings.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: T.inkSub, fontSize: "14px" }}>
              No holdings yet. Head to Markets to make your first trade.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(holdings.length, 3)},1fr)`, gap: "12px" }}>
              {holdings.map(h => {
                const s = stocks.find(x => x.ticker === h.ticker);
                if (!s) return null;
                const shares = Number(h.shares), avgCost = Number(h.avg_cost);
                const val = s.price * shares, cost = avgCost * shares, g = val - cost, gPct = cost > 0 ? (g / cost) * 100 : 0;
                return (
                  <div key={h.ticker} onClick={() => onTrade(s)} style={{ padding: "18px 20px", borderRadius: T.r, background: T.bg, border: `1px solid ${T.line}`, cursor: "pointer", transition: "all .18s ease" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.ghost; e.currentTarget.style.background = T.white; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.bg; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                      <div>
                        <div style={{ color: T.ink, fontWeight: 700, fontSize: "15px", letterSpacing: "-0.2px" }}>{s.ticker}</div>
                        <div style={{ color: T.inkSub, fontSize: "12px", marginTop: "2px" }}>{shares} shares</div>
                      </div>
                      <Sparkline positive={gPct >= 0} width={52} height={20} />
                    </div>
                    <div style={{ color: T.ink, fontWeight: 700, fontSize: "17px", letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums" }}>${val.toFixed(2)}</div>
                    <div style={{ color: gPct >= 0 ? T.green : T.red, fontSize: "13px", fontWeight: 500, marginTop: "2px" }}>{gPct >= 0 ? "+" : ""}{gPct.toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Reveal>

      {/* Market Movers */}
      <Reveal delay={0.3}>
        <Card style={{ padding: "28px 30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>Market Movers</div>
            <button onClick={() => navigate("/markets")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>All stocks</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "10px" }}>
            {[...stocks].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 5).map(s => (
              <div key={s.ticker} onClick={() => onTrade(s)} style={{ padding: "16px", borderRadius: T.r, background: T.bg, border: `1px solid ${T.line}`, cursor: "pointer", transition: "all .18s ease", textAlign: "center" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.ghost; e.currentTarget.style.background = T.white; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.bg; }}>
                <div style={{ color: T.ink, fontWeight: 700, fontSize: "14px", letterSpacing: "-0.2px", marginBottom: "8px" }}>{s.ticker}</div>
                <Sparkline positive={s.changePct >= 0} width={64} height={24} />
                <div style={{ marginTop: "8px" }}>
                  <div style={{ color: T.ink, fontWeight: 600, fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>${s.price.toFixed(2)}</div>
                  <div style={{ color: s.changePct >= 0 ? T.green : T.red, fontSize: "12px", fontWeight: 500, marginTop: "2px" }}>{s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
