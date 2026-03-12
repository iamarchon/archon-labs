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
    // Filter out null values
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

// Local dev: start server. Vercel uses the export.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Swish API server running on http://localhost:${PORT}`);
  });
}

export default app;
