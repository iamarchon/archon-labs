require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const http     = require('http');
const crypto   = require('crypto');
const fs       = require('fs');
const Database = require('better-sqlite3');
const { WebSocketServer } = require('ws');
const { clerkMiddleware, getAuth, requireAuth } = require('@clerk/express');
const Stripe = require('stripe');
const multer   = require('multer');
const pdfParse = require('pdf-parse');

const app = express();
app.use(cors());
app.use(clerkMiddleware());

// ─── Stripe webhook MUST be registered before express.json() ────────────────
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '4mb' }));

// ─── Admin page — only accessible by the platform owner ─────────────────────
const ADMIN_USER_ID = 'user_3BCMYuXy9VP5cMpSUVmOZeZU57p';
app.get('/admin.html', (req, res) => {
  const { userId } = getAuth(req);
  if (userId !== ADMIN_USER_ID) return res.redirect('/app.html');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

const BASE_URL     = process.env.BASE_URL || 'http://localhost:3333';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

// LLM pricing — exact $/M input and $/M output per model.
// Source: official provider pricing pages (verify at anthropic.com/pricing, openai.com/api/pricing).
// These are the publicly listed rates as of mid-2025 — update when providers change them.
const LLM_PRICING = [
  // pattern (substring match on model name)  input $/M   output $/M
  { p: 'claude-opus-4',          in: 15.00, out: 75.00 },
  { p: 'claude-sonnet-4',        in:  3.00, out: 15.00 },
  { p: 'claude-sonnet-4-20',     in:  3.00, out: 15.00 },
  { p: 'claude-haiku-4',         in:  0.80, out:  4.00 },
  { p: 'claude-3-5-sonnet',      in:  3.00, out: 15.00 },
  { p: 'claude-3-5-haiku',       in:  0.80, out:  4.00 },
  { p: 'claude-3-opus',          in: 15.00, out: 75.00 },
  { p: 'claude-3-sonnet',        in:  3.00, out: 15.00 },
  { p: 'claude-3-haiku',         in:  0.25, out:  1.25 },
  { p: 'gpt-4o-mini',            in:  0.15, out:  0.60 },
  { p: 'gpt-4o',                 in:  5.00, out: 15.00 },
  { p: 'gpt-4-turbo',            in: 10.00, out: 30.00 },
  { p: 'gpt-4',                  in: 30.00, out: 60.00 },
  { p: 'gpt-3.5-turbo',          in:  0.50, out:  1.50 },
  { p: 'o1-mini',                in:  3.00, out: 12.00 },
  { p: 'o1',                     in: 15.00, out: 60.00 },
  // Google Gemini — source: ai.google.dev/pricing
  { p: 'gemini-2.5-pro',        in:  1.25, out: 10.00 },
  { p: 'gemini-2.0-flash-lite', in:  0.075,out:  0.30 },
  { p: 'gemini-2.0-flash',      in:  0.10, out:  0.40 },
  { p: 'gemini-1.5-flash-8b',   in:  0.0375,out: 0.15 },
  { p: 'gemini-1.5-flash',      in:  0.075,out:  0.30 },
  { p: 'gemini-1.5-pro',        in:  1.25, out:  5.00 },
  // Meta Llama via cloud (approximate — varies by host)
  { p: 'llama-3.3',             in:  0.20, out:  0.20 },
  { p: 'llama-3.1',             in:  0.18, out:  0.18 },
];

function findPricing(model) {
  if (!model) return null;
  const m = model.toLowerCase();
  return LLM_PRICING.find(r => m.includes(r.p.toLowerCase())) || null;
}

// Compute exact cost when input/output split is known; fall back to blended 30/70 estimate.
function estimateCostUsd(tokens, model, inputTokens, outputTokens) {
  if (!tokens || !model) return null;
  const pricing = findPricing(model);
  if (!pricing) return null;
  if (inputTokens != null && outputTokens != null) {
    // Exact calculation from split
    return Math.round((inputTokens / 1_000_000 * pricing.in + outputTokens / 1_000_000 * pricing.out) * 10000) / 10000;
  }
  // Fallback: assume 30% input / 70% output (typical for long-form generation)
  const blended = pricing.in * 0.3 + pricing.out * 0.7;
  return Math.round(tokens / 1_000_000 * blended * 10000) / 10000;
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// ── Attachment upload (multer — memory storage, 5MB limit) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf','image/png','image/jpeg','image/webp','image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported file type'), ok);
  },
});

// Credits → dollars: 500 credits = $1.99, etc. (server-side only — never trust client price)
const CREDIT_BUNDLES = { 500: 199, 2000: 499, 5000: 999, 20000: 2999 }; // credits: cents
const CENTS_PER_CREDIT = 1; // for withdrawals: 1 credit = $0.01

// Platform API key — used by built-in agents (creators use their own)
const PLATFORM_KEY = process.env.ANTHROPIC_API_KEY || '';

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE SETUP
// ─────────────────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || 'agentflow.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_wallets (
    user_id   TEXT PRIMARY KEY,
    available INTEGER NOT NULL DEFAULT 0,
    escrowed  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS creator_wallets (
    creator_id   TEXT PRIMARY KEY,
    pending      INTEGER NOT NULL DEFAULT 0,
    available    INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS escrow (
    task_id    TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    creator_id TEXT,
    amount     INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'locked'
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id      TEXT PRIMARY KEY,
    type    TEXT NOT NULL,
    from_id TEXT,
    to_id   TEXT,
    amount  INTEGER NOT NULL,
    task_id TEXT,
    note    TEXT,
    ts      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id                TEXT PRIMARY KEY,
    title             TEXT,
    description       TEXT,
    max_budget        INTEGER,
    category          TEXT,
    tier              TEXT,
    complexity        TEXT,
    user_id           TEXT,
    status            TEXT,
    selected_agent_id TEXT,
    agreed_bid        INTEGER,
    agent_name        TEXT,
    agent_emoji       TEXT,
    creator_id        TEXT,
    deliverable       TEXT,
    tokens            INTEGER,
    error             TEXT,
    bids              TEXT,
    bid_log           TEXT,
    created_at        TEXT,
    hired_at          TEXT,
    completed_at      TEXT,
    approved_at       TEXT,
    user_rating       INTEGER
  );

  CREATE TABLE IF NOT EXISTS agent_ratings (
    task_id  TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    rating   INTEGER NOT NULL,
    ts       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS published_agents (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    emoji        TEXT,
    role         TEXT,
    category     TEXT,
    tags         TEXT,
    min_credits  INTEGER,
    rating       REAL DEFAULT 5.0,
    task_count   INTEGER DEFAULT 0,
    status       TEXT DEFAULT 'live',
    creator_name TEXT,
    creator_id   TEXT,
    description  TEXT,
    webhook_url  TEXT,
    health_url   TEXT,
    bid_strategy TEXT,
    location     TEXT,
    compute      TEXT,
    response_ms  INTEGER,
    is_internal  INTEGER DEFAULT 0
  );
`);

// Migrations — safe to run on every boot
try { db.exec(`ALTER TABLE tasks ADD COLUMN user_rating INTEGER`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN system_prompt TEXT`); } catch {}
try { db.exec(`ALTER TABLE creator_wallets ADD COLUMN stripe_account_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE transactions ADD COLUMN stripe_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN revision_count INTEGER NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN revision_feedback TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN dispute_score INTEGER`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN bid_url TEXT`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN benchmark_status TEXT DEFAULT 'pending'`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN benchmark_results TEXT`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN deposit_paid INTEGER NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN deposit_refunded INTEGER NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN image_url TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN dispute_ruling TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN dispute_reason TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN disputed_at TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN dispute_resolved_at TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN review_text TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN llm_model TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN llm_provider TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN input_tokens INTEGER`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN running_at TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN output_tokens INTEGER`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN revision_history TEXT`); } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN eta TEXT`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN llm_model TEXT`); } catch {}
try { db.exec(`ALTER TABLE published_agents ADD COLUMN llm_provider TEXT`); } catch {}

// ─── Real ETA from historical timestamps ─────────────────────────────────────
// Returns average seconds between hired_at and completed_at for a given agent category.
// Falls back to the static estimate if fewer than 3 completed samples exist.
function getAvgEtaSec(category) {
  try {
    const row = db.prepare(`
      SELECT AVG(
        (julianday(completed_at) - julianday(hired_at)) * 86400
      ) AS avg_sec, COUNT(*) AS cnt
      FROM tasks
      WHERE selected_agent_id IN (
        SELECT id FROM published_agents WHERE category = ?
      )
      AND hired_at IS NOT NULL AND completed_at IS NOT NULL
      AND status IN ('done','approved')
    `).get(category);
    if (row && row.cnt >= 3) return Math.round(row.avg_sec);
  } catch {}
  return null; // not enough data
}

// Static fallback map (seconds) when no real data available
const ETA_FALLBACK_SEC = { build:180, qa:120, code:120, pm:60, research:120, writing:60 };
const ETA_COMPLEXITY_MULT = { simple:.6, medium:1, complex:1.8, heavy:3 };

function calcEta(category, complexity) {
  const real = getAvgEtaSec(category);
  const secs = real !== null
    ? Math.round(real * (ETA_COMPLEXITY_MULT[complexity] || 1))
    : Math.round((ETA_FALLBACK_SEC[category] || 120) * (ETA_COMPLEXITY_MULT[complexity] || 1));
  if (secs < 60) return '< 1 min';
  const mins = Math.round(secs / 60);
  return `~${mins} min`;
}
db.exec(`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id                TEXT PRIMARY KEY,
    ticket_ref        TEXT UNIQUE,
    task_id           TEXT,
    user_id           TEXT NOT NULL,
    issue_type        TEXT NOT NULL DEFAULT 'other',
    subject           TEXT NOT NULL,
    body              TEXT NOT NULL,
    debug_context     TEXT,
    status            TEXT NOT NULL DEFAULT 'open',
    priority          TEXT NOT NULL DEFAULT 'normal',
    ai_response       TEXT,
    ai_confidence     INTEGER,
    ai_resolved       INTEGER NOT NULL DEFAULT 0,
    ai_reviewed_at    TEXT,
    resolved_at       TEXT,
    resolution_notes  TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
`);
// Migrate old tickets table if columns missing
[
  `ALTER TABLE support_tickets ADD COLUMN ticket_ref TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN issue_type TEXT NOT NULL DEFAULT 'other'`,
  `ALTER TABLE support_tickets ADD COLUMN debug_context TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'`,
  `ALTER TABLE support_tickets ADD COLUMN ai_response TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN ai_confidence INTEGER`,
  `ALTER TABLE support_tickets ADD COLUMN ai_resolved INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE support_tickets ADD COLUMN ai_reviewed_at TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN resolved_at TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN resolution_notes TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN updated_at TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN user_email TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN eta_at TEXT`,
  `ALTER TABLE support_tickets ADD COLUMN screenshot_data TEXT`,
].forEach(sql => { try { db.exec(sql); } catch {} });
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_keys (
    key        TEXT PRIMARY KEY,
    agent_id   TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id       TEXT NOT NULL,
    agent_id      TEXT NOT NULL,
    creator_id    TEXT NOT NULL,
    system_prompt TEXT,
    user_message  TEXT,
    response      TEXT,
    llm_model     TEXT,
    llm_provider  TEXT,
    input_tokens  INTEGER,
    output_tokens INTEGER,
    total_tokens  INTEGER,
    created_at    TEXT DEFAULT (datetime('now'))
  );
`);

// Seed starting data (INSERT OR IGNORE — safe to run on every boot)
db.prepare(`INSERT OR IGNORE INTO creator_wallets (creator_id) VALUES (?)`).run('archon-labs');
db.prepare(`INSERT OR IGNORE INTO creator_wallets (creator_id) VALUES (?)`).run('devco');

const PLATFORM_TAKE    = 0.30;
const CREATOR_TAKE     = 0.70;
const LISTING_DEPOSIT  = 500;   // credits held when agent is published
const DEPOSIT_UNLOCK_AT = 5;    // approved tasks before deposit is refunded

// Live local-runner WebSocket connections: agentId → ws
const liveRunners = new Map();
const selectionTimers = new Map(); // taskId → timeout handle for auto-refund

function getUserId(req) { return getAuth(req).userId; }

// For API routes: return 401 JSON instead of redirecting to sign-in
function requireApiAuth(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDIT SYSTEM — DB-backed
// ─────────────────────────────────────────────────────────────────────────────

function getOrCreateUserWallet(userId) {
  db.prepare(`INSERT OR IGNORE INTO user_wallets (user_id, available, escrowed) VALUES (?, 850, 0)`).run(userId);
  return db.prepare(`SELECT available, escrowed FROM user_wallets WHERE user_id = ?`).get(userId);
}

function getOrCreateCreatorWallet(creatorId) {
  db.prepare(`INSERT OR IGNORE INTO creator_wallets (creator_id) VALUES (?)`).run(creatorId);
  const r = db.prepare(`SELECT pending, available, total_earned FROM creator_wallets WHERE creator_id = ?`).get(creatorId);
  return { pending: r.pending, available: r.available, totalEarned: r.total_earned };
}

function logTx(type, from, to, amount, taskId, note) {
  const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  db.prepare(`INSERT INTO transactions (id, type, from_id, to_id, amount, task_id, note, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, type, from, to, amount, taskId || null, note || '', new Date().toISOString());
}

function escrowCredits(userId, taskId, amount) {
  const w = getOrCreateUserWallet(userId);
  if (w.available < amount) throw new Error(`Insufficient credits. You have ⚡${w.available}, need ⚡${amount}.`);
  db.prepare(`UPDATE user_wallets SET available = available - ?, escrowed = escrowed + ? WHERE user_id = ?`).run(amount, amount, userId);
  db.prepare(`INSERT INTO escrow (task_id, user_id, amount, status) VALUES (?, ?, ?, 'locked')`).run(taskId, userId, amount);
  logTx('escrow', userId, 'escrow', amount, taskId, `Task posted — ⚡${amount} locked`);
}

function refundUnspent(userId, taskId, agreedBid) {
  const e = db.prepare(`SELECT * FROM escrow WHERE task_id = ?`).get(taskId);
  if (!e) return;
  const refund = e.amount - agreedBid;
  if (refund > 0) {
    db.prepare(`UPDATE user_wallets SET escrowed = escrowed - ?, available = available + ? WHERE user_id = ?`).run(refund, refund, userId);
    db.prepare(`UPDATE escrow SET amount = ? WHERE task_id = ?`).run(agreedBid, taskId);
    logTx('refund', 'escrow', userId, refund, taskId, `Unspent budget returned — agent bid ⚡${agreedBid}`);
  }
}

function lockEscrowToCreator(taskId, creatorId) {
  db.prepare(`UPDATE escrow SET creator_id = ? WHERE task_id = ?`).run(creatorId, taskId);
}

function releaseEscrow(taskId) {
  const e = db.prepare(`SELECT * FROM escrow WHERE task_id = ?`).get(taskId);
  if (!e || e.status !== 'locked') throw new Error('No locked escrow for this task');
  const creatorCut  = Math.round(e.amount * CREATOR_TAKE);
  const platformCut = e.amount - creatorCut;
  const creatorId   = e.creator_id || 'archon-labs';
  db.prepare(`UPDATE user_wallets SET escrowed = escrowed - ? WHERE user_id = ?`).run(e.amount, e.user_id);
  db.prepare(`INSERT OR IGNORE INTO creator_wallets (creator_id) VALUES (?)`).run(creatorId);
  db.prepare(`UPDATE creator_wallets SET pending = pending + ?, total_earned = total_earned + ? WHERE creator_id = ?`).run(creatorCut, creatorCut, creatorId);
  db.prepare(`UPDATE escrow SET status = 'released' WHERE task_id = ?`).run(taskId);
  logTx('release', 'escrow', creatorId,  creatorCut,  taskId, `Creator payout (70%) — ⚡${creatorCut}`);
  logTx('release', 'escrow', 'platform', platformCut, taskId, `Platform fee (30%) — ⚡${platformCut}`);
  return { creatorCut, platformCut };
}

function refundEscrow(taskId) {
  const e = db.prepare(`SELECT * FROM escrow WHERE task_id = ?`).get(taskId);
  if (!e || e.status !== 'locked') return;
  db.prepare(`UPDATE user_wallets SET escrowed = escrowed - ?, available = available + ? WHERE user_id = ?`).run(e.amount, e.amount, e.user_id);
  db.prepare(`UPDATE escrow SET status = 'refunded' WHERE task_id = ?`).run(taskId);
  logTx('refund', 'escrow', e.user_id, e.amount, taskId, 'Full refund — task cancelled or disputed');
}

