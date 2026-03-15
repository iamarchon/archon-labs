import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  /^http:\/\/localhost:\d+$/,
  process.env.VITE_APP_URL,
].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

/* ── Supabase admin client (service key for privileged ops) ── */
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/* ── POST /api/coach — Anthropic Messages API with enforced system prompt ── */
const COACH_SYSTEM_PROMPT = `You are Swish Coach, a friendly investing mentor for teenagers aged 13-18.

STRICT RULES — you must follow these without exception:
- You ONLY answer questions about: stocks, investing, personal finance, markets, trading, savings, budgets, compound interest, portfolio strategy, economic concepts, and financial literacy.
- If the user asks about ANYTHING outside of finance and investing (coding, homework, sports, relationships, general knowledge, etc.), you must politely redirect them: "I'm your investing coach — I can only help with finance and investing questions! Try asking me about stocks, how the market works, or how to grow your money."
- Never write code, scripts, or programming help of any kind.
- Never give medical, legal, or personal life advice.
- Keep answers short, simple, and encouraging — written for a teenager.
- Use plain English, avoid jargon unless you explain it immediately.
- Max 3 sentences OR max 4 bullet points. Never both.
- Speak like a cool older sibling, not a textbook.
- Never say 'Great question', 'Certainly', or 'As an AI'.
- When relevant, relate answers back to the user's Swish portfolio.
- Always end with an encouraging follow-up question or tip.

You are not a general assistant. You are a focused investing coach.`;

app.post("/api/coach", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in .env" });
  }

  try {
    const { messages, max_tokens, userId } = req.body;

    // Build portfolio context if userId provided
    let portfolioContext = "";
    if (userId && supabaseAdmin) {
      try {
        const [{ data: holdings }, { data: user }] = await Promise.all([
          supabaseAdmin.from("holdings").select("ticker, shares, avg_cost").eq("user_id", userId),
          supabaseAdmin.from("users").select("cash, xp").eq("id", userId).single(),
        ]);
        const activeHoldings = (holdings || []).filter(h => Number(h.shares) >= 0.001);
        if (activeHoldings.length > 0) {
          const finnhubKey = process.env.FINNHUB_API_KEY;
          const quoteLines = await Promise.all(activeHoldings.map(async h => {
            try {
              const q = await fetchSingleQuote(h.ticker, finnhubKey);
              if (q.c) {
                const currentVal = (Number(h.shares) * q.c).toFixed(2);
                const totalPnlPct = (((q.c - Number(h.avg_cost)) / Number(h.avg_cost)) * 100).toFixed(2);
                const sign = totalPnlPct >= 0 ? "+" : "";
                const daySign = q.dp >= 0 ? "+" : "";
                return `  ${h.ticker}: ${h.shares} share(s) @ avg $${Number(h.avg_cost).toFixed(2)}, now $${q.c.toFixed(2)} (${sign}${totalPnlPct}% total, ${daySign}${q.dp?.toFixed(2)}% today) = $${currentVal}`;
              }
            } catch { /* ignore */ }
            return `  ${h.ticker}: ${h.shares} share(s) @ avg $${Number(h.avg_cost).toFixed(2)}`;
          }));
          const cash = Number(user?.cash ?? 10000).toFixed(2);
          portfolioContext = `\n\nUSER PORTFOLIO (live data):\nCash: $${cash}\nHoldings:\n${quoteLines.join("\n")}\n\nUse this data to give personalised answers. Never ask the user what stocks they hold — you already know.`;
        }
      } catch { /* degrade gracefully */ }
    }

    const systemPrompt = COACH_SYSTEM_PROMPT + portfolioContext;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: max_tokens || 150,
        system: systemPrompt,
        messages: messages || [],
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Anthropic API" });
  }
});

/* ── GET /api/quotes/batch — fetch multiple Finnhub quotes in one request ── */
const quoteCache = {};
const QUOTE_CACHE_TTL = 60_000;

async function fetchSingleQuote(ticker, apiKey) {
  const cached = quoteCache[ticker];
  if (cached && Date.now() - cached.ts < QUOTE_CACHE_TTL) {
    return { ticker, c: cached.c, pc: cached.pc, dp: cached.dp, h: cached.h, l: cached.l, o: cached.o, source: "finnhub" };
  }
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`);
    const data = await response.json();
    if (data.c && data.c > 0) {
      quoteCache[ticker] = { c: data.c, pc: data.pc, dp: data.dp ?? 0, h: data.h, l: data.l, o: data.o, ts: Date.now() };
      return { ticker, c: data.c, pc: data.pc, dp: data.dp ?? 0, h: data.h, l: data.l, o: data.o, source: "finnhub" };
    }
  } catch { /* ignore */ }
  return { ticker, c: null };
}

app.get("/api/quotes/batch", async (req, res) => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FINNHUB_API_KEY not set" });
  const symbols = (req.query.symbols || "").split(",").filter(Boolean).map(s => s.toUpperCase()).slice(0, 100);
  if (symbols.length === 0) return res.json({ quotes: {} });

  const results = {};
  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(t => fetchSingleQuote(t, apiKey)));
    for (const q of batchResults) {
      if (q.c != null) results[q.ticker] = q;
    }
  }
  res.json({ quotes: results });
});

/* ── GET /api/quote/:symbol — Real Finnhub prices (no sim engine) ── */
app.get("/api/quote/:symbol", async (req, res) => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "FINNHUB_API_KEY not set in .env" });
  }

  const ticker = req.params.symbol.toUpperCase();

  try {
    // Try Finnhub first (stocks/ETFs) — with cache
    const result = await fetchSingleQuote(ticker, apiKey);
    if (result.c != null) {
      return res.json({ c: result.c, pc: result.pc, dp: result.dp, h: result.h, l: result.l, o: result.o, source: "finnhub" });
    }

    // Finnhub returned 0 — try CoinGecko for crypto
    if (CRYPTO_ID_MAP[ticker]) {
      const cgId = CRYPTO_ID_MAP[ticker];
      const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`);
      const cgData = await cgRes.json();
      const coin = cgData[cgId];
      if (coin && coin.usd > 0) {
        return res.json({ c: coin.usd, pc: coin.usd, dp: coin.usd_24h_change ?? 0, source: "coingecko" });
      }
    }

    res.status(404).json({ error: "No price data available for " + ticker });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach price API" });
  }
});

/* ── Crypto API routes — CoinGecko ── */

const CRYPTO_ID_MAP = {
  BTC:"bitcoin",ETH:"ethereum",BNB:"binancecoin",SOL:"solana",XRP:"ripple",
  DOGE:"dogecoin",ADA:"cardano",AVAX:"avalanche-2",SHIB:"shiba-inu",DOT:"polkadot",
  MATIC:"matic-network",LTC:"litecoin",UNI:"uniswap",LINK:"chainlink",ATOM:"cosmos",
  XLM:"stellar",ALGO:"algorand",ICP:"internet-computer",FIL:"filecoin",NEAR:"near",
  HYPE:"hyperliquid",
};

app.get("/api/crypto/quote/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const id = CRYPTO_ID_MAP[param.toUpperCase()] || param.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url);
    const data = await response.json();
    const coin = data[id];
    if (!coin) return res.json({ c: 0, dp: 0, source: "coingecko" });
    res.json({ c: coin.usd, dp: coin.usd_24h_change ?? 0, source: "coingecko" });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch crypto quote" });
  }
});

let cryptoTopCache = { ts: 0, data: null };
const CRYPTO_TOP_TTL = 5 * 60 * 1000;

app.get("/api/crypto/top", async (req, res) => {
  try {
    if (cryptoTopCache.data && Date.now() - cryptoTopCache.ts < CRYPTO_TOP_TTL) {
      return res.json(cryptoTopCache.data);
    }
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";
    const response = await fetch(url);
    const data = await response.json();
    const coins = (data || [])
      .map(c => ({
        id: c.id,
        symbol: (c.symbol || "").toUpperCase(),
        name: c.name,
        price: c.current_price,
        changePct: c.price_change_percentage_24h ?? 0,
        image: c.image,
      }))
      .filter(c => /^[A-Z0-9]{2,10}$/.test(c.symbol) && c.price > 0);
    cryptoTopCache = { ts: Date.now(), data: { coins } };
    res.json({ coins });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch top crypto" });
  }
});

app.get("/api/crypto/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "q required" });
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    const data = await response.json();
    const coins = (data.coins || []).slice(0, 12).map(c => ({
      id: c.id,
      symbol: (c.symbol || "").toUpperCase(),
      name: c.name,
      image: c.large || c.thumb,
    }));
    res.json({ coins });
  } catch (err) {
    res.status(502).json({ error: "Failed to search crypto" });
  }
});

/* ── GET /api/candles — Yahoo Finance chart data (free, no key) ── */
const YAHOO_RANGE_MAP = {
  "1D": { interval: "5m",  range: "1d"  },
  "1W": { interval: "60m", range: "5d"  },
  "1M": { interval: "1d",  range: "1mo" },
  "3M": { interval: "1d",  range: "3mo" },
  "1Y": { interval: "1wk", range: "1y"  },
};

app.get("/api/candles", async (req, res) => {
  try {
    const { symbol, range } = req.query;
    if (!symbol || !range) {
      return res.status(400).json({ error: "Missing required params: symbol, range" });
    }
    const config = YAHOO_RANGE_MAP[range.toUpperCase()];
    if (!config) {
      return res.status(400).json({ error: "Invalid range. Use: 1D, 1W, 1M, 3M, 1Y" });
    }
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.toUpperCase())}?interval=${config.interval}&range=${config.range}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp) {
      return res.json({ s: "no_data", t: [], c: [] });
    }
    const timestamps = result.timestamp;
    const q = result.indicators.quote[0];
    const closes = q.close, opens = q.open, highs = q.high, lows = q.low;
    const t = [], c = [], o = [], h = [], l = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        t.push(timestamps[i]);
        c.push(closes[i]);
        o.push(opens[i] ?? closes[i]);
        h.push(highs[i] ?? closes[i]);
        l.push(lows[i] ?? closes[i]);
      }
    }
    res.json({ s: "ok", t, c, o, h, l });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch chart data" });
  }
});

/* ── GET /api/movers — Top market movers by % change ── */
const MOVER_SYMBOLS = ["AAPL","NVDA","TSLA","AMZN","GOOGL","NFLX","MSFT","RBLX","SPOT","DIS"];
const MOVER_CANDLE_MAP = {
  "1W": { interval: "60m", range: "5d"  },
  "1M": { interval: "1d",  range: "1mo" },
  "3M": { interval: "1d",  range: "3mo" },
  "1Y": { interval: "1wk", range: "1y"  },
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, opts = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const resp = await fetch(url, opts);
    if (resp.status === 429 && i < retries) {
      await delay(500 * (i + 1));
      continue;
    }
    return resp;
  }
}

