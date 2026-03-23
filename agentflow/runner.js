#!/usr/bin/env node
/**
 * AgentFlow Local Runner
 * Connects your agent to AgentFlow via WebSocket — no public URL needed.
 *
 * Usage:
 *   node runner.js --key afk_xxx --api-key sk-xxx
 *   node runner.js --key afk_xxx --api-key sk-xxx --server ws://localhost:3333
 *
 * Environment variables:
 *   AGENTFLOW_KEY      agent key (afk_...)
 *   AGENTFLOW_SERVER   AgentFlow server URL (default: ws://localhost:3333)
 *
 *   LLM provider (pick one):
 *   LLM_PROVIDER       anthropic | openai | custom  (default: anthropic)
 *   LLM_API_KEY        your API key (also accepts ANTHROPIC_API_KEY or OPENAI_API_KEY)
 *   LLM_MODEL          model name override (e.g. gpt-4o, claude-sonnet-4-6, llama3)
 *   LLM_BASE_URL       base URL for openai-compatible or custom endpoints
 *                      (default for openai: https://api.openai.com)
 */

const WebSocket = require('ws');

// ─── CLI args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const AGENT_KEY   = getArg('--key')    || process.env.AGENTFLOW_KEY   || '';
const SERVER_URL  = getArg('--server') || process.env.AGENTFLOW_SERVER || 'ws://localhost:3333';
const HTTP_BASE   = SERVER_URL.replace(/^ws/, 'http').replace(/\/+$/, '');

// ─── LLM config ───────────────────────────────────────────────────────────
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
const API_KEY      = getArg('--api-key')
  || process.env.LLM_API_KEY
  || process.env.ANTHROPIC_API_KEY
  || process.env.OPENAI_API_KEY
  || process.env.GOOGLE_API_KEY
  || '';

// Default model per provider
const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-6',
  openai:    'gpt-4o',
  gemini:    'gemini-2.0-flash',
  custom:    'llama3',
};
const LLM_MODEL = process.env.LLM_MODEL || DEFAULT_MODELS[LLM_PROVIDER] || 'claude-sonnet-4-6';

// Base URLs — gemini exposes an OpenAI-compatible endpoint
const PROVIDER_BASE_URLS = {
  openai: 'https://api.openai.com',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
};
const LLM_BASE_URL = process.env.LLM_BASE_URL || PROVIDER_BASE_URLS[LLM_PROVIDER] || '';

if (!AGENT_KEY) { console.error('Error: --key required (or set AGENTFLOW_KEY)'); process.exit(1); }
if (!API_KEY)   { console.error('Error: LLM_API_KEY required (or set ANTHROPIC_API_KEY / OPENAI_API_KEY)'); process.exit(1); }

// ─── State ─────────────────────────────────────────────────────────────────
let agentInfo    = null;   // { agentId, name, emoji, role, systemPrompt, category }
let activeTasks  = new Set(); // taskIds currently running
let ws           = null;
let reconnectDelay = 1000;
const MAX_DELAY    = 30000;

// ─── Fetch agent info ───────────────────────────────────────────────────────
async function fetchAgentInfo() {
  const res = await fetch(`${HTTP_BASE}/api/runner/info?key=${AGENT_KEY}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch agent info: ${body.error || res.status}`);
  }
  return res.json();
}

// ─── Stream SSE response into chunks ────────────────────────────────────────
async function readSSEStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop(); // keep incomplete line
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        if (raw && raw !== '[DONE]') {
          try { onEvent(JSON.parse(raw)); } catch {}
        }
      }
    }
  }
}

// ─── Strip markdown code fence from LLM response ────────────────────────────
// Agents sometimes wrap output in ```html\n...\n``` — extract the actual code.
function stripMarkdownWrapper(text) {
  const matches = [...text.matchAll(/```[\w]*\n([\s\S]*?)```/g)];
  if (!matches.length) return text;
  return matches.reduce((a, b) => a[1].length > b[1].length ? a : b)[1].trim();
}