function buyCredits(userId, amount) {
  getOrCreateUserWallet(userId);
  db.prepare(`UPDATE user_wallets SET available = available + ? WHERE user_id = ?`).run(amount, userId);
  logTx('purchase', 'stripe', userId, amount, null, `Bought ⚡${amount} credits`);
}

function withdrawCreatorEarnings(creatorId, amount) {
  const cw = getOrCreateCreatorWallet(creatorId);
  if (cw.available < amount) throw new Error('Insufficient available balance');
  db.prepare(`UPDATE creator_wallets SET available = available - ? WHERE creator_id = ?`).run(amount, creatorId);
  logTx('withdrawal', creatorId, 'stripe', amount, null, `Creator withdrawal — ⚡${amount} → Stripe`);
}

function settlePending(creatorId) {
  const cw = getOrCreateCreatorWallet(creatorId);
  const amount = cw.pending;
  if (amount > 0) {
    db.prepare(`UPDATE creator_wallets SET pending = 0, available = available + ? WHERE creator_id = ?`).run(amount, creatorId);
    logTx('settle', 'pending', creatorId, amount, null, `Pending earnings released to available`);
  }
  return amount;
}

// ─── 3-day pending auto-release ───────────────────────────────────────────────
const PENDING_HOLD_DAYS = 3;

function runAutoRelease() {
  const cutoff = new Date(Date.now() - PENDING_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const due = db.prepare(`
    SELECT DISTINCT t.to_id as creator_id
    FROM transactions t
    JOIN creator_wallets cw ON cw.creator_id = t.to_id
    WHERE t.type = 'release'
      AND t.ts < ?
      AND cw.pending > 0
  `).all(cutoff);
  for (const { creator_id } of due) {
    const released = settlePending(creator_id);
    if (released > 0) console.log(`[AF] ⏰ Auto-released ⚡${released} pending → ${creator_id}`);
  }
}

// Run on startup and every hour
runAutoRelease();
setInterval(runAutoRelease, 60 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// TASK STORE — DB-backed
// ─────────────────────────────────────────────────────────────────────────────

function mapTask(r) {
  return {
    id: r.id, title: r.title, description: r.description,
    maxBudget: r.max_budget, category: r.category, tier: r.tier,
    complexity: r.complexity, userId: r.user_id, status: r.status,
    selectedAgentId: r.selected_agent_id, agentId: r.selected_agent_id, agreedBid: r.agreed_bid,
    agentName: r.agent_name, agentEmoji: r.agent_emoji, agentCat: r.category, creatorId: r.creator_id,
    deliverable: r.deliverable, tokens: r.tokens, error: r.error,
    bids:   r.bids    ? JSON.parse(r.bids)    : [],
    bidLog: r.bid_log ? JSON.parse(r.bid_log) : [],
    createdAt: r.created_at, hiredAt: r.hired_at, runningAt: r.running_at || r.hired_at,
    completedAt: r.completed_at, approvedAt: r.approved_at, eta: r.eta || null,
    userRating: r.user_rating || null,
    revisionCount: r.revision_count || 0,
    revisionFeedback: r.revision_feedback || null,
    disputeScore: r.dispute_score ?? null,
    disputeRuling: r.dispute_ruling || null,
    disputeReason: r.dispute_reason || null,
    disputedAt: r.disputed_at || null,
    disputeResolvedAt: r.dispute_resolved_at || null,
    reviewText: r.review_text || null,
  };
}
function getTask(taskId) {
  const r = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId);
  return r ? mapTask(r) : null;
}

function createTask(t) {
  db.prepare(`
    INSERT INTO tasks (id, title, description, max_budget, category, tier, complexity, user_id, status, bids, bid_log, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?)
  `).run(t.id, t.title, t.description, t.maxBudget, t.category, t.tier, t.complexity, t.userId, t.status, t.createdAt);
}

function updateTask(taskId, fields) {
  const colMap = {
    status: 'status', selectedAgentId: 'selected_agent_id', agreedBid: 'agreed_bid',
    agentName: 'agent_name', agentEmoji: 'agent_emoji', creatorId: 'creator_id',
    deliverable: 'deliverable', tokens: 'tokens', error: 'error',
    hiredAt: 'hired_at', runningAt: 'running_at', completedAt: 'completed_at', approvedAt: 'approved_at',
    bids: 'bids', bidLog: 'bid_log', userRating: 'user_rating',
    revisionCount: 'revision_count', revisionFeedback: 'revision_feedback', revisionHistory: 'revision_history', eta: 'eta',
    disputeScore: 'dispute_score', disputeRuling: 'dispute_ruling', disputeReason: 'dispute_reason',
    disputedAt: 'disputed_at', disputeResolvedAt: 'dispute_resolved_at',
    reviewText: 'review_text', llmModel: 'llm_model', llmProvider: 'llm_provider',
    inputTokens: 'input_tokens', outputTokens: 'output_tokens',
  };
  const setClauses = [], values = [];
  for (const [key, val] of Object.entries(fields)) {
    const col = colMap[key];
    if (col) { setClauses.push(`${col} = ?`); values.push(typeof val === 'object' ? JSON.stringify(val) : val); }
  }
  if (!setClauses.length) return;
  values.push(taskId);
  db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
const BUILTIN_AGENTS = [
  {
    id: 'buildbot-v1', name: 'BuildBot', emoji: '🏗',
    role: 'Full-Stack Builder', category: 'build',
    tags: ['api','react','typescript','database','scripts'],
    minCredits: 100, rating: 4.9, taskCount: 142, status: 'live',
    creatorName: 'Archon Labs', creatorId: 'archon-labs',
    description: 'Senior full-stack engineer. Ships production-grade APIs, React components, DB schemas. TypeScript-first.',
    webhookUrl:  `${BASE_URL}/internal/agents/buildbot/run`,
    healthUrl:   `${BASE_URL}/internal/agents/buildbot/health`,
    bidStrategy: { floor: 80, style: 'competitive' },
    isInternal:  true,
    location: { city: 'San Francisco', country: 'US', flag: '🇺🇸' },
    compute: 'Claude Sonnet · Vercel Edge',
    responseMs: 420,
  },
  {
    id: 'qa-nexus-v1', name: 'QA Nexus', emoji: '🔍',
    role: 'QA & Testing Specialist', category: 'qa',
    tags: ['test-plans','bug-reports','playwright','accessibility','jest'],
    minCredits: 60, rating: 4.8, taskCount: 98, status: 'live',
    creatorName: 'Archon Labs', creatorId: 'archon-labs',
    description: 'Senior QA engineer. Writes real test plans, finds edge cases, produces bug reports that get fixed.',
    webhookUrl:  `${BASE_URL}/internal/agents/qa-nexus/run`,
    healthUrl:   `${BASE_URL}/internal/agents/qa-nexus/health`,
    bidStrategy: { floor: 50, style: 'budget' },
    isInternal:  true,
    location: { city: 'London', country: 'UK', flag: '🇬🇧' },
    compute: 'Claude Sonnet · Railway',
    responseMs: 680,
  },
  {
    id: 'stackbuilder-v1', name: 'StackBuilder', emoji: '🔧',
    role: 'Backend Specialist', category: 'build',
    tags: ['api','database','backend','node','scripts'],
    minCredits: 70, rating: 4.3, taskCount: 31, status: 'live',
    creatorName: 'DevCo', creatorId: 'devco',
    description: 'Solid backend engineer. APIs, databases, server-side logic. Competitive pricing, practical code.',
    webhookUrl:  `${BASE_URL}/internal/agents/stackbuilder/run`,
    healthUrl:   `${BASE_URL}/internal/agents/stackbuilder/health`,
    bidStrategy: { floor: 55, style: 'budget' },
    isInternal:  true,
    location: { city: 'Singapore', country: 'SG', flag: '🇸🇬' },
    compute: 'Claude Sonnet · AWS Lambda',
    responseMs: 890,
  },
];

function getPublishedAgents() {
  return db.prepare(`SELECT * FROM published_agents`).all().map(r => ({
    id: r.id, name: r.name, emoji: r.emoji, role: r.role, category: r.category,
    tags: JSON.parse(r.tags || '[]'), minCredits: r.min_credits,
    rating: r.rating, taskCount: r.task_count, status: r.status,
    creatorName: r.creator_name, creatorId: r.creator_id, description: r.description,
    webhookUrl: r.webhook_url, healthUrl: r.health_url, bidUrl: r.bid_url || null,
    bidStrategy: JSON.parse(r.bid_strategy || '{}'),
    location: r.location ? JSON.parse(r.location) : null,
    compute: r.compute, responseMs: r.response_ms, isInternal: false,
    imageUrl: r.image_url || null,
    llm_model: r.llm_model || null,
    llm_provider: r.llm_provider || null,
  }));
}

function getAllAgents() {
  return [...BUILTIN_AGENTS, ...getPublishedAgents()];
}

const SYSTEM_PROMPTS = {
  'buildbot-v1': `You are BuildBot, a senior full-stack software engineer on AgentFlow marketplace.
Precise, opinionated, ships working code. TypeScript by default.

NON-NEGOTIABLE RULES:
1) Complete working code only — no placeholders, no "add your logic here"
2) TypeScript by default unless asked otherwise
3) All imports included
4) Every helper script (icon generators, seed scripts, cert generators, etc.) MUST be included as a named file AND called out as numbered steps in setup — the user cannot run what they cannot see
5) If the project requires generated assets (icons, images, compiled output): the FIRST two steps of How to Install & Run MUST be (a) "pip install -r requirements.txt" and (b) "python generatorscript.py" — no exceptions
6) Use language-appropriate comment headers for every file so it can be downloaded correctly
7) If any Python script imports a non-stdlib package (PIL, requests, numpy, etc.), you MUST include a requirements.txt AND the first steps MUST install and run it
8) REVISIONS: If the task contains "REVISION N FEEDBACK:", do NOT rewrite everything. Diagnose the specific error in one sentence, then provide the minimum fix. For missing-module errors, lead with the exact install command.
9) GENERATOR SCRIPTS GO FIRST: In the ## Deliverable section, output requirements.txt and any generator/helper .py scripts as the VERY FIRST files — before all other application files. This prevents them from being cut off.

BEFORE WRITING THE ## How to Install & Run SECTION: decide if any file you will create is a generator or needs pip install. If yes, Steps 1-2 MUST be pip install and run the generator — write those first, then the rest.

MANDATORY OUTPUT FORMAT — write in this exact order:
## Assumptions
[any — omit if none]
## How to Install & Run
[Numbered steps. If generated assets needed: Step 1 = pip install -r requirements.txt, Step 2 = python generator.py, THEN remaining steps. Every command exact and copy-pasteable. End with "Expected result: [what the user should see when it works]"]
## Next Steps
[2-3 concrete improvements]
## Architecture Notes
[1-3 sentences]
## Deliverable
[requirements.txt and generator scripts FIRST, then main app files. Every file as a named code block:
 TypeScript/JS: \`\`\`typescript\n// filename.ts\ncode\n\`\`\`
 Python:        \`\`\`python\n# filename.py\ncode\n\`\`\`
 JSON:          \`\`\`json\n// filename.json\ncode\n\`\`\`
 HTML/CSS:      \`\`\`html\n<!-- filename.html -->\ncode\n\`\`\`]`,

  'qa-nexus-v1': `You are QA Nexus, a senior QA engineer on AgentFlow marketplace.
Think in edge cases, find bugs developers miss.
RULES: 1) P0 critical first 2) Specific test cases only 3) Happy path AND failure scenarios 4) Severity P0-P3 on every item 5) Min 3 accessibility checks 6) State coverage at end

MANDATORY OUTPUT FORMAT:
## How to Run These Tests
[exact commands or steps to execute the test suite — write this first]
## Next Steps
[top 3 highest-priority gaps to fill]
## Test Plan / Bug Report / QA Review
[by suite, P0 first, table format with ID/Case/Steps/Expected/Priority]
## Coverage Summary
[covered, gaps]`,

  'stackbuilder-v1': `You are StackBuilder, a backend software engineer on AgentFlow marketplace.
APIs, databases, server-side logic. Practical and simple.
RULES: 1) Complete working code 2) JS unless TS requested 3) All imports and .env examples 4) No over-engineering 5) Basic error handling always

MANDATORY OUTPUT FORMAT:
## Plan
[what I'm building and why]
## How to Install & Run
[numbered steps: install deps, set env vars with examples, start server, test the endpoint — write this before the code]
## Next Steps
[2-3 improvements]
## Code
[all files with // filepath headers]`,
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL AGENT WEBHOOKS
// ─────────────────────────────────────────────────────────────────────────────
async function callClaude(apiKey, system, userMsg) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:CLAUDE_MODEL, max_tokens:8000, system, messages:[{role:'user',content:userMsg}] }),
  });
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`Claude API ${res.status}`); }
  const d = await res.json();
  return { text: d.content?.[0]?.text||'', tokens: (d.usage?.input_tokens||0)+(d.usage?.output_tokens||0) };
}

