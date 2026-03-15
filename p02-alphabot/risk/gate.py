"""
risk/gate.py — AlphaBot hard-rule risk gate.

The RiskGate class enforces all six non-negotiable trading rules.
It has zero dependency on Alpaca or any external service and is
fully unit-testable with plain Python dicts.

Rules:
  1. Max position size:   5% of account per trade
  2. Max open positions:  2 concurrent
  3. Daily loss limit:    15% of account — halts all trading for the day
  4. Stop loss required:  every order must carry a stop_loss price
  5. Bracket orders only: entry + stop + take_profit must all be present
  6. Paper mode default:  checked at gate level as a final safety reminder

Usage:
    gate = RiskGate(account_balance=100.0, daily_loss=0.0, open_positions=0)
    result = gate.evaluate(trade)
    if result["approved"]:
        # send to executor
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hard-coded limits — must match config.py constants
# ---------------------------------------------------------------------------

MAX_POSITION_PCT: float = 0.05        # 5%
MAX_OPEN_POSITIONS: int = 2
DAILY_LOSS_LIMIT_PCT: float = 0.15    # 15%
MIN_REWARD_RISK_RATIO: float = 2.0    # 2:1


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class GateResult:
    approved: bool
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {"approved": self.approved, "reason": self.reason}


# ---------------------------------------------------------------------------
# Risk gate
# ---------------------------------------------------------------------------

@dataclass
class RiskGate:
    """
    Stateful risk gate. Constructed fresh each evaluation cycle with the
    current account snapshot.

    Args:
        account_balance:  Current account equity in USD.
        daily_loss:       Total realised loss so far today (positive = loss).
        open_positions:   Number of currently open positions.
        paper:            Whether paper mode is active. Logs a warning if False.
    """

    account_balance: float
    daily_loss: float = 0.0
    open_positions: int = 0
    paper: bool = True
    _rule_log: list[str] = field(default_factory=list, repr=False)

    def evaluate(self, trade: dict[str, Any]) -> dict[str, Any]:
        """
        Evaluate a proposed trade against all hard rules.

        Args:
            trade: dict with keys:
                ticker       (str)   — symbol, e.g. "AAPL" or "BTC"
                entry        (float) — proposed entry price
                stop_loss    (float) — stop price (required)
                take_profit  (float) — target price (required)
                size_pct     (float) — fraction of account to risk, e.g. 0.05

        Returns:
            {"approved": bool, "reason": str}
        """
        self._rule_log.clear()

        # Convenience
        ticker     = trade.get("ticker", "UNKNOWN")
        entry      = trade.get("entry")
        stop_loss  = trade.get("stop_loss")
        take_profit = trade.get("take_profit")
        size_pct   = trade.get("size_pct", 0.0)

        # ── Rule 1: Max position size ──────────────────────────────────────
        if size_pct > MAX_POSITION_PCT:
            return self._reject(
                ticker,
                f"Position size {size_pct:.1%} exceeds max allowed {MAX_POSITION_PCT:.1%}",
            )

        # ── Rule 2: Max open positions ─────────────────────────────────────
        if self.open_positions >= MAX_OPEN_POSITIONS:
            return self._reject(
                ticker,
                f"Already at max open positions ({self.open_positions}/{MAX_OPEN_POSITIONS})",
            )

        # ── Rule 3: Daily loss limit ───────────────────────────────────────
        daily_loss_pct = self.daily_loss / self.account_balance if self.account_balance else 0.0
        if daily_loss_pct >= DAILY_LOSS_LIMIT_PCT:
            return self._reject(
                ticker,
                f"Daily loss limit hit ({daily_loss_pct:.1%} >= {DAILY_LOSS_LIMIT_PCT:.1%}) "
                f"— trading halted for the day",
            )

        # ── Rule 4: Stop loss required ─────────────────────────────────────
        if stop_loss is None:
            return self._reject(ticker, "No stop_loss provided — naked positions not allowed")

        if entry is not None and stop_loss >= entry:
            return self._reject(
                ticker,
                f"stop_loss ({stop_loss}) must be below entry ({entry}) for a long trade",
            )

        # ── Rule 5: Bracket order completeness ────────────────────────────
        if take_profit is None:
            return self._reject(ticker, "No take_profit provided — bracket orders required")

        if entry is not None and take_profit <= entry:
            return self._reject(
                ticker,
                f"take_profit ({take_profit}) must be above entry ({entry})",
            )

        # ── Rule 5b: Reward/risk ratio ─────────────────────────────────────
        if entry is not None and stop_loss is not None and take_profit is not None:
            risk   = entry - stop_loss
            reward = take_profit - entry
            if risk > 0:
                rr = reward / risk
                if rr < MIN_REWARD_RISK_RATIO:
                    return self._reject(
                        ticker,
                        f"R/R ratio {rr:.2f} below minimum {MIN_REWARD_RISK_RATIO:.1f}",
                    )

        # ── Rule 6: Paper mode reminder ────────────────────────────────────
        if not self.paper:
            logger.warning(
                "[gate] LIVE MODE — approving %s trade for %s (size %.1f%%)",
                trade.get("action", "UNKNOWN"),
                ticker,
                size_pct * 100,
            )

        return self._approve(ticker, size_pct)

    # -----------------------------------------------------------------------
    # Private helpers
    # -----------------------------------------------------------------------

    def _approve(self, ticker: str, size_pct: float) -> dict[str, Any]:
        reason = (
            f"All rules passed — {ticker} approved at {size_pct:.1%} position size"
        )
        logger.info("[gate] APPROVED  %s | %s", ticker, reason)
        return GateResult(approved=True, reason=reason).to_dict()

    def _reject(self, ticker: str, reason: str) -> dict[str, Any]:
        logger.warning("[gate] REJECTED  %s | %s", ticker, reason)
        return GateResult(approved=False, reason=reason).to_dict()
