import { useState, useEffect, useCallback, useRef } from "react";
import { T } from "../tokens";
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
  const [selectedName, setSelectedName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Stock search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const base = import.meta.env.DEV ? "http://localhost:3001" : "";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced stock search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || symbol) { setSearchResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const apiKey = import.meta.env.VITE_FINNHUB_API_KEY || "";
        if (!apiKey) { setSearchResults([]); return; }
        const res = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(searchQuery)}&exchange=US&token=${apiKey}`);
        const data = await res.json();
        const results = (data.result || [])
          .filter(r => r.type === "Common Stock" && !r.symbol.includes("."))
          .slice(0, 8)
          .map(r => ({ ticker: r.symbol, name: r.description }));
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 320);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, symbol]);

  const selectStock = (ticker, name) => {
    setSymbol(ticker);
    setSelectedName(name);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const clearStock = () => { setSymbol(""); setSelectedName(""); setSearchQuery(""); };

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
      setSelectedName("");
      setSearchQuery("");
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

      {/* Active Plans — shown above form */}
      {!loading && plans.length > 0 && (
        <Reveal delay={0.05}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.5px", color: T.ink, marginBottom: "16px" }}>
            Your Active Plans
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "0" }}>
            {plans.map(plan => {
              const nextDate = plan.next_run_date ? new Date(plan.next_run_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
              return (
                <Card key={plan.id} style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: T.ink }}>{plan.stock_symbol}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: T.ink }}>${plan.amount}</span>
                        <span style={{ fontSize: "12px", color: T.inkFaint }}>{freqLabel(plan.frequency)}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: T.inkFaint }}>Next: {nextDate}</div>
                    </div>
                    <button
                      onClick={() => handleCancel(plan.id)}
                      style={{
                        padding: "5px 12px", borderRadius: "20px",
                        border: `1px solid #fecaca`, background: "transparent",
                        fontSize: "12px", fontWeight: 500, color: T.red,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "opacity .15s ease",
                      }}
                    >Cancel</button>
                  </div>
                </Card>
              );
            })}
          </div>
          <hr style={{ border: "none", borderTop: `1px solid ${T.line}`, margin: "24px 0" }} />
        </Reveal>
      )}

      {/* Create Plan Form */}
      <Reveal delay={0.07}>
        <Card style={{ padding: "32px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.4px", color: T.ink, marginBottom: "20px" }}>
            New Auto-Invest Plan
          </h2>

          <form onSubmit={handleCreate}>
            {/* Stock Search */}
            <div style={{ marginBottom: "16px" }} ref={dropdownRef}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.inkFaint, marginBottom: "6px" }}>
                Stock
              </label>
              {symbol ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${T.accent}40`, background: `${T.accent}08` }}>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: T.ink }}>{symbol}</span>
                  <span style={{ fontSize: "13px", color: T.inkSub, flex: 1 }}>{selectedName}</span>
                  <button type="button" onClick={clearStock} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkFaint, fontSize: "18px", lineHeight: 1, padding: "0 2px" }}>×</button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Search any stock — AAPL, Tesla, NVDA…"
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "10px",
                      border: `1px solid ${T.line}`, fontSize: "14px", fontFamily: "inherit",
                      background: T.white, color: T.ink, outline: "none",
                    }}
                    onFocus={e => e.target.style.borderColor = `${T.accent}60`}
                    onBlur={e => e.target.style.borderColor = T.line}
                  />
                  {searching && (
                    <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: T.inkFaint }}>…</div>
                  )}
                  {showDropdown && searchResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: T.white, borderRadius: "10px", boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)", zIndex: 100, overflow: "hidden" }}>
                      {searchResults.map(r => (
                        <div key={r.ticker} onMouseDown={() => selectStock(r.ticker, r.name)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${T.line}`, display: "flex", gap: "10px", alignItems: "center" }}
                          onMouseEnter={e => e.currentTarget.style.background = T.bg}
                          onMouseLeave={e => e.currentTarget.style.background = T.white}
                        >
                          <span style={{ fontWeight: 700, fontSize: "13px", color: T.ink, minWidth: "52px" }}>{r.ticker}</span>
                          <span style={{ fontSize: "13px", color: T.inkSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.inkFaint, marginBottom: "6px" }}>
                Amount per purchase ($5 minimum)
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: T.inkFaint, fontSize: "14px", pointerEvents: "none" }}>$</span>
                <input
                  type="number"
                  min="5"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25"
                  style={{
                    width: "100%", padding: "12px 14px 12px 28px", borderRadius: "10px",
                    border: `1px solid ${T.line}`, fontSize: "14px", fontFamily: "inherit",
                    background: T.white, color: T.ink,
                  }}
                />
              </div>
            </div>

            {/* Frequency */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.inkFaint, marginBottom: "6px" }}>
                Frequency
              </label>
              <div className="freq-buttons" style={{ display: "flex", gap: "8px" }}>
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


      {/* DCA Explainer */}
      <Reveal delay={0.21}>
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
