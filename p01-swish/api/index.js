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

/* ── POST /api/coach — proxy to Anthropic Messages API ── */
app.post("/api/coach", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in .env" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Anthropic API" });
  }
});

/* ── GET /api/quote/:symbol — Finnhub stock quote ── */
app.get("/api/quote/:symbol", async (req, res) => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "FINNHUB_API_KEY not set in .env" });
  }

  try {
    const symbol = encodeURIComponent(req.params.symbol.toUpperCase());
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Finnhub API" });
  }
});

/* ── Crypto API routes — CoinGecko ── */

// Symbol → CoinGecko ID map for common coins (used by quote-by-symbol)
const CRYPTO_ID_MAP = {
  BTC:"bitcoin",ETH:"ethereum",BNB:"binancecoin",SOL:"solana",XRP:"ripple",
  DOGE:"dogecoin",ADA:"cardano",AVAX:"avalanche-2",SHIB:"shiba-inu",DOT:"polkadot",
  MATIC:"matic-network",LTC:"litecoin",UNI:"uniswap",LINK:"chainlink",ATOM:"cosmos",
  XLM:"stellar",ALGO:"algorand",ICP:"internet-computer",FIL:"filecoin",NEAR:"near",
};

// GET /api/crypto/quote/:id — price by CoinGecko ID or symbol
app.get("/api/crypto/quote/:id", async (req, res) => {
  try {
    const param = req.params.id;
    // Try as symbol first, then as CoinGecko ID
    const id = CRYPTO_ID_MAP[param.toUpperCase()] || param.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url);
    const data = await response.json();
    const coin = data[id];
    if (!coin) return res.json({ c: 0, dp: 0 });
    res.json({ c: coin.usd, dp: coin.usd_24h_change ?? 0 });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch crypto quote" });
  }
});

// GET /api/crypto/top — top 20 coins by market cap
let cryptoTopCache = { ts: 0, data: null };
const CRYPTO_TOP_TTL = 5 * 60 * 1000; // 5 min

app.get("/api/crypto/top", async (req, res) => {
  try {
    if (cryptoTopCache.data && Date.now() - cryptoTopCache.ts < CRYPTO_TOP_TTL) {
      return res.json(cryptoTopCache.data);
    }
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";
    const response = await fetch(url);
    const data = await response.json();
    const coins = (data || []).map(c => ({
      id: c.id,
      symbol: (c.symbol || "").toUpperCase(),
      name: c.name,
      price: c.current_price,
      changePct: c.price_change_percentage_24h ?? 0,
      image: c.image,
    }));
    cryptoTopCache = { ts: Date.now(), data: { coins } };
    res.json({ coins });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch top crypto" });
  }
});

// GET /api/crypto/search?q=term — search coins via CoinGecko
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
    // Filter out null values
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

