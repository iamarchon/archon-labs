import { useState, useEffect, useCallback } from "react";
import { T } from "../tokens";
import Card from "../components/Card";
import Reveal from "../components/Reveal";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

/* ── helpers ────────────────────────────────────────── */

function statusFromGainPct(gainPct) {
  // Placeholder logic: positive gain = active, zero = idle, negative = inactive
  if (gainPct > 0) return "active";
  if (gainPct === 0) return "idle";
  return "inactive";
}

const STATUS_DOT = {
  active:   T.green,
  idle:     T.amber,
  inactive: T.red,
};

const STATUS_LABEL = {
  active:   "Active",
  idle:     "Idle",
  inactive: "Inactive",
};

const SORTABLE_COLS = [
  { key: "rank",        label: "Rank",            align: "center" },
  { key: "username",    label: "Username",         align: "left"   },
  { key: "total_value", label: "Portfolio Value",   align: "right"  },
  { key: "gain_pct",    label: "% Gain",           align: "right"  },
  { key: "trades",      label: "Trades",           align: "right"  },
  { key: "xp",          label: "XP",               align: "right"  },
  { key: "last_active", label: "Last Active",      align: "right"  },
  { key: "status",      label: "Status",           align: "center" },
];

function fmt$(v) {
  return "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v) {
  const n = Number(v || 0);
  const sign = n >= 0 ? "+" : "";
  return sign + n.toFixed(2) + "%";
}

function levelBadge(xp) {
  if (xp >= 10000) return { label: "Legend",  color: "#8b5cf6" };
  if (xp >= 5000)  return { label: "Diamond", color: "#06b6d4" };
  if (xp >= 1500)  return { label: "Gold",    color: "#d97706" };
  if (xp >= 500)   return { label: "Silver",  color: "#6b7280" };
  return { label: "Bronze", color: "#b45309" };
}

/* ── main component ─────────────────────────────────── */

