import { useNavigate } from "react-router-dom";
import { T } from "../tokens";
import { LEADERBOARD, CHALLENGES } from "../data";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import Sparkline from "../components/Sparkline";
import ProgressBar from "../components/ProgressBar";

export default function Dashboard({ stocks, onTrade, holdings = [], cash = 10000, xp = 0, level = "Bronze", streak = 0, username = "trader", livePrices = {} }) {
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
  const barData = [38,45,42,58,52,67,61,75,70,82,78,91,86,100];

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
            </div>
            <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "56px" }}>
              {barData.map((h, i) => (
                <div key={i} style={{ width: "14px", height: `${h}%`, background: i === barData.length - 1 ? T.accent : `${T.accent}22`, borderRadius: "4px 4px 0 0", transition: "height .8s cubic-bezier(.25,.46,.45,.94)" }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", marginTop: "36px", paddingTop: "28px", borderTop: `1px solid ${T.line}` }}>
            {[["Invested", `$${portfolioValue.toFixed(2)}`], ["Available Cash", `$${cash.toFixed(2)}`], ["XP", xp.toLocaleString()], ["Level", level], ["Streak", `${streak} days 🔥`]].map((stat, i, arr) => (
              <div key={stat[0]} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ color: T.inkFaint, fontSize: "10.5px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "5px" }}>{stat[0]}</div>
                <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>{stat[1]}</div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* Challenges + Leaderboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <Reveal delay={0.08}>
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

        <Reveal delay={0.12}>
          <Card style={{ padding: "28px 30px", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>Leaderboard</div>
              <button onClick={() => navigate("/leaderboard")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>Full table</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {LEADERBOARD.map(entry => (
                <div key={entry.rank} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "10px", background: entry.isUser ? `${T.accent}08` : "transparent", border: entry.isUser ? `1px solid ${T.accent}20` : "1px solid transparent" }}>
                  <div style={{ width: "22px", fontSize: "14px", textAlign: "center", color: [null, "#c9862a", "#8e8e93", "#7d4f2a"][entry.rank] || T.inkFaint, fontWeight: 700 }}>
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </div>
                  <div style={{ flex: 1 }}><span style={{ color: entry.isUser ? T.accent : T.ink, fontSize: "13px", fontWeight: entry.isUser ? 700 : 500 }}>@{entry.user}</span></div>
                  <div style={{ color: T.green, fontSize: "13px", fontWeight: 600 }}>{entry.gain}</div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>

      {/* Holdings */}
      <Reveal delay={0.16}>
        <Card style={{ padding: "28px 30px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>Your Holdings</div>
            <button onClick={() => navigate("/portfolio")} style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "13px", fontWeight: 500 }}>View portfolio</button>
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
      <Reveal delay={0.2}>
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