async function generateTaskTitle(description) {
  if (!PLATFORM_KEY || !description) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json','x-api-key':PLATFORM_KEY,'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 30,
        system: 'Generate a clear 4-7 word task title. Reply with ONLY the title — no quotes, no punctuation at the end, no explanation.',
        messages: [{ role:'user', content:`Task description:\n${description.slice(0, 600)}` }],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const raw = (d.content?.[0]?.text || '').trim().replace(/^["']|["'.,]$/g, '');
    return raw.length > 4 ? raw.slice(0, 80) : null;
  } catch { return null; }
}

app.get('/internal/agents/:id/health', (req, res) => res.json({ status:'online', ts:Date.now() }));

// Category-specific log steps emitted while the internal agent runs
const AGENT_LOG_STEPS = {
  build:    [{pct:8,msg:'Reading task requirements…'},{pct:22,msg:'Designing architecture…'},{pct:45,msg:'Writing code…'},{pct:68,msg:'Adding tests and error handling…'},{pct:82,msg:'Packaging deliverable…'}],
  code:     [{pct:8,msg:'Reviewing code context…'},{pct:25,msg:'Identifying issues…'},{pct:48,msg:'Writing review comments…'},{pct:70,msg:'Summarising recommendations…'}],
  qa:       [{pct:8,msg:'Analysing spec…'},{pct:25,msg:'Scoping test coverage…'},{pct:48,msg:'Writing test cases…'},{pct:70,msg:'Adding edge cases…'}],
  research: [{pct:8,msg:'Gathering context…'},{pct:25,msg:'Researching topic…'},{pct:48,msg:'Synthesising findings…'},{pct:70,msg:'Writing report…'}],
  writing:  [{pct:8,msg:'Understanding brief…'},{pct:25,msg:'Drafting content…'},{pct:48,msg:'Refining language…'},{pct:70,msg:'Final edit…'}],
  pm:       [{pct:8,msg:'Understanding requirements…'},{pct:25,msg:'Structuring plan…'},{pct:48,msg:'Defining milestones…'},{pct:70,msg:'Writing docs…'}],
};

app.post('/internal/agents/:id/run', async (req, res) => {
  const { taskId, task, reward, callbackUrl, apiKey } = req.body;
  const agentId = req.params.id + '-v1';
  const effectiveKey = PLATFORM_KEY || apiKey;
  res.json({ accepted:true, taskId });

  // Detect category from agentId (e.g. build-v1, qa-v1, research-v1)
  const cat = req.params.id.replace(/-v\d+$/, '');
  const steps = AGENT_LOG_STEPS[cat] || AGENT_LOG_STEPS.build;

  // Emit staged progress ticks while Claude is processing
  const startedAt = Date.now();
  let stepIdx = 0;
  const ticker = setInterval(() => {
    if (stepIdx >= steps.length) return;
    const s = steps[stepIdx++];
    const ev = { type:'progress', pct: s.pct, log: s.msg, tokens: 0, ts: Date.now() };
    emitTaskProgress(taskId, ev);
    const buf = taskProgressLog.get(taskId) || [];
    buf.push(ev);
    taskProgressLog.set(taskId, buf);
  }, 4000); // one step every 4s

  try {
    const r = await callClaude(effectiveKey, SYSTEM_PROMPTS[agentId],
      `TASK: ${task.title}\n\nDESCRIPTION:\n${task.description}\n\nREWARD: ⚡${reward} credits\n\nDeliver your best work.`);
    clearInterval(ticker);
    // Final progress tick before done
    const finalEv = { type:'progress', pct: 98, log: `Done — ${r.tokens} tokens used`, tokens: r.tokens, ts: Date.now() };
    emitTaskProgress(taskId, finalEv);
    await fetch(callbackUrl, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ taskId, status:'done', deliverable:r.text, tokens:r.tokens }) });
  } catch(err) {
    clearInterval(ticker);
    await fetch(callbackUrl, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ taskId, status:'error', error:err.message }) }).catch(()=>{});
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
async function checkHealth(agent) {
  if (liveRunners.has(agent.id)) return true;  // runner connected = implicitly healthy
  if (!agent.healthUrl) return false;
  try { const r = await fetch(agent.healthUrl, { signal:AbortSignal.timeout(2000) }); return r.ok; }
  catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// BID CALCULATION
// ─────────────────────────────────────────────────────────────────────────────
function estimateComplexity(text) {
  const w = text.trim().split(/\s+/).length;
  if (w<15) return 'simple'; if (w<40) return 'medium'; if (w<80) return 'complex'; return 'heavy';
}

function calcBid(agent, maxBudget, complexity) {
  const floor = Math.max(agent.bidStrategy.floor, agent.minCredits);
  if (maxBudget < floor) return null;
  let bid;
  switch (agent.bidStrategy.style) {
    case 'budget':  bid = Math.max(floor, Math.round(maxBudget * 0.62)); break;
    case 'premium': bid = Math.round(maxBudget * 0.95); break;
    default:
      const conf = Math.min(agent.taskCount/200, 0.08);
      bid = Math.min(Math.round(maxBudget * 0.82 * (1+conf)), maxBudget);
  }
  bid = Math.max(bid, floor);
  return {
    agentId:agent.id, agentName:agent.name, agentEmoji:agent.emoji, agentRole:agent.role,
    category:agent.category, rating:agent.rating, taskCount:agent.taskCount,
    creatorName:agent.creatorName, creatorId:agent.creatorId,
    tags:agent.tags, webhookUrl:agent.webhookUrl,
    bidAmount:bid, maxBudget, savings:maxBudget-bid,
    eta: calcEta(agent.category, complexity),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL BIDDING
// ─────────────────────────────────────────────────────────────────────────────

// Pending WS bid requests: `${taskId}:${agentId}` → { resolve, reject }
const pendingBids = new Map();

const BID_TIMEOUT_MS = 3000;

// Ask Claude Haiku to evaluate a task and return a bid + rationale, or decline
async function claudeBid(agent, task, maxBudget) {
  if (!PLATFORM_KEY) return undefined; // signal: no key, fall back to math
  const floor = Math.max(agent.bidStrategy?.floor || 0, agent.minCredits || 50);

  const systemPrompt = `You are ${agent.name}, a ${agent.role || 'software agent'} on AgentFlow — an AI task marketplace where users post tasks and agents bid to complete them.

CREDIT SYSTEM (understand this before pricing):
- 1 credit = $0.01 USD equivalent on the platform
- Credits fund the agent's compute, API costs, and skill premium
- Typical pricing by actual complexity:
    Simple   (30–80 ⚡)  : typo fix, single-function change, short script, quick analysis
    Medium  (80–160 ⚡)  : full component, REST endpoint, test suite, moderate refactor
    Complex (160–280 ⚡)  : multi-file feature, full Chrome extension, end-to-end integration
    Heavy   (280–500 ⚡)  : full SaaS feature, production-grade system, multi-service app
- Your minimum is ⚡${floor} — do NOT bid below this
- You MUST NOT bid above ⚡${maxBudget} (the user's max budget)
- Decline (bid:false) only if the task clearly falls outside your speciality (${agent.category})
- Price based on ACTUAL effort required — not just a % of max budget

YOUR PERSONA: ${agent.description || agent.role}`;

  const userMsg = `TASK TITLE: ${task.title || '(untitled)'}
TASK DESCRIPTION:
${(task.description || '').slice(0, 600)}

MAX BUDGET: ⚡${maxBudget} | YOUR FLOOR: ⚡${floor}

Assess: (1) Is this within your speciality? (2) How many files/components are needed? (3) What's a fair credit price for the actual work?

Reply ONLY with valid JSON (no other text):
{"bid":true,"amount":145,"rationale":"One sentence: what you assessed and why this price."} or {"bid":false,"rationale":"Why you declined."}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': PLATFORM_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 150, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] }),
    });
    if (!res.ok) return undefined;
    const d = await res.json();
    const text = d.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('bad JSON');
    const parsed = JSON.parse(match[0]);
    if (!parsed.bid) return { declined: true, rationale: parsed.rationale || '' };
    const amount = Math.max(floor, Math.min(Math.round(parsed.amount), maxBudget));
    return { amount, rationale: parsed.rationale || '' };
  } catch {
    return undefined; // fall back to formula
  }
}

// Get a bid from an agent — real if possible, calcBid() fallback
async function getBid(agent, taskId, task, maxBudget, complexity) {
  const fallback = () => calcBid(agent, maxBudget, complexity);

  // Internal agents use Claude Haiku to evaluate task fit and price
  if (agent.isInternal) {
    const result = await claudeBid(agent, task, maxBudget);
    if (result === undefined) return fallback();           // no key / error — use math
    if (result?.declined) return null;                     // agent declined
    const bid = fallback();
    if (!bid) return null;
    return { ...bid, bidAmount: result.amount, savings: maxBudget - result.amount, rationale: result.rationale || '' };
  }

  // Runner connected — request bid over WS
  const ws = liveRunners.get(agent.id);
  if (ws && ws.readyState === 1) {
    try {
      const bidAmount = await new Promise((resolve, reject) => {
        const key = `${taskId}:${agent.id}`;
        const timer = setTimeout(() => { pendingBids.delete(key); reject(new Error('timeout')); }, BID_TIMEOUT_MS);
        pendingBids.set(key, { resolve: (amt) => { clearTimeout(timer); resolve(amt); }, reject });
        ws.send(JSON.stringify({ type: 'bid_request', taskId, task, maxBudget, complexity }));
      });
      if (bidAmount === null) return null; // agent declined
      const bid = fallback();
      if (!bid) return null;
      const clamped = Math.max(agent.minCredits, Math.min(bidAmount, maxBudget));
      return { ...bid, bidAmount: clamped, savings: maxBudget - clamped };
    } catch {
      return fallback(); // timeout or error → fallback
    }
  }

  // Webhook agent with bid_url — POST to it
  if (agent.bidUrl) {
    try {
      const r = await fetch(agent.bidUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, task, maxBudget, complexity }),
        signal: AbortSignal.timeout(BID_TIMEOUT_MS),
      });
      if (!r.ok) return fallback();
      const d = await r.json();
      if (d.decline) return null;
      if (typeof d.bidAmount !== 'number') return fallback();
      const bid = fallback();
      if (!bid) return null;
      const clamped = Math.max(agent.minCredits, Math.min(d.bidAmount, maxBudget));
      return { ...bid, bidAmount: clamped, savings: maxBudget - clamped };
    } catch {
      return fallback();
    }
  }

  // No real bid mechanism — use calcBid
  return fallback();
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLET API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/wallet', requireApiAuth, (req, res) => {
  const userId = getUserId(req);
  const w = getOrCreateUserWallet(userId);
  const userTx = db.prepare(`SELECT * FROM transactions WHERE from_id = ? OR to_id = ? ORDER BY ts DESC LIMIT 20`)
    .all(userId, userId)
    .map(r => ({ id:r.id, type:r.type, from:r.from_id, to:r.to_id, amount:r.amount, taskId:r.task_id, note:r.note, ts:r.ts }));
  res.json({ wallet:w, transactions:userTx });
});

app.post('/api/wallet/buy', requireApiAuth, (req, res) => {
  const userId = getUserId(req);
  const { amount } = req.body;
  if (!amount || typeof amount !== 'number' || !isFinite(amount) || amount < 10) return res.status(400).json({ error:'Minimum purchase: ⚡10' });
  buyCredits(userId, amount);
  res.json({ wallet: getOrCreateUserWallet(userId) });
});

app.get('/api/creator/wallet', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const cw = getOrCreateCreatorWallet(creatorId);
  const creatorTx = db.prepare(`SELECT * FROM transactions WHERE from_id = ? OR to_id = ? ORDER BY ts DESC LIMIT 20`)
    .all(creatorId, creatorId)
    .map(r => ({ id:r.id, type:r.type, from:r.from_id, to:r.to_id, amount:r.amount, taskId:r.task_id, note:r.note, ts:r.ts }));
  // Oldest unsettled release — tells frontend when auto-release fires
  const oldest = db.prepare(`
    SELECT MIN(ts) as oldest_ts FROM transactions
    WHERE to_id = ? AND type = 'release'
      AND ts > (SELECT COALESCE(MAX(ts),'1970-01-01') FROM transactions WHERE to_id = ? AND type = 'settle')
  `).get(creatorId, creatorId);
  const autoReleaseAt = oldest?.oldest_ts
    ? new Date(new Date(oldest.oldest_ts).getTime() + PENDING_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const disputed = db.prepare(`
    SELECT COUNT(*) as cnt FROM tasks
    WHERE creator_id = ? AND status = 'disputed'
  `).get(creatorId);
  res.json({ wallet:cw, transactions:creatorTx, autoReleaseAt, disputedTasks: disputed.cnt });
});

app.post('/api/creator/wallet/settle', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const amount = settlePending(creatorId);
  res.json({ settled:amount, wallet:getOrCreateCreatorWallet(creatorId) });
});

app.post('/api/creator/wallet/withdraw', requireApiAuth, async (req, res) => {
  const creatorId = getUserId(req);
  const { amount } = req.body;
  if (!amount || typeof amount !== 'number' || !isFinite(amount) || amount < 100)
    return res.status(400).json({ error: 'Minimum withdrawal: ⚡100' });
  try {
    if (stripe) {
      const row = db.prepare(`SELECT stripe_account_id FROM creator_wallets WHERE creator_id = ?`).get(creatorId);
      if (!row?.stripe_account_id) return res.status(400).json({ error: 'Connect your Stripe account first to withdraw' });
      const acct = await stripe.accounts.retrieve(row.stripe_account_id);
      if (!acct.details_submitted) return res.status(400).json({ error: 'Stripe onboarding incomplete — finish connecting your account' });
      const transfer = await stripe.transfers.create({
        amount:      amount * CENTS_PER_CREDIT,
        currency:    'usd',
        destination: row.stripe_account_id,
      });
      withdrawCreatorEarnings(creatorId, amount);
      return res.json({ wallet: getOrCreateCreatorWallet(creatorId), transfer_id: transfer.id });
    }
    // Stripe not configured — demo fallback
    withdrawCreatorEarnings(creatorId, amount);
    res.json({ wallet: getOrCreateCreatorWallet(creatorId) });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// AGENT API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/agents', (req, res) => {
  res.json(getAllAgents().map(a => ({
    id:a.id, name:a.name, emoji:a.emoji, role:a.role, category:a.category,
    tags:a.tags, minCredits:a.minCredits, rating:a.rating, taskCount:a.taskCount,
    status:a.status, creatorName:a.creatorName, description:a.description,
    hasWebhook:!!a.webhookUrl, runnerConnected:liveRunners.has(a.id),
    compute:a.compute||null,
    location:a.location ? (typeof a.location==='string' ? JSON.parse(a.location) : a.location) : null,
    llmModel:a.llm_model||null,
    llmProvider:a.llm_provider||null,
    imageUrl:a.image_url||null,
    responseMs:a.response_ms||null,
  })));
});

// ─────────────────────────────────────────────────────────────────────────────
// SSE BID STREAM
// ─────────────────────────────────────────────────────────────────────────────
const bidStreams   = {}; // taskId -> [res, ...]  — in-memory only (SSE connections)
const auctionsOpen = new Set(); // taskIds with an auction actively running

// ─────────────────────────────────────────────────────────────────────────────
// TASK PROGRESS STREAM (real-time runner progress via SSE)
// ─────────────────────────────────────────────────────────────────────────────
const taskProgressStreams = new Map(); // taskId → [res, ...]
const taskProgressLog     = new Map(); // taskId → [{type,pct,log,tokens,ts}] replay buffer

function emitTaskProgress(taskId, event) {
  (taskProgressStreams.get(taskId) || []).forEach(r => {
    try { r.write('data: ' + JSON.stringify(event) + '\n\n'); } catch {}
  });
}
function closeProgressStreams(taskId) {
  (taskProgressStreams.get(taskId) || []).forEach(r => { try { r.end(); } catch {} });
  taskProgressStreams.delete(taskId);
  taskProgressLog.delete(taskId);
}

app.get('/api/tasks/:id/progress-stream', (req, res) => {
  const taskId = req.params.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Replay buffered events
  (taskProgressLog.get(taskId) || []).forEach(ev => res.write('data: ' + JSON.stringify(ev) + '\n\n'));

  // If task already finished, send done and close
  const task = getTask(taskId);
  if (!task || task.status !== 'running') {
    res.write('data: ' + JSON.stringify({ type: 'done', status: task?.status || 'unknown' }) + '\n\n');
    res.end();
    return;
  }

  if (!taskProgressStreams.has(taskId)) taskProgressStreams.set(taskId, []);
  taskProgressStreams.get(taskId).push(res);
  req.on('close', () => {
    const arr = taskProgressStreams.get(taskId) || [];
    taskProgressStreams.set(taskId, arr.filter(r => r !== res));
  });
});

// Prune empty bidStream entries every 5 minutes
setInterval(() => {
  for (const id of Object.keys(bidStreams)) {
    if (!bidStreams[id] || bidStreams[id].length === 0) delete bidStreams[id];
  }
}, 5 * 60 * 1000);

app.get('/api/tasks/:id/bid-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  const taskId = req.params.id;
  if (!bidStreams[taskId]) bidStreams[taskId] = [];
  bidStreams[taskId].push(res);
  // Replay stored events for late-joining clients
  const task = getTask(taskId);
  if (task?.bidLog) task.bidLog.forEach(ev => res.write('data: ' + JSON.stringify(ev) + '\n\n'));
  req.on('close', () => { bidStreams[taskId] = (bidStreams[taskId]||[]).filter(r => r !== res); });
});

function emitBid(taskId, event) {
  const row = db.prepare(`SELECT bid_log FROM tasks WHERE id = ?`).get(taskId);
  if (row) {
    const log = row.bid_log ? JSON.parse(row.bid_log) : [];
    log.push(event);
    db.prepare(`UPDATE tasks SET bid_log = ? WHERE id = ?`).run(JSON.stringify(log), taskId);
  }
  (bidStreams[taskId]||[]).forEach(r => { try { r.write('data: ' + JSON.stringify(event) + '\n\n'); } catch{} });
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK API
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/tasks/post', requireApiAuth, async (req, res) => {
  const userId = getUserId(req);
  const { title, description, maxBudget, category, tier } = req.body;
  if (!description) return res.status(400).json({ error:'description required' });
  if (typeof description === 'string' && description.length > 4000) return res.status(400).json({ error:'Description too long (max 4000 characters)' });
  if (!maxBudget || typeof maxBudget !== 'number' || maxBudget < 10) return res.status(400).json({ error:'maxBudget required (min ⚡10)' });

  const w = getOrCreateUserWallet(userId);
  if (w.available < maxBudget) {
    return res.status(400).json({
      error:`Insufficient credits. You have ⚡${w.available} available but need ⚡${maxBudget}. Buy more credits.`,
      walletBalance: w.available,
    });
  }

  const MAX_CONCURRENT = 20;
  const activeTasks = db.prepare(`
    SELECT COUNT(*) as cnt FROM tasks
    WHERE user_id = ? AND status NOT IN ('done','cancelled','disputed','refunded','error')
  `).get(userId);
  if (activeTasks.cnt >= MAX_CONCURRENT) {
    return res.status(400).json({ error:`Concurrency limit reached. You already have ${activeTasks.cnt} active task(s). Max ${MAX_CONCURRENT} simultaneous tasks allowed.` });
  }

  const taskId     = `task-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  const complexity = estimateComplexity(description);

  const TIER_RULES = {
    budget:   { minRating:0,   minTasks:0,   maxBidders:3 },
    standard: { minRating:4.0, minTasks:50,  maxBidders:5 },
    pro:      { minRating:4.7, minTasks:100, maxBidders:5 },
  };
  const rule = TIER_RULES[tier]||TIER_RULES.standard;

  const allAgents = getAllAgents();
  const tierFilter = a => a.rating>=rule.minRating && a.taskCount>=rule.minTasks && a.minCredits<=maxBudget;
  let eligible = allAgents
    .filter(a => a.status==='live')
    .filter(a => !category||category==='all'||a.category===category)
    .filter(tierFilter);

  // Fallback: if <2 agents match the category, open to all categories (keep tier filter)
  if (eligible.length < 2 && category && category !== 'all') {
    console.log(`[AF] Category fallback: only ${eligible.length} "${category}" agent(s) — opening to all categories`);
    eligible = allAgents.filter(a => a.status==='live').filter(tierFilter);
  }

  const rawTitle = title || description.slice(0, 70);
  createTask({
    id:taskId, title:rawTitle, description,
    maxBudget, category, tier, complexity, userId,
    status:'collecting_bids', createdAt:new Date().toISOString(),
  });

  console.log(`\n[AF] Task posted: "${rawTitle}" | Budget: ⚡${maxBudget} | Tier: ${tier||'standard'}`);

  try { escrowCredits(userId, taskId, maxBudget); }
  catch(e) { db.prepare(`DELETE FROM tasks WHERE id = ?`).run(taskId); return res.status(400).json({ error:e.message }); }

  res.json({ taskId, complexity, status:'collecting_bids', wallet:getOrCreateUserWallet(userId) });

  // Async: AI-generate a clean 5-7 word title from the description
  if (PLATFORM_KEY) {
    generateTaskTitle(description).then(aiTitle => {
      if (aiTitle) db.prepare(`UPDATE tasks SET title = ? WHERE id = ?`).run(aiTitle, taskId);
    }).catch(() => {});
  }

  // Async: stream bid events via SSE
  const BID_WINDOW_MS   = 8000;
  const auctionDeadline = Date.now() + BID_WINDOW_MS;

  auctionsOpen.add(taskId);
  emitBid(taskId, { type:'open', taskId, maxBudget, complexity, tier:tier||'standard',
    eligibleCount:eligible.length, deadline:auctionDeadline, ts:Date.now() });

  const healthPromises = eligible.map(async a => {
    const t0 = Date.now();
    const online = await checkHealth(a);
    emitBid(taskId, { type:'health', agentId:a.id, agentName:a.name, agentEmoji:a.emoji,
      creatorName:a.creatorName,
      location:a.location||{city:'Unknown',country:'?',flag:'🌐'},
      compute:a.compute||'Unknown', online, latencyMs:Date.now()-t0, ts:Date.now() });
    return { agent:a, online };
  });

  const healthResults = await Promise.all(healthPromises);
  const online = healthResults.filter(r=>r.online).map(r=>r.agent);
  healthResults.forEach(r => console.log(`  ${r.online?'✓':'✗'} ${r.agent.name}`));

  if (!online.length) {
    auctionsOpen.delete(taskId);
    refundEscrow(taskId);
    emitBid(taskId, { type:'error', message:'No agents online.', ts:Date.now() });
    updateTask(taskId, { status:'error', error:'No agents were online — your credits have been refunded.' }); return;
  }

  emitBid(taskId, { type:'escrow', amount:maxBudget, ts:Date.now() });

  const bidPromises = online.map(async a => {
    await new Promise(r => setTimeout(r, a.isInternal ? (a.responseMs||600) : 0));
    const bid = await getBid(a, taskId, { title:title||description.slice(0,70), description }, maxBudget, complexity);
    if (!bid) return null;
    emitBid(taskId, { type:'bid', agentId:a.id, agentName:a.name, agentEmoji:a.emoji,
      creatorName:a.creatorName, creatorId:a.creatorId,
      location:a.location||{city:'Unknown',country:'?',flag:'🌐'},
      compute:a.compute||'Unknown', rating:a.rating, taskCount:a.taskCount,
      bidAmount:bid.bidAmount, maxBudget, savings:bid.savings,
      eta:bid.eta, tags:a.tags, responseMs:a.responseMs||600,
      rationale: bid.rationale || '', ts:Date.now() });
    return bid;
  });

  const allBids = (await Promise.all(bidPromises)).filter(Boolean)
    .sort((a,b)=>a.bidAmount-b.bidAmount).slice(0,rule.maxBidders);

  const remaining = Math.max(0, auctionDeadline - Date.now());
  if (remaining > 0) await new Promise(r => setTimeout(r, remaining));

  if (!allBids.length) {
    auctionsOpen.delete(taskId);
    refundEscrow(taskId);
    emitBid(taskId, { type:'no_bids', message:'No agents bid on this task.', maxBudget, ts:Date.now() });
    updateTask(taskId, { status:'error', error:`No bids received — your credits have been refunded. Try increasing the budget.` }); return;
  }

  const winner = allBids[0];
  emitBid(taskId, { type:'close',
    winner:{ agentId:winner.agentId, agentName:winner.agentName, agentEmoji:winner.agentEmoji,
      bidAmount:winner.bidAmount, savings:winner.savings, creatorName:winner.creatorName },
    totalBids:allBids.length, ts:Date.now() });

  auctionsOpen.delete(taskId);
  updateTask(taskId, { bids:allBids, status:'awaiting_selection' });
  allBids.forEach(b => console.log(`  📨 ${b.agentName} bid ⚡${b.bidAmount}`));

  // Clean up SSE connections 30s after auction closes — clients have had time to read
  setTimeout(() => { delete bidStreams[taskId]; }, 30_000);

  // Auto-refund escrow if user never hires within 30 minutes
  const selHandle = setTimeout(() => {
    selectionTimers.delete(taskId);
    const t = getTask(taskId);
    if (t && t.status === 'awaiting_selection') {
      try { refundEscrow(taskId); } catch {}
      updateTask(taskId, { status: 'cancelled', error: 'Selection window expired — credits refunded.' });
      console.log(`[AF] ⏰ Auto-refunded ⚡${t.maxBudget} for task ${taskId} (no hire within 30 min)`);
    }
  }, 30 * 60 * 1000);
  selectionTimers.set(taskId, selHandle);

  // Cap task history at 500 rows — prune oldest cancelled/error tasks first
  const count = db.prepare(`SELECT COUNT(*) as n FROM tasks`).get().n;
  if (count > 500) {
    db.prepare(`DELETE FROM tasks WHERE id IN (
      SELECT id FROM tasks WHERE status IN ('cancelled','error') ORDER BY created_at ASC LIMIT ?
    )`).run(count - 500);
  }
});

app.post('/api/tasks/:id/cancel', requireApiAuth, async (req, res) => {
  const userId = getUserId(req);
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.userId !== userId) return res.status(403).json({ error: 'Not your task' });
  if (task.status !== 'awaiting_selection') return res.status(400).json({ error: 'Can only cancel tasks awaiting selection' });
  try { refundEscrow(task.id); } catch {}
  updateTask(task.id, { status: 'cancelled', error: 'Cancelled by user — credits refunded.' });
  res.json({ ok: true });
});

app.post('/api/tasks/:id/hire', requireApiAuth, async (req, res) => {
  const userId = getUserId(req);
  const { agentId, apiKey } = req.body;
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error:'Task not found' });
  if (task.userId !== userId) return res.status(403).json({ error:'Not your task' });
  if (!['awaiting_selection','error'].includes(task.status)) return res.status(400).json({ error:`Task status: ${task.status}` });

  const agent = getAllAgents().find(a=>a.id===agentId);
  const bid   = task.bids?.find(b=>b.agentId===agentId);
  if (!agent||!bid) return res.status(404).json({ error:'Agent/bid not found' });

  // Clear the auto-refund timer — user hired, no need to auto-cancel
  const selHandle = selectionTimers.get(task.id);
  if (selHandle) { clearTimeout(selHandle); selectionTimers.delete(task.id); }

  refundUnspent(userId, task.id, bid.bidAmount);
  lockEscrowToCreator(task.id, agent.creatorId);

  updateTask(task.id, {
    status:'running', selectedAgentId:agentId,
    agentName:agent.name, agentEmoji:agent.emoji,
    agreedBid:bid.bidAmount, creatorId:agent.creatorId,
    eta:bid.eta || null,
    hiredAt:new Date().toISOString(), runningAt:new Date().toISOString(),
  });

  const callbackUrl = `${BASE_URL}/api/tasks/${task.id}/callback`;
  console.log(`\n[AF] Hired: ${agent.name} | ⚡${bid.bidAmount} escrowed | Saved ⚡${bid.savings} → returned to user`);

  const runnerWs = liveRunners.get(agentId);
  if (runnerWs && runnerWs.readyState === 1 /* OPEN */) {
    // Local runner transport
    runnerWs.send(JSON.stringify({
      type:'task', taskId:task.id,
      task:{ title:task.title, description:task.description },
      reward:bid.bidAmount, maxBudget:task.maxBudget, callbackUrl,
    }));
    console.log(`[AF] → dispatched via local runner WS`);
  } else if (agent.webhookUrl) {
    // Webhook transport
    fetch(agent.webhookUrl, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ taskId:task.id, task:{title:task.title,description:task.description}, reward:bid.bidAmount, maxBudget:task.maxBudget, callbackUrl }),
    }).catch(err => { refundEscrow(task.id); updateTask(task.id, { status:'error', error:`Webhook failed — your credits have been refunded. (${err.message})` }); });
    console.log(`[AF] → dispatched via webhook`);
  } else {
    refundEscrow(task.id);
    updateTask(task.id, { status:'error', error:'Agent not reachable — no runner connected. Your credits have been refunded.' });
  }

  res.json({ taskId:task.id, agentName:agent.name, agreedBid:bid.bidAmount, savings:bid.savings, wallet:getOrCreateUserWallet(userId) });
});

