import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   TOKENS
───────────────────────────────────────────────────────────────────────────── */
const T = {
  white:   "#ffffff",
  bg:      "#f5f5f7",
  ink:     "#1d1d1f",
  inkMid:  "#424245",
  inkSub:  "#6e6e73",
  inkFaint:"#86868b",
  line:    "#e8e8ed",
  ghost:   "#d2d2d7",
  accent:  "#0071e3",
  green:   "#1a7f3c",
  greenBg: "#f0faf4",
  red:     "#c0392b",
  redBg:   "#fdf2f2",
  amber:   "#b45309",
  amberBg: "#fffbeb",
  r:       "16px",
  rLg:     "20px",
};

/* ─────────────────────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────────────────────── */
const STOCKS = [
  { ticker:"AAPL",  name:"Apple Inc.",      price:189.30, changePct:+0.66 },
  { ticker:"NVDA",  name:"NVIDIA Corp.",    price:875.40, changePct:+1.48 },
  { ticker:"TSLA",  name:"Tesla Inc.",      price:248.50, changePct:-1.27 },
  { ticker:"AMZN",  name:"Amazon.com",      price:178.25, changePct:+1.19 },
  { ticker:"GOOGL", name:"Alphabet Inc.",   price:141.80, changePct:+0.67 },
  { ticker:"NFLX",  name:"Netflix Inc.",    price:485.60, changePct:-1.30 },
  { ticker:"MSFT",  name:"Microsoft Corp.", price:378.90, changePct:+1.20 },
  { ticker:"RBLX",  name:"Roblox Corp.",    price:42.15,  changePct:+2.06 },
  { ticker:"SPOT",  name:"Spotify Tech.",   price:248.70, changePct:+1.30 },
  { ticker:"DIS",   name:"Walt Disney Co.", price:112.40, changePct:-1.58 },
];

const HOLDINGS = [
  { ticker:"AAPL", shares:3,  avgCost:182.50 },
  { ticker:"NVDA", shares:2,  avgCost:845.00 },
  { ticker:"RBLX", shares:10, avgCost:38.40  },
];

const LEADERBOARD = [
  { rank:1, user:"portfolio_pro",  level:"Legend",  total:"$15,842", gain:"+58.4%", streak:14 },
  { rank:2, user:"market_maven",   level:"Diamond", total:"$13,200", gain:"+32.0%", streak:9  },
  { rank:3, user:"hoops_investor", level:"Gold",    total:"$11,480", gain:"+14.8%", streak:7  },
  { rank:4, user:"you",            level:"Silver",  total:"$10,840", gain:"+8.4%",  streak:5, isUser:true },
  { rank:5, user:"rblx_trader",    level:"Silver",  total:"$10,120", gain:"+1.2%",  streak:2  },
];

const CHALLENGES = [
  { id:1, title:"Beat the S&P 500",       desc:"Outperform the index by end of week",    xp:200, progress:62,  due:"3 days",  color: T.accent },
  { id:2, title:"Diversify your portfolio",desc:"Hold 4 or more different stocks",        xp:150, progress:75,  due:"Today",   color: T.green  },
  { id:3, title:"Study a new sector",      desc:"Read 2 Learn articles this week",        xp:100, progress:50,  due:"4 days",  color: T.amber  },
];

const LESSONS = [
  { title:"What is a Stock?",      desc:"Own a piece of your favorite companies",   xp:50,  done:true  },
  { title:"Reading Price Charts",  desc:"Spot trends before they become obvious",    xp:75,  done:true  },
  { title:"Buy vs. Sell",          desc:"When to enter and exit a position",         xp:100, done:false },
  { title:"Risk Management",       desc:"Why diversification actually matters",      xp:125, done:false },
  { title:"Building a Portfolio",  desc:"Thinking in decades, not days",             xp:150, done:false },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────────────────────────────── */
function useReveal(delay = 0) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, vis, delay];
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────────────────────────────────────────── */
const Reveal = ({ children, delay = 0, style = {} }) => {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.65s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s,
                   transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
};

