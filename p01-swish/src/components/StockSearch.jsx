import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { T } from "../tokens";
import { CategoryIcon } from "../data/stockCategories";

/* ── Stock defaults (hardcoded seed prices, replaced by live on mount) ── */
const FEATURED_STOCKS = [
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

/* ── ETF defaults — 20 popular, prices fetched from Finnhub ── */
const ETF_DEFAULTS = [
  { ticker:"SPY",  name:"SPDR S&P 500 ETF"         },
  { ticker:"VOO",  name:"Vanguard S&P 500 ETF"     },
  { ticker:"QQQ",  name:"Invesco Nasdaq 100 ETF"   },
  { ticker:"VTI",  name:"Vanguard Total Market ETF" },
  { ticker:"IWM",  name:"iShares Russell 2000 ETF"  },
  { ticker:"IVV",  name:"iShares Core S&P 500 ETF"  },
  { ticker:"GLD",  name:"SPDR Gold Shares ETF"      },
  { ticker:"TLT",  name:"iShares 20+ Year Treasury" },
  { ticker:"ARKK", name:"ARK Innovation ETF"        },
  { ticker:"VNQ",  name:"Vanguard Real Estate ETF"  },
  { ticker:"SCHD", name:"Schwab US Dividend ETF"    },
  { ticker:"VGT",  name:"Vanguard Info Tech ETF"    },
  { ticker:"XLF",  name:"Financial Select SPDR ETF" },
  { ticker:"XLE",  name:"Energy Select SPDR ETF"    },
  { ticker:"SOXX", name:"iShares Semiconductor ETF" },
  { ticker:"DIA",  name:"SPDR Dow Jones ETF"        },
  { ticker:"VEA",  name:"Vanguard Developed Mkts ETF"},
  { ticker:"VWO",  name:"Vanguard Emerging Mkts ETF" },
  { ticker:"BND",  name:"Vanguard Total Bond ETF"   },
  { ticker:"IEMG", name:"iShares Emerging Markets ETF"},
].map(e => ({ ...e, price: null, changePct: null, sector: "ETFs", isETF: true }));

const SECTORS = ["All", "Tech", "Media", "Gaming", "Social", "Fintech", "Consumer", "Auto", "Retail", "Food", "Travel", "Crypto", "ETFs", "Transport"];

/* ── Sparkline ── */
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

/* ── Badge colors by type ── */
const BADGE_STYLES = {
  ETF:    { color: "#7c3aed", bg: "#7c3aed12", border: "#7c3aed30" },
  Crypto: { color: "#d97706", bg: "#d9770612", border: "#d9770630" },
};

/* ── StockRow ── */
const StockRow = ({ stock, onOpenTrade, onWatch, watched }) => {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const pos = stock.changePct >= 0;
  const badge = stock.isETF ? "ETF" : stock.isCrypto ? "Crypto" : null;
  const badgeStyle = badge ? BADGE_STYLES[badge] : null;

  return (
    <div
      className="stock-row"
      onClick={() => navigate(`/stock/${stock.ticker}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "14px 20px",
        background: hov ? T.bg : T.white,
        transition: "background 0.14s ease, transform 0.1s ease",
        borderBottom: `1px solid ${T.line}`,
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: "110px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ color:T.ink, fontWeight:700, fontSize:"14px", letterSpacing:"-0.2px", flexShrink: 0 }}>{stock.ticker}</span>
          {badgeStyle ? (
            <span style={{ fontSize:"10px", fontWeight:600, color:badgeStyle.color, background:badgeStyle.bg, padding:"2px 6px", borderRadius:"4px", border:`1px solid ${badgeStyle.border}` }}>
              {badge}
            </span>
          ) : stock.sector && (
            <span style={{ fontSize:"10px", fontWeight:500, color:T.inkFaint, background:T.bg, padding:"2px 6px", borderRadius:"4px", border:`1px solid ${T.line}` }}>
              {stock.sector}
            </span>
          )}
        </div>
        <div style={{ color:T.inkSub, fontSize:"12px", marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {stock.name}
        </div>
      </div>

      <div style={{ flexShrink: 0, margin: "0 8px" }}>
        <Sparkline positive={pos} width={56} height={20} />
      </div>

      <div style={{ textAlign:"right", minWidth:"80px", marginLeft: "auto", flexShrink: 0 }}>
        {stock.price != null ? (
          <>
            <div style={{ color:T.ink, fontWeight:600, fontSize:"14px", fontVariantNumeric:"tabular-nums" }}>
              ${stock.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          onClick={e => { e.stopPropagation(); (onOpenTrade || onTrade)(stock); }}
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

/* ── Main component ── */
export default function StockSearch({ onOpenTrade, onWatch, watchlist = [] }) {
  const [query, setQuery]           = useState("");
  const [sector, setSector]         = useState("All");
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const debounceRef                 = useRef(null);
  const inputRef                    = useRef(null);
  const searchCancelledRef          = useRef(false);
  const mountedRef                  = useRef(true);

  // Master unmount guard — blocks ALL stale setState after nav away
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Dynamic data from APIs
  const [etfPrices, setEtfPrices]     = useState({});   // ticker → { price, changePct }
  const [stockPrices, setStockPrices] = useState({});    // ticker → { price, changePct }
  const [cryptoTop, setCryptoTop]     = useState([]);    // top 20 from /api/crypto/top
  const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

  // Fetch real prices for featured stocks on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const batch = {};
      await Promise.all(FEATURED_STOCKS.map(async (stock) => {
        try {
          const res = await fetch(`${baseUrl}/api/quote/${stock.ticker}`);
          const data = await res.json();
          if (data.c && data.c > 0) {
            batch[stock.ticker] = { price: data.c, changePct: data.dp ?? 0 };
          }
        } catch { /* ignore */ }
      }));
      if (!cancelled && mountedRef.current) {
        setStockPrices(batch);
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl]);

  // Fetch ETF prices on mount (Finnhub supports ETF quotes)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const batch = {};
      await Promise.all(ETF_DEFAULTS.map(async (etf) => {
        try {
          const res = await fetch(`${baseUrl}/api/quote/${etf.ticker}`);
          const data = await res.json();
          if (data.c && data.c > 0) {
            batch[etf.ticker] = { price: data.c, changePct: data.dp ?? 0 };
          }
        } catch { /* ignore */ }
      }));
      if (!cancelled && mountedRef.current) {
        setEtfPrices(batch);
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl]);

  // Fetch top 20 crypto from CoinGecko on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/crypto/top`);
        const data = await res.json();
        if (!cancelled && mountedRef.current && data.coins) {
          setCryptoTop(data.coins.map(c => ({
            ticker: c.symbol, name: c.name, price: c.price,
            changePct: c.changePct, sector: "Crypto", isCrypto: true,
            coinId: c.id,
          })));
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [baseUrl]);

  // Build featured list based on sector — memoize to prevent re-render cascades
  const etfList = useMemo(() => ETF_DEFAULTS.map(e => etfPrices[e.ticker]
    ? { ...e, price: etfPrices[e.ticker].price, changePct: etfPrices[e.ticker].changePct }
    : e
  ), [etfPrices]);

  // Merge live prices into featured stocks
  const featuredStocks = useMemo(() => FEATURED_STOCKS.map(s => stockPrices[s.ticker]
    ? { ...s, price: stockPrices[s.ticker].price, changePct: stockPrices[s.ticker].changePct }
    : s
  ), [stockPrices]);

  const allFeatured = useMemo(() => [...featuredStocks, ...cryptoTop, ...etfList], [featuredStocks, cryptoTop, etfList]);

  const featured = useMemo(() => sector === "All"
    ? [...featuredStocks, ...etfList.slice(0, 4), ...cryptoTop.slice(0, 4)]
    : sector === "Crypto"
      ? cryptoTop
      : sector === "ETFs"
        ? etfList
        : featuredStocks.filter(s => s.sector === sector),
  [sector, featuredStocks, etfList, cryptoTop]);

  // Fetch a quote for any symbol (stock or ETF via Finnhub)
  const fetchQuote = useCallback(async (symbol) => {
    try {
      const res = await fetch(`${baseUrl}/api/quote/${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (data.c && data.c > 0) return { price: data.c, changePct: data.dp ?? 0 };
    } catch { /* fall through */ }
    return null;
  }, [baseUrl]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 1) { setSearchMode(false); setResults([]); return; }
    if (!mountedRef.current) return;
    searchCancelledRef.current = false;
    setSearchMode(true);
    setSearching(true);
    try {
      const q2 = q.toLowerCase();
      const apiKey = import.meta?.env?.VITE_FINNHUB_API_KEY || "";

      // 1) Search crypto via CoinGecko (parallel)
      const cryptoPromise = fetch(`${baseUrl}/api/crypto/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => (data.coins || []).map(c => ({
          ticker: c.symbol, name: c.name, price: null, changePct: null,
          sector: "Crypto", isCrypto: true, coinId: c.id,
        })))
        .catch(() => []);

      // 2) Search stocks+ETFs via Finnhub (parallel)
      let finnhubPromise;
      if (apiKey) {
        finnhubPromise = fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&exchange=US&token=${apiKey}`)
          .then(r => r.json())
          .then(data => {
            const raw = data.result || [];
            // Stocks: Common Stock type
            const stocks = raw
              .filter(r => r.type === "Common Stock" && !r.symbol.includes("."))
              .slice(0, 12)
              .map(r => {
                const feat = featuredStocks.find(f => f.ticker === r.symbol);
                return feat || { ticker: r.symbol, name: r.description, price: null, changePct: null, sector: null };
              });
            // ETFs: type ETC or description contains ETF/FUND/TRUST
            const etfs = raw
              .filter(r => (r.type === "ETC" || /ETF|FUND|TRUST/i.test(r.description)) && !r.symbol.includes("."))
              .slice(0, 8)
              .map(r => {
                const known = ETF_DEFAULTS.find(e => e.ticker === r.symbol);
                const priceData = etfPrices[r.symbol];
                return known
                  ? { ...known, ...(priceData || {}) }
                  : { ticker: r.symbol, name: r.description, price: priceData?.price ?? null, changePct: priceData?.changePct ?? null, sector: "ETFs", isETF: true };
              });
            return { stocks, etfs };
          })
          .catch(() => ({ stocks: [], etfs: [] }));
      } else {
        finnhubPromise = Promise.resolve({
          stocks: featuredStocks.filter(s => s.ticker.toLowerCase().includes(q2) || s.name.toLowerCase().includes(q2)),
          etfs: etfList.filter(e => e.ticker.toLowerCase().includes(q2) || e.name.toLowerCase().includes(q2)),
        });
      }

      // 3) Also match ETF defaults locally (Finnhub may miss popular ones)
      const localEtfMatches = etfList.filter(e =>
        e.ticker.toLowerCase().includes(q2) || e.name.toLowerCase().includes(q2)
      );

      // 4) Also match crypto top locally
      const localCryptoMatches = cryptoTop.filter(c =>
        c.ticker.toLowerCase().includes(q2) || c.name.toLowerCase().includes(q2)
      );

      const [cryptoResults, { stocks: finnhubStocks, etfs: finnhubEtfs }] = await Promise.all([cryptoPromise, finnhubPromise]);
      if (searchCancelledRef.current || !mountedRef.current) return;

      // Merge: local ETF matches + Finnhub ETFs → deduplicate
      const etfMerged = [...localEtfMatches];
      const etfTickers = new Set(etfMerged.map(e => e.ticker));
      for (const e of finnhubEtfs) {
        if (!etfTickers.has(e.ticker)) { etfMerged.push(e); etfTickers.add(e.ticker); }
      }

      // Merge crypto: local top matches + CoinGecko search → deduplicate
      const cryptoMerged = [...localCryptoMatches];
      const cryptoSymbols = new Set(cryptoMerged.map(c => c.ticker));
      for (const c of cryptoResults) {
        if (!cryptoSymbols.has(c.ticker)) { cryptoMerged.push(c); cryptoSymbols.add(c.ticker); }
      }

      // Combine: ETFs first, then stocks, then crypto — deduplicate across all
      const seen = new Set();
      const combined = [];
      for (const item of [...etfMerged, ...finnhubStocks, ...cryptoMerged]) {
        if (!seen.has(item.ticker)) { seen.add(item.ticker); combined.push(item); }
      }

      setResults(combined);
      setSearching(false);

      // Background: fetch missing prices for stocks/ETFs
      const needQuotes = combined.filter(s => s.price == null && !s.isCrypto);
      if (needQuotes.length > 0) {
        const quotes = await Promise.all(needQuotes.map(s => fetchQuote(s.ticker)));
        if (searchCancelledRef.current || !mountedRef.current) return;
        setResults(prev => prev.map(s => {
          if (s.price != null || s.isCrypto) return s;
          const idx = needQuotes.findIndex(n => n.ticker === s.ticker);
          const qt = idx >= 0 ? quotes[idx] : null;
          return qt ? { ...s, price: qt.price, changePct: qt.changePct } : s;
        }));
      }

      // Background: fetch missing crypto prices
      const needCrypto = combined.filter(s => s.isCrypto && s.price == null && s.coinId);
      if (needCrypto.length > 0) {
        const cQuotes = await Promise.all(needCrypto.map(async (c) => {
          try {
            const res = await fetch(`${baseUrl}/api/crypto/quote/${c.coinId}`);
            const data = await res.json();
            return data.c > 0 ? { price: data.c, changePct: data.dp ?? 0 } : null;
          } catch { return null; }
        }));
        if (searchCancelledRef.current || !mountedRef.current) return;
        setResults(prev => prev.map(s => {
          if (!s.isCrypto || s.price != null) return s;
          const idx = needCrypto.findIndex(n => n.ticker === s.ticker);
          const qt = idx >= 0 ? cQuotes[idx] : null;
          return qt ? { ...s, price: qt.price, changePct: qt.changePct } : s;
        }));
      }
    } catch {
      if (searchCancelledRef.current || !mountedRef.current) return;
      const q2 = q.toLowerCase();
      setResults(allFeatured.filter(s =>
        s.ticker.toLowerCase().includes(q2) || s.name.toLowerCase().includes(q2)
      ));
      setSearching(false);
    }
  }, [fetchQuote, baseUrl, etfList, cryptoTop, allFeatured, featuredStocks]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchMode(prev => prev ? false : prev);
      setResults(prev => prev.length ? [] : prev);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 320);
    return () => {
      clearTimeout(debounceRef.current);
      searchCancelledRef.current = true;
    };
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
          placeholder="Search stocks, ETFs & crypto — AAPL, SPY, BTC…"
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
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
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
                  display: "inline-flex", alignItems: "center", gap: "5px",
                }}
              >{s !== "All" && <CategoryIcon category={s === "ETFs" ? "ETF" : s} size={18} iconSize={11} />}{s}</button>
            ))}
          </div>
          <div className="pills-fade" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "32px", background: "linear-gradient(to right, transparent, #f5f5f7)", pointerEvents: "none" }} />
        </div>
      )}

      <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px", padding: "0 2px" }}>
        {searchMode
          ? searching
            ? "Searching…"
            : `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`
          : sector === "All" ? "Featured" : sector === "ETFs" ? "Popular ETFs" : sector === "Crypto" ? "Top Crypto by Market Cap" : sector
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
            onOpenTrade={onOpenTrade}
            onWatch={onWatch}
            watched={watchlist.includes(stock.ticker)}
          />
        ))}
      </div>
    </div>
  );
}
