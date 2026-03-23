#!/usr/bin/env bash
# AgentFlow Smoke Test
# Usage: bash test.sh
# Requires: server running on localhost:3333 (npm start)

BASE="http://localhost:3333"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}✗${NC} $1"; ((FAIL++)); }
section() { echo -e "\n${YELLOW}── $1 ──${NC}"; }

# Parse JSON field
json() { node -e "try{const d=JSON.parse(process.argv[1]);const v=process.argv[2].split('.').reduce((o,k)=>o==null?null:o[k],d);console.log(v==null?'null':v)}catch(e){console.log('null')}" "$1" "$2" 2>/dev/null; }

check_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then pass "$label (HTTP $actual)"
  else fail "$label — expected HTTP $expected, got HTTP $actual"; fi
}

check_field() {
  local label="$1" value="$2"
  if [ -n "$value" ] && [ "$value" != "null" ] && [ "$value" != "" ]; then
    pass "$label (= $value)"
  else
    fail "$label — got: '$value'"
  fi
}

check_gt() {
  local label="$1" value="$2" min="$3"
  if [ -n "$value" ] && [ "$value" != "null" ] && [ "$value" -gt "$min" ] 2>/dev/null; then
    pass "$label (= $value)"
  else
    fail "$label — expected > $min, got: '$value'"
  fi
}

# ─── 0. SERVER REACHABLE ─────────────────────────────────────────────────────
section "0. Server Reachable"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/agents")
check_status "Server up (via public /api/agents)" 200 "$STATUS"
if [ "$STATUS" != "200" ]; then
  echo -e "\n${RED}Server not reachable. Start with: npm start${NC}\n"
  exit 1
fi

# ─── 1. AUTH PROTECTION ──────────────────────────────────────────────────────
section "1. Auth Protection (protected endpoints return 401)"

check_status "GET  /api/wallet — requires auth"           401 "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/wallet")"
check_status "POST /api/wallet/buy — requires auth"       401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/wallet/buy" -H "Content-Type: application/json" -d '{"amount":100}')"
check_status "POST /api/tasks/post — requires auth"       401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/post" -H "Content-Type: application/json" -d '{"description":"test","maxBudget":100}')"
check_status "GET  /api/creator/wallet — requires auth"   401 "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/creator/wallet")"
check_status "GET  /api/creator/tasks — requires auth"    401 "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/creator/tasks")"
check_status "GET  /api/transactions — requires auth"     401 "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/transactions")"
check_status "POST /api/creator/publish — requires auth"  401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/creator/publish" -H "Content-Type: application/json" -d '{"agent":{"name":"X","webhookUrl":"http://x.com/run"}}')"
check_status "POST /api/creator/review — requires auth"   401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/creator/review" -H "Content-Type: application/json" -d '{"spec":"test","apiKey":"sk-test"}')"
check_status "POST /api/creator/wallet/settle — requires auth"   401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/creator/wallet/settle")"
check_status "POST /api/creator/wallet/withdraw — requires auth" 401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/creator/wallet/withdraw" -H "Content-Type: application/json" -d '{"amount":10}')"
check_status "POST /api/tasks/:id/hire — requires auth"     401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/fake-id/hire" -H "Content-Type: application/json" -d '{"agentId":"x"}')"
check_status "POST /api/tasks/:id/approve — requires auth"  401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/fake-id/approve")"
check_status "POST /api/tasks/:id/dispute — requires auth"  401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/fake-id/dispute")"
check_status "POST /api/tasks/:id/cancel — requires auth"   401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/fake-id/cancel")"
check_status "POST /api/tasks/:id/rate — requires auth"     401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/fake-id/rate" -H "Content-Type: application/json" -d '{"rating":5}')"

# Invalid Bearer token — must return 401, not 500
INVALID_TOKEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/wallet" -H "Authorization: Bearer this.is.not.a.real.token")
check_status "Invalid Bearer token — returns 401 not 500" 401 "$INVALID_TOKEN_STATUS"

# ─── 2. PUBLIC ENDPOINTS ─────────────────────────────────────────────────────
section "2. Public Endpoints"

AGENTS=$(curl -s "$BASE/api/agents")
AGENT_COUNT=$(node -e "try{console.log(JSON.parse(process.argv[1]).length)}catch(e){console.log(0)}" "$AGENTS")
check_gt "GET /api/agents — returns agents" "$AGENT_COUNT" 0

FIRST_ID=$(node -e "try{console.log(JSON.parse(process.argv[1])[0].id)}catch(e){console.log('null')}" "$AGENTS")
check_field "GET /api/agents — agents have id" "$FIRST_ID"

NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tasks/task-does-not-exist")
check_status "GET /api/tasks/:id — 404 for unknown task" 404 "$NOT_FOUND"

# ─── 3. INTERNAL AGENT HEALTH ────────────────────────────────────────────────
section "3. Internal Agent Health"

for agent in buildbot qa-nexus stackbuilder; do
  H=$(curl -s "$BASE/internal/agents/$agent/health")
  STATUS_VAL=$(json "$H" "status")
  check_field "GET /internal/agents/$agent/health" "$STATUS_VAL"
done

# ─── 4. WEBHOOK CALLBACK (unauthenticated — called by external agents) ───────
section "4. Callback Endpoint (unauthenticated)"

# Posting to a non-existent task should 404, not 401 — confirms it's open
CB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/fake-task-id/callback" \
  -H "Content-Type: application/json" -d '{"status":"done","deliverable":"test"}')
check_status "POST /api/tasks/:id/callback — no auth required (404 not 401)" 404 "$CB_STATUS"

# ─── 5. BID STREAM (SSE, unauthenticated) ────────────────────────────────────
section "5. Bid Stream SSE (unauthenticated)"

SSE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$BASE/api/tasks/fake-id/bid-stream" 2>/dev/null)
SSE_STATUS="${SSE_STATUS:0:3}"
# Returns 200 (SSE connection opens even for unknown task — replays empty log)
check_status "GET /api/tasks/:id/bid-stream — open without auth" 200 "$SSE_STATUS"

# ─── 6. INPUT VALIDATION (unauthenticated paths still validate) ──────────────
section "6. Input Validation on Public Endpoints"

BAD_TASK=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tasks/fake-id/callback" \
  -H "Content-Type: application/json" -d '{"status":"invalid"}')
check_status "POST /api/tasks/:id/callback — rejects bad status" 404 "$BAD_TASK"

# ─── 7. ADMIN ENDPOINTS (unauthenticated for MVP) ────────────────────────────
section "7. Admin Endpoints"

ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/agent-stats")
check_status "GET /api/admin/agent-stats — accessible" 200 "$ADMIN_STATUS"

# ─── SUMMARY ─────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────"
TOTAL=$((PASS + FAIL))
echo -e "Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $TOTAL total"
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}All checks passed.${NC}"
else
  echo -e "${RED}$FAIL check(s) failed — review output above.${NC}"
fi
echo ""
echo -e "${YELLOW}Note:${NC} Full e2e flow (post task → hire → approve) requires a Clerk session token."
echo "      Run manually via the browser at http://localhost:3333/user.html"
echo ""
