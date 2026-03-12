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

/* ── GET /api/news/:symbol — AI-powered stock news via Claude + web_search ── */
const newsCache = {};
const NEWS_CACHE_TTL = 30 * 60 * 1000;

app.get("/api/news/:symbol", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const symbol = req.params.symbol.toUpperCase();
  const cached = newsCache[symbol];
  if (cached && Date.now() - cached.ts < NEWS_CACHE_TTL) {
    return res.json(cached.data);
  }

  const companyName = req.query.name || symbol;

  try {
    const searchRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305" }],
        messages: [{
          role: "user",
          content: `Find the 5 most recent news headlines about ${companyName} (${symbol}) stock from the past 2 weeks. For each story return: headline, source, date, 1-sentence summary, and URL if available. Focus on product launches, earnings, partnerships, innovation — things a young investor aged 13-18 would find exciting or educational. Avoid: political controversy, layoffs framed negatively, adult content, anything inappropriate for under-18s. Return ONLY a JSON array, no other text: [{\"headline\": \"\", \"source\": \"\", \"date\": \"\", \"summary\": \"\", \"url\": \"\"}]`
        }],
      }),
    });
    const searchData = await searchRes.json();
    let articlesText = "";
    for (const block of (searchData.content || [])) {
      if (block.type === "text") articlesText += block.text;
    }
    let articles = [];
    try {
      const jsonMatch = articlesText.match(/\[[\s\S]*\]/);
      if (jsonMatch) articles = JSON.parse(jsonMatch[0]);
    } catch { /* parse failed */ }

    if (articles.length > 0) {
      const filterRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          messages: [{
            role: "user",
            content: `Review these news headlines for an under-18 audience. Remove any that involve violence, adult content, political controversy, or anything inappropriate for teenagers. Return ONLY the safe ones as a JSON array with the same format. Input: ${JSON.stringify(articles)}`
          }],
        }),
      });
      const filterData = await filterRes.json();
      const filterText = (filterData.content || []).map(b => b.type === "text" ? b.text : "").join("");
      try {
        const m = filterText.match(/\[[\s\S]*\]/);
        if (m) articles = JSON.parse(m[0]);
      } catch { /* keep original */ }
    }

    let summary = "";
    if (articles.length > 0) {
      const sumRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 150,
          messages: [{
            role: "user",
            content: `Based on these recent headlines about ${companyName} (${symbol}), write a 2-sentence "What's happening with ${companyName}" summary for a teenager. Be excited, clear, no jargon. Headlines: ${articles.map(a => a.headline).join("; ")}. Return ONLY the 2 sentences, no other text.`
          }],
        }),
      });
      const sumData = await sumRes.json();
      summary = (sumData.content || []).map(b => b.type === "text" ? b.text : "").join("").trim();
    }

    const result = { summary, articles: articles.slice(0, 5) };
    newsCache[symbol] = { ts: Date.now(), data: result };
    res.json(result);
  } catch (err) {
    console.error("News fetch error:", err);
    res.status(502).json({ error: "Failed to fetch news" });
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
  { id:"all_lessons", title:"Master Investor", description:"Complete all 15 lessons", xpReward:500, category:"learning", difficulty:"hard", type:"one-time", eval:(d)=>{const c=Math.min(d.lessonCount,15);return{current:c,target:15,percent:(c/15)*100,completed:c>=15}} },
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

// Local dev: start server. Vercel uses the export.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Swish API server running on http://localhost:${PORT}`);
  });
}

export default app;
