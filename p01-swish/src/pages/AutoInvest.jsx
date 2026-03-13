import { useState, useEffect, useCallback } from "react";
import { T } from "../tokens";
import { SEED_STOCKS } from "../data";
import Card from "../components/Card";
import Reveal from "../components/Reveal";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function AutoInvest({ dbUser, stocks, livePrices, refreshUser }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const base = import.meta.env.DEV ? "http://localhost:3001" : "";

  const fetchPlans = useCallback(async () => {
    if (!dbUser?.id) return;
    try {
      const res = await fetch(`${base}/api/dca/plans?userId=${dbUser.id}`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [dbUser?.id, base]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!symbol) { setError("Pick a stock"); return; }
    if (!amount || Number(amount) < 5) { setError("Minimum amount is $5"); return; }

    setCreating(true);
    try {
      const res = await fetch(`${base}/api/dca/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: dbUser.id,
          stockSymbol: symbol,
          amount: Number(amount),
          frequency,
          startDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create plan"); return; }
      setSuccess(`Auto-invest plan for ${symbol} created!`);
      setSymbol("");
      setAmount("");
      fetchPlans();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const handlePause = async (planId) => {
    try {
      await fetch(`${base}/api/dca/pause/${planId}`, { method: "PATCH" });
      fetchPlans();
    } catch { /* ignore */ }
  };

  const handleCancel = async (planId) => {
    try {
      await fetch(`${base}/api/dca/cancel/${planId}`, { method: "DELETE" });
      fetchPlans();
    } catch { /* ignore */ }
  };

  const freqLabel = (f) => FREQUENCIES.find(x => x.value === f)?.label || f;

  const getPrice = (ticker) => {
    const live = livePrices?.[ticker];
    if (live) return live;
    const seed = (stocks || SEED_STOCKS).find(s => s.ticker === ticker);
    return seed?.price ?? 0;
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-1.2px", color: T.ink, marginBottom: "8px" }}>
            Auto-Invest
          </h1>
          <p style={{ color: T.inkSub, fontSize: "15px", lineHeight: 1.6 }}>
            Invest a little, every week! Set up a plan and we'll automatically buy shares for you on schedule. This is called <strong>Dollar Cost Averaging (DCA)</strong> — one of the smartest strategies in investing.
          </p>
        </div>
      </Reveal>

      {/* Create Plan Form */}
      <Reveal delay={70}>
        <Card style={{ padding: "32px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.4px", color: T.ink, marginBottom: "20px" }}>
            New Auto-Invest Plan
          </h2>

          <form onSubmit={handleCreate}>
            {/* Stock Picker */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.inkFaint, marginBottom: "6px" }}>
                Stock
              </label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "10px",
                  border: `1px solid ${T.line}`, fontSize: "14px", fontFamily: "inherit",
                  background: T.white, color: T.ink, cursor: "pointer",
                  appearance: "none", WebkitAppearance: "none",
                }}
              >
                <option value="">Choose a stock...</option>
                {SEED_STOCKS.map(s => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} — {s.name} (${getPrice(s.ticker).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.inkFaint, marginBottom: "6px" }}>
                Amount per purchase ($5 minimum)
              </label>
              <input
                type="number"
                min="5"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 25"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "10px",
                  border: `1px solid ${T.line}`, fontSize: "14px", fontFamily: "inherit",
                  background: T.white, color: T.ink,
                }}
              />
            </div>

            {/* Frequency */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.inkFaint, marginBottom: "6px" }}>
                Frequency
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {FREQUENCIES.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "10px", border: "none",
                      fontSize: "13px", fontWeight: 600, cursor: "pointer",
                      fontFamily: "inherit", transition: "all .15s ease",
                      background: frequency === f.value ? T.accent : T.bg,
                      color: frequency === f.value ? T.white : T.inkSub,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Date */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.inkFaint, marginBottom: "6px" }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "10px",
                  border: `1px solid ${T.line}`, fontSize: "14px", fontFamily: "inherit",
                  background: T.white, color: T.ink,
                }}
              />
            </div>

            {error && (
              <div style={{ color: T.red, fontSize: "13px", fontWeight: 500, marginBottom: "12px" }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ color: T.green, fontSize: "13px", fontWeight: 500, marginBottom: "12px" }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                cursor: creating ? "default" : "pointer",
                background: T.accent, color: T.white,
                fontWeight: 600, fontSize: "15px", fontFamily: "inherit",
                opacity: creating ? 0.6 : 1,
                transition: "opacity .15s ease",
              }}
            >
              {creating ? "Creating..." : "Start Auto-Investing"}
            </button>
          </form>
        </Card>
      </Reveal>

      {/* Active Plans */}
      <Reveal delay={140}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.5px", color: T.ink, marginBottom: "16px" }}>
          Your Plans
        </h2>

        {loading ? (
          <Card style={{ padding: "32px", textAlign: "center" }}>
            <div style={{ color: T.inkFaint, fontSize: "14px" }}>Loading plans...</div>
          </Card>
        ) : plans.length === 0 ? (
          <Card style={{ padding: "40px 28px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔄</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: T.ink, marginBottom: "6px" }}>
              No auto-invest plans yet
            </div>
            <div style={{ color: T.inkSub, fontSize: "14px", lineHeight: 1.5 }}>
              Create your first plan above to start investing on autopilot!
            </div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {plans.map(plan => {
              const price = getPrice(plan.stock_symbol);
              const sharesPerBuy = price > 0 ? (plan.amount / price).toFixed(4) : "—";
              const isActive = plan.status === "active";
              const isPaused = plan.status === "paused";

              return (
                <Card key={plan.id} style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: T.ink }}>
                          {plan.stock_symbol}
                        </span>
                        <span style={{
                          fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em",
                          padding: "3px 8px", borderRadius: "6px",
                          background: isActive ? T.greenBg : isPaused ? "#fff7ed" : T.redBg,
                          color: isActive ? T.green : isPaused ? T.amber : T.red,
                        }}>
                          {plan.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: T.inkSub, lineHeight: 1.5 }}>
                        <strong>${plan.amount}</strong> {freqLabel(plan.frequency).toLowerCase()} (~{sharesPerBuy} shares)
                      </div>
                      <div style={{ fontSize: "12px", color: T.inkFaint, marginTop: "4px" }}>
                        Next: {plan.next_run_date}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handlePause(plan.id)}
                        style={{
                          padding: "8px 14px", borderRadius: "8px", border: "none",
                          fontSize: "12px", fontWeight: 600, cursor: "pointer",
                          fontFamily: "inherit",
                          background: T.bg, color: T.inkSub,
                          transition: "opacity .15s ease",
                        }}
                      >
                        {isPaused ? "Resume" : "Pause"}
                      </button>
                      <button
                        onClick={() => handleCancel(plan.id)}
                        style={{
                          padding: "8px 14px", borderRadius: "8px", border: "none",
                          fontSize: "12px", fontWeight: 600, cursor: "pointer",
                          fontFamily: "inherit",
                          background: T.redBg, color: T.red,
                          transition: "opacity .15s ease",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Reveal>

      {/* DCA Explainer */}
      <Reveal delay={210}>
        <Card style={{ padding: "28px", marginTop: "24px", background: T.bg, boxShadow: "none" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: T.ink, marginBottom: "10px" }}>
            Why Auto-Invest?
          </h3>
          <div style={{ fontSize: "13px", color: T.inkSub, lineHeight: 1.7 }}>
            <p style={{ marginBottom: "8px" }}>
              <strong>Dollar Cost Averaging (DCA)</strong> means investing the same amount on a regular schedule — no matter what the price is.
            </p>
            <p style={{ marginBottom: "8px" }}>
              When prices are low, your money buys more shares. When prices are high, it buys fewer. Over time, this averages out to a lower cost per share than trying to time the market.
            </p>
            <p>
              Most professional investors agree: <strong>steady investing beats waiting for the "perfect moment."</strong>
            </p>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