app.post('/api/tasks/:id/callback', (req, res) => {
  const { status, deliverable, tokens, input_tokens, output_tokens, error, llm_model, llm_provider } = req.body;
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error:'Task not found' });
  if (!['done','error'].includes(status)) return res.status(400).json({ error:'status must be "done" or "error"' });
  const updates = { status, deliverable:deliverable||null, tokens:tokens||null, error:error||null, completedAt:new Date().toISOString() };
  if (llm_model)      updates.llmModel     = llm_model;
  if (llm_provider)   updates.llmProvider  = llm_provider;
  if (input_tokens)   updates.inputTokens  = input_tokens;
  if (output_tokens)  updates.outputTokens = output_tokens;
  updateTask(task.id, updates);
  // Notify progress SSE listeners that task is complete
  emitTaskProgress(task.id, { type: 'done', status });
  closeProgressStreams(task.id);
  if (status==='done') {
    // Increment taskCount for built-in agents (in-memory) and published agents (DB)
    const builtin = BUILTIN_AGENTS.find(a=>a.id===task.selectedAgentId);
    if (builtin) builtin.taskCount++;
    else db.prepare(`UPDATE published_agents SET task_count = task_count + 1 WHERE id = ?`).run(task.selectedAgentId);
    console.log(`[AF] ✓ Done: ${task.title} | ${tokens} tokens | ⚡${task.agreedBid} in escrow`);
  } else if (status==='error') {
    // Agent errored — refund the agreed bid back to the user
    try { refundEscrow(task.id); console.log(`[AF] ↩ Refunded ⚡${task.agreedBid} to user (agent error)`); } catch {}
  }
  res.json({ received:true });
});

app.post('/api/tasks/:id/approve', requireApiAuth, (req, res) => {
  const userId = getUserId(req);
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error:'Task not found' });
  if (task.userId !== userId) return res.status(403).json({ error:'Not your task' });
  if (task.status!=='done') return res.status(400).json({ error:'Task not done yet' });
  try {
    const split = releaseEscrow(task.id);
    // Mark last revision as accepted if revision history exists
    const rawApprove = db.prepare(`SELECT revision_history FROM tasks WHERE id = ?`).get(task.id);
    if (rawApprove?.revision_history) {
      const rh = JSON.parse(rawApprove.revision_history);
      if (rh.length > 0) { rh[rh.length - 1].outcome = 'accepted'; rh[rh.length - 1].resolvedAt = new Date().toISOString(); }
      db.prepare(`UPDATE tasks SET revision_history = ? WHERE id = ?`).run(JSON.stringify(rh), task.id);
    }
    updateTask(task.id, { status:'approved', approvedAt:new Date().toISOString() });
    console.log(`[AF] ✓ Approved: ⚡${split.creatorCut} → ${task.creatorId} | ⚡${split.platformCut} → platform`);

    // Check listing deposit refund — after DEPOSIT_UNLOCK_AT approved tasks
    let depositRefunded = false;
    if (task.selectedAgentId) {
      const agentRow = db.prepare(`SELECT task_count, deposit_paid, deposit_refunded, creator_id FROM published_agents WHERE id = ?`).get(task.selectedAgentId);
      if (agentRow?.deposit_paid && !agentRow.deposit_refunded && agentRow.task_count >= DEPOSIT_UNLOCK_AT) {
        db.prepare(`UPDATE published_agents SET deposit_refunded = 1 WHERE id = ?`).run(task.selectedAgentId);
        getOrCreateUserWallet(agentRow.creator_id);
        db.prepare(`UPDATE user_wallets SET available = available + ? WHERE user_id = ?`).run(LISTING_DEPOSIT, agentRow.creator_id);
        logTx('deposit_refund', 'platform', agentRow.creator_id, LISTING_DEPOSIT, null, `Listing deposit refunded — ${task.selectedAgentId} reached ${DEPOSIT_UNLOCK_AT} tasks`);
        depositRefunded = true;
        console.log(`[AF] ⚡${LISTING_DEPOSIT} listing deposit refunded → ${agentRow.creator_id}`);
      }
    }

    res.json({ success:true, creatorCut:split.creatorCut, platformCut:split.platformCut,
      depositRefunded, wallet:getOrCreateUserWallet(userId),
      creatorWallet:getOrCreateCreatorWallet(task.creatorId) });
  } catch(e) { res.status(400).json({ error:e.message }); }
});

const MAX_REVISIONS = 2;

app.post('/api/tasks/:id/revise', requireApiAuth, async (req, res) => {
  const userId = getUserId(req);
  const { feedback, screenshot } = req.body;
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.userId !== userId) return res.status(403).json({ error: 'Not your task' });
  if (task.status !== 'done') return res.status(400).json({ error: 'Can only revise a completed task' });
  if (task.revisionCount >= MAX_REVISIONS) return res.status(400).json({ error: `Revision limit reached (max ${MAX_REVISIONS})` });
  if (!feedback?.trim()) return res.status(400).json({ error: 'Feedback required' });

  const agent = getAllAgents().find(a => a.id === task.selectedAgentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const newCount = task.revisionCount + 1;

  // Snapshot current deliverable + feedback into revision history before clearing
  const rawTaskRow = db.prepare(`SELECT revision_history, deliverable FROM tasks WHERE id = ?`).get(task.id);
  const revHistory = rawTaskRow?.revision_history ? JSON.parse(rawTaskRow.revision_history) : [];
  revHistory.push({
    n: newCount,
    feedback: feedback.trim(),
    submittedAt: new Date().toISOString(),
    screenshotAttached: !!screenshot,
    agentDeliverablePrior: rawTaskRow?.deliverable ? rawTaskRow.deliverable.slice(0, 1200) : null,
    outcome: 'pending',
  });

  updateTask(task.id, {
    status: 'running',
    revisionCount: newCount,
    revisionFeedback: feedback.trim(),
    revisionHistory: JSON.stringify(revHistory),
    deliverable: null,
    completedAt: null,
    runningAt: new Date().toISOString(),
  });

  const callbackUrl = `${BASE_URL}/api/tasks/${task.id}/callback`;
  const screenshotNote = screenshot ? '\n\nThe user has attached a screenshot showing the error.' : '';
  const revisedDescription = `${task.description}\n\n---\nREVISION ${newCount} FEEDBACK:\n${feedback.trim()}${screenshotNote}\n\nIMPORTANT: This is a targeted fix request, not a full rewrite. Diagnose the specific problem reported above, then provide the minimum changes needed to fix it. If it is a missing dependency error, lead with the exact install command.`;

  console.log(`\n[AF] Revision ${newCount}/${MAX_REVISIONS}: ${task.title} → ${agent.name}`);

  const runnerWs = liveRunners.get(task.selectedAgentId);
  if (runnerWs && runnerWs.readyState === 1) {
    runnerWs.send(JSON.stringify({
      type: 'task', taskId: task.id,
      task: { title: task.title, description: revisedDescription },
      reward: task.agreedBid, maxBudget: task.maxBudget, callbackUrl,
    }));
  } else if (agent.webhookUrl) {
    fetch(agent.webhookUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, task: { title: task.title, description: revisedDescription }, reward: task.agreedBid, maxBudget: task.maxBudget, callbackUrl }),
    }).catch(err => updateTask(task.id, { status: 'error', error: `Webhook failed: ${err.message}` }));
  } else {
    updateTask(task.id, { status: 'error', error: 'Agent not reachable' });
    return res.status(503).json({ error: 'Agent not reachable' });
  }

  res.json({ taskId: task.id, revisionCount: newCount, revisionsRemaining: MAX_REVISIONS - newCount });
});

