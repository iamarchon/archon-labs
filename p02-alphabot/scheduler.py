"""
scheduler.py — AlphaBot market clock and async scheduler.

Determines the current trading mode based on Eastern Time:
  MARKET_OPEN   — weekdays 09:30–16:00 ET  (stocks)
  AFTER_HOURS   — weekdays 16:00–20:00 ET  (Claude-gated)
  CRYPTO_ONLY   — weekdays 20:00–09:30 ET  (overnight crypto)
  WEEKEND       — Saturday & Sunday        (crypto only, wider holds)

Logs current mode every 5 minutes. Dispatches mode-specific scan hooks
once they are wired in later sessions.
"""

import asyncio
import logging
from datetime import time
from enum import Enum, auto
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

ET = ZoneInfo("America/New_York")

# ---------------------------------------------------------------------------
# Trading modes
# ---------------------------------------------------------------------------

class TradingMode(Enum):
    MARKET_OPEN = auto()    # 09:30–16:00 ET weekdays
    AFTER_HOURS = auto()    # 16:00–20:00 ET weekdays
    CRYPTO_ONLY = auto()    # 20:00–09:30 ET weekdays
    WEEKEND = auto()        # Saturday & Sunday


# Market hours (ET, exclusive of endpoints)
_MARKET_OPEN_START  = time(9, 30)
_MARKET_OPEN_END    = time(16, 0)
_AFTER_HOURS_END    = time(20, 0)


def get_current_mode() -> TradingMode:
    """Return the trading mode for the current moment in Eastern Time."""
    from datetime import datetime
    now = datetime.now(tz=ET)
    weekday = now.weekday()  # 0=Mon … 6=Sun

    if weekday >= 5:
        return TradingMode.WEEKEND

    t = now.time()

    if _MARKET_OPEN_START <= t < _MARKET_OPEN_END:
        return TradingMode.MARKET_OPEN

    if _MARKET_OPEN_END <= t < _AFTER_HOURS_END:
        return TradingMode.AFTER_HOURS

    # Outside 09:30–20:00 on a weekday → overnight crypto window
    return TradingMode.CRYPTO_ONLY


# ---------------------------------------------------------------------------
# Scheduled jobs
# ---------------------------------------------------------------------------

def _log_mode() -> None:
    """Log the current trading mode. Fires every 5 minutes."""
    mode = get_current_mode()
    logger.info("[scheduler] Current mode: %s", mode.name)


async def _dispatch_mode(mode: TradingMode) -> None:
    """
    Hook called on each scheduler tick with the resolved mode.
    Scanners and the Claude reasoner will be wired in here in Sessions 2–3.
    """
    if mode == TradingMode.MARKET_OPEN:
        logger.debug("[scheduler] Dispatch → day scanner (stub)")
    elif mode == TradingMode.AFTER_HOURS:
        logger.debug("[scheduler] Dispatch → after-hours evaluator (stub)")
    elif mode in (TradingMode.CRYPTO_ONLY, TradingMode.WEEKEND):
        logger.debug("[scheduler] Dispatch → crypto scanner (stub)")


async def _tick() -> None:
    """Single scheduler tick: resolve mode and dispatch."""
    mode = get_current_mode()
    await _dispatch_mode(mode)


# ---------------------------------------------------------------------------
# Scheduler lifecycle
# ---------------------------------------------------------------------------

def build_scheduler() -> AsyncIOScheduler:
    """
    Construct and configure the APScheduler instance.
    Call .start() after this returns.
    """
    scheduler = AsyncIOScheduler(timezone=ET)

    # Log current mode every 5 minutes
    scheduler.add_job(
        _log_mode,
        trigger="interval",
        minutes=5,
        id="log_mode",
        replace_existing=True,
    )

    # Main dispatch tick every 1 minute
    scheduler.add_job(
        _tick,
        trigger="interval",
        minutes=1,
        id="main_tick",
        replace_existing=True,
    )

    return scheduler


async def run() -> None:
    """
    Entry point for the scheduler loop.
    Logs two full clock cycles before returning (for manual testing).
    Runs indefinitely in production via asyncio.Event.
    """
    import config
    config.validate()

    scheduler = build_scheduler()
    scheduler.start()

    # Log mode immediately on startup
    _log_mode()

    stop_event = asyncio.Event()
    logger.info("[scheduler] Running — press Ctrl+C to stop")

    try:
        await stop_event.wait()
    except (KeyboardInterrupt, SystemExit):
        logger.info("[scheduler] Shutting down...")
    finally:
        scheduler.shutdown(wait=False)
        logger.info("[scheduler] Stopped")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    asyncio.run(run())
