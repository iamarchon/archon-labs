import TeamLogo from "@/components/TeamLogo";
import { TEAMS } from "@/lib/data/teams";
import type { Fixture } from "@/types";

interface ScoreHeaderProps {
  fixture: Fixture;
  homeScore?: number;
  homeWickets?: number;
  over?: number;
  ball?: number;
  userPts?: number;
  userRank?: number;
  creditsUsed?: number;
  mode: "build" | "live" | "leaderboard";
}

export default function ScoreHeader({
  fixture,
  homeScore = 0,
  homeWickets = 0,
  over = 0,
  ball = 0,
  userPts,
  userRank,
  creditsUsed,
  mode,
}: ScoreHeaderProps) {
  const homeTeam = TEAMS[fixture.home];
  const awayTeam = TEAMS[fixture.away];

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0d1120 0%, #0f172a 100%)",
        borderBottom: "1px solid #1e293b",
        padding: "12px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Home team */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <TeamLogo team={fixture.home} size={36} />
          <span style={{ fontFamily: "var(--font-oswald)", fontWeight: 700, fontSize: 13, color: homeTeam?.c1 ?? "#e2e8f0" }}>
            {fixture.home}
          </span>
        </div>

        {/* Center info */}
        <div style={{ flex: 1, textAlign: "center" }}>
          {mode === "live" && (
            <>
              <div style={{ fontFamily: "var(--font-oswald)", fontSize: 22, fontWeight: 700, color: "#e2e8f0" }}>
                {homeScore}/{homeWickets}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                Over {over}.{ball}
              </div>
            </>
          )}
          {mode === "build" && (
            <>
              <div style={{ fontSize: 11, color: "#64748b" }}>Credits Used</div>
              <div style={{ fontFamily: "var(--font-oswald)", fontSize: 20, fontWeight: 700, color: creditsUsed && creditsUsed > 95 ? "#ef4444" : "#e2e8f0" }}>
                {(creditsUsed ?? 0).toFixed(1)} / 100
              </div>
            </>
          )}
          {mode === "leaderboard" && (
            <>
              <div style={{ fontFamily: "var(--font-oswald)", fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>
                {homeScore}/{homeWickets}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Final</div>
            </>
          )}
          {(mode === "live" || mode === "leaderboard") && userPts !== undefined && (
            <div style={{ marginTop: 4, display: "flex", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                My Pts: <span style={{ color: "#4ade80", fontFamily: "var(--font-oswald)", fontWeight: 700 }}>{userPts.toFixed(0)}</span>
              </span>
              {userRank && (
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Rank: <span style={{ color: "#a78bfa", fontFamily: "var(--font-oswald)", fontWeight: 700 }}>#{userRank}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Away team */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <TeamLogo team={fixture.away} size={36} />
          <span style={{ fontFamily: "var(--font-oswald)", fontWeight: 700, fontSize: 13, color: awayTeam?.c1 ?? "#e2e8f0" }}>
            {fixture.away}
          </span>
        </div>
      </div>
    </div>
  );
}
