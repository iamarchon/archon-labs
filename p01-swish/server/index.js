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
    const closes = result.indicators.quote[0].close;
    const t = [], c = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        t.push(timestamps[i]);
        c.push(closes[i]);
      }
    }
    res.json({ s: "ok", t, c });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch chart data" });
  }
});

/* ── POST /api/insights — AI portfolio insights via Claude Haiku ── */
app.post("/api/insights", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
  }

  try {
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
Be encouraging but honest. Use simple language for teens.
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
      .select("user_id, users(id, username, cash)")
      .eq("league_id", req.params.leagueId);

    if (!members?.length) return res.json({ members: [] });

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

// Local dev: start server. Vercel uses the export.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Swish API server running on http://localhost:${PORT}`);
  });
}

export default app;