// ─── LLM API call — streams when onChunk provided, otherwise one-shot ────────
// onChunk(partialText, outputTokensSoFar) — called incrementally during streaming
async function callLLM(systemPrompt, userMsg, onChunk = null) {
  const useStream = !!onChunk;

  if (LLM_PROVIDER === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 4000,
        stream: useStream,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error?.message || `Anthropic API ${res.status}`);
    }

    if (!useStream) {
      const d = await res.json();
      const inputTokens  = d.usage?.input_tokens  || 0;
      const outputTokens = d.usage?.output_tokens || 0;
      return { text: d.content?.[0]?.text || '', tokens: inputTokens + outputTokens, inputTokens, outputTokens };
    }

    // Streaming
    let text = '', inputTokens = 0, outputTokens = 0;
    await readSSEStream(res, ev => {
      if (ev.type === 'message_start')       inputTokens  = ev.message?.usage?.input_tokens  || 0;
      if (ev.type === 'message_delta')       outputTokens = ev.usage?.output_tokens            || outputTokens;
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        text += ev.delta.text;
        outputTokens++;
        onChunk(text, outputTokens);
      }
    });
    return { text, tokens: inputTokens + outputTokens, inputTokens, outputTokens };
  }

  // OpenAI-compatible: openai | gemini | custom
  const base = LLM_BASE_URL;
  if (!base) throw new Error('LLM_BASE_URL required for custom provider (or set LLM_PROVIDER=openai/gemini)');
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 4000,
      stream: useStream,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `LLM API ${res.status}`);
  }

  if (!useStream) {
    const d = await res.json();
    const inputTokens  = d.usage?.prompt_tokens     || 0;
    const outputTokens = d.usage?.completion_tokens || 0;
    return { text: d.choices?.[0]?.message?.content || '', tokens: inputTokens + outputTokens, inputTokens, outputTokens };
  }

  // OpenAI streaming
  let text = '', inputTokens = 0, outputTokens = 0;
  await readSSEStream(res, ev => {
    const delta = ev.choices?.[0]?.delta?.content || '';
    if (delta) {
      text += delta;
      outputTokens += Math.ceil(delta.length / 4); // rough token estimate per chunk
      onChunk(text, outputTokens);
    }
    if (ev.usage) {
      inputTokens  = ev.usage.prompt_tokens     || inputTokens;
      outputTokens = ev.usage.completion_tokens || outputTokens;
    }
  });
  return { text, tokens: inputTokens + outputTokens, inputTokens, outputTokens };
}

// ─── Handle an incoming task ────────────────────────────────────────────────
async function handleTask(msg) {
  const { taskId, task, reward, callbackUrl } = msg;
  if (activeTasks.has(taskId)) return; // dedupe
  activeTasks.add(taskId);

  const sendProgress = (pct, log, tokens = 0) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'progress', taskId, pct, log, tokens }));
    }
  };

  const systemPrompt = agentInfo.systemPrompt ||
    `You are ${agentInfo.name}, an AI agent on the AgentFlow marketplace. Complete tasks thoroughly and return well-structured results.`;

  const userMsg = `TASK: ${task.title || '(untitled)'}\n\nDESCRIPTION:\n${task.description}\n\nREWARD: ⚡${reward} credits\n\nDeliver your best work.`;

  console.log(`[runner] → task ${taskId}: "${task.title || task.description?.slice(0, 60)}"`);
  sendProgress(3, '📋 Task received, reading requirements...', 0);

  try {
    let lastEmitAt = 0;
    sendProgress(8, `🧠 Calling ${LLM_PROVIDER}/${LLM_MODEL}...`, 0);

    const onChunk = (text, outputTokens) => {
      // Throttle to every 20 tokens to avoid flooding
      if (outputTokens - lastEmitAt >= 20) {
        lastEmitAt = outputTokens;
        const pct = Math.min(92, 12 + Math.floor(outputTokens / 18));
        sendProgress(pct, `✍️ Writing... (${outputTokens} tokens out)`, outputTokens);
      }
    };

    const result = await callLLM(systemPrompt, userMsg, onChunk);
    const deliverable = stripMarkdownWrapper(result.text);
    sendProgress(98, `✓ Complete — ${result.inputTokens}in + ${result.outputTokens}out tokens`, result.tokens);

    // Send raw LLM I/O to server for creator logs
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'task_log', taskId,
        systemPrompt, userMessage: userMsg, response: result.text,
        llmModel: LLM_MODEL, llmProvider: LLM_PROVIDER,
        inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      }));
    }

    await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status: 'done', deliverable, tokens: result.tokens, input_tokens: result.inputTokens, output_tokens: result.outputTokens, llm_model: LLM_MODEL, llm_provider: LLM_PROVIDER }),
    });
    console.log(`[runner] ✓ done ${taskId} | ${result.inputTokens}in + ${result.outputTokens}out tokens | ${LLM_PROVIDER}/${LLM_MODEL}`);
  } catch (err) {
    console.error(`[runner] ✗ error ${taskId}: ${err.message}`);
    sendProgress(0, `✗ Error: ${err.message}`, 0);
    await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status: 'error', error: err.message }),
    }).catch(() => {});
  } finally {
    activeTasks.delete(taskId);
  }
}

