#!/usr/bin/env node
/**
 * AgentFlow Dev Setup
 * Seeds two test agents directly into the local DB, generates runner keys,
 * and writes .env files for each agent. No auth or listing deposit required.
 *
 * Usage: node agents/setup.js
 *
 * Prerequisites: AgentFlow server does NOT need to be running.
 */

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const os     = require('os');

// ── DB ──────────────────────────────────────────────────────────────────────
const Database = require('better-sqlite3');
const DB_PATH  = path.join(__dirname, '..', 'agentflow.db');
if (!fs.existsSync(DB_PATH)) {
  console.error(`ERROR: DB not found at ${DB_PATH}`);
  console.error('Run the AgentFlow server at least once to create the DB first.');
  process.exit(1);
}
const db = new Database(DB_PATH);

// ── Machine / location detection ─────────────────────────────────────────────
const PLATFORM_NAME = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' }[process.platform] || process.platform;
const ARCH_NAME     = { arm64: 'Apple Silicon', x64: 'x64', arm: 'ARM' }[process.arch] || process.arch;
const RAM_GB        = Math.round(os.totalmem() / (1024 ** 3));
const CPU_MODEL     = os.cpus()[0]?.model?.replace(/\s+/g, ' ').trim() || 'Unknown CPU';

const AGENT_LOCATION = process.env.AGENT_LOCATION
  ? JSON.parse(process.env.AGENT_LOCATION)
  : { city: 'Local', country: PLATFORM_NAME, flag: '🖥️' };

const COMPUTE_STR = process.env.AGENT_COMPUTE
  || `${CPU_MODEL.split(' ').slice(0,4).join(' ')} · ${RAM_GB}GB RAM · ${PLATFORM_NAME} ${ARCH_NAME} · Local Runner`;

// ── Agent definitions ────────────────────────────────────────────────────────
const CREATOR_ID = process.env.CREATOR_ID || 'dev-creator-local';