app.post('/api/tasks/:id/rate', requireApiAuth, (req, res) => {
  const { rating, reviewText } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!['approved','disputed'].includes(task.status)) return res.status(400).json({ error: 'Can only rate completed or disputed tasks' });
  if (task.userRating) return res.status(400).json({ error: 'Already rated' });

  // Save rating + optional review text
  db.prepare(`INSERT OR REPLACE INTO agent_ratings (task_id, agent_id, rating, ts) VALUES (?, ?, ?, ?)`)
    .run(task.id, task.selectedAgentId, rating, new Date().toISOString());
  updateTask(task.id, { userRating: rating, reviewText: reviewText || null });

  // Recompute agent average from all stored ratings
  const { avg, cnt } = db.prepare(`SELECT AVG(rating) as avg, COUNT(*) as cnt FROM agent_ratings WHERE agent_id = ?`)
    .get(task.selectedAgentId);
  const newRating = Math.round(avg * 10) / 10;

  // Update built-in agent in-memory, published agent in DB
  const builtin = BUILTIN_AGENTS.find(a => a.id === task.selectedAgentId);
  if (builtin) builtin.rating = newRating;
  else db.prepare(`UPDATE published_agents SET rating = ? WHERE id = ?`).run(newRating, task.selectedAgentId);

  console.log(`[AF] ★${rating} rated: ${task.selectedAgentId} → new avg ★${newRating} (${cnt} ratings)`);
  res.json({ success: true, newRating, ratingCount: cnt });
});

// Agent reviews — public, no auth required
app.get('/api/agents/:id/reviews', (req, res) => {
  const rows = db.prepare(`
    SELECT t.id as task_id, t.user_id, t.title, t.category, t.user_rating, t.review_text, t.approved_at
    FROM tasks t
    WHERE t.selected_agent_id = ? AND t.user_rating IS NOT NULL
    ORDER BY t.approved_at DESC
    LIMIT 50
  `).all(req.params.id);

  const reviews = rows.map(r => ({
    taskId:    r.task_id,
    userId:    r.user_id,
    title:     r.title,
    category:  r.category,
    rating:    r.user_rating,
    reviewText: r.review_text || null,
    approvedAt: r.approved_at,
  }));

  const dist = {1:0, 2:0, 3:0, 4:0, 5:0};
  reviews.forEach(r => { if(dist[r.rating] !== undefined) dist[r.rating]++; });

  res.json({ reviews, distribution: dist, total: reviews.length });
});

// ─── Agent performance stats (public) ─────────────────────────────────────────
app.get('/api/agents/:id/stats', (req, res) => {
  const agentId = req.params.id;

  const row = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'disputed' THEN 1 ELSE 0 END) AS disputed,
      SUM(CASE WHEN status = 'error'    THEN 1 ELSE 0 END) AS errors,
      SUM(CASE WHEN status = 'approved' THEN agreed_bid ELSE 0 END) AS total_credits,
      AVG(CASE WHEN status IN ('approved','done') AND hired_at IS NOT NULL AND completed_at IS NOT NULL
          THEN (julianday(completed_at) - julianday(hired_at)) * 86400 END) AS avg_turnaround_sec,
      COUNT(DISTINCT user_id) AS unique_buyers
    FROM tasks
    WHERE selected_agent_id = ?
      AND status IN ('approved','disputed','done','error')
  `).get(agentId);

  // Repeat buyer count — users who hired this agent more than once
  const repeatRow = db.prepare(`
    SELECT COUNT(*) AS repeat_buyers
    FROM (
      SELECT user_id FROM tasks
      WHERE selected_agent_id = ? AND status IN ('approved','done','disputed')
      GROUP BY user_id HAVING COUNT(*) > 1
    )
  `).get(agentId);

  const total    = row.total    || 0;
  const approved = row.approved || 0;
  const disputed = row.disputed || 0;

  res.json({
    totalTasks:       total,
    approvalRate:     total > 0 ? Math.round((approved / total) * 100) : null,
    disputeRate:      total > 0 ? Math.round((disputed / total) * 100) : null,
    avgTurnaroundSec: row.avg_turnaround_sec ? Math.round(row.avg_turnaround_sec) : null,
    totalCreditsEarned: row.total_credits || 0,
    uniqueBuyers:     row.unique_buyers || 0,
    repeatBuyers:     repeatRow.repeat_buyers || 0,
  });
});

// ─── Task complexity analysis ─────────────────────────────────────────────────
// ─── Public leaderboard (all agents + aggregated stats) ──────────────────────
app.get('/api/agents/leaderboard', (req, res) => {
  const agents = getPublishedAgents();

  const statsRows = db.prepare(`
    SELECT
      selected_agent_id AS agent_id,
      COUNT(*) AS total,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status='disputed' THEN 1 ELSE 0 END) AS disputed,
      SUM(CASE WHEN status='approved' THEN agreed_bid ELSE 0 END) AS total_credits,
      AVG(CASE WHEN status IN ('approved','done') AND hired_at IS NOT NULL AND completed_at IS NOT NULL
          THEN (julianday(completed_at) - julianday(hired_at)) * 86400 END) AS avg_turnaround_sec,
      COUNT(DISTINCT user_id) AS unique_buyers
    FROM tasks
    WHERE status IN ('approved','disputed','done','error')
      AND selected_agent_id IS NOT NULL
    GROUP BY selected_agent_id
  `).all();

  const statsMap = {};
  statsRows.forEach(r => { statsMap[r.agent_id] = r; });

  const result = agents.map(a => {
    const s = statsMap[a.id] || {};
    const total    = s.total    || 0;
    const approved = s.approved || 0;
    const disputed = s.disputed || 0;
    const approvalRate = total > 0 ? Math.round((approved/total)*100) : null;
    const disputeRate  = total > 0 ? Math.round((disputed/total)*100) : null;

    let badge = null;
    if (total >= 50 && approvalRate >= 95) badge = 'top_rated';
    else if (total >= 20 && approvalRate >= 90) badge = 'verified';
    else if ((s.unique_buyers || 0) >= 3) badge = 'trusted';
    else if (a.runnerConnected || a.hasWebhook) badge = 'live';

    return {
      id: a.id, name: a.name, emoji: a.emoji, role: a.role, category: a.category,
      rating: a.rating, taskCount: a.taskCount, minCredits: a.minCredits,
      creatorName: a.creatorName, description: a.description,
      compute: a.compute, location: a.location,
      llmModel: a.llm_model, llmProvider: a.llm_provider,
      runnerConnected: liveRunners.has(a.id), hasWebhook: !!a.webhookUrl,
      approvalRate, disputeRate,
      avgTurnaroundSec: s.avg_turnaround_sec ? Math.round(s.avg_turnaround_sec) : null,
      totalCreditsEarned: s.total_credits || 0,
      uniqueBuyers: s.unique_buyers || 0,
      badge,
    };
  });

  // Sort: badge tier desc, then taskCount desc
  const badgeOrder = { top_rated:0, verified:1, trusted:2, live:3, null:4 };
  result.sort((a,b) => (badgeOrder[a.badge]??4) - (badgeOrder[b.badge]??4) || (b.taskCount||0) - (a.taskCount||0));

  res.json(result);
});

app.post('/api/analyse-task', async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'description required' });
  if (!PLATFORM_KEY) {
    // Fallback: word-count heuristic when no API key
    const w = description.trim().split(/\s+/).length;
    const c = w < 15 ? 'simple' : w < 40 ? 'medium' : w < 80 ? 'complex' : 'heavy';
    const ranges = { simple:[60,100], medium:[100,180], complex:[180,300], heavy:[300,500] };
    const [min,max] = ranges[c];
    return res.json({ complexity:c, budgetMin:min, budgetMax:max, reasoning:'Word-count estimate (no API key)' });
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':PLATFORM_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_MODEL, max_tokens: 300,
        system: `You are a task quality advisor for an AI agent marketplace. Analyse task descriptions, estimate effort, and identify what details would help agents deliver better results.

Complexity levels and credit ranges (1 credit = $0.10):
- simple   60–100   e.g. fix a bug, write a function, answer a question, small script
- medium   100–180  e.g. build a React component, write a REST endpoint, data analysis
- complex  180–300  e.g. full-stack feature, production-ready app, system design
- heavy    300–500  e.g. complete web app, complex architecture, multi-system integration

Also identify up to 3 specific details that are MISSING from the task description that would help agents understand and deliver it better. Only include suggestions for things actually missing — if tech stack is specified, don't suggest it. Keep each suggestion short (under 8 words).

Respond ONLY with JSON:
{"complexity":"simple|medium|complex|heavy","budgetMin":N,"budgetMax":N,"reasoning":"one sentence","suggestions":["missing detail 1","missing detail 2"]}`,
        messages: [{ role:'user', content: `Task: ${description.slice(0,800)}` }]
      })
    });
    if (!r.ok) throw new Error('API error');
    const d = await r.json();
    const text = d.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const parsed = JSON.parse(match[0]);
    res.json(parsed);
  } catch {
    // Fallback on any error
    const w = description.trim().split(/\s+/).length;
    const c = w < 15 ? 'simple' : w < 40 ? 'medium' : w < 80 ? 'complex' : 'heavy';
    const ranges = { simple:[60,100], medium:[100,180], complex:[180,300], heavy:[300,500] };
    const [min,max] = ranges[c];
    res.json({ complexity:c, budgetMin:min, budgetMax:max, reasoning:'Word-count estimate' });
  }
});

// ─── Description rewrite suggestion ──────────────────────────────────────────
app.post('/api/suggest-description', async (req, res) => {
  const { description, improvement } = req.body;
  if (!description?.trim() || !improvement?.trim()) return res.status(400).json({ error: 'description and improvement required' });
  if (!PLATFORM_KEY) return res.status(503).json({ error: 'no API key' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':PLATFORM_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_MODEL, max_tokens: 300,
        system: `You are a task description editor for an AI agent marketplace. Rewrite task descriptions to be clearer, more specific, and more actionable for AI agents. Keep the same intent and scope — do not add unrequested features. Be concise (2-5 sentences). Include: what needs to be built, the expected output/format, and any key requirements the user hinted at. Return ONLY the improved description text, no labels, headers, or preamble.`,
        messages: [{ role:'user', content: `Original task description:\n"${description.slice(0,600)}"\n\nContext: ${improvement}` }]
      })
    });
    if (!r.ok) throw new Error('API error');
    const d = await r.json();
    const text = (d.content?.[0]?.text || '').trim();
    res.json({ suggestion: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Support tickets ─────────────────────────────────────────────────────────

function genTicketRef() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return `TKT-${ym}-${rand}`;
}

// Add N business days (Mon–Fri) to a date
function addBusinessDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++; // skip Sat/Sun
  }
  return d;
}

function collectDebugContext(taskId, userId) {
  const ctx = { collectedAt: new Date().toISOString(), userId };
  try {
    if (taskId) {
      const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId);
      if (task) {
        ctx.task = {
          id: task.id, title: task.title, description: task.description,
          status: task.status, category: task.category, complexity: task.complexity,
          maxBudget: task.max_budget, agreedBid: task.agreed_bid,
          agentName: task.agent_name, agentId: task.selected_agent_id,
          creatorId: task.creator_id, tokens: task.tokens, error: task.error,
          revisionCount: task.revision_count,
          revisionFeedback: task.revision_feedback || null,
          revisionHistory: task.revision_history ? JSON.parse(task.revision_history) : [],
          disputeRuling: task.dispute_ruling, disputeScore: task.dispute_score,
          timeline: {
            created:   task.created_at,
            hired:     task.hired_at,
            completed: task.completed_at,
            approved:  task.approved_at,
            disputed:  task.disputed_at,
          }
        };
        // Bids submitted on this task
        ctx.bids = task.bids ? JSON.parse(task.bids) : [];
        ctx.bidLog = task.bid_log ? JSON.parse(task.bid_log) : [];
        // Escrow record
        const escrow = db.prepare(`SELECT * FROM escrow WHERE task_id = ?`).get(taskId);
        ctx.escrow = escrow || null;
        // All transactions for this task
        ctx.transactions = db.prepare(`SELECT * FROM transactions WHERE task_id = ? ORDER BY ts`).all(taskId);
      }
    }
    // User wallet state
    const wallet = db.prepare(`SELECT * FROM user_wallets WHERE user_id = ?`).get(userId);
    ctx.userWallet = wallet || null;
    // Last 10 transactions by user
    ctx.recentTxns = db.prepare(`SELECT * FROM transactions WHERE from_id = ? OR to_id = ? ORDER BY ts DESC LIMIT 10`).all(userId, userId);
  } catch (e) {
    ctx.debugError = e.message;
  }
  return ctx;
}

async function runAITriage(ticket, debugCtx, screenshotDataUrl = null) {
  if (!PLATFORM_KEY) return null;
  const issueGuides = {
    dispute_outcome: 'Focus on whether the AI judge ruling was fair given the deliverable and task description.',
    payment:         'Focus on credit balance, Stripe payment status, and transaction log.',
    not_delivered:   'Focus on whether the runner was online, bid was received, and task was routed correctly.',
    poor_quality:    'Focus on the deliverable content vs task requirements. Note the user chose not to formally dispute.',
    technical:       'Focus on error messages, task status transitions, and any system errors.',
    billing:         'Focus on credit purchases, charges, and wallet state.',
    other:           'Assess the issue based on context provided.',
  };
  const guide = issueGuides[ticket.issue_type] || issueGuides.other;

  const systemPrompt = `You are AgentFlow's first-line support AI. You have full access to platform debug data and must help the user understand what happened.

Your goals:
1. Understand exactly what happened using the debug context
2. Walk through a timestamped, step-by-step timeline of the task lifecycle (creation → hire → delivery → revisions → outcome)
3. For each revision cycle in revisionHistory: note when feedback was submitted, what the user reported, whether a screenshot was attached, and what the final outcome was (accepted/disputed/pending)
4. Give a clear, empathetic explanation of what happened and why
5. Suggest a concrete resolution or next step
6. Rate your confidence 0–100 in having fully resolved the issue

CRITICAL RULES:
- You are a SUPPORT AGENT, NOT a dispute arbiter. You CANNOT rule on disputes, release credits, or make financial decisions. NEVER say anything that sounds like a ruling or judgment on who is right or wrong.
- If the debug context includes a task with disputeRuling="creator" it means the AI JUDGE (not you) already ruled creator wins and escrow was released. Explain it accurately.
- If disputeRuling="user" it means the AI JUDGE already ruled user wins and issued a refund.
- NEVER contradict the recorded disputeRuling — it is the authoritative outcome.
- If a task has status="disputed" with a disputeRuling set, the dispute is ALREADY RESOLVED — do not say it is pending.
- If the user is asking about a task that has a deliverable in the debug context, always tell them where/how to access it (it is in their task view on the platform).
- If revisionHistory has entries, explicitly mention each revision: what the user asked for, when, and whether it was resolved. This shows the user you have full context.
- If the task status is "done" (not yet approved or disputed), remind the user that they can STILL click "Dispute" in the task detail view to trigger a formal AI judge review and potential refund. This option is available until they click Approve.
- When your resolution is "needs_human", you MUST end your response with: "This case has been escalated to our human support team. You can also reach us directly at ${SUPPORT_EMAIL} — reference your ticket number ${ticket.ticket_ref}." Use this exact phrasing.

For issue type "${ticket.issue_type}": ${guide}

Respond ONLY with this JSON (no other text):
{
  "response": "...(friendly, clear, accurate message to the user — 2–5 paragraphs including the timeline)...",
  "timeline": [...array of {timestamp, event} objects reconstructed from debug data, most recent last...],
  "confidence": 85,
  "resolution": "auto_resolved | needs_human | needs_info",
  "priority": "low | normal | high | critical",
  "summary": "...(one-line internal summary for the platform team)..."
}`;

  const userMsg = `TICKET REF: ${ticket.ticket_ref}
ISSUE TYPE: ${ticket.issue_type}
SUBJECT: ${ticket.subject}
USER DESCRIPTION: ${ticket.body}

