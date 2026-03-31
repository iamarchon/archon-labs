"use client";

import type { Player } from "@/types";
import JerseyAvatar from "@/components/JerseyAvatar";
import { TEAMS } from "@/lib/data/teams";

interface PlayerRowProps {
  player: Player;
  selected: number[];
  captain: number | null;
  vc: number | null;
  onToggle: (id: number) => void;
}

const ROLE_COLORS: Record<string, string> = {
  BAT: "#38bdf8",
  BOWL: "#f87171",
  AR: "#4ade80",
  WK: "#fb923c",
};

export default function PlayerRow({ player, selected, captain, vc, onToggle }: PlayerRowProps) {
  const isSelected = selected.includes(player.id);
  const isC = captain === player.id;
  const isVC = vc === player.id;
  const team = TEAMS[player.team];

  return (
    <button
      onClick={() => onToggle(player.id)}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "10px 14px",
        background: isSelected ? "#0f172a" : "#0d1120",
        border: "none",
        borderBottom: "1px solid #1e293b",
        cursor: "pointer",
        gap: 12,
        textAlign: "left",
        outline: "none",
      }}
    >
      <JerseyAvatar player={player} size={44} isC={isC} isVC={isVC} compact />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-manrope)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {player.full}
          </span>
          {player.ovr && <span style={{ fontSize: 9, color: "#64748b" }}>🌍</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: ROLE_COLORS[player.role] ?? "#64748b", background: `${ROLE_COLORS[player.role]}22`, padding: "1px 5px", borderRadius: 3 }}>
            {player.role}
          </span>
          <span style={{ fontSize: 10, color: team?.c1 ?? "#64748b", fontFamily: "var(--font-oswald)" }}>{player.team}</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>{player.sel}% sel</span>
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--font-oswald)", fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>
          {player.cr}
        </div>
        <div style={{ fontSize: 9, color: "#64748b" }}>cr</div>
      </div>

      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: `2px solid ${isSelected ? "#a78bfa" : "#1e293b"}`,
          background: isSelected ? "#a78bfa" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "#fff",
          fontSize: 12,
        }}
      >
        {isSelected && "✓"}
      </div>
    </button>
  );
}