app.get("/api/movers", async (req, res) => {
  try {
    const range = (req.query.range || "1D").toUpperCase();
    if (!["1D", "1W", "1M", "3M", "1Y"].includes(range)) {
      return res.status(400).json({ error: "Invalid range. Use: 1D, 1W, 1M, 3M, 1Y" });
    }

    const finnhubKey = process.env.FINNHUB_API_KEY;

    // Stagger fetches 200ms apart to avoid Finnhub rate limits
    const results = [];
    for (let i = 0; i < MOVER_SYMBOLS.length; i++) {
      const symbol = MOVER_SYMBOLS[i];
      if (i > 0 && range === "1D") await delay(200);
      try {
        if (range === "1D") {
          if (!finnhubKey) { results.push(null); continue; }
          const qRes = await fetchWithRetry(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`);
          const q = await qRes.json();
          if (!q || q.c <= 0) { results.push(null); continue; }
          const changePercent = q.dp ?? ((q.c - q.pc) / q.pc) * 100;
          let sparkline = [];
          try {
            const cRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
            const cData = await cRes.json();
            const closes = (cData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(c => c != null);
            if (closes.length >= 2) {
              const step = Math.max(1, Math.floor(closes.length / 12));
              sparkline = closes.filter((_, i) => i % step === 0 || i === closes.length - 1);
            }
          } catch { /* sparkline optional */ }
          results.push({ symbol, price: q.c, changePercent, trending: changePercent >= 0 ? "up" : "down", sparkline });
        } else {
          const config = MOVER_CANDLE_MAP[range];
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${config.interval}&range=${config.range}`;
          const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          const data = await resp.json();
          const result = data?.chart?.result?.[0];
          if (!result?.timestamp) { results.push(null); continue; }
          const q = result.indicators.quote[0];
          const closes = q.close.filter(c => c != null);
          const opens = q.open.filter(o => o != null);
          if (closes.length < 2 || opens.length < 1) { results.push(null); continue; }
          const firstOpen = opens[0];
          const last = closes[closes.length - 1];
          const changePercent = ((last - firstOpen) / firstOpen) * 100;
          const step = Math.max(1, Math.floor(closes.length / 12));
          const sparkline = closes.filter((_, i) => i % step === 0 || i === closes.length - 1);
          results.push({ symbol, price: last, changePercent, trending: changePercent >= 0 ? "up" : "down", sparkline });
        }
      } catch { results.push(null); }
    }

    const movers = results.filter(Boolean).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 5);
    res.json({ movers, range });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch movers" });
  }
});

/* ── GET /api/news/:symbol — Yahoo Finance RSS + Claude AI summary ── */
import RSSParser from "rss-parser";
const rssParser = new RSSParser();
const newsCache = {};
const NEWS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const COMPANY_NAMES = {
  AAPL:"Apple Inc.",NVDA:"NVIDIA Corp.",TSLA:"Tesla Inc.",AMZN:"Amazon.com",
  GOOGL:"Alphabet Inc.",NFLX:"Netflix Inc.",MSFT:"Microsoft Corp.",
  RBLX:"Roblox Corp.",SPOT:"Spotify Technology",DIS:"Walt Disney Co.",
  META:"Meta Platforms",AMD:"Advanced Micro Devices",INTC:"Intel Corp.",
  PYPL:"PayPal Holdings",SQ:"Block Inc.",COIN:"Coinbase Global",
  UBER:"Uber Technologies",ABNB:"Airbnb Inc.",SHOP:"Shopify Inc.",
  SNAP:"Snap Inc.",
  BTC:"Bitcoin",ETH:"Ethereum",SOL:"Solana",DOGE:"Dogecoin",
};

app.get("/api/news/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cached = newsCache[symbol];
  if (cached && Date.now() - cached.ts < NEWS_CACHE_TTL) {
    return res.json(cached.data);
  }

  const companyName = req.query.name || COMPANY_NAMES[symbol] || symbol;

  try {
    // Step 1: Fetch news from Yahoo Finance RSS
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
    let feed;
    try {
      feed = await rssParser.parseURL(rssUrl);
    } catch (rssErr) {
      console.error("RSS fetch error:", rssErr.message);
      return res.json({ summary: "", articles: [] });
    }

    const rawArticles = (feed.items || []).slice(0, 8).map(item => ({
      headline: item.title || "",
      source: item.creator || item.source?.name || "Yahoo Finance",
      date: item.pubDate ? new Date(item.pubDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
      summary: (item.contentSnippet || item.content || "").replace(/<[^>]*>/g, "").slice(0, 200),
      url: item.link || "",
    }));

    if (rawArticles.length === 0) {
      const result = { summary: "", articles: [] };
      newsCache[symbol] = { ts: Date.now(), data: result };
      return res.json(result);
    }

    // Step 2: Claude Haiku — safety filter + summary in one call
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let articles = rawArticles.slice(0, 5);
    let summary = "";

    if (apiKey) {
      try {
        const headlinesList = rawArticles.map((a, i) => `${i}. ${a.headline}`).join("\n");
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 400,
            messages: [{
              role: "user",
              content: `Here are recent news headlines about ${companyName} (${symbol}):\n${headlinesList}\n\n1. Write a 2-sentence summary in excited, simple language for a 15-year-old investor. No jargon.\n2. Remove any headlines about layoffs, controversy, violence, or adult content. Return only the safe ones by index.\n\nReturn ONLY JSON, no markdown fences: {"summary":"...","safeArticles":[0,1,2,3,4]}`
            }],
          }),
        });
        const aiData = await aiRes.json();
        const aiText = (aiData.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        const clean = aiText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          summary = parsed.summary || "";
          if (Array.isArray(parsed.safeArticles)) {
            articles = parsed.safeArticles
              .filter(i => typeof i === "number" && i >= 0 && i < rawArticles.length)
              .map(i => rawArticles[i])
              .slice(0, 5);
          }
        }
      } catch (aiErr) {
        console.error("Claude summary/filter error:", aiErr.message);
        // Fall back to raw articles without AI summary
      }
    }

    const result = { summary, articles };
    newsCache[symbol] = { ts: Date.now(), data: result };
    res.json(result);
  } catch (err) {
    console.error("News endpoint error:", err);
    res.status(502).json({ error: "Failed to fetch news" });
  }
});

