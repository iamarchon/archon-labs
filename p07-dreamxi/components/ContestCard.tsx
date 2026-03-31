"use client";

import TeamLogo from "@/components/TeamLogo";
import JerseyAvatar from "@/components/JerseyAvatar";
import type { Fixture } from "@/types";
import { PLAYERS } from "@/lib/data/players";

interface ContestCardProps {
  fixture: Fixture;
  homeScore?: number;
  homeWickets?: number;
  over?: number;
  ball?: number;
  onLeaderboard?: () => void;
  onLive?: () => void;
}

export default function ContestCard({
  fixture,
  homeScore = 142,
  homeWickets = 3,
  over = 14,
  ball = 2,
  onLeaderboard,
  onLive,
}: ContestCardProps) {
  const homePlayers = PLAYERS.filter((p) => p.team === fixture.home).slice(0, 3);
  const awayPlayers = PLAYERS.filter((p) => p.team === fixture.away).slice(0, 3);
  const stripPlayers = [...homePlayers, ...awayPlayers];

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0d1120 0%, #0f172a 100%)",
        border: "1px solid #1e293b",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Live badge + venue */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: "var(--font-oswald)", letterSpacing: 1 }}>
            ● LIVE
          </span>
          <span style={{ fontSize: 10, color: "#64748b" }}>{fixture.date} · {fixture.time}</span>
        </div>
        <span style={{ fontSize: 9, color: "#64748b" }}>🪙 5,000 to win</span>
      </div>

      {/* Teams + Score */}
      <div style={{ display: "flex", alignItems: "center", padding: "6px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <TeamLogo team={fixture.home} size={36} />
          <div>
            <div style={{ fontFamily: "var(--font-oswald)", fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{fixture.home}</div>
            <div style={{ fontFamily: "var(--font-oswald)", fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>
              {homeScore}/{homeWickets}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "0 10px" }}>
          <div style={{ fontSize: 11, color: "#64748b" }}>OV {over}.{ball}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", fontFamily: "var(--font-oswald)" }}>VS</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-oswald)", fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{fixture.away}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Yet to bat</div>
          </div>
          <TeamLogo team={fixture.away} size={36} />
        </div>
      </div>

      {/* Player strip */}
      <div style={{ display: "flex", gap: 6, padding: "0 14px 12px", overflowX: "auto" }}>
        {stripPlayers.map((p) => (
          <JerseyAvatar key={p.id} player={p} size={36} compact />
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 8, padding: "0 14px 14px" }}>
        <button
          onClick={onLeaderboard}
          style={{
            flex: 1,
            padding: "10px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 10,
            color: "#a78bfa",
            fontFamily: "var(--font-manrope)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={onLive}
          style={{
            flex: 1,
            padding: "10px",
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontFamily: "var(--font-manrope)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📡 Watch Live
        </button>
      </div>
    </div>
  );
}
