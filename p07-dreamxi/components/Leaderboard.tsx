import type { LeaderboardEntry } from "@/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  username?: string;
}

const COIN_PRIZES: Record<number, number> = { 1: 5000, 2: 2000, 3: 1000 };

export default function Leaderboard({ entries, username }: LeaderboardProps) {
  const userEntry = entries.find((e) => e.isUser);
  const others = entries.filter((e) => !e.isUser);

  const renderRow = (entry: LeaderboardEntry, pinned = false) => (
    <div
      key={entry.name + entry.rank}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 14px",
        background: pinned ? "#0f1e3a" : "#0d1120",
        border: pinned ? "1px solid #38bdf8" : "none",
        borderRadius: pinned ? 8 : 0,
        borderBottom: pinned ? undefined : "1px solid #0f172a",
        gap: 12,
        marginBottom: pinned ? 4 : 0,
      }}
    >
      {/* Rank */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: entry.rank === 1 ? "#FFD700" : entry.rank === 2 ? "#94a3b8" : entry.rank === 3 ? "#cd7f32" : "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: entry.rank <= 3 ? "#000" : "#64748b",
          fontFamily: "var(--font-oswald)",
          flexShrink: 0,
        }}
      >
        {entry.rank}
      </div>

      {/* Avatar initial */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: pinned ? "#1d4ed8" : "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "#e2e8f0",
          flexShrink: 0,
        }}
      >
        {entry.name[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-manrope)" }}>
          {entry.name}
          {pinned && <span style={{ fontSize: 10, color: "#38bdf8", marginLeft: 6 }}>YOU</span>}
        </div>
      </div>

      {/* Winnings */}
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 56 }}>
        {COIN_PRIZES[entry.rank] && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD700", fontFamily: "var(--font-oswald)" }}>
            🪙 {COIN_PRIZES[entry.rank].toLocaleString()}
          </div>
        )}
      </div>

      {/* Points */}
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 48 }}>
        <div style={{ fontFamily: "var(--font-oswald)", fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
          {entry.pts.toFixed(0)}
        </div>
        <div style={{ fontSize: 9, color: "#64748b" }}>pts</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#0d1120", borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
      {/* Header */}
      <div style={{ display: "flex", padding: "8px 14px", borderBottom: "1px solid #1e293b", background: "#0a0e1a" }}>
        <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: "#64748b", fontFamily: "var(--font-oswald)", letterSpacing: 1 }}>USERNAME & RANK</div>
        <div style={{ width: 56, textAlign: "right", fontSize: 10, fontWeight: 700, color: "#64748b", fontFamily: "var(--font-oswald)", letterSpacing: 1 }}>WINNINGS</div>
        <div style={{ width: 48, textAlign: "right", fontSize: 10, fontWeight: 700, color: "#64748b", fontFamily: "var(--font-oswald)", letterSpacing: 1, marginLeft: 12 }}>POINTS</div>
      </div>

      {/* Pinned user card */}
      {userEntry && (
        <div style={{ padding: "8px 8px 0" }}>
          {renderRow(userEntry, true)}
        </div>
      )}

      {/* Other entries */}
      {others.map((e) => renderRow(e))}
    </div>
  );
}