const Card = ({ children, style = {}, hover = true, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: T.white,
        borderRadius: T.rLg,
        boxShadow: hov
          ? "0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)"
          : "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow 0.22s ease, transform 0.22s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Sparkline = ({ positive, width = 72, height = 28 }) => {
  const pts = positive
    ? [22, 19, 23, 16, 11, 13, 9, 6, 8, 2]
    : [4,  7,  5,  11, 14, 10, 17, 13, 19, 22];
  const max = Math.max(...pts), min = Math.min(...pts), range = max - min || 1;
  const coords = pts.map((p, i) =>
    `${(i / (pts.length - 1)) * width},${height - ((p - min) / range) * (height - 6) - 3}`
  );
  const color = positive ? T.green : T.red;
  const uid = `s${positive ? "p" : "n"}${width}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={`M 0,${height} L ${coords.join(" L ")} L ${width},${height} Z`} fill={`url(#${uid})`} />
      <path d={`M ${coords.join(" L ")}`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const AnimatedPrice = ({ value }) => {
  const [flash, setFlash] = useState(null);
  const prev = useRef(value);
  useEffect(() => {
    if (Math.abs(value - prev.current) > 0.005) {
      setFlash(value > prev.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 700);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <span style={{
      transition: "color 0.45s ease",
      color: flash === "up" ? T.green : flash === "down" ? T.red : T.ink,
      fontVariantNumeric: "tabular-nums",
    }}>
      ${value.toFixed(2)}
    </span>
  );
};

const ProgressBar = ({ value, color = T.accent, height = 6 }) => (
  <div style={{ height, background: T.bg, borderRadius: height, overflow:"hidden" }}>
    <div style={{
      width: `${value}%`, height: "100%",
      background: color, borderRadius: height,
      transition: "width 1s cubic-bezier(0.25,0.46,0.45,0.94)",
    }} />
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   NAV
───────────────────────────────────────────────────────────────────────────── */
const NAV = [
  { id:"dashboard",   label:"Dashboard"   },
  { id:"markets",     label:"Markets"     },
  { id:"portfolio",   label:"Portfolio"   },
  { id:"learn",       label:"Learn"       },
  { id:"leaderboard", label:"Leaderboard" },
  { id:"coach",       label:"Coach"       },
];

const TopNav = ({ page, setPage }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position:"fixed", top:0, left:0, right:0, zIndex:100,
      height:"52px",
      background: scrolled ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.76)",
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      borderBottom: `1px solid ${scrolled ? T.line : "transparent"}`,
      transition: "border-color 0.3s ease, background 0.3s ease",
    }}>
      <div style={{ maxWidth:"1020px", margin:"0 auto", height:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px" }}>

        {/* Logo */}
        <div onClick={() => setPage("dashboard")}
          style={{ fontSize:"17px", fontWeight:700, letterSpacing:"-0.4px", color:T.ink, cursor:"pointer", userSelect:"none" }}>
          swish
          <span style={{ color:T.accent, marginLeft:"1px" }}>.</span>
        </div>

        {/* Links */}
        <nav style={{ display:"flex", alignItems:"center" }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              background:"none", border:"none", cursor:"pointer",
              padding:"6px 13px", borderRadius:"8px",
              color: page === item.id ? T.ink : T.inkSub,
              fontSize:"13px", fontWeight: page === item.id ? 600 : 400,
              position:"relative",
              transition:"color 0.18s ease",
            }}
              onMouseEnter={e => { if (page !== item.id) e.currentTarget.style.color = T.ink; }}
              onMouseLeave={e => { if (page !== item.id) e.currentTarget.style.color = T.inkSub; }}>
              {item.label}
              {page === item.id && (
                <span style={{ position:"absolute", bottom:"-1px", left:"50%", transform:"translateX(-50%)", width:"16px", height:"2px", background:T.accent, borderRadius:"2px" }} />
              )}
            </button>
          ))}
        </nav>

        {/* XP badge */}
        <div style={{ fontSize:"12px", color:T.inkSub, background:T.bg, padding:"5px 13px", borderRadius:"20px", fontWeight:500, letterSpacing:"-0.1px" }}>
          ⭐ 2,840 XP · Silver
        </div>
      </div>
    </header>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   TICKER
───────────────────────────────────────────────────────────────────────────── */
const TickerStrip = ({ stocks }) => {
  const doubled = [...stocks, ...stocks];
  return (
    <div style={{ overflow:"hidden", height:"33px", display:"flex", alignItems:"center", background:T.white, borderBottom:`1px solid ${T.line}` }}>
      <div style={{ display:"flex", gap:"48px", whiteSpace:"nowrap", animation:"ticker 60s linear infinite" }}>
        {doubled.map((s, i) => (
          <span key={i} style={{ display:"inline-flex", gap:"10px", alignItems:"center", fontSize:"11.5px" }}>
            <span style={{ color:T.inkFaint, fontWeight:500 }}>{s.ticker}</span>
            <span style={{ color:T.ink, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>${s.price.toFixed(2)}</span>
            <span style={{ color: s.changePct >= 0 ? T.green : T.red, fontWeight:500 }}>
              {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   TRADE MODAL
───────────────────────────────────────────────────────────────────────────── */
const TradeModal = ({ stock, onClose, onTrade }) => {
  const [action, setAction] = useState("BUY");
  const [shares, setShares] = useState(1);
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const total = (stock.price * shares).toFixed(2);

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0,
      background:"rgba(0,0,0,0.22)",
      zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
      animation:"fadeIn 0.16s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:T.white, borderRadius:"22px",
        padding:"38px", width:"400px",
        boxShadow:"0 40px 80px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
        animation:"sheetUp 0.26s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"28px" }}>
          <div>
            <div style={{ color:T.ink, fontSize:"24px", fontWeight:700, letterSpacing:"-0.6px" }}>{stock.ticker}</div>
            <div style={{ color:T.inkSub, fontSize:"14px", marginTop:"2px" }}>{stock.name}</div>
          </div>
          <button onClick={onClose} style={{ background:T.bg, border:"none", borderRadius:"50%", width:"32px", height:"32px", cursor:"pointer", color:T.inkSub, fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = T.line}
            onMouseLeave={e => e.currentTarget.style.background = T.bg}>×</button>
        </div>

        {/* Toggle */}
        <div style={{ display:"flex", background:T.bg, borderRadius:"11px", padding:"3px", marginBottom:"24px" }}>
          {["BUY","SELL"].map(a => (
            <button key={a} onClick={() => setAction(a)} style={{
              flex:1, padding:"10px", borderRadius:"9px", border:"none", cursor:"pointer",
              background: action === a ? T.white : "transparent",
              color: action === a ? T.ink : T.inkSub,
              fontWeight: action === a ? 600 : 400, fontSize:"14px",
              boxShadow: action === a ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition:"all 0.18s ease",
            }}>{a}</button>
          ))}
        </div>

        {/* Info */}
        <div style={{ background:T.bg, borderRadius:"12px", padding:"18px", marginBottom:"20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", paddingBottom:"13px", borderBottom:`1px solid ${T.line}` }}>
            <span style={{ color:T.inkSub, fontSize:"14px" }}>Market Price</span>
            <span style={{ color:T.ink, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>${stock.price.toFixed(2)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"13px" }}>
            <span style={{ color:T.inkSub, fontSize:"14px" }}>Shares</span>
            <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
              <button onClick={() => setShares(Math.max(1, shares-1))} style={{ width:"30px", height:"30px", borderRadius:"50%", background:T.line, border:"none", cursor:"pointer", fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s" }}>−</button>
              <span style={{ color:T.ink, fontWeight:600, fontSize:"18px", minWidth:"22px", textAlign:"center", fontVariantNumeric:"tabular-nums" }}>{shares}</span>
              <button onClick={() => setShares(shares+1)} style={{ width:"30px", height:"30px", borderRadius:"50%", background:T.line, border:"none", cursor:"pointer", fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s" }}>+</button>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"22px", padding:"0 2px" }}>
          <span style={{ color:T.inkSub, fontSize:"14px" }}>Total</span>
          <span style={{ color:T.ink, fontWeight:700, fontSize:"26px", letterSpacing:"-0.8px", fontVariantNumeric:"tabular-nums" }}>${total}</span>
        </div>

        <button onClick={() => { onTrade(stock, action, shares); onClose(); }} style={{
          width:"100%", padding:"15px", borderRadius:"12px", border:"none", cursor:"pointer",
          background: action === "BUY" ? T.accent : T.red,
          color:T.white, fontWeight:600, fontSize:"15px", letterSpacing:"-0.1px",
          transition:"opacity 0.15s ease",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          {action === "BUY" ? "Buy" : "Sell"} {shares} share{shares > 1 ? "s" : ""} of {stock.ticker}
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD  —  the home screen
───────────────────────────────────────────────────────────────────────────── */
const DashboardPage = ({ stocks, onTrade, onNavigate }) => {
  const portfolioValue = HOLDINGS.reduce((sum, h) => {
    const s = stocks.find(x => x.ticker === h.ticker);
    return sum + (s ? s.price * h.shares : 0);
  }, 0);
  const cash = 4840, total = portfolioValue + cash;
  const gain = total - 10000, gainPct = (gain / 10000) * 100;
  const barData = [38, 45, 42, 58, 52, 67, 61, 75, 70, 82, 78, 91, 86, 100];

  return (
    <div style={{ maxWidth:"960px", margin:"0 auto", padding:"40px 28px 100px" }}>

      {/* ── Hero: Portfolio Value ─────────────────────────── */}
      <Reveal>
        <Card hover={false} style={{ padding:"48px 52px", marginBottom:"20px", background:"linear-gradient(160deg,#ffffff 60%,#f0f7ff 100%)" }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:"32px" }}>
            <div>
              <div style={{ color:T.inkFaint, fontSize:"13px", fontWeight:500, letterSpacing:"0.02em", textTransform:"uppercase", marginBottom:"10px" }}>
                Portfolio Value
              </div>
              <div style={{ fontSize:"56px", fontWeight:700, letterSpacing:"-2.5px", color:T.ink, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>
                ${total.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"12px" }}>
                <span style={{ color:T.green, fontSize:"17px", fontWeight:600, letterSpacing:"-0.3px" }}>▲ +{gainPct.toFixed(2)}%</span>
                <span style={{ color:T.inkFaint, fontSize:"15px" }}>+${gain.toFixed(2)} all time</span>
              </div>
            </div>

            {/* Sparkbar */}
            <div style={{ display:"flex", gap:"4px", alignItems:"flex-end", height:"56px" }}>
              {barData.map((h, i) => (
                <div key={i} style={{
                  width:"14px", height:`${h}%`,
                  background: i === barData.length - 1 ? T.accent : `${T.accent}22`,
                  borderRadius:"4px 4px 0 0",
                  transition:"height 0.8s cubic-bezier(0.25,0.46,0.45,0.94)",
                }} />
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display:"flex", gap:"0", marginTop:"36px", paddingTop:"28px", borderTop:`1px solid ${T.line}` }}>
            {[
              { label:"Invested",  value:`$${portfolioValue.toFixed(2)}` },
              { label:"Cash",      value:`$${cash.toFixed(2)}` },
              { label:"XP",        value:"2,840" },
              { label:"Rank",      value:"#4" },
              { label:"Streak",    value:"5 days 🔥" },
            ].map((stat, i, arr) => (
              <div key={stat.label} style={{
                flex:1, textAlign:"center",
                borderRight: i < arr.length - 1 ? `1px solid ${T.line}` : "none",
              }}>
                <div style={{ color:T.inkFaint, fontSize:"11px", fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:"6px" }}>{stat.label}</div>
                <div style={{ color:T.ink, fontSize:"16px", fontWeight:700, letterSpacing:"-0.3px" }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* ── Two columns ──────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginBottom:"20px" }}>

        {/* Challenges */}
        <Reveal delay={0.08}>
          <Card style={{ padding:"28px 30px", height:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"22px" }}>
              <div style={{ color:T.ink, fontSize:"16px", fontWeight:700, letterSpacing:"-0.3px" }}>Challenges</div>
              <button onClick={() => {}} style={{ background:"none", border:"none", cursor:"pointer", color:T.accent, fontSize:"13px", fontWeight:500 }}>See all</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
              {CHALLENGES.map(ch => (
                <div key={ch.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
                    <div>
                      <div style={{ color:T.ink, fontSize:"14px", fontWeight:600, letterSpacing:"-0.2px" }}>{ch.title}</div>
                      <div style={{ color:T.inkSub, fontSize:"12px", marginTop:"2px" }}>{ch.desc}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0, marginLeft:"12px" }}>
                      <div style={{ fontSize:"11px", fontWeight:600, letterSpacing:"0.04em", color:ch.color, background:`${ch.color}12`, padding:"3px 8px", borderRadius:"5px" }}>+{ch.xp} XP</div>
                      <div style={{ color:T.inkFaint, fontSize:"11px", marginTop:"3px" }}>{ch.due}</div>
                    </div>
                  </div>
                  <ProgressBar value={ch.progress} color={ch.color} />
                  <div style={{ color:T.inkFaint, fontSize:"11px", marginTop:"4px", textAlign:"right" }}>{ch.progress}%</div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        {/* Leaderboard preview */}
        <Reveal delay={0.12}>
          <Card style={{ padding:"28px 30px", height:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"22px" }}>
              <div style={{ color:T.ink, fontSize:"16px", fontWeight:700, letterSpacing:"-0.3px" }}>Leaderboard</div>
              <button onClick={() => onNavigate("leaderboard")} style={{ background:"none", border:"none", cursor:"pointer", color:T.accent, fontSize:"13px", fontWeight:500 }}>Full table</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
              {LEADERBOARD.map((entry, i) => {
                const rankColors = [null, "#c9862a","#8e8e93","#7d4f2a"];
                return (
                  <div key={entry.rank} style={{
                    display:"flex", alignItems:"center", gap:"12px",
                    padding:"10px 12px", borderRadius:"10px",
                    background: entry.isUser ? `${T.accent}08` : "transparent",
                    border: entry.isUser ? `1px solid ${T.accent}20` : "1px solid transparent",
                    transition:"background 0.15s",
                  }}>
                    <div style={{ width:"22px", fontSize:"14px", textAlign:"center", color: rankColors[entry.rank] || T.inkFaint, fontWeight:700 }}>
                      {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank-1] : `#${entry.rank}`}
                    </div>
                    <div style={{ flex:1 }}>
                      <span style={{ color: entry.isUser ? T.accent : T.ink, fontSize:"13px", fontWeight: entry.isUser ? 700 : 500 }}>
                        @{entry.user}
                      </span>
                    </div>
                    <div style={{ color:T.green, fontSize:"13px", fontWeight:600 }}>{entry.gain}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Reveal>
      </div>

      {/* ── Holdings row ─────────────────────────────────── */}
      <Reveal delay={0.16}>
        <Card style={{ padding:"28px 30px", marginBottom:"20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <div style={{ color:T.ink, fontSize:"16px", fontWeight:700, letterSpacing:"-0.3px" }}>Your Holdings</div>
            <button onClick={() => onNavigate("portfolio")} style={{ background:"none", border:"none", cursor:"pointer", color:T.accent, fontSize:"13px", fontWeight:500 }}>View portfolio</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px" }}>
            {HOLDINGS.map(h => {
              const s = stocks.find(x => x.ticker === h.ticker);
              if (!s) return null;
              const val = s.price * h.shares, cost = h.avgCost * h.shares;
              const g = val - cost, gPct = (g / cost) * 100;
              return (
                <div key={h.ticker} onClick={() => onTrade(s)} style={{
                  padding:"18px 20px", borderRadius:T.r,
                  background:T.bg, border:`1px solid ${T.line}`,
                  cursor:"pointer", transition:"border-color 0.18s ease, background 0.18s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.ghost; e.currentTarget.style.background = T.white; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.bg; }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"14px" }}>
                    <div>
                      <div style={{ color:T.ink, fontWeight:700, fontSize:"15px", letterSpacing:"-0.2px" }}>{s.ticker}</div>
                      <div style={{ color:T.inkSub, fontSize:"12px", marginTop:"2px" }}>{h.shares} shares</div>
                    </div>
                    <Sparkline positive={gPct >= 0} width={52} height={20} />
                  </div>
                  <div style={{ color:T.ink, fontWeight:700, fontSize:"17px", letterSpacing:"-0.4px", fontVariantNumeric:"tabular-nums" }}>${val.toFixed(2)}</div>
                  <div style={{ color: gPct >= 0 ? T.green : T.red, fontSize:"13px", fontWeight:500, marginTop:"2px" }}>{gPct >= 0 ? "+" : ""}{gPct.toFixed(2)}%</div>
                </div>
              );
            })}
          </div>
        </Card>
      </Reveal>

      {/* ── Market movers ─────────────────────────────────── */}
      <Reveal delay={0.2}>
        <Card style={{ padding:"28px 30px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <div style={{ color:T.ink, fontSize:"16px", fontWeight:700, letterSpacing:"-0.3px" }}>Market Movers</div>
            <button onClick={() => onNavigate("markets")} style={{ background:"none", border:"none", cursor:"pointer", color:T.accent, fontSize:"13px", fontWeight:500 }}>All stocks</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px" }}>
            {[...stocks].sort((a,b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0,5).map(s => (
              <div key={s.ticker} onClick={() => onTrade(s)} style={{
                padding:"16px", borderRadius:T.r,
                background:T.bg, border:`1px solid ${T.line}`,
                cursor:"pointer", transition:"all 0.18s ease",
                textAlign:"center",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.ghost; e.currentTarget.style.background = T.white; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.bg; }}>
                <div style={{ color:T.ink, fontWeight:700, fontSize:"14px", letterSpacing:"-0.2px", marginBottom:"8px" }}>{s.ticker}</div>
                <Sparkline positive={s.changePct >= 0} width={64} height={24} />
                <div style={{ marginTop:"8px" }}>
                  <div style={{ color:T.ink, fontWeight:600, fontSize:"13px", fontVariantNumeric:"tabular-nums" }}>${s.price.toFixed(2)}</div>
                  <div style={{ color: s.changePct >= 0 ? T.green : T.red, fontSize:"12px", fontWeight:500, marginTop:"2px" }}>
                    {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MARKETS
───────────────────────────────────────────────────────────────────────────── */
const MarketsPage = ({ stocks, onTrade }) => (
  <div style={{ maxWidth:"860px", margin:"0 auto", padding:"40px 28px 100px" }}>
    <Reveal>
      <div style={{ marginBottom:"28px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, letterSpacing:"-0.8px", color:T.ink }}>Markets</h1>
        <p style={{ color:T.inkSub, fontSize:"15px", marginTop:"5px" }}>Live prices · updates every 3s</p>
      </div>
    </Reveal>
    <Reveal delay={0.08}>
      <Card hover={false} style={{ overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 130px 100px 88px", padding:"11px 26px", background:T.bg, borderBottom:`1px solid ${T.line}` }}>
          {["Ticker","Company","Price","Change",""].map((h, i) => (
            <div key={i} style={{ color:T.inkFaint, fontSize:"10.5px", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", textAlign: i > 1 ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        {stocks.map((s, i) => (
          <div key={s.ticker} onClick={() => onTrade(s)} style={{
            display:"grid", gridTemplateColumns:"80px 1fr 130px 100px 88px",
            padding:"15px 26px", borderBottom: i < stocks.length-1 ? `1px solid ${T.line}` : "none",
            cursor:"pointer", alignItems:"center", transition:"background 0.14s ease",
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ color:T.ink, fontWeight:700, fontSize:"14px", letterSpacing:"-0.2px" }}>{s.ticker}</div>
            <div style={{ color:T.inkSub, fontSize:"14px" }}>{s.name}</div>
            <div style={{ textAlign:"right", fontWeight:600, fontSize:"15px" }}><AnimatedPrice value={s.price} /></div>
            <div style={{ textAlign:"right", color: s.changePct >= 0 ? T.green : T.red, fontSize:"14px", fontWeight:500 }}>
              {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end" }}><Sparkline positive={s.changePct >= 0} width={68} height={26} /></div>
          </div>
        ))}
      </Card>
    </Reveal>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   PORTFOLIO
───────────────────────────────────────────────────────────────────────────── */
const PortfolioPage = ({ stocks }) => {
  const portfolioValue = HOLDINGS.reduce((sum, h) => { const s = stocks.find(x => x.ticker === h.ticker); return sum + (s ? s.price * h.shares : 0); }, 0);
  const cash = 4840, total = portfolioValue + cash, gain = total - 10000, gainPct = (gain / 10000) * 100;
  const barData = [38, 45, 42, 58, 52, 67, 61, 75, 70, 82, 78, 91, 86, 100];

  return (
    <div style={{ maxWidth:"860px", margin:"0 auto", padding:"40px 28px 100px" }}>
      <Reveal>
        <Card hover={false} style={{ padding:"52px", marginBottom:"20px", textAlign:"center" }}>
          <div style={{ color:T.inkFaint, fontSize:"12px", fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:"10px" }}>Total Portfolio Value</div>
          <div style={{ fontSize:"60px", fontWeight:700, letterSpacing:"-2.5px", color:T.ink, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>${total.toFixed(2)}</div>
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:"10px", marginTop:"12px" }}>
            <span style={{ color:T.green, fontSize:"17px", fontWeight:600 }}>▲ +{gainPct.toFixed(2)}%</span>
            <span style={{ color:T.inkFaint, fontSize:"15px" }}>+${gain.toFixed(2)} all time</span>
          </div>
          <div style={{ display:"flex", gap:"4px", alignItems:"flex-end", height:"48px", justifyContent:"center", marginTop:"28px", padding:"0 60px" }}>
            {barData.map((h, i) => (
              <div key={i} style={{ flex:1, maxWidth:"20px", height:`${h}%`, background: i === barData.length-1 ? T.accent : `${T.accent}22`, borderRadius:"3px 3px 0 0", transition:"height 0.6s ease" }} />
            ))}
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px", marginBottom:"20px" }}>
          {[["Invested",`$${portfolioValue.toFixed(2)}`],["Cash",`$${cash.toFixed(2)}`],["XP","2,840"]].map(([label,value]) => (
            <Card key={label} style={{ padding:"24px 28px" }}>
              <div style={{ color:T.inkFaint, fontSize:"11px", fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:"8px" }}>{label}</div>
              <div style={{ color:T.ink, fontSize:"24px", fontWeight:700, letterSpacing:"-0.6px", fontVariantNumeric:"tabular-nums" }}>{value}</div>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.14}>
        <div style={{ color:T.inkFaint, fontSize:"11px", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"14px", padding:"0 4px" }}>Holdings</div>
        <Card hover={false} style={{ overflow:"hidden" }}>
          {HOLDINGS.map((h, i) => {
            const s = stocks.find(x => x.ticker === h.ticker);
            if (!s) return null;
            const val = s.price * h.shares, cost = h.avgCost * h.shares, g = val - cost, gPct = (g / cost) * 100;
            return (
              <div key={h.ticker} style={{ display:"flex", alignItems:"center", gap:"20px", padding:"20px 28px", borderBottom: i < HOLDINGS.length-1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ width:"42px", height:"42px", borderRadius:"10px", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color:T.inkMid, fontSize:"9.5px", fontWeight:700 }}>{s.ticker}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:T.ink, fontWeight:600, fontSize:"15px", letterSpacing:"-0.2px" }}>{s.ticker} <span style={{ color:T.inkSub, fontWeight:400 }}>· {s.name}</span></div>
                  <div style={{ color:T.inkSub, fontSize:"13px", marginTop:"2px" }}>{h.shares} shares · avg cost ${h.avgCost.toFixed(2)}</div>
                </div>
                <Sparkline positive={gPct >= 0} width={64} height={24} />
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:T.ink, fontWeight:700, fontSize:"16px", letterSpacing:"-0.3px", fontVariantNumeric:"tabular-nums" }}>${val.toFixed(2)}</div>
                  <div style={{ color: gPct >= 0 ? T.green : T.red, fontSize:"13px", fontWeight:500 }}>{gPct >= 0 ? "+" : ""}{gPct.toFixed(2)}%</div>
                </div>
              </div>
            );
          })}
        </Card>
      </Reveal>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   LEADERBOARD
───────────────────────────────────────────────────────────────────────────── */
const LeaderboardPage = () => (
  <div style={{ maxWidth:"700px", margin:"0 auto", padding:"40px 28px 100px" }}>
    <Reveal>
      <div style={{ marginBottom:"28px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, letterSpacing:"-0.8px", color:T.ink }}>Leaderboard</h1>
        <p style={{ color:T.inkSub, fontSize:"15px", marginTop:"5px" }}>Top traders this week</p>
      </div>
    </Reveal>
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      {LEADERBOARD.map((entry, i) => {
        const rankColors = [null,"#c9862a","#8e8e93","#7d4f2a"];
        return (
          <Reveal key={entry.rank} delay={i * 0.06}>
            <Card style={{
              padding:"22px 28px",
              boxShadow: entry.isUser
                ? `0 0 0 2px ${T.accent}30, 0 4px 20px rgba(0,0,0,0.07)`
                : "0 2px 12px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
                <div style={{ fontSize:"18px", width:"28px", textAlign:"center", fontWeight:800, color: rankColors[entry.rank] || T.inkFaint }}>
                  {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank-1] : `#${entry.rank}`}
                </div>
                <div style={{ width:"40px", height:"40px", borderRadius:"50%", background: entry.isUser ? `${T.accent}12` : T.bg, border: entry.isUser ? `1.5px solid ${T.accent}35` : `1px solid ${T.line}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color: entry.isUser ? T.accent : T.inkFaint, fontSize:"15px", fontWeight:700 }}>{entry.user[0].toUpperCase()}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <span style={{ color: entry.isUser ? T.accent : T.ink, fontWeight:600, fontSize:"15px", letterSpacing:"-0.2px" }}>@{entry.user}</span>
                    {entry.isUser && <span style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", color:T.accent, background:`${T.accent}12`, padding:"2px 7px", borderRadius:"4px" }}>You</span>}
                  </div>
                  <div style={{ color:T.inkFaint, fontSize:"12px", marginTop:"2px" }}>{entry.level} · {entry.streak} day streak</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:T.ink, fontWeight:700, fontSize:"17px", letterSpacing:"-0.4px", fontVariantNumeric:"tabular-nums" }}>{entry.total}</div>
                  <div style={{ color:T.green, fontSize:"13px", fontWeight:500 }}>{entry.gain}</div>
                </div>
              </div>
            </Card>
          </Reveal>
        );
      })}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   LEARN
───────────────────────────────────────────────────────────────────────────── */
const LearnPage = () => (
  <div style={{ maxWidth:"700px", margin:"0 auto", padding:"40px 28px 100px" }}>
    <Reveal>
      <div style={{ marginBottom:"28px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, letterSpacing:"-0.8px", color:T.ink }}>Learn</h1>
        <p style={{ color:T.inkSub, fontSize:"15px", marginTop:"5px" }}>Complete lessons to earn XP and level up</p>
      </div>
    </Reveal>
    <Reveal delay={0.06}>
      <Card hover={false} style={{ padding:"24px 28px", marginBottom:"18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
          <span style={{ color:T.ink, fontWeight:600, fontSize:"15px", letterSpacing:"-0.2px" }}>Your progress</span>
          <span style={{ color:T.inkSub, fontSize:"14px" }}>2 / 5 complete</span>
        </div>
        <ProgressBar value={40} />
      </Card>
    </Reveal>
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      {LESSONS.map((lesson, i) => (
        <Reveal key={i} delay={i * 0.06 + 0.1}>
          <Card style={{ padding:"22px 28px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"18px" }}>
              <div style={{
                width:"44px", height:"44px", borderRadius:"12px", flexShrink:0,
                background: lesson.done ? `${T.accent}10` : T.bg,
                border: `1px solid ${lesson.done ? T.accent+"25" : T.line}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"17px", fontWeight:700, color: lesson.done ? T.accent : T.inkFaint,
              }}>
                {lesson.done ? "✓" : i + 1}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:T.ink, fontWeight:600, fontSize:"15px", letterSpacing:"-0.2px" }}>{lesson.title}</div>
                <div style={{ color:T.inkSub, fontSize:"13px", marginTop:"3px" }}>{lesson.desc}</div>
              </div>
              {lesson.done
                ? <span style={{ color:T.accent, fontSize:"20px" }}>✓</span>
                : <span style={{ fontSize:"11px", fontWeight:600, letterSpacing:"0.04em", color:T.accent, background:`${T.accent}10`, padding:"4px 10px", borderRadius:"6px" }}>+{lesson.xp} XP</span>
              }
            </div>
          </Card>
        </Reveal>
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   COACH
───────────────────────────────────────────────────────────────────────────── */
const CoachPage = () => {
  const [messages, setMessages] = useState([
    { role:"coach", text:"Ready to talk markets. Ask me anything — portfolio strategy, how to read a chart, or what a P/E ratio actually means." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMessages(m => [...m, { role:"user", text }]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:300, system:"You are a sharp, no-nonsense investing coach for teenagers. Be concise and clear. No emojis.", messages:[{ role:"user", content:text }] }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role:"coach", text: data.content?.[0]?.text || "Connection issue." }]);
    } catch {
      setMessages(m => [...m, { role:"coach", text:"Add your API key to .env to enable the coach." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:"700px", margin:"0 auto", padding:"40px 28px 0", display:"flex", flexDirection:"column", height:"calc(100vh - 130px)" }}>
      <Reveal>
        <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"28px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:`${T.accent}10`, border:`1.5px solid ${T.accent}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>◑</div>
          <div>
            <div style={{ color:T.ink, fontWeight:700, fontSize:"18px", letterSpacing:"-0.3px" }}>AI Coach</div>
            <div style={{ color:T.green, fontSize:"13px", display:"flex", alignItems:"center", gap:"5px" }}>
              <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:T.green, display:"inline-block" }} /> Online
            </div>
          </div>
        </div>
      </Reveal>

      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:"14px", paddingBottom:"20px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:"flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation:"fadeIn 0.22s ease" }}>
            <div style={{
              maxWidth:"68%", padding:"14px 18px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? T.ink : T.white,
              color: msg.role === "user" ? T.white : T.inkMid,
              fontSize:"15px", lineHeight:"1.65", letterSpacing:"-0.1px",
              boxShadow: msg.role === "coach" ? "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" : "none",
              fontWeight: msg.role === "user" ? 500 : 400,
            }}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:"5px", padding:"14px 18px", background:T.white, borderRadius:"18px 18px 18px 4px", width:"fit-content", boxShadow:"0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}>
            {[0,1,2].map(i => <div key={i} style={{ width:"7px", height:"7px", borderRadius:"50%", background:T.ghost, animation:`bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ paddingTop:"16px", paddingBottom:"28px", borderTop:`1px solid ${T.line}`, display:"flex", gap:"10px" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask your coach…"
          style={{ flex:1, background:T.white, border:`1px solid ${T.line}`, borderRadius:"12px", padding:"13px 18px", color:T.ink, fontSize:"15px", outline:"none", letterSpacing:"-0.1px", transition:"border-color 0.18s ease", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}
          onFocus={e => e.target.style.borderColor = T.ghost}
          onBlur={e => e.target.style.borderColor = T.line} />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          background:T.accent, border:"none", borderRadius:"12px", padding:"13px 22px",
          color:T.white, fontWeight:600, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading || !input.trim() ? 0.4 : 1, transition:"opacity 0.18s ease",
          fontSize:"15px", letterSpacing:"-0.1px",
        }}>Send</button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────────────────────────── */
export default function SwishApp() {
  const [page, setPage] = useState("dashboard");
  const [stocks, setStocks] = useState(STOCKS);
  const [tradeStock, setTradeStock] = useState(null);
  const [toast, setToast] = useState(null);
  const mainRef = useRef(null);

  useEffect(() => { mainRef.current?.scrollTo({ top:0, behavior:"smooth" }); }, [page]);

  useEffect(() => {
    const id = setInterval(() => setStocks(prev => prev.map(s => ({
      ...s,
      price: Math.max(1, s.price + (Math.random() - 0.495) * 1.2),
      changePct: s.changePct + (Math.random() - 0.495) * 0.04,
    }))), 3000);
    return () => clearInterval(id);
  }, []);

  const handleTrade = (stock, action, shares) => {
    setToast({ text:`${action} ${shares}× ${stock.ticker} confirmed`, type:action });
    setTimeout(() => setToast(null), 3000);
  };

  const PAGES = {
    dashboard:   <DashboardPage   stocks={stocks} onTrade={setTradeStock} onNavigate={setPage} />,
    markets:     <MarketsPage     stocks={stocks} onTrade={setTradeStock} />,
    portfolio:   <PortfolioPage   stocks={stocks} />,
    learn:       <LearnPage />,
    leaderboard: <LeaderboardPage />,
    coach:       <CoachPage />,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; background:#f5f5f7; color:#1d1d1f; font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif; -webkit-font-smoothing:antialiased; }
        #root { height:100%; }
        button, input { font-family:inherit; }
        input::placeholder { color:#86868b; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#d2d2d7; border-radius:4px; }
        @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes bounce  { 0%,80%,100%{transform:translateY(0);opacity:.3} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes sheetUp { from{opacity:0;transform:scale(.95) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(10px) scale(.95)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
      `}</style>

      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#f5f5f7" }}>
        <TopNav page={page} setPage={setPage} />
        <div style={{ height:"52px", flexShrink:0 }} />
        <TickerStrip stocks={stocks} />

        <main ref={mainRef} style={{ flex:1, overflowY:"auto", background:"#f5f5f7" }}>
          <div key={page} style={{ animation:"fadeIn 0.2s ease" }}>
            {PAGES[page]}
          </div>
        </main>
      </div>

      {tradeStock && <TradeModal stock={tradeStock} onClose={() => setTradeStock(null)} onTrade={handleTrade} />}

      {toast && (
        <div style={{
          position:"fixed", bottom:"36px", left:"50%",
          transform:"translateX(-50%)",
          background:T.ink, color:T.white,
          padding:"12px 24px", borderRadius:"24px",
          fontWeight:500, fontSize:"14px", letterSpacing:"-0.1px",
          zIndex:300, animation:"toastIn 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          whiteSpace:"nowrap", boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
        }}>
          {toast.type === "BUY" ? "↗" : "↘"} {toast.text}
        </div>
      )}
    </>
  );
}
