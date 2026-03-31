import type { PlayerStats } from "@/types";

export function calcPoints(stats: PlayerStats): number {
  const { runs = 0, wickets = 0, fours = 0, sixes = 0, dots = 0, maidens = 0 } = stats;
  let pts = runs + fours + sixes * 2 + wickets * 25 + dots + maidens * 12;
  if (runs >= 25)  pts += 4;
  if (runs >= 50)  pts += 8;
  if (runs >= 75)  pts += 12;
  if (runs >= 100) pts += 16;
  if (wickets >= 3) pts += 8;
  if (wickets >= 5) pts += 16;
  return Math.max(0, pts);
}

export function totalTeamPoints(
  playerIds: number[],
  captainId: number | null,
  vcId: number | null,
  liveStats: Record<number, PlayerStats>
): number {
  return playerIds.reduce((sum, id) => {
    const mult = id === captainId ? 2 : id === vcId ? 1.5 : 1;
    return sum + calcPoints(liveStats[id] ?? {}) * mult;
  }, 0);
}
