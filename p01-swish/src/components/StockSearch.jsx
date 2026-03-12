import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "../tokens";

const FEATURED = [
  { ticker:"AAPL",  name:"Apple Inc.",           price:189.30, changePct:+0.66, sector:"Tech"     },
  { ticker:"NVDA",  name:"NVIDIA Corp.",          price:875.40, changePct:+1.48, sector:"Tech"     },
  { ticker:"TSLA",  name:"Tesla Inc.",            price:248.50, changePct:-1.27, sector:"Auto"     },
  { ticker:"AMZN",  name:"Amazon.com",            price:178.25, changePct:+1.19, sector:"Retail"   },
  { ticker:"GOOGL", name:"Alphabet Inc.",         price:141.80, changePct:+0.67, sector:"Tech"     },
  { ticker:"NFLX",  name:"Netflix Inc.",          price:485.60, changePct:-1.30, sector:"Media"    },
  { ticker:"MSFT",  name:"Microsoft Corp.",       price:378.90, changePct:+1.20, sector:"Tech"     },
  { ticker:"RBLX",  name:"Roblox Corp.",          price:42.15,  changePct:+2.06, sector:"Gaming"   },
  { ticker:"SPOT",  name:"Spotify Technology",    price:248.70, changePct:+1.30, sector:"Media"    },
  { ticker:"DIS",   name:"Walt Disney Co.",       price:112.40, changePct:-1.58, sector:"Media"    },
  { ticker:"NKE",   name:"Nike Inc.",             price:94.20,  changePct:+0.45, sector:"Consumer" },
  { ticker:"CMG",   name:"Chipotle Mexican Grill",price:3180.00,changePct:+1.10, sector:"Food"     },
  { ticker:"SNAP",  name:"Snap Inc.",             price:11.40,  changePct:-2.10, sector:"Social"   },
  { ticker:"COIN",  name:"Coinbase Global",       price:218.50, changePct:+3.20, sector:"Crypto"   },
  { ticker:"ABNB",  name:"Airbnb Inc.",           price:148.60, changePct:-0.80, sector:"Travel"   },
  { ticker:"META",  name:"Meta Platforms",        price:512.30, changePct:+1.75, sector:"Social"   },
  { ticker:"UBER",  name:"Uber Technologies",     price:78.40,  changePct:+0.92, sector:"Transport"},
  { ticker:"SBUX",  name:"Starbucks Corp.",       price:76.80,  changePct:-0.60, sector:"Food"     },
  { ticker:"PYPL",  name:"PayPal Holdings",       price:62.10,  changePct:+1.40, sector:"Fintech"  },
  { ticker:"AMD",   name:"Advanced Micro Devices",price:168.90, changePct:+2.30, sector:"Tech"     },
];

const SECTORS = ["All", "Tech", "Media", "Gaming", "Social", "Fintech", "Consumer", "Auto", "Retail", "Food", "Travel", "Crypto", "Transport"];