DEBUG CONTEXT:
${JSON.stringify(debugCtx, null, 2).slice(0, 8000)}`;

  try {
    const userContent = screenshotDataUrl
      ? [
          { type: 'image', source: { type: 'base64', media_type: screenshotDataUrl.match(/data:([^;]+)/)?.[1] || 'image/png', data: screenshotDataUrl.split(',')[1] } },
          { type: 'text', text: `${userMsg}\n\nNOTE: The user has attached a screenshot as evidence. Use it to assess the quality or correctness of the deliverable.` },
        ]
      : userMsg;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': PLATFORM_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1200, system: systemPrompt, messages: [{ role:'user', content: userContent }] }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const text = d.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch { return null; }
}

async function sendEmail(to, subject, body) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[AF] 📧 EMAIL (skipped — no RESEND_API_KEY): to=${to} subject="${subject}"`);
    return;
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AgentFlow Support <onboarding@resend.dev>',
        to: [to],
        subject,
        text: body,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) console.warn(`[AF] 📧 Email failed: ${d.message || r.status}`);
    else console.log(`[AF] 📧 Email sent to ${to}: "${subject}"`);
  } catch (e) {
    console.warn(`[AF] 📧 Email error: ${e.message}`);
  }
}

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'iamarchon@proton.me';

app.post('/api/support/ticket', requireApiAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { taskId, issueType, subject, body, userEmail, screenshotDataUrl } = req.body;
    if (!subject?.trim() || !body?.trim()) return res.status(400).json({ error: 'subject and body required' });

    const now = new Date().toISOString();
    const etaAt = addBusinessDays(new Date(), 5).toISOString();
    const id = `ticket-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const ticketRef = genTicketRef();
    const debugCtx = collectDebugContext(taskId || null, userId);

    db.prepare(`
      INSERT INTO support_tickets (id, ticket_ref, task_id, user_id, user_email, issue_type, subject, body, debug_context, screenshot_data, status, priority, eta_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'normal', ?, ?, ?)
    `).run(id, ticketRef, taskId || '', userId, userEmail?.trim() || null, issueType || 'other', subject.trim(), body.trim(), JSON.stringify(debugCtx), screenshotDataUrl || null, etaAt, now, now);

    console.log(`[AF] 🎫 Ticket ${ticketRef} (${issueType||'other'}) opened by ${userId}`);
    res.json({ ticketId: id, ticketRef, status: 'open' });

    // Async: AI triage + platform email (non-blocking, won't affect response)
    setImmediate(async () => {
      try {
        const ticket = { ticket_ref: ticketRef, issue_type: issueType||'other', subject: subject.trim(), body: body.trim() };
        const triage = await runAITriage(ticket, debugCtx, screenshotDataUrl || null);

        if (triage) {
          // Auto-resolve only when AI is very confident AND explicitly auto_resolved
          const aiResolved = triage.resolution === 'auto_resolved' && (triage.confidence || 0) >= 75 ? 1 : 0;
          const needsHuman = triage.resolution === 'needs_human';
          const newStatus = aiResolved ? 'ai_resolved' : 'open';
          // For needs_human, append footer to response so user always has the email
          const escapedEmail = `${SUPPORT_EMAIL}`;
          const humanFooter = needsHuman
            ? `\n\nThis case has been escalated to our human support team. You can also reach us directly at ${escapedEmail} — reference your ticket number ${ticketRef}.`
            : '';
          const finalResponse = (triage.response || '') + humanFooter;

          db.prepare(`
            UPDATE support_tickets SET ai_response=?, ai_confidence=?, ai_resolved=?, ai_reviewed_at=?,
              status=?, priority=COALESCE(?,priority), updated_at=? WHERE id=?
          `).run(finalResponse, triage.confidence, aiResolved, new Date().toISOString(),
                 newStatus, triage.priority, new Date().toISOString(), id);
          console.log(`[AF] 🤖 Ticket ${ticketRef} triaged — confidence=${triage.confidence} resolution=${triage.resolution}`);

          // Email user their AI response if they provided an email
          if (userEmail?.trim() && finalResponse) {
            const autoResolved = triage.resolution === 'auto_resolved' && (triage.confidence||0) >= 75;
            await sendEmail(userEmail.trim(), `Re: [${ticketRef}] ${subject}`,
              `Hi,\n\nThanks for reaching out. Here's our initial response:\n\n${finalResponse}\n\n` +
              (autoResolved ? `We believe this resolves your issue. If not, reply to this email or open a new ticket referencing ${ticketRef}.\n`
                            : needsHuman ? `A human from our team will follow up with you shortly. You can also email us at ${SUPPORT_EMAIL} referencing ${ticketRef}.\n`
                            : `We're still reviewing this. A team member will follow up if needed.\n`) +
              `\nTicket ref: ${ticketRef}\n\n— AgentFlow Support`
            );
          }
        }

        // Notify platform owner (always — auto-resolved tickets still logged)
        const summary = triage?.summary || subject;
        const needsHumanFlag = triage?.resolution === 'needs_human';
        const autoTag = (triage?.resolution === 'auto_resolved' && (triage?.confidence||0) >= 75) ? '[AUTO-RESOLVED] ' : (needsHumanFlag ? '[NEEDS HUMAN] ' : '');
        const revHistory = debugCtx?.task?.revisionHistory || [];
        const revisionTrail = revHistory.length > 0
          ? '\n\nREVISION TRAIL:\n' + revHistory.map(r =>
              `  [Rev ${r.n}] ${r.submittedAt}\n` +
              `    User feedback: ${r.feedback}\n` +
              `    Screenshot attached: ${r.screenshotAttached ? 'Yes' : 'No'}\n` +
              `    Agent deliverable (prior, first 600 chars):\n${(r.agentDeliverablePrior||'(none)').slice(0,600)}\n` +
              `    Outcome: ${r.outcome}${r.resolvedAt ? ' at ' + r.resolvedAt : ''}${r.disputeRuling ? ' (ruling: '+r.disputeRuling+')' : ''}`
            ).join('\n\n')
          : '';
        const triageTimeline = triage?.timeline?.length > 0
          ? '\n\nAI-RECONSTRUCTED TIMELINE:\n' + triage.timeline.map(e => `  ${e.timestamp}  ${e.event}`).join('\n')
          : '';
        const emailTag = needsHumanFlag ? '🚨 [NEEDS HUMAN] ' : (autoTag || '');
        await sendEmail(SUPPORT_EMAIL,
          `🎫 ${emailTag}[${ticketRef}] ${issueType||'other'}: ${subject}`,
          `Support ticket submitted${needsHumanFlag ? ' — HUMAN REVIEW REQUIRED' : autoTag ? ' (AI auto-resolved)' : ''}.\n\n` +
          `Ref: ${ticketRef}\nUser: ${userId}\nType: ${issueType||'other'}\nPriority: ${triage?.priority||'normal'}\n` +
          (userEmail ? `User email: ${userEmail}\n` : 'User email: not provided\n') + '\n' +
          `Subject: ${subject}\n\nUser message:\n${body}\n\n` +
          (triage ? `AI triage summary: ${summary}\nAI confidence: ${triage.confidence}%\nAI response:\n${triage.response}\n` : `AI triage: unavailable\n\n`) +
          triageTimeline +
          revisionTrail +
          `\n\nDebug context (task/txn data):\n${JSON.stringify(debugCtx, null, 2).slice(0, 2500)}`
        );
      } catch (bgErr) {
        console.error('[AF] Ticket background processing error:', bgErr.message);
      }
    });
  } catch (e) {
    console.error('[AF] Ticket submission error:', e.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create ticket: ' + e.message });
  }
});

app.get('/api/support/tickets', requireApiAuth, (req, res) => {
  const userId = getUserId(req);
  const rows = db.prepare(`SELECT id, ticket_ref, issue_type, subject, body, status, priority, ai_response, ai_confidence, ai_resolved, eta_at, created_at, updated_at, screenshot_data FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
  res.json(rows);
});

// Public status lookup — no auth (just ref)
app.get('/api/support/status/:ref', (req, res) => {
  const row = db.prepare(`SELECT id, ticket_ref, issue_type, subject, status, priority, ai_response, ai_resolved, created_at, updated_at FROM support_tickets WHERE ticket_ref = ?`).get(req.params.ref);
  if (!row) return res.status(404).json({ error: 'Ticket not found' });
  res.json(row);
});

// Admin — all tickets (list, no debug_context blob)
app.get('/api/admin/tickets', (req, res) => {
  const rows = db.prepare(`SELECT id, ticket_ref, user_id, user_email, task_id, issue_type, subject, body, status, priority, ai_confidence, ai_resolved, ai_response, eta_at, created_at, updated_at FROM support_tickets ORDER BY created_at DESC LIMIT 200`).all();
  const rated = rows.filter(r => r.ai_confidence != null);
  const stats = {
    total: rows.length,
    open: rows.filter(r => r.status === 'open').length,
    aiResolved: rows.filter(r => r.ai_resolved).length,
    byType: rows.reduce((a, r) => { a[r.issue_type] = (a[r.issue_type]||0)+1; return a; }, {}),
    avgAiConfidence: rated.length ? Math.round(rated.reduce((s,r) => s + r.ai_confidence, 0) / rated.length) : 0,
  };
  res.json({ tickets: rows, stats });
});

// Admin — single ticket with full debug context
app.get('/api/admin/tickets/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM support_tickets WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, debug_context: row.debug_context ? JSON.parse(row.debug_context) : null });
});

// Admin — resolve ticket
app.post('/api/admin/tickets/:id/resolve', async (req, res) => {
  const now = new Date().toISOString();
  const { notes } = req.body || {};
  const ticket = db.prepare(`SELECT * FROM support_tickets WHERE id = ?`).get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  db.prepare(`UPDATE support_tickets SET status='resolved', resolved_at=?, resolution_notes=?, updated_at=? WHERE id=?`)
    .run(now, notes || null, now, req.params.id);

  // Email the user if we have their email
  const userEmail = ticket.user_email;
  if (userEmail && userEmail.includes('@')) {
    const resolvedBy = notes ? `Our team has resolved your ticket with the following notes:\n\n${notes}` : `Your ticket has been reviewed and resolved by our support team.`;
    const aiContext = ticket.ai_response ? `\n\nAI Initial Analysis:\n${ticket.ai_response}` : '';
    await sendEmail(
      userEmail,
      `✓ Resolved: [${ticket.ticket_ref}] ${ticket.subject}`,
      `Hi,\n\nYour support ticket has been resolved.\n\nTicket: ${ticket.ticket_ref}\nIssue: ${ticket.subject}\n\n${resolvedBy}${aiContext}\n\nIf you have further questions or this did not resolve your issue, please open a new ticket and reference ${ticket.ticket_ref}.\n\nAgentFlow Support`
    );
    console.log(`[AF] 📧 Resolution email sent to ${userEmail} for ${ticket.ticket_ref}`);
  } else {
    console.log(`[AF] ⚠ No user email for ticket ${ticket.ticket_ref} — resolution email skipped`);
  }

  res.json({ success: true });
});

app.post('/api/tasks/:id/dispute', requireApiAuth, async (req, res) => {
  const userId = getUserId(req);
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.userId !== userId) return res.status(403).json({ error: 'Not your task' });
  if (!['running', 'done'].includes(task.status))
    return res.status(400).json({ error: `Cannot dispute a task with status: ${task.status}` });

  const now = new Date().toISOString();

  // Tasks still running (no deliverable yet) → immediate refund, no judge needed
  if (task.status === 'running' || !task.deliverable) {
    refundEscrow(task.id);
    updateTask(task.id, { status: 'disputed', disputeRuling: 'user', disputeScore: 0, disputeReason: 'No deliverable was provided.', disputedAt: now, disputeResolvedAt: now });
    return res.json({ ruling: 'user', score: 0, reason: 'No deliverable was provided.', wallet: getOrCreateUserWallet(userId) });
  }

  // Call AI judge
  updateTask(task.id, { status: 'judging', disputedAt: now });
  res.json({ judging: true, taskId: task.id });

  try {
    const descWords = (task.description || '').trim().split(/\s+/).length;
    const judgePrompt = `You are a neutral arbiter for an AI agent task marketplace. A user has disputed a task delivery. Score it 0–100 and rule for user or creator.

SCORING RUBRIC:
- 0–39: Deliverable is completely off-topic, empty, or harmful → user wins
- 40–69: Partial or low-quality work that does not meet the task requirements → user wins
- 70–84: Acceptable work that addresses the task, even if imperfect → creator wins
- 85–100: High-quality, complete deliverable that clearly meets all stated requirements → creator wins

REQUIREMENT CLARITY RULES (apply these before scoring):
- Count the words in the task description. If it is fewer than 20 words or clearly lacks specifics (no domain, no tech stack, no acceptance criteria), the task is considered VAGUE.
- For a VAGUE task: the agent was responsible for explicitly stating their assumptions at the top of the deliverable before doing any work. If they did NOT state assumptions, deduct 20 points from your score. A generic deliverable on a vague brief with no stated assumptions should score no higher than 72.
- For a VAGUE task where the agent DID state assumptions clearly: score normally but cap at 84 — the user is protected because they never confirmed those assumptions.
- For a CLEAR task (20+ words with specifics): apply the standard rubric with no caps.

FORMATTING ARTIFACT CHECK (apply after scoring):
- If the deliverable is intended to be clean output (HTML, code, JSON, a structured document) but contains raw markdown artifacts visible as literal text — such as **bold**, *italic*, \`\`\`code fences\`\`\`, # headings, or chatty prose like "Here is your..." at the start — deduct 15 points. This indicates the agent returned its raw LLM response verbatim without extracting the actual deliverable.
- Do NOT deduct if the task explicitly requested markdown output, a README, documentation, or a written report.

TASK DESCRIPTION (${descWords} words):
${task.description}

DELIVERABLE PROVIDED BY AGENT:
${task.deliverable}

Return ONLY valid JSON, no markdown:
{"score":85,"ruling":"creator","reason":"One sentence explanation of the ruling."}`;

    const result = await callClaude(PLATFORM_KEY, 'You are a neutral marketplace arbiter. Return only valid JSON.', judgePrompt);
    let judgment;
    try { judgment = JSON.parse(result.text.replace(/```json|```/g, '').trim()); }
    catch { judgment = { score: 50, ruling: 'user', reason: 'AI judge returned invalid response — defaulting to user refund.' }; }

    const { score, ruling, reason } = judgment;
    const validRuling = ['user', 'creator'].includes(ruling) ? ruling : 'user';
    const validScore  = typeof score === 'number' ? Math.max(0, Math.min(100, Math.round(score))) : 50;

    const resolvedAt = new Date().toISOString();
    // Mark last revision as disputed if revision history exists
    const rawDispute = db.prepare(`SELECT revision_history FROM tasks WHERE id = ?`).get(task.id);
    if (rawDispute?.revision_history) {
      const rh = JSON.parse(rawDispute.revision_history);
      if (rh.length > 0) { rh[rh.length - 1].outcome = 'disputed'; rh[rh.length - 1].resolvedAt = resolvedAt; rh[rh.length - 1].disputeRuling = validRuling; }
      db.prepare(`UPDATE tasks SET revision_history = ? WHERE id = ?`).run(JSON.stringify(rh), task.id);
    }
    if (validRuling === 'creator') {
      // Creator wins — release escrow normally
      releaseEscrow(task.id);
      updateTask(task.id, { status: 'disputed', disputeScore: validScore, disputeRuling: 'creator', disputeReason: reason, disputeResolvedAt: resolvedAt });
      console.log(`[AF] ⚖ Dispute: creator wins | score ${validScore} | ${reason}`);
    } else {
      // User wins — full refund
      refundEscrow(task.id);
      updateTask(task.id, { status: 'disputed', disputeScore: validScore, disputeRuling: 'user', disputeReason: reason, disputeResolvedAt: resolvedAt });
      console.log(`[AF] ⚖ Dispute: user wins | score ${validScore} | ${reason}`);
    }
  } catch (err) {
    // Judge failed — default to user refund
    refundEscrow(task.id);
    updateTask(task.id, { status: 'disputed', disputeRuling: 'user', disputeScore: 0, disputeReason: `Judge error: ${err.message}`, disputeResolvedAt: new Date().toISOString() });
    console.error(`[AF] Dispute judge error: ${err.message}`);
  }
});

app.post('/api/tasks/:id/cancel', requireApiAuth, (req, res) => {
  const userId = getUserId(req);
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error:'Task not found' });
  if (task.userId !== userId) return res.status(403).json({ error:'Not your task' });
  if (!['awaiting_selection','collecting_bids'].includes(task.status))
    return res.status(400).json({ error:'Can only cancel before hiring' });
  if (auctionsOpen.has(task.id))
    return res.status(400).json({ error:'Auction in progress — wait for bids to close before cancelling' });
  refundEscrow(task.id);
  updateTask(task.id, { status:'cancelled' });
  res.json({ success:true, wallet:getOrCreateUserWallet(userId) });
});

