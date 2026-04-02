"use client";

import type { MatchEvent } from "@/types";
import { TEAMS } from "@/lib/data/teams";

interface BallLogProps {
  events: MatchEvent[];
}

export default function BallLog({ events }: BallLogProps) {
  return (
    <div
      style={{
        background: "#0d1120",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #1e293b",
      }}
    >
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e293b" }}>
        <span style={{ fontFamily: "var(--font-oswald)", fontWeight: 600, fontSize: 13, color: "#64748b", letterSpacing: 1 }}>
          BALL LOG
        </span>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {events.length === 0 && (
          <div style={{ padding: "20px 14px", color: "#64748b", fontSize: 13, textAlign: "center" }}>
            Match not started yet
          </div>
        )}
        {events.map((ev) => {
          const teamColor = TEAMS[ev.team]?.c1 ?? "#a78bfa";
          return (
            <div
              key={ev.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 14px",
                borderBottom: "1px solid #0f172a",
                borderLeft: `3px solid ${teamColor}`,
                gap: 10,
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "var(--font-manrope)" }}>{ev.msg}</span>
              </div>
              <span style={{ fontSize: 10, color: "#64748b" }}>
                {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