export default function TeacherDashboard({ dbUser }) {
  const [league, setLeague]               = useState(null);
  const [members, setMembers]             = useState([]);
  const [sortKey, setSortKey]             = useState("rank");
  const [sortAsc, setSortAsc]             = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [copiedCode, setCopiedCode]       = useState(false);

  // AI insights modal
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [classInsights, setClassInsights]         = useState(null);
  const [classInsightsLoading, setClassInsightsLoading] = useState(false);

  // Student detail panel
  const [studentTips, setStudentTips]             = useState(null);
  const [studentTipsLoading, setStudentTipsLoading] = useState(false);
  const [studentChallenges, setStudentChallenges] = useState(null);
  const [studentLessons, setStudentLessons]       = useState(null);

  /* ── fetch league + members ─────────────────────── */

  useEffect(() => {
    if (!dbUser?.id) return;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leagues/${dbUser.id}`);
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : data;
        if (!first) return;
        setLeague(first);

        const mRes = await fetch(`${baseUrl}/api/leagues/members/${first.id}`);
        const mData = await mRes.json();
        const ranked = (Array.isArray(mData) ? mData : []).map((m, i) => ({
          ...m,
          rank:        i + 1,
          trades:      m.trades ?? 0,
          last_active: m.last_active ?? "—",
          status:      statusFromGainPct(m.gain_pct ?? 0),
        }));
        setMembers(ranked);
      } catch (err) {
        console.error("TeacherDashboard: failed to load league data", err);
      }
    })();
  }, [dbUser?.id]);

  /* ── fetch student detail data ──────────────────── */

  useEffect(() => {
    if (!selectedStudent) {
      setStudentTips(null);
      setStudentChallenges(null);
      setStudentLessons(null);
      return;
    }
    const sid = selectedStudent.user_id ?? selectedStudent.id;

    (async () => {
      try {
        const cRes = await fetch(`${baseUrl}/api/challenges?userId=${sid}`);
        const cData = await cRes.json();
        setStudentChallenges(Array.isArray(cData) ? cData : []);
      } catch { setStudentChallenges([]); }
    })();

    (async () => {
      try {
        const lRes = await fetch(`${baseUrl}/api/lessons/progress?userId=${sid}`);
        const lData = await lRes.json();
        setStudentLessons(Array.isArray(lData) ? lData : []);
      } catch { setStudentLessons([]); }
    })();
  }, [selectedStudent]);

  /* ── sorting ────────────────────────────────────── */

  const handleSort = useCallback((key) => {
    setSortAsc((prev) => (sortKey === key ? !prev : true));
    setSortKey(key);
  }, [sortKey]);

  const sorted = [...members].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  /* ── copy class code ────────────────────────────── */

  const copyCode = useCallback(() => {
    if (!league?.code) return;
    navigator.clipboard.writeText(league.code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    });
  }, [league?.code]);

  /* ── AI class insights ──────────────────────────── */

  const fetchClassInsights = useCallback(async () => {
    setShowInsightsModal(true);
    setClassInsights(null);
    setClassInsightsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/teacher-insights/class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: dbUser.id }),
      });
      const data = await res.json();
      setClassInsights(data.tips ?? data.insights ?? data.message ?? "No insights available.");
    } catch {
      setClassInsights("Failed to load insights. Please try again.");
    } finally {
      setClassInsightsLoading(false);
    }
  }, [dbUser?.id]);

  /* ── AI student tips ────────────────────────────── */

  const fetchStudentTips = useCallback(async () => {
    if (!selectedStudent) return;
    const sid = selectedStudent.user_id ?? selectedStudent.id;
    setStudentTips(null);
    setStudentTipsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/teacher-insights/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: sid }),
      });
      const data = await res.json();
      setStudentTips(data.tips ?? data.insights ?? data.message ?? "No tips available.");
    } catch {
      setStudentTips("Failed to load tips. Please try again.");
    } finally {
      setStudentTipsLoading(false);
    }
  }, [selectedStudent]);

  /* ── derived stats ──────────────────────────────── */

  const totalStudents  = members.length;
  const avgGain        = totalStudents > 0
    ? members.reduce((s, m) => s + (m.gain_pct ?? 0), 0) / totalStudents
    : 0;
  const totalValue     = members.reduce((s, m) => s + (m.total_value ?? 0), 0);
  const mostActive     = members.length > 0
    ? [...members].sort((a, b) => (b.trades ?? 0) - (a.trades ?? 0))[0]?.username ?? "—"
    : "—";

  /* ── styles ─────────────────────────────────────── */

  const S = {
    page: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "40px 24px 100px",
      fontFamily: "'DM Sans', sans-serif",
      color: T.ink,
      position: "relative",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 32,
    },
    h1: {
      fontSize: 32,
      fontWeight: 700,
      letterSpacing: "-0.8px",
      color: T.ink,
      margin: 0,
    },
    subtitle: {
      fontSize: 15,
      color: T.inkSub,
      marginTop: 4,
    },
    btn: {
      background: T.accent,
      color: T.white,
      borderRadius: 10,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 600,
      border: "none",
      cursor: "pointer",
      transition: "opacity .15s ease",
    },
    btnSecondary: {
      background: "transparent",
      color: T.accent,
      borderRadius: 10,
      padding: "10px 20px",
      fontSize: 14,
      fontWeight: 600,
      border: `1.5px solid ${T.accent}`,
      cursor: "pointer",
      transition: "opacity .15s ease",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "-0.4px",
      color: T.ink,
      margin: "0 0 16px",
    },
    label: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: T.inkFaint,
    },
  };

  /* ── render ─────────────────────────────────────── */

  return (
    <div style={S.page}>
      {/* ── Header ────────────────────────────────── */}
      <Reveal>
        <div style={S.header}>
          <div>
            <h1 style={S.h1}>Teacher Dashboard</h1>
            <p style={S.subtitle}>
              Welcome back, {dbUser?.username ?? "Teacher"}
            </p>
          </div>
          <button
            style={S.btn}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            onClick={fetchClassInsights}
          >
            Class Insights
          </button>
        </div>
      </Reveal>

      {/* ── Class Overview ────────────────────────── */}
      <Reveal delay={0.07}>
        <Card hover={false} style={{ padding: "28px 32px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={S.sectionTitle}>My Class</h2>
            {league && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ ...S.label, marginRight: 4 }}>Class Code</span>
                <span style={{
                  fontFamily: "monospace",
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.ink,
                  background: T.bg,
                  padding: "5px 14px",
                  borderRadius: 8,
                }}>{league.code}</span>
                <button
                  onClick={copyCode}
                  style={{
                    ...S.btnSecondary,
                    padding: "6px 14px",
                    fontSize: 12,
                  }}
                >
                  {copiedCode ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>

          {/* Student table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr>
                  {SORTABLE_COLS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{
                        textAlign: col.align,
                        padding: "10px 12px",
                        borderBottom: `1.5px solid ${T.line}`,
                        cursor: "pointer",
                        userSelect: "none",
                        ...S.label,
                        fontSize: 11,
                        color: sortKey === col.key ? T.accent : T.inkFaint,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span style={{ marginLeft: 4, fontSize: 10 }}>
                          {sortAsc ? "\u25B2" : "\u25BC"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={SORTABLE_COLS.length} style={{ padding: 32, textAlign: "center", color: T.inkFaint }}>
                      No students found
                    </td>
                  </tr>
                )}
                {sorted.map((m) => {
                  const isSelected = selectedStudent &&
                    (selectedStudent.user_id ?? selectedStudent.id) === (m.user_id ?? m.id);
                  return (
                    <tr
                      key={m.user_id ?? m.id ?? m.rank}
                      onClick={() => setSelectedStudent(m)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? T.bg : "transparent",
                        transition: "background .15s ease",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = T.bg; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ textAlign: "center", padding: "10px 12px", borderBottom: `1px solid ${T.line}`, color: T.inkSub }}>
                        {m.rank}
                      </td>
                      <td style={{ textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${T.line}`, fontWeight: 600, color: T.ink }}>
                        {m.username}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px", borderBottom: `1px solid ${T.line}`, color: T.ink }}>
                        {fmt$(m.total_value)}
                      </td>
                      <td style={{
                        textAlign: "right",
                        padding: "10px 12px",
                        borderBottom: `1px solid ${T.line}`,
                        color: (m.gain_pct ?? 0) >= 0 ? T.green : T.red,
                        fontWeight: 600,
                      }}>
                        {fmtPct(m.gain_pct)}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px", borderBottom: `1px solid ${T.line}`, color: T.inkSub }}>
                        {m.trades}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px", borderBottom: `1px solid ${T.line}`, color: T.inkSub }}>
                        {(m.xp ?? 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 12px", borderBottom: `1px solid ${T.line}`, color: T.inkFaint, fontSize: 12 }}>
                        {m.last_active}
                      </td>
                      <td style={{ textAlign: "center", padding: "10px 12px", borderBottom: `1px solid ${T.line}` }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: STATUS_DOT[m.status],
                            display: "inline-block",
                          }} />
                          <span style={{ color: T.inkSub }}>{STATUS_LABEL[m.status]}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      {/* ── Two-column: Activity Feed + Class Stats ─ */}
      <Reveal delay={0.14}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Activity Feed */}
          <Card hover={false} style={{ padding: "28px 32px" }}>
            <h2 style={S.sectionTitle}>Recent Activity</h2>
            <p style={{ fontSize: 14, color: T.inkFaint, margin: 0 }}>
              Activity feed coming soon
            </p>
          </Card>

          {/* Class Stats */}
          <Card hover={false} style={{ padding: "28px 32px" }}>
            <h2 style={S.sectionTitle}>Class Stats</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <StatTile label="Total Students" value={totalStudents} />
              <StatTile label="Avg Portfolio Gain" value={fmtPct(avgGain)} color={avgGain >= 0 ? T.green : T.red} />
              <StatTile label="Most Active" value={mostActive} />
              <StatTile label="Total Combined Value" value={fmt$(totalValue)} />
            </div>
          </Card>
        </div>
      </Reveal>

      {/* ── Student Detail Panel ──────────────────── */}
      <div style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 480,
        height: "100vh",
        background: T.white,
        boxShadow: selectedStudent
          ? "-8px 0 40px rgba(0,0,0,0.10)"
          : "none",
        transform: selectedStudent ? "translateX(0)" : "translateX(100%)",
        transition: "transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease",
        zIndex: 100,
        overflowY: "auto",
        padding: selectedStudent ? "32px 28px 60px" : 0,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {selectedStudent && (
          <>
            {/* Close button */}
            <button
              onClick={() => setSelectedStudent(null)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: T.bg,
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 16,
                color: T.inkSub,
                lineHeight: 1,
              }}
            >
              &#x2715;
            </button>

            {/* Student header */}
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: T.ink, margin: "0 0 6px" }}>
              {selectedStudent.username}
            </h2>
            {(() => {
              const badge = levelBadge(selectedStudent.xp ?? 0);
              return (
                <span style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: T.white,
                  background: badge.color,
                  borderRadius: 6,
                  padding: "3px 10px",
                  marginBottom: 24,
                }}>
                  {badge.label}
                </span>
              );
            })()}

            {/* Portfolio breakdown */}
            <div style={{
              background: T.bg,
              borderRadius: 14,
              padding: "20px 22px",
              marginBottom: 20,
            }}>
              <p style={{ ...S.label, margin: "0 0 6px" }}>Portfolio Overview</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: T.inkSub }}>Total Value</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>
                  {fmt$(selectedStudent.total_value)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: T.inkSub }}>Gain</span>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: (selectedStudent.gain_pct ?? 0) >= 0 ? T.green : T.red,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {fmtPct(selectedStudent.gain_pct)}
                </span>
              </div>
            </div>

            {/* AI Tips */}
            <button
              onClick={fetchStudentTips}
              disabled={studentTipsLoading}
              style={{
                ...S.btn,
                width: "100%",
                marginBottom: 16,
                opacity: studentTipsLoading ? 0.6 : 1,
              }}
            >
              {studentTipsLoading ? "Loading..." : "Get AI Tips"}
            </button>
            {studentTips && (
              <div style={{
                background: T.bg,
                borderRadius: 14,
                padding: "18px 22px",
                marginBottom: 20,
                fontSize: 14,
                lineHeight: 1.65,
                color: T.inkMid,
              }}>
                {Array.isArray(studentTips)
                  ? studentTips.map((tip, i) => (
                      <p key={i} style={{ margin: i === 0 ? 0 : "8px 0 0" }}>
                        {"\u2022"} {tip}
                      </p>
                    ))
                  : <p style={{ margin: 0 }}>{studentTips}</p>
                }
              </div>
            )}

            {/* Challenge progress */}
            <div style={{
              background: T.bg,
              borderRadius: 14,
              padding: "18px 22px",
              marginBottom: 16,
            }}>
              <p style={{ ...S.label, margin: "0 0 8px" }}>Challenges</p>
              <p style={{ fontSize: 14, color: T.ink, margin: 0, fontWeight: 600 }}>
                {studentChallenges
                  ? `${studentChallenges.filter((c) => c.claimed).length} completed`
                  : "Loading..."}
              </p>
            </div>

            {/* Lesson progress */}
            <div style={{
              background: T.bg,
              borderRadius: 14,
              padding: "18px 22px",
            }}>
              <p style={{ ...S.label, margin: "0 0 8px" }}>Lessons</p>
              <p style={{ fontSize: 14, color: T.ink, margin: 0, fontWeight: 600 }}>
                {studentLessons
                  ? `${studentLessons.filter((l) => l.completed).length} completed`
                  : "Loading..."}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── AI Class Insights Modal ───────────────── */}
      {showInsightsModal && (
        <div
          onClick={() => setShowInsightsModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white,
              borderRadius: 20,
              padding: "36px 40px",
              width: 520,
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              animation: "teacherModalIn .26s cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: T.ink, margin: 0 }}>
                Class Insights
              </h2>
              <button
                onClick={() => setShowInsightsModal(false)}
                style={{
                  background: T.bg,
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  color: T.inkSub,
                  lineHeight: 1,
                }}
              >
                &#x2715;
              </button>
            </div>

            {classInsightsLoading && (
              <p style={{ fontSize: 14, color: T.inkFaint, textAlign: "center", padding: "32px 0" }}>
                Generating insights...
              </p>
            )}

            {!classInsightsLoading && classInsights && (
              <div style={{ fontSize: 14, lineHeight: 1.65, color: T.inkMid }}>
                {Array.isArray(classInsights)
                  ? classInsights.map((tip, i) => (
                      <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0" }}>
                        {"\u2022"} {tip}
                      </p>
                    ))
                  : <p style={{ margin: 0 }}>{classInsights}</p>
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal keyframe (inline style tag) ─────── */}
      <style>{`
        @keyframes teacherModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Stat tile sub-component ──────────────────────── */

function StatTile({ label, value, color }) {
  return (
    <div style={{
      background: T.bg,
      borderRadius: 14,
      padding: "18px 20px",
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: T.inkFaint,
        margin: "0 0 6px",
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 20,
        fontWeight: 700,
        color: color ?? T.ink,
        margin: 0,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.4px",
      }}>
        {value}
      </p>
    </div>
  );
}