app.get('/api/tasks', requireApiAuth, (req, res) => {
  const userId = getUserId(req);
  const rows = db.prepare(`SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).all(userId);
  res.json(rows.map(r => mapTask(r)));
});

app.get('/api/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error:'Task not found' });
  const e = db.prepare(`SELECT * FROM escrow WHERE task_id = ?`).get(req.params.id);
  res.json({ ...task, escrow:e||null });
});

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARK
// ─────────────────────────────────────────────────────────────────────────────

const BENCHMARK_TASKS = [
  {
    slot: 1, complexity: 'simple',
    title: 'FizzBuzz',
    description: 'Write a JavaScript function that returns FizzBuzz output for numbers 1–20. For multiples of 3 print "Fizz", multiples of 5 print "Buzz", multiples of both print "FizzBuzz", otherwise the number. Return the result as an array.',
  },
  {
    slot: 2, complexity: 'medium',
    title: 'REST endpoint design',
    description: 'Design a REST API endpoint for paginated user search. Specify: HTTP method, URL pattern with query params, request validation rules, success response shape (JSON), and two error cases with their status codes. Keep it concise and practical.',
  },
  {
    slot: 3, complexity: 'complex',
    title: 'System design mini',
    description: 'You are given a URL shortener service (like bit.ly) that needs to handle 10,000 requests per second. Describe: the data model (table/fields), the algorithm to generate short codes, how you would handle redirects efficiently, and one caching strategy. Be specific.',
  },
];

const BENCHMARK_TIMEOUT_MS = 90_000;

async function runBenchmark(agentId) {
  const agent = db.prepare(`SELECT * FROM published_agents WHERE id = ?`).get(agentId);
  if (!agent) return;

  const tests = BENCHMARK_TASKS.map(t => ({ ...t, status: 'pending', passed: false, deliverable: null, elapsed: null, error: null }));
  const saveResults = (status) => {
    db.prepare(`UPDATE published_agents SET benchmark_status = ?, benchmark_results = ? WHERE id = ?`)
      .run(status, JSON.stringify(tests), agentId);
  };

  saveResults('running');

  const agentObj = getAllAgents().find(a => a.id === agentId) || {
    id: agent.id, webhookUrl: agent.webhook_url, isInternal: false,
    name: agent.name, system_prompt: agent.system_prompt,
  };

  await Promise.all(tests.map(async (test) => {
    const taskId = `bench-${agentId}-${test.slot}-${Date.now()}`;
    const callbackUrl = `${BASE_URL}/api/benchmark/callback/${taskId}`;
    const t0 = Date.now();

    test.status = 'running';
    saveResults('running');

    try {
      // Register a pending benchmark callback listener
      const result = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          pendingBenchmarks.delete(taskId);
          resolve({ status: 'error', error: 'Timed out after 90s' });
        }, BENCHMARK_TIMEOUT_MS);

        pendingBenchmarks.set(taskId, (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });

        const payload = {
          taskId, callbackUrl,
          task: { title: test.title, description: test.description },
          reward: 0, maxBudget: 100,
        };

        const runnerWs = liveRunners.get(agentId);
        if (runnerWs && runnerWs.readyState === 1) {
          runnerWs.send(JSON.stringify({ type: 'task', ...payload }));
        } else if (agent.webhook_url) {
          fetch(agent.webhook_url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(err => {
            clearTimeout(timer);
            pendingBenchmarks.delete(taskId);
            resolve({ status: 'error', error: `Webhook unreachable: ${err.message}` });
          });
        } else {
          clearTimeout(timer);
          pendingBenchmarks.delete(taskId);
          resolve({ status: 'error', error: 'No webhook URL and no runner connected' });
        }
      });

      test.elapsed = Date.now() - t0;
      test.status   = result.status === 'done' ? 'done' : 'error';
      test.error     = result.error || null;
      test.deliverable = result.deliverable || null;
      test.passed    = result.status === 'done' && typeof result.deliverable === 'string' && result.deliverable.trim().length > 50;
    } catch (err) {
      test.elapsed = Date.now() - t0;
      test.status  = 'error';
      test.error   = err.message;
      test.passed  = false;
    }

    saveResults('running');
  }));

  const passed = tests.filter(t => t.passed).length;
  const finalStatus = passed >= 2 ? 'passed' : 'failed';
  saveResults(finalStatus);

  // Set agent live or benchmark_failed
  const agentStatus = finalStatus === 'passed' ? 'live' : 'benchmark_failed';
  db.prepare(`UPDATE published_agents SET status = ? WHERE id = ?`).run(agentStatus, agentId);
  console.log(`[AF] Benchmark ${agentId}: ${passed}/3 passed → ${agentStatus}`);
}

// In-memory map for pending benchmark callbacks: taskId → resolve fn
const pendingBenchmarks = new Map();

// Benchmark callback endpoint (unauthenticated — called by agent)
app.post('/api/benchmark/callback/:taskId', (req, res) => {
  const { taskId } = req.params;
  const cb = pendingBenchmarks.get(taskId);
  if (cb) {
    pendingBenchmarks.delete(taskId);
    cb(req.body);
  }
  res.json({ received: true });
});

// Poll benchmark status
app.get('/api/creator/agents/:agentId/benchmark', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const { agentId } = req.params;
  const row = db.prepare(`SELECT benchmark_status, benchmark_results, status FROM published_agents WHERE id = ? AND creator_id = ?`).get(agentId, creatorId);
  if (!row) return res.status(404).json({ error: 'Agent not found' });
  res.json({
    benchmarkStatus: row.benchmark_status,
    agentStatus: row.status,
    tests: row.benchmark_results ? JSON.parse(row.benchmark_results) : [],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/creator/review', requireApiAuth, async (req, res) => {
  const { spec, apiKey } = req.body;
  if (!spec?.trim() || !apiKey?.trim()) return res.status(400).json({ error:'spec and apiKey required' });
  try {
    const r = await callClaude(apiKey,
      `You are an AI marketplace reviewer for AgentFlow. Analyze an agent spec and return ONLY valid JSON — no markdown, no backticks.
Return exactly: {"name":"...","emoji":"...","role":"...","category":"build|qa|code|pm|research|writing","description":"2 sentence description","tags":["t1","t2","t3"],"minCredits":80,"bidStrategy":{"floor":60,"style":"competitive|budget|premium"},"scores":{"clarity":85,"safety":92,"uniqueness":74,"completeness":88,"overall":85},"verdict":"approve|review|reject","notes":["n1","n2","n3"],"systemPrompt":"150-250 word system prompt from spec"}`,
      `Review this agent spec:\n\n${spec}`);
    let parsed; try { parsed=JSON.parse(r.text.replace(/```json|```/g,'').trim()); } catch { return res.status(500).json({ error:'AI returned invalid JSON' }); }
    res.json({ review:parsed, tokens:r.tokens });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Agent image upload (base64 → disk) ──────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'agents');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.post('/api/creator/upload-image', requireApiAuth, (req, res) => {
  const { base64, filename } = req.body;
  if (!base64 || !filename) return res.status(400).json({ error: 'base64 and filename required' });
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const allowed = ['jpg','jpeg','png','gif','webp'];
  if (!allowed.includes(ext)) return res.status(400).json({ error: 'Only jpg/png/gif/webp allowed' });
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, safeName);
  try {
    const data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    res.json({ url: `/uploads/agents/${safeName}` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save image' });
  }
});

app.post('/api/creator/publish', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const { agent } = req.body;
  if (!agent?.name) return res.status(400).json({ error:'name required' });
  const id = `${agent.name.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`;
  getOrCreateCreatorWallet(creatorId);

  // Collect listing deposit
  const wallet = getOrCreateUserWallet(creatorId);
  if (wallet.available < LISTING_DEPOSIT)
    return res.status(400).json({ error: `Listing deposit required: ⚡${LISTING_DEPOSIT}. You have ⚡${wallet.available}.`, depositRequired: LISTING_DEPOSIT });
  db.prepare(`UPDATE user_wallets SET available = available - ? WHERE user_id = ?`).run(LISTING_DEPOSIT, creatorId);
  logTx('deposit', creatorId, 'platform', LISTING_DEPOSIT, null, `Listing deposit — ${agent.name}`);
  const newAgent = {
    id, name:agent.name, emoji:agent.emoji||'🤖', role:agent.role||'AI Agent',
    category:agent.category||'build', tags:agent.tags||[], minCredits:agent.minCredits||80,
    rating:5.0, taskCount:0, status:'live',
    creatorName:agent.creatorName||'Anonymous', creatorId,
    description:agent.description||'', webhookUrl:agent.webhookUrl||null,
    healthUrl:agent.healthUrl||(agent.webhookUrl?agent.webhookUrl.replace('/run','/health'):null),
    bidUrl:agent.bidUrl||(agent.webhookUrl?agent.webhookUrl.replace('/run','/bid'):null),
    bidStrategy:agent.bidStrategy||{floor:60,style:'competitive'},
    systemPrompt:agent.systemPrompt||null,
    compute:agent.compute||null,
    responseMs:agent.responseMs||600,
    location:agent.location||null,
    isInternal:false,
    imageUrl: agent.imageUrl || null,
  };
  db.prepare(`
    INSERT INTO published_agents (id, name, emoji, role, category, tags, min_credits, rating, task_count, status, creator_name, creator_id, description, webhook_url, health_url, bid_url, bid_strategy, system_prompt, compute, response_ms, location, is_internal, deposit_paid, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, newAgent.name, newAgent.emoji, newAgent.role, newAgent.category,
    JSON.stringify(newAgent.tags), newAgent.minCredits, newAgent.rating, 0, 'live',
    newAgent.creatorName, creatorId, newAgent.description,
    newAgent.webhookUrl, newAgent.healthUrl, newAgent.bidUrl,
    JSON.stringify(newAgent.bidStrategy),
    newAgent.systemPrompt, newAgent.compute, newAgent.responseMs,
    newAgent.location ? JSON.stringify(newAgent.location) : null, 0, 1, newAgent.imageUrl);
  // Start benchmark async — agent goes live only after 2/3 tests pass
  db.prepare(`UPDATE published_agents SET status = 'benchmarking', benchmark_status = 'running' WHERE id = ?`).run(id);
  newAgent.status = 'benchmarking';
  console.log(`[AF] Agent submitted: ${agent.name} — running benchmark…`);
  res.json({ agent: newAgent, benchmarking: true, depositPaid: LISTING_DEPOSIT, wallet: getOrCreateUserWallet(creatorId) });
  runBenchmark(id).catch(err => console.error(`[AF] Benchmark error for ${id}:`, err.message));
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR TASK DASHBOARD API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/creator/tasks', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const rows = db.prepare(`
    SELECT t.*, r.rating as user_rating_val
    FROM tasks t
    LEFT JOIN agent_ratings r ON r.task_id = t.id
    WHERE t.creator_id = ?
    ORDER BY t.created_at DESC
    LIMIT 100
  `).all(creatorId);

  const mapped = rows.map(r => {
    const pricing = findPricing(r.llm_model);
    const llmCostUsd = estimateCostUsd(r.tokens, r.llm_model, r.input_tokens, r.output_tokens);
    const costIsExact = r.input_tokens != null && r.output_tokens != null && pricing != null;
    return {
      id: r.id, title: r.title, description: r.description,
      maxBudget: r.max_budget, agreedBid: r.agreed_bid,
      category: r.category, complexity: r.complexity,
      status: r.status, agentName: r.agent_name, agentEmoji: r.agent_emoji,
      selectedAgentId: r.selected_agent_id,
      tokens: r.tokens, inputTokens: r.input_tokens || null, outputTokens: r.output_tokens || null,
      llmModel: r.llm_model || null, llmProvider: r.llm_provider || null,
      llmCostUsd, costIsExact,
      llmInputRatePerM:  pricing?.in  || null,
      llmOutputRatePerM: pricing?.out || null,
      error: r.error,
      userRating: r.user_rating_val || null,
      reviewText: r.review_text || null,
      disputeRuling: r.dispute_ruling || null,
      disputeScore: r.dispute_score || null,
      disputeReason: r.dispute_reason || null,
      createdAt: r.created_at, hiredAt: r.hired_at,
      completedAt: r.completed_at, approvedAt: r.approved_at,
    };
  });

  const stats = {
    total:    mapped.length,
    active:   mapped.filter(t => t.status === 'running').length,
    done:     mapped.filter(t => t.status === 'done').length,
    approved: mapped.filter(t => t.status === 'approved').length,
    disputed: mapped.filter(t => t.status === 'disputed').length,
    earned:   mapped.filter(t => t.status === 'approved').reduce((s,t) => s + (t.agreedBid || 0), 0),
    totalLlmCostUsd: Math.round(mapped.reduce((s,t) => s + (t.llmCostUsd || 0), 0) * 10000) / 10000,
    avgRating: (() => {
      const rated = mapped.filter(t => t.userRating);
      return rated.length ? Math.round(rated.reduce((s,t) => s + t.userRating, 0) / rated.length * 10) / 10 : null;
    })(),
  };

  res.json({ tasks: mapped, stats });
});

app.get('/api/creator/tasks/:id/log', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const taskId = req.params.id;
  const log = db.prepare(`
    SELECT * FROM task_logs WHERE task_id = ? AND creator_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(taskId, creatorId);
  if (!log) return res.status(404).json({ error: 'No log found for this task' });
  res.json(log);
});

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE — CREDIT PURCHASES
// ─────────────────────────────────────────────────────────────────────────────

// Webhook handler — hoisted function declaration so it can be registered before express.json()
async function handleStripeWebhook(req, res) {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe] webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const { userId, credits } = session.metadata || {};
      // Idempotency guard — skip if already processed
      const already = db.prepare(`SELECT id FROM transactions WHERE stripe_id = ?`).get(session.id);
      if (!already && userId && credits) {
        const amount = parseInt(credits, 10);
        getOrCreateUserWallet(userId);
        db.prepare(`UPDATE user_wallets SET available = available + ? WHERE user_id = ?`).run(amount, userId);
        const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        db.prepare(`INSERT INTO transactions (id, type, from_id, to_id, amount, task_id, note, ts, stripe_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(txId, 'purchase', 'stripe', userId, amount, null, `Bought ⚡${amount} credits via Stripe`, new Date().toISOString(), session.id);
        console.log(`[stripe] ✓ credited ⚡${amount} to ${userId}`);
      }
    }
  }

  res.json({ received: true });
}

// ── Attachment upload endpoint ──
app.post('/api/attachments/upload', requireApiAuth, upload.single('file'), async (req, res) => {
  try {
    // URL extraction
    if (req.body.url) {
      const url = req.body.url.trim();
      const r = await fetch(url, { headers: { 'User-Agent': 'AgentFlow/1.0' }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return res.status(400).json({ error: `Could not fetch URL (${r.status})` });
      const html = await r.text();
      // Strip HTML tags, collapse whitespace, truncate
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);
      const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]?.trim() || url;
      return res.json({ type: 'url', name: title, text: `[URL: ${url}]\n${text}` });
    }

    // File extraction
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { mimetype, originalname, buffer } = req.file;

    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      const text = data.text.replace(/\s+/g, ' ').trim().slice(0, 8000);
      return res.json({ type: 'pdf', name: originalname, text: `[PDF: ${originalname}]\n${text}` });
    }

    if (mimetype.startsWith('image/')) {
      // Return as base64 data URL for vision-capable agents
      const b64 = buffer.toString('base64');
      return res.json({ type: 'image', name: originalname, text: `[Image attached: ${originalname}]`, dataUrl: `data:${mimetype};base64,${b64}` });
    }

    res.status(400).json({ error: 'Unsupported file type' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create Stripe Checkout session
app.post('/api/stripe/checkout', requireApiAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const userId = getUserId(req);
  const { credits } = req.body;
  const priceCents = CREDIT_BUNDLES[credits];
  if (!priceCents) return res.status(400).json({ error: `Invalid bundle. Choose: ${Object.keys(CREDIT_BUNDLES).join(', ')}` });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `⚡${credits} AgentFlow Credits`, description: 'Use credits to post tasks and hire AI agents.' },
          unit_amount: priceCents,
        },
        quantity: 1,
      }],
      metadata: { userId, credits: String(credits) },
      success_url: `${BASE_URL}/wallet.html?checkout=success`,
      cancel_url:  `${BASE_URL}/wallet.html`,
    });
    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE — CONNECT (creator payouts)
// ─────────────────────────────────────────────────────────────────────────────

// Start Express onboarding
app.post('/api/stripe/connect/onboard', requireApiAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const creatorId = getUserId(req);
  getOrCreateCreatorWallet(creatorId);
  let { stripe_account_id } = db.prepare(`SELECT stripe_account_id FROM creator_wallets WHERE creator_id = ?`).get(creatorId) || {};
  try {
    if (!stripe_account_id) {
      const acct = await stripe.accounts.create({ type: 'express' });
      stripe_account_id = acct.id;
      db.prepare(`UPDATE creator_wallets SET stripe_account_id = ? WHERE creator_id = ?`).run(stripe_account_id, creatorId);
    }
    const link = await stripe.accountLinks.create({
      account:     stripe_account_id,
      refresh_url: `${BASE_URL}/creator-wallet.html?stripe=refresh`,
      return_url:  `${BASE_URL}/creator-wallet.html?stripe=connected`,
      type:        'account_onboarding',
    });
    res.json({ url: link.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Check Connect status
app.get('/api/stripe/connect/status', requireApiAuth, async (req, res) => {
  if (!stripe) return res.json({ connected: false, stripe_account_id: null });
  const creatorId = getUserId(req);
  const row = db.prepare(`SELECT stripe_account_id FROM creator_wallets WHERE creator_id = ?`).get(creatorId);
  const acctId = row?.stripe_account_id;
  if (!acctId) return res.json({ connected: false, stripe_account_id: null });
  try {
    const acct = await stripe.accounts.retrieve(acctId);
    res.json({ connected: acct.details_submitted && acct.charges_enabled, stripe_account_id: acctId });
  } catch { res.json({ connected: false, stripe_account_id: acctId }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR AGENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// List agents belonging to the authenticated creator
app.get('/api/creator/agents', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const rows = db.prepare(`SELECT * FROM published_agents WHERE creator_id = ?`).all(creatorId);
  res.json(rows.map(r => ({
    id: r.id, name: r.name, emoji: r.emoji, status: r.status,
    webhookUrl: r.webhook_url, hasKey: !!db.prepare(`SELECT 1 FROM agent_keys WHERE agent_id = ?`).get(r.id),
    runnerConnected: liveRunners.has(r.id),
  })));
});

// Generate a new agent key (replaces existing)
app.post('/api/creator/agents/:agentId/key', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const { agentId } = req.params;
  const agent = db.prepare(`SELECT * FROM published_agents WHERE id = ? AND creator_id = ?`).get(agentId, creatorId);
  if (!agent) return res.status(404).json({ error: 'Agent not found or not yours' });
  // Revoke any existing key and disconnect existing runner
  db.prepare(`DELETE FROM agent_keys WHERE agent_id = ?`).run(agentId);
  const existing = liveRunners.get(agentId);
  if (existing) { try { existing.close(1000, 'Key rotated'); } catch {} liveRunners.delete(agentId); }
  const key = 'afk_' + crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO agent_keys (key, agent_id, created_at) VALUES (?, ?, ?)`).run(key, agentId, new Date().toISOString());
  console.log(`[AF] Key generated for agent ${agentId}`);
  res.json({ key, agentId });
});

// Revoke agent key and disconnect runner
app.delete('/api/creator/agents/:agentId/key', requireApiAuth, (req, res) => {
  const creatorId = getUserId(req);
  const { agentId } = req.params;
  const agent = db.prepare(`SELECT * FROM published_agents WHERE id = ? AND creator_id = ?`).get(agentId, creatorId);
  if (!agent) return res.status(404).json({ error: 'Agent not found or not yours' });
  db.prepare(`DELETE FROM agent_keys WHERE agent_id = ?`).run(agentId);
  const existing = liveRunners.get(agentId);
  if (existing) { try { existing.close(1000, 'Key revoked'); } catch {} liveRunners.delete(agentId); }
  res.json({ revoked: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNNER INFO (unauthenticated — called by runner.js on startup)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/runner/info', (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'key required' });
  const row = db.prepare(`SELECT * FROM agent_keys WHERE key = ?`).get(key);
  if (!row) return res.status(401).json({ error: 'Invalid key' });
  const agent = db.prepare(`SELECT * FROM published_agents WHERE id = ?`).get(row.agent_id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({
    agentId: agent.id, name: agent.name, emoji: agent.emoji, role: agent.role,
    systemPrompt: agent.system_prompt, category: agent.category,
    minCredits: agent.min_credits || 50,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN STATS API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/admin/agent-stats', (req, res) => {
  // Real per-agent earnings from tx log joined with tasks
  const rows = db.prepare(`
    SELECT t.selected_agent_id as agentId,
           COUNT(DISTINCT t.id)   as taskCount,
           SUM(CASE WHEN tx.to_id != 'platform' THEN tx.amount ELSE 0 END) as creatorEarned,
           SUM(CASE WHEN tx.to_id  = 'platform' THEN tx.amount ELSE 0 END) as platformEarned,
           AVG(r.rating) as avgRating
    FROM tasks t
    JOIN transactions tx ON tx.task_id = t.id AND tx.type = 'release'
    LEFT JOIN agent_ratings r ON r.task_id = t.id
    WHERE t.selected_agent_id IS NOT NULL
    GROUP BY t.selected_agent_id
  `).all();

  res.json(rows.map(r => ({
    agentId:        r.agentId,
    taskCount:      r.taskCount,
    creatorEarned:  r.creatorEarned || 0,
    platformEarned: r.platformEarned || 0,
    totalGMV:       (r.creatorEarned || 0) + (r.platformEarned || 0),
    avgRating:      r.avgRating ? Math.round(r.avgRating * 10) / 10 : null,
  })));
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — AGENT STATUS TOGGLE
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/admin/agents/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['live', 'offline'].includes(status)) return res.status(400).json({ error: 'status must be "live" or "offline"' });
  const agentId = req.params.id;
  const builtin = BUILTIN_AGENTS.find(a => a.id === agentId);
  if (builtin) {
    builtin.status = status;
    return res.json({ agentId, status });
  }
  const result = db.prepare(`UPDATE published_agents SET status = ? WHERE id = ?`).run(status, agentId);
  if (result.changes === 0) return res.status(404).json({ error: 'Agent not found' });
  res.json({ agentId, status });
});

// ─────────────────────────────────────────────────────────────────────────────
// TX LOG API
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/transactions', requireApiAuth, (req, res) => {
  const userId = getUserId(req);
  const rows = db.prepare(`SELECT * FROM transactions WHERE from_id = ? OR to_id = ? ORDER BY ts DESC LIMIT 50`).all(userId, userId);
  res.json(rows.map(r => ({ id:r.id, type:r.type, from:r.from_id, to:r.to_id, amount:r.amount, taskId:r.task_id, note:r.note, ts:r.ts })));
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET SERVER — local runner transport
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const wss    = new WebSocketServer({ server, path: '/runner' });

wss.on('connection', (ws, req) => {
  const url  = new URL(req.url, `http://localhost`);
  const key  = url.searchParams.get('key');
  if (!key) { ws.close(4001, 'key required'); return; }
  const row = db.prepare(`SELECT * FROM agent_keys WHERE key = ?`).get(key);
  if (!row) { ws.close(4001, 'invalid key'); return; }

  const { agent_id: agentId } = row;
  // Close any stale connection for this agent
  const stale = liveRunners.get(agentId);
  if (stale && stale !== ws) { try { stale.close(1000, 'replaced'); } catch {} }
  liveRunners.set(agentId, ws);
  console.log(`[AF] 🔌 Runner connected: ${agentId}`);

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'result') {
      fetch(`${BASE_URL}/api/tasks/${msg.taskId}/callback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: msg.taskId, status: msg.status, deliverable: msg.deliverable, tokens: msg.tokens, error: msg.error }),
      }).catch(() => {});
    }

    if (msg.type === 'bid') {
      const key = `${msg.taskId}:${agentId}`;
      const pending = pendingBids.get(key);
      if (pending) {
        pendingBids.delete(key);
        pending.resolve(msg.decline ? null : (msg.bidAmount ?? null));
      }
    }

    if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));

    if (msg.type === 'progress') {
      const event = { type: 'progress', pct: msg.pct, log: msg.log, tokens: msg.tokens || 0, ts: Date.now() };
      const buf = taskProgressLog.get(msg.taskId) || [];
      buf.push(event);
      if (buf.length > 100) buf.shift();
      taskProgressLog.set(msg.taskId, buf);
      emitTaskProgress(msg.taskId, event);
    }

    if (msg.type === 'task_log') {
      try {
        const task = getTask(msg.taskId);
        if (task) {
          db.prepare(`
            INSERT INTO task_logs (task_id, agent_id, creator_id, system_prompt, user_message, response,
              llm_model, llm_provider, input_tokens, output_tokens, total_tokens)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            msg.taskId, agentId, task.creatorId,
            msg.systemPrompt || null, msg.userMessage || null, msg.response || null,
            msg.llmModel || null, msg.llmProvider || null,
            msg.inputTokens || null, msg.outputTokens || null,
            (msg.inputTokens || 0) + (msg.outputTokens || 0) || null
          );
        }
      } catch (e) { console.error('[AF] task_log insert error:', e.message); }
    }
  });

  ws.on('close', () => {
    if (liveRunners.get(agentId) === ws) liveRunners.delete(agentId);
    console.log(`[AF] 🔌 Runner disconnected: ${agentId}`);
  });

  ws.on('error', () => {
    if (liveRunners.get(agentId) === ws) liveRunners.delete(agentId);
  });

  ws.send(JSON.stringify({ type: 'connected', agentId }));
});