/* ── Transactions (trade history) ── */
app.get("/api/transactions", async (req, res) => {
  const { userId, ticker } = req.query;
  if (!userId || !ticker) return res.status(400).json({ error: "userId and ticker required" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("id, action, shares, price, created_at")
      .eq("user_id", userId)
      .eq("ticker", ticker)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ transactions: data || [] });
  } catch (err) {
    console.error("Transactions fetch error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/* ── Watchlist API routes ──
   DB column is "ticker" but frontend uses "symbol" — map on the way in/out.
   After running: ALTER TABLE watchlist RENAME COLUMN ticker TO symbol;
   you can remove the ticker↔symbol mapping below.                        ── */
app.get("/api/watchlist", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });
  if (!supabaseAdmin) {
    console.error("watchlist GET: supabaseAdmin is null");
    return res.status(500).json({ error: "Supabase not configured" });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("watchlist")
      .select("*")
      .eq("user_id", userId);
    if (error) {
      console.error("watchlist GET error:", JSON.stringify(error));
      return res.status(500).json({ error: error.message });
    }
    // Map DB "ticker" column to frontend "symbol" key
    const items = (data || []).map(row => ({
      symbol: row.symbol || row.ticker,
      created_at: row.created_at,
    }));
    res.json({ items });
  } catch (err) {
    console.error("watchlist GET exception:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/watchlist/add", async (req, res) => {
  const { userId, symbol } = req.body;
  if (!userId || !symbol) return res.status(400).json({ error: "userId and symbol required" });
  if (!supabaseAdmin) {
    console.error("watchlist ADD: supabaseAdmin is null");
    return res.status(500).json({ error: "Supabase not configured" });
  }
  try {
    const sym = symbol.toUpperCase();
    // Delete first to avoid unique constraint issues (works with both column names)
    await supabaseAdmin.from("watchlist").delete().eq("user_id", userId).eq("ticker", sym);
    await supabaseAdmin.from("watchlist").delete().eq("user_id", userId).eq("symbol", sym);

    // Try insert with "ticker" column (current DB schema), fall back to "symbol"
    let { data, error } = await supabaseAdmin
      .from("watchlist")
      .insert({ user_id: userId, ticker: sym })
      .select();
    if (error) {
      // Column might be "symbol" if migration was run
      const retry = await supabaseAdmin
        .from("watchlist")
        .insert({ user_id: userId, symbol: sym })
        .select();
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      console.error("watchlist ADD error:", JSON.stringify(error));
      return res.status(500).json({ error: error.message });
    }
    const item = data?.[0];
    res.json({ success: true, item: item ? { symbol: item.symbol || item.ticker, created_at: item.created_at } : null });
  } catch (err) {
    console.error("watchlist ADD exception:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/watchlist/remove", async (req, res) => {
  const { userId, symbol } = req.body;
  if (!userId || !symbol) return res.status(400).json({ error: "userId and symbol required" });
  if (!supabaseAdmin) {
    console.error("watchlist REMOVE: supabaseAdmin is null");
    return res.status(500).json({ error: "Supabase not configured" });
  }
  try {
    const sym = symbol.toUpperCase();
    // Delete matching either column name
    await supabaseAdmin.from("watchlist").delete().eq("user_id", userId).eq("ticker", sym);
    await supabaseAdmin.from("watchlist").delete().eq("user_id", userId).eq("symbol", sym);
    res.json({ success: true });
  } catch (err) {
    console.error("watchlist REMOVE exception:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/insights — AI portfolio insights via Claude Haiku ── */
app.post("/api/insights", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
  }

  try {
    // Build watchlist context if provided
    let watchlistContext = "";
    const wl = req.body.watchlist;
    if (Array.isArray(wl) && wl.length > 0) {
      const items = wl.map(w => {
        const days = w.daysSince ?? 0;
        return `${w.symbol} - watched ${days} day${days !== 1 ? "s" : ""}`;
      }).join(", ");
      watchlistContext = `\nThe user is also watching these stocks (not yet bought): [${items}]\nConsider their watchlist when giving insights — e.g. if they've been watching a stock for many days, suggest whether it might be time to buy or keep watching.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: `You are Swish, an AI finance coach for young investors.
Analyse this user's portfolio data and give exactly 3 short,
punchy, actionable insights. Each insight max 20 words.
Be encouraging but honest. Use simple language for teens.${watchlistContext}
Return ONLY a JSON array of 3 strings, no other text.
Example: ["You're 100% in tech — try diversifying.", "Your cash ratio is high. Put it to work!", "AAPL is up 22% this year. Strong long-term hold."]`,
        messages: [{ role: "user", content: JSON.stringify(req.body) }],
      }),
    });

    const data = await response.json();
    const text = (data.content?.[0]?.text || "[]")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    try {
      const insights = JSON.parse(text);
      res.json({ insights });
    } catch {
      res.json({ insights: [text] });
    }
  } catch (err) {
    res.status(502).json({ error: "Failed to generate insights" });
  }
});

/* ── POST /api/leagues/create — Create a new league ── */
app.post("/api/leagues/create", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { name, userId } = req.body;
  if (!name || !userId) return res.status(400).json({ error: "name and userId required" });

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  try {
    const { data: league, error } = await supabaseAdmin
      .from("leagues")
      .insert({ name, code, created_by: userId })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });

    await supabaseAdmin.from("league_members").insert({ league_id: league.id, user_id: userId });

    res.json({ code: league.code, id: league.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create league" });
  }
});

/* ── POST /api/leagues/join — Join a league by code ── */
app.post("/api/leagues/join", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { code, userId } = req.body;
  if (!code || !userId) return res.status(400).json({ error: "code and userId required" });

  try {
    const { data: league } = await supabaseAdmin
      .from("leagues")
      .select("id")
      .eq("code", code.toUpperCase())
      .maybeSingle();
    if (!league) return res.status(404).json({ error: "Code not found. Check with your teacher." });

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from("league_members")
      .select("id")
      .eq("league_id", league.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return res.json({ success: true, alreadyMember: true });

    const { error } = await supabaseAdmin
      .from("league_members")
      .insert({ league_id: league.id, user_id: userId });
    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to join league" });
  }
});

/* ── GET /api/leagues/:userId — List user's leagues ── */
app.get("/api/leagues/:userId", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data: memberships } = await supabaseAdmin
      .from("league_members")
      .select("league_id, leagues(id, name, code)")
      .eq("user_id", req.params.userId);

    if (!memberships) return res.json({ leagues: [] });

    const leagueIds = memberships.map(m => m.league_id);
    const leagues = await Promise.all(leagueIds.map(async (lid, i) => {
      const { count } = await supabaseAdmin
        .from("league_members")
        .select("*", { count: "exact", head: true })
        .eq("league_id", lid);
      return {
        id: memberships[i].leagues.id,
        name: memberships[i].leagues.name,
        code: memberships[i].leagues.code,
        member_count: count || 0,
      };
    }));

    res.json({ leagues });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
});

/* ── GET /api/leagues/members/:leagueId — League leaderboard ── */
app.get("/api/leagues/members/:leagueId", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data: members } = await supabaseAdmin
      .from("league_members")
      .select("user_id, users(id, username, cash, xp, total_trades, streak, last_active)")
      .eq("league_id", req.params.leagueId);

    if (!members?.length) return res.json([]);

    const result = await Promise.all(members.map(async (m) => {
      const { data: snap } = await supabaseAdmin
        .from("portfolio_snapshots")
        .select("total_value")
        .eq("user_id", m.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const u = m.users;
      const value = snap ? Number(snap.total_value) : Number(u.cash);
      return {
        user_id: m.user_id,
        username: u.username,
        total_value: value,
        gain_pct: ((value - 10000) / 10000) * 100,
        xp: u.xp ?? 0,
        trades: u.total_trades ?? 0,
        last_active: u.last_active ?? null,
        streak: u.streak ?? 0,
      };
    }));

    result.sort((a, b) => b.gain_pct - a.gain_pct);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

/* ── POST /api/streak — Update daily login streak ── */
app.post("/api/streak", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("streak, last_active")
      .eq("id", userId)
      .single();
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak;
    if (user.last_active === today) {
      return res.json({ streak: user.streak ?? 0 });
    } else if (user.last_active === yesterday) {
      newStreak = (user.streak ?? 0) + 1;
    } else {
      newStreak = 1;
    }

    await supabaseAdmin
      .from("users")
      .update({ streak: newStreak, last_active: today })
      .eq("id", userId);

    res.json({ streak: newStreak });
  } catch (err) {
    res.status(500).json({ error: "Failed to update streak" });
  }
});

/* ── GET /api/leaderboard — Global leaderboard by % gain ── */
app.get("/api/leaderboard", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, username, xp, cash");

    if (!users?.length) return res.json({ leaderboard: [] });

    const result = await Promise.all(users.map(async (u) => {
      const { data: snap } = await supabaseAdmin
        .from("portfolio_snapshots")
        .select("total_value")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const value = snap ? Number(snap.total_value) : Number(u.cash);
      return {
        user_id: u.id,
        username: u.username,
        xp: u.xp,
        total_value: value,
        gain_pct: ((value - 10000) / 10000) * 100,
      };
    }));

    result.sort((a, b) => b.gain_pct - a.gain_pct);
    res.json({ leaderboard: result.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

/* ── Challenge definitions (server-side) ── */
const CHALLENGE_DEFS = [
  { id:"first_trade", title:"First Trade", description:"Make your first trade", xpReward:50, category:"trading", difficulty:"easy", type:"one-time", eval:(d)=>{const c=Math.min(d.totalTrades,1);return{current:c,target:1,percent:c>=1?100:0,completed:c>=1}} },
  { id:"ten_trades", title:"Active Trader", description:"Complete 10 trades", xpReward:100, category:"trading", difficulty:"medium", type:"one-time", eval:(d)=>{const c=Math.min(d.totalTrades,10);return{current:c,target:10,percent:(c/10)*100,completed:c>=10}} },
  { id:"fifty_trades", title:"Trading Machine", description:"Complete 50 trades", xpReward:300, category:"trading", difficulty:"hard", type:"one-time", eval:(d)=>{const c=Math.min(d.totalTrades,50);return{current:c,target:50,percent:(c/50)*100,completed:c>=50}} },
  { id:"five_trades_week", title:"Weekly Grinder", description:"Make 5 trades this week", xpReward:75, category:"trading", difficulty:"medium", type:"weekly", eval:(d)=>{const c=Math.min(d.weeklyTrades,5);return{current:c,target:5,percent:(c/5)*100,completed:c>=5}} },
  { id:"buy_and_sell", title:"Round Trip", description:"Buy and sell the same stock", xpReward:60, category:"trading", difficulty:"easy", type:"one-time", eval:(d)=>{const done=d.hasRoundTrip?1:0;return{current:done,target:1,percent:done*100,completed:done===1}} },
  { id:"three_stocks", title:"Diversifier", description:"Hold 3 different stocks at once", xpReward:80, category:"portfolio", difficulty:"easy", type:"one-time", eval:(d)=>{const c=Math.min(d.holdingsCount,3);return{current:c,target:3,percent:(c/3)*100,completed:c>=3}} },
  { id:"five_stocks", title:"Portfolio Builder", description:"Hold 5 different stocks at once", xpReward:150, category:"portfolio", difficulty:"medium", type:"one-time", eval:(d)=>{const c=Math.min(d.holdingsCount,5);return{current:c,target:5,percent:(c/5)*100,completed:c>=5}} },
  { id:"portfolio_up", title:"In The Green", description:"Have your portfolio up 5% or more", xpReward:200, category:"portfolio", difficulty:"hard", type:"ongoing", eval:(d)=>{const g=d.portfolioGainPct;const p=Math.min((g/5)*100,100);return{current:Math.round(g*10)/10,target:5,percent:Math.max(p,0),completed:g>=5}} },
  { id:"invest_half", title:"All In (Half Way)", description:"Invest at least 50% of your starting cash", xpReward:100, category:"portfolio", difficulty:"medium", type:"one-time", eval:(d)=>{const inv=Math.max(10000-d.cash,0);const p=Math.min((inv/5000)*100,100);return{current:Math.round(inv),target:5000,percent:p,completed:inv>=5000}} },
  { id:"streak_3", title:"Consistent", description:"Log in 3 days in a row", xpReward:60, category:"streak", difficulty:"easy", type:"one-time", eval:(d)=>{const c=Math.min(d.streak,3);return{current:c,target:3,percent:(c/3)*100,completed:c>=3}} },
  { id:"streak_7", title:"Week Warrior", description:"Log in 7 days in a row", xpReward:150, category:"streak", difficulty:"medium", type:"one-time", eval:(d)=>{const c=Math.min(d.streak,7);return{current:c,target:7,percent:(c/7)*100,completed:c>=7}} },
  { id:"streak_30", title:"Legendary Streak", description:"Log in 30 days in a row", xpReward:500, category:"streak", difficulty:"hard", type:"one-time", eval:(d)=>{const c=Math.min(d.streak,30);return{current:c,target:30,percent:(c/30)*100,completed:c>=30}} },
  { id:"first_lesson", title:"Student", description:"Complete your first lesson", xpReward:30, category:"learning", difficulty:"easy", type:"one-time", eval:(d)=>{const c=Math.min(d.lessonCount,1);return{current:c,target:1,percent:c>=1?100:0,completed:c>=1}} },
  { id:"five_lessons", title:"Scholar", description:"Complete 5 lessons", xpReward:100, category:"learning", difficulty:"medium", type:"one-time", eval:(d)=>{const c=Math.min(d.lessonCount,5);return{current:c,target:5,percent:(c/5)*100,completed:c>=5}} },
  { id:"all_lessons", title:"Master Investor", description:"Complete all 20 lessons", xpReward:500, category:"learning", difficulty:"hard", type:"one-time", eval:(d)=>{const c=Math.min(d.lessonCount,20);return{current:c,target:20,percent:(c/20)*100,completed:c>=20}} },
];

function getMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0];
}

async function gatherUserData(supabase, userId) {
  const { data: user } = await supabase.from("users").select("*").eq("id", userId).single();
  if (!user) return null;

  const { data: holdings } = await supabase.from("holdings").select("*").eq("user_id", userId);
  const { data: transactions } = await supabase.from("transactions").select("*").eq("user_id", userId);

  const monday = getMonday();
  const weeklyTrades = (transactions || []).filter(t => t.created_at >= monday).length;

  const buys = new Set(), sells = new Set();
  (transactions || []).forEach(t => { if (t.action === "BUY") buys.add(t.ticker); else sells.add(t.ticker); });
  const hasRoundTrip = [...buys].some(s => sells.has(s));

  const { data: snap } = await supabase.from("portfolio_snapshots").select("total_value").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const portfolioValue = snap ? Number(snap.total_value) : Number(user.cash);
  const portfolioGainPct = ((portfolioValue - 10000) / 10000) * 100;

  let lessonCount = 0;
  try {
    const { count } = await supabase.from("lesson_completions").select("*", { count: "exact", head: true }).eq("user_id", userId);
    lessonCount = count || 0;
  } catch { /* table may not exist */ }

  return {
    totalTrades: user.total_trades ?? 0,
    weeklyTrades,
    hasRoundTrip,
    holdingsCount: (holdings || []).length,
    cash: Number(user.cash),
    streak: user.streak ?? 0,
    portfolioGainPct,
    lessonCount,
  };
}

app.get("/api/challenges", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const userData = await gatherUserData(supabaseAdmin, userId);
    if (!userData) return res.status(404).json({ error: "User not found" });

    // Get completions (graceful if table doesn't exist)
    let completionMap = {};
    try {
      const { data: completions } = await supabaseAdmin.from("challenge_completions").select("*").eq("user_id", userId);
      (completions || []).forEach(c => { completionMap[c.challenge_id] = c; });
    } catch { /* table may not exist yet */ }

    const challenges = CHALLENGE_DEFS.map(ch => {
      const result = ch.eval(userData);
      const completion = completionMap[ch.id];
      return {
        id: ch.id, title: ch.title, description: ch.description,
        xpReward: ch.xpReward, category: ch.category, difficulty: ch.difficulty, type: ch.type,
        current: result.current, target: result.target,
        percent: Math.round(result.percent), completed: result.completed,
        claimed: !!completion, completedAt: completion?.completed_at || null,
      };
    });

    res.json({ challenges });
  } catch (err) {
    console.error("Challenge eval error:", err);
    res.status(500).json({ error: "Failed to evaluate challenges" });
  }
});

app.post("/api/challenges/complete", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { userId, challengeId } = req.body;
  if (!userId || !challengeId) return res.status(400).json({ error: "userId and challengeId required" });

  try {
    const ch = CHALLENGE_DEFS.find(c => c.id === challengeId);
    if (!ch) return res.status(404).json({ error: "Challenge not found" });

    const userData = await gatherUserData(supabaseAdmin, userId);
    if (!userData) return res.status(404).json({ error: "User not found" });
    const result = ch.eval(userData);
    if (!result.completed) return res.status(400).json({ error: "Challenge not yet completed" });

    const { data: existing } = await supabaseAdmin.from("challenge_completions").select("id").eq("user_id", userId).eq("challenge_id", challengeId).maybeSingle();
    if (existing) return res.json({ success: true, alreadyClaimed: true, xpAwarded: 0 });

    await supabaseAdmin.from("challenge_completions").insert({ user_id: userId, challenge_id: challengeId, xp_awarded: ch.xpReward });

    const { data: user } = await supabaseAdmin.from("users").select("xp").eq("id", userId).single();
    const newXp = (user?.xp ?? 0) + ch.xpReward;
    await supabaseAdmin.from("users").update({ xp: newXp }).eq("id", userId);

    res.json({ success: true, xpAwarded: ch.xpReward, newXp });
  } catch (err) {
    res.status(500).json({ error: "Failed to complete challenge" });
  }
});

/* ── POST /api/user/role — Set user role (student/teacher) ── */
app.post("/api/user/role", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: "userId and role required" });
  try {
    const { error } = await supabaseAdmin.from("users").update({ role }).eq("id", userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to set role" });
  }
});

/* ── POST /api/lessons/complete — Complete a lesson quiz ── */
app.post("/api/lessons/complete", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { userId, lessonId, score } = req.body;
  if (!userId || !lessonId) return res.status(400).json({ error: "userId and lessonId required" });
  try {
    const { data: existing } = await supabaseAdmin.from("lesson_completions").select("id").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
    if (existing) return res.json({ success: true, alreadyCompleted: true, xpAwarded: 0 });
    const { error: insertErr } = await supabaseAdmin.from("lesson_completions").insert({ user_id: userId, lesson_id: lessonId, score });
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    let xpReward = req.body.xpReward ?? 20;
    if (![20, 35, 50].includes(xpReward)) {
      if (lessonId > 10) xpReward = 50;
      else if (lessonId > 5) xpReward = 35;
      else xpReward = 20;
    }
    const { data: user } = await supabaseAdmin.from("users").select("xp").eq("id", userId).single();
    const newXp = (user?.xp ?? 0) + xpReward;
    await supabaseAdmin.from("users").update({ xp: newXp }).eq("id", userId);
    res.json({ success: true, xpAwarded: xpReward, newXp });
  } catch (err) {
    res.status(500).json({ error: "Failed to complete lesson" });
  }
});

/* ── GET /api/lessons/progress — Get completed lesson IDs ── */
app.get("/api/lessons/progress", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const { data } = await supabaseAdmin.from("lesson_completions").select("lesson_id, score, completed_at").eq("user_id", userId);
    res.json({ completions: data || [] });
  } catch {
    res.json({ completions: [] });
  }
});

/* ── POST /api/scenarios/complete — Save scenario completion ── */
app.post("/api/scenarios/complete", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { userId, scenarioId, score, maxScore, xpEarned } = req.body;
  if (!userId || !scenarioId) return res.status(400).json({ error: "userId and scenarioId required" });
  try {
    const { error: scErr } = await supabaseAdmin.from("scenario_completions").upsert(
      { user_id: userId, scenario_id: scenarioId, score: score || 0, max_score: maxScore || 0, completed_at: new Date().toISOString() },
      { onConflict: "user_id,scenario_id" }
    );
    if (scErr) console.error("scenario upsert error:", JSON.stringify(scErr));
    const xp = xpEarned || 0;
    if (xp > 0) {
      const { data: user } = await supabaseAdmin.from("users").select("xp").eq("id", userId).single();
      const newXp = (user?.xp ?? 0) + xp;
      await supabaseAdmin.from("users").update({ xp: newXp }).eq("id", userId);
    }
    res.json({ success: true, xpAwarded: xp });
  } catch (err) {
    console.error("scenario complete error:", err);
    res.status(500).json({ error: "Failed to complete scenario" });
  }
});

/* ── GET /api/scenarios/progress — Get completed scenario IDs ── */
app.get("/api/scenarios/progress", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const { data, error } = await supabaseAdmin.from("scenario_completions").select("scenario_id, score, max_score, completed_at").eq("user_id", userId);
    if (error) console.error("scenario progress error:", JSON.stringify(error));
    res.json({ completions: data || [] });
  } catch {
    res.json({ completions: [] });
  }
});

const STOCK_CATEGORIES = {
  AAPL:'Tech', MSFT:'Tech', GOOGL:'Tech', NVDA:'Tech', META:'Tech', AMZN:'Tech', AMD:'Tech',
  TSLA:'EV/Auto', NFLX:'Entertainment', RBLX:'Gaming', SPOT:'Entertainment', DIS:'Entertainment',
  JPM:'Finance', BAC:'Finance', GS:'Finance', PYPL:'Finance', COIN:'Crypto',
  JNJ:'Healthcare', PFE:'Healthcare',
  SPY:'ETF', VOO:'ETF', QQQ:'ETF', VTI:'ETF', IWM:'ETF', ARKK:'ETF',
  NKE:'Consumer', SBUX:'Food', CMG:'Food', ABNB:'Travel', UBER:'Transport',
  SNAP:'Social',
};

/* ── GET /api/teacher/recent-activity/:leagueId — Recent activity feed ── */
app.get("/api/teacher/recent-activity/:leagueId", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data: members } = await supabaseAdmin.from("league_members").select("user_id, users(username)").eq("league_id", req.params.leagueId);
    if (!members?.length) return res.json([]);
    const studentIds = members.map(m => m.user_id);
    const usernameMap = {};
    members.forEach(m => { if (m.users) usernameMap[m.user_id] = m.users.username; });

    const [txRes, lessonRes, scenarioRes] = await Promise.all([
      supabaseAdmin.from("transactions").select("user_id, ticker, action, shares, price, created_at").in("user_id", studentIds).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("lesson_completions").select("user_id, lesson_id, completed_at").in("user_id", studentIds).order("completed_at", { ascending: false }).limit(20),
      supabaseAdmin.from("scenario_completions").select("user_id, scenario_id, score, max_score, completed_at").in("user_id", studentIds).order("completed_at", { ascending: false }).limit(20),
    ]);

    const events = [];
    (txRes.data || []).forEach(t => events.push({ type: "trade", username: usernameMap[t.user_id] || "Unknown", ticker: t.ticker, action: t.action, shares: Number(t.shares), price: Number(t.price), timestamp: t.created_at }));
    (lessonRes.data || []).forEach(l => events.push({ type: "lesson", username: usernameMap[l.user_id] || "Unknown", lessonId: l.lesson_id, timestamp: l.completed_at }));
    (scenarioRes.data || []).forEach(s => events.push({ type: "scenario", username: usernameMap[s.user_id] || "Unknown", scenarioId: s.scenario_id, score: s.score, maxScore: s.max_score, timestamp: s.completed_at }));

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(events.slice(0, 20));
  } catch (err) {
    console.error("recent-activity error:", err);
    res.status(500).json({ error: "Failed to load recent activity" });
  }
});

/* ── GET /api/teacher/class-progress/:userId — Lessons, scenarios & trade analytics ── */
app.get("/api/teacher/class-progress/:userId", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const teacherId = req.params.userId;
  const leagueIdParam = req.query.leagueId;
  try {
    let leagueId = leagueIdParam;
    if (!leagueId) {
      const { data: leagues } = await supabaseAdmin.from("leagues").select("id").eq("created_by", teacherId).limit(1);
      leagueId = leagues?.[0]?.id;
    }
    if (!leagueId) return res.json({ avgLessons: 0, avgScenarios: 0, studentBreakdown: [] });
    const { data: members } = await supabaseAdmin.from("league_members").select("user_id, users(username)").eq("league_id", leagueId);
    const studentIds = (members || []).filter(m => m.user_id !== teacherId).map(m => m.user_id);
    if (studentIds.length === 0) return res.json({ avgLessons: 0, avgScenarios: 0, studentBreakdown: [] });
    const [lessonRes, scenarioRes, txResult] = await Promise.all([
      supabaseAdmin.from("lesson_completions").select("user_id, lesson_id").in("user_id", studentIds),
      supabaseAdmin.from("scenario_completions").select("user_id, scenario_id").in("user_id", studentIds),
      supabaseAdmin.from("transactions").select("ticker, user_id").in("user_id", studentIds),
    ]);
    const lessonRows = lessonRes.data || [];
    const scenarioRows = scenarioRes.data || [];
    const txRows = txResult.data || [];
    const usernameMap = {};
    (members || []).forEach(m => { if (m.users) usernameMap[m.user_id] = m.users.username; });
    const breakdown = studentIds.map(sid => ({
      userId: sid, username: usernameMap[sid] || "Unknown",
      lessonsCompleted: lessonRows.filter(r => r.user_id === sid).length,
      scenariosCompleted: scenarioRows.filter(r => r.user_id === sid).length,
    }));
    const totalL = breakdown.reduce((s, b) => s + b.lessonsCompleted, 0);
    const totalS = breakdown.reduce((s, b) => s + b.scenariosCompleted, 0);
    const n = breakdown.length;

    // Trade analytics
    const tickerCount = {};
    const catCount = {};
    const tickerTraders = {};
    txRows.forEach(t => {
      tickerCount[t.ticker] = (tickerCount[t.ticker] || 0) + 1;
      const cat = STOCK_CATEGORIES[t.ticker] || "Other";
      catCount[cat] = (catCount[cat] || 0) + 1;
      if (!tickerTraders[t.ticker]) tickerTraders[t.ticker] = new Set();
      tickerTraders[t.ticker].add(t.user_id);
    });
    const mostTradedStock = Object.entries(tickerCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const mostTradedTraderCount = mostTradedStock ? (tickerTraders[mostTradedStock]?.size || 0) : 0;

    res.json({
      avgLessons: n > 0 ? +(totalL / n).toFixed(1) : 0,
      avgScenarios: n > 0 ? +(totalS / n).toFixed(1) : 0,
      studentBreakdown: breakdown,
      mostTradedStock,
      mostTradedTraderCount,
      topCategory,
      totalTrades: txRows.length,
    });
  } catch (err) {
    console.error("class-progress error:", err);
    res.status(500).json({ error: "Failed to load class progress" });
  }
});

/* ── POST /api/teacher-insights/class — AI coaching for entire class ── */
app.post("/api/teacher-insights/class", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { teacherId, leagueId: reqLeagueId } = req.body;
  if (!teacherId) return res.status(400).json({ error: "teacherId required" });
  try {
    let targetLeagueId = reqLeagueId;
    if (!targetLeagueId) {
      const { data: memberships } = await supabaseAdmin.from("league_members").select("league_id, leagues(id, created_by)").eq("user_id", teacherId);
      const teacherLeague = (memberships || []).find(m => m.leagues?.created_by === teacherId);
      if (!teacherLeague) return res.json({ tips: ["No class found. Create a league first."] });
      targetLeagueId = teacherLeague.league_id;
    }
    const { data: members } = await supabaseAdmin.from("league_members").select("user_id, users(id, username, xp, cash, total_trades, streak, last_active)").eq("league_id", targetLeagueId);
    const studentIds = (members || []).filter(m => m.user_id !== teacherId).map(m => m.user_id);
    const students = (members || []).filter(m => m.user_id !== teacherId).map(m => {
      const u = m.users;
      return { username: u.username, xp: u.xp ?? 0, trades: u.total_trades ?? 0, streak: u.streak ?? 0, cash: Number(u.cash ?? 10000), lastActive: u.last_active };
    });
    if (students.length === 0) return res.json({ tips: ["No students have joined yet. Share your class code!"] });
    // Fetch lesson & scenario completions for class members
    const [lessonRes, scenarioRes] = await Promise.all([
      supabaseAdmin.from("lesson_completions").select("user_id, lesson_id").in("user_id", studentIds),
      supabaseAdmin.from("scenario_completions").select("user_id, scenario_id").in("user_id", studentIds),
    ]);
    const lessonRows = lessonRes.data || [];
    const scenarioRows = scenarioRes.data || [];
    students.forEach(s => {
      const sid = (members || []).find(m => m.users?.username === s.username)?.user_id;
      s.lessonsCompleted = sid ? lessonRows.filter(r => r.user_id === sid).length : 0;
      s.scenariosCompleted = sid ? scenarioRows.filter(r => r.user_id === sid).length : 0;
    });
    const avgLessons = (students.reduce((a, s) => a + s.lessonsCompleted, 0) / students.length).toFixed(1);
    const avgScenarios = (students.reduce((a, s) => a + s.scenariosCompleted, 0) / students.length).toFixed(1);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 400,
        system: `You are Swish, an AI assistant for teachers managing a virtual stock trading class for students aged 8-18. The class has 20 lessons and 8 investment scenarios available. Analyse the class data including lesson/scenario completion rates and provide 3-5 actionable coaching tips. Be specific about student names when relevant. Focus on engagement, learning gaps, lesson/scenario progress, and teaching opportunities. Return ONLY a JSON array of strings, no other text.`,
        messages: [{ role: "user", content: JSON.stringify({ students, classAverages: { avgLessonsCompleted: avgLessons, avgScenariosCompleted: avgScenarios, totalLessons: 20, totalScenarios: 8 }, tradeAnalytics: await (async () => { try { const { data: txRows } = await supabaseAdmin.from("transactions").select("ticker, user_id").in("user_id", studentIds); const tc = {}; const cc = {}; (txRows || []).forEach(t => { tc[t.ticker] = (tc[t.ticker] || 0) + 1; cc[STOCK_CATEGORIES[t.ticker] || "Other"] = (cc[STOCK_CATEGORIES[t.ticker] || "Other"] || 0) + 1; }); return { mostTradedStock: Object.entries(tc).sort((a,b) => b[1]-a[1])[0]?.[0] || null, topCategory: Object.entries(cc).sort((a,b) => b[1]-a[1])[0]?.[0] || null, totalTrades: (txRows || []).length }; } catch { return {}; } })() }) }],
      }),
    });
    const data = await response.json();
    const text = (data.content?.[0]?.text || "[]").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try { const tips = JSON.parse(text); res.json({ tips: Array.isArray(tips) ? tips : [text] }); } catch { res.json({ tips: [text] }); }
  } catch (err) {
    console.error("teacher class insights error:", err);
    res.status(500).json({ error: "Failed to generate class insights" });
  }
});

/* ── POST /api/teacher-insights/student — AI coaching for single student ── */
app.post("/api/teacher-insights/student", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: "studentId required" });
  try {
    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", studentId).single();
    if (!user) return res.status(404).json({ error: "Student not found" });
    const { data: holdings } = await supabaseAdmin.from("holdings").select("*").eq("user_id", studentId);
    const { data: transactions } = await supabaseAdmin.from("transactions").select("ticker, action, shares, price, created_at").eq("user_id", studentId).order("created_at", { ascending: false }).limit(20);
    let lessonCount = 0;
    try { const { count } = await supabaseAdmin.from("lesson_completions").select("*", { count: "exact", head: true }).eq("user_id", studentId); lessonCount = count || 0; } catch {}
    const studentData = {
      username: user.username, xp: user.xp ?? 0, trades: user.total_trades ?? 0, streak: user.streak ?? 0, cash: Number(user.cash),
      holdings: (holdings || []).map(h => ({ ticker: h.ticker, shares: Number(h.shares), avgCost: Number(h.avg_cost) })),
      recentTrades: (transactions || []).slice(0, 10), lessonsCompleted: lessonCount,
    };
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 300,
        system: `You are Swish, an AI coaching assistant helping a teacher understand a specific student's investing progress. Analyse this student's data and provide 2-3 personalised coaching tips. Be specific and actionable. Reference their actual holdings and behavior. Return ONLY a JSON array of strings, no other text.`,
        messages: [{ role: "user", content: JSON.stringify(studentData) }],
      }),
    });
    const data = await response.json();
    const text = (data.content?.[0]?.text || "[]").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try { const tips = JSON.parse(text); res.json({ tips: Array.isArray(tips) ? tips : [text] }); } catch { res.json({ tips: [text] }); }
  } catch (err) {
    res.status(500).json({ error: "Failed to generate student insights" });
  }
});

/* ── DCA (Dollar Cost Averaging) Auto-Invest Plans ── */

// POST /api/dca/create — Create a new DCA plan
app.post("/api/dca/create", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { userId, stockSymbol, amount, frequency, startDate } = req.body;
  if (!userId || !stockSymbol || !amount || !frequency) {
    return res.status(400).json({ error: "userId, stockSymbol, amount, and frequency required" });
  }
  if (amount < 5) return res.status(400).json({ error: "Minimum amount is $5" });

  const freqDays = { weekly: 7, biweekly: 14, monthly: 30 };
  const intervalDays = freqDays[frequency];
  if (!intervalDays) return res.status(400).json({ error: "frequency must be weekly, biweekly, or monthly" });

  const start = startDate || new Date().toISOString().split("T")[0];
  const nextRun = start;

  try {
    const { data, error } = await supabaseAdmin
      .from("dca_plans")
      .insert({
        user_id: userId,
        stock_symbol: stockSymbol.toUpperCase(),
        amount: Number(amount),
        frequency,
        start_date: start,
        next_run_date: nextRun,
        status: "active",
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, plan: data });
  } catch (err) {
    console.error("DCA create error:", err);
    res.status(500).json({ error: "Failed to create DCA plan" });
  }
});

// GET /api/dca/plans — List user's DCA plans
app.get("/api/dca/plans", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const { data, error } = await supabaseAdmin
      .from("dca_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ plans: data || [] });
  } catch (err) {
    console.error("DCA plans fetch error:", err);
    res.status(500).json({ error: "Failed to fetch DCA plans" });
  }
});

// PATCH /api/dca/pause/:id — Pause or resume a DCA plan
app.patch("/api/dca/pause/:id", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const planId = req.params.id;
  try {
    const { data: plan } = await supabaseAdmin
      .from("dca_plans")
      .select("status")
      .eq("id", planId)
      .single();
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const newStatus = plan.status === "paused" ? "active" : "paused";
    const { error } = await supabaseAdmin
      .from("dca_plans")
      .update({ status: newStatus })
      .eq("id", planId);
    if (error) throw error;
    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("DCA pause error:", err);
    res.status(500).json({ error: "Failed to update DCA plan" });
  }
});

// DELETE /api/dca/cancel/:id — Cancel (delete) a DCA plan
app.delete("/api/dca/cancel/:id", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const planId = req.params.id;
  try {
    const { error } = await supabaseAdmin
      .from("dca_plans")
      .delete()
      .eq("id", planId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("DCA cancel error:", err);
    res.status(500).json({ error: "Failed to cancel DCA plan" });
  }
});

/* ── POST /api/feedback — send bug report / feedback via Resend ── */
app.post("/api/feedback", async (req, res) => {
  const { type = "Feedback", message, email, debugContext = {} } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "message required" });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: "RESEND_API_KEY not set" });

  const subjects = { Bug: "[BUG] Swish Bug Report", Feedback: "[FEEDBACK] Swish Feedback", Question: "[QUESTION] Swish Question" };
  const subject = subjects[type] || "[FEEDBACK] Swish Feedback";

  const errList = (debugContext.recentErrors || []).length > 0
    ? debugContext.recentErrors.map(e => `  ${e.time}: ${e.message} (${e.filename || ""}:${e.line || ""})`).join("\n")
    : "  None";
  const failList = (debugContext.recentFailedRequests || []).length > 0
    ? debugContext.recentFailedRequests.map(r => `  ${r.time}: ${r.url} → ${r.status || r.error}`).join("\n")
    : "  None";

  const text = `
━━━━ USER MESSAGE ━━━━
Type:         ${type}
Message:      ${message}
User email:   ${email || "not provided"}

━━━━ DEBUG CONTEXT ━━━━
User ID:      ${debugContext.userId || "n/a"}
User name:    ${debugContext.userName || "n/a"}
User email:   ${debugContext.userEmail || "n/a"}
Session ID:   ${debugContext.sessionId || "n/a"}
Session:      ${debugContext.sessionStatus || "n/a"}

━━━━ PAGE ━━━━
URL:          ${debugContext.url || "n/a"}
Page:         ${debugContext.page || "n/a"}
Timestamp:    ${debugContext.timestamp || "n/a"}
App version:  ${debugContext.appVersion || "n/a"}
Page load:    ${debugContext.pageLoadTime || "n/a"}ms

━━━━ DEVICE ━━━━
Viewport:     ${debugContext.viewport || "n/a"}
Platform:     ${debugContext.platform || "n/a"}
DPR:          ${debugContext.devicePixelRatio || "n/a"}
Language:     ${debugContext.language || "n/a"}
User agent:   ${debugContext.userAgent || "n/a"}

━━━━ RECENT ERRORS ━━━━
${errList}

━━━━ FAILED API CALLS ━━━━
${failList}
`.trim();

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "Swish Feedback <onboarding@resend.dev>",
        to: ["iamarchon@proton.me"],
        subject,
        text,
        ...(email ? { reply_to: email } : {}),
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error("Resend error:", err);
      return res.status(502).json({ error: "Email delivery failed" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Feedback send error:", err);
    res.status(502).json({ error: "Email delivery failed" });
  }
});

/* ── GET /api/stocks/sector — dynamic stock list by sector, sorted by market cap ── */
const SECTOR_MAP = {
  "Tech":     ["Technology","Semiconductors","Software—Application","Software—Infrastructure","Computer Hardware","Consumer Electronics","Information Technology Services","Communication Equipment","Semiconductor Equipment & Materials","Electronic Components"],
  "Media":    ["Entertainment","Broadcasting","Publishing","Interactive Media & Services","Communication Services"],
  "Gaming":   ["Electronic Gaming & Multimedia"],
  "Social":   ["Internet Content & Information"],
  "Fintech":  ["Credit Services","Capital Markets","Financial Services","Insurance","Banks—Diversified","Banks—Regional","Asset Management"],
  "Consumer": ["Consumer Cyclical","Consumer Defensive","Apparel—Retail","Personal Products","Leisure","Luxury Goods"],
  "Auto":     ["Auto Manufacturers","Auto Parts","Auto & Truck Dealerships"],
  "Retail":   ["Internet Retail","Retail—Specialty","Retail—Consumer Electronics","Grocery Stores","Department Stores","Home Improvement Retail"],
  "Food":     ["Restaurants","Packaged Foods","Farm Products","Beverages—Non-Alcoholic","Beverages—Brewers","Beverages—Wineries & Distilleries"],
  "Travel":   ["Travel Services","Hotels & Motels","Airlines","Lodging","Resorts & Casinos","Rental & Leasing Services"],
  "Transport":["Integrated Freight & Logistics","Air Freight & Logistics","Railroads","Trucking","Marine Shipping"],
};

// Stocks pre-populated with Finnhub finnhubIndustry values & approximate market cap (USD millions) for sorting.
const SECTOR_STOCKS_DATA = [
  // Tech
  { ticker:"AAPL",  name:"Apple Inc.",                  industry:"Consumer Electronics",                 marketCap:3500000 },
  { ticker:"MSFT",  name:"Microsoft Corp.",             industry:"Software—Infrastructure",              marketCap:3100000 },
  { ticker:"NVDA",  name:"NVIDIA Corp.",                industry:"Semiconductors",                       marketCap:2900000 },
  { ticker:"AVGO",  name:"Broadcom Inc.",               industry:"Semiconductors",                       marketCap:800000  },
  { ticker:"ORCL",  name:"Oracle Corp.",                industry:"Software—Infrastructure",              marketCap:480000  },
  { ticker:"CRM",   name:"Salesforce Inc.",             industry:"Software—Application",                 marketCap:290000  },
  { ticker:"AMD",   name:"Advanced Micro Devices",      industry:"Semiconductors",                       marketCap:270000  },
  { ticker:"QCOM",  name:"Qualcomm Inc.",               industry:"Semiconductors",                       marketCap:190000  },
  { ticker:"TXN",   name:"Texas Instruments",           industry:"Semiconductors",                       marketCap:180000  },
  { ticker:"NOW",   name:"ServiceNow Inc.",             industry:"Software—Application",                 marketCap:220000  },
  { ticker:"ADBE",  name:"Adobe Inc.",                  industry:"Software—Application",                 marketCap:175000  },
  { ticker:"INTU",  name:"Intuit Inc.",                 industry:"Software—Application",                 marketCap:170000  },
  { ticker:"PANW",  name:"Palo Alto Networks",          industry:"Software—Infrastructure",              marketCap:120000  },
  { ticker:"SHOP",  name:"Shopify Inc.",                industry:"Software—Application",                 marketCap:120000  },
  { ticker:"PLTR",  name:"Palantir Technologies",       industry:"Software—Application",                 marketCap:115000  },
  { ticker:"MU",    name:"Micron Technology",           industry:"Semiconductors",                       marketCap:105000  },
  { ticker:"CSCO",  name:"Cisco Systems",               industry:"Communication Equipment",              marketCap:225000  },
  { ticker:"ANET",  name:"Arista Networks",             industry:"Communication Equipment",              marketCap:100000  },
  { ticker:"AMAT",  name:"Applied Materials",           industry:"Semiconductor Equipment & Materials",  marketCap:145000  },
  { ticker:"LRCX",  name:"Lam Research",                industry:"Semiconductor Equipment & Materials",  marketCap:90000   },
  { ticker:"KLAC",  name:"KLA Corp.",                   industry:"Semiconductor Equipment & Materials",  marketCap:80000   },
  { ticker:"CRWD",  name:"CrowdStrike Holdings",        industry:"Software—Infrastructure",              marketCap:90000   },
  { ticker:"INTC",  name:"Intel Corp.",                 industry:"Semiconductors",                       marketCap:90000   },
  { ticker:"SNPS",  name:"Synopsys Inc.",               industry:"Software—Application",                 marketCap:80000   },
  { ticker:"CDNS",  name:"Cadence Design Systems",      industry:"Software—Application",                 marketCap:75000   },
  { ticker:"ACN",   name:"Accenture plc",               industry:"Information Technology Services",      marketCap:215000  },
  { ticker:"IBM",   name:"IBM Corp.",                   industry:"Information Technology Services",      marketCap:200000  },
  { ticker:"CTSH",  name:"Cognizant Technology",        industry:"Information Technology Services",      marketCap:37000   },
  { ticker:"SNOW",  name:"Snowflake Inc.",              industry:"Software—Application",                 marketCap:55000   },
  { ticker:"DDOG",  name:"Datadog Inc.",                industry:"Software—Application",                 marketCap:45000   },
  { ticker:"FTNT",  name:"Fortinet Inc.",               industry:"Software—Infrastructure",              marketCap:60000   },
  { ticker:"ZS",    name:"Zscaler Inc.",                industry:"Software—Infrastructure",              marketCap:30000   },
  { ticker:"MRVL",  name:"Marvell Technology",          industry:"Semiconductors",                       marketCap:55000   },
  { ticker:"DELL",  name:"Dell Technologies",           industry:"Computer Hardware",                    marketCap:55000   },
  { ticker:"HPQ",   name:"HP Inc.",                     industry:"Computer Hardware",                    marketCap:33000   },
  { ticker:"HPE",   name:"Hewlett Packard Enterprise",  industry:"Computer Hardware",                    marketCap:20000   },
  { ticker:"GLW",   name:"Corning Inc.",                industry:"Electronic Components",                marketCap:36000   },
  { ticker:"JNPR",  name:"Juniper Networks",            industry:"Communication Equipment",              marketCap:13000   },
  { ticker:"WDAY",  name:"Workday Inc.",                industry:"Software—Application",                 marketCap:60000   },
  // Media
  { ticker:"NFLX",  name:"Netflix Inc.",                industry:"Entertainment",                        marketCap:400000  },
  { ticker:"DIS",   name:"Walt Disney Co.",             industry:"Entertainment",                        marketCap:185000  },
  { ticker:"CMCSA", name:"Comcast Corp.",               industry:"Broadcasting",                         marketCap:155000  },
  { ticker:"SPOT",  name:"Spotify Technology",          industry:"Entertainment",                        marketCap:90000   },
  { ticker:"WBD",   name:"Warner Bros. Discovery",      industry:"Entertainment",                        marketCap:25000   },
  { ticker:"LYV",   name:"Live Nation Entertainment",   industry:"Entertainment",                        marketCap:22000   },
  { ticker:"FOXA",  name:"Fox Corp.",                   industry:"Broadcasting",                         marketCap:21000   },
  { ticker:"CHTR",  name:"Charter Communications",      industry:"Communication Services",               marketCap:50000   },
  { ticker:"SIRI",  name:"Sirius XM Holdings",          industry:"Broadcasting",                         marketCap:12000   },
  { ticker:"ROKU",  name:"Roku Inc.",                   industry:"Entertainment",                        marketCap:12000   },
  { ticker:"PARA",  name:"Paramount Global",            industry:"Entertainment",                        marketCap:8000    },
  { ticker:"NYT",   name:"New York Times Co.",          industry:"Publishing",                           marketCap:8500    },
  { ticker:"IMAX",  name:"IMAX Corp.",                  industry:"Entertainment",                        marketCap:1100    },
  { ticker:"AMC",   name:"AMC Networks",                industry:"Broadcasting",                         marketCap:750     },
  // Gaming
  { ticker:"SONY",  name:"Sony Group Corp.",            industry:"Electronic Gaming & Multimedia",       marketCap:120000  },
  { ticker:"NTDOY", name:"Nintendo Co.",                industry:"Electronic Gaming & Multimedia",       marketCap:46000   },
  { ticker:"NTES",  name:"NetEase Inc.",                industry:"Electronic Gaming & Multimedia",       marketCap:45000   },
  { ticker:"SE",    name:"Sea Limited",                 industry:"Electronic Gaming & Multimedia",       marketCap:38000   },
  { ticker:"EA",    name:"Electronic Arts",             industry:"Electronic Gaming & Multimedia",       marketCap:35000   },
  { ticker:"TTWO",  name:"Take-Two Interactive",        industry:"Electronic Gaming & Multimedia",       marketCap:32000   },
  { ticker:"RBLX",  name:"Roblox Corp.",                industry:"Electronic Gaming & Multimedia",       marketCap:28000   },
  { ticker:"BILI",  name:"Bilibili Inc.",               industry:"Electronic Gaming & Multimedia",       marketCap:8000    },
  { ticker:"U",     name:"Unity Software",             industry:"Electronic Gaming & Multimedia",       marketCap:7500    },
  { ticker:"PLTK",  name:"Playtika Holding",            industry:"Electronic Gaming & Multimedia",       marketCap:1500    },
  { ticker:"HUYA",  name:"Huya Inc.",                   industry:"Electronic Gaming & Multimedia",       marketCap:500     },
  { ticker:"SKLZ",  name:"Skillz Inc.",                 industry:"Electronic Gaming & Multimedia",       marketCap:150     },
  // Social
  { ticker:"GOOGL", name:"Alphabet Inc.",               industry:"Internet Content & Information",       marketCap:2100000 },
  { ticker:"META",  name:"Meta Platforms",              industry:"Internet Content & Information",       marketCap:1500000 },
  { ticker:"PINS",  name:"Pinterest Inc.",              industry:"Internet Content & Information",       marketCap:20000   },
  { ticker:"RDDT",  name:"Reddit Inc.",                 industry:"Internet Content & Information",       marketCap:18000   },
  { ticker:"SNAP",  name:"Snap Inc.",                   industry:"Internet Content & Information",       marketCap:18000   },
  { ticker:"MTCH",  name:"Match Group",                 industry:"Internet Content & Information",       marketCap:8000    },
  { ticker:"ZG",    name:"Zillow Group",                industry:"Internet Content & Information",       marketCap:15000   },
  { ticker:"BMBL",  name:"Bumble Inc.",                 industry:"Internet Content & Information",       marketCap:1200    },
  { ticker:"ANGI",  name:"Angi Inc.",                   industry:"Internet Content & Information",       marketCap:800     },
  { ticker:"YELP",  name:"Yelp Inc.",                   industry:"Internet Content & Information",       marketCap:2500    },
  // Fintech
  { ticker:"V",     name:"Visa Inc.",                   industry:"Credit Services",                      marketCap:540000  },
  { ticker:"MA",    name:"Mastercard Inc.",             industry:"Credit Services",                      marketCap:460000  },
  { ticker:"JPM",   name:"JPMorgan Chase",              industry:"Banks—Diversified",                    marketCap:650000  },
  { ticker:"BAC",   name:"Bank of America",             industry:"Banks—Diversified",                    marketCap:340000  },
  { ticker:"BX",    name:"Blackstone Inc.",             industry:"Asset Management",                     marketCap:190000  },
  { ticker:"WFC",   name:"Wells Fargo",                 industry:"Banks—Diversified",                    marketCap:220000  },
  { ticker:"GS",    name:"Goldman Sachs",               industry:"Capital Markets",                      marketCap:185000  },
  { ticker:"MS",    name:"Morgan Stanley",              industry:"Capital Markets",                      marketCap:155000  },
  { ticker:"BLK",   name:"BlackRock Inc.",              industry:"Asset Management",                     marketCap:155000  },
  { ticker:"AXP",   name:"American Express",            industry:"Credit Services",                      marketCap:230000  },
  { ticker:"SCHW",  name:"Charles Schwab",              industry:"Capital Markets",                      marketCap:130000  },
  { ticker:"PGR",   name:"Progressive Corp.",           industry:"Insurance",                            marketCap:130000  },
  { ticker:"C",     name:"Citigroup Inc.",              industry:"Banks—Diversified",                    marketCap:130000  },
  { ticker:"KKR",   name:"KKR & Co.",                   industry:"Asset Management",                     marketCap:120000  },
  { ticker:"ICE",   name:"Intercontinental Exchange",   industry:"Capital Markets",                      marketCap:90000   },
  { ticker:"APO",   name:"Apollo Global Management",   industry:"Asset Management",                     marketCap:90000   },
  { ticker:"COF",   name:"Capital One Financial",       industry:"Credit Services",                      marketCap:75000   },
  { ticker:"PYPL",  name:"PayPal Holdings",             industry:"Credit Services",                      marketCap:70000   },
  { ticker:"PNC",   name:"PNC Financial Services",      industry:"Banks—Regional",                       marketCap:73000   },
  { ticker:"USB",   name:"U.S. Bancorp",                industry:"Banks—Regional",                       marketCap:70000   },
  { ticker:"NU",    name:"Nu Holdings",                 industry:"Banks—Regional",                       marketCap:55000   },
  { ticker:"CME",   name:"CME Group Inc.",              industry:"Capital Markets",                      marketCap:82000   },
  { ticker:"AFL",   name:"Aflac Inc.",                  industry:"Insurance",                            marketCap:50000   },
  { ticker:"PRU",   name:"Prudential Financial",        industry:"Insurance",                            marketCap:40000   },
  { ticker:"DFS",   name:"Discover Financial",          industry:"Credit Services",                      marketCap:38000   },
  { ticker:"COIN",  name:"Coinbase Global",             industry:"Financial Services",                   marketCap:45000   },
  { ticker:"SQ",    name:"Block Inc.",                  industry:"Financial Services",                   marketCap:42000   },
  { ticker:"MET",   name:"MetLife Inc.",                industry:"Insurance",                            marketCap:55000   },
  { ticker:"CBOE",  name:"Cboe Global Markets",         industry:"Capital Markets",                      marketCap:23000   },
  { ticker:"HOOD",  name:"Robinhood Markets",           industry:"Capital Markets",                      marketCap:16000   },
  { ticker:"AFRM",  name:"Affirm Holdings",             industry:"Credit Services",                      marketCap:18000   },
  { ticker:"SOFI",  name:"SoFi Technologies",           industry:"Financial Services",                   marketCap:9000    },
  // Consumer
  { ticker:"PG",    name:"Procter & Gamble",            industry:"Consumer Defensive",                   marketCap:370000  },
  { ticker:"NKE",   name:"Nike Inc.",                   industry:"Apparel—Retail",                       marketCap:90000   },
  { ticker:"CL",    name:"Colgate-Palmolive",           industry:"Personal Products",                    marketCap:55000   },
  { ticker:"KMB",   name:"Kimberly-Clark Corp.",        industry:"Consumer Defensive",                   marketCap:43000   },
  { ticker:"EL",    name:"Estée Lauder Companies",      industry:"Personal Products",                    marketCap:28000   },
  { ticker:"RCL",   name:"Royal Caribbean Group",       industry:"Leisure",                              marketCap:50000   },
  { ticker:"CCL",   name:"Carnival Corp.",              industry:"Leisure",                              marketCap:27000   },
  { ticker:"LULU",  name:"Lululemon Athletica",         industry:"Apparel—Retail",                       marketCap:32000   },
  { ticker:"RL",    name:"Ralph Lauren Corp.",          industry:"Luxury Goods",                         marketCap:14000   },
  { ticker:"ULTA",  name:"Ulta Beauty",                 industry:"Personal Products",                    marketCap:17000   },
  { ticker:"TPR",   name:"Tapestry Inc.",               industry:"Luxury Goods",                         marketCap:11000   },
  { ticker:"NCLH",  name:"Norwegian Cruise Line",       industry:"Leisure",                              marketCap:9000    },
  { ticker:"RH",    name:"RH (Restoration Hardware)",   industry:"Leisure",                              marketCap:7000    },
  { ticker:"HAS",   name:"Hasbro Inc.",                 industry:"Leisure",                              marketCap:7000    },
  { ticker:"PLNT",  name:"Planet Fitness",              industry:"Leisure",                              marketCap:6000    },
  { ticker:"LEVI",  name:"Levi Strauss & Co.",          industry:"Apparel—Retail",                       marketCap:6000    },
  { ticker:"BBWI",  name:"Bath & Body Works",           industry:"Consumer Cyclical",                    marketCap:6000    },
  { ticker:"PVH",   name:"PVH Corp.",                   industry:"Apparel—Retail",                       marketCap:5500    },
  { ticker:"MAT",   name:"Mattel Inc.",                 industry:"Leisure",                              marketCap:5000    },
  { ticker:"CPRI",  name:"Capri Holdings",              industry:"Luxury Goods",                         marketCap:4000    },
  { ticker:"COTY",  name:"Coty Inc.",                   industry:"Personal Products",                    marketCap:3500    },
  { ticker:"UAA",   name:"Under Armour Inc.",           industry:"Apparel—Retail",                       marketCap:3500    },
  { ticker:"CHD",   name:"Church & Dwight",             industry:"Consumer Defensive",                   marketCap:22000   },
  { ticker:"PTON",  name:"Peloton Interactive",         industry:"Leisure",                              marketCap:2500    },
  { ticker:"HBI",   name:"Hanesbrands Inc.",            industry:"Apparel—Retail",                       marketCap:1500    },
  { ticker:"GES",   name:"Guess? Inc.",                 industry:"Apparel—Retail",                       marketCap:800     },
  // Auto
  { ticker:"TSLA",  name:"Tesla Inc.",                  industry:"Auto Manufacturers",                   marketCap:850000  },
  { ticker:"TM",    name:"Toyota Motor Corp.",          industry:"Auto Manufacturers",                   marketCap:270000  },
  { ticker:"F",     name:"Ford Motor Co.",              industry:"Auto Manufacturers",                   marketCap:55000   },
  { ticker:"GM",    name:"General Motors",              industry:"Auto Manufacturers",                   marketCap:55000   },
  { ticker:"STLA",  name:"Stellantis N.V.",             industry:"Auto Manufacturers",                   marketCap:40000   },
  { ticker:"HMC",   name:"Honda Motor Co.",             industry:"Auto Manufacturers",                   marketCap:50000   },
  { ticker:"RIVN",  name:"Rivian Automotive",           industry:"Auto Manufacturers",                   marketCap:14000   },
  { ticker:"LCID",  name:"Lucid Group",                 industry:"Auto Manufacturers",                   marketCap:6000    },
  { ticker:"NIO",   name:"NIO Inc.",                    industry:"Auto Manufacturers",                   marketCap:12000   },
  { ticker:"XPEV",  name:"XPeng Inc.",                  industry:"Auto Manufacturers",                   marketCap:10000   },
  { ticker:"APTV",  name:"Aptiv plc",                   industry:"Auto Parts",                           marketCap:16000   },
  { ticker:"BWA",   name:"BorgWarner Inc.",             industry:"Auto Parts",                           marketCap:8000    },
  { ticker:"LEA",   name:"Lear Corp.",                  industry:"Auto Parts",                           marketCap:5000    },
  { ticker:"MODG",  name:"Acushnet Holdings (Golf)",    industry:"Auto & Truck Dealerships",             marketCap:3000    },
  { ticker:"AN",    name:"AutoNation Inc.",             industry:"Auto & Truck Dealerships",             marketCap:7000    },
  // Retail
  { ticker:"AMZN",  name:"Amazon.com",                  industry:"Internet Retail",                      marketCap:2200000 },
  { ticker:"WMT",   name:"Walmart Inc.",                industry:"Grocery Stores",                       marketCap:700000  },
  { ticker:"COST",  name:"Costco Wholesale",            industry:"Grocery Stores",                       marketCap:400000  },
  { ticker:"TGT",   name:"Target Corp.",                industry:"Retail—Specialty",                     marketCap:55000   },
  { ticker:"TJX",   name:"TJX Companies",              industry:"Retail—Specialty",                     marketCap:130000  },
  { ticker:"EBAY",  name:"eBay Inc.",                   industry:"Internet Retail",                      marketCap:25000   },
  { ticker:"ETSY",  name:"Etsy Inc.",                   industry:"Internet Retail",                      marketCap:10000   },
  { ticker:"W",     name:"Wayfair Inc.",                industry:"Internet Retail",                      marketCap:7000    },
  { ticker:"BBY",   name:"Best Buy Co.",                industry:"Retail—Consumer Electronics",          marketCap:13000   },
  { ticker:"HD",    name:"Home Depot Inc.",             industry:"Home Improvement Retail",              marketCap:375000  },
  { ticker:"LOW",   name:"Lowe's Companies",            industry:"Home Improvement Retail",              marketCap:145000  },
  { ticker:"DLTR",  name:"Dollar Tree Inc.",            industry:"Retail—Specialty",                     marketCap:25000   },
  { ticker:"DG",    name:"Dollar General Corp.",        industry:"Retail—Specialty",                     marketCap:20000   },
  { ticker:"KR",    name:"Kroger Co.",                  industry:"Grocery Stores",                       marketCap:40000   },
  { ticker:"SFM",   name:"Sprouts Farmers Market",      industry:"Grocery Stores",                       marketCap:10000   },
  { ticker:"CHWY",  name:"Chewy Inc.",                  industry:"Internet Retail",                      marketCap:12000   },
  { ticker:"ANF",   name:"Abercrombie & Fitch",         industry:"Department Stores",                    marketCap:6000    },
  { ticker:"M",     name:"Macy's Inc.",                 industry:"Department Stores",                    marketCap:3500    },
  { ticker:"JWN",   name:"Nordstrom Inc.",              industry:"Department Stores",                    marketCap:2500    },
  // Food
  { ticker:"MCD",   name:"McDonald's Corp.",            industry:"Restaurants",                          marketCap:225000  },
  { ticker:"SBUX",  name:"Starbucks Corp.",             industry:"Restaurants",                          marketCap:90000   },
  { ticker:"CMG",   name:"Chipotle Mexican Grill",      industry:"Restaurants",                          marketCap:85000   },
  { ticker:"YUM",   name:"Yum! Brands",                 industry:"Restaurants",                          marketCap:35000   },
  { ticker:"DPZ",   name:"Domino's Pizza",              industry:"Restaurants",                          marketCap:17000   },
  { ticker:"QSR",   name:"Restaurant Brands Intl.",     industry:"Restaurants",                          marketCap:22000   },
  { ticker:"WEN",   name:"Wendy's Co.",                 industry:"Restaurants",                          marketCap:3500    },
  { ticker:"SHAK",  name:"Shake Shack Inc.",            industry:"Restaurants",                          marketCap:4500    },
  { ticker:"TXRH",  name:"Texas Roadhouse Inc.",        industry:"Restaurants",                          marketCap:12000   },
  { ticker:"DNUT",  name:"Krispy Kreme Inc.",           industry:"Restaurants",                          marketCap:1500    },
  { ticker:"KO",    name:"Coca-Cola Co.",               industry:"Beverages—Non-Alcoholic",              marketCap:270000  },
  { ticker:"PEP",   name:"PepsiCo Inc.",                industry:"Beverages—Non-Alcoholic",              marketCap:220000  },
  { ticker:"MNST",  name:"Monster Beverage",            industry:"Beverages—Non-Alcoholic",              marketCap:55000   },
  { ticker:"CELH",  name:"Celsius Holdings",            industry:"Beverages—Non-Alcoholic",              marketCap:12000   },
  { ticker:"SAM",   name:"Boston Beer Company",         industry:"Beverages—Brewers",                    marketCap:2000    },
  { ticker:"BUD",   name:"Anheuser-Busch InBev",        industry:"Beverages—Brewers",                    marketCap:55000   },
  { ticker:"GIS",   name:"General Mills",               industry:"Packaged Foods",                       marketCap:38000   },
  { ticker:"K",     name:"Kellanova (fmr. Kellogg)",    industry:"Packaged Foods",                       marketCap:28000   },
  { ticker:"HSY",   name:"Hershey Co.",                 industry:"Packaged Foods",                       marketCap:35000   },
  { ticker:"CPB",   name:"Campbell Soup Co.",           industry:"Packaged Foods",                       marketCap:11000   },
  // Travel
  { ticker:"BKNG",  name:"Booking Holdings",            industry:"Travel Services",                      marketCap:160000  },
  { ticker:"ABNB",  name:"Airbnb Inc.",                 industry:"Travel Services",                      marketCap:75000   },
  { ticker:"EXPE",  name:"Expedia Group",               industry:"Travel Services",                      marketCap:20000   },
  { ticker:"TRIP",  name:"TripAdvisor Inc.",            industry:"Travel Services",                      marketCap:2500    },
  { ticker:"MAR",   name:"Marriott International",      industry:"Hotels & Motels",                      marketCap:70000   },
  { ticker:"HLT",   name:"Hilton Worldwide",            industry:"Hotels & Motels",                      marketCap:55000   },
  { ticker:"H",     name:"Hyatt Hotels Corp.",          industry:"Hotels & Motels",                      marketCap:13000   },
  { ticker:"WH",    name:"Wyndham Hotels & Resorts",    industry:"Hotels & Motels",                      marketCap:7000    },
  { ticker:"DAL",   name:"Delta Air Lines",             industry:"Airlines",                             marketCap:30000   },
  { ticker:"UAL",   name:"United Airlines",             industry:"Airlines",                             marketCap:20000   },
  { ticker:"AAL",   name:"American Airlines",           industry:"Airlines",                             marketCap:11000   },
  { ticker:"LUV",   name:"Southwest Airlines",          industry:"Airlines",                             marketCap:20000   },
  { ticker:"JBLU",  name:"JetBlue Airways",             industry:"Airlines",                             marketCap:2500    },
  { ticker:"NCLH",  name:"Norwegian Cruise Line",       industry:"Lodging",                              marketCap:9000    },
  { ticker:"WYNN",  name:"Wynn Resorts",                industry:"Resorts & Casinos",                    marketCap:10000   },
  { ticker:"MGM",   name:"MGM Resorts International",   industry:"Resorts & Casinos",                    marketCap:13000   },
  // Transport
  { ticker:"UPS",   name:"UPS Inc.",                    industry:"Integrated Freight & Logistics",       marketCap:100000  },
  { ticker:"FDX",   name:"FedEx Corp.",                 industry:"Integrated Freight & Logistics",       marketCap:70000   },
  { ticker:"UBER",  name:"Uber Technologies",           industry:"Integrated Freight & Logistics",       marketCap:160000  },
  { ticker:"LYFT",  name:"Lyft Inc.",                   industry:"Integrated Freight & Logistics",       marketCap:6000    },
  { ticker:"XPO",   name:"XPO Inc.",                    industry:"Trucking",                             marketCap:14000   },
  { ticker:"JBHT",  name:"J.B. Hunt Transport",         industry:"Trucking",                             marketCap:17000   },
  { ticker:"CHRW",  name:"C.H. Robinson",               industry:"Integrated Freight & Logistics",       marketCap:12000   },
  { ticker:"ODFL",  name:"Old Dominion Freight",        industry:"Trucking",                             marketCap:45000   },
  { ticker:"SAIA",  name:"Saia Inc.",                   industry:"Trucking",                             marketCap:12000   },
  { ticker:"CSX",   name:"CSX Corp.",                   industry:"Railroads",                            marketCap:70000   },
  { ticker:"UNP",   name:"Union Pacific Corp.",         industry:"Railroads",                            marketCap:150000  },
  { ticker:"NSC",   name:"Norfolk Southern Corp.",      industry:"Railroads",                            marketCap:55000   },
  { ticker:"EXPD",  name:"Expeditors Intl.",            industry:"Air Freight & Logistics",              marketCap:18000   },
];

const SECTOR_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const sectorCache = {};

app.get("/api/stocks/sector", (req, res) => {
  const sector = (req.query.sector || "").trim();
  const limit  = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  if (!sector) return res.status(400).json({ error: "sector query param required" });
  const industries = SECTOR_MAP[sector];
  if (!industries) return res.status(400).json({ error: `Unknown sector "${sector}"` });

  const cached = sectorCache[sector];
  if (cached && Date.now() - cached.ts < SECTOR_CACHE_TTL) {
    return res.json({ sector, stocks: cached.stocks.slice(0, limit), total: cached.stocks.length });
  }
  const industrySet = new Set(industries);
  const seen = new Set();
  const stocks = SECTOR_STOCKS_DATA
    .filter(s => {
      if (!industrySet.has(s.industry)) return false;
      if (seen.has(s.ticker)) return false;
      seen.add(s.ticker);
      return true;
    })
    .sort((a, b) => b.marketCap - a.marketCap)
    .map(({ ticker, name, industry }) => ({ ticker, name, industry }));

  sectorCache[sector] = { ts: Date.now(), stocks };
  res.json({ sector, stocks: stocks.slice(0, limit), total: stocks.length });
});

// Local dev: start server. Vercel uses the export.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Swish API server running on http://localhost:${PORT}`);
  });
}

export default app;