const Sparkline = ({ positive, width = 56, height = 20 }) => {
  const pts = positive
    ? [22, 19, 23, 16, 11, 13, 9, 6, 8, 2]
    : [4,  7,  5,  11, 14, 10, 17, 13, 19, 22];
  const max = Math.max(...pts), min = Math.min(...pts), range = max - min || 1;
  const coords = pts.map((p, i) =>
    `${(i / (pts.length - 1)) * width},${height - ((p - min) / range) * (height - 4) - 2}`
  );
  const color = positive ? T.green : T.red;
  const uid = `ss${positive ? "p" : "n"}${width}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:"block", flexShrink:0 }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={`M 0,${height} L ${coords.join(" L ")} L ${width},${height} Z`} fill={`url(#${uid})`} />
      <path d={`M ${coords.join(" L ")}`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const StockRow = ({ stock, onTrade, onWatch, watched }) => {
  const [hov, setHov] = useState(false);
  const pos = stock.changePct >= 0;

  return (
    <div
      onClick={() => onTrade(stock)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "14px 20px",
        background: hov ? T.bg : T.white,
        transition: "background 0.14s ease",
        borderBottom: `1px solid ${T.line}`,
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ color:T.ink, fontWeight:700, fontSize:"14px", letterSpacing:"-0.2px" }}>{stock.ticker}</span>
          {stock.sector && (
            <span style={{ fontSize:"10px", fontWeight:500, color:T.inkFaint, background:T.bg, padding:"2px 6px", borderRadius:"4px", border:`1px solid ${T.line}` }}>
              {stock.sector}
            </span>
          )}
        </div>
        <div style={{ color:T.inkSub, fontSize:"12px", marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {stock.name}
        </div>
      </div>

      <Sparkline positive={pos} width={56} height={20} />

      <div style={{ textAlign:"right", minWidth:"80px" }}>
        {stock.price != null ? (
          <>
            <div style={{ color:T.ink, fontWeight:600, fontSize:"14px", fontVariantNumeric:"tabular-nums" }}>
              ${stock.price.toFixed(2)}
            </div>
            <div style={{ color: pos ? T.green : T.red, fontSize:"12px", fontWeight:500 }}>
              {pos ? "+" : ""}{(stock.changePct ?? 0).toFixed(2)}%
            </div>
          </>
        ) : (
          <>
            <div style={{ color:T.ghost, fontWeight:600, fontSize:"14px" }}>$...</div>
            <div style={{ color:T.ghost, fontSize:"12px" }}>—</div>
          </>
        )}
      </div>

      <div style={{
        display: "flex", gap: "6px",
        opacity: hov ? 1 : 0,
        transform: hov ? "translateX(0)" : "translateX(6px)",
        transition: "opacity 0.16s ease, transform 0.16s ease",
        flexShrink: 0,
      }}>
        <button
          onClick={e => { e.stopPropagation(); onWatch(stock.ticker); }}
          style={{
            background: watched ? `${T.accent}10` : "none",
            border: `1px solid ${watched ? T.accent+"40" : T.line}`,
            borderRadius: "8px", cursor: "pointer",
            padding: "6px 12px", fontSize: "12px", fontWeight: 500,
            color: watched ? T.accent : T.inkSub,
            transition: "all 0.15s ease",
          }}
        >
          {watched ? "★ Watching" : "☆ Watch"}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onTrade(stock); }}
          style={{
            background: T.accent, border: "none", borderRadius: "8px",
            cursor: "pointer", padding: "6px 14px",
            fontSize: "12px", fontWeight: 600, color: T.white,
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Trade
        </button>
      </div>
    </div>
  );
};

export default function StockSearch({ onTrade, onWatch, watchlist = [] }) {
  const [query, setQuery]           = useState("");
  const [sector, setSector]         = useState("All");
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const debounceRef                 = useRef(null);
  const inputRef                    = useRef(null);

  const featured = sector === "All"
    ? FEATURED
    : FEATURED.filter(s => s.sector === sector);

  const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

  const fetchQuote = useCallback(async (symbol) => {
    try {
      const res = await fetch(`${baseUrl}/api/quote/${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (data.c && data.c > 0) return { price: data.c, changePct: data.dp ?? 0 };
    } catch { /* fall through */ }
    return null;
  }, [baseUrl]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 1) {
      setSearchMode(false);
      setResults([]);
      return;
    }
    setSearchMode(true);
    setSearching(true);
    try {
      const apiKey = import.meta?.env?.VITE_FINNHUB_API_KEY || "";
      const url = apiKey
        ? `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&exchange=US&token=${apiKey}`
        : null;

      let found = [];

      if (url) {
        const res  = await fetch(url);
        const data = await res.json();
        found = (data.result || [])
          .filter(r => r.type === "Common Stock" && !r.symbol.includes("."))
          .slice(0, 12)
          .map(r => {
            // Use featured data if available
            const feat = FEATURED.find(f => f.ticker === r.symbol);
            return feat || {
              ticker:    r.symbol,
              name:      r.description,
              price:     null,
              changePct: null,
              sector:    null,
            };
          });
      } else {
        const q2 = q.toLowerCase();
        found = FEATURED.filter(s =>
          s.ticker.toLowerCase().includes(q2) ||
          s.name.toLowerCase().includes(q2)
        );
      }

      setResults(found);
      setSearching(false);

      // Fetch live quotes for results missing prices
      const needQuotes = found.filter(s => s.price == null);
      if (needQuotes.length > 0) {
        const quotes = await Promise.all(needQuotes.map(s => fetchQuote(s.ticker)));
        setResults(prev => prev.map(s => {
          if (s.price != null) return s;
          const idx = needQuotes.findIndex(n => n.ticker === s.ticker);
          const q = idx >= 0 ? quotes[idx] : null;
          return q ? { ...s, price: q.price, changePct: q.changePct } : s;
        }));
      }
      return;
    } catch {
      const q2 = q.toLowerCase();
      setResults(FEATURED.filter(s =>
        s.ticker.toLowerCase().includes(q2) ||
        s.name.toLowerCase().includes(q2)
      ));
    }
    setSearching(false);
  }, [fetchQuote]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchMode(false); setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 320);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  const displayList = searchMode ? results : featured;

  return (
    <div>
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <div style={{
          position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)",
          color: T.inkFaint, fontSize: "16px", pointerEvents: "none",
        }}>&#x2315;</div>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search any stock — Apple, TSLA, Nike…"
          style={{
            width: "100%", padding: "13px 40px 13px 42px",
            background: T.white, border: `1px solid ${T.line}`,
            borderRadius: "12px", fontSize: "15px", color: T.ink,
            outline: "none", letterSpacing: "-0.1px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            transition: "border-color 0.18s ease, box-shadow 0.18s ease",
          }}
          onFocus={e => {
            e.target.style.borderColor = T.accent + "60";
            e.target.style.boxShadow = `0 0 0 3px ${T.accent}14, 0 1px 4px rgba(0,0,0,0.05)`;
          }}
          onBlur={e => {
            e.target.style.borderColor = T.line;
            e.target.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            style={{
              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
              background: T.ghost, border: "none", borderRadius: "50%",
              width: "20px", height: "20px", cursor: "pointer",
              color: T.inkSub, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        )}
      </div>

      {!searchMode && (
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px", scrollbarWidth: "none" }}>
          {SECTORS.map(s => (
            <button
              key={s}
              onClick={() => setSector(s)}
              style={{
                background: sector === s ? T.ink : T.white,
                border: `1px solid ${sector === s ? T.ink : T.line}`,
                borderRadius: "20px", cursor: "pointer",
                padding: "6px 14px", fontSize: "12px", fontWeight: sector === s ? 600 : 400,
                color: sector === s ? T.white : T.inkSub,
                whiteSpace: "nowrap", flexShrink: 0,
                transition: "all 0.18s ease",
              }}
            >{s}</button>
          ))}
        </div>
      )}

      <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px", padding: "0 2px" }}>
        {searchMode
          ? searching
            ? "Searching…"
            : `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`
          : sector === "All" ? "Featured Stocks" : sector
        }
      </div>

      <div style={{
        background: T.white,
        borderRadius: "16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        {searching && (
          <div style={{ padding: "32px", textAlign: "center", color: T.inkFaint, fontSize: "14px" }}>
            <div style={{ display: "inline-flex", gap: "5px", alignItems: "center" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.ghost, animation: `bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        )}

        {!searching && displayList.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <div style={{ color: T.ink, fontWeight: 600, fontSize: "15px" }}>No results found</div>
            <div style={{ color: T.inkSub, fontSize: "14px", marginTop: "4px" }}>Try a different ticker or company name</div>
          </div>
        )}

        {!searching && displayList.map((stock, i) => (
          <StockRow
            key={stock.ticker + i}
            stock={stock}
            onTrade={onTrade}
            onWatch={onWatch}
            watched={watchlist.includes(stock.ticker)}
          />
        ))}
      </div>
    </div>
  );
}