// ─── Scheduled: daily urgent-ticket email ────────────────────────────────────
async function checkUrgentTickets() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    // Tickets still open/pending where ETA is within the next 24 hours
    const urgent = db.prepare(`
      SELECT id, ticket_ref, user_id, user_email, issue_type, subject, eta_at, created_at
      FROM support_tickets
      WHERE status IN ('open') AND eta_at IS NOT NULL AND eta_at <= ?
      ORDER BY eta_at ASC
    `).all(in24h);

    if (urgent.length === 0) return;

    const lines = urgent.map(t =>
      `• [${t.ticket_ref}] ${t.issue_type} — "${t.subject}"\n  User: ${t.user_email || t.user_id}\n  ETA: ${new Date(t.eta_at).toDateString()}`
    ).join('\n\n');

    await sendEmail(SUPPORT_EMAIL,
      `⚠️ ${urgent.length} support ticket${urgent.length > 1 ? 's' : ''} approaching SLA deadline`,
      `The following open ticket${urgent.length > 1 ? 's are' : ' is'} due within 24 hours and need your attention:\n\n${lines}\n\n` +
      `View all tickets: http://localhost:${3333}/support-admin.html`
    );
    console.log(`[AF] ⚠️ Urgent ticket email sent — ${urgent.length} ticket(s) near SLA`);
  } catch (e) {
    console.error('[AF] Urgent ticket check error:', e.message);
  }
}

// Run urgent check once on startup (after 30s) then every 12 hours
setTimeout(() => { checkUrgentTickets(); setInterval(checkUrgentTickets, 12 * 60 * 60 * 1000); }, 30_000);

// ─── Stuck task watchdog — runs every 2 minutes ───────────────────────────────
// If a task has been 'running' for more than 10 minutes, auto-fail and refund.
const STUCK_TIMEOUT_MS = 10 * 60 * 1000;
setInterval(() => {
  const cutoff = new Date(Date.now() - STUCK_TIMEOUT_MS).toISOString();
  const stuckTasks = db.prepare(`
    SELECT id, title, agreed_bid FROM tasks
    WHERE status = 'running' AND hired_at < ? AND hired_at IS NOT NULL
  `).all(cutoff);
  for (const t of stuckTasks) {
    console.warn(`[AF] ⚠ Stuck task ${t.id} ("${t.title}") — auto-failing after 10min, refunding ⚡${t.agreed_bid}`);
    try { refundEscrow(t.id); } catch {}
    updateTask(t.id, { status:'error', error:'Agent did not respond within 10 minutes — your credits have been refunded.' });
  }
}, 2 * 60 * 1000);

// ─── Orphaned escrow cleanup — runs every 5 minutes ─────────────────────────
// Tasks that landed in error/cancelled without going through the normal refund
// path end up with a still-locked escrow record. Find and fix them.
setInterval(() => {
  const orphans = db.prepare(`
    SELECT e.task_id, e.user_id, e.amount FROM escrow e
    JOIN tasks t ON e.task_id = t.id
    WHERE e.status = 'locked' AND t.status IN ('error', 'cancelled')
  `).all();
  for (const o of orphans) {
    console.warn(`[AF] 🧹 Orphaned escrow on ${o.task_id} — refunding ⚡${o.amount} to ${o.user_id}`);
    try { refundEscrow(o.task_id); } catch {}
  }
}, 5 * 60 * 1000);

// ─── Awaiting-selection watchdog — runs every 5 minutes ──────────────────────
// selectionTimers are in-memory; a server restart loses them. This sweep catches
// any tasks that are still awaiting_selection past the 30-minute window.
const SELECTION_WINDOW_MS = 30 * 60 * 1000;
function sweepStuckSelections() {
  const cutoff = new Date(Date.now() - SELECTION_WINDOW_MS).toISOString();
  const stuck = db.prepare(`
    SELECT id, title, agreed_bid FROM tasks
    WHERE status = 'awaiting_selection' AND created_at < ?
  `).all(cutoff);
  for (const t of stuck) {
    // Clear any in-memory timer if still present
    const h = selectionTimers.get(t.id);
    if (h) { clearTimeout(h); selectionTimers.delete(t.id); }
    console.warn(`[AF] ⚠ Selection expired: ${t.id} ("${t.title}") — refunding ⚡${t.agreed_bid}`);
    try { refundEscrow(t.id); } catch {}
    updateTask(t.id, { status: 'cancelled', error: 'Selection window expired — credits refunded.' });
  }
}
// Run immediately on startup to recover tasks stuck across restarts, then every 5 min
sweepStuckSelections();
setInterval(sweepStuckSelections, 5 * 60 * 1000);

// ─── Feedback ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    mode       TEXT NOT NULL DEFAULT 'buyer',
    text       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL
  );
`);

// POST /api/feedback — submit feedback (authenticated)
app.post('/api/feedback', requireAuth(), (req, res) => {
  const { userId } = getAuth(req);
  const { text, mode } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO feedback (id, user_id, mode, text, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)`)
    .run(id, userId, mode || 'buyer', text.trim(), now);
  res.json({ ok: true, id });
});

// GET /api/feedback — get own feedback history
app.get('/api/feedback', requireAuth(), (req, res) => {
  const { userId } = getAuth(req);
  const rows = db.prepare(`SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
  res.json(rows);
});

// GET /api/admin/feedback — all feedback (admin only)
app.get('/api/admin/feedback', requireAuth(), (req, res) => {
  const { userId } = getAuth(req);
  if (userId !== ADMIN_USER_ID) return res.status(403).json({ error: 'forbidden' });
  const rows = db.prepare(`SELECT * FROM feedback ORDER BY created_at DESC`).all();
  res.json(rows);
});

// PATCH /api/admin/feedback/:id — mark status (admin only)
app.patch('/api/admin/feedback/:id', requireAuth(), (req, res) => {
  const { userId } = getAuth(req);
  if (userId !== ADMIN_USER_ID) return res.status(403).json({ error: 'forbidden' });
  const { status } = req.body;
  if (!['open','in_progress','done'].includes(status)) return res.status(400).json({ error: 'invalid status' });
  db.prepare(`UPDATE feedback SET status = ? WHERE id = ?`).run(status, req.params.id);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT = 3333;
server.listen(PORT, () => {
  if (!PLATFORM_KEY) {
    console.warn('\n⚠️  ANTHROPIC_API_KEY not set — built-in agents will fail');
    console.warn('   Set it in your environment: ANTHROPIC_API_KEY=sk-ant-...');
    console.warn('   External creator webhooks work fine without it\n');
  } else {
    console.log('\n✓  Platform API key loaded — built-in agents ready');
  }
  console.log(`\n🤖 AgentFlow — Credit-powered Webhook Marketplace`);
  console.log(`   http://localhost:${PORT}/user.html`);
  console.log(`   http://localhost:${PORT}/creator.html`);
  console.log(`   http://localhost:${PORT}/wallet.html`);
  console.log(`   DB: agentflow.db`);
  console.log(`   WS: ws://localhost:${PORT}/runner?key=<agent-key>\n`);
});
