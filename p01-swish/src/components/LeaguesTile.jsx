import { useState, useEffect, useCallback } from "react";
import { T } from "../tokens";
import Card from "./Card";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

export default function LeaguesTile({ userId }) {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [expandedLeague, setExpandedLeague] = useState(null);
  const [leagueMembers, setLeagueMembers] = useState({});

  const fetchLeagues = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${baseUrl}/api/leagues/${userId}`);
      const data = await res.json();
      setLeagues(data.leagues || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchLeagues(); }, [fetchLeagues]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch(`${baseUrl}/api/leagues/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), userId }),
      });
      const data = await res.json();
      if (data.code) {
        setCreatedCode(data.code);
        setCreateName("");
        fetchLeagues();
      } else {
        setFormError(data.error || "Failed to create league");
      }
    } catch {
      setFormError("Failed to create league");
    }
    setFormLoading(false);
  };

  const handleJoin = async () => {
    if (joinCode.length < 6) return;
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await fetch(`${baseUrl}/api/leagues/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.toUpperCase(), userId }),
      });
      const data = await res.json();
      if (data.alreadyMember) {
        setFormSuccess("You're already part of this league! 🎉");
        setJoinCode("");
      } else if (data.success) {
        setJoinCode("");
        setShowJoin(false);
        setFormSuccess(null);
        fetchLeagues();
      } else {
        setFormError(data.error || "Code not found. Check with your teacher.");
      }
    } catch {
      setFormError("Failed to join league");
    }
    setFormLoading(false);
  };

  const toggleExpand = async (leagueId) => {
    if (expandedLeague === leagueId) {
      setExpandedLeague(null);
      return;
    }
    setExpandedLeague(leagueId);
    if (!leagueMembers[leagueId]) {
      try {
        const res = await fetch(`${baseUrl}/api/leagues/members/${leagueId}`);
        const data = await res.json();
        setLeagueMembers(prev => ({ ...prev, [leagueId]: data.members || [] }));
      } catch { /* ignore */ }
    }
  };

  // TODO Session 6: Add navigator.share() for mobile sharing
  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
  };

  if (!userId) return null;

  return (
    <Card hover={false} style={{ padding: "28px 30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ color: T.ink, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>My Leagues 🏆</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setShowCreate(v => !v); setShowJoin(false); setCreatedCode(null); setFormError(null); setFormSuccess(null); }}
            style={{ background: T.accent, color: T.white, border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "opacity .15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>Create</button>
          <button onClick={() => { setShowJoin(v => !v); setShowCreate(false); setCreatedCode(null); setFormError(null); setFormSuccess(null); }}
            style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>Join</button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ marginBottom: "16px", padding: "16px", background: T.bg, borderRadius: "12px" }}>
          {createdCode ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ color: T.ink, fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Share this code with your class:</div>
              {/* TODO Session 6: Add navigator.share() for mobile sharing */}
              <div onClick={() => copyCode(createdCode)}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: T.white, padding: "10px 20px", borderRadius: "10px", border: `1px solid ${T.line}`, cursor: "pointer" }}>
                <span style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "2px", color: T.accent }}>{createdCode}</span>
                <span style={{ fontSize: "14px" }}>📋</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="League name (e.g. Mr. Smith's Class)"
                style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: `1px solid ${T.line}`, fontSize: "13px", color: T.ink, outline: "none" }}
                onKeyDown={e => { if (e.key === "Enter") handleCreate(); }} />
              <button onClick={handleCreate} disabled={formLoading || !createName.trim()}
                style={{ background: T.accent, color: T.white, border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: formLoading ? 0.5 : 1 }}>
                {formLoading ? "..." : "Create"}
              </button>
            </div>
          )}
          {formError && <div style={{ color: T.red, fontSize: "12px", marginTop: "8px" }}>{formError}</div>}
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div style={{ marginBottom: "16px", padding: "16px", background: T.bg, borderRadius: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="Enter 6-letter code"
              maxLength={6}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: `1px solid ${T.line}`, fontSize: "15px", fontWeight: 600, letterSpacing: "2px", color: T.ink, outline: "none", textTransform: "uppercase", textAlign: "center" }}
              onKeyDown={e => { if (e.key === "Enter") handleJoin(); }} />
            <button onClick={handleJoin} disabled={formLoading || joinCode.length < 6}
              style={{ background: T.accent, color: T.white, border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: formLoading || joinCode.length < 6 ? 0.5 : 1 }}>
              {formLoading ? "..." : "Join"}
            </button>
          </div>
          {formError && <div style={{ color: T.red, fontSize: "12px", marginTop: "8px" }}>{formError}</div>}
          {formSuccess && <div style={{ color: T.green, fontSize: "12px", marginTop: "8px", fontWeight: 500 }}>{formSuccess}</div>}
        </div>
      )}

      {/* League list */}
      {loading ? (
        <div style={{ color: T.inkFaint, fontSize: "14px", textAlign: "center", padding: "16px 0" }}>Loading...</div>
      ) : leagues.length === 0 ? (
        <div style={{ color: T.inkSub, fontSize: "14px", textAlign: "center", padding: "20px 0" }}>
          No leagues yet. Create one or ask your teacher for a code.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {leagues.map(league => (
            <div key={league.id}>
              <div onClick={() => toggleExpand(league.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: expandedLeague === league.id ? T.bg : "transparent", cursor: "pointer", transition: "background .15s" }}
                onMouseEnter={e => { if (expandedLeague !== league.id) e.currentTarget.style.background = T.bg; }}
                onMouseLeave={e => { if (expandedLeague !== league.id) e.currentTarget.style.background = "transparent"; }}>
                <div>
                  <div style={{ color: T.ink, fontSize: "14px", fontWeight: 600 }}>{league.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                    <span style={{ color: T.inkFaint, fontSize: "12px" }}>{league.member_count} member{league.member_count !== 1 ? "s" : ""}</span>
                    <span onClick={e => { e.stopPropagation(); copyCode(league.code); }}
                      style={{ color: T.accent, fontSize: "11px", fontWeight: 500, cursor: "pointer" }}>
                      Code: {league.code} 📋
                    </span>
                  </div>
                </div>
                <span style={{ color: T.inkFaint, fontSize: "12px", transform: expandedLeague === league.id ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
              </div>

              {expandedLeague === league.id && (
                <div style={{ padding: "8px 14px 14px", animation: "fadeIn .2s ease" }}>
                  {!leagueMembers[league.id] ? (
                    <div style={{ color: T.inkFaint, fontSize: "13px", padding: "8px 0" }}>Loading...</div>
                  ) : leagueMembers[league.id].length === 0 ? (
                    <div style={{ color: T.inkFaint, fontSize: "13px", padding: "8px 0" }}>No members yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {leagueMembers[league.id].map((m, i) => (
                        <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: m.user_id === userId ? `${T.accent}08` : "transparent" }}>
                          <span style={{ width: "20px", fontSize: "12px", fontWeight: 700, color: i < 3 ? ["#c9862a", "#8e8e93", "#7d4f2a"][i] : T.inkFaint, textAlign: "center" }}>
                            {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                          </span>
                          <span style={{ flex: 1, color: m.user_id === userId ? T.accent : T.ink, fontSize: "13px", fontWeight: m.user_id === userId ? 600 : 400 }}>@{m.username}</span>
                          <span style={{ color: m.gain_pct >= 0 ? T.green : T.red, fontSize: "13px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            {m.gain_pct >= 0 ? "+" : ""}{m.gain_pct.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