app.get("/api/movers", async (req, res) => {
  try {
    const range = (req.query.range || "1D").toUpperCase();
    if (!["1D", "1W", "1M", "3M", "1Y"].includes(range)) {
      return res.status(400).json({ error: "Invalid range. Use: 1D, 1W, 1M, 3M, 1Y" });
    }

    const finnhubKey = process.env.FINNHUB_API_KEY;

    const results = await Promise.all(MOVER_SYMBOLS.map(async (symbol) => {
      try {
        if (range === "1D") {
          // Use Finnhub quote for today's % change
          if (!finnhubKey) return null;
          const qRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`);
          const q = await qRes.json();
          if (!q || q.c <= 0) return null;
          const changePercent = q.dp ?? ((q.c - q.pc) / q.pc) * 100;
          // Fetch 1D candles for sparkline
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
          return { symbol, price: q.c, changePercent, trending: changePercent >= 0 ? "up" : "down", sparkline };
        } else {
          // 1W/1M/3M/1Y: use candle data
          const config = MOVER_CANDLE_MAP[range];
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${config.interval}&range=${config.range}`;
          const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          const data = await resp.json();
          const result = data?.chart?.result?.[0];
          if (!result?.timestamp) return null;
          const q = result.indicators.quote[0];
          const closes = q.close.filter(c => c != null);
          const opens = q.open.filter(o => o != null);
          if (closes.length < 2 || opens.length < 1) return null;
          const firstOpen = opens[0];
          const last = closes[closes.length - 1];
          const changePercent = ((last - firstOpen) / firstOpen) * 100;
          const step = Math.max(1, Math.floor(closes.length / 12));
          const sparkline = closes.filter((_, i) => i % step === 0 || i === closes.length - 1);
          return { symbol, price: last, changePercent, trending: changePercent >= 0 ? "up" : "down", sparkline };
        }
      } catch { return null; }
    }));

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

    // Auto-join creator
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

    // Get member counts
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
      .select("user_id, users(id, username, cash)")
      .eq("league_id", req.params.leagueId);

    if (!members?.length) return res.json({ members: [] });

    // Get latest snapshot for each member
    const result = await Promise.all(members.map(async (m) => {
      const { data: snap } = await supabaseAdmin
        .from("portfolio_snapshots")
        .select("total_value")
        .eq("user_id", m.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const value = snap ? Number(snap.total_value) : Number(m.users.cash);
      return {
        user_id: m.user_id,
        username: m.users.username,
        total_value: value,
        gain_pct: ((value - 10000) / 10000) * 100,
      };
    }));

    result.sort((a, b) => b.gain_pct - a.gain_pct);
    res.json({ members: result });
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

  // Weekly trades (since Monday)
  const monday = getMonday();
  const weeklyTrades = (transactions || []).filter(t => t.created_at >= monday).length;

  // Round trip check
  const buys = new Set(), sells = new Set();
  (transactions || []).forEach(t => { if (t.action === "BUY") buys.add(t.ticker); else sells.add(t.ticker); });
  const hasRoundTrip = [...buys].some(s => sells.has(s));

  // Portfolio gain
  const { data: snap } = await supabase.from("portfolio_snapshots").select("total_value").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const portfolioValue = snap ? Number(snap.total_value) : Number(user.cash);
  const portfolioGainPct = ((portfolioValue - 10000) / 10000) * 100;

  // Lesson completions (graceful if table doesn't exist)
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

/* ── GET /api/challenges — Evaluate all challenges for user ── */
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
        id: ch.id,
        title: ch.title,
        description: ch.description,
        xpReward: ch.xpReward,
        category: ch.category,
        difficulty: ch.difficulty,
        type: ch.type,
        current: result.current,
        target: result.target,
        percent: Math.round(result.percent),
        completed: result.completed,
        claimed: !!completion,
        completedAt: completion?.completed_at || null,
      };
    });

    res.json({ challenges });
  } catch (err) {
    console.error("Challenge eval error:", err);
    res.status(500).json({ error: "Failed to evaluate challenges" });
  }
});

/* ── POST /api/challenges/complete — Claim XP for completed challenge ── */
app.post("/api/challenges/complete", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const { userId, challengeId } = req.body;
  if (!userId || !challengeId) return res.status(400).json({ error: "userId and challengeId required" });

  try {
    const ch = CHALLENGE_DEFS.find(c => c.id === challengeId);
    if (!ch) return res.status(404).json({ error: "Challenge not found" });

    // Re-evaluate to verify completion
    const userData = await gatherUserData(supabaseAdmin, userId);
    if (!userData) return res.status(404).json({ error: "User not found" });
    const result = ch.eval(userData);
    if (!result.completed) return res.status(400).json({ error: "Challenge not yet completed" });

    // Check not already claimed
    const { data: existing } = await supabaseAdmin.from("challenge_completions").select("id").eq("user_id", userId).eq("challenge_id", challengeId).maybeSingle();
    if (existing) return res.json({ success: true, alreadyClaimed: true, xpAwarded: 0 });

    // Insert completion
    await supabaseAdmin.from("challenge_completions").insert({ user_id: userId, challenge_id: challengeId, xp_awarded: ch.xpReward });

    // Award XP
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
    // Check if already completed
    const { data: existing } = await supabaseAdmin
      .from("lesson_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (existing) return res.json({ success: true, alreadyCompleted: true, xpAwarded: 0 });

    // Insert completion
    const { error: insertErr } = await supabaseAdmin
      .from("lesson_completions")
      .insert({ user_id: userId, lesson_id: lessonId, score });
    if (insertErr) {
      console.error("lesson complete insert error:", JSON.stringify(insertErr));
      return res.status(500).json({ error: insertErr.message });
    }

    // Award XP — use client-provided reward (validated) or fallback to ID range
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
    console.error("lesson complete error:", err);
    res.status(500).json({ error: "Failed to complete lesson" });
  }
});

