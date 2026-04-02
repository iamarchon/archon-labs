"use client";

import type { Player, LiveStats } from "@/types";
import JerseyAvatar from "@/components/JerseyAvatar";
import { calcPoints } from "@/lib/scoring";

interface PitchViewProps {
  selObjs: Player[];
  captain: number | null;
  vc: number | null;
  liveStats?: LiveStats;
  onCap?: (id: number) => void;
  onVC?: (id: number) => void;
  onDel?: (id: number) => void;
}

const ROLE_ORDER: string[] = ["WK", "BAT", "AR", "BOWL"];

export default function PitchView({ selObjs, captain, vc, liveStats, onCap, onVC, onDel }: PitchViewProps) {
  const isLive = !!liveStats;
  const rows = ROLE_ORDER.map((role) => selObjs.filter((p) => p.role === role));

  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "110%" }}>
      {/* Pitch SVG background */}
      <svg
        viewBox="0 0 320 360"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="pitch-grad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1a3a1a" />
            <stop offset="60%" stopColor="#0f2a0f" />
            <stop offset="100%" stopColor="#081808" />
          </radialGradient>
        </defs>
        <ellipse cx="160" cy="180" rx="155" ry="175" fill="url(#pitch-grad)" stroke="#1e3a1e" strokeWidth="2" />
        <ellipse cx="160" cy="180" rx="100" ry="115" fill="none" stroke="#1e3a1e" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
        {/* Pitch strip */}
        <rect x="148" y="130" width="24" height="100" rx="2" fill="#2a4a2a" opacity="0.6" />
        {/* Crease lines */}
        <line x1="143" y1="155" x2="177" y2="155" stroke="#4a6a4a" strokeWidth="1.5" opacity="0.7" />
        <line x1="143" y1="205" x2="177" y2="205" stroke="#4a6a4a" strokeWidth="1.5" opacity="0.7" />
      </svg>

      {/* Players overlaid on pitch */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          padding: "14px 8px",
        }}
      >
        {rows.map((rowPlayers, rowIdx) => (
          <div
            key={ROLE_ORDER[rowIdx]}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-end",
              gap: rowPlayers.length > 3 ? 8 : 16,
              minHeight: 80,
            }}
          >
            {rowPlayers.length === 0 ? (
              <div style={{ textAlign: "center", color: "#2a4a2a", fontSize: 11, fontFamily: "var(--font-oswald)", letterSpacing: 1 }}>
                {ROLE_ORDER[rowIdx]}
              </div>
            ) : (
              rowPlayers.map((p) => {
                const pts = liveStats ? calcPoints(liveStats[p.id] ?? {}) * (p.id === captain ? 2 : p.id === vc ? 1.5 : 1) : undefined;
                return (
                  <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <JerseyAvatar
                      player={p}
                      size={44}
                      isC={captain === p.id}
                      isVC={vc === p.id}
                      pts={pts}
                      compact={!isLive}
                    />
                    <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "var(--font-manrope)", textAlign: "center", maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </div>
                    {/* Build mode buttons */}
                    {!isLive && onCap && onVC && onDel && (
                      <div style={{ display: "flex", gap: 3 }}>
                        <button
                          onClick={() => onCap(p.id)}
                          style={{
                            fontSize: 8,
                            padding: "2px 4px",
                            borderRadius: 3,
                            border: "none",
                            background: captain === p.id ? "#FFD700" : "#1e293b",
                            color: captain === p.id ? "#000" : "#94a3b8",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          C
                        </button>
                        <button
                          onClick={() => onVC(p.id)}
                          style={{
                            fontSize: 8,
                            padding: "2px 4px",
                            borderRadius: 3,
                            border: "none",
                            background: vc === p.id ? "#a78bfa" : "#1e293b",
                            color: vc === p.id ? "#000" : "#94a3b8",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          V
                        </button>
                        <button
                          onClick={() => onDel(p.id)}
                          style={{
                            fontSize: 8,
                            padding: "2px 4px",
                            borderRadius: 3,
                            border: "none",
                            background: "#1e293b",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
