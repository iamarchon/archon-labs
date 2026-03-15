"""
config.py — AlphaBot configuration loader.

Reads all required env vars from .env on startup and validates them.
Fails loudly with a clear error if any required key is missing.
PAPER=true is the enforced default — live trading requires explicit override.
"""

import os
import logging
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _require(key: str) -> str:
    """Return env var value or raise immediately with a clear message."""
    value = os.getenv(key, "").strip()
    if not value:
        raise EnvironmentError(
            f"[config] Required environment variable '{key}' is missing or empty. "
            f"Copy .env.template to .env and set all required values."
        )
    return value


def _bool_env(key: str, default: bool) -> bool:
    raw = os.getenv(key, str(default)).strip().lower()
    return raw in ("true", "1", "yes")


# ---------------------------------------------------------------------------
# API credentials
# ---------------------------------------------------------------------------

ALPACA_KEY: str = _require("ALPACA_KEY")
ALPACA_SECRET: str = _require("ALPACA_SECRET")
ALPACA_BASE_URL: str = os.getenv(
    "ALPACA_BASE_URL", "https://paper-api.alpaca.markets"
).strip()

ANTHROPIC_KEY: str = _require("ANTHROPIC_KEY")

# ---------------------------------------------------------------------------
# Trading mode
# ---------------------------------------------------------------------------

PAPER: bool = _bool_env("PAPER", default=True)

if not PAPER:
    logger.warning(
        "[config] *** LIVE TRADING MODE ACTIVE — real money at risk ***"
    )
else:
    logger.info("[config] Paper trading mode active (PAPER=true)")

# ---------------------------------------------------------------------------
# Capital & risk parameters (sourced from .env, with safe defaults)
# ---------------------------------------------------------------------------

STARTING_CAPITAL: Decimal = Decimal(
    os.getenv("STARTING_CAPITAL", "100.00").strip()
)

# These match the hard rules in risk/gate.py — kept here as single source of truth
MAX_POSITION_PCT: float = 0.05       # 5% of account per trade
MAX_OPEN_POSITIONS: int = 2
DAILY_LOSS_LIMIT_PCT: float = 0.15   # 15% daily drawdown halts trading
MIN_REWARD_RISK_RATIO: float = 2.0   # 2:1 R/R minimum

# ---------------------------------------------------------------------------
# Claude model
# ---------------------------------------------------------------------------

CLAUDE_MODEL: str = "claude-sonnet-4-6"
CLAUDE_TIMEOUT_SECONDS: int = 30

# ---------------------------------------------------------------------------
# Startup validation summary
# ---------------------------------------------------------------------------

def validate() -> None:
    """Re-check all required config at startup and log a summary."""
    required_keys = {
        "ALPACA_KEY": ALPACA_KEY,
        "ALPACA_SECRET": ALPACA_SECRET,
        "ANTHROPIC_KEY": ANTHROPIC_KEY,
    }
    missing = [k for k, v in required_keys.items() if not v]
    if missing:
        raise EnvironmentError(
            f"[config] Startup validation failed. Missing keys: {missing}"
        )

    logger.info(
        "[config] Validated — paper=%s, capital=$%s, max_pos=%.0f%%, "
        "daily_loss_limit=%.0f%%, max_open=%d",
        PAPER,
        STARTING_CAPITAL,
        MAX_POSITION_PCT * 100,
        DAILY_LOSS_LIMIT_PCT * 100,
        MAX_OPEN_POSITIONS,
    )