/* ── GET /api/lessons/progress — Get completed lesson IDs ── */
app.get("/api/lessons/progress", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const { data, error } = await supabaseAdmin
      .from("lesson_completions")
      .select("lesson_id, score, completed_at")
      .eq("user_id", userId);
    if (error) {
      console.error("lessons progress error:", JSON.stringify(error));
      return res.json({ completions: [] });
    }
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
    // Upsert scenario completion
    const { error: scErr } = await supabaseAdmin.from("scenario_completions").upsert(
      { user_id: userId, scenario_id: scenarioId, score: score || 0, max_score: maxScore || 0, completed_at: new Date().toISOString() },
      { onConflict: "user_id,scenario_id" }
    );
    if (scErr) console.error("scenario upsert error:", JSON.stringify(scErr));

    // Award XP
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
    const { data, error } = await supabaseAdmin
      .from("scenario_completions")
      .select("scenario_id, score, max_score, completed_at")
      .eq("user_id", userId);
    if (error) console.error("scenario progress error:", JSON.stringify(error));
    res.json({ completions: data || [] });
  } catch {
    res.json({ completions: [] });
  }
});

/* ── GET /api/teacher/class-progress/:userId — Lessons & scenarios stats scoped to class ── */
app.get("/api/teacher/class-progress/:userId", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });
  const teacherId = req.params.userId;
  try {
    // Find teacher's league
    const { data: leagues } = await supabaseAdmin.from("leagues").select("id").eq("created_by", teacherId).limit(1);
    const leagueId = leagues?.[0]?.id;
    if (!leagueId) return res.json({ avgLessons: 0, avgScenarios: 0, studentBreakdown: [] });

    // Get student user_ids (exclude teacher)
    const { data: members } = await supabaseAdmin.from("league_members").select("user_id, users(username)").eq("league_id", leagueId);
    const studentIds = (members || []).filter(m => m.user_id !== teacherId).map(m => m.user_id);
    if (studentIds.length === 0) return res.json({ avgLessons: 0, avgScenarios: 0, studentBreakdown: [] });

    // Query completions scoped to class members
    const [lessonRes, scenarioRes] = await Promise.all([
      supabaseAdmin.from("lesson_completions").select("user_id, lesson_id").in("user_id", studentIds),
      supabaseAdmin.from("scenario_completions").select("user_id, scenario_id").in("user_id", studentIds),
    ]);
    const lessonRows = lessonRes.data || [];
    const scenarioRows = scenarioRes.data || [];

    // Build per-student breakdown
    const usernameMap = {};
    (members || []).forEach(m => { if (m.users) usernameMap[m.user_id] = m.users.username; });

    const breakdown = studentIds.map(sid => {
      const lc = lessonRows.filter(r => r.user_id === sid).length;
      const sc = scenarioRows.filter(r => r.user_id === sid).length;
      return { userId: sid, username: usernameMap[sid] || "Unknown", lessonsCompleted: lc, scenariosCompleted: sc };
    });

    const totalL = breakdown.reduce((s, b) => s + b.lessonsCompleted, 0);
    const totalS = breakdown.reduce((s, b) => s + b.scenariosCompleted, 0);
    const n = breakdown.length;

    res.json({
      avgLessons: n > 0 ? +(totalL / n).toFixed(1) : 0,
      avgScenarios: n > 0 ? +(totalS / n).toFixed(1) : 0,
      studentBreakdown: breakdown,
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
  const { teacherId } = req.body;
  if (!teacherId) return res.status(400).json({ error: "teacherId required" });

  try {
    // Find teacher's league
    const { data: memberships } = await supabaseAdmin
      .from("league_members")
      .select("league_id, leagues(id, created_by)")
      .eq("user_id", teacherId);
    const teacherLeague = (memberships || []).find(m => m.leagues?.created_by === teacherId);
    if (!teacherLeague) return res.json({ tips: ["No class found. Create a league first."] });

    // Get all members
    const { data: members } = await supabaseAdmin
      .from("league_members")
      .select("user_id, users(id, username, xp, cash, total_trades, streak, last_active)")
      .eq("league_id", teacherLeague.league_id);

    const studentIds = (members || []).filter(m => m.user_id !== teacherId).map(m => m.user_id);
    const students = (members || [])
      .filter(m => m.user_id !== teacherId)
      .map(m => {
        const u = m.users;
        return {
          username: u.username,
          xp: u.xp ?? 0,
          trades: u.total_trades ?? 0,
          streak: u.streak ?? 0,
          cash: Number(u.cash ?? 10000),
          lastActive: u.last_active,
        };
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: `You are Swish, an AI assistant for teachers managing a virtual stock trading class for students aged 8-18. The class has 20 lessons and 8 investment scenarios available. Analyse the class data including lesson/scenario completion rates and provide 3-5 actionable coaching tips. Be specific about student names when relevant. Focus on engagement, learning gaps, lesson/scenario progress, and teaching opportunities. Return ONLY a JSON array of strings, no other text.`,
        messages: [{ role: "user", content: JSON.stringify({ students, classAverages: { avgLessonsCompleted: avgLessons, avgScenariosCompleted: avgScenarios, totalLessons: 20, totalScenarios: 8 } }) }],
      }),
    });
    const data = await response.json();
    const text = (data.content?.[0]?.text || "[]").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      const tips = JSON.parse(text);
      res.json({ tips: Array.isArray(tips) ? tips : [text] });
    } catch {
      res.json({ tips: [text] });
    }
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
    try {
      const { count } = await supabaseAdmin.from("lesson_completions").select("*", { count: "exact", head: true }).eq("user_id", studentId);
      lessonCount = count || 0;
    } catch { /* table may not exist */ }

    const studentData = {
      username: user.username,
      xp: user.xp ?? 0,
      trades: user.total_trades ?? 0,
      streak: user.streak ?? 0,
      cash: Number(user.cash),
      holdings: (holdings || []).map(h => ({ ticker: h.ticker, shares: Number(h.shares), avgCost: Number(h.avg_cost) })),
      recentTrades: (transactions || []).slice(0, 10),
      lessonsCompleted: lessonCount,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: `You are Swish, an AI coaching assistant helping a teacher understand a specific student's investing progress. Analyse this student's data and provide 2-3 personalised coaching tips. Be specific and actionable. Reference their actual holdings and behavior. Return ONLY a JSON array of strings, no other text.`,
        messages: [{ role: "user", content: JSON.stringify(studentData) }],
      }),
    });
    const data = await response.json();
    const text = (data.content?.[0]?.text || "[]").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      const tips = JSON.parse(text);
      res.json({ tips: Array.isArray(tips) ? tips : [text] });
    } catch {
      res.json({ tips: [text] });
    }
  } catch (err) {
    console.error("teacher student insights error:", err);
    res.status(500).json({ error: "Failed to generate student insights" });
  }
});

// Local dev: start server. Vercel uses the export.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Swish API server running on http://localhost:${PORT}`);
  });
}

export default app;