// ─── Bid handler ────────────────────────────────────────────────────────────
// Calls Claude to evaluate the task and decide whether to bid and at what price.
async function handleBidRequest(msg) {
  const { taskId, task, maxBudget, complexity } = msg;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const floor = agentInfo.minCredits || 50;
  const systemPrompt = agentInfo.systemPrompt ||
    `You are ${agentInfo.name}, an AI agent specialising in ${agentInfo.category || 'general'} tasks.`;

  const bidPrompt =
`Agent: ${agentInfo.name} — ${agentInfo.role || ''} (speciality: ${agentInfo.category || 'general'})
Task title: ${task?.title || '(untitled)'}
Task description: ${(task?.description || '').slice(0, 500)}
Complexity: ${complexity || 'unknown'}
Max budget: ⚡${maxBudget} | Your minimum: ⚡${floor}

Should you bid on this task? Only bid if it fits your speciality.
If yes, set a competitive price between ⚡${floor} and ⚡${maxBudget} based on complexity.
Reply JSON only: {"bid":true,"amount":140} or {"bid":false}`;

  try {
    const result = await callLLM(
      'You are a pricing agent. Respond with JSON only — no extra text.',
      bidPrompt
    );
    const match = result.text.match(/\{[^}]+\}/);
    if (!match) throw new Error('no JSON in response');
    const decision = JSON.parse(match[0]);

    if (!decision.bid) {
      console.log(`[runner] pass on task ${taskId} (out of scope)`);
      ws.send(JSON.stringify({ type: 'bid', taskId, bidAmount: null })); // decline
      return;
    }

    const amount = Math.max(floor, Math.min(Math.round(decision.amount), maxBudget));
    ws.send(JSON.stringify({ type: 'bid', taskId, bidAmount: amount }));
    console.log(`[runner] bid ⚡${amount} for task ${taskId} (max ⚡${maxBudget})`);
  } catch (err) {
    // Fallback to 75% if Claude fails
    const fallback = Math.max(floor, Math.round((maxBudget * 0.75) / 5) * 5);
    ws.send(JSON.stringify({ type: 'bid', taskId, bidAmount: fallback }));
    console.warn(`[runner] bid fallback ⚡${fallback} for task ${taskId} (${err.message})`);
  }
}

// ─── WebSocket connection ────────────────────────────────────────────────────
function connect() {
  const wsUrl = `${SERVER_URL.replace(/\/$/, '')}/runner?key=${AGENT_KEY}`;
  console.log(`[runner] connecting to ${wsUrl}`);
  ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    reconnectDelay = 1000;
    console.log(`[runner] ✓ connected as ${agentInfo.emoji} ${agentInfo.name} (${agentInfo.agentId})`);
  });

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'connected') {
      console.log(`[runner] ready — waiting for tasks`);
    } else if (msg.type === 'task') {
      handleTask(msg); // fire and forget
    } else if (msg.type === 'bid_request') {
      handleBidRequest(msg).catch(err => console.error(`[runner] bid error: ${err.message}`));
    } else if (msg.type === 'pong') {
      // heartbeat reply — no-op
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[runner] disconnected (${code} ${reason || ''}) — reconnecting in ${reconnectDelay / 1000}s`);
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
  });

  ws.on('error', err => {
    console.error(`[runner] ws error: ${err.message}`);
  });
}

// Keepalive ping every 25s
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 25_000);

// ─── Main ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🤖 AgentFlow Local Runner`);
  try {
    agentInfo = await fetchAgentInfo();
    console.log(`   Agent : ${agentInfo.emoji} ${agentInfo.name} (${agentInfo.agentId})`);
    console.log(`   Server: ${HTTP_BASE}`);
    console.log(`   LLM   : ${LLM_PROVIDER} / ${LLM_MODEL}\n`);
    connect();
  } catch (err) {
    console.error(`[runner] startup failed: ${err.message}`);
    process.exit(1);
  }
})();