const AGENTS = [
  {
    id:          'stackbuilder-pro-local',
    name:        'StackBuilder Pro',
    emoji:       '🏗️',
    role:        'Full-Stack Builder',
    category:    'build',
    description: 'Opinionated full-stack engineer. Ships complete, production-ready code with clear architecture decisions, folder structure, and setup instructions. Prefers React + Node.js + SQLite for web apps, adds error handling and comments throughout.',
    minCredits:  120,
    tags:        ['react', 'node', 'full-stack', 'production-ready'],
    systemPrompt:`You are StackBuilder Pro, an expert full-stack software engineer specialising in building complete, production-ready web applications.

IMPORTANT — before writing any code:
- If the task description is vague (missing tech stack, domain, acceptance criteria, or under 20 words), start your response with a clearly labelled "## Assumptions" section listing every decision you made. Example: "Assumed React + Node.js stack. Assumed todo items need persistence. Assumed mobile-responsive layout."
- If the task is specific, skip the assumptions section and go straight to the work.

Your approach:
- Always start with a clear folder structure and architecture overview
- Write complete, runnable code — no pseudocode or placeholders
- Use React + Vite for frontend, Node.js + Express for backend, SQLite for persistence unless specified otherwise
- Add proper error handling, loading states, and comments
- Include a concise setup guide at the end (npm install, env vars, run command)
- Format your response with clear sections: Assumptions (if needed), Architecture, Code, Setup

Output style: Markdown with fenced code blocks. Be thorough but not verbose.`,
  },
  {
    id:          'quickbuild-local',
    name:        'QuickBuild',
    emoji:       '⚡',
    role:        'Rapid Prototyper',
    category:    'build',
    description: 'Speed-first prototyper. Gets you to a working MVP in minutes. Minimal dependencies, single-file solutions where possible, zero boilerplate. Great for proofs-of-concept and hackathon projects.',
    minCredits:  70,
    tags:        ['minimal', 'mvp', 'fast', 'prototype'],
    systemPrompt:`You are QuickBuild, a rapid prototyping specialist who values speed and simplicity above all else.

Your philosophy:
- Ship working code FAST — no over-engineering
- Prefer single-file or minimal-file solutions
- Use vanilla JS where possible; reach for a framework only if clearly needed
- Zero unnecessary dependencies
- Inline styles over CSS files for quick prototypes
- Skip boilerplate — get straight to the working thing

IMPORTANT — before writing any code:
- If the task description is vague (missing context, under 20 words, no acceptance criteria), start your response with "## Assumptions" listing every decision you made. Example: "Assumed vanilla JS. Assumed no backend needed. Assumed dark theme."
- If the task is specific, skip the assumptions section and go straight to the work.

Output format:
1. Assumptions (only if task is vague)
2. One-line summary of what you're building
3. Code (as few files as possible)
4. One-line run instruction

If something can be done in 50 lines, don't write 200.`,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
// ── LLM config (from env — same vars the runner uses) ────────────────────────
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
const LLM_MODEL    = process.env.LLM_MODEL || ({ anthropic: 'claude-sonnet-4-6', openai: 'gpt-4o', gemini: 'gemini-2.0-flash' }[LLM_PROVIDER] || 'claude-sonnet-4-6');

function ensureColumns() {
  // Safe migrations in case DB was created before some columns were added
  const migrations = [
    `ALTER TABLE published_agents ADD COLUMN system_prompt TEXT`,
    `ALTER TABLE published_agents ADD COLUMN image_url TEXT`,
    `ALTER TABLE published_agents ADD COLUMN benchmark_status TEXT`,
    `ALTER TABLE published_agents ADD COLUMN benchmark_results TEXT`,
    `ALTER TABLE published_agents ADD COLUMN deposit_paid INTEGER DEFAULT 0`,
    `ALTER TABLE published_agents ADD COLUMN llm_model TEXT`,
    `ALTER TABLE published_agents ADD COLUMN llm_provider TEXT`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch {}
  }
}

function upsertAgent(a) {
  // Remove existing agent + key if re-running setup
  db.prepare(`DELETE FROM agent_keys WHERE agent_id = ?`).run(a.id);
  db.prepare(`DELETE FROM published_agents WHERE id = ?`).run(a.id);

  db.prepare(`
    INSERT INTO published_agents
      (id, name, emoji, role, category, tags, min_credits, rating, task_count,
       status, creator_name, creator_id, description, webhook_url, health_url,
       bid_url, bid_strategy, system_prompt, compute, response_ms, location,
       is_internal, deposit_paid, image_url, benchmark_status)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    a.id, a.name, a.emoji, a.role, a.category,
    JSON.stringify(a.tags), a.minCredits, 5.0, 0,
    'live',                                  // skip benchmark — go live directly
    'Local Dev', CREATOR_ID,
    a.description,
    null, null, null,                        // no webhook — local runner only
    JSON.stringify({ floor: a.minCredits, style: 'competitive' }),
    a.systemPrompt,
    COMPUTE_STR, 600, JSON.stringify(AGENT_LOCATION),
    0, 1, null,
    'skipped'                                // benchmark skipped for local dev
  );
  // Store LLM config so creator dashboard can show model + cost info
  db.prepare(`UPDATE published_agents SET llm_model = ?, llm_provider = ? WHERE id = ?`)
    .run(LLM_MODEL, LLM_PROVIDER, a.id);
}

function generateKey(agentId) {
  const key = 'afk_' + crypto.randomBytes(32).toString('hex');
  db.prepare(`DELETE FROM agent_keys WHERE agent_id = ?`).run(agentId);
  db.prepare(`INSERT INTO agent_keys (key, agent_id, created_at) VALUES (?, ?, ?)`)
    .run(key, agentId, new Date().toISOString());
  return key;
}

function writeEnv(dir, agentId, key) {
  const envPath = path.join(dir, '.env');
  const content = [
    `# Auto-generated by agents/setup.js`,
    `AGENTFLOW_KEY=${key}`,
    ``,
    `# LLM provider — pick one:`,
    `#   anthropic → set LLM_API_KEY to your Anthropic key`,
    `#   openai    → set LLM_API_KEY to your OpenAI key`,
    `#   gemini    → set LLM_API_KEY to your Google AI Studio key (GOOGLE_API_KEY also works)`,
    `#   custom    → set LLM_BASE_URL to any OpenAI-compatible endpoint`,
    `LLM_PROVIDER=anthropic`,
    `LLM_API_KEY=your-api-key-here`,
    `# LLM_MODEL=claude-sonnet-4-6        # optional — defaults: anthropic→claude-sonnet-4-6, openai→gpt-4o, gemini→gemini-2.0-flash`,
    `# LLM_BASE_URL=https://...           # required only for custom provider`,
    ``,
    `AGENTFLOW_SERVER=ws://localhost:3333`,
    ``,
  ].join('\n');
  fs.writeFileSync(envPath, content);
  return envPath;
}

function writeStartScript(dir, agentName) {
  const scriptPath = path.join(dir, 'start.js');
  const content = `#!/usr/bin/env node
// Start ${agentName} local runner
// Reads AGENTFLOW_KEY and ANTHROPIC_API_KEY from .env in this directory
require('dotenv').config({ path: __dirname + '/.env' });
process.env.AGENTFLOW_SERVER = process.env.AGENTFLOW_SERVER || 'ws://localhost:3333';
// Delegate to the shared runner
require(require('path').join(__dirname, '..', '..', 'runner.js'));
`;
  fs.writeFileSync(scriptPath, content);
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('\n🤖 AgentFlow Dev Setup\n');

ensureColumns();

const dirs = {
  'stackbuilder-pro-local': path.join(__dirname, 'stackbuilder-pro'),
  'quickbuild-local':        path.join(__dirname, 'quickbuild'),
};

const results = [];

for (const agent of AGENTS) {
  console.log(`Setting up: ${agent.emoji} ${agent.name} (${agent.id})`);

  upsertAgent(agent);
  const key = generateKey(agent.id);
  const dir = dirs[agent.id];

  const envPath   = writeEnv(dir, agent.id, key);
  writeStartScript(dir, agent.name);

  results.push({ agent, key, dir });

  console.log(`  ✓ Agent inserted — status: live`);
  console.log(`  ✓ Runner key:  ${key.slice(0, 16)}…`);
  console.log(`  ✓ .env written: ${envPath}\n`);
}

// ── Print next steps ─────────────────────────────────────────────────────────
console.log('─'.repeat(60));
console.log(`Machine:  ${COMPUTE_STR}`);
console.log(`Location: ${AGENT_LOCATION.flag} ${AGENT_LOCATION.city}, ${AGENT_LOCATION.country}`);
console.log(`LLM:      ${LLM_PROVIDER} / ${LLM_MODEL}\n`);
console.log('─'.repeat(60));
console.log('NEXT STEPS\n');
console.log('1. Fill in your LLM API key in each .env file:\n');
for (const { dir } of results) {
  console.log(`   ${path.join(dir, '.env')}`);
}
console.log(`\n2. Start the AgentFlow server (if not running):`);
console.log(`   node server.js\n`);
console.log(`3. Start both agent runners (in separate terminals):\n`);
for (const { agent, dir } of results) {
  console.log(`   # ${agent.emoji} ${agent.name}`);
  console.log(`   node ${path.join(dir, 'start.js')}\n`);
}
console.log(`4. Open http://localhost:3333/app.html`);
console.log(`   → Switch to Buyer mode → Post a "build" task`);
console.log(`   → Both agents will bid → pick one → approve the result\n`);
console.log(`CREATOR_ID used: ${CREATOR_ID}`);
console.log(`(To use your real account, re-run with: CREATOR_ID=<your-clerk-user-id> node agents/setup.js)\n`);
