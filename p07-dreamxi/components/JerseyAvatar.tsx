import type { Player } from "@/types";
import { TEAMS } from "@/lib/data/teams";

interface JerseyAvatarProps {
  player: Player;
  size?: number;
  isC?: boolean;
  isVC?: boolean;
  pts?: number;
  compact?: boolean;
}

export default function JerseyAvatar({
  player,
  size = 56,
  isC = false,
  isVC = false,
  pts,
  compact = false,
}: JerseyAvatarProps) {
  const team = TEAMS[player.team];
  const c1 = team?.c1 ?? "#1e293b";
  const c2 = team?.c2 ?? "#94a3b8";
  const initials = player.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const ringColor = isC ? "#FFD700" : isVC ? "#a78bfa" : "transparent";
  const ringWidth = isC || isVC ? 3 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {/* Ring */}
        {(isC || isVC) && (
          <div
            style={{
              position: "absolute",
              inset: -ringWidth - 1,
              borderRadius: "50%",
              border: `${ringWidth}px solid ${ringColor}`,
              boxShadow: `0 0 8px ${ringColor}88`,
              zIndex: 2,
            }}
          />
        )}
        {/* Avatar circle */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 56 56"
          style={{ display: "block", borderRadius: "50%" }}
        >
          <defs>
            <radialGradient id={`grad-${player.id}`} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor={c1} stopOpacity="1" />
              <stop offset="100%" stopColor={c2} stopOpacity="0.8" />
            </radialGradient>
          </defs>
          <circle cx="28" cy="28" r="28" fill={`url(#grad-${player.id})`} />
          <text
            x="28"
            y="26"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize="13"
            fontWeight="700"
            fontFamily="var(--font-manrope, Arial)"
          >
            {initials}
          </text>
          <text
            x="28"
            y="40"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={c2}
            fontSize="9"
            fontWeight="900"
            fontFamily="var(--font-oswald, Arial)"
          >
            #{player.jersey}
          </text>
        </svg>
        {/* C/VC pill */}
        {(isC || isVC) && (
          <div
            style={{
              position: "absolute",
              bottom: -8,
              left: "50%",
              transform: "translateX(-50%)",
              background: ringColor,
              color: "#000",
              fontSize: 9,
              fontWeight: 900,
              padding: "1px 5px",
              borderRadius: 4,
              fontFamily: "var(--font-oswald, Arial)",
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              zIndex: 3,
            }}
          >
            {isC ? "C×2" : "VC×1.5"}
          </div>
        )}
      </div>
      {/* Points badge (live mode) */}
      {pts !== undefined && !compact && (
        <div
          style={{
            marginTop: 10,
            background: "#1e293b",
            color: "#4ade80",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            fontFamily: "var(--font-oswald, Arial)",
          }}
        >
          {pts} pts
        </div>
      )}
    </div>
  );
}
